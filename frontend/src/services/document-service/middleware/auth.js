// Simple auth middleware for document service
// In production, this should validate JWT tokens from auth-service

const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token (simplified - in production, query auth-service)
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenant_id: decoded.tenantId || req.headers['x-tenant-id']
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Authentication token is invalid or expired'
    });
  }
};

const requireTenantAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  req.tenantId = req.user.tenant_id || req.headers['x-tenant-id'];
  next();
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    // Simplified permission check
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      return next();
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireTenantAccess,
  requirePermission
};

