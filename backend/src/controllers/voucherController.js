const Voucher = require('../models/Voucher');
const Ledger = require('../models/Ledger');
const FinancialYear = require('../models/FinancialYear');
const { postVoucherAccounting, reverseVoucherAccounting } = require('../services/accountingEngine');

async function getVouchers(req, res, next) {
  try {
    const { type, accountId, startDate, endDate, search, limit = 50, page = 1 } = req.query;
    let query = { companyId: req.companyId };

    if (type) query.type = type;

    if (accountId) {
      query.$or = [{ fromAccountId: accountId }, { toAccountId: accountId }];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { voucherNo: regex },
        { narration: regex },
        { 'fromAccountSnapshot.name': regex },
        { 'toAccountSnapshot.name': regex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [vouchers, total] = await Promise.all([
      Voucher.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Voucher.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      vouchers
    });
  } catch (err) {
    next(err);
  }
}

async function getNextVoucherNo(req, res, next) {
  try {
    const { type } = req.params; // Receipt, Payment, Contra
    const fy = await FinancialYear.findOne({ companyId: req.companyId, isCurrent: true }) ||
      await FinancialYear.findOne({ companyId: req.companyId });
    const shortYear = (fy?.code || '26-27').split('-').map(y => y.slice(-2)).join('-');

    let prefix = 'REC';
    let counterKey = 'receipt';
    if (type === 'Payment') {
      prefix = 'PAY';
      counterKey = 'payment';
    } else if (type === 'Contra') {
      prefix = 'CON';
      counterKey = 'contra';
    }

    const counter = fy?.counters?.[counterKey] || 101;
    const nextVoucherNo = `${prefix}/${shortYear}/${counter}`;

    res.json({
      success: true,
      nextVoucherNo,
      counter,
      type
    });
  } catch (err) {
    next(err);
  }
}

async function createVoucher(req, res, next) {
  try {
    const {
      type, // 'Receipt', 'Payment', 'Contra'
      date = new Date(),
      fromAccountId, // Account being Credited
      toAccountId,   // Account being Debited
      amount,
      narration = '',
      paymentMode = 'Cash',
      chequeNo = '',
      chequeDate
    } = req.body;

    if (!type || !['Receipt', 'Payment', 'Contra'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Valid voucher type (Receipt, Payment, Contra) is required.' });
    }

    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({ success: false, message: 'Both Source and Destination accounts are required.' });
    }

    if (String(fromAccountId) === String(toAccountId)) {
      return res.status(400).json({ success: false, message: 'Source and Destination accounts cannot be the same.' });
    }

    const val = parseFloat(amount);
    if (!val || val <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount greater than zero is required.' });
    }

    const [fromAccount, toAccount] = await Promise.all([
      Ledger.findOne({ _id: fromAccountId, companyId: req.companyId }),
      Ledger.findOne({ _id: toAccountId, companyId: req.companyId })
    ]);

    if (!fromAccount || !toAccount) {
      return res.status(400).json({ success: false, message: 'One or both selected ledger accounts do not exist.' });
    }

    const fy = await FinancialYear.findOne({ companyId: req.companyId, isCurrent: true }) ||
      await FinancialYear.findOne({ companyId: req.companyId });

    let prefix = 'REC';
    let counterKey = 'receipt';
    if (type === 'Payment') {
      prefix = 'PAY';
      counterKey = 'payment';
    } else if (type === 'Contra') {
      prefix = 'CON';
      counterKey = 'contra';
    }

    const counter = fy?.counters?.[counterKey] || 101;
    const shortYear = (fy?.code || '26-27').split('-').map(y => y.slice(-2)).join('-');
    const voucherNo = `${prefix}/${shortYear}/${counter}`;

    const voucher = await Voucher.create({
      companyId: req.companyId,
      type,
      voucherNo,
      date: new Date(date),
      fromAccountId: fromAccount._id,
      toAccountId: toAccount._id,
      fromAccountSnapshot: { name: fromAccount.name, group: fromAccount.group },
      toAccountSnapshot: { name: toAccount.name, group: toAccount.group },
      amount: val,
      narration,
      paymentMode,
      chequeNo,
      chequeDate: chequeDate ? new Date(chequeDate) : undefined,
      financialYearId: fy?._id
    });

    // Double-entry accounting
    await postVoucherAccounting(voucher);

    // Increment FY counter
    if (fy) {
      fy.counters[counterKey] = counter + 1;
      await fy.save();
    }

    res.status(201).json({
      success: true,
      message: `${type} voucher recorded successfully.`,
      voucher
    });
  } catch (err) {
    next(err);
  }
}

async function deleteVoucher(req, res, next) {
  try {
    const voucher = await Voucher.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found.' });

    // Reversal of debits and credits
    await reverseVoucherAccounting(voucher);
    await Voucher.findByIdAndDelete(voucher._id);

    res.json({ success: true, message: 'Voucher deleted and ledger balances reversed.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVouchers,
  getNextVoucherNo,
  createVoucher,
  deleteVoucher
};
