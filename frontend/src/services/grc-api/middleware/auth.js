const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * JWT Authentication Middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    // If bypass auth is enabled, create a demo user
    if (process.env.BYPASS_AUTH === 'true') {
      req.user = {
        id: 'demo-user-123',
        email: 'demo@grc-system.com',
        first_name: 'Demo',
        last_name: 'User',
        role: 'admin',
        tenant_id: 'demo-tenant-123',
        created_at: new Date().toISOString()
      };
      return next();
    }

    // Try to get token from cookies first, then from Authorization header
    let token = req.cookies && req.cookies.accessToken;
    
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details from database
    const { dbQueries } = require('../config/database');
    const userResult = await dbQueries.auth.query(`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        role,
        tenant_id,
        created_at
      FROM users 
      WHERE id = $1
    `, [decoded.id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found or inactive'
      });
    }

    // Add user info to request
    req.user = userResult.rows[0];
    const privilegedEmails = String(process.env.SUPER_ADMIN_EMAILS || 'ahmet@doganconsult.com')
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (privilegedEmails.includes(String(req.user.email || '').toLowerCase())) {
      req.user.role = 'super_admin';
    }
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication token is invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Authentication token has expired'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal authentication error'
    });
  }
};

/**
 * Role-based Access Control Middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // If bypass auth is enabled, allow all roles
    if (process.env.BYPASS_AUTH === 'true') {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    const userRole = req.user.role;
    const hasPermission = Array.isArray(allowedRoles) 
      ? allowedRoles.includes(userRole)
      : allowedRoles === userRole;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${Array.isArray(allowedRoles) ? allowedRoles.join(' or ') : allowedRoles}`,
        userRole
      });
    }

    next();
  };
};

/**
 * Tenant Access Control - Multi-tenant isolation
 */
const requireTenantAccess = (req, res, next) => {
  // If bypass auth is enabled, allow all tenant access
  if (process.env.BYPASS_AUTH === 'true') {
    return next();
  }

  const requestedTenantId = req.params.tenantId || req.body.tenant_id || req.query.tenant_id;
  const userTenantId = req.user.tenant_id;
  const userRole = req.user.role;

  // Super admin can access all tenants
  if (userRole === 'super_admin') {
    return next();
  }

  // Users can only access their own tenant's data
  if (requestedTenantId && requestedTenantId !== userTenantId) {
    return res.status(403).json({
      success: false,
      error: 'Tenant access denied',
      message: 'You can only access data from your own organization',
      userTenant: userTenantId,
      requestedTenant: requestedTenantId
    });
  }

  next();
};

/**
 * Organization Access Control (Legacy - for backward compatibility)
 */
const requireOrganizationAccess = (req, res, next) => {
  // For now, redirect to tenant access control
  return requireTenantAccess(req, res, next);
};

/**
 * Permission-based Access Control
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = userPermissions.includes(permission) || 
                         userPermissions.includes('*') ||
                         req.user.role === 'super_admin';

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: `Required permission: ${permission}`,
        userPermissions
      });
    }

    next();
  };
};

/**
 * Optional Authentication (for public endpoints with enhanced features for authenticated users)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.accessToken;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userResult = await query(`
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          u.organization_id,
          u.permissions,
          u.status
        FROM users u
        WHERE u.id = $1 AND u.status = 'active'
      `, [decoded.id]);

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    next();
  }
};

/**
 * Rate limiting per user
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId).filter(time => time > windowStart);
      userRequests.set(userId, requests);
    } else {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);
    
    if (requests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000)
      });
    }

    requests.push(now);
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireTenantAccess,
  requireOrganizationAccess, // Legacy support
  requirePermission,
  optionalAuth,
  userRateLimit
};