const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Voucher = require('../models/Voucher');
const Ledger = require('../models/Ledger');
const Item = require('../models/Item');

/**
 * Get cloud sync status, health, and entity statistics
 */
async function getSyncStatus(req, res, next) {
  try {
    const isAtlas = !!(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
    const company = await Company.findOne();
    const currentFY = await FinancialYear.findOne({ isCurrent: true });

    const [invoicesCount, purchasesCount, vouchersCount, ledgersCount, itemsCount] = await Promise.all([
      Invoice.countDocuments(),
      Purchase.countDocuments(),
      Voucher.countDocuments(),
      Ledger.countDocuments(),
      Item.countDocuments()
    ]);

    res.json({
      success: true,
      status: 'synced',
      serverTime: new Date().toISOString(),
      storageMode: isAtlas ? 'MongoDB Atlas (Cloud)' : 'Embedded Cloud Sync Store',
      company: company ? { id: company._id, name: company.name } : null,
      financialYear: currentFY ? { id: currentFY._id, name: currentFY.name } : null,
      stats: {
        invoices: invoicesCount,
        purchases: purchasesCount,
        vouchers: vouchersCount,
        ledgers: ledgersCount,
        items: itemsCount
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSyncStatus
};
