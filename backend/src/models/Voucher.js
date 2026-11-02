const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const VoucherSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  type: {
    type: String,
    enum: ['Receipt', 'Payment', 'Contra'],
    required: true,
    index: true
  },
  voucherNo: { type: String, required: true },
  date: { type: Date, default: Date.now, index: true },
  fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true, index: true },
  toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true, index: true },
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

VoucherSchema.index({ companyId: 1, type: 1, voucherNo: 1 });
VoucherSchema.index({ companyId: 1, date: -1 });
VoucherSchema.index({ companyId: 1, fromAccountId: 1 });
VoucherSchema.index({ companyId: 1, toAccountId: 1 });

module.exports = registerModel('Voucher', VoucherSchema);
