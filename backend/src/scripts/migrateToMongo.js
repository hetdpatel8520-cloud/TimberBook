require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const uri = process.argv[2] || process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.error('❌ Error: No MongoDB connection string provided.');
    console.error('Usage: node src/scripts/migrateToMongo.js "<your-mongodb-connection-string>"');
    console.error('Or set MONGODB_URI in backend/.env');
    process.exit(1);
  }

  console.log(`🔌 Connecting to MongoDB at: ${uri.replace(/:[^:]*@/, ':****@')} ...`);
  
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully!');

    const dbPath = path.join(__dirname, '../../data/db.json');
    if (!fs.existsSync(dbPath)) {
      console.error('❌ db.json file not found at:', dbPath);
      process.exit(1);
    }

    const localData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const db = mongoose.connection.db;

    const collections = [
      { key: 'companys', target: 'companies' },
      { key: 'owners', target: 'owners' },
      { key: 'financialyears', target: 'financialyears' },
      { key: 'ledgergroups', target: 'ledgergroups' },
      { key: 'ledgers', target: 'ledgers' },
      { key: 'items', target: 'items' },
      { key: 'invoices', target: 'invoices' },
      { key: 'purchases', target: 'purchases' },
      { key: 'vouchers', target: 'vouchers' },
      { key: 'stockmovements', target: 'stockmovements' },
      { key: 'settingss', target: 'settings' }
    ];

    console.log('\n📦 Migrating data into MongoDB collections:');
    for (const col of collections) {
      const records = localData[col.key];
      if (Array.isArray(records) && records.length > 0) {
        const mongoCollection = db.collection(col.target);
        
        // Convert string _id to proper format if needed, insert or replace
        for (const record of records) {
          const doc = { ...record };
          const id = doc._id;
          delete doc._id;
          
          let filter = {};
          try {
            filter = { _id: new mongoose.Types.ObjectId(id) };
          } catch {
            filter = { _id: id };
          }

          await mongoCollection.updateOne(
            filter,
            { $set: doc },
            { upsert: true }
          );
        }
        console.log(`  ✓ ${col.target}: ${records.length} records synced.`);
      }
    }

    console.log('\n🎉 ALL LOCAL DATA SUCCESSFULLY MIGRATED TO MONGODB!');
    console.log('TimberBooks is now storing live data in MongoDB.\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
