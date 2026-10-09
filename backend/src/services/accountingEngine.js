const Ledger = require('../models/Ledger');
const Item = require('../models/Item');
const StockMovement = require('../models/StockMovement');

/**
 * Double-Entry Accounting Service
 * Scoped by companyId to maintain 100% tenant isolation
 */

/**
 * Apply debit or credit to a ledger account and update current balance
 */
async function updateLedgerBalance(ledgerId, amount, type = 'Dr') {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) throw new Error(`Ledger not found: ${ledgerId}`);

  const group = (ledger.group || '').toLowerCase();
  const isAssetNature =
    group.includes('debtor') ||
    group.includes('cash') ||
    group.includes('bank') ||
    group.includes('asset') ||
    group.includes('expense');

  let delta = 0;
  if (isAssetNature) {
    delta = (type === 'Dr') ? amount : -amount;
  } else {
    delta = (type === 'Cr') ? amount : -amount;
  }

  if (isAssetNature) {
    let newBal = (ledger.currentBalance || 0) + delta;
    ledger.currentBalance = parseFloat(newBal.toFixed(2));
    ledger.currentBalanceType = ledger.currentBalance >= 0 ? 'Dr' : 'Cr';
  } else {
    let newBal = (ledger.currentBalance || 0) + delta;
    ledger.currentBalance = parseFloat(newBal.toFixed(2));
    ledger.currentBalanceType = ledger.currentBalance >= 0 ? 'Cr' : 'Dr';
  }

  await ledger.save();
  return ledger;
}

/**
 * Posts Invoice to party ledger & decrements stock
 */
async function postInvoiceAccounting(invoice) {
  // If Credit, Debit Party Ledger
  if (invoice.mode === 'Credit') {
    await updateLedgerBalance(invoice.partyId, invoice.grandTotal, 'Dr');
  } else {
    // If Cash, find Cash in Hand ledger for this company
    const cashLedger = await Ledger.findOne({
      companyId: invoice.companyId,
      group: /cash/i
    });
    if (cashLedger) {
      await updateLedgerBalance(cashLedger._id, invoice.grandTotal, 'Dr');
    }
  }

  // Update Item Stocks
  for (const itemRow of invoice.items) {
    if (itemRow.itemId) {
      const item = await Item.findById(itemRow.itemId);
      if (item) {
        const qtyToReduce = item.unit === 'CFT' && itemRow.cft ? itemRow.cft : itemRow.qty;
        item.currentStock = parseFloat(((item.currentStock || 0) - qtyToReduce).toFixed(2));
        await item.save();

        await StockMovement.create({
          companyId: invoice.companyId,
          itemId: item._id,
          itemName: item.name,
          date: invoice.date,
          refType: 'Invoice',
          refId: invoice._id,
          refNo: invoice.billNo,
          qtyOut: qtyToReduce,
          balanceAfter: item.currentStock,
          unit: item.unit,
          rate: itemRow.rate,
          notes: `Sales Bill #${invoice.billNo}`
        });
      }
    }
  }
}

/**
 * Reverses Invoice accounting when cancelled
 */
async function reverseInvoiceAccounting(invoice) {
  if (invoice.mode === 'Credit') {
    await updateLedgerBalance(invoice.partyId, invoice.grandTotal, 'Cr');
  } else {
    const cashLedger = await Ledger.findOne({
      companyId: invoice.companyId,
      group: /cash/i
    });
    if (cashLedger) {
      await updateLedgerBalance(cashLedger._id, invoice.grandTotal, 'Cr');
    }
  }

  // Restore stock
  for (const itemRow of invoice.items) {
    if (itemRow.itemId) {
      const item = await Item.findById(itemRow.itemId);
      if (item) {
        const qtyToRestore = item.unit === 'CFT' && itemRow.cft ? itemRow.cft : itemRow.qty;
        item.currentStock = parseFloat(((item.currentStock || 0) + qtyToRestore).toFixed(2));
        await item.save();

        await StockMovement.create({
          companyId: invoice.companyId,
          itemId: item._id,
          itemName: item.name,
          date: new Date(),
          refType: 'Adjustment',
          refId: invoice._id,
          refNo: invoice.billNo,
          qtyIn: qtyToRestore,
          balanceAfter: item.currentStock,
          unit: item.unit,
          notes: `Cancelled Bill #${invoice.billNo}`
        });
      }
    }
  }
}

/**
 * Posts Purchase to supplier ledger & increments stock
 */
async function postPurchaseAccounting(purchase) {
  if (purchase.mode === 'Credit') {
    await updateLedgerBalance(purchase.partyId, purchase.grandTotal, 'Cr');
  } else {
    const cashLedger = await Ledger.findOne({
      companyId: purchase.companyId,
      group: /cash/i
    });
    if (cashLedger) {
      await updateLedgerBalance(cashLedger._id, purchase.grandTotal, 'Cr');
    }
  }

  // Update Item Stocks
  for (const itemRow of purchase.items) {
    if (itemRow.itemId) {
      const item = await Item.findById(itemRow.itemId);
      if (item) {
        item.currentStock = parseFloat(((item.currentStock || 0) + itemRow.qty).toFixed(2));
        if (itemRow.rate > 0) {
          item.purchaseRate = itemRow.rate;
        }
        await item.save();

        await StockMovement.create({
          companyId: purchase.companyId,
          itemId: item._id,
          itemName: item.name,
          date: purchase.date,
          refType: 'Purchase',
          refId: purchase._id,
          refNo: purchase.purchaseNo,
          qtyIn: itemRow.qty,
          balanceAfter: item.currentStock,
          unit: item.unit,
          rate: itemRow.rate,
          notes: `Purchase #${purchase.purchaseNo} (Supplier Bill: ${purchase.supplierBillNo || 'N/A'})`
        });
      }
    }
  }
}

/**
 * Posts Voucher (Receipt / Payment / Contra)
 */
async function postVoucherAccounting(voucher) {
  // Debit toAccount
  await updateLedgerBalance(voucher.toAccountId, voucher.amount, 'Dr');
  // Credit fromAccount
  await updateLedgerBalance(voucher.fromAccountId, voucher.amount, 'Cr');
}

/**
 * Reverses Voucher accounting
 */
async function reverseVoucherAccounting(voucher) {
  await updateLedgerBalance(voucher.toAccountId, voucher.amount, 'Cr');
  await updateLedgerBalance(voucher.fromAccountId, voucher.amount, 'Dr');
}

module.exports = {
  updateLedgerBalance,
  postInvoiceAccounting,
  reverseInvoiceAccounting,
  postPurchaseAccounting,
  postVoucherAccounting,
  reverseVoucherAccounting
};
