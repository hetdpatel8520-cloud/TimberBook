const mongoose = require('mongoose');

// Mask MongoDB connection string credentials for safe logging
function maskUri(uri) {
  if (!uri) return '(none)';
  return uri.replace(/:([^:@]+)@/, ':****@');
}

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    const errorMsg = '❌ FATAL: MONGO_URI (or MONGODB_URI) is not defined in environment variables.\nTimberBooks requires a persistent MongoDB Atlas database. Please set MONGO_URI in your environment or .env file.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const dbName = process.env.MONGO_DB_NAME || 'timberbooks';

  try {
    console.log(`🔌 Connecting to MongoDB Atlas at ${maskUri(uri)} (database: ${dbName})...`);
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000
    });

    const host = mongoose.connection.host || 'unknown-host';
    const activeDb = mongoose.connection.name || dbName;
    console.log(`✅ Connected to MongoDB host: ${host} db: ${activeDb}`);
  } catch (err) {
    console.error(`❌ Failed to connect to MongoDB Atlas (${maskUri(uri)}): ${err.message}`);
    console.error('Make sure MongoDB Atlas IP access list allows traffic from anywhere (0.0.0.0/0).');
    throw err;
  }
}

async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

module.exports = { connectDB, closeDB };
