const assert = require('assert');
const { app, startServer } = require('../src/server');

// Simple fetch helper for local tests
async function request(url, options = {}) {
  const fullUrl = `http://localhost:5000${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runIntegrationTests() {
  console.log('🧪 Starting TimberBooks Backend API Integration Tests...\n');

  let server;
  try {
    try {
      const checkHealth = await request('/health');
      if (checkHealth.status === 200) {
        console.log('📡 Connected to active TimberBooks server on port 5000');
      }
    } catch (e) {
      server = await startServer();
    }

    // Test 1: Health check
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'ok');
    console.log('  ✅ GET /health: Server healthy');

    // Test 2: Setup status
    const setup = await request('/api/setup/status');
    assert.strictEqual(setup.status, 200);
    assert.strictEqual(setup.data.companyName, 'Bhavani Timbers');
    console.log(`  ✅ GET /api/setup/status: Company initialized (${setup.data.companyName})`);

    // Test 3: Login
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'owner', password: 'bhavani123' }
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.data.token, 'Token should be returned');
    assert.strictEqual(loginRes.data.owner.username, 'owner');
    const token = loginRes.data.token;
    console.log('  ✅ POST /api/auth/login: Successful login with JWT generated');

    // Test 4: Verify PIN
    const pinRes = await request('/api/auth/verify-pin', {
      method: 'POST',
      body: { pin: '1234' }
    });
    assert.strictEqual(pinRes.status, 200);
    assert.ok(pinRes.data.token);
    console.log('  ✅ POST /api/auth/verify-pin: Quick biometric PIN verified');

    // Test 5: Auth Me
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.owner.username, 'owner');
    assert.strictEqual(meRes.data.company.name, 'Bhavani Timbers');
    console.log('  ✅ GET /api/auth/me: Owner and Company context verified');

    // Test 6: Ledgers
    const ledgersRes = await request('/api/ledgers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(ledgersRes.status, 200);
    assert.ok(ledgersRes.data.ledgers.length >= 5);
    const customer = ledgersRes.data.ledgers.find(l => l.name.includes('Sri Venkateswara'));
    assert.ok(customer, 'Customer Sri Venkateswara Wood Works should exist');
    console.log(`  ✅ GET /api/ledgers: Fetched ${ledgersRes.data.ledgers.length} ledgers`);

    // Test 7: Items
    const itemsRes = await request('/api/items', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(itemsRes.status, 200);
    assert.ok(itemsRes.data.items.length >= 7);
    const teak = itemsRes.data.items.find(i => i.name.includes('Teak Wood'));
    assert.ok(teak);
    console.log(`  ✅ GET /api/items: Fetched ${itemsRes.data.items.length} timber & firewood items`);

    // Test 8: Next Bill Number
    const nextBillRes = await request('/api/invoices/next-number', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(nextBillRes.status, 200);
    assert.ok(nextBillRes.data.nextBillNo);
    console.log(`  ✅ GET /api/invoices/next-number: Next auto invoice is ${nextBillRes.data.nextBillNo}`);

    // Test 9: Create Timber Invoice (Size Mode)
    // 10 pieces of 4" x 3" x 8' = (4 * 3 * 8) / 12 * 10 = 80 CFT
    // Sal Wood @ 1450/CFT = 80 * 1450 = 116,000 + 18% GST (CGST 10,440 + SGST 10,440) = 136,880
    const sal = itemsRes.data.items.find(i => i.name.includes('Sal Wood'));
    const oldBalance = customer.currentBalance;
    const oldStock = sal.currentStock;

    const newInvoiceRes = await request('/api/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        billType: 'Size',
        mode: 'Credit',
        partyId: customer._id,
        challanNo: 'CH-8821',
        deliveryAt: 'Singanallur Site Workshop',
        items: [
          {
            itemId: sal._id,
            description: 'Sal Wood Rafters & Beams',
            hsn: '4407',
            pieces: 10,
            thickness: 4,
            width: 3,
            length: 8,
            qty: 10,
            rateUnit: 'CFT',
            cftRate: 1450,
            rate: 1450,
            taxPercent: 18
          }
        ],
        extraDetails: {
          vehicleNo: 'TN-41-BQ-5566',
          transport: 'Sri Balaji Roadways'
        }
      }
    });

    assert.strictEqual(newInvoiceRes.status, 201);
    const createdInv = newInvoiceRes.data.invoice;
    assert.strictEqual(createdInv.items[0].cft, 80, 'CFT should be 80');
    assert.strictEqual(createdInv.subtotal, 116000, 'Subtotal should be 116,000');
    assert.strictEqual(createdInv.cgstTotal, 10440, 'CGST should be 10,440');
    assert.strictEqual(createdInv.sgstTotal, 10440, 'SGST should be 10,440');
    assert.strictEqual(createdInv.grandTotal, 136880, 'Grand total should be 136,880');
    console.log(`  ✅ POST /api/invoices: Generated Invoice ${createdInv.billNo} for ₹${createdInv.grandTotal.toLocaleString('en-IN')}`);

    // Verify double-entry ledger update
    const updatedCustomerRes = await request(`/api/ledgers/${customer._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(
      updatedCustomerRes.data.ledger.currentBalance,
      oldBalance + createdInv.grandTotal,
      'Customer balance should increase by invoice grand total'
    );
    console.log(`  ✅ Double-Entry Accounting: Customer balance correctly debited from ₹${oldBalance} to ₹${updatedCustomerRes.data.ledger.currentBalance}`);

    // Test 10: Create Receipt Voucher
    // Customer pays ₹50,000 to SBI Bank
    const sbi = ledgersRes.data.ledgers.find(l => l.name.includes('State Bank'));
    const oldSbiBalance = sbi.currentBalance;

    const voucherRes = await request('/api/vouchers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        type: 'Receipt',
        fromAccountId: customer._id, // Credit Customer
        toAccountId: sbi._id,        // Debit Bank
        amount: 50000,
        narration: 'Part payment received via NEFT',
        paymentMode: 'Bank Transfer'
      }
    });
    assert.strictEqual(voucherRes.status, 201);
    console.log(`  ✅ POST /api/vouchers: Created Receipt ${voucherRes.data.voucher.voucherNo} for ₹50,000`);

    // Test 11: Reports - Dashboard
    const dashboardRes = await request('/api/reports/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(dashboardRes.status, 200);
    assert.ok(dashboardRes.data.metrics.liquidTotal > 0);
    console.log(`  ✅ GET /api/reports/dashboard: Liquid Cash/Bank: ₹${dashboardRes.data.metrics.liquidTotal.toLocaleString('en-IN')}, Receivables: ₹${dashboardRes.data.metrics.totalReceivables.toLocaleString('en-IN')}`);

    // Test 12: Reports - Outstanding
    const outstandingRes = await request('/api/reports/outstanding', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(outstandingRes.status, 200);
    assert.ok(outstandingRes.data.receivables.count >= 1);
    assert.ok(outstandingRes.data.payables.count >= 1);
    console.log(`  ✅ GET /api/reports/outstanding: Receivables Count: ${outstandingRes.data.receivables.count} (₹${outstandingRes.data.receivables.total.toLocaleString('en-IN')})`);

    // Test 13: Reports - Ledger Statement
    const statementRes = await request(`/api/reports/ledger-statement/${customer._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(statementRes.status, 200);
    assert.ok(statementRes.data.statement.length >= 2);
    console.log(`  ✅ GET /api/reports/ledger-statement: Running statement has ${statementRes.data.statement.length} entries`);

    // Test 14: Reports - Sales Register
    const salesRegRes = await request('/api/reports/sales-register', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(salesRegRes.status, 200);
    assert.ok(salesRegRes.data.records.length >= 2);
    console.log(`  ✅ GET /api/reports/sales-register: Total Net Sales: ₹${salesRegRes.data.summary.totalNet.toLocaleString('en-IN')}`);

    // Test 15: Settings & Backup
    const backupRes = await request('/api/settings/backup', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(backupRes.status, 200);
    assert.strictEqual(backupRes.data.companyName, 'Bhavani Timbers');
    assert.ok(backupRes.data.data.invoices.length >= 2);
    console.log('  ✅ GET /api/settings/backup: Complete database JSON exported');

    // Test 16: PIN Quick Login
    const pinLoginRes = await request('/api/auth/pin-login', {
      method: 'POST',
      body: { pin: '1234' }
    });
    assert.strictEqual(pinLoginRes.status, 200);
    assert.ok(pinLoginRes.data.token, 'Token generated from PIN login');
    console.log('  ✅ POST /api/auth/pin-login: PIN Quick Login successful');

    // Test 17: Cloud Sync Status
    const syncRes = await request('/api/sync/status');
    assert.strictEqual(syncRes.status, 200);
    assert.strictEqual(syncRes.data.status, 'synced');
    assert.ok(syncRes.data.stats.invoices >= 1);
    console.log(`  ✅ GET /api/sync/status: Cloud status is '${syncRes.data.status}', ${syncRes.data.storageMode}`);

    // Test 18: Financial Years Management (List & Switch)
    const fyListRes = await request('/api/financial-years', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(fyListRes.status, 200);
    assert.ok(fyListRes.data.financialYears.length >= 2, 'Should have multiple FYs');
    const targetFY = fyListRes.data.financialYears.find(y => !y.isCurrent);
    assert.ok(targetFY, 'Should find non-current FY to switch to');

    const switchRes = await request('/api/financial-years/switch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { id: targetFY._id }
    });
    assert.strictEqual(switchRes.status, 200);
    assert.strictEqual(switchRes.data.financialYear.isCurrent, true);
    console.log(`  ✅ Financial Years: Listed ${fyListRes.data.financialYears.length} years and switched active to ${targetFY.name}`);

    // Switch back to FY 2024-25 for subsequent tests
    const fy24 = fyListRes.data.financialYears.find(y => y.code === '2024-2025');
    await request('/api/financial-years/switch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { id: fy24._id }
    });

    // Test 19: Extended Ledger Groups
    const groupsRes = await request('/api/ledgers/groups', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(groupsRes.status, 200);
    assert.ok(groupsRes.data.groups.length >= 10, 'Should have standard Indian ERP ledger groups');
    console.log(`  ✅ GET /api/ledgers/groups: Found ${groupsRes.data.groups.length} chart of accounts groups`);

    console.log('\n======================================================');
    console.log('🎉 ALL 19 BACKEND INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('======================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

if (require.main === module) {
  runIntegrationTests().catch(err => {
    console.error('Integration test failed:', err);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests };
