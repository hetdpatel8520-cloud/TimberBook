const Settings = require('../models/Settings');
const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const Ledger = require('../models/Ledger');
const LedgerGroup = require('../models/LedgerGroup');
const Item = require('../models/Item');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Voucher = require('../models/Voucher');
const StockMovement = require('../models/StockMovement');

async function getSettings(req, res, next) {
  try {
    let settings = await Settings.findOne({ companyId: req.companyId });
    if (!settings) {
      settings = await Settings.create({ companyId: req.companyId });
    }
    const currentFY = await FinancialYear.findOne({ companyId: req.companyId, isCurrent: true });
    res.json({ success: true, settings, currentFinancialYear: currentFY });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    let settings = await Settings.findOne({ companyId: req.companyId });
    if (!settings) {
      settings = await Settings.create({ companyId: req.companyId });
    }

    const fields = ['invoicePrefix', 'purchasePrefix', 'receiptPrefix', 'paymentPrefix', 'contraPrefix', 'defaultTerms', 'theme', 'biometricRequired'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) settings[f] = req.body[f];
    });

    if (req.body.nextInvoiceNumber !== undefined) {
      const nextNum = parseInt(req.body.nextInvoiceNumber, 10);
      if (!isNaN(nextNum) && nextNum >= 1) {
        const fy = await FinancialYear.findOne({ companyId: req.companyId, isCurrent: true }) ||
          await FinancialYear.findOne({ companyId: req.companyId });
        if (fy) {
          if (!fy.counters) fy.counters = {};
          fy.counters.invoice = nextNum;
          await fy.save();
        }
      }
    }

    await settings.save();
    const currentFY = await FinancialYear.findOne({ companyId: req.companyId, isCurrent: true });
    res.json({ success: true, message: 'Settings updated successfully.', settings, currentFinancialYear: currentFY });
  } catch (err) {
    next(err);
  }
}

async function exportBackup(req, res, next) {
  try {
    const companyId = req.companyId;
    const [
      company,
      financialYears,
      ledgerGroups,
      ledgers,
      items,
      invoices,
      purchases,
      vouchers,
      stockMovements,
      settings
    ] = await Promise.all([
      Company.findById(companyId),
      FinancialYear.find({ companyId }),
      LedgerGroup.find({ $or: [{ companyId }, { companyId: null }] }),
      Ledger.find({ companyId }),
      Item.find({ companyId }),
      Invoice.find({ companyId }),
      Purchase.find({ companyId }),
      Voucher.find({ companyId }),
      StockMovement.find({ companyId }),
      Settings.findOne({ companyId })
    ]);

    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      companyName: company?.name || 'My Company',
      data: {
        company,
        financialYears,
        ledgerGroups,
        ledgers,
        items,
        invoices,
        purchases,
        vouchers,
        stockMovements,
        settings
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=TimberBooks-Backup-${(company?.name || 'Company').replace(/\s+/g, '_')}-${Date.now()}.json`);
    res.json(backupData);
  } catch (err) {
    next(err);
  }
}

async function restoreBackup(req, res, next) {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Invalid backup file content.' });
    }

    const companyId = req.companyId;

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        await Item.findOneAndUpdate(
          { companyId, name: item.name },
          { ...item, companyId },
          { upsert: true }
        );
      }
    }

    if (data.ledgers && Array.isArray(data.ledgers)) {
      for (const ledger of data.ledgers) {
        await Ledger.findOneAndUpdate(
          { companyId, name: ledger.name },
          { ...ledger, companyId },
          { upsert: true }
        );
      }
    }

    res.json({ success: true, message: 'Cloud backup restored successfully into your company account.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  exportBackup,
  restoreBackup
};
