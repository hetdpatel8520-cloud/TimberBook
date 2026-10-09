/**
 * Timber calculation utilities: CFT, CBM, Rates, and GST splits.
 * 1 CBM = 35.3147 CFT (Standard Timber Industry conversion)
 */

const CFT_PER_CBM = 35.3147;

/**
 * Calculates CFT for timber sizes.
 * Dimensions: thickness (inches), width (inches), length (feet)
 * Formula: (T * W * L) / 12 = CFT per piece
 * Total CFT = CFT per piece * pieces
 */
function calculateCft(thickness, width, length, pieces = 1) {
  const t = parseFloat(thickness) || 0;
  const w = parseFloat(width) || 0;
  const l = parseFloat(length) || 0;
  const p = parseFloat(pieces) || 0;

  if (t <= 0 || w <= 0 || l <= 0 || p <= 0) {
    return 0;
  }

  const cftPerPiece = (t * w * l) / 12;
  const totalCft = cftPerPiece * p;
  return parseFloat(totalCft.toFixed(4));
}

/**
 * Calculates CFT for Round Logs / Core Wood using the Quarter-Girth (Hoppus) formula:
 * (Girth / 4)^2 * Length / 144 * pieces
 */
function calculateCoreWoodCft(girthInches, lengthFeet, pieces = 1) {
  const g = parseFloat(girthInches) || 0;
  const l = parseFloat(lengthFeet) || 0;
  const p = parseFloat(pieces) || 0;

  if (g <= 0 || l <= 0 || p <= 0) return 0;

  const quarterGirth = g / 4;
  const cftPerLog = (quarterGirth * quarterGirth * l) / 144;
  return parseFloat((cftPerLog * p).toFixed(4));
}

/**
 * Converts CFT to CBM.
 */
function cftToCbm(cft) {
  const val = parseFloat(cft) || 0;
  if (val <= 0) return 0;
  return parseFloat((val / CFT_PER_CBM).toFixed(4));
}

/**
 * Converts CBM to CFT.
 */
function cbmToCft(cbm) {
  const val = parseFloat(cbm) || 0;
  if (val <= 0) return 0;
  return parseFloat((val * CFT_PER_CBM).toFixed(4));
}

/**
 * Converts rate per CFT to rate per CBM.
 */
function cftRateToCbmRate(cftRate) {
  const rate = parseFloat(cftRate) || 0;
  return parseFloat((rate * CFT_PER_CBM).toFixed(2));
}

/**
 * Converts rate per CBM to rate per CFT.
 */
function cbmRateToCftRate(cbmRate) {
  const rate = parseFloat(cbmRate) || 0;
  return parseFloat((rate / CFT_PER_CBM).toFixed(2));
}

/**
 * Calculates GST components based on intra-state vs inter-state.
 */
function calculateGst(taxableAmount, taxPercent, isLocal = true) {
  const amount = parseFloat(taxableAmount) || 0;
  const rate = parseFloat(taxPercent) || 0;

  if (amount <= 0 || rate <= 0) {
    return {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      taxTotal: 0
    };
  }

  if (isLocal) {
    const halfRate = rate / 2;
    const halfTax = parseFloat(((amount * halfRate) / 100).toFixed(2));
    return {
      cgstRate: halfRate,
      sgstRate: halfRate,
      igstRate: 0,
      cgstAmount: halfTax,
      sgstAmount: halfTax,
      igstAmount: 0,
      taxTotal: parseFloat((halfTax * 2).toFixed(2))
    };
  } else {
    const igstTax = parseFloat(((amount * rate) / 100).toFixed(2));
    return {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: rate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: igstTax,
      taxTotal: igstTax
    };
  }
}

/**
 * Round-off adjustment to nearest rupee.
 */
function calculateRoundOff(totalAmount) {
  const rounded = Math.round(totalAmount);
  const diff = parseFloat((rounded - totalAmount).toFixed(2));
  return {
    roundOff: diff,
    grandTotal: rounded
  };
}

/**
 * Indian Number to Words Converter for Invoices
 */
function numberToWords(num) {
  if (num === 0) return 'Rupees Zero Only';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    let str = '';
    if (n > 19) {
      const unit = a[n % 10];
      str += b[Math.floor(n / 10)] + (unit ? '-' + unit : '');
    } else {
      str += a[n];
    }
    return str.trim();
  }

  const rounded = Math.floor(Math.abs(num));
  const crore = Math.floor(rounded / 10000000);
  let rem = rounded % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = Math.floor(rem / 100);
  rem = rem % 100;

  let words = '';
  if (crore > 0) words += inWords(crore) + ' Crore ';
  if (lakh > 0) words += inWords(lakh) + ' Lakh ';
  if (thousand > 0) words += inWords(thousand) + ' Thousand ';
  if (hundred > 0) words += inWords(hundred) + ' Hundred ';
  if (rem > 0) {
    if (words !== '') words += 'and ';
    words += inWords(rem) + ' ';
  }

  const paise = Math.round((Math.abs(num) - rounded) * 100);
  let result = 'Rupees ' + words.trim();
  if (paise > 0) {
    result += ' and ' + inWords(paise) + ' Paise';
  }
  result += ' Only';
  return result;
}

module.exports = {
  CFT_PER_CBM,
  calculateCft,
  calculateCoreWoodCft,
  cftToCbm,
  cbmToCft,
  cftRateToCbmRate,
  cbmRateToCftRate,
  calculateGst,
  calculateRoundOff,
  numberToWords
};
