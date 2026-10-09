require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, closeDB } = require('./config/db');

const Company = require('./models/Company');
const Owner = require('./models/Owner');
const FinancialYear = require('./models/FinancialYear');
const LedgerGroup = require('./models/LedgerGroup');
const Ledger = require('./models/Ledger');
const Item = require('./models/Item');
const Invoice = require('./models/Invoice');
const Purchase = require('./models/Purchase');
const Voucher = require('./models/Voucher');
const StockMovement = require('./models/StockMovement');
const Settings = require('./models/Settings');
const { calculateCft, cftToCbm, calculateGst, calculateRoundOff } = require('./services/timberMath');

async function seedData() {
  console.log('🌲 Seeding TimberBooks with "Bhavani Timbers" demo data...');

  // Clear existing
  await Promise.all([
    Company.deleteMany({}),
    Owner.deleteMany({}),
    FinancialYear.deleteMany({}),
    LedgerGroup.deleteMany({}),
    Ledger.deleteMany({}),
    Item.deleteMany({}),
    Invoice.deleteMany({}),
    Purchase.deleteMany({}),
    Voucher.deleteMany({}),
    StockMovement.deleteMany({}),
    Settings.deleteMany({})
  ]);

  // 1. Company
  const company = await Company.create({
    name: 'Bhavani Timbers',
    tagline: 'Saw Mill & Wholesale Timber Merchants',
    address: '48, Saw Mill Road, Industrial Estate, Pollachi',
    city: 'Coimbatore',
    pincode: '642001',
    state: 'Tamil Nadu',
    stateCode: '33',
    gstin: '33AAAAA1234A1Z5',
    pan: 'AAAAA1234A',
    phone: '9842109876',
    email: 'info@bhavanitimbers.com',
    bankDetails: {
      bankName: 'State Bank of India',
      accountName: 'Bhavani Timbers',
      accountNo: '30129845789',
      ifsc: 'SBIN0001234',
      branch: 'Pollachi Main Branch'
    },
    termsAndConditions: [
      'Goods once sold will not be taken back.',
      'Interest @ 18% p.a. will be charged after 30 days due date.',
      'All disputes subject to Pollachi jurisdiction.'
    ]
  });

  // 2. Owner
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('bhavani123', salt);
  const pinHash = await bcrypt.hash('1234', salt);

  const owner = await Owner.create({
    username: 'owner',
    email: 'owner@bhavanitimbers.com',
    passwordHash,
    pinHash,
    biometricEnabled: true
  });

  // 3. Financial Years (Seed multiple so switching can be tested immediately)
  const fy1 = await FinancialYear.create({
    code: '2024-2025',
    name: 'FY 2024-25',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2025-03-31'),
    isCurrent: true,
    counters: {
      invoice: 1004,
      purchase: 503,
      receipt: 103,
      payment: 102,
      contra: 102
    }
  });

  const fy2 = await FinancialYear.create({
    code: '2025-2026',
    name: 'FY 2025-26',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2026-03-31'),
    isCurrent: false,
    counters: {
      invoice: 1000,
      purchase: 500,
      receipt: 100,
      payment: 100,
      contra: 100
    }
  });

  const fy = fy1;

  // 4. Ledger Groups (Standard Indian ERP Chart of Accounts)
  const groups = [
    { name: 'Sundry Debtors', nature: 'Asset', isSystem: true },
    { name: 'Sundry Creditors', nature: 'Liability', isSystem: true },
    { name: 'Cash-in-Hand', nature: 'Asset', isSystem: true },
    { name: 'Bank Accounts', nature: 'Asset', isSystem: true },
    { name: 'Bank OD Accounts', nature: 'Liability', isSystem: true },
    { name: 'Capital Account', nature: 'Liability', isSystem: true },
    { name: 'Current Assets', nature: 'Asset', isSystem: true },
    { name: 'Current Liabilities', nature: 'Liability', isSystem: true },
    { name: 'Deposits', nature: 'Asset', isSystem: true },
    { name: 'Direct Expenses', nature: 'Expense', isSystem: true },
    { name: 'Direct Incomes', nature: 'Income', isSystem: true },
    { name: 'Duties & Taxes', nature: 'Liability', isSystem: true },
    { name: 'Indirect Expenses', nature: 'Expense', isSystem: true },
    { name: 'Indirect Incomes', nature: 'Income', isSystem: true },
    { name: 'Sales Accounts', nature: 'Income', isSystem: true },
    { name: 'Purchase Accounts', nature: 'Expense', isSystem: true }
  ];

  for (const g of groups) {
    await LedgerGroup.create(g);
  }

  // 5. Timber Items
  const items = await Item.insertMany([
    {
      name: 'Teak Wood Sawn Sizes',
      hsn: '4407',
      group: 'Sawn Timber',
      unit: 'CFT',
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      saleRate: 2400,
      purchaseRate: 1950,
      openingQty: 450,
      currentStock: 382.5,
      reorderLevel: 100
    },
    {
      name: 'Sal Wood Rafters & Beams',
      hsn: '4407',
      group: 'Sawn Timber',
      unit: 'CFT',
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      saleRate: 1450,
      purchaseRate: 1100,
      openingQty: 820,
      currentStock: 690,
      reorderLevel: 150
    },
    {
      name: 'Silver Oak Packing Sawn Wood',
      hsn: '4407',
      group: 'Sawn Timber',
      unit: 'CFT',
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      saleRate: 650,
      purchaseRate: 480,
      openingQty: 1200,
      currentStock: 1150,
      reorderLevel: 300
    },
    {
      name: 'Casuarina Drum Poles & Firewood',
      hsn: '4401',
      group: 'Drum/Firewood',
      unit: 'Ton',
      cgstRate: 2.5,
      sgstRate: 2.5,
      igstRate: 5,
      saleRate: 4800,
      purchaseRate: 3600,
      openingQty: 45,
      currentStock: 38.5,
      reorderLevel: 10
    },
    {
      name: 'Eucalyptus Firewood Billets',
      hsn: '4401',
      group: 'Drum/Firewood',
      unit: 'Ton',
      cgstRate: 2.5,
      sgstRate: 2.5,
      igstRate: 5,
      saleRate: 4200,
      purchaseRate: 3200,
      openingQty: 60,
      currentStock: 52,
      reorderLevel: 15
    },
    {
      name: 'Country Wood Cut Planks 1"',
      hsn: '4407',
      group: 'Sawn Timber',
      unit: 'CFT',
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      saleRate: 850,
      purchaseRate: 620,
      openingQty: 350,
      currentStock: 350,
      reorderLevel: 80
    },
    {
      name: 'Hardwood Offcut Firewood Bundles',
      hsn: '4401',
      group: 'Offcuts',
      unit: 'Piece',
      cgstRate: 2.5,
      sgstRate: 2.5,
      igstRate: 5,
      saleRate: 150,
      purchaseRate: 90,
      openingQty: 250,
      currentStock: 250,
      reorderLevel: 50
    }
  ]);

  // 6. Ledgers
  const cashLedger = await Ledger.create({
    name: 'Cash in Hand',
    group: 'Cash-in-Hand',
    city: 'Pollachi',
    state: 'Tamil Nadu',
    stateCode: '33',
    openingBalance: 40000,
    openingBalanceType: 'Dr',
    currentBalance: 55000,
    currentBalanceType: 'Dr'
  });

  const sbiLedger = await Ledger.create({
    name: 'State Bank of India (A/c 5789)',
    group: 'Bank Accounts',
    city: 'Pollachi',
    state: 'Tamil Nadu',
    stateCode: '33',
    openingBalance: 320000,
    openingBalanceType: 'Dr',
    currentBalance: 385000,
    currentBalanceType: 'Dr'
  });

  const hdfcLedger = await Ledger.create({
    name: 'HDFC Bank Current A/c',
    group: 'Bank Accounts',
    city: 'Pollachi',
    state: 'Tamil Nadu',
    stateCode: '33',
    openingBalance: 150000,
    openingBalanceType: 'Dr',
    currentBalance: 150000,
    currentBalanceType: 'Dr'
  });

  const customer1 = await Ledger.create({
    name: 'Sri Venkateswara Wood Works',
    group: 'Sundry Debtors',
    taxType: 'Local',
    gstin: '33ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    address: '124, Trichy Road, Singanallur',
    city: 'Coimbatore',
    pincode: '641005',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    stateCode: '33',
    phone: '9843211223',
    email: 'venkateswarawood@gmail.com',
    openingBalance: 35000,
    openingBalanceType: 'Dr',
    currentBalance: 64500,
    currentBalanceType: 'Dr',
    creditDays: 30,
    creditLimit: 200000
  });

  const customer2 = await Ledger.create({
    name: 'Anand Interior & Modular Works',
    group: 'Sundry Debtors',
    taxType: 'Local',
    gstin: '33XYZAB5678C1Z2',
    pan: 'XYZAB5678C',
    address: '52, Kangeyam Road',
    city: 'Tirupur',
    pincode: '641604',
    district: 'Tirupur',
    state: 'Tamil Nadu',
    stateCode: '33',
    phone: '9443122334',
    email: 'anandinteriors@yahoo.com',
    openingBalance: 15000,
    openingBalanceType: 'Dr',
    currentBalance: 38200,
    currentBalanceType: 'Dr',
    creditDays: 21,
    creditLimit: 100000
  });

  const customer3 = await Ledger.create({
    name: 'Kerala Timber Mart',
    group: 'Sundry Debtors',
    taxType: 'Interstate',
    gstin: '32AABCK9999P1Z8',
    pan: 'AABCK9999P',
    address: '88, Robinson Road',
    city: 'Palakkad',
    pincode: '678001',
    district: 'Palakkad',
    state: 'Kerala',
    stateCode: '32',
    phone: '9895123456',
    email: 'ktmpalakkad@gmail.com',
    openingBalance: 112000,
    openingBalanceType: 'Dr',
    currentBalance: 112000,
    currentBalanceType: 'Dr',
    creditDays: 45,
    creditLimit: 300000
  });

  const supplier1 = await Ledger.create({
    name: 'Murugan Saw Mill & Forest Coupes',
    group: 'Sundry Creditors',
    taxType: 'Local',
    gstin: '33AAACM4455G1Z9',
    pan: 'AAACM4455G',
    address: '15, Forest Gate Road',
    city: 'Mettupalayam',
    pincode: '641301',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    stateCode: '33',
    phone: '9789012345',
    email: 'murugansawmill@gmail.com',
    openingBalance: 50000,
    openingBalanceType: 'Cr',
    currentBalance: 85000,
    currentBalanceType: 'Cr',
    creditDays: 30,
    creditLimit: 500000
  });

  const supplier2 = await Ledger.create({
    name: 'Western Ghats Timber Importers',
    group: 'Sundry Creditors',
    taxType: 'Interstate',
    gstin: '32AAACW1122D1Z0',
    pan: 'AAACW1122D',
    address: 'Harbour Estate, Willingdon Island',
    city: 'Cochin',
    pincode: '682003',
    district: 'Ernakulam',
    state: 'Kerala',
    stateCode: '32',
    phone: '9447102938',
    email: 'wgimports@timbercochin.com',
    openingBalance: 240000,
    openingBalanceType: 'Cr',
    currentBalance: 240000,
    currentBalanceType: 'Cr',
    creditDays: 60,
    creditLimit: 1000000
  });

  await Ledger.create({
    name: 'Freight & Transport Charges',
    group: 'Direct Expenses',
    city: 'Pollachi',
    state: 'Tamil Nadu',
    stateCode: '33'
  });

  await Ledger.create({
    name: 'Saw Mill Electricity & Power',
    group: 'Direct Expenses',
    city: 'Pollachi',
    state: 'Tamil Nadu',
    stateCode: '33'
  });

  // 7. Seed Sample Invoices
  // Invoice 1: Size bill for Sri Venkateswara Wood Works
  // 3" x 2" x 7' = 3.5 CFT per piece * 15 pcs = 52.5 CFT @ 2400 = 126,000 + 18% GST
  const teak = items[0];
  const cft1 = calculateCft(3, 2, 7, 15); // 52.5 CFT
  const cbm1 = cftToCbm(cft1);
  const amount1 = cft1 * teak.saleRate;
  const gst1 = calculateGst(amount1, 18, true);
  const round1 = calculateRoundOff(amount1 + gst1.taxTotal);

  await Invoice.create({
    billType: 'Size',
    billNo: 'BT/24-25/1001',
    challanNo: 'CH-401',
    mode: 'Credit',
    partyId: customer1._id,
    partySnapshot: {
      name: customer1.name,
      city: customer1.city,
      gstin: customer1.gstin,
      state: customer1.state,
      stateCode: customer1.stateCode,
      address: customer1.address,
      phone: customer1.phone
    },
    date: new Date('2024-04-12'),
    orderNo: 'ORD-982',
    deliveryAt: 'Singanallur Site',
    items: [
      {
        itemId: teak._id,
        description: 'Teak Wood Sawn Sizes (3"×2"×7\')',
        hsn: '4407',
        pieces: 15,
        thickness: 3,
        width: 2,
        length: 7,
        qty: 15,
        cft: cft1,
        cbm: cbm1,
        rateUnit: 'CFT',
        cftRate: teak.saleRate,
        rate: teak.saleRate,
        amount: amount1,
        cgstRate: gst1.cgstRate,
        sgstRate: gst1.sgstRate,
        igstRate: gst1.igstRate,
        cgstAmount: gst1.cgstAmount,
        sgstAmount: gst1.sgstAmount,
        igstAmount: 0,
        total: amount1 + gst1.taxTotal
      }
    ],
    subtotal: amount1,
    cgstTotal: gst1.cgstAmount,
    sgstTotal: gst1.sgstAmount,
    igstTotal: 0,
    roundOff: round1.roundOff,
    grandTotal: round1.grandTotal,
    extraDetails: {
      vehicleNo: 'TN-41-AZ-8899',
      transport: 'Sri Balaji Transport',
      driverName: 'Senthil Kumar',
      driverPhone: '9842556677',
      lrNo: 'LR-1092',
      postFreight: 'Fixed',
      freightAmount: 1500
    },
    financialYearId: fy._id
  });

  // Invoice 2: Drum / Firewood bill for Anand Interior
  const drum = items[3];
  const drumQty = 6.5; // Tons
  const amount2 = drumQty * drum.saleRate;
  const gst2 = calculateGst(amount2, 5, true);
  const round2 = calculateRoundOff(amount2 + gst2.taxTotal);

  await Invoice.create({
    billType: 'Drum',
    billNo: 'BT/24-25/1002',
    mode: 'Credit',
    partyId: customer2._id,
    partySnapshot: {
      name: customer2.name,
      city: customer2.city,
      gstin: customer2.gstin,
      state: customer2.state,
      stateCode: customer2.stateCode,
      address: customer2.address,
      phone: customer2.phone
    },
    date: new Date('2024-04-18'),
    items: [
      {
        itemId: drum._id,
        description: 'Casuarina Drum Poles & Firewood',
        hsn: '4401',
        qty: drumQty,
        unit: 'Ton',
        rateUnit: 'Ton',
        rate: drum.saleRate,
        amount: amount2,
        cgstRate: gst2.cgstRate,
        sgstRate: gst2.sgstRate,
        igstRate: gst2.igstRate,
        cgstAmount: gst2.cgstAmount,
        sgstAmount: gst2.sgstAmount,
        igstAmount: 0,
        total: amount2 + gst2.taxTotal
      }
    ],
    subtotal: amount2,
    cgstTotal: gst2.cgstAmount,
    sgstTotal: gst2.sgstAmount,
    igstTotal: 0,
    roundOff: round2.roundOff,
    grandTotal: round2.grandTotal,
    extraDetails: {
      vehicleNo: 'TN-38-K-4422'
    },
    financialYearId: fy._id
  });

  // 8. Seed Purchases
  const sal = items[1];
  const purQty = 50; // CFT
  const purAmount = purQty * sal.purchaseRate;
  const purGst = calculateGst(purAmount, 18, true);
  const purRound = calculateRoundOff(purAmount + purGst.taxTotal);

  await Purchase.create({
    mode: 'Credit',
    partyId: supplier1._id,
    partySnapshot: {
      name: supplier1.name,
      city: supplier1.city,
      gstin: supplier1.gstin,
      state: supplier1.state,
      stateCode: supplier1.stateCode,
      address: supplier1.address,
      phone: supplier1.phone
    },
    purchaseNo: 'PUR/24-25/501',
    supplierBillNo: 'MSM/881',
    date: new Date('2024-04-05'),
    items: [
      {
        itemId: sal._id,
        description: 'Sal Wood Rafters & Beams',
        hsn: '4407',
        qty: purQty,
        unit: 'CFT',
        rate: sal.purchaseRate,
        amount: purAmount,
        cgstAmount: purGst.cgstAmount,
        sgstAmount: purGst.sgstAmount,
        igstAmount: 0,
        total: purAmount + purGst.taxTotal
      }
    ],
    subtotal: purAmount,
    cgstTotal: purGst.cgstAmount,
    sgstTotal: purGst.sgstAmount,
    igstTotal: 0,
    roundOff: purRound.roundOff,
    grandTotal: purRound.grandTotal,
    vehicleNo: 'TN-43-C-1122',
    financialYearId: fy._id
  });

  // 9. Seed Vouchers
  // Receipt from Sri Venkateswara
  await Voucher.create({
    type: 'Receipt',
    voucherNo: 'REC/24-25/101',
    date: new Date('2024-04-15'),
    fromAccountId: customer1._id,
    toAccountId: sbiLedger._id,
    fromAccountSnapshot: { name: customer1.name, group: customer1.group },
    toAccountSnapshot: { name: sbiLedger.name, group: sbiLedger.group },
    amount: 50000,
    narration: 'Part payment received via NEFT against invoice BT/24-25/1001',
    paymentMode: 'Bank Transfer',
    financialYearId: fy._id
  });

  // Payment to Murugan Saw Mill
  await Voucher.create({
    type: 'Payment',
    voucherNo: 'PAY/24-25/101',
    date: new Date('2024-04-10'),
    fromAccountId: cashLedger._id,
    toAccountId: supplier1._id,
    fromAccountSnapshot: { name: cashLedger.name, group: cashLedger.group },
    toAccountSnapshot: { name: supplier1.name, group: supplier1.group },
    amount: 25000,
    narration: 'Cash advance paid against log coupe supply',
    paymentMode: 'Cash',
    financialYearId: fy._id
  });

  // Contra: Cash deposit to SBI
  await Voucher.create({
    type: 'Contra',
    voucherNo: 'CON/24-25/101',
    date: new Date('2024-04-16'),
    fromAccountId: cashLedger._id,
    toAccountId: sbiLedger._id,
    fromAccountSnapshot: { name: cashLedger.name, group: cashLedger.group },
    toAccountSnapshot: { name: sbiLedger.name, group: sbiLedger.group },
    amount: 15000,
    narration: 'Cash deposited at SBI Pollachi branch counter',
    paymentMode: 'Cash',
    financialYearId: fy._id
  });

  // 10. Settings
  await Settings.create({
    invoicePrefix: 'BT/',
    purchasePrefix: 'PUR/',
    receiptPrefix: 'REC/',
    paymentPrefix: 'PAY/',
    contraPrefix: 'CON/',
    currentFinancialYearId: fy._id,
    theme: 'light',
    biometricRequired: true
  });

  console.log('✅ Demo company "Bhavani Timbers" successfully seeded!');
  console.log('   - Owner Login: username="owner", password="bhavani123", PIN="1234"');
  console.log('   - Company: Bhavani Timbers, Pollachi, GSTIN: 33AAAAA1234A1Z5');
  console.log('   - Financial Year: FY 2024-25');
  console.log('   - Items: 7 timber/firewood items with stock and rates');
  console.log('   - Ledgers: Debtors, Creditors, Cash, SBI, HDFC');
  console.log('   - Transactions: Invoices, Purchases, Receipts, Payments, Contras');
}

if (require.main === module) {
  connectDB()
    .then(seedData)
    .then(() => {
      console.log('Seeding finished.');
      return closeDB();
    })
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = { seedData };
