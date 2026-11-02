/**
 * Normalization & Masking Utility for TimberBooks
 */

/**
 * Normalizes email: trim whitespace and convert to lowercase
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes mobile number:
 * - Removes all non-digit characters
 * - Strips leading +91 or 91 (country code) if length is 12
 * - Strips leading 0 if length is 11
 * - Returns last 10 digits
 */
function normalizeMobile(mobile) {
  if (!mobile) return '';
  let digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Masks an identifier (mobile or email) for secure logging and UI display
 * Examples:
 *   "john.doe@example.com" -> "j***e@example.com"
 *   "9876543210"          -> "98*****210"
 */
function maskIdentifier(id) {
  if (!id || typeof id !== 'string') return '***';
  const trimmed = id.trim();
  if (trimmed.includes('@')) {
    const [user, domain] = trimmed.split('@');
    if (!user || !domain) return '***@***';
    const first = user[0] || '*';
    const last = user.length > 1 ? user[user.length - 1] : '';
    return `${first}***${last}@${domain}`;
  }
  const clean = trimmed.replace(/\D/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 2)}*****${clean.slice(-3)}`;
  }
  return '***';
}

module.exports = {
  normalizeEmail,
  normalizeMobile,
  maskIdentifier
};
