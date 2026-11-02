const FinancialYear = require('../models/FinancialYear');
const LedgerGroup = require('../models/LedgerGroup');
const Ledger = require('../models/Ledger');
const Settings = require('../models/Settings');

/**
 * Seed default Financial Year, Ledgers, and Settings for a newly created Company.
 */
async function seedCompanyDefaults({ company, owner, fyFrom, fyTo, bankName, accountNo }) {
  // 1. Financial Year
  const startYear = fyFrom ? new Date(fyFrom).getFullYear() : 2026;
  const endYear = fyTo ? new Date(fyTo).getFullYear() : startYear + 1;
  const code = `${startYear}-${String(endYear).slice(-2)}`;

  const financialYear = await FinancialYear.create({
    companyId: company._id,
    code,
    name: `FY ${code}`,
    startDate: fyFrom ? new Date(fyFrom) : new Date(`${startYear}-04-01`),
    endDate: fyTo ? new Date(fyTo) : new Date(`${endYear}-03-31`),
    isCurrent: true,
    counters: {
      invoice: 1,
      purchase: 1,
      receipt: 1,
      payment: 1,
      contra: 1
    }
  });

  // 2. Standard Ledger Groups
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
    await LedgerGroup.findOneAndUpdate(
      { name: grp.name, companyId: null },
      { ...grp, companyId: null },
      { upsert: true }
    );
  }

  // 3. Default Cash Ledger
  await Ledger.create({
    companyId: company._id,
    name: 'Cash in Hand',
    group: 'Cash-in-Hand',
    taxType: 'Local',
    city: company.city,
    state: company.state,
    stateCode: company.stateCode,
    openingBalance: 0,
    openingBalanceType: 'Dr',
    currentBalance: 0,
    currentBalanceType: 'Dr'
  });

  // 4. Default Bank Ledger if provided
  if (bankName && bankName.trim()) {
    await Ledger.create({
      companyId: company._id,
      name: `${bankName.trim()} (${accountNo ? accountNo.trim().slice(-4) : 'Account'})`,
      group: 'Bank Accounts',
      taxType: 'Local',
      city: company.city,
      state: company.state,
      stateCode: company.stateCode,
      openingBalance: 0,
      openingBalanceType: 'Dr',
      currentBalance: 0,
      currentBalanceType: 'Dr'
    });
  }

  // 5. Initial Settings
  const settings = await Settings.create({
    companyId: company._id,
    invoicePrefix: '',
    currentFinancialYearId: financialYear._id,
    biometricRequired: false
  });

  return { financialYear, settings };
}

module.exports = {
  seedCompanyDefaults
};
