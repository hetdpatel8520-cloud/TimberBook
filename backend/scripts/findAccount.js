#!/usr/bin/env node
/**
 * Read-Only Diagnostic Script: findAccount.js
 * 
 * Usage:
 *   node scripts/findAccount.js --mobile <MOBILE> --email <EMAIL>
 * 
 * Scans MongoDB Atlas and local storage for registered accounts, companies,
 * and documents matching the provided mobile/email without modifying any data.
 * NEVER prints passwords, PIN hashes, or secrets.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Parse CLI arguments
const args = process.argv.slice(2);
let searchMobile = '';
let searchEmail = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mobile' && args[i + 1]) {
    searchMobile = args[i + 1].trim();
    i++;
  } else if (args[i] === '--email' && args[i + 1]) {
    searchEmail = args[i + 1].trim();
    i++;
  }
}

// Clean / normalize targets
const clean10Digits = (str) => {
  const digits = (str || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const mobileLast10 = clean10Digits(searchMobile);
const emailLower = (searchEmail || '').toLowerCase();

// Safe document sanitizer
function sanitizeDoc(doc) {
  if (!doc) return doc;
  const raw = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete raw.passwordHash;
  delete raw.pinHash;
  delete raw.otp;
  delete raw.resetOtp;
  delete raw.token;
  delete raw.__v;
  return raw;
}

// Mask connection URI credentials
function maskUri(uri) {
  if (!uri) return '(none)';
  return uri.replace(/:([^:@]+)@/, ':****@');
}

async function runDiagnostics() {
  console.log('==================================================================');
  console.log('🌲 TimberBooks Account & Database Diagnostic Utility (Read-Only)');
  console.log('==================================================================');
  console.log(`Search Target Mobile : "${searchMobile}" (Normalized 10-digits: "${mobileLast10 || 'N/A'}")`);
  console.log(`Search Target Email  : "${searchEmail}" (Normalized Lowercase: "${emailLower || 'N/A'}")`);
  console.log('------------------------------------------------------------------');

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log(`Configured Mongo URI : ${maskUri(uri)}`);

  let atlasConnected = false;

  if (uri && uri.trim()) {
    try {
      console.log('Attempting MongoDB connection (timeout: 6s)...');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
      atlasConnected = true;
      const db = mongoose.connection.db;
      const dbName = mongoose.connection.name;
      const host = mongoose.connection.host;
      console.log(`✅ Connected successfully to MongoDB!`);
      console.log(`   Host     : ${host}`);
      console.log(`   Database : ${dbName}\n`);

      // 1. List Databases if allowed
      try {
        const adminDb = db.admin();
        const dbsList = await adminDb.listDatabases();
        console.log('🗄️ Available Databases in Cluster:');
        for (const d of dbsList.databases) {
          console.log(`   - ${d.name} (${(d.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        }
        console.log('');
      } catch (adminErr) {
        console.log(`ℹ️ Admin listDatabases restricted: ${adminErr.message}`);
      }

      // 2. List Collections & Document Counts in current db
      const collections = await db.listCollections().toArray();
      console.log(`📁 Collections in "${dbName}" (${collections.length} total):`);
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - ${col.name.padEnd(20)} : ${count} documents`);
      }
      console.log('');

      // 3. Scan Collections for Matching Accounts / Companies / Invoices
      console.log('🔍 Scanning Collections for Matching Records...');
      let totalMatches = 0;

      for (const col of collections) {
        const colName = col.name;
        const collection = db.collection(colName);
        const allDocs = await collection.find({}).toArray();

        const matches = allDocs.filter(doc => {
          // Check stringified document or specific fields
          const docStr = JSON.stringify(doc).toLowerCase();
          const hasEmail = emailLower && docStr.includes(emailLower);
          const hasMobile = mobileLast10 && docStr.includes(mobileLast10);
          const hasBhavani = docStr.includes('bhavani');
          return hasEmail || hasMobile || hasBhavani;
        });

        if (matches.length > 0) {
          totalMatches += matches.length;
          console.log(`\n🎯 Matched ${matches.length} document(s) in collection [${colName}]:`);
          matches.forEach((m, idx) => {
            console.log(`--- [${colName} #${idx + 1}] ---`);
            console.log(JSON.stringify(sanitizeDoc(m), null, 2));
          });
        }
      }

      if (totalMatches === 0) {
        console.log('⚠️ No matching documents found in MongoDB for the given mobile, email, or "Bhavani".');
      }

    } catch (connErr) {
      console.error(`❌ MongoDB Connection Failed: ${connErr.message}`);
      console.error('   Possible reasons: IP not whitelisted in Atlas (0.0.0.0/0 required for cloud/dynamic IPs), invalid credentials, or network failure.\n');
    } finally {
      if (atlasConnected) {
        await mongoose.disconnect();
      }
    }
  } else {
    console.warn('⚠️ No MONGO_URI or MONGODB_URI set in environment.\n');
  }

  // 4. Also scan local backend/data/db.json for safety and complete diagnosis
  const localDbPath = path.join(__dirname, '../data/db.json');
  console.log('\n------------------------------------------------------------------');
  console.log(`🔍 Inspecting Local Persistent Store: ${localDbPath}`);
  if (fs.existsSync(localDbPath)) {
    try {
      const localData = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      const colKeys = Object.keys(localData);
      console.log(`📁 Local Collections found (${colKeys.length}):`);
      colKeys.forEach(k => {
        const count = Array.isArray(localData[k]) ? localData[k].length : 0;
        console.log(`   - ${k.padEnd(20)} : ${count} items`);
      });

      console.log('\n🔍 Scanning Local Store for Matches...');
      let localMatches = 0;
      for (const k of colKeys) {
        const items = Array.isArray(localData[k]) ? localData[k] : [];
        const matches = items.filter(item => {
          const itemStr = JSON.stringify(item).toLowerCase();
          const hasEmail = emailLower && itemStr.includes(emailLower);
          const hasMobile = mobileLast10 && itemStr.includes(mobileLast10);
          const hasBhavani = itemStr.includes('bhavani');
          return hasEmail || hasMobile || hasBhavani;
        });

        if (matches.length > 0) {
          localMatches += matches.length;
          console.log(`\n🎯 Local Matched ${matches.length} item(s) in [${k}]:`);
          matches.forEach((m, idx) => {
            console.log(`--- [Local ${k} #${idx + 1}] ---`);
            console.log(JSON.stringify(sanitizeDoc(m), null, 2));
          });
        }
      }

      if (localMatches === 0) {
        console.log('ℹ️ No matching documents in local db.json.');
      }
    } catch (e) {
      console.error('Failed reading local db.json:', e.message);
    }
  } else {
    console.log('ℹ️ Local db.json does not exist.');
  }

  console.log('\n==================================================================');
  console.log('🏁 Diagnostic Scan Complete');
  console.log('==================================================================\n');
}

runDiagnostics().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
