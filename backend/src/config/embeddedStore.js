const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

// In-memory collections map: { collectionName: [ { _id, ...fields } ] }
let collections = {};

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFromDisk() {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      collections = JSON.parse(content);
      console.log('📦 Loaded embedded database from disk:', Object.keys(collections).map(k => `${k}: ${collections[k].length}`).join(', '));
      return;
    } catch (e) {
      console.warn('Could not read existing db.json, starting with empty store:', e.message);
    }
  }
  collections = {};
}

function saveToDisk() {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(collections, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to persist db.json:', e);
  }
}

function getCollection(name) {
  if (!collections[name]) {
    collections[name] = [];
  }
  return collections[name];
}

/**
 * Match a document against a MongoDB-style query filter
 */
function matchFilter(doc, query = {}) {
  if (!query || Object.keys(query).length === 0) return true;

  for (const [key, val] of Object.entries(query)) {
    if (key === '$or') {
      const orMatched = val.some(subQuery => matchFilter(doc, subQuery));
      if (!orMatched) return false;
      continue;
    }

    if (key === '$expr') {
      if (val.$lte) {
        const [field1, field2] = val.$lte;
        const v1 = resolvePath(doc, field1.replace('$', ''));
        const v2 = resolvePath(doc, field2.replace('$', ''));
        if (!(v1 <= v2)) return false;
      }
      continue;
    }

    let docVal = resolvePath(doc, key);
    if (key === 'isActive' && docVal === undefined) docVal = true;
    if (key === 'isCancelled' && docVal === undefined) docVal = false;

    if (val instanceof RegExp) {
      if (!val.test(String(docVal || ''))) return false;
    } else if (val && typeof val === 'object' && !(val instanceof Date)) {
      if (val.$gte !== undefined) {
        if (!(new Date(docVal) >= new Date(val.$gte) || docVal >= val.$gte)) return false;
      }
      if (val.$lte !== undefined) {
        if (!(new Date(docVal) <= new Date(val.$lte) || docVal <= val.$lte)) return false;
      }
      if (val.$gt !== undefined) {
        if (!(docVal > val.$gt)) return false;
      }
      if (val.$lt !== undefined) {
        if (!(docVal < val.$lt)) return false;
      }
      if (val.$in !== undefined) {
        const inMatch = val.$in.some(item => {
          if (item instanceof RegExp) return item.test(String(docVal || ''));
          return String(item) === String(docVal);
        });
        if (!inMatch) return false;
      }
    } else if (key === '_id' || key.endsWith('Id')) {
      if (String(docVal) !== String(val)) return false;
    } else {
      if (docVal !== val && String(docVal) !== String(val)) return false;
    }
  }

  return true;
}

function resolvePath(obj, pathStr) {
  if (!obj) return undefined;
  const parts = pathStr.split('.');
  let current = obj;
  for (const p of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[p];
  }
  return current;
}

function wrapDocument(collectionName, data) {
  if (!data) return null;
  const doc = { ...data };

  // Attach .save() method
  Object.defineProperty(doc, 'save', {
    enumerable: false,
    value: async function () {
      doc.updatedAt = new Date().toISOString();
      const col = getCollection(collectionName);
      const idx = col.findIndex(item => String(item._id) === String(doc._id));
      if (idx >= 0) {
        col[idx] = { ...doc };
      } else {
        col.push({ ...doc });
      }
      saveToDisk();
      return wrapDocument(collectionName, doc);
    }
  });

  return doc;
}

class QueryCursor {
  constructor(collectionName, query) {
    this.collectionName = collectionName;
    this.query = query;
    this._sort = null;
    this._skip = 0;
    this._limit = 0;
    this._select = null;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  skip(n) {
    this._skip = parseInt(n) || 0;
    return this;
  }

  limit(n) {
    this._limit = parseInt(n) || 0;
    return this;
  }

  select(selectFields) {
    this._select = selectFields;
    return this;
  }

  async exec() {
    const col = getCollection(this.collectionName);
    let results = col.filter(doc => matchFilter(doc, this.query));

    if (this._sort) {
      results.sort((a, b) => {
        for (const [key, dir] of Object.entries(this._sort)) {
          const aVal = resolvePath(a, key);
          const bVal = resolvePath(b, key);
          if (aVal !== bVal) {
            return dir === -1 || dir === 'desc'
              ? (bVal > aVal ? 1 : -1)
              : (aVal > bVal ? 1 : -1);
          }
        }
        return 0;
      });
    }

    if (this._skip > 0) {
      results = results.slice(this._skip);
    }

    if (this._limit > 0) {
      results = results.slice(0, this._limit);
    }

    return results.map(d => wrapDocument(this.collectionName, d));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

class DocQuery {
  constructor(collectionName, fn) {
    this.collectionName = collectionName;
    this.fn = fn;
    this._select = null;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  populate() {
    return this;
  }

  async exec() {
    const doc = await this.fn();
    if (doc && this._select && typeof this._select === 'string') {
      const parts = this._select.split(' ');
      for (const p of parts) {
        if (p.startsWith('-')) {
          delete doc[p.substring(1)];
        }
      }
    }
    return doc;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

/**
 * Creates an embedded Model mimicking Mongoose Model interface
 */
function createEmbeddedModel(modelName) {
  const collectionName = modelName.toLowerCase() + 's';

  return {
    modelName,
    collectionName,

    find(query = {}) {
      return new QueryCursor(collectionName, query);
    },

    findOne(query = {}) {
      return new DocQuery(collectionName, async () => {
        const col = getCollection(collectionName);
        const item = col.find(doc => matchFilter(doc, query));
        return item ? wrapDocument(collectionName, item) : null;
      });
    },

    findById(id) {
      return new DocQuery(collectionName, async () => {
        if (!id) return null;
        const col = getCollection(collectionName);
        const item = col.find(doc => String(doc._id) === String(id));
        return item ? wrapDocument(collectionName, item) : null;
      });
    },

    async create(data) {
      const col = getCollection(collectionName);
      const doc = {
        _id: generateId(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      col.push(doc);
      saveToDisk();
      return wrapDocument(collectionName, doc);
    },

    async insertMany(docs = []) {
      const created = [];
      for (const d of docs) {
        created.push(await this.create(d));
      }
      return created;
    },

    async countDocuments(query = {}) {
      const col = getCollection(collectionName);
      return col.filter(doc => matchFilter(doc, query)).length;
    },

    async exists(query = {}) {
      const col = getCollection(collectionName);
      const found = col.find(doc => matchFilter(doc, query));
      return found ? { _id: found._id } : null;
    },

    async findByIdAndUpdate(id, update, options = {}) {
      const doc = await this.findById(id);
      if (!doc) return null;
      Object.assign(doc, update);
      await doc.save();
      return doc;
    },

    async findOneAndUpdate(query, update, options = {}) {
      let doc = await this.findOne(query);
      if (!doc && options.upsert) {
        return this.create({ ...query, ...update });
      }
      if (doc) {
        Object.assign(doc, update);
        await doc.save();
        return doc;
      }
      return null;
    },

    async findByIdAndDelete(id) {
      const col = getCollection(collectionName);
      const idx = col.findIndex(doc => String(doc._id) === String(id));
      if (idx >= 0) {
        const [removed] = col.splice(idx, 1);
        saveToDisk();
        return removed;
      }
      return null;
    },

    async deleteMany(query = {}) {
      const col = getCollection(collectionName);
      if (!query || Object.keys(query).length === 0) {
        const count = col.length;
        collections[collectionName] = [];
        saveToDisk();
        return { deletedCount: count };
      }
      const kept = col.filter(doc => !matchFilter(doc, query));
      const deletedCount = col.length - kept.length;
      collections[collectionName] = kept;
      saveToDisk();
      return { deletedCount };
    },

    async updateMany(query = {}, update = {}) {
      const col = getCollection(collectionName);
      let modifiedCount = 0;
      for (let i = 0; i < col.length; i++) {
        if (!query || Object.keys(query).length === 0 || matchFilter(col[i], query)) {
          Object.assign(col[i], update);
          col[i].updatedAt = new Date().toISOString();
          modifiedCount++;
        }
      }
      if (modifiedCount > 0) {
        saveToDisk();
      }
      return { matchedCount: modifiedCount, modifiedCount };
    },

    async aggregate(pipeline = []) {
      const col = getCollection(collectionName);
      let data = [...col];

      for (const stage of pipeline) {
        if (stage.$match) {
          data = data.filter(doc => matchFilter(doc, stage.$match));
        }
        if (stage.$group) {
          const groupResult = { _id: null };
          for (const [outKey, expr] of Object.entries(stage.$group)) {
            if (outKey === '_id') continue;
            if (expr.$sum) {
              if (expr.$sum === 1) {
                groupResult[outKey] = data.length;
              } else if (typeof expr.$sum === 'string' && expr.$sum.startsWith('$')) {
                const field = expr.$sum.slice(1);
                groupResult[outKey] = data.reduce((acc, curr) => acc + (parseFloat(curr[field]) || 0), 0);
              }
            }
          }
          return [groupResult];
        }
      }
      return data;
    }
  };
}

module.exports = {
  loadFromDisk,
  saveToDisk,
  createEmbeddedModel,
  generateId
};
