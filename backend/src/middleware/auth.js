const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const Owner = require('../models/Owner');

/**
 * Multi-Tenant Authentication Middleware
 * 
 * 1. Authenticates JWT Bearer token
 * 2. Extracts and attaches req.ownerId and req.owner
 * 3. Enforces tenant isolation via 'X-Company-Id' header:
 *    - Verifies requested company belongs to authenticated ownerId and is not archived
 *    - Rejects cross-tenant access with 403 Forbidden
 *    - Attaches req.companyId and req.company
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'timberbooks_super_secret_jwt_key_2026'
    );

    const ownerId = decoded.ownerId || decoded.id;
    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: owner identifier missing.'
      });
    }

    req.owner = decoded;
    req.ownerId = ownerId;

    // Tenant Isolation Check via X-Company-Id Header
    const requestedCompanyId = req.headers['x-company-id'];
    let targetCompany = null;

    if (requestedCompanyId && requestedCompanyId !== 'null' && requestedCompanyId !== 'undefined') {
      try {
        targetCompany = await Company.findOne({
          _id: requestedCompanyId,
          ownerId,
          isArchived: { $ne: true }
        });
      } catch (err) {
        targetCompany = null;
      }

      if (!targetCompany) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Selected company does not belong to your account or has been archived.'
        });
      }
    } else {
      // Fallback 1: Token companyId if owned and active
      if (decoded.companyId) {
        try {
          targetCompany = await Company.findOne({
            _id: decoded.companyId,
            ownerId,
            isArchived: { $ne: true }
          });
        } catch (err) {
          targetCompany = null;
        }
      }

      // Fallback 2: Check Owner activeCompanyId in DB
      if (!targetCompany) {
        const ownerDoc = await Owner.findById(ownerId).select('activeCompanyId companyId');
        const activeId = ownerDoc?.activeCompanyId || ownerDoc?.companyId;
        if (activeId) {
          try {
            targetCompany = await Company.findOne({
              _id: activeId,
              ownerId,
              isArchived: { $ne: true }
            });
          } catch (err) {
            targetCompany = null;
          }
        }
      }

      // Fallback 3: First available company owned by this owner
      if (!targetCompany) {
        targetCompany = await Company.findOne({
          ownerId,
          isArchived: { $ne: true }
        }).sort({ isDefault: -1, createdAt: 1 });
      }
    }

    if (targetCompany) {
      req.companyId = targetCompany._id;
      req.company = targetCompany;
    } else {
      req.companyId = null;
      req.company = null;
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please sign in again.'
    });
  }
}

module.exports = authMiddleware;
