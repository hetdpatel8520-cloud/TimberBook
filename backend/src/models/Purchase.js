const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const PurchaseItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  description: { type: String, required: true },
  hsn: { type: String, default: '4407' },
  qty: { type: Number, required: true, default: 1 },
  unit: { type: String, default: 'CFT' },
  rate: { type: Number, required: true, default: 0 },
  discPercent: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 18 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  amount: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 }
});

const PurchaseSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  mode: { type: String, enum: ['Cash', 'Credit'], default: 'Credit', required: true },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  partySnapshot: {
    name: String,
    city: String,
    gstin: String,
    state: String,
    stateCode: String,
    address: String,
    phone: String
  },
  purchaseNo: { type: String, required: true },
  supplierBillNo: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  items: [PurchaseItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  cessTotal: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  vehicleNo: { type: String, default: '' },
  financialYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialYear' }
}, { timestamps: true });

module.exports = registerModel('Purchase', PurchaseSchema);
