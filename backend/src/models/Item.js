const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const ItemSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  hsn: { type: String, default: '4407', trim: true },
  group: {
    type: String,
    enum: ['Logs', 'Sawn Timber', 'Drum/Firewood', 'Plywood', 'Offcuts', 'General'],
    default: 'Sawn Timber'
  },
  unit: {
    type: String,
    enum: ['CFT', 'CBM', 'Ton', 'Piece', 'Pcs', 'Kg', 'SqFt', 'Man', 'Quintal'],
    default: 'CFT'
  },
  cgstRate: { type: Number, default: 9 },
  sgstRate: { type: Number, default: 9 },
  igstRate: { type: Number, default: 18 },
  saleRate: { type: Number, default: 0 },
  purchaseRate: { type: Number, default: 0 },
  openingQty: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 50 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = registerModel('Item', ItemSchema);
