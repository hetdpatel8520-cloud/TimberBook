const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');
const { normalizeEmail, normalizeMobile } = require('../utils/normalize');

const OwnerSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  mobileNormalized: { type: String, required: true, trim: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  emailLower: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  username: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  pinHash: { type: String, default: null },
  biometricEnabled: { type: Boolean, default: false },
  // Active company pointer (for multi-company support)
  activeCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  // Backward compatibility alias: companyId mirrors activeCompanyId
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  resetOtp: { type: String, default: null },
  resetOtpExpires: { type: Date, default: null },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  lastLogin: { type: Date }
}, { timestamps: true });

// Pre-validate hook to populate normalized fields automatically
OwnerSchema.pre('validate', function (next) {
  if (this.email) {
    this.emailLower = normalizeEmail(this.email);
  }
  if (this.mobile) {
    this.mobileNormalized = normalizeMobile(this.mobile);
  }
  if (this.activeCompanyId && !this.companyId) {
    this.companyId = this.activeCompanyId;
  } else if (this.companyId && !this.activeCompanyId) {
    this.activeCompanyId = this.companyId;
  }
  next();
});

module.exports = registerModel('Owner', OwnerSchema);
