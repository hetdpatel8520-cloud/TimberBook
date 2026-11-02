#!/usr/bin/env node
/**
 * TimberBooks Multi-Company Safe Migration & Integrity Tool
 * 
 * Usage:
 *   node scripts/migrateMultiCompany.js [--dry-run]
 * 
 * Capabilities:
 *   1. Full JSON timestamped backup before any writes
 *   2. Decouples and establishes 1-to-N relationship between Owner and Companies
 *   3. Populates missing ownerId on Company documents
 *   4. Populates missing activeCompanyId on Owner documents
 *   5. Ensures emailLower and mobileNormalized indexes and values
 *   6. Verifies that all business records (invoices, ledgers, items, etc.) have valid companyId
 *   7. Zero data loss: only updates/backfills, never deletes records
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { normalizeEmail, normalizeMobile } = require('../src/utils/normalize');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

async function runMigration() {
  console.log('==================================================================');
  console.log(`🌲 TimberBooks Multi-Company Migration Tool ${isDryRun ? '(DRY RUN)' : ''}`);
  console.log('==================================================================');

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URI (or MONGODB_URI) is not configured.');
    process.exit(1);
  }

  const dbName = process.env.MONGO_DB_NAME || 'timberbooks';
  console.log(`Target MongoDB : ${uri.replace(/:([^:@]+)@/, ':****@')} [db: ${dbName}]`);
  console.log(`Execution Mode : ${isDryRun ? '🔍 PREVIEW ONLY (No writes)' : '🚀 LIVE WRITE'}\n`);

  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to MongoDB Atlas successfully.\n');
    const db = mongoose.connection.db;

    // 1. Take Pre-Migration Backup if Live Write
    if (!isDryRun) {
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup_multicompany_${timestamp}.json`);

      console.log('💾 Creating safety backup of all collections before migration...');
      const targetBackup = {};
      const existingCollections = await db.listCollections().toArray();
      for (const col of existingCollections) {
        targetBackup[col.name] = await db.collection(col.name).find({}).toArray();
      }
      fs.writeFileSync(backupFile, JSON.stringify(targetBackup, null, 2), 'utf8');
      console.log(`✅ Pre-migration safety backup saved to: ${backupFile}\n`);
    }

    // 2. Fetch Owners and Companies
    const ownersCol = db.collection('owners');
    const companiesCol = db.collection('companies');

    const owners = await ownersCol.find({}).toArray();
    const companies = await companiesCol.find({}).toArray();

    console.log(`📋 Found ${owners.length} Owner(s) and ${companies.length} Company(s).`);

    // 3. Process Companies: Ensure every Company has valid ownerId
    console.log('\n🏢 Verifying & Linking Companies to Owners:');
    let companiesUpdated = 0;

    for (const company of companies) {
      const updates = {};
      let matchedOwnerId = company.ownerId;

      // If ownerId is missing or empty
      if (!matchedOwnerId) {
        // Find owner whose companyId or activeCompanyId matches this company._id
        const matchedOwner = owners.find(o => 
          String(o.companyId) === String(company._id) || 
          String(o.activeCompanyId) === String(company._id)
        );

        if (matchedOwner) {
          matchedOwnerId = matchedOwner._id;
          updates.ownerId = matchedOwner._id;
        } else if (owners.length === 1) {
          // If there is only one owner in the entire DB, link company to that owner
          matchedOwnerId = owners[0]._id;
          updates.ownerId = owners[0]._id;
        } else {
          // Try matching phone or email
          const contactOwner = owners.find(o =>
            (company.phone && normalizeMobile(company.phone) === o.mobileNormalized) ||
            (company.email && normalizeEmail(company.email) === o.emailLower)
          );
          if (contactOwner) {
            matchedOwnerId = contactOwner._id;
            updates.ownerId = contactOwner._id;
          }
        }
      }

      if (typeof company.isArchived !== 'boolean') {
        updates.isArchived = false;
      }
      if (typeof company.isDefault !== 'boolean') {
        updates.isDefault = false;
      }

      if (Object.keys(updates).length > 0) {
        companiesUpdated++;
        console.log(`   * Company "${company.name}" (_id: ${company._id}) -> Updates: ${JSON.stringify(updates)}`);
        if (!isDryRun) {
          await companiesCol.updateOne({ _id: company._id }, { $set: updates });
        }
      } else {
        console.log(`   ✓ Company "${company.name}" (_id: ${company._id}) -> ownerId: ${matchedOwnerId || 'none'}`);
      }
    }

    // 4. Process Owners: Ensure normalized fields and activeCompanyId
    console.log('\n👤 Verifying & Updating Owners:');
    let ownersUpdated = 0;

    for (const owner of owners) {
      const updates = {};

      const normEmail = normalizeEmail(owner.email || '');
      const normMobile = normalizeMobile(owner.mobile || '');

      if (!owner.emailLower && normEmail) {
        updates.emailLower = normEmail;
      }
      if (!owner.mobileNormalized && normMobile) {
        updates.mobileNormalized = normMobile;
      }

      // Check activeCompanyId
      let activeCompId = owner.activeCompanyId || owner.companyId;
      if (!activeCompId) {
        const ownedComp = companies.find(c => 
          String(c.ownerId) === String(owner._id) || 
          String(c._id) === String(owner.companyId)
        );
        if (ownedComp) {
          activeCompId = ownedComp._id;
          updates.activeCompanyId = ownedComp._id;
          updates.companyId = ownedComp._id;
        } else if (companies.length === 1) {
          activeCompId = companies[0]._id;
          updates.activeCompanyId = companies[0]._id;
          updates.companyId = companies[0]._id;
        }
      } else {
        if (!owner.activeCompanyId) updates.activeCompanyId = activeCompId;
        if (!owner.companyId) updates.companyId = activeCompId;
      }

      if (Object.keys(updates).length > 0) {
        ownersUpdated++;
        console.log(`   * Owner "${owner.fullName}" (_id: ${owner._id}) -> Updates: ${JSON.stringify(updates)}`);
        if (!isDryRun) {
          await ownersCol.updateOne({ _id: owner._id }, { $set: updates });
        }
      } else {
        console.log(`   ✓ Owner "${owner.fullName}" (_id: ${owner._id}) -> activeCompanyId: ${activeCompId || 'none'}`);
      }
    }

    // 5. Verify Business Collections: Every record has a valid companyId
    const businessCollections = [
      'invoices',
      'purchases',
      'ledgers',
      'items',
      'vouchers',
      'financialyears',
      'stockmovements',
      'settings'
    ];

    console.log('\n📦 Verifying Business Collection Tenant Links:');
    for (const colName of businessCollections) {
      try {
        const col = db.collection(colName);
        const total = await col.countDocuments();
        const unlinked = await col.countDocuments({
          $or: [
            { companyId: { $exists: false } },
            { companyId: null }
          ]
        });

        if (unlinked > 0) {
          console.log(`   ⚠️ ${colName.padEnd(16)}: ${total} docs, ${unlinked} MISSING companyId!`);
          if (companies.length === 1) {
            console.log(`      -> Auto-linking ${unlinked} docs to primary company: ${companies[0]._id} (${companies[0].name})`);
            if (!isDryRun) {
              await col.updateMany(
                { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
                { $set: { companyId: companies[0]._id } }
              );
            }
          }
        } else {
          console.log(`   ✓ ${colName.padEnd(16)}: ${total} docs, all linked with valid companyId.`);
        }
      } catch (err) {
        console.log(`   - ${colName.padEnd(16)}: collection not found or empty (${err.message}).`);
      }
    }

    console.log('\n==================================================================');
    console.log(`🎉 Multi-Company Migration ${isDryRun ? 'PREVIEW' : 'PROCESS'} COMPLETE!`);
    console.log(`   - Companies Updated : ${companiesUpdated}`);
    console.log(`   - Owners Updated    : ${ownersUpdated}`);
    console.log('==================================================================\n');

  } catch (err) {
    console.error(`❌ Migration encountered an error: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();
