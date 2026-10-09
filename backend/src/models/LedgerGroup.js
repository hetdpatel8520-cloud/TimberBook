const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const LedgerGroupSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  name: { type: String, required: true, trim: true },
  nature: {
    type: String,
    enum: ['Asset', 'Liability', 'Income', 'Expense'],
    required: true
  },
  parentGroup: { type: String, default: null },
  isSystem: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = registerModel('LedgerGroup', LedgerGroupSchema);
