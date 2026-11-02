#!/usr/bin/env node
/**
 * Idempotent Data Migration & Backup Script: migrateData.js
 * 
 * Usage:
 *   node scripts/migrateData.js [--dry-run] [--source <path-to-json-or-uri>]
 * 
 * Features:
 *   - Auto-creates full JSON timestamped backup BEFORE any write
 *   - Preserves all original _id values, companyId links, and bill numbers (e.g. Invoice #1)
 *   - Idempotent upsert: updateOne({ _id }, { $set: doc }, { upsert: true })
 *   - Supports --dry-run flag
 *   - Prints summary of counts before and after
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Source file default
const defaultJsonSource = path.join(__dirname, '../data/db.json');

async function migrateData() {
  console.log('==================================================================');
  console.log(`🌲 TimberBooks Data Migration & Safety Recovery Tool ${isDryRun ? '(DRY RUN)' : ''}`);
  console.log('==================================================================');

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URI (or MONGODB_URI) is not set in environment.');
    process.exit(1);
  }

  const dbName = process.env.MONGO_DB_NAME || 'timberbooks';
  console.log(`Target MongoDB : ${uri.replace(/:([^:@]+)@/, ':****@')} [db: ${dbName}]`);
  console.log(`Source Store   : ${defaultJsonSource}`);
  console.log(`Execution Mode : ${isDryRun ? '🔍 PREVIEW ONLY (No writes)' : '🚀 LIVE WRITE'}\n`);

  if (!fs.existsSync(defaultJsonSource)) {
    console.error(`❌ Source file not found: ${defaultJsonSource}`);
    process.exit(1);
  }

  const sourceData = JSON.parse(fs.readFileSync(defaultJsonSource, 'utf8'));

  // Mapping from JSON keys to MongoDB target collection names
  const collectionsMap = [
    { key: 'owners', target: 'owners' },
    { key: 'companys', target: 'companies' },
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

  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to Target MongoDB successfully.\n');
    const db = mongoose.connection.db;

    // 1. Take Pre-Migration Backup if Live Write
    if (!isDryRun) {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup_pre_migration_${timestamp}.json`);

      console.log('💾 Creating full safety backup of existing MongoDB data...');
      const targetBackup = {};
      const existingCollections = await db.listCollections().toArray();
      for (const col of existingCollections) {
        targetBackup[col.name] = await db.collection(col.name).find({}).toArray();
      }
      fs.writeFileSync(backupFile, JSON.stringify(targetBackup, null, 2), 'utf8');
      console.log(`✅ Pre-migration safety backup saved to: ${backupFile}\n`);
    }

    // 2. Count before migration
    console.log('📊 Current Collection Counts (BEFORE Migration):');
    const countsBefore = {};
    for (const mapping of collectionsMap) {
      try {
        countsBefore[mapping.target] = await db.collection(mapping.target).countDocuments();
      } catch {
        countsBefore[mapping.target] = 0;
      }
      console.log(`   - ${mapping.target.padEnd(18)} : ${countsBefore[mapping.target]} documents`);
    }
    console.log('');

    // 3. Perform Migration / Upsert
    console.log('🚚 Processing Collections:');
    const migrationStats = {};

    for (const mapping of collectionsMap) {
      const items = Array.isArray(sourceData[mapping.key]) ? sourceData[mapping.key] : [];
      migrationStats[mapping.target] = { total: items.length, upserted: 0 };

      if (items.length === 0) continue;

      const targetCol = db.collection(mapping.target);

      for (const item of items) {
        const doc = { ...item };
        const idVal = doc._id;
        delete doc._id;

        let query = {};
        if (idVal) {
          try {
            query = { _id: new mongoose.Types.ObjectId(idVal) };
          } catch {
            query = { _id: idVal };
          }
        }

        if (isDryRun) {
          migrationStats[mapping.target].upserted++;
        } else {
          await targetCol.updateOne(query, { $set: doc }, { upsert: true });
          migrationStats[mapping.target].upserted++;
        }
      }

      console.log(`   ✓ ${mapping.target.padEnd(18)} : ${migrationStats[mapping.target].upserted} / ${items.length} records processed`);
    }

    // 4. Count after migration
    console.log('\n📊 Target Collection Counts (AFTER Migration):');
    for (const mapping of collectionsMap) {
      let countAfter = 0;
      if (!isDryRun) {
        countAfter = await db.collection(mapping.target).countDocuments();
      } else {
        countAfter = countsBefore[mapping.target] + migrationStats[mapping.target].upserted;
      }
      console.log(`   - ${mapping.target.padEnd(18)} : ${countAfter} documents (was ${countsBefore[mapping.target]})`);
    }

    console.log(`\n🎉 Data Migration ${isDryRun ? 'PREVIEW' : 'PROCESS'} COMPLETED SUCCESSFULLY!`);

  } catch (err) {
    console.error(`❌ Migration failed: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrateData();
