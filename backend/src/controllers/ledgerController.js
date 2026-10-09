const Ledger = require('../models/Ledger');
const LedgerGroup = require('../models/LedgerGroup');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Voucher = require('../models/Voucher');

async function getLedgers(req, res, next) {
  try {
    const { group, search, type } = req.query;
    let query = { companyId: req.companyId, isActive: true };

    if (group) {
      query.group = group;
    } else if (type === 'debtors') {
      query.group = /debtor/i;
    } else if (type === 'creditors') {
      query.group = /creditor/i;
    } else if (type === 'cashbank') {
      query.group = { $in: [/cash/i, /bank/i] };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { city: regex },
        { phone: regex },
        { gstin: regex }
      ];
    }

    const ledgers = await Ledger.find(query).sort({ name: 1 });
    res.json({ success: true, count: ledgers.length, ledgers });
  } catch (err) {
    next(err);
  }
}

async function getLedgerById(req, res, next) {
  try {
    const ledger = await Ledger.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found.' });

    // Fetch recent 10 transactions
    const [invoices, purchases, vouchers] = await Promise.all([
      Invoice.find({ companyId: req.companyId, partyId: ledger._id }).sort({ date: -1 }).limit(5),
      Purchase.find({ companyId: req.companyId, partyId: ledger._id }).sort({ date: -1 }).limit(5),
      Voucher.find({
        companyId: req.companyId,
        $or: [{ fromAccountId: ledger._id }, { toAccountId: ledger._id }]
      }).sort({ date: -1 }).limit(5)
    ]);

    res.json({
      success: true,
      ledger,
      recentActivity: { invoices, purchases, vouchers }
    });
  } catch (err) {
    next(err);
  }
}

async function createLedger(req, res, next) {
  try {
    const {
      name,
      group,
      taxType = 'Local',
      gstin = '',
      pan = '',
      address = '',
      city = '',
      pincode = '',
      district = '',
      state = 'Tamil Nadu',
      phone = '',
      email = '',
      openingBalance = 0,
      openingBalanceType = 'Dr',
      creditDays = 30,
      creditLimit = 0
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Ledger/Party name is required.' });
    }

    if (!group) {
      return res.status(400).json({ success: false, message: 'Account group is required.' });
    }

    if (gstin && gstin.trim()) {
      const cleanGstin = gstin.trim().toUpperCase();
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(cleanGstin)) {
        return res.status(400).json({ success: false, message: 'Invalid GSTIN format (e.g., 33AAAAA0000A1Z5).' });
      }
    }

    const initialBal = parseFloat(openingBalance) || 0;

    const ledger = await Ledger.create({
      companyId: req.companyId,
      name: name.trim(),
      group,
      taxType,
      gstin: (gstin || '').trim().toUpperCase(),
      pan: (pan || '').trim().toUpperCase(),
      address,
      city,
      pincode,
      district,
      state,
      phone,
      email,
      openingBalance: initialBal,
      openingBalanceType,
      currentBalance: initialBal,
      currentBalanceType: openingBalanceType,
      creditDays: Number(creditDays) || 30,
      creditLimit: Number(creditLimit) || 0
    });

    res.status(201).json({ success: true, message: 'Ledger created successfully.', ledger });
  } catch (err) {
    next(err);
  }
}

async function updateLedger(req, res, next) {
  try {
    const ledger = await Ledger.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found.' });

    const fields = [
      'name', 'group', 'taxType', 'gstin', 'pan', 'address', 'city', 'pincode',
      'district', 'state', 'phone', 'email', 'creditDays', 'creditLimit', 'isActive'
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) ledger[f] = req.body[f];
    });

    if (req.body.gstin) {
      ledger.gstin = req.body.gstin.trim().toUpperCase();
    }

    await ledger.save();
    res.json({ success: true, message: 'Ledger updated successfully.', ledger });
  } catch (err) {
    next(err);
  }
}

async function deleteLedger(req, res, next) {
  try {
    const ledger = await Ledger.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found.' });

    // Check if any transaction exists
    const hasInvoice = await Invoice.exists({ companyId: req.companyId, partyId: ledger._id });
    const hasPurchase = await Purchase.exists({ companyId: req.companyId, partyId: ledger._id });
    const hasVoucher = await Voucher.exists({
      companyId: req.companyId,
      $or: [{ fromAccountId: ledger._id }, { toAccountId: ledger._id }]
    });

    if (hasInvoice || hasPurchase || hasVoucher) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ledger with existing transactions. Deactivate it instead.'
      });
    }

    await Ledger.findByIdAndDelete(ledger._id);
    res.json({ success: true, message: 'Ledger deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

async function getLedgerGroups(req, res, next) {
  try {
    const groups = await LedgerGroup.find({
      $or: [{ companyId: req.companyId }, { companyId: null }, { isSystem: true }]
    }).sort({ name: 1 });

    const seen = new Set();
    const uniqueGroups = groups.filter(g => {
      if (!g.name || seen.has(g.name)) return false;
      seen.add(g.name);
      return true;
    });

    res.json({ success: true, groups: uniqueGroups });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLedgers,
  getLedgerById,
  createLedger,
  updateLedger,
  deleteLedger,
  getLedgerGroups
};
