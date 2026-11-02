const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const Owner = require('../models/Owner');
const FinancialYear = require('../models/FinancialYear');
const { seedCompanyDefaults } = require('../utils/seedCompanyDefaults');

const MAX_COMPANIES_PER_OWNER = parseInt(process.env.MAX_COMPANIES_PER_OWNER, 10) || 5;

/**
 * GET /api/company
 * Get current active company
 */
async function getCompany(req, res, next) {
  try {
    if (!req.companyId) {
      return res.status(404).json({ success: false, message: 'No active company found.' });
    }
    const company = await Company.findById(req.companyId);
    if (!company || company.isArchived) {
      return res.status(404).json({ success: false, message: 'Company not found or archived.' });
    }
    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/company
 * Update current active company
 */
async function updateCompany(req, res, next) {
  try {
    if (!req.companyId) {
      return res.status(404).json({ success: false, message: 'No active company found.' });
    }
    const company = await Company.findOne({
      _id: req.companyId,
      ownerId: req.ownerId,
      isArchived: { $ne: true }
    });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found or unauthorized.' });
    }

    const allowedFields = [
      'name', 'businessType', 'tagline', 'addressLine1', 'addressLine2', 'address',
      'city', 'district', 'pincode', 'state', 'stateCode',
      'gstin', 'pan', 'phone', 'email', 'companyEmail', 'bankDetails', 'logoUrl', 'signatureUrl',
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

/**
 * GET /api/companies
 * Get all active companies belonging to the authenticated owner
 */
async function getMyCompanies(req, res, next) {
  try {
    const companies = await Company.find({
      ownerId: req.ownerId,
      isArchived: { $ne: true }
    }).sort({ isDefault: -1, createdAt: 1 });

    const owner = await Owner.findById(req.ownerId).select('activeCompanyId companyId');
    const activeCompanyId = req.companyId || owner?.activeCompanyId || owner?.companyId;

    res.json({
      success: true,
      companies,
      activeCompanyId,
      maxAllowed: MAX_COMPANIES_PER_OWNER,
      canAddMore: companies.length < MAX_COMPANIES_PER_OWNER
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/companies
 * Create a new company under the current owner (multi-company support)
 */
async function createCompany(req, res, next) {
  try {
    const owner = await Owner.findById(req.ownerId);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner account not found.' });
    }

    // 1. Check max companies limit
    const existingCount = await Company.countDocuments({
      ownerId: req.ownerId,
      isArchived: { $ne: true }
    });

    if (existingCount >= MAX_COMPANIES_PER_OWNER) {
      return res.status(400).json({
        success: false,
        message: `Maximum company limit of ${MAX_COMPANIES_PER_OWNER} reached. Please upgrade or archive an unused company.`
      });
    }

    const {
      companyName,
      name,
      businessType = 'Timber Trader',
      tagline,
      addressLine1 = '',
      addressLine2 = '',
      address,
      city,
      district = '',
      state = 'Tamil Nadu',
      stateCode = '33',
      pincode,
      phone,
      companyEmail,
      email,
      gstin = '',
      pan = '',
      bankName = '',
      accountNo = '',
      ifsc = '',
      branch = '',
      logoUrl = null,
      signatureUrl = null,
      fyFrom,
      fyTo,
      setAsActive = true
    } = req.body;

    const finalName = (companyName || name || '').trim();
    if (!finalName) {
      return res.status(400).json({ success: false, message: 'Company Name is required.' });
    }
    if (!city || !pincode) {
      return res.status(400).json({ success: false, message: 'City and Pincode are required.' });
    }

    // 2. GSTIN uniqueness check across active companies
    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin) {
      const duplicateGst = await Company.findOne({
        gstin: cleanGstin,
        isArchived: { $ne: true }
      });
      if (duplicateGst) {
        return res.status(400).json({
          success: false,
          message: `GSTIN ${cleanGstin} is already registered with company "${duplicateGst.name}".`
        });
      }
    }

    const fullAddress = address || [addressLine1, addressLine2, city, `${state} - ${pincode}`].filter(Boolean).join(', ');

    // 3. Create Company document
    const newCompany = await Company.create({
      name: finalName,
      businessType,
      tagline: tagline || 'Timber Merchants & Saw Mill',
      addressLine1,
      addressLine2,
      address: fullAddress,
      city: city.trim(),
      district: district.trim(),
      state: state.trim(),
      stateCode,
      pincode: pincode.trim(),
      phone: (phone || owner.mobile).trim(),
      email: (companyEmail || email || owner.email).trim().toLowerCase(),
      companyEmail: (companyEmail || email || owner.email).trim().toLowerCase(),
      gstin: cleanGstin,
      pan: (pan || (cleanGstin.length >= 14 ? cleanGstin.substring(2, 12) : '')).trim().toUpperCase(),
      ownerId: owner._id,
      bankDetails: {
        bankName: bankName.trim(),
        accountName: finalName,
        accountNo: accountNo.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        branch: branch.trim()
      },
      logoUrl,
      signatureUrl,
      isDefault: existingCount === 0,
      isArchived: false
    });

    // 4. Seed default financial year, ledger groups, cash/bank ledgers, and settings
    const { financialYear } = await seedCompanyDefaults({
      company: newCompany,
      owner,
      fyFrom,
      fyTo,
      bankName,
      accountNo
    });

    // 5. Update owner activeCompany if requested
    if (setAsActive || existingCount === 0) {
      owner.activeCompanyId = newCompany._id;
      owner.companyId = newCompany._id;
      await owner.save();
    }

    // 6. Issue refreshed JWT
    const token = jwt.sign(
      {
        id: owner._id,
        ownerId: owner._id,
        companyId: newCompany._id,
        mobile: owner.mobile,
        email: owner.email,
        fullName: owner.fullName
      },
      process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: `Company "${newCompany.name}" created successfully!`,
      company: newCompany,
      token,
      financialYear
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/companies/:id/switch
 * Switch the active company for the authenticated owner
 */
async function switchCompany(req, res, next) {
  try {
    const targetId = req.params.id;
    const company = await Company.findOne({
      _id: targetId,
      ownerId: req.ownerId,
      isArchived: { $ne: true }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found or unauthorized.'
      });
    }

    // Update Owner active company
    await Owner.findByIdAndUpdate(req.ownerId, {
      activeCompanyId: company._id,
      companyId: company._id
    });

    const currentFY = await FinancialYear.findOne({
      companyId: company._id,
      isCurrent: true
    }) || await FinancialYear.findOne({ companyId: company._id });

    // Issue refreshed JWT pointing to new company
    const token = jwt.sign(
      {
        id: req.owner.id || req.ownerId,
        ownerId: req.ownerId,
        companyId: company._id,
        mobile: req.owner.mobile,
        email: req.owner.email,
        fullName: req.owner.fullName
      },
      process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: `Switched active company to ${company.name}`,
      company,
      token,
      currentFY
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/companies/:id
 * Update a specific company belonging to owner
 */
async function updateCompanyById(req, res, next) {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      ownerId: req.ownerId,
      isArchived: { $ne: true }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found or unauthorized.' });
    }

    const allowedFields = [
      'name', 'businessType', 'tagline', 'addressLine1', 'addressLine2', 'address',
      'city', 'district', 'pincode', 'state', 'stateCode',
      'gstin', 'pan', 'phone', 'email', 'companyEmail', 'bankDetails', 'logoUrl', 'signatureUrl',
      'termsAndConditions', 'defaultCftFactor', 'isDefault'
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

/**
 * POST /api/companies/:id/archive
 * Soft-archive a company
 */
async function archiveCompany(req, res, next) {
  try {
    const activeCount = await Company.countDocuments({
      ownerId: req.ownerId,
      isArchived: { $ne: true }
    });

    if (activeCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot archive your only active company. You must have at least one active company.'
      });
    }

    const company = await Company.findOne({
      _id: req.params.id,
      ownerId: req.ownerId,
      isArchived: { $ne: true }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found or already archived.' });
    }

    company.isArchived = true;
    await company.save();

    // If archived company was the active company, switch to another active company
    const owner = await Owner.findById(req.ownerId);
    let newActiveCompany = null;
    let newToken = null;

    if (String(owner.activeCompanyId) === String(company._id)) {
      newActiveCompany = await Company.findOne({
        ownerId: req.ownerId,
        isArchived: { $ne: true }
      }).sort({ isDefault: -1, createdAt: 1 });

      if (newActiveCompany) {
        owner.activeCompanyId = newActiveCompany._id;
        owner.companyId = newActiveCompany._id;
        await owner.save();

        newToken = jwt.sign(
          {
            id: owner._id,
            ownerId: owner._id,
            companyId: newActiveCompany._id,
            mobile: owner.mobile,
            email: owner.email,
            fullName: owner.fullName
          },
          process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026',
          { expiresIn: '30d' }
        );
      }
    }

    res.json({
      success: true,
      message: `Company "${company.name}" has been archived.`,
      newActiveCompany,
      token: newToken
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCompany,
  updateCompany,
  getMyCompanies,
  createCompany,
  switchCompany,
  updateCompanyById,
  archiveCompany
};
