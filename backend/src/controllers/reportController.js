const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Voucher = require('../models/Voucher');
const Ledger = require('../models/Ledger');
const Item = require('../models/Item');

async function getDashboardMetrics(req, res, next) {
  try {
    const companyId = req.companyId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Sales metrics
    const [todayInvoices, monthInvoices, allInvoices] = await Promise.all([
      Invoice.find({ companyId, date: { $gte: todayStart }, isCancelled: false }),
      Invoice.find({ companyId, date: { $gte: monthStart }, isCancelled: false }),
      Invoice.find({ companyId, isCancelled: false }).sort({ date: -1 }).limit(100)
    ]);

    let todaySales = 0;
    todayInvoices.forEach(inv => todaySales += (inv.grandTotal || 0));

    let monthSales = 0;
    monthInvoices.forEach(inv => monthSales += (inv.grandTotal || 0));

    // Calculate 7-day sales trend
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' });

      let dayTotal = 0;
      allInvoices.forEach(inv => {
        const invDateStr = new Date(inv.date).toISOString().split('T')[0];
        if (invDateStr === dayStr) {
          dayTotal += (inv.grandTotal || 0);
        }
      });
      salesTrend.push({ day: dayLabel, date: dayStr, total: parseFloat(dayTotal.toFixed(2)) });
    }

    // Receivables & Payables
    const [debtors, creditors, cashBanks, lowStockCount] = await Promise.all([
      Ledger.find({ companyId, group: /debtor/i, isActive: true }),
      Ledger.find({ companyId, group: /creditor/i, isActive: true }),
      Ledger.find({ companyId, group: { $in: [/cash/i, /bank/i] }, isActive: true }),
      Item.countDocuments({ companyId, $expr: { $lte: ['$currentStock', '$reorderLevel'] }, isActive: true })
    ]);

    let totalReceivables = 0;
    debtors.forEach((d) => {
      if (d.currentBalance > 0 && d.currentBalanceType === 'Dr') {
        totalReceivables += d.currentBalance;
      }
    });

    let totalPayables = 0;
    creditors.forEach((c) => {
      if (c.currentBalance > 0 && c.currentBalanceType === 'Cr') {
        totalPayables += c.currentBalance;
      }
    });

    let cashBalance = 0;
    let bankBalance = 0;
    cashBanks.forEach((cb) => {
      if (/cash/i.test(cb.group)) {
        cashBalance += cb.currentBalance || 0;
      } else {
        bankBalance += cb.currentBalance || 0;
      }
    });

    // Recent 5 bills
    const recentBills = await Invoice.find({ companyId, isCancelled: false })
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .select('billNo date partySnapshot grandTotal mode');

    // Total counts for empty state prompt detection
    const [totalParties, totalItems, totalBills] = await Promise.all([
      Ledger.countDocuments({ companyId, isActive: true }),
      Item.countDocuments({ companyId, isActive: true }),
      Invoice.countDocuments({ companyId })
    ]);

    res.json({
      success: true,
      metrics: {
        todaySales: parseFloat(todaySales.toFixed(2)),
        monthSales: parseFloat(monthSales.toFixed(2)),
        totalReceivables: parseFloat(totalReceivables.toFixed(2)),
        totalPayables: parseFloat(totalPayables.toFixed(2)),
        cashBalance: parseFloat(cashBalance.toFixed(2)),
        bankBalance: parseFloat(bankBalance.toFixed(2)),
        liquidTotal: parseFloat((cashBalance + bankBalance).toFixed(2)),
        lowStockCount,
        salesTrend,
        recentBills,
        counts: {
          parties: totalParties,
          items: totalItems,
          bills: totalBills
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getLedgerReport(req, res, next) {
  try {
    const { partyId } = req.params;
    const { startDate, endDate } = req.query;

    const ledger = await Ledger.findOne({ _id: partyId, companyId: req.companyId });
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found.' });

    let from = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 3, 1);
    let to = endDate ? new Date(endDate) : new Date();
    to.setHours(23, 59, 59, 999);

    const isDebtor = /debtor/i.test(ledger.group);
    let runningBalance = ledger.openingBalance || 0;

    const [invoices, purchases, vouchers] = await Promise.all([
      Invoice.find({ companyId: req.companyId, partyId: ledger._id, date: { $gte: from, $lte: to }, isCancelled: false }),
      Purchase.find({ companyId: req.companyId, partyId: ledger._id, date: { $gte: from, $lte: to } }),
      Voucher.find({
        companyId: req.companyId,
        $or: [{ fromAccountId: ledger._id }, { toAccountId: ledger._id }],
        date: { $gte: from, $lte: to }
      })
    ]);

    const statementRows = [];

    invoices.forEach((inv) => {
      statementRows.push({
        date: inv.date,
        voucherType: 'Sales Invoice',
        voucherNo: inv.billNo,
        narration: `Sales Bill #${inv.billNo}`,
        debit: inv.mode === 'Credit' ? inv.grandTotal : 0,
        credit: 0,
        mode: inv.mode
      });
    });

    purchases.forEach((pur) => {
      statementRows.push({
        date: pur.date,
        voucherType: 'Purchase',
        voucherNo: pur.purchaseNo,
        narration: `Purchase from ${pur.partySnapshot?.name || 'Supplier'}`,
        debit: 0,
        credit: pur.mode === 'Credit' ? pur.grandTotal : 0,
        mode: pur.mode
      });
    });

    vouchers.forEach((v) => {
      const isDebit = String(v.toAccountId) === String(ledger._id);
      statementRows.push({
        date: v.date,
        voucherType: v.type,
        voucherNo: v.voucherNo,
        narration: v.narration || `${v.type} Voucher`,
        debit: isDebit ? v.amount : 0,
        credit: isDebit ? 0 : v.amount,
        mode: v.paymentMode
      });
    });

    statementRows.sort((a, b) => new Date(a.date) - new Date(b.date));

    let totalDebit = 0;
    let totalCredit = 0;

    const rowsWithBalance = statementRows.map((r) => {
      totalDebit += r.debit;
      totalCredit += r.credit;

      if (isDebtor) {
        runningBalance = runningBalance + r.debit - r.credit;
      } else {
        runningBalance = runningBalance + r.credit - r.debit;
      }

      return {
        ...r,
        runningBalance: parseFloat(runningBalance.toFixed(2)),
        runningBalanceType: runningBalance >= 0 ? (isDebtor ? 'Dr' : 'Cr') : (isDebtor ? 'Cr' : 'Dr')
      };
    });

    res.json({
      success: true,
      ledger: {
        id: ledger._id,
        name: ledger.name,
        group: ledger.group,
        city: ledger.city,
        phone: ledger.phone,
        gstin: ledger.gstin,
        openingBalance: ledger.openingBalance,
        openingBalanceType: ledger.openingBalanceType,
        currentBalance: ledger.currentBalance,
        currentBalanceType: ledger.currentBalanceType
      },
      dateRange: { from, to },
      totalDebit: parseFloat(totalDebit.toFixed(2)),
      totalCredit: parseFloat(totalCredit.toFixed(2)),
      closingBalance: parseFloat(runningBalance.toFixed(2)),
      statement: rowsWithBalance
    });
  } catch (err) {
    next(err);
  }
}

async function getCashBook(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    let from = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 3, 1);
    let to = endDate ? new Date(endDate) : new Date();
    to.setHours(23, 59, 59, 999);

    const cashLedger = await Ledger.findOne({ companyId: req.companyId, group: /cash/i });
    if (!cashLedger) {
      return res.status(404).json({ success: false, message: 'Cash in Hand ledger not found.' });
    }

    const vouchers = await Voucher.find({
      companyId: req.companyId,
      $or: [{ fromAccountId: cashLedger._id }, { toAccountId: cashLedger._id }],
      date: { $gte: from, $lte: to }
    }).sort({ date: 1 });

    let runningCash = cashLedger.openingBalance || 0;
    let totalReceipts = 0;
    let totalPayments = 0;

    const entries = vouchers.map((v) => {
      const isInflow = String(v.toAccountId) === String(cashLedger._id);
      const inflow = isInflow ? v.amount : 0;
      const outflow = isInflow ? 0 : v.amount;

      totalReceipts += inflow;
      totalPayments += outflow;
      runningCash = runningCash + inflow - outflow;

      return {
        date: v.date,
        voucherNo: v.voucherNo,
        type: v.type,
        particulars: isInflow ? v.fromAccountSnapshot?.name || 'Inflow' : v.toAccountSnapshot?.name || 'Outflow',
        narration: v.narration,
        inflow,
        outflow,
        balance: parseFloat(runningCash.toFixed(2))
      };
    });

    res.json({
      success: true,
      openingCash: cashLedger.openingBalance || 0,
      totalReceipts: parseFloat(totalReceipts.toFixed(2)),
      totalPayments: parseFloat(totalPayments.toFixed(2)),
      closingCash: parseFloat(runningCash.toFixed(2)),
      entries
    });
  } catch (err) {
    next(err);
  }
}

async function getOutstanding(req, res, next) {
  try {
    const debtors = await Ledger.find({
      companyId: req.companyId,
      group: /debtor/i,
      currentBalance: { $gt: 0 },
      currentBalanceType: 'Dr',
      isActive: true
    }).sort({ currentBalance: -1 });

    const creditors = await Ledger.find({
      companyId: req.companyId,
      group: /creditor/i,
      currentBalance: { $gt: 0 },
      currentBalanceType: 'Cr',
      isActive: true
    }).sort({ currentBalance: -1 });

    let totalReceivable = 0;
    const receivables = debtors.map((d) => {
      totalReceivable += d.currentBalance;
      return {
        id: d._id,
        name: d.name,
        city: d.city,
        phone: d.phone,
        gstin: d.gstin,
        creditDays: d.creditDays || 30,
        amountDue: d.currentBalance,
        lastUpdated: d.updatedAt
      };
    });

    let totalPayable = 0;
    const payables = creditors.map((c) => {
      totalPayable += c.currentBalance;
      return {
        id: c._id,
        name: c.name,
        city: c.city,
        phone: c.phone,
        gstin: c.gstin,
        creditDays: c.creditDays || 30,
        amountDue: c.currentBalance,
        lastUpdated: c.updatedAt
      };
    });

    res.json({
      success: true,
      receivables: {
        count: receivables.length,
        total: parseFloat(totalReceivable.toFixed(2)),
        items: receivables
      },
      payables: {
        count: payables.length,
        total: parseFloat(totalPayable.toFixed(2)),
        items: payables
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getSalesRegister(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    let query = { companyId: req.companyId, isCancelled: false };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    const invoices = await Invoice.find(query).sort({ date: -1, billNo: -1 });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalNet = 0;

    const list = invoices.map((inv) => {
      totalTaxable += inv.subtotal;
      totalCgst += inv.cgstTotal;
      totalSgst += inv.sgstTotal;
      totalIgst += inv.igstTotal;
      totalNet += inv.grandTotal;

      return {
        id: inv._id,
        billNo: inv.billNo,
        date: inv.date,
        partyName: inv.partySnapshot?.name || 'Cash Customer',
        gstin: inv.partySnapshot?.gstin || 'N/A',
        taxable: inv.subtotal,
        cgst: inv.cgstTotal,
        sgst: inv.sgstTotal,
        igst: inv.igstTotal,
        taxTotal: inv.cgstTotal + inv.sgstTotal + inv.igstTotal,
        roundOff: inv.roundOff,
        grandTotal: inv.grandTotal,
        mode: inv.mode
      };
    });

    res.json({
      success: true,
      summary: {
        count: list.length,
        totalTaxable: parseFloat(totalTaxable.toFixed(2)),
        totalCgst: parseFloat(totalCgst.toFixed(2)),
        totalSgst: parseFloat(totalSgst.toFixed(2)),
        totalIgst: parseFloat(totalIgst.toFixed(2)),
        totalTax: parseFloat((totalCgst + totalSgst + totalIgst).toFixed(2)),
        totalNet: parseFloat(totalNet.toFixed(2))
      },
      records: list
    });
  } catch (err) {
    next(err);
  }
}

async function getPurchaseRegister(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    let query = { companyId: req.companyId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    const purchases = await Purchase.find(query).sort({ date: -1, purchaseNo: -1 });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalNet = 0;

    const list = purchases.map((pur) => {
      totalTaxable += pur.subtotal;
      totalCgst += pur.cgstTotal;
      totalSgst += pur.sgstTotal;
      totalIgst += pur.igstTotal;
      totalNet += pur.grandTotal;

      return {
        id: pur._id,
        purchaseNo: pur.purchaseNo,
        supplierBillNo: pur.supplierBillNo,
        date: pur.date,
        supplierName: pur.partySnapshot?.name || 'Supplier',
        gstin: pur.partySnapshot?.gstin || 'N/A',
        taxable: pur.subtotal,
        cgst: pur.cgstTotal,
        sgst: pur.sgstTotal,
        igst: pur.igstTotal,
        taxTotal: pur.cgstTotal + pur.sgstTotal + pur.igstTotal,
        roundOff: pur.roundOff,
        grandTotal: pur.grandTotal,
        mode: pur.mode
      };
    });

    res.json({
      success: true,
      summary: {
        count: list.length,
        totalTaxable: parseFloat(totalTaxable.toFixed(2)),
        totalCgst: parseFloat(totalCgst.toFixed(2)),
        totalSgst: parseFloat(totalSgst.toFixed(2)),
        totalIgst: parseFloat(totalIgst.toFixed(2)),
        totalTax: parseFloat((totalCgst + totalSgst + totalIgst).toFixed(2)),
        totalNet: parseFloat(totalNet.toFixed(2))
      },
      records: list
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardMetrics,
  getLedgerReport,
  getCashBook,
  getOutstanding,
  getSalesRegister,
  getPurchaseRegister
};
