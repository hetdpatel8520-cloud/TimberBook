const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else if (contentType.includes('application/pdf')) {
    data = await res.arrayBuffer();
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data };
}

async function runTests() {
  console.log('\n🚀 Starting Comprehensive Multi-Tenant Integration Tests...\n');

  // Test 1: Health check
  console.log('1️⃣ Testing Server Health Check...');
  const healthRes = await req('/health');
  assert.strictEqual(healthRes.status, 200);
  assert(healthRes.data.status === 'ok' || healthRes.data.status === 'OK');
  console.log('   ✅ Server is healthy, storageMode:', healthRes.data.storageMode);

  // Test 2: Check Duplicate Check API
  console.log('2️⃣ Testing Duplicate Check API...');
  const dupRes = await req('/api/auth/register-check', {
    method: 'POST',
    body: JSON.stringify({
      mobile: '9998887766',
      email: 'newowner@apexwood.com',
      gstin: '24AAAAA0000A1Z5'
    })
  });
  assert.strictEqual(dupRes.data.success, true);
  assert.strictEqual(dupRes.data.isDuplicate, false);
  console.log('   ✅ Duplicate check passed (no conflict for new data)');

  // Test 3: OTP Send & Verify
  console.log('3️⃣ Testing OTP Send & Verify API...');
  const otpSendRes = await req('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      mobile: '9998887766',
      email: 'newowner@apexwood.com'
    })
  });
  assert.strictEqual(otpSendRes.data.success, true);
  const otpCode = otpSendRes.data.devOtp || '123456';
  console.log('   ✅ OTP sent, code received:', otpCode);

  const otpVerifyRes = await req('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      mobile: '9998887766',
      code: otpCode
    })
  });
  assert.strictEqual(otpVerifyRes.data.success, true);
  assert.strictEqual(otpVerifyRes.data.verified, true);
  console.log('   ✅ OTP verified successfully');

  // Test 4: Register New Company & Owner
  console.log('4️⃣ Testing Company Registration Portal (Step 1-4 Complete Flow)...');
  const regRes = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Ramesh Patel',
      mobile: '9998887766',
      email: 'newowner@apexwood.com',
      password: 'password123',
      pin: '5678',
      companyName: 'Apex Timber Industries',
      businessType: 'Timber Trader',
      addressLine1: 'Plot 45, GIDC Industrial Estate',
      addressLine2: 'Near Ring Road',
      city: 'Surat',
      district: 'Surat',
      state: 'Gujarat',
      stateCode: '24',
      pincode: '395003',
      phone: '0261-2456789',
      companyEmail: 'contact@apexwood.com',
      gstin: '24AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      bankName: 'State Bank of India',
      accountNo: '30012345678',
      ifsc: 'SBIN0001234',
      fyFrom: '2026-04-01',
      fyTo: '2027-03-31',
      fyName: 'FY 2026-27'
    })
  });

  assert.strictEqual(regRes.data.success, true);
  assert(regRes.data.token, 'Token should be returned');
  assert.strictEqual(regRes.data.company.name, 'Apex Timber Industries');
  assert.strictEqual(regRes.data.owner.fullName, 'Ramesh Patel');
  const tenant1Token = regRes.data.token;
  const tenant1CompanyId = regRes.data.company._id;
  console.log('   ✅ Company "Apex Timber Industries" registered. ID:', tenant1CompanyId);

  const authHeaders1 = { Authorization: `Bearer ${tenant1Token}` };

  // Test 5: Verify Empty State Onboarding for newly registered company
  console.log('5️⃣ Testing Initial Empty State Dashboard Metrics for New Company...');
  const dashRes1 = await req('/api/reports/dashboard', { headers: authHeaders1 });
  assert.strictEqual(dashRes1.data.success, true);
  const m1 = dashRes1.data.metrics;
  assert.strictEqual(m1.todaySales, 0);
  assert.strictEqual(m1.monthSales, 0);
  assert.strictEqual(m1.totalReceivables, 0);
  assert.strictEqual(m1.totalPayables, 0);
  assert.strictEqual(m1.counts.bills, 0);
  assert.strictEqual(m1.counts.items, 0);
  console.log('   ✅ Initial state is pristine zero: bills=0, items=0, receivables=0');

  // Test 6: Create Master Party & Item in New Company
  console.log('6️⃣ Testing Master Creation (Party & Timber Item)...');
  const partyRes = await req('/api/ledgers', {
    method: 'POST',
    headers: authHeaders1,
    body: JSON.stringify({
      name: 'Shree Krishna Furniture',
      group: 'Sundry Debtors',
      phone: '9876501234',
      city: 'Surat',
      state: 'Gujarat',
      stateCode: '24',
      openingBalance: 0,
      openingBalanceType: 'Dr'
    })
  });
  assert.strictEqual(partyRes.data.success, true);
  const partyId = partyRes.data.ledger._id;
  console.log('   ✅ Party "Shree Krishna Furniture" created:', partyId);

  const itemRes = await req('/api/items', {
    method: 'POST',
    headers: authHeaders1,
    body: JSON.stringify({
      name: 'Teak Sawn Timber 3x2',
      species: 'Teak',
      itemType: 'Size',
      length: 10,
      width: 3,
      thickness: 2,
      cftRate: 1500,
      cbmRate: 52972,
      hsnCode: '4407',
      taxRate: 18,
      unit: 'CFT',
      currentStock: 250,
      reorderLevel: 50
    })
  });
  assert.strictEqual(itemRes.data.success, true);
  const itemId = itemRes.data.item._id;
  console.log('   ✅ Timber Item "Teak Sawn Timber 3x2" created:', itemId);

  // Test 7: Create GST Tax Invoice
  console.log('7️⃣ Testing GST Tax Invoice Creation with Timber CFT calculation...');
  const invoiceRes = await req('/api/invoices', {
    method: 'POST',
    headers: authHeaders1,
    body: JSON.stringify({
      billType: 'Size',
      mode: 'Credit',
      partyId: partyId,
      date: new Date().toISOString(),
      challanNo: 'CH-101',
      orderNo: 'ORD-501',
      deliveryAt: 'Surat Factory',
      items: [
        {
          itemId: itemId,
          description: 'Teak Sawn Timber 3x2 (10ft)',
          hsnCode: '4407',
          qty: 20,
          cft: 8.33,
          cbm: 0.236,
          rate: 1500,
          amount: 12495,
          cgstPercent: 9,
          cgstAmount: 1124.55,
          sgstPercent: 9,
          sgstAmount: 1124.55,
          igstPercent: 0,
          igstAmount: 0
        }
      ],
      subtotal: 12495,
      cgstTotal: 1124.55,
      sgstTotal: 1124.55,
      igstTotal: 0,
      taxableTotal: 12495,
      roundOff: -0.10,
      grandTotal: 14744,
      vehicleNo: 'GJ-05-AB-1234',
      transport: 'Surat Roadways'
    })
  });

  assert.strictEqual(invoiceRes.data.success, true);
  const billId = invoiceRes.data.invoice._id;
  const billNo = invoiceRes.data.invoice.billNo;
  console.log(`   ✅ GST Invoice created: Bill No ${billNo}, Grand Total: ₹14,744, ID: ${billId}`);

  // Test 8: Generate PDF Tax Invoice
  console.log('8️⃣ Testing PDF Tax Invoice Generation...');
  const pdfRes = await req(`/api/invoices/${billId}/pdf`, {
    headers: authHeaders1
  });
  assert.strictEqual(pdfRes.status, 200);
  assert(pdfRes.headers.get('content-type').includes('pdf'), 'Response should be application/pdf');
  assert(pdfRes.data.byteLength > 500, 'PDF buffer should be non-empty');
  console.log(`   ✅ PDF generated successfully: ${pdfRes.data.byteLength} bytes`);

  // Test 9: Verify Updated Dashboard Metrics
  console.log('9️⃣ Testing Updated Dashboard Metrics after Invoice Creation...');
  const dashRes2 = await req('/api/reports/dashboard', { headers: authHeaders1 });
  assert.strictEqual(dashRes2.data.success, true);
  assert.strictEqual(dashRes2.data.metrics.counts.bills, 1);
  assert.strictEqual(dashRes2.data.metrics.counts.items, 1);
  assert.strictEqual(dashRes2.data.metrics.todaySales, 14744);
  console.log('   ✅ Dashboard metrics updated dynamically: todaySales=₹14,744, bills=1');

  // Test 10: Multi-Tenant Data Isolation Test
  console.log('🔟 Testing Multi-Tenant Data Isolation (Cross-Company Security)...');
  // Register Company B:
  const regResB = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Mohan Sharma',
      mobile: '9888777665',
      email: 'mohan@sharmatimbers.in',
      password: 'password456',
      pin: '9988',
      companyName: 'Sharma Timber Works',
      businessType: 'Saw Mill',
      addressLine1: 'Station Road',
      city: 'Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
      stateCode: '08',
      pincode: '302001',
      gstin: '08ABCDE9999F1Z1',
      fyFrom: '2026-04-01',
      fyTo: '2027-03-31',
      fyName: 'FY 2026-27'
    })
  });
  assert.strictEqual(regResB.data.success, true);
  const tenant2Token = regResB.data.token;
  const authHeaders2 = { Authorization: `Bearer ${tenant2Token}` };

  // Query invoices as Company B
  const invResB = await req('/api/invoices', { headers: authHeaders2 });
  assert.strictEqual(invResB.data.success, true);
  assert.strictEqual(invResB.data.invoices.length, 0, 'Company B must see ZERO invoices (Company A data isolated)');

  // Query items as Company B
  const itemsResB = await req('/api/items', { headers: authHeaders2 });
  assert.strictEqual(itemsResB.data.success, true);
  assert.strictEqual(itemsResB.data.items.length, 0, 'Company B must see ZERO items (Company A items isolated)');

  // Try to directly fetch Company A's invoice using Company B's token
  const crossInvRes = await req(`/api/invoices/${billId}`, { headers: authHeaders2 });
  assert.strictEqual(crossInvRes.status, 404);
  console.log('   ✅ Cross-tenant invoice access blocked with 404');

  // Try to directly fetch Company A's item using Company B's token
  const crossItemRes = await req(`/api/items/${itemId}`, { headers: authHeaders2 });
  assert.strictEqual(crossItemRes.status, 404);
  console.log('   ✅ Cross-tenant item access blocked with 404');
  console.log('   ✅ Multi-tenant isolation verified: zero leakage across companies');

  // Test 11: Quick PIN Login
  console.log('1️⃣1️⃣ Testing Quick PIN Login...');
  const pinRes = await req('/api/auth/verify-pin', {
    method: 'POST',
    body: JSON.stringify({
      pin: '5678',
      identifier: '9998887766'
    })
  });
  assert.strictEqual(pinRes.data.success, true);
  assert.strictEqual(pinRes.data.company.name, 'Apex Timber Industries');
  console.log('   ✅ Quick PIN login verified');

  // Test 12: Universal Login (Mobile/Email + Password)
  console.log('1️⃣2️⃣ Testing Mobile/Email + Password Universal Login...');
  const loginRes = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'newowner@apexwood.com',
      password: 'password123'
    })
  });
  assert.strictEqual(loginRes.data.success, true);
  assert.strictEqual(loginRes.data.company.name, 'Apex Timber Industries');
  console.log('   ✅ Universal login verified');

  // Test 13: Forgot Password & Reset via OTP
  console.log('1️⃣3️⃣ Testing Forgot Password & Reset via OTP...');
  const forgotRes = await req('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      identifier: '9998887766'
    })
  });
  assert.strictEqual(forgotRes.data.success, true);
  const resetOtp = forgotRes.data.devOtp || '123456';

  const resetRes = await req('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      identifier: '9998887766',
      otp: resetOtp,
      newPassword: 'newpassword789',
      newPin: '1122'
    })
  });
  assert.strictEqual(resetRes.data.success, true);

  // Verify login with new password
  const newLoginRes = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: '9998887766',
      password: 'newpassword789'
    })
  });
  assert.strictEqual(newLoginRes.data.success, true);
  console.log('   ✅ Forgot/Reset password and new password login verified');

  console.log('\n🎉 ALL 13 MULTI-TENANT BACKEND INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
