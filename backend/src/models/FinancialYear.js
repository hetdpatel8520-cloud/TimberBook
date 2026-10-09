const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const FinancialYearSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: true },
  counters: {
    invoice: { type: Number, default: 1 },
    purchase: { type: Number, default: 1 },
    receipt: { type: Number, default: 1 },
    payment: { type: Number, default: 1 },
    contra: { type: Number, default: 1 }
  }
}, { timestamps: true });

module.exports = registerModel('FinancialYear', FinancialYearSchema);
