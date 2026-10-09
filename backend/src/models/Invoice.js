const mongoose = require('mongoose');
const { registerModel } = require('../config/modelHelper');

const InvoiceItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  description: { type: String, required: true },
  hsn: { type: String, default: '4407' },
  pieces: { type: Number, default: 0 },
  thickness: { type: Number, default: 0 },
  width: { type: Number, default: 0 },
  length: { type: Number, default: 0 },
  girth: { type: Number, default: 0 },
  qty: { type: Number, required: true, default: 1 },
  cft: { type: Number, default: 0 },
  rateUnit: { type: String, enum: ['CFT', 'CBM', 'Piece', 'Pcs', 'Ton', 'Kg', 'SqFt', 'Man', 'Quintal'], default: 'CFT' },
  unit: { type: String, default: 'CFT' },
  cftRate: { type: Number, default: 0 },
  cbmRate: { type: Number, default: 0 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
  cgstRate: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 }
});

const InvoiceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  billType: {
    type: String,
    enum: ['Size', 'Drum', 'Normal', 'Core Wood'],
    default: 'Size',
    required: true
  },
  billNo: { type: String, required: true },
  challanNo: { type: String, default: '' },
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
  date: { type: Date, default: Date.now },
  orderNo: { type: String, default: '' },
  deliveryAt: { type: String, default: '' },
  items: [InvoiceItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  extraDetails: {
    remark: { type: String, default: '' },
    poNo: { type: String, default: '' },
    poDate: { type: Date },
    transport: { type: String, default: '' },
    driverName: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    vehicleNo: { type: String, default: '' },
    lrNo: { type: String, default: '' },
    freightNote: { type: String, default: '' },
    postFreight: { type: String, enum: ['None', 'Fixed', 'Per Ton'], default: 'None' },
    freightAmount: { type: Number, default: 0 }
  },
  isCancelled: { type: Boolean, default: false },
  financialYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialYear' }
}, { timestamps: true });

module.exports = registerModel('Invoice', InvoiceSchema);
