const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { normalizeEmail, normalizeMobile, maskIdentifier } = require('../utils/normalize');

// OTP Security configuration
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 3;
const HASH_SALT = process.env.JWT_SECRET || 'timberbooks_otp_secure_salt_2026';

// In-memory security tracking map: key -> { hashedOtp, expiresAt, attempts, requestTimestamps: [] }
const otpSecurityStore = new Map();

/**
 * Hash OTP code for secure storage
 */
function hashOtp(code) {
  return crypto.createHash('sha256').update(`${code}_${HASH_SALT}`).digest('hex');
}

/**
 * Configure Nodemailer Transporter
 */
function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587/other
    auth: { user, pass }
  });
}

/**
 * Professional HTML Email Template for TimberBooks OTP
 */
function buildOtpEmailHtml(code, targetName = 'Owner') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>TimberBooks Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1a29; margin: 0; padding: 20px; color: #ffffff; }
        .container { max-width: 500px; margin: 0 auto; background-color: #102a43; border-radius: 12px; border: 1px solid rgba(212, 160, 23, 0.4); padding: 32px 24px; text-align: center; }
        .logo-title { font-size: 26px; font-weight: 800; color: #d4a017; margin-bottom: 4px; letter-spacing: 0.5px; }
        .logo-tagline { font-size: 13px; color: #9fb3c8; margin-bottom: 24px; }
        .box { background: #0b1a29; border-radius: 8px; border: 1px dashed #d4a017; padding: 20px; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; color: #f0b429; letter-spacing: 8px; margin: 0; font-family: monospace; }
        .text { font-size: 14px; line-height: 22px; color: #d9e2ec; margin: 12px 0; }
        .alert-text { font-size: 12px; color: #829ab1; margin-top: 24px; line-height: 18px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-title">🌲 TimberBooks</div>
        <div class="logo-tagline">Cloud GST Billing & Saw Mill ERP</div>
        
        <p class="text">Hello ${targetName},</p>
        <p class="text">Your single-use 6-digit verification code is:</p>
        
        <div class="box">
          <div class="otp-code">${code}</div>
        </div>

        <p class="text" style="color: #f0b429; font-weight: 600;">⏰ This code is valid for 10 minutes.</p>
        <p class="text">Please enter this code in the TimberBooks app to complete your verification.</p>

        <div class="alert-text">
          Security Alert: Never share this OTP with anyone. TimberBooks staff will never ask for your code.<br>
          If you did not request this verification, please ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatch Email OTP via Nodemailer
 */
async function sendEmailOtp(email, code, fullName = 'TimberBooks User') {
  const cleanEmail = normalizeEmail(email);
  const transporter = getEmailTransporter();

  if (!transporter) {
    console.warn(`⚠️ [EMAIL OTP] SMTP credentials not set. Set SMTP_HOST, SMTP_USER, SMTP_PASS to deliver emails to ${maskIdentifier(cleanEmail)}.`);
    return false;
  }

  const mailFrom = process.env.MAIL_FROM || `TimberBooks Support <${process.env.SMTP_USER}>`;

  const mailOptions = {
    from: mailFrom,
    to: cleanEmail,
    subject: `Your TimberBooks Verification Code is ${code}`,
    text: `Your TimberBooks verification code is: ${code}. This code is valid for 10 minutes. If you did not request this, please ignore this email.`,
    html: buildOtpEmailHtml(code, fullName)
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ [EMAIL OTP] Verification code successfully delivered to ${maskIdentifier(cleanEmail)}`);
  return true;
}

/**
 * Dispatch SMS OTP (Modular SMS Gateway - MSG91 / Fast2SMS)
 */
async function sendSmsOtp(mobile, code) {
  const normMobile = normalizeMobile(mobile);
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();

  // If no SMS provider configured, keep SMS off
  if (!provider) {
    console.log(`ℹ️ [SMS OTP] SMS_PROVIDER not configured. Mobile OTP delivery is OFF until SMS keys are added.`);
    return false;
  }

  try {
    if (provider === 'msg91') {
      const authKey = process.env.MSG91_AUTH_KEY;
      const templateId = process.env.MSG91_TEMPLATE_ID;
      if (!authKey || !templateId) {
        console.warn('⚠️ [SMS OTP] MSG91_AUTH_KEY or MSG91_TEMPLATE_ID missing.');
        return false;
      }
      // MSG91 API Call
      const res = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${normMobile}&authkey=${authKey}&otp=${code}`, {
        method: 'POST'
      });
      console.log(`📱 [SMS OTP] MSG91 OTP requested for 91${maskIdentifier(normMobile)}: status ${res.status}`);
      return res.ok;
    } else if (provider === 'fast2sms') {
      const apiKey = process.env.FAST2SMS_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ [SMS OTP] FAST2SMS_API_KEY missing.');
        return false;
      }
      // Fast2SMS Quick OTP
      const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&variables_values=${code}&route=otp&numbers=${normMobile}`);
      console.log(`📱 [SMS OTP] Fast2SMS OTP requested for ${maskIdentifier(normMobile)}: status ${res.status}`);
      return res.ok;
    }
  } catch (err) {
    console.error(`❌ [SMS OTP] Error sending SMS: ${err.message}`);
    return false;
  }

  return false;
}

/**
 * Generate, secure, and deliver OTP
 */
async function generateAndDeliverOtp({ mobile, email, fullName, channel = 'all' }) {
  const normEmail = normalizeEmail(email);
  const normMobile = normalizeMobile(mobile);
  const primaryKey = normEmail || normMobile;

  if (!primaryKey) {
    throw new Error('Valid email address or mobile number is required.');
  }

  // Rate Limiting: Max 3 requests per hour
  const now = Date.now();
  const existing = otpSecurityStore.get(primaryKey);
  if (existing) {
    const recentRequests = (existing.requestTimestamps || []).filter(t => now - t < 60 * 60 * 1000);
    if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
      throw new Error('Too many OTP requests. Maximum 3 requests allowed per hour. Please wait before trying again.');
    }
    existing.requestTimestamps = [...recentRequests, now];
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashed = hashOtp(code);

  const securityRecord = {
    hashedOtp: hashed,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    requestTimestamps: existing?.requestTimestamps || [now]
  };

  otpSecurityStore.set(primaryKey, securityRecord);
  if (normMobile && normEmail) {
    otpSecurityStore.set(normMobile, securityRecord);
    otpSecurityStore.set(normEmail, securityRecord);
  }

  // A5: Developer mode only: if NODE_ENV is "development" and DEV_SHOW_OTP=true, print to server console only
  if (process.env.NODE_ENV === 'development' && process.env.DEV_SHOW_OTP === 'true') {
    console.log(`🔐 [DEV CONSOLE ONLY] Verification OTP for ${maskIdentifier(primaryKey)}: ${code}`);
  }

  let emailSent = false;
  let smsSent = false;

  // Deliver by Email
  if (normEmail && (channel === 'all' || channel === 'email')) {
    try {
      emailSent = await sendEmailOtp(normEmail, code, fullName);
    } catch (e) {
      console.error(`Failed to send email OTP: ${e.message}`);
    }
  }

  // Deliver by SMS
  if (normMobile && (channel === 'all' || channel === 'mobile')) {
    try {
      smsSent = await sendSmsOtp(normMobile, code);
    } catch (e) {
      console.error(`Failed to send SMS OTP: ${e.message}`);
    }
  }

  return {
    success: true,
    emailSent,
    smsSent,
    targetMasked: maskIdentifier(normEmail || normMobile)
  };
}

/**
 * Validate submitted OTP securely against hashed store
 */
function verifySubmittedOtp(target, code) {
  if (!target || !code) {
    return { success: false, message: 'Contact identifier and OTP code are required.' };
  }

  const clean = String(target).trim();
  const key = clean.includes('@') ? normalizeEmail(clean) : normalizeMobile(clean);
  const enteredCode = String(code).trim();

  // Development bypass (123456) in local development only
  if (process.env.NODE_ENV === 'development' && enteredCode === '123456') {
    return { success: true };
  }

  const record = otpSecurityStore.get(key);
  if (!record) {
    return { success: false, message: 'No OTP requested for this contact or it has expired. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpSecurityStore.delete(key);
    return { success: false, message: 'This OTP code has expired (10 minutes limit). Please request a new code.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpSecurityStore.delete(key);
    return { success: false, message: 'Too many incorrect attempts (limit 5). This OTP has been invalidated for security. Please request a new one.' };
  }

  const enteredHash = hashOtp(enteredCode);
  if (enteredHash !== record.hashedOtp) {
    record.attempts += 1;
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      success: false,
      message: `Invalid verification code. ${remaining} attempt(s) remaining.`
    };
  }

  // Success: invalidate OTP immediately
  otpSecurityStore.delete(key);
  return { success: true };
}

module.exports = {
  generateAndDeliverOtp,
  verifySubmittedOtp
};
