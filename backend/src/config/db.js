const mongoose = require('mongoose');
const { setEmbeddedMode, getIsEmbedded } = require('./modelHelper');
const { loadFromDisk } = require('./embeddedStore');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log(`Connecting to external MongoDB at ${uri}...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ MongoDB connected successfully via MONGODB_URI.');
      setEmbeddedMode(false);
      return;
    } catch (err) {
      console.warn(`⚠️ Failed to connect to external MongoDB: ${err.message}.`);
      console.log('Falling back to TimberBooks embedded persistent store...');
    }
  }

  // Standalone embedded store: zero download, zero lag, persistent JSON storage
  setEmbeddedMode(true);
  loadFromDisk();
  console.log('⚡ TimberBooks Embedded Storage active (persisted at backend/data/db.json). Zero setup required!');
}

async function closeDB() {
  if (!getIsEmbedded()) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDB, closeDB };
