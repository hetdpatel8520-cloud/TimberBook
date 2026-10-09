const assert = require('assert');
const {
  calculateCft,
  calculateCoreWoodCft,
  cftToCbm,
  cbmToCft,
  cftRateToCbmRate,
  cbmRateToCftRate,
  calculateGst,
  calculateRoundOff,
  numberToWords
} = require('../src/services/timberMath');

async function runUnitTests() {
  console.log('🧪 Running TimberBooks Core Math & Logic Unit Tests...\n');

  // Test 1: Sawn Timber CFT Calculation
  // 3" x 2" x 7' = (3 * 2 * 7) / 12 = 42 / 12 = 3.5 CFT per piece
  // 10 pieces = 35.0 CFT
  const cft = calculateCft(3, 2, 7, 10);
  assert.strictEqual(cft, 35, `Expected 35 CFT, got ${cft}`);
  console.log('  ✅ Sawn Timber CFT calculation: 3" x 2" x 7\' x 10 pcs = 35.0 CFT');

  // Test 1b: Core Wood / Round Log Quarter-Girth (Hoppus) CFT
  // Girth: 36", Length: 8', Pieces: 2 -> (9 * 9 * 8) / 144 * 2 = 9.0 CFT
  const coreCft = calculateCoreWoodCft(36, 8, 2);
  assert.strictEqual(coreCft, 9, `Expected 9 CFT, got ${coreCft}`);
  console.log('  ✅ Core Wood Quarter-Girth CFT: 36" Girth x 8\' Len x 2 pcs = 9.0 CFT');

  // Test 2: CFT to CBM & Reverse
  // 35.3147 CFT = 1.0 CBM
  const cbm = cftToCbm(35.3147);
  assert.strictEqual(Math.round(cbm), 1, `Expected ~1 CBM, got ${cbm}`);
  const backCft = cbmToCft(1);
  assert.strictEqual(Math.round(backCft * 1000) / 1000, 35.315, `Expected 35.315 CFT, got ${backCft}`);
  console.log('  ✅ CFT ↔ CBM conversion: 35.3147 CFT = 1.0000 CBM');

  // Test 3: Rate Conversions
  // Rate ₹1000/CFT = ₹35,314.70/CBM
  const cbmRate = cftRateToCbmRate(1000);
  assert.strictEqual(cbmRate, 35314.7, `Expected 35314.70, got ${cbmRate}`);
  const cftRate = cbmRateToCftRate(35314.7);
  assert.strictEqual(Math.round(cftRate), 1000, `Expected 1000, got ${cftRate}`);
  console.log('  ✅ Rate Conversion: ₹1000/CFT = ₹35,314.70/CBM');

  // Test 4: Intra-state GST (CGST + SGST split 50/50)
  // Taxable: 10,000, Rate: 18% -> CGST: 900 (9%), SGST: 900 (9%), Total tax: 1800
  const localGst = calculateGst(10000, 18, true);
  assert.strictEqual(localGst.cgstRate, 9);
  assert.strictEqual(localGst.sgstRate, 9);
  assert.strictEqual(localGst.igstRate, 0);
  assert.strictEqual(localGst.cgstAmount, 900);
  assert.strictEqual(localGst.sgstAmount, 900);
  assert.strictEqual(localGst.taxTotal, 1800);
  console.log('  ✅ Intra-state GST: ₹10,000 @ 18% -> CGST ₹900 (9%) + SGST ₹900 (9%)');

  // Test 5: Inter-state GST (IGST 100%)
  const interGst = calculateGst(10000, 18, false);
  assert.strictEqual(interGst.cgstRate, 0);
  assert.strictEqual(interGst.sgstRate, 0);
  assert.strictEqual(interGst.igstRate, 18);
  assert.strictEqual(interGst.igstAmount, 1800);
  assert.strictEqual(interGst.taxTotal, 1800);
  console.log('  ✅ Inter-state GST: ₹10,000 @ 18% -> IGST ₹1,800 (18%)');

  // Test 6: Round Off
  const r1 = calculateRoundOff(12450.40);
  assert.strictEqual(r1.roundOff, -0.40);
  assert.strictEqual(r1.grandTotal, 12450);

  const r2 = calculateRoundOff(12450.60);
  assert.strictEqual(r2.roundOff, 0.40);
  assert.strictEqual(r2.grandTotal, 12451);
  console.log('  ✅ Round Off: ₹12,450.40 -> ₹12,450 (-0.40) & ₹12,450.60 -> ₹12,451 (+0.40)');

  // Test 7: Number to Words (Indian format)
  const words1 = numberToWords(42500);
  assert.strictEqual(words1, 'Rupees Forty-Two Thousand Five Hundred Only');
  const words2 = numberToWords(125345.50);
  assert.strictEqual(words2, 'Rupees One Lakh Twenty-Five Thousand Three Hundred and Forty-Five and Fifty Paise Only');
  console.log(`  ✅ Number to Words: 42500 -> "${words1}"`);
  console.log(`  ✅ Number to Words: 125345.50 -> "${words2}"`);

  console.log('\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!\n');
}

if (require.main === module) {
  runUnitTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

module.exports = { runUnitTests };
