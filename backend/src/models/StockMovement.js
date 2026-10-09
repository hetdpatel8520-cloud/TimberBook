const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const StockMovementSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  itemName: { type: String, required: true },
  date: { type: Date, default: Date.now },
  refType: {
    type: String,
    enum: ['Invoice', 'Purchase', 'Opening', 'Adjustment'],
    required: true
  },
  refId: { type: mongoose.Schema.Types.ObjectId },
  refNo: { type: String, default: '' },
  qtyIn: { type: Number, default: 0 },
  qtyOut: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  unit: { type: String, default: 'CFT' },
  rate: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = registerModel('StockMovement', StockMovementSchema);
