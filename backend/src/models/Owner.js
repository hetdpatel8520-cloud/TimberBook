const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const OwnerSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  pinHash: { type: String, default: null },
  biometricEnabled: { type: Boolean, default: false },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  resetOtp: { type: String, default: null },
  resetOtpExpires: { type: Date, default: null },
  lastLogin: { type: Date }
}, { timestamps: true });

module.exports = registerModel('Owner', OwnerSchema);
