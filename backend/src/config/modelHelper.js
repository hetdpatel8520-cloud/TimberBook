const mongoose = require('mongoose');

/**
 * Standard Mongoose Model Registration Helper
 * Ensures models are consistently registered with Mongoose schemas
 */
function registerModel(name, mongooseSchema) {
  return mongoose.models[name] || mongoose.model(name, mongooseSchema);
}

module.exports = {
  registerModel
};
