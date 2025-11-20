const { query } = require('../config/database');

/**
 * Middleware to validate partner access
 * Ensures cross-tenant access is properly authorized
 */
const validatePartnerAccess = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'];
    const partnerId = req.params.partnerId || req.body.partner_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant context required',
        message: 'Tenant ID must be provided'
      });
    }

    if (partnerId) {
      // Verify partner relationship exists
      const partnerCheck = await query(`
        SELECT id, status, partner_tenant_id
        FROM partners
        WHERE id = $1 AND tenant_id = $2
      `, [partnerId, tenantId]);

      if (partnerCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Partner not found',
          message: 'Partner relationship does not exist'
        });
      }

      const partner = partnerCheck.rows[0];

      // Check if partner relationship is active
      if (partner.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Partner relationship inactive',
          message: `Partner relationship is ${partner.status}`
        });
      }

      // Add partner info to request
      req.partner = partner;
    }

    // Add tenant context
    req.tenantId = tenantId;
    next();
  } catch (error) {
    console.error('Partner access validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Access validation failed',
      message: error.message
    });
  }
};

/**
 * Middleware to check if user can access partner resources
 */
const requirePartnerAccess = (requiredLevel = 'read') => {
  return async (req, res, next) => {
    try {
      const collaborationId = req.params.collaborationId || req.body.collaboration_id;
      const tenantId = req.tenantId || req.user?.tenant_id;

      if (!collaborationId) {
        return next(); // No collaboration-specific check needed
      }

      // Check collaboration access level
      const collaborationCheck = await query(`
        SELECT access_level
        FROM partner_collaborations
        WHERE id = $1 AND tenant_id = $2
      `, [collaborationId, tenantId]);

      if (collaborationCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Collaboration not found'
        });
      }

      const accessLevel = collaborationCheck.rows[0].access_level;
      const accessLevels = ['read', 'write', 'admin'];
      const requiredIndex = accessLevels.indexOf(requiredLevel);
      const currentIndex = accessLevels.indexOf(accessLevel);

      if (currentIndex < requiredIndex) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient access level',
          message: `Required: ${requiredLevel}, Current: ${accessLevel}`
        });
      }

      next();
    } catch (error) {
      console.error('Partner access check error:', error);
      res.status(500).json({
        success: false,
        error: 'Access check failed',
        message: error.message
      });
    }
  };
};

module.exports = {
  validatePartnerAccess,
  requirePartnerAccess
};

