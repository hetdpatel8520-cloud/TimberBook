const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Owner = require('../models/Owner');
const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const Ledger = require('../models/Ledger');
const LedgerGroup = require('../models/LedgerGroup');
const Settings = require('../models/Settings');
const { normalizeEmail, normalizeMobile, maskIdentifier } = require('../utils/normalize');
const { generateAndDeliverOtp, verifySubmittedOtp } = require('../services/otpService');
const { seedCompanyDefaults } = require('../utils/seedCompanyDefaults');

// In-memory OTP storage for registration verification (fallback / demo)
const otpStore = new Map();

/**
 * Helper: Searches legacy collections (users, companys) if not found in Owner
 */
async function findLegacyAccount(loginId, normMobile, normEmail) {
  const db = mongoose.connection.db;
  if (!db) return null;

  // 1. Check legacy 'users' collection
  try {
    const usersCol = db.collection('users');
    const user = await usersCol.findOne({
      $or: [
        { email: normEmail },
        { email: loginId.toLowerCase() },
        { username: loginId },
        { username: normMobile },
        { mobile: normMobile },
        { phone: normMobile }
      ]
    });
    if (user && user.passwordHash) {
      return { source: 'users', doc: user };
    }
  } catch (e) {
    // collection may not exist
  }

  // 2. Check legacy 'companies' or 'companys' collection
  try {
    for (const colName of ['companies', 'companys']) {
      const compCol = db.collection(colName);
      const comp = await compCol.findOne({
        $or: [
          { email: normEmail },
          { email: loginId.toLowerCase() },
          { phone: normMobile },
          { phone: loginId }
        ]
      });
      if (comp && comp.passwordHash) {
        return { source: colName, doc: comp };
      }
    }
  } catch (e) {
    // collection may not exist
  }

  return null;
}

/**
 * Check if Mobile, Email, or GSTIN is already registered
 */
async function checkDuplicate(req, res, next) {
  try {
    const { mobile, email, gstin } = req.body;
    const maxCompanies = parseInt(process.env.MAX_COMPANIES_PER_OWNER, 10) || 5;

    const cleanMobile = mobile ? mobile.trim() : '';
    const normMobile = cleanMobile ? normalizeMobile(cleanMobile) : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const normEmail = cleanEmail ? normalizeEmail(cleanEmail) : '';

    // Check existing owner by mobile or email
    let existingOwner = null;
    if (cleanMobile || cleanEmail) {
      existingOwner = await Owner.findOne({
        $or: [
          ...(normMobile ? [{ mobileNormalized: normMobile }, { mobile: cleanMobile }] : []),
          ...(normEmail ? [{ emailLower: normEmail }, { email: cleanEmail }] : [])
        ]
      });
    }

    if (existingOwner) {
      const companyCount = await Company.countDocuments({
        ownerId: existingOwner._id,
        isArchived: { $ne: true }
      });

      if (companyCount >= maxCompanies) {
        return res.json({
          success: false,
          isDuplicate: true,
          message: `Account found for ${existingOwner.fullName}, but the maximum limit of ${maxCompanies} companies has been reached.`
        });
      }

      return res.json({
        success: true,
        isDuplicate: false,
        isExistingOwner: true,
        ownerId: existingOwner._id,
        ownerName: existingOwner.fullName,
        companyCount,
        message: `Account found for ${existingOwner.fullName} (${companyCount} existing company).`
      });
    }

    if (gstin && gstin.trim().length >= 10) {
      const cleanGstin = gstin.trim().toUpperCase();
      const existingGst = await Company.findOne({ gstin: cleanGstin, isArchived: { $ne: true } });
      if (existingGst) {
        return res.json({
          success: false,
          isDuplicate: true,
          field: 'gstin',
          message: `GSTIN ${cleanGstin} is already registered with company "${existingGst.name}".`
        });
      }
    }

    return res.json({ success: true, isDuplicate: false, isExistingOwner: false });
  } catch (err) {
    next(err);
  }
}

/**
 * Send 6-digit OTP for Mobile / Email verification
 */
async function sendOtp(req, res, next) {
  try {
    const { mobile, email, fullName, channel = 'all' } = req.body;
    if (!mobile && !email) {
      return res.status(400).json({ success: false, message: 'Mobile number or email is required.' });
    }

    const delivery = await generateAndDeliverOtp({
      mobile,
      email,
      fullName,
      channel
    });

    return res.json({
      success: true,
      message: `Verification code sent to ${delivery.targetMasked}`,
      targetMasked: delivery.targetMasked,
      emailSent: delivery.emailSent,
      smsSent: delivery.smsSent
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify OTP entered by user
 */
async function verifyOtp(req, res, next) {
  try {
    const { mobile, email, identifier, otp, code } = req.body;
    const target = email || mobile || identifier;
    const result = verifySubmittedOtp(target, otp || code);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({ success: true, verified: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Multi-Step Company Registration
 */
async function registerCompany(req, res, next) {
  try {
    const {
      // Step 1: Owner
      fullName,
      mobile,
      email,
      password,
      pin,
      // Step 2: Company Details
      companyName,
      businessType = 'Timber Trader',
      addressLine1,
      addressLine2 = '',
      city,
      district = '',
      state,
      stateCode = '33',
      pincode,
      phone,
      companyEmail = '',
      // Step 3: Tax & Bank
      gstin = '',
      pan = '',
      bankName = '',
      accountNo = '',
      ifsc = '',
      branch = '',
      logoUrl = null,
      signatureUrl = null,
      // Step 4: FY
      fyFrom,
      fyTo
    } = req.body;

    // 1. Validation
    if (!fullName || !mobile || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Owner Full Name, Mobile, Email, and Password are required.'
      });
    }

    if (!companyName || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Company Name, Address, City, State, and Pincode are required.'
      });
    }

    const cleanMobile = mobile.trim();
    const cleanEmail = email.trim().toLowerCase();
    const normMobile = normalizeMobile(cleanMobile);
    const normEmail = normalizeEmail(cleanEmail);
    const cleanGstin = gstin.trim().toUpperCase();

    // 2. Duplicate Checks & Existing Owner Resolution
    const existingOwner = await Owner.findOne({
      $or: [
        { mobileNormalized: normMobile },
        { emailLower: normEmail },
        { mobile: cleanMobile },
        { email: cleanEmail }
      ]
    });

    let owner = existingOwner;
    const maxCompanies = parseInt(process.env.MAX_COMPANIES_PER_OWNER, 10) || 5;

    if (owner) {
      const existingCount = await Company.countDocuments({
        ownerId: owner._id,
        isArchived: { $ne: true }
      });
      if (existingCount >= maxCompanies) {
        return res.status(400).json({
          success: false,
          message: `Maximum limit of ${maxCompanies} companies reached for this account.`
        });
      }
    } else {
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      let pinHash = null;
      if (pin && String(pin).length >= 4) {
        pinHash = await bcrypt.hash(String(pin), salt);
      }

      owner = await Owner.create({
        fullName: fullName.trim(),
        mobile: cleanMobile,
        mobileNormalized: normMobile,
        email: cleanEmail,
        emailLower: normEmail,
        username: normMobile || cleanMobile,
        passwordHash,
        pinHash,
        biometricEnabled: !!pinHash,
        isVerified: true
      });
    }

    if (cleanGstin) {
      const existingGstin = await Company.findOne({ gstin: cleanGstin, isArchived: { $ne: true } });
      if (existingGstin) {
        return res.status(400).json({
          success: false,
          message: `GSTIN ${cleanGstin} is already registered with company "${existingGstin.name}".`
        });
      }
    }

    // 3. Create Company
    const fullAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1;
    const company = await Company.create({
      name: companyName.trim(),
      businessType,
      tagline: `${businessType} & Merchants`,
      addressLine1,
      addressLine2,
      address: fullAddress,
      city: city.trim(),
      district: district.trim() || city.trim(),
      state: state.trim(),
      stateCode: stateCode || '33',
      pincode: pincode.trim(),
      phone: (phone || cleanMobile).trim(),
      email: companyEmail.trim().toLowerCase() || cleanEmail,
      companyEmail: companyEmail.trim().toLowerCase() || cleanEmail,
      gstin: cleanGstin,
      pan: pan.trim().toUpperCase() || (cleanGstin.length >= 14 ? cleanGstin.substring(2, 12) : ''),
      ownerId: owner._id,
      bankDetails: {
        bankName: bankName.trim(),
        accountName: companyName.trim(),
        accountNo: accountNo.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        branch: branch.trim() || city.trim()
      },
      logoUrl,
      signatureUrl,
      isDefault: false,
      isArchived: false
    });

    // 4. Update owner active company pointers
    owner.activeCompanyId = company._id;
    owner.companyId = company._id;
    await owner.save();

    // 5. Seed masters using seedCompanyDefaults
    const { financialYear } = await seedCompanyDefaults({
      company,
      owner,
      fyFrom,
      fyTo,
      bankName,
      accountNo
    });

    // 6. Issue JWT
    const token = jwt.sign(
      {
        id: owner._id,
        ownerId: owner._id,
        companyId: company._id,
        mobile: owner.mobile,
        email: owner.email,
        fullName: owner.fullName
      },
      process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Company successfully registered and activated!',
      token,
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        mobile: owner.mobile,
        email: owner.email,
        biometricEnabled: owner.biometricEnabled,
        hasPin: !!owner.pinHash
      },
      company,
      financialYear,
      settings
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Universal Login: Accepts Mobile, Email, or Username + Password
 * Normalizes inputs (+91, spaces, 0 prefix, uppercase) and supports legacy migration
 */
async function login(req, res, next) {
  try {
    const { identifier, username, password } = req.body;
    const loginId = (identifier || username || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number or email, and password are required.'
      });
    }

    const normMobile = normalizeMobile(loginId);
    const normEmail = normalizeEmail(loginId);

    // 1. Primary lookup in Owner collection
    let owner = await Owner.findOne({
      $or: [
        { mobileNormalized: normMobile },
        { emailLower: normEmail },
        { mobile: loginId },
        { email: normEmail },
        { username: loginId },
        { username: normMobile }
      ]
    });

    // 2. Legacy fallback lookup if not found in Owner
    if (!owner) {
      const legacy = await findLegacyAccount(loginId, normMobile, normEmail);
      if (legacy && legacy.doc.passwordHash) {
        const isLegacyMatch = await bcrypt.compare(password, legacy.doc.passwordHash);
        if (isLegacyMatch) {
          console.log(`[AUTH] Auto-migrating legacy account (${legacy.source}) for ${maskIdentifier(loginId)}`);
          owner = await Owner.create({
            fullName: legacy.doc.fullName || legacy.doc.name || legacy.doc.username || 'Owner',
            mobile: legacy.doc.mobile || legacy.doc.phone || normMobile || '0000000000',
            mobileNormalized: normMobile || normalizeMobile(legacy.doc.mobile || legacy.doc.phone || ''),
            email: legacy.doc.email || normEmail || 'legacy@timberbooks.app',
            emailLower: normEmail || normalizeEmail(legacy.doc.email || ''),
            username: legacy.doc.username || normMobile || loginId,
            passwordHash: legacy.doc.passwordHash,
            pinHash: legacy.doc.pinHash || null,
            companyId: legacy.doc.companyId || legacy.doc._id,
            isVerified: true
          });
        }
      }
    }

    if (!owner) {
      console.warn(`[AUTH] Login failed for ${maskIdentifier(loginId)} - Reason: Account not found`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check the mobile number or email, or use Forgot Password. Not registered? Register your company.'
      });
    }

    // Check account lockout
    if (owner.lockUntil && owner.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((owner.lockUntil - Date.now()) / (60 * 1000));
      console.warn(`[AUTH] Login blocked for ${maskIdentifier(loginId)} - Reason: Account locked`);
      return res.status(429).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`
      });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, owner.passwordHash);
    if (!isMatch) {
      owner.failedLoginAttempts = (owner.failedLoginAttempts || 0) + 1;
      if (owner.failedLoginAttempts >= 5) {
        owner.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        console.warn(`[AUTH] Account locked for ${maskIdentifier(loginId)} after 5 failed attempts`);
      }
      await owner.save();

      console.warn(`[AUTH] Login failed for ${maskIdentifier(loginId)} - Reason: Incorrect password (attempt ${owner.failedLoginAttempts})`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check the mobile number or email, or use Forgot Password. Not registered? Register your company.'
      });
    }

    // Successful login: reset failed attempts
    owner.failedLoginAttempts = 0;
    owner.lockUntil = null;
    owner.lastLogin = new Date();
    await owner.save();

    let companies = await Company.find({
      ownerId: owner._id,
      isArchived: { $ne: true }
    }).sort({ isDefault: -1, createdAt: 1 });

    let activeCompany = null;
    const targetCompId = owner.activeCompanyId || owner.companyId;
    if (targetCompId) {
      activeCompany = companies.find(c => String(c._id) === String(targetCompId));
    }
    if (!activeCompany && companies.length > 0) {
      activeCompany = companies[0];
      owner.activeCompanyId = activeCompany._id;
      owner.companyId = activeCompany._id;
      await owner.save();
    }

    if (!activeCompany) {
      activeCompany = await Company.findById(owner.companyId);
      if (activeCompany) {
        activeCompany.ownerId = owner._id;
        await activeCompany.save();
        companies = [activeCompany];
      } else {
        return res.status(404).json({ success: false, message: 'Company associated with this account was not found.' });
      }
    }

    const currentFY = await FinancialYear.findOne({
      companyId: activeCompany._id,
      isCurrent: true
    }) || await FinancialYear.findOne({ companyId: activeCompany._id });

    const token = jwt.sign(
      {
        id: owner._id,
        ownerId: owner._id,
        companyId: activeCompany._id,
        mobile: owner.mobile,
        email: owner.email,
        fullName: owner.fullName
      },
      process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    console.log(`[AUTH] Login successful for ${maskIdentifier(loginId)} (Company: ${activeCompany.name})`);

    res.json({
      success: true,
      token,
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        mobile: owner.mobile,
        email: owner.email,
        biometricEnabled: owner.biometricEnabled,
        hasPin: !!owner.pinHash,
        activeCompanyId: activeCompany._id
      },
      company: activeCompany,
      companies,
      financialYear: currentFY
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Quick PIN Login
 */
async function verifyPin(req, res, next) {
  try {
    const { pin, identifier } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN is required.' });
    }

    let owner = null;
    if (identifier) {
      const cleanId = identifier.trim();
      const normMobile = normalizeMobile(cleanId);
      const normEmail = normalizeEmail(cleanId);
      owner = await Owner.findOne({
        $or: [
          { mobileNormalized: normMobile },
          { emailLower: normEmail },
          { mobile: cleanId },
          { email: normEmail },
          { username: cleanId }
        ]
      });
    } else {
      owner = await Owner.findOne({ pinHash: { $ne: null } });
    }

    if (!owner || !owner.pinHash) {
      return res.status(400).json({
        success: false,
        message: 'Quick PIN is not configured. Please log in with your password.'
      });
    }

    const isMatch = await bcrypt.compare(String(pin), owner.pinHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect PIN.' });
    }

    let companies = await Company.find({
      ownerId: owner._id,
      isArchived: { $ne: true }
    }).sort({ isDefault: -1, createdAt: 1 });

    let activeCompany = null;
    const targetCompId = owner.activeCompanyId || owner.companyId;
    if (targetCompId) {
      activeCompany = companies.find(c => String(c._id) === String(targetCompId));
    }
    if (!activeCompany && companies.length > 0) {
      activeCompany = companies[0];
    }
    if (!activeCompany) {
      activeCompany = await Company.findById(owner.companyId);
      if (activeCompany) companies = [activeCompany];
    }

    const currentFY = activeCompany ? (await FinancialYear.findOne({
      companyId: activeCompany._id,
      isCurrent: true
    }) || await FinancialYear.findOne({ companyId: activeCompany._id })) : null;

    const token = jwt.sign(
      {
        id: owner._id,
        ownerId: owner._id,
        companyId: activeCompany?._id,
        mobile: owner.mobile,
        email: owner.email,
        fullName: owner.fullName
      },
      process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        mobile: owner.mobile,
        email: owner.email,
        biometricEnabled: owner.biometricEnabled,
        hasPin: true,
        activeCompanyId: activeCompany?._id
      },
      company: activeCompany,
      companies,
      financialYear: currentFY
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Forgot Password Request (Sends OTP to Mobile/Email)
 */
async function forgotPasswordRequest(req, res, next) {
  try {
    const { identifier, channel = 'all' } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Registered mobile number or email is required.' });
    }

    const cleanId = identifier.trim();
    const normMobile = normalizeMobile(cleanId);
    const normEmail = normalizeEmail(cleanId);

    const owner = await Owner.findOne({
      $or: [
        { mobileNormalized: normMobile },
        { emailLower: normEmail },
        { mobile: cleanId },
        { email: normEmail },
        { username: cleanId }
      ]
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this Mobile or Email. Please check or register.'
      });
    }

    const delivery = await generateAndDeliverOtp({
      mobile: owner.mobile,
      email: owner.email,
      fullName: owner.fullName,
      channel
    });

    return res.json({
      success: true,
      message: `Password reset verification code sent to ${delivery.targetMasked}`,
      targetMasked: delivery.targetMasked
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset Password & PIN via OTP
 */
async function resetPassword(req, res, next) {
  try {
    const { identifier, otp, newPassword, newPin } = req.body;
    if (!identifier || !otp || (!newPassword && !newPin)) {
      return res.status(400).json({
        success: false,
        message: 'Identifier, OTP, and new Password or PIN are required.'
      });
    }

    const cleanId = identifier.trim();
    const cleanOtp = String(otp).trim();
    const normMobile = normalizeMobile(cleanId);
    const normEmail = normalizeEmail(cleanId);

    const owner = await Owner.findOne({
      $or: [
        { mobileNormalized: normMobile },
        { emailLower: normEmail },
        { mobile: cleanId },
        { email: normEmail },
        { username: cleanId }
      ]
    });

    if (!owner) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const verifyResult = verifySubmittedOtp(owner.email || owner.mobile, cleanOtp);
    if (!verifyResult.success) {
      return res.status(400).json({ success: false, message: verifyResult.message });
    }

    const salt = await bcrypt.genSalt(10);
    if (newPassword && newPassword.trim().length >= 4) {
      owner.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    }

    if (newPin && String(newPin).trim().length >= 4) {
      owner.pinHash = await bcrypt.hash(String(newPin).trim(), salt);
      owner.biometricEnabled = true;
    }

    owner.resetOtp = null;
    owner.resetOtpExpires = null;
    owner.failedLoginAttempts = 0;
    owner.lockUntil = null;
    await owner.save();

    console.log(`[AUTH] Password/PIN successfully reset for ${maskIdentifier(cleanId)}`);

    return res.json({
      success: true,
      message: 'Password and security credentials updated successfully. Please log in.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch Current Authenticated Owner & Company Profile
 */
async function getMe(req, res, next) {
  try {
    const ownerId = req.ownerId || req.owner?.id || req.owner?.ownerId;
    const owner = await Owner.findById(ownerId);
    if (!owner) return res.status(404).json({ success: false, message: 'User not found.' });

    const companies = await Company.find({
      ownerId,
      isArchived: { $ne: true }
    }).sort({ isDefault: -1, createdAt: 1 });

    const activeCompany = req.company || companies.find(c => String(c._id) === String(req.companyId)) || companies[0];

    const financialYear = activeCompany ? await FinancialYear.findOne({
      companyId: activeCompany._id,
      isCurrent: true
    }) : null;

    res.json({
      success: true,
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        mobile: owner.mobile,
        email: owner.email,
        biometricEnabled: owner.biometricEnabled,
        hasPin: !!owner.pinHash,
        activeCompanyId: activeCompany?._id
      },
      company: activeCompany,
      companies,
      financialYear
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Security Settings (Password / PIN / Biometric)
 */
async function updateSecurity(req, res, next) {
  try {
    const { currentPassword, newPassword, newPin, biometricEnabled } = req.body;
    const owner = await Owner.findById(req.owner.id || req.owner.ownerId);
    if (!owner) return res.status(404).json({ success: false, message: 'User not found.' });

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, owner.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password does not match.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    if (newPassword && newPassword.length >= 4) {
      owner.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    if (newPin && String(newPin).length >= 4) {
      owner.pinHash = await bcrypt.hash(String(newPin), salt);
    } else if (newPin === null) {
      owner.pinHash = null;
    }

    if (biometricEnabled !== undefined) {
      owner.biometricEnabled = biometricEnabled;
    }

    await owner.save();

    res.json({
      success: true,
      message: 'Security credentials updated successfully.',
      biometricEnabled: owner.biometricEnabled,
      hasPin: !!owner.pinHash
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkDuplicate,
  sendOtp,
  verifyOtp,
  registerCompany,
  login,
  verifyPin,
  forgotPasswordRequest,
  resetPassword,
  getMe,
  updateSecurity
};
