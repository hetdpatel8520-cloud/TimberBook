const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');

const setupController = require('../controllers/setupController');
const authController = require('../controllers/authController');
const companyController = require('../controllers/companyController');
const ledgerController = require('../controllers/ledgerController');
const itemController = require('../controllers/itemController');
const invoiceController = require('../controllers/invoiceController');
const purchaseController = require('../controllers/purchaseController');
const voucherController = require('../controllers/voucherController');
const reportController = require('../controllers/reportController');
const settingsController = require('../controllers/settingsController');
const financialYearController = require('../controllers/financialYearController');
const syncController = require('../controllers/syncController');

// 1. Setup & Public
router.get('/setup/status', setupController.getSetupStatus);
router.post('/setup/initialize', setupController.initializeSetup);
router.post('/setup/seed-demo', setupController.seedDemo);
router.get('/sync/status', syncController.getSyncStatus);

// 2. Auth & Multi-Step Registration
router.post('/auth/register-check', authController.checkDuplicate);
router.post('/auth/send-otp', authController.sendOtp);
router.post('/auth/verify-otp', authController.verifyOtp);
router.post('/auth/register', authController.registerCompany);

router.post('/auth/login', authController.login);
router.post('/auth/pin-login', authController.verifyPin);
router.post('/auth/verify-pin', authController.verifyPin);
router.post('/auth/forgot-password', authController.forgotPasswordRequest);
router.post('/auth/reset-password', authController.resetPassword);

router.get('/auth/me', authMiddleware, authController.getMe);
router.post('/auth/security', authMiddleware, authController.updateSecurity);

// 2b. Financial Years
router.get('/financial-years', authMiddleware, financialYearController.getFinancialYears);
router.post('/financial-years', authMiddleware, financialYearController.createFinancialYear);
router.post('/financial-years/switch', authMiddleware, financialYearController.switchFinancialYear);

// 3. Company
router.get('/company', authMiddleware, companyController.getCompany);
router.put('/company', authMiddleware, companyController.updateCompany);

// 4. Ledgers (Parties, Banks, Accounts)
router.get('/ledgers/groups', authMiddleware, ledgerController.getLedgerGroups);
router.get('/ledgers', authMiddleware, ledgerController.getLedgers);
router.get('/ledgers/:id', authMiddleware, ledgerController.getLedgerById);
router.post('/ledgers', authMiddleware, ledgerController.createLedger);
router.put('/ledgers/:id', authMiddleware, ledgerController.updateLedger);
router.delete('/ledgers/:id', authMiddleware, ledgerController.deleteLedger);

// 5. Items (Timber, Firewood, Sizes)
router.get('/items', authMiddleware, itemController.getItems);
router.get('/items/:id', authMiddleware, itemController.getItemById);
router.post('/items', authMiddleware, itemController.createItem);
router.put('/items/:id', authMiddleware, itemController.updateItem);
router.delete('/items/:id', authMiddleware, itemController.deleteItem);

// 6. Invoices (Sales Billing)
router.get('/invoices/next-number', authMiddleware, invoiceController.getNextBillNo);
router.get('/invoices', authMiddleware, invoiceController.getInvoices);
router.get('/invoices/:id', authMiddleware, invoiceController.getInvoiceById);
router.post('/invoices', authMiddleware, invoiceController.createInvoice);
router.post('/invoices/:id/cancel', authMiddleware, invoiceController.cancelInvoice);
router.get('/invoices/:id/pdf', invoiceController.downloadInvoicePdf);

// 7. Purchases
router.get('/purchases', authMiddleware, purchaseController.getPurchases);
router.get('/purchases/:id', authMiddleware, purchaseController.getPurchaseById);
router.post('/purchases', authMiddleware, purchaseController.createPurchase);

// 8. Vouchers (Receipt, Payment, Contra)
router.get('/vouchers/next-number/:type', authMiddleware, voucherController.getNextVoucherNo);
router.get('/vouchers', authMiddleware, voucherController.getVouchers);
router.post('/vouchers', authMiddleware, voucherController.createVoucher);
router.delete('/vouchers/:id', authMiddleware, voucherController.deleteVoucher);

// 9. Reports & Cash Book
router.get('/reports/dashboard', authMiddleware, reportController.getDashboardMetrics);
router.get('/reports/ledger-statement/:partyId', authMiddleware, reportController.getLedgerReport);
router.get('/reports/cash-book', authMiddleware, reportController.getCashBook);
router.get('/reports/outstanding', authMiddleware, reportController.getOutstanding);
router.get('/reports/sales-register', authMiddleware, reportController.getSalesRegister);
router.get('/reports/purchase-register', authMiddleware, reportController.getPurchaseRegister);

// 10. Settings & Backup
router.get('/settings', authMiddleware, settingsController.getSettings);
router.put('/settings', authMiddleware, settingsController.updateSettings);
router.get('/settings/backup', authMiddleware, settingsController.exportBackup);
router.post('/settings/restore', authMiddleware, settingsController.restoreBackup);

module.exports = router;
