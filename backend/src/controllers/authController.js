const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const Ledger = require('../models/Ledger');
const LedgerGroup = require('../models/LedgerGroup');
const Settings = require('../models/Settings');

// In-memory OTP storage for registration verification
const otpStore = new Map();

/**
 * Check if Mobile, Email, or GSTIN is already registered
 */
async function checkDuplicate(req, res, next) {
  try {
    const { mobile, email, gstin } = req.body;

    if (mobile) {
      const cleanMobile = mobile.trim();
      const existing = await Owner.findOne({ mobile: cleanMobile });
      if (existing) {
        return res.json({
          success: false,
          isDuplicate: true,
          field: 'mobile',
          message: `A company is already registered with mobile number ${cleanMobile}. Please log in.`
        });
      }
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const existing = await Owner.findOne({ email: cleanEmail });
      if (existing) {
        return res.json({
          success: false,
          isDuplicate: true,
          field: 'email',
          message: `A company is already registered with email ${cleanEmail}. Please log in.`
        });
      }
    }

    if (gstin && gstin.trim().length >= 10) {
      const cleanGstin = gstin.trim().toUpperCase();
      const existing = await Company.findOne({ gstin: cleanGstin });
      if (existing) {
        return res.json({
          success: false,
          isDuplicate: true,
          field: 'gstin',
          message: `A company is already registered with GSTIN ${cleanGstin}. Please log in.`
        });
      }
    }

    return res.json({ success: true, isDuplicate: false });
  } catch (err) {
    next(err);
  }
}

/**
 * Send 6-digit OTP for Mobile / Email verification
 */
async function sendOtp(req, res, next) {
  try {
    const { mobile, email } = req.body;
    if (!mobile && !email) {
      return res.status(400).json({ success: false, message: 'Mobile number or email is required.' });
    }

    const key = (mobile || email).trim().toLowerCase();
    // Generate 6 digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(key, { code, expiresAt });

    console.log(`📱 [TimberBooks OTP] Verification Code for ${key}: ${code}`);

    return res.json({
      success: true,
      message: `Verification code sent to ${mobile || email}`,
      // Return code in dev/demo for effortless testing
      devOtp: code
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
    const { mobile, email, otp, code } = req.body;
    const key = (mobile || email || '').trim().toLowerCase();
    const enteredOtp = (otp || code || '').trim();

    // Standard dev fallback: 123456 is always accepted
    if (enteredOtp === '123456') {
      return res.json({ success: true, verified: true });
    }

    const record = otpStore.get(key);
    if (!record) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this contact or it expired. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    if (record.code !== enteredOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please enter the correct 6-digit code.' });
    }

    otpStore.delete(key);
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
    const cleanGstin = gstin.trim().toUpperCase();

    // 2. Duplicate Checks
    const [existingMobile, existingEmail] = await Promise.all([
      Owner.findOne({ mobile: cleanMobile }),
      Owner.findOne({ email: cleanEmail })
    ]);

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: `Mobile number ${cleanMobile} is already registered. Please log in.`
      });
    }

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `Email ${cleanEmail} is already registered. Please log in.`
      });
    }

    if (cleanGstin) {
      const existingGstin = await Company.findOne({ gstin: cleanGstin });
      if (existingGstin) {
        return res.status(400).json({
          success: false,
          message: `GSTIN ${cleanGstin} is already registered to another company.`
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
      gstin: cleanGstin,
      pan: pan.trim().toUpperCase() || (cleanGstin.length >= 14 ? cleanGstin.substring(2, 12) : ''),
      bankDetails: {
        bankName: bankName.trim(),
        accountName: companyName.trim(),
        accountNo: accountNo.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        branch: branch.trim() || city.trim()
      },
      logoUrl,
      signatureUrl
    });

    // 4. Hash Password & PIN
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    let pinHash = null;
    if (pin && String(pin).length >= 4) {
      pinHash = await bcrypt.hash(String(pin), salt);
    }

    // 5. Create Owner
    const owner = await Owner.create({
      fullName: fullName.trim(),
      mobile: cleanMobile,
      email: cleanEmail,
      username: cleanMobile,
      passwordHash,
      pinHash,
      companyId: company._id,
      biometricEnabled: !!pinHash,
      isVerified: true
    });

    // Link ownerId on Company
    company.ownerId = owner._id;
    await company.save();

    // 6. Create Initial Financial Year (Default: current Indian FY)
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const defaultFrom = new Date(startYear, 3, 1);
    const defaultTo = new Date(startYear + 1, 2, 31);

    const startDate = fyFrom ? new Date(fyFrom) : defaultFrom;
    const endDate = fyTo ? new Date(fyTo) : defaultTo;
    const fyCode = `${startDate.getFullYear()}-${endDate.getFullYear()}`;
    const fyName = `FY ${startDate.getFullYear()}-${String(endDate.getFullYear()).slice(-2)}`;

    const financialYear = await FinancialYear.create({
      companyId: company._id,
      code: fyCode,
      name: fyName,
      startDate,
      endDate,
      isCurrent: true,
      counters: {
        invoice: 1,
        purchase: 1,
        receipt: 1,
        payment: 1,
        contra: 1
      }
    });

    // 7. Seed Standard Indian ERP Chart of Accounts
    const standardGroups = [
      { name: 'Sundry Debtors', nature: 'Asset', isSystem: true },
      { name: 'Sundry Creditors', nature: 'Liability', isSystem: true },
      { name: 'Cash-in-Hand', nature: 'Asset', isSystem: true },
      { name: 'Bank Accounts', nature: 'Asset', isSystem: true },
      { name: 'Sales Accounts', nature: 'Income', isSystem: true },
      { name: 'Purchase Accounts', nature: 'Expense', isSystem: true },
      { name: 'Direct Expenses', nature: 'Expense', isSystem: true },
      { name: 'Indirect Expenses', nature: 'Expense', isSystem: true },
      { name: 'Duties & Taxes', nature: 'Liability', isSystem: true },
      { name: 'Capital Account', nature: 'Liability', isSystem: true }
    ];

    for (const grp of standardGroups) {
      await LedgerGroup.findOneAndUpdate(
        { name: grp.name, companyId: null },
        { ...grp, companyId: null },
        { upsert: true }
      );
    }

    // 8. Default Cash Ledger
    await Ledger.create({
      companyId: company._id,
      name: 'Cash in Hand',
      group: 'Cash-in-Hand',
      taxType: 'Local',
      city: company.city,
      state: company.state,
      stateCode: company.stateCode,
      openingBalance: 0,
      openingBalanceType: 'Dr',
      currentBalance: 0,
      currentBalanceType: 'Dr'
    });

    // Default Bank Ledger if bankName was entered
    if (bankName.trim()) {
      await Ledger.create({
        companyId: company._id,
        name: `${bankName.trim()} (${accountNo ? accountNo.trim().slice(-4) : 'Account'})`,
        group: 'Bank Accounts',
        taxType: 'Local',
        city: company.city,
        state: company.state,
        stateCode: company.stateCode,
        openingBalance: 0,
        openingBalanceType: 'Dr',
        currentBalance: 0,
        currentBalanceType: 'Dr'
      });
    }

    // 9. Initial Settings
    const prefix = companyName
      .trim()
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4) || 'INV';

    const settings = await Settings.create({
      companyId: company._id,
      invoicePrefix: '',
      currentFinancialYearId: financialYear._id,
      biometricRequired: !!pinHash
    });

    // 10. Issue Multi-tenant JWT
    const token = jwt.sign(
      {
        id: owner._id,
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
 * Universal Login: Supports Mobile, Email, or Username + Password
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

    const owner = await Owner.findOne({
      $or: [
        { mobile: loginId },
        { email: loginId.toLowerCase() },
        { username: loginId }
      ]
    });

    if (!owner) {
      return res.status(401).json({
        success: false,
        message: 'No account found matching this Mobile or Email. Please check or register.'
      });
    }

    const isMatch = await bcrypt.compare(password, owner.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again or tap Forgot Password.'
      });
    }

    owner.lastLogin = new Date();
    await owner.save();

    const company = await Company.findById(owner.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company associated with this account was not found.' });
    }

    const currentFY = await FinancialYear.findOne({
      companyId: company._id,
      isCurrent: true
    }) || await FinancialYear.findOne({ companyId: company._id });

    const token = jwt.sign(
      {
        id: owner._id,
        companyId: company._id,
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
        hasPin: !!owner.pinHash
      },
      company,
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
      owner = await Owner.findOne({
        $or: [
          { mobile: cleanId },
          { email: cleanId.toLowerCase() },
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

    const company = await Company.findById(owner.companyId);
    const currentFY = await FinancialYear.findOne({
      companyId: company?._id,
      isCurrent: true
    });

    const token = jwt.sign(
      {
        id: owner._id,
        companyId: company?._id,
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
        hasPin: true
      },
      company,
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
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Registered mobile number or email is required.' });
    }

    const cleanId = identifier.trim();
    const owner = await Owner.findOne({
      $or: [
        { mobile: cleanId },
        { email: cleanId.toLowerCase() }
      ]
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this Mobile or Email.'
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    owner.resetOtp = code;
    owner.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await owner.save();

    console.log(`🔐 [TimberBooks Password Reset OTP] Code for ${cleanId}: ${code}`);

    return res.json({
      success: true,
      message: `Password reset OTP sent to ${cleanId}`,
      devOtp: code
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

    const owner = await Owner.findOne({
      $or: [
        { mobile: cleanId },
        { email: cleanId.toLowerCase() }
      ]
    });

    if (!owner) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    // Verify OTP (accept dev code 123456 or owner.resetOtp)
    const isValidOtp = cleanOtp === '123456' || (owner.resetOtp === cleanOtp && owner.resetOtpExpires > new Date());
    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
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
    await owner.save();

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
    const owner = await Owner.findById(req.owner.id);
    if (!owner) return res.status(404).json({ success: false, message: 'User not found.' });

    const company = await Company.findById(owner.companyId);
    const financialYear = await FinancialYear.findOne({
      companyId: owner.companyId,
      isCurrent: true
    });

    res.json({
      success: true,
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        mobile: owner.mobile,
        email: owner.email,
        biometricEnabled: owner.biometricEnabled,
        hasPin: !!owner.pinHash
      },
      company,
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
    const owner = await Owner.findById(req.owner.id);
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
