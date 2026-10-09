const http = require('http');

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  // 1. Login
  const loginRes = await post('http://localhost:5000/api/auth/login', {
    username: 'owner',
    password: 'bhavani123'
  });
  console.log('Login status:', loginRes.status, 'success:', loginRes.body.success);
  const token = loginRes.body.token;

  // 2. Get debtors
  const ledgersRes = await get('http://localhost:5000/api/ledgers?type=debtors', token);
  const party = ledgersRes.body.ledgers[0];
  console.log('Selected party:', party?.name, party?._id);

  // 3. Test Save Bill (Size mode)
  const billRes = await post('http://localhost:5000/api/invoices', {
    billType: 'Size',
    mode: 'Credit',
    partyId: party._id,
    date: '2026-10-08',
    items: [
      {
        description: 'Teak Wood Plank',
        hsn: '4407',
        pieces: 10,
        thickness: 3,
        width: 2,
        length: 7,
        qty: 10,
        rateUnit: 'CFT',
        cftRate: 2400,
        rate: 2400,
        taxPercent: 18
      }
    ]
  }, token);

  console.log('Save bill status:', billRes.status, 'success:', billRes.body?.success, 'billNo:', billRes.body?.invoice?.billNo);

  // 4. Test PDF endpoint for this invoice
  if (billRes.body?.invoice?._id) {
    const pdfRes = await get(`http://localhost:5000/api/invoices/${billRes.body.invoice._id}/pdf`, token);
    console.log('PDF status:', pdfRes.status, 'length:', pdfRes.raw?.length || 'json');
  }
}

run().catch(console.error);
