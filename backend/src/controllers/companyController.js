const Company = require('../models/Company');

async function getCompany(req, res, next) {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }
    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

async function updateCompany(req, res, next) {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const allowedFields = [
      'name', 'businessType', 'tagline', 'addressLine1', 'addressLine2', 'address',
      'city', 'district', 'pincode', 'state', 'stateCode',
      'gstin', 'pan', 'phone', 'email', 'bankDetails', 'logoUrl', 'signatureUrl',
      'termsAndConditions', 'defaultCftFactor'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    await company.save();
    res.json({ success: true, message: 'Company updated successfully.', company });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCompany,
  updateCompany
};
