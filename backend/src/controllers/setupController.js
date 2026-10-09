const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const LedgerGroup = require('../models/LedgerGroup');
const Ledger = require('../models/Ledger');
const Settings = require('../models/Settings');

/**
 * Checks whether first-time setup is required
 */
async function getSetupStatus(req, res, next) {
  try {
    const ownerCount = await Owner.countDocuments();
    const company = await Company.findOne();

    const setupNeeded = ownerCount === 0 || !company;
    return res.json({
      success: true,
      setupNeeded,
      companyName: company ? company.name : null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Initializes first-time setup: creates Company, Owner, Financial Year, and standard chart of accounts
 */
async function initializeSetup(req, res, next) {
  try {
    const existingOwner = await Owner.findOne();
    if (existingOwner) {
      return res.status(400).json({
        success: false,
        message: 'Application has already been initialized. Please log in.'
      });
    }

    const {
      companyName,
      address,
      city,
      pincode,
      state,
      stateCode = '33',
      gstin,
      phone,
      email,
      bankName,
      accountNo,
      ifsc,
      branch,
      logoUrl,
      signatureUrl,
      fyFrom,
      fyTo,
      username,
      password,
      pin
    } = req.body;

    if (!companyName || !address || !city || !state || !gstin || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All core company details (Name, Address, City, State, GSTIN, Phone) are required.'
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Owner username and password are required.'
      });
    }

    // 1. Create Company
    const company = await Company.create({
      name: companyName,
      tagline: 'Saw Mill & Wholesale Timber Merchants',
      address,
      city,
      pincode: pincode || '600001',
      state,
      stateCode,
      gstin,
      phone,
      email: email || '',
      bankDetails: {
        bankName: bankName || 'State Bank of India',
        accountName: companyName,
        accountNo: accountNo || '',
        ifsc: ifsc || '',
        branch: branch || city
      },
      logoUrl: logoUrl || null,
      signatureUrl: signatureUrl || null
    });

    // 2. Create Owner
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    let pinHash = null;
    if (pin && pin.length >= 4) {
      pinHash = await bcrypt.hash(pin, salt);
    }

    const owner = await Owner.create({
      username: username.trim(),
      email: email || `${username.toLowerCase()}@timberbooks.local`,
      passwordHash,
      pinHash,
      biometricEnabled: !!pin
    });

    // 3. Create Financial Year
    const startDate = fyFrom ? new Date(fyFrom) : new Date(new Date().getFullYear(), 3, 1);
    const endDate = fyTo ? new Date(fyTo) : new Date(startDate.getFullYear() + 1, 2, 31);
    const fyCode = `${startDate.getFullYear()}-${endDate.getFullYear()}`;
    const fyName = `FY ${startDate.getFullYear()}-${String(endDate.getFullYear()).slice(-2)}`;

    const financialYear = await FinancialYear.create({
      code: fyCode,
      name: fyName,
      startDate,
      endDate,
      isCurrent: true,
      counters: {
        invoice: 1001,
        purchase: 501,
        receipt: 101,
        payment: 101,
        contra: 101
      }
    });

    // 4. Create Standard Ledger Groups
    const standardGroups = [
      { name: 'Sundry Debtors', nature: 'Asset', isSystem: true },
      { name: 'Sundry Creditors', nature: 'Liability', isSystem: true },
      { name: 'Cash-in-Hand', nature: 'Asset', isSystem: true },
      { name: 'Bank Accounts', nature: 'Asset', isSystem: true },
      { name: 'Sales Accounts', nature: 'Income', isSystem: true },
      { name: 'Purchase Accounts', nature: 'Expense', isSystem: true },
      { name: 'Direct Expenses', nature: 'Expense', isSystem: true },
      { name: 'Indirect Expenses', nature: 'Expense', isSystem: true },
      { name: 'Duties & Taxes', nature: 'Liability', isSystem: true },
      { name: 'Capital Account', nature: 'Liability', isSystem: true }
    ];

    for (const grp of standardGroups) {
      await LedgerGroup.findOneAndUpdate({ name: grp.name }, grp, { upsert: true });
    }

    // 5. Create Default Cash & Bank Ledgers
    await Ledger.create({
      name: 'Cash in Hand',
      group: 'Cash-in-Hand',
      taxType: 'Local',
      city,
      state,
      stateCode,
      openingBalance: 25000,
      openingBalanceType: 'Dr',
      currentBalance: 25000,
      currentBalanceType: 'Dr'
    });

    if (bankName) {
      await Ledger.create({
        name: `${bankName} (${accountNo ? accountNo.slice(-4) : 'Current'})`,
        group: 'Bank Accounts',
        taxType: 'Local',
        city,
        state,
        stateCode,
        openingBalance: 100000,
        openingBalanceType: 'Dr',
        currentBalance: 100000,
        currentBalanceType: 'Dr'
      });
    }

    // 6. Settings
    const settings = await Settings.create({
      invoicePrefix: '',
      currentFinancialYearId: financialYear._id,
      biometricRequired: !!pin
    });

    // 7. Generate JWT
    const token = jwt.sign(
      { id: owner._id, username: owner.username },
      process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Company initialized successfully.',
      token,
      owner: { id: owner._id, username: owner.username, biometricEnabled: owner.biometricEnabled },
      company,
      financialYear,
      settings
    });
  } catch (err) {
    next(err);
  }
}

const { seedData } = require('../seed');

async function seedDemo(req, res, next) {
  try {
    await seedData();
    const owner = await Owner.findOne({ username: 'owner' });
    const company = await Company.findOne();
    const fy = await FinancialYear.findOne({ isCurrent: true });
    const settings = await Settings.findOne();

    const token = jwt.sign(
      { id: owner._id, username: owner.username },
      process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Bhavani Timbers demo successfully loaded.',
      token,
      owner: { id: owner._id, username: owner.username, biometricEnabled: owner.biometricEnabled },
      company,
      financialYear: fy,
      settings
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSetupStatus,
  initializeSetup,
  seedDemo
};
