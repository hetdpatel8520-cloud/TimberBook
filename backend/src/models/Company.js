const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  businessType: {
    type: String,
    enum: ['Timber Trader', 'Saw Mill', 'Firewood Supplier', 'Other'],
    default: 'Timber Trader'
  },
  tagline: { type: String, default: 'Timber Merchants & Saw Mill' },
  addressLine1: { type: String, default: '' },
  addressLine2: { type: String, default: '' },
  address: { type: String, required: true },
  city: { type: String, required: true, trim: true },
  district: { type: String, default: '' },
  state: { type: String, required: true },
  stateCode: { type: String, default: '33' },
  pincode: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true, default: '' },
  gstin: { type: String, uppercase: true, trim: true, default: '' },
  pan: { type: String, uppercase: true, trim: true, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
  bankDetails: {
    bankName: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNo: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    branch: { type: String, default: '' }
  },
  logoUrl: { type: String, default: null },
  signatureUrl: { type: String, default: null },
  termsAndConditions: {
    type: [String],
    default: [
      'Goods once sold will not be taken back.',
      'Interest @ 18% p.a. will be charged if payment is not made within due date.',
      'All disputes subject to local jurisdiction only.'
    ]
  },
  defaultCftFactor: { type: Number, default: 35.3147 }
}, { timestamps: true });

module.exports = registerModel('Company', CompanySchema);
