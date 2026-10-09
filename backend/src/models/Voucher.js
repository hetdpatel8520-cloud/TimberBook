const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const VoucherSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  type: {
    type: String,
    enum: ['Receipt', 'Payment', 'Contra'],
    required: true
  },
  voucherNo: { type: String, required: true },
  date: { type: Date, default: Date.now },
  fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  fromAccountSnapshot: { name: String, group: String },
  toAccountSnapshot: { name: String, group: String },
  amount: { type: Number, required: true, min: 0.01 },
  narration: { type: String, default: '' },
  refType: { type: String, enum: ['Invoice', 'Purchase', 'Direct', 'None'], default: 'None' },
  refId: { type: mongoose.Schema.Types.ObjectId },
  refNo: { type: String, default: '' },
  paymentMode: { type: String, enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI'], default: 'Cash' },
  chequeNo: { type: String, default: '' },
  chequeDate: { type: Date },
  financialYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialYear' }
}, { timestamps: true });

module.exports = registerModel('Voucher', VoucherSchema);
