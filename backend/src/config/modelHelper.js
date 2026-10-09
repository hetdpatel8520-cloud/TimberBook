const mongoose = require('mongoose');
const { createEmbeddedModel } = require('./embeddedStore');

let isEmbeddedMode = false;
const embeddedModels = {};

function setEmbeddedMode(enabled) {
  isEmbeddedMode = enabled;
}

function getIsEmbedded() {
  return isEmbeddedMode;
}

function registerModel(name, mongooseSchema) {
  function ModelProxy(...args) {
    if (isEmbeddedMode) {
      if (!embeddedModels[name]) {
        embeddedModels[name] = createEmbeddedModel(name);
      }
      return new embeddedModels[name](...args);
    }
    const realModel = mongoose.models[name] || mongoose.model(name, mongooseSchema);
    return new realModel(...args);
  }

  return new Proxy(ModelProxy, {
    construct(target, args) {
      if (isEmbeddedMode) {
        if (!embeddedModels[name]) {
          embeddedModels[name] = createEmbeddedModel(name);
        }
        return new embeddedModels[name](...args);
      }
      const realModel = mongoose.models[name] || mongoose.model(name, mongooseSchema);
      return new realModel(...args);
    },
    get(target, prop) {
      if (isEmbeddedMode) {
        if (!embeddedModels[name]) {
          embeddedModels[name] = createEmbeddedModel(name);
        }
        return embeddedModels[name][prop];
      }

      // Mongoose mode
      const model = mongoose.models[name] || mongoose.model(name, mongooseSchema);
      const val = model[prop];
      if (typeof val === 'function') {
        return val.bind(model);
      }
      return val;
    }
  });
}

module.exports = {
  setEmbeddedMode,
  getIsEmbedded,
  registerModel
};
