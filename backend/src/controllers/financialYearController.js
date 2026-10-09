const FinancialYear = require('../models/FinancialYear');

/**
 * Get all financial years for the company
 */
async function getFinancialYears(req, res, next) {
  try {
    const years = await FinancialYear.find({ companyId: req.companyId }).sort({ startDate: -1 });
    res.json({
      success: true,
      financialYears: years
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Switch active financial year for this company
 */
async function switchFinancialYear(req, res, next) {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Financial year ID is required.' });
    }

    const targetYear = await FinancialYear.findOne({ _id: id, companyId: req.companyId });
    if (!targetYear) {
      return res.status(404).json({ success: false, message: 'Financial year not found.' });
    }

    // Set all other years for THIS company to not current
    await FinancialYear.updateMany({ companyId: req.companyId }, { isCurrent: false });

    // Set selected year as current
    targetYear.isCurrent = true;
    await targetYear.save();

    res.json({
      success: true,
      message: `Active financial year switched to ${targetYear.name}`,
      financialYear: targetYear
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new financial year
 */
async function createFinancialYear(req, res, next) {
  try {
    const { name, code, startDate, endDate, setAsCurrent } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Name, Start Date, and End Date are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const yearCode = code || `${start.getFullYear()}-${end.getFullYear()}`;

    // Check duplicate code within this company
    const existing = await FinancialYear.findOne({ companyId: req.companyId, code: yearCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Financial year ${yearCode} already exists.` });
    }

    if (setAsCurrent) {
      await FinancialYear.updateMany({ companyId: req.companyId }, { isCurrent: false });
    }

    const fy = await FinancialYear.create({
      companyId: req.companyId,
      code: yearCode,
      name,
      startDate: start,
      endDate: end,
      isCurrent: !!setAsCurrent,
      counters: {
        invoice: 1,
        purchase: 1,
        receipt: 1,
        payment: 1,
        contra: 1
      }
    });

    res.status(201).json({
      success: true,
      message: `Financial year ${fy.name} created successfully.`,
      financialYear: fy
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFinancialYears,
  switchFinancialYear,
  createFinancialYear
};
