const Purchase = require('../models/Purchase');
const Ledger = require('../models/Ledger');
const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const { calculateGst, calculateRoundOff } = require('../services/timberMath');
const { postPurchaseAccounting } = require('../services/accountingEngine');

async function getPurchases(req, res, next) {
  try {
    const { startDate, endDate, partyId, search, limit = 50, page = 1 } = req.query;
    let query = { companyId: req.companyId };

    if (partyId) query.partyId = partyId;

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
        { purchaseNo: regex },
        { supplierBillNo: regex },
        { 'partySnapshot.name': regex },
        { vehicleNo: regex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [purchases, total] = await Promise.all([
      Purchase.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Purchase.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      purchases
    });
  } catch (err) {
    next(err);
  }
}

async function getPurchaseById(req, res, next) {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase record not found.' });
    res.json({ success: true, purchase });
  } catch (err) {
    next(err);
  }
}

async function createPurchase(req, res, next) {
  try {
    const {
      mode = 'Credit',
      partyId,
      supplierBillNo = '',
      date = new Date(),
      items = [],
      vehicleNo = ''
    } = req.body;

    if (!partyId) {
      return res.status(400).json({ success: false, message: 'Supplier / Party is required.' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one purchase item is required.' });
    }

    const party = await Ledger.findOne({ _id: partyId, companyId: req.companyId });
    if (!party) {
      return res.status(400).json({ success: false, message: 'Selected supplier ledger does not exist.' });
    }

    const company = await Company.findById(req.companyId);
    const isLocal = !party.stateCode || !company?.stateCode || party.stateCode === company.stateCode;

    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const processedItems = items.map((row) => {
      const qty = parseFloat(row.qty) || 1;
      const rate = parseFloat(row.rate) || 0;
      const disc = parseFloat(row.discPercent) || 0;

      let grossLine = qty * rate;
      if (disc > 0) {
        grossLine -= (grossLine * disc) / 100;
      }
      const lineAmount = parseFloat(grossLine.toFixed(2));

      const taxRate = parseFloat(row.taxPercent || 18);
      const tax = calculateGst(lineAmount, taxRate, isLocal);

      row.amount = lineAmount;
      row.cgstAmount = tax.cgstAmount;
      row.sgstAmount = tax.sgstAmount;
      row.igstAmount = tax.igstAmount;
      row.total = parseFloat((lineAmount + tax.taxTotal).toFixed(2));

      subtotal += lineAmount;
      cgstTotal += tax.cgstAmount;
      sgstTotal += tax.sgstAmount;
      igstTotal += tax.igstAmount;

      return {
        ...row,
        qty,
        rate
      };
    });

    subtotal = parseFloat(subtotal.toFixed(2));
    cgstTotal = parseFloat(cgstTotal.toFixed(2));
    sgstTotal = parseFloat(sgstTotal.toFixed(2));
    igstTotal = parseFloat(igstTotal.toFixed(2));

    const grossTotal = subtotal + cgstTotal + sgstTotal + igstTotal;
    const { roundOff, grandTotal } = calculateRoundOff(grossTotal);

    const fy = await FinancialYear.findOne({ companyId: req.companyId, isCurrent: true }) ||
      await FinancialYear.findOne({ companyId: req.companyId });

    const counter = fy?.counters?.purchase || 501;
    const shortYear = (fy?.code || '26-27').split('-').map(y => y.slice(-2)).join('-');
    const purchaseNo = `PUR/${shortYear}/${counter}`;

    const partySnapshot = {
      name: party.name,
      city: party.city,
      gstin: party.gstin,
      state: party.state,
      stateCode: party.stateCode,
      address: party.address,
      phone: party.phone
    };

    const purchase = await Purchase.create({
      companyId: req.companyId,
      mode,
      partyId: party._id,
      partySnapshot,
      purchaseNo,
      supplierBillNo,
      date: new Date(date),
      items: processedItems,
      subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      roundOff,
      grandTotal,
      vehicleNo,
      financialYearId: fy?._id
    });

    // Accounting & Stock increment
    await postPurchaseAccounting(purchase);

    // Increment FY counter
    if (fy) {
      fy.counters.purchase = counter + 1;
      await fy.save();
    }

    res.status(201).json({
      success: true,
      message: 'Purchase recorded successfully.',
      purchase
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase
};
