#!/usr/bin/env node
/**
 * Idempotent Script: backfillNormalizedIdentifiers.js
 * 
 * Safely adds mobileNormalized and emailLower to all existing Owner documents.
 * Can be run repeatedly without altering existing IDs or data.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { normalizeEmail, normalizeMobile } = require('../src/utils/normalize');

async function backfill() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URI (or MONGODB_URI) is not defined.');
    process.exit(1);
  }

  const dbName = process.env.MONGO_DB_NAME || 'timberbooks';
  console.log(`🔌 Connecting to MongoDB Atlas for backfill (database: ${dbName})...`);

  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to MongoDB Atlas successfully.');

    const db = mongoose.connection.db;
    const ownersCol = db.collection('owners');
    const allOwners = await ownersCol.find({}).toArray();

    console.log(`Found ${allOwners.length} owner document(s) to process.`);
    let updatedCount = 0;

    for (const owner of allOwners) {
      const normMobile = normalizeMobile(owner.mobile || owner.phone || owner.username || '');
      const normEmail = normalizeEmail(owner.email || '');

      const updates = {};
      if (owner.mobileNormalized !== normMobile) {
        updates.mobileNormalized = normMobile;
      }
      if (owner.emailLower !== normEmail) {
        updates.emailLower = normEmail;
      }

      if (Object.keys(updates).length > 0) {
        await ownersCol.updateOne({ _id: owner._id }, { $set: updates });
        updatedCount++;
        console.log(`  ✓ Updated Owner ID ${owner._id}: mobileNormalized="${normMobile}", emailLower="${normEmail}"`);
      }
    }

    console.log(`\n🎉 Backfill complete: ${updatedCount} owner(s) updated, ${allOwners.length - updatedCount} already normalized.`);

    // Ensure indexes
    try {
      await ownersCol.createIndex({ mobileNormalized: 1 });
      await ownersCol.createIndex({ emailLower: 1 });
      console.log('✅ Created indexes on mobileNormalized and emailLower.');
    } catch (idxErr) {
      console.warn(`Index note: ${idxErr.message}`);
    }

  } catch (err) {
    console.error(`❌ Backfill failed: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

backfill();
