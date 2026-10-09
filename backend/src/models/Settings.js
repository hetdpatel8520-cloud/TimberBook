const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const SettingsSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoicePrefix: { type: String, default: '' },
  purchasePrefix: { type: String, default: 'PUR/' },
  receiptPrefix: { type: String, default: 'REC/' },
  paymentPrefix: { type: String, default: 'PAY/' },
  contraPrefix: { type: String, default: 'CON/' },
  currentFinancialYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialYear' },
  defaultTerms: {
    type: [String],
    default: [
      'Goods once sold will not be taken back.',
      'Interest @ 18% p.a. will be charged after 30 days.',
      'Subject to local jurisdiction.'
    ]
  },
  theme: { type: String, default: 'light' },
  biometricRequired: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = registerModel('Settings', SettingsSchema);
