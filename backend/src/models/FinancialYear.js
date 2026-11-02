const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const FinancialYearSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: true, index: true },
  counters: {
    invoice: { type: Number, default: 1 },
    purchase: { type: Number, default: 1 },
    receipt: { type: Number, default: 1 },
    payment: { type: Number, default: 1 },
    contra: { type: Number, default: 1 }
  }
}, { timestamps: true });

FinancialYearSchema.index({ companyId: 1, isCurrent: 1 });
FinancialYearSchema.index({ companyId: 1, code: 1 });

module.exports = registerModel('FinancialYear', FinancialYearSchema);
