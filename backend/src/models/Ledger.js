const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const LedgerSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  group: { type: String, required: true, default: 'Sundry Debtors' },
  taxType: { type: String, enum: ['Local', 'Interstate'], default: 'Local' },
  gstin: { type: String, uppercase: true, trim: true, default: '' },
  pan: { type: String, uppercase: true, trim: true, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  pincode: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: 'Tamil Nadu' },
  stateCode: { type: String, default: '33' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  openingBalance: { type: Number, default: 0 },
  openingBalanceType: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' },
  currentBalance: { type: Number, default: 0 },
  currentBalanceType: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' },
  creditDays: { type: Number, default: 30 },
  creditLimit: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = registerModel('Ledger', LedgerSchema);
