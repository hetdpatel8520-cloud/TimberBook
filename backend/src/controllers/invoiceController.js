const Invoice = require('../models/Invoice');
const Ledger = require('../models/Ledger');
const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const { calculateCft, calculateCoreWoodCft, cftToCbm, calculateGst, calculateRoundOff } = require('../services/timberMath');
const { postInvoiceAccounting, reverseInvoiceAccounting } = require('../services/accountingEngine');
const { generateInvoicePdf } = require('../services/pdfService');

async function getInvoices(req, res, next) {
  try {
    const { startDate, endDate, partyId, billType, search, limit = 50, page = 1 } = req.query;
    let query = { companyId: req.companyId };

    if (partyId) query.partyId = partyId;
    if (billType) query.billType = billType;

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
        { billNo: regex },
        { challanNo: regex },
        { 'partySnapshot.name': regex },
        { 'partySnapshot.city': regex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Invoice.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      invoices
    });
  } catch (err) {
    next(err);
  }
}

async function getNextBillNo(req, res, next) {
  try {
    const company = await Company.findById(req.companyId);
    const fy = await FinancialYear.findOne({ companyId: req.companyId, isCurrent: true }) ||
      await FinancialYear.findOne({ companyId: req.companyId });
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne({ companyId: req.companyId });

    const invoiceCount = await Invoice.countDocuments({ companyId: req.companyId });
    let counter = fy?.counters?.invoice;
    if (counter === undefined || counter === null || (counter >= 1000 && invoiceCount === 0)) {
      counter = 1;
      if (fy) {
        if (!fy.counters) fy.counters = {};
        fy.counters.invoice = 1;
        await fy.save();
      }
    }

    const prefix = settings?.invoicePrefix ? settings.invoicePrefix : '';
    const nextBillNo = prefix ? `${prefix}${counter}` : String(counter);

    res.json({
      success: true,
      nextBillNo,
      counter,
      prefix,
      fyCode: fy?.code
    });
  } catch (err) {
    next(err);
  }
}

async function getInvoiceById(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    res.json({ success: true, invoice });
  } catch (err) {
    next(err);
  }
}

async function createInvoice(req, res, next) {
  try {
    const {
      billType = 'Size',
      billNo,
      challanNo = '',
      mode = 'Credit',
      partyId,
      date = new Date(),
      orderNo = '',
      deliveryAt = '',
      items = [],
      extraDetails = {}
    } = req.body;

    if (!partyId) {
      return res.status(400).json({ success: false, message: 'Customer/Party is required.' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item row is required.' });
    }

    const party = await Ledger.findOne({ _id: partyId, companyId: req.companyId });
    if (!party) {
      return res.status(400).json({ success: false, message: 'Selected party ledger does not exist.' });
    }

    const company = await Company.findById(req.companyId);
    const isLocal = !party.stateCode || !company?.stateCode || party.stateCode === company.stateCode;

    // Process and calculate each item row
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const processedItems = items.map((row) => {
      let qty = parseFloat(row.qty) || 1;
      let cft = parseFloat(row.cft) || 0;
      let cbm = parseFloat(row.cbm) || 0;
      let rate = parseFloat(row.rate) || 0;

      // In Size mode: if dimensions provided, calculate CFT & CBM
      if (billType === 'Size') {
        const pieces = parseFloat(row.pieces) || qty;
        const thickness = parseFloat(row.thickness) || 0;
        const width = parseFloat(row.width) || 0;
        const length = parseFloat(row.length) || 0;

        if (thickness > 0 && width > 0 && length > 0) {
          cft = calculateCft(thickness, width, length, pieces);
          cbm = cftToCbm(cft);
        }

        if (row.rateUnit === 'CBM' && cbm > 0) {
          rate = parseFloat(row.cbmRate) || rate;
          row.amount = parseFloat((cbm * rate).toFixed(2));
        } else if (cft > 0) {
          rate = parseFloat(row.cftRate) || rate;
          row.amount = parseFloat((cft * rate).toFixed(2));
        } else {
          row.amount = parseFloat((pieces * rate).toFixed(2));
        }
      } else if (billType === 'Core Wood') {
        const pieces = parseFloat(row.pieces) || qty;
        const girth = parseFloat(row.girth) || 0;
        const length = parseFloat(row.length) || 0;

        if (girth > 0 && length > 0) {
          cft = calculateCoreWoodCft(girth, length, pieces);
          cbm = cftToCbm(cft);
        }

        if (row.rateUnit === 'CBM' && cbm > 0) {
          rate = parseFloat(row.cbmRate) || rate;
          row.amount = parseFloat((cbm * rate).toFixed(2));
        } else if (cft > 0) {
          rate = parseFloat(row.cftRate) || rate;
          row.amount = parseFloat((cft * rate).toFixed(2));
        } else {
          row.amount = parseFloat((pieces * rate).toFixed(2));
        }
      } else {
        // Normal or Drum
        row.amount = parseFloat((qty * rate).toFixed(2));
      }

      // GST calculation
      const taxRate = parseFloat(row.taxPercent || (row.cgstRate + row.sgstRate + row.igstRate) || 18);
      const tax = calculateGst(row.amount, taxRate, isLocal);

      row.cgstRate = tax.cgstRate;
      row.sgstRate = tax.sgstRate;
      row.igstRate = tax.igstRate;
      row.cgstAmount = tax.cgstAmount;
      row.sgstAmount = tax.sgstAmount;
      row.igstAmount = tax.igstAmount;
      row.total = parseFloat((row.amount + tax.taxTotal).toFixed(2));

      subtotal += row.amount;
      cgstTotal += tax.cgstAmount;
      sgstTotal += tax.sgstAmount;
      igstTotal += tax.igstAmount;

      return {
        ...row,
        qty,
        cft,
        cbm,
        rate,
        unit: row.unit || row.rateUnit || 'CFT',
        rateUnit: row.rateUnit || row.unit || 'CFT'
      };
    });

    subtotal = parseFloat(subtotal.toFixed(2));
    cgstTotal = parseFloat(cgstTotal.toFixed(2));
    sgstTotal = parseFloat(sgstTotal.toFixed(2));
    igstTotal = parseFloat(igstTotal.toFixed(2));

    const grossTotal = subtotal + cgstTotal + sgstTotal + igstTotal;
    const { roundOff, grandTotal } = calculateRoundOff(grossTotal);

    // Auto Bill Number if not provided
    let finalBillNo = (billNo || '').trim();
    const fy = await FinancialYear.findOne({ companyId: req.companyId, isCurrent: true }) ||
      await FinancialYear.findOne({ companyId: req.companyId });

    if (!finalBillNo) {
      const counter = fy?.counters?.invoice || 1;
      const Settings = require('../models/Settings');
      const settings = await Settings.findOne({ companyId: req.companyId });
      const prefix = settings?.invoicePrefix ? settings.invoicePrefix : '';
      finalBillNo = prefix ? `${prefix}${counter}` : String(counter);
    }

    // Check duplicate billNo within this company
    const existing = await Invoice.findOne({ companyId: req.companyId, billNo: finalBillNo });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Invoice number "${finalBillNo}" already exists. Please choose another.`
      });
    }

    const partySnapshot = {
      name: party.name,
      city: party.city,
      gstin: party.gstin,
      state: party.state,
      stateCode: party.stateCode,
      address: party.address,
      phone: party.phone
    };

    const invoice = await Invoice.create({
      companyId: req.companyId,
      billType,
      billNo: finalBillNo,
      challanNo,
      mode,
      partyId: party._id,
      partySnapshot,
      date: new Date(date),
      orderNo,
      deliveryAt,
      items: processedItems,
      subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      roundOff,
      grandTotal,
      extraDetails,
      financialYearId: fy?._id
    });

    // Accounting & Stock posting
    await postInvoiceAccounting(invoice);

    // Increment FY counter based on finalBillNo
    if (fy) {
      if (!fy.counters) fy.counters = {};
      const match = String(finalBillNo).match(/\d+$/);
      if (match) {
        const usedNum = parseInt(match[0], 10);
        fy.counters.invoice = Math.max((fy.counters.invoice || 1), usedNum + 1);
      } else {
        fy.counters.invoice = (fy.counters.invoice || 1) + 1;
      }
      await fy.save();
    }

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully.',
      invoice
    });
  } catch (err) {
    next(err);
  }
}

async function cancelInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    if (invoice.isCancelled) {
      return res.status(400).json({ success: false, message: 'Invoice is already cancelled.' });
    }

    await reverseInvoiceAccounting(invoice);
    invoice.isCancelled = true;
    await invoice.save();

    res.json({ success: true, message: 'Invoice cancelled and stock/ledger balances reversed.' });
  } catch (err) {
    next(err);
  }
}

async function downloadInvoicePdf(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const company = await Company.findById(invoice.companyId);

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename=Invoice-${invoice.billNo.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`);

    generateInvoicePdf(invoice, company || {}, res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInvoices,
  getNextBillNo,
  getInvoiceById,
  createInvoice,
  cancelInvoice,
  downloadInvoicePdf
};
