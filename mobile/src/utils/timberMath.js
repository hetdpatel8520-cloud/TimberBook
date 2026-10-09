export const CFT_PER_CBM = 35.3147;

export function calculateCft(thickness, width, length, pieces = 1) {
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
 * Standard Indian Timber Quarter-Girth (Hoppus) Formula for Round Logs & Core Wood:
 * CFT = (Girth / 4)^2 * Length / 144 * pieces
 */
export function calculateCoreWoodCft(girthInches, lengthFeet, pieces = 1) {
  const g = parseFloat(girthInches) || 0;
  const l = parseFloat(lengthFeet) || 0;
  const p = parseFloat(pieces) || 0;

  if (g <= 0 || l <= 0 || p <= 0) return 0;

  const quarterGirth = g / 4;
  const cftPerLog = (quarterGirth * quarterGirth * l) / 144;
  return parseFloat((cftPerLog * p).toFixed(4));
}

export function cftToCbm(cft) {
  const val = parseFloat(cft) || 0;
  if (val <= 0) return 0;
  return parseFloat((val / CFT_PER_CBM).toFixed(4));
}

export function cbmToCft(cbm) {
  const val = parseFloat(cbm) || 0;
  if (val <= 0) return 0;
  return parseFloat((val * CFT_PER_CBM).toFixed(4));
}

export function cftRateToCbmRate(cftRate) {
  const rate = parseFloat(cftRate) || 0;
  return parseFloat((rate * CFT_PER_CBM).toFixed(2));
}

export function cbmRateToCftRate(cbmRate) {
  const rate = parseFloat(cbmRate) || 0;
  return parseFloat((rate / CFT_PER_CBM).toFixed(2));
}

export function calculateGst(taxableAmount, taxPercent, isLocal = true) {
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

export function calculateRoundOff(totalAmount) {
  const rounded = Math.round(totalAmount);
  const diff = parseFloat((rounded - totalAmount).toFixed(2));
  return {
    roundOff: diff,
    grandTotal: rounded
  };
}

export function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹ 0.00';
  const num = Number(val);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
