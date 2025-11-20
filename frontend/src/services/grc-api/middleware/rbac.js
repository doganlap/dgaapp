const { query } = require('../config/database');

/**
 * Enhanced Role-Based Access Control Middleware
 */

/**
 * Check if user has specific permission
 */
const hasPermission = async (userId, permission) => {
  try {
    const result = await query(
      'SELECT user_has_permission($1, $2) as has_permission',
      [userId, permission]
    );
    return result.rows[0]?.has_permission || false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

/**
 * Get user's effective permissions
 */
const getUserPermissions = async (userId) => {
  try {
    const result = await query(`
      SELECT DISTINCT 
        jsonb_array_elements_text(r.permissions) as permission
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    `, [userId]);
    
    return result.rows.map(row => row.permission);
  } catch (error) {
    console.error('Get permissions error:', error);
    return [];
  }
};

/**
 * Get user's roles within their tenant
 */
const getUserRoles = async (userId, tenantId = null) => {
  try {
    let queryText = `
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.permissions,
        ur.assigned_at,
        ur.expires_at,
        ur.is_active
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    `;
    
    const params = [userId];
    
    if (tenantId) {
      queryText += ' AND (r.tenant_id = $2 OR r.is_system_role = true)';
      params.push(tenantId);
    }
    
    queryText += ' ORDER BY r.name';
    
    const result = await query(queryText, params);
    return result.rows;
  } catch (error) {
    console.error('Get roles error:', error);
    return [];
  }
};

/**
 * Middleware to require specific permission
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    // Super admin has all permissions
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user has the required permission
    const hasRequiredPermission = await hasPermission(req.user.id, permission);
    
    if (!hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: `Required permission: ${permission}`,
        userRole: req.user.role,
        userId: req.user.id
      });
    }

    next();
  };
};

/**
 * Middleware to require any of the specified permissions
 */
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Super admin has all permissions
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user has any of the required permissions
    for (const permission of permissions) {
      const hasRequiredPermission = await hasPermission(req.user.id, permission);
      if (hasRequiredPermission) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Permission denied',
      message: `Required one of: ${permissions.join(', ')}`,
      userRole: req.user.role
    });
  };
};

/**
 * Middleware to require specific role
 */
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // Get user's current roles
    const userRoles = await getUserRoles(req.user.id, req.user.tenant_id);
    const userRoleNames = userRoles.map(role => role.name);
    
    // Check if user has any of the required roles
    const hasRequiredRole = roles.some(role => userRoleNames.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        error: 'Role access denied',
        message: `Required role: ${roles.join(' or ')}`,
        userRoles: userRoleNames
      });
    }

    next();
  };
};

/**
 * Middleware to ensure tenant isolation
 */
const requireTenantAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Super admin can access all tenants
  if (req.user.role === 'super_admin') {
    return next();
  }

  const requestedTenantId = req.params.tenantId || req.body.tenant_id || req.query.tenant_id;
  const userTenantId = req.user.tenant_id;

  // If a specific tenant is requested, ensure user belongs to that tenant
  if (requestedTenantId && requestedTenantId !== userTenantId) {
    return res.status(403).json({
      success: false,
      error: 'Tenant access denied',
      message: 'You can only access data from your own organization',
      userTenant: userTenantId,
      requestedTenant: requestedTenantId
    });
  }

  // Add user's tenant ID to request for automatic filtering
  req.tenantId = userTenantId;
  
  next();
};

/**
 * Middleware to check resource ownership within tenant
 */
const requireResourceOwnership = (resourceTable, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Super admin can access all resources
    if (req.user.role === 'super_admin') {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        error: 'Resource ID required'
      });
    }

    try {
      // Check if resource belongs to user's tenant
      const result = await query(`
        SELECT tenant_id, created_by 
        FROM ${resourceTable} 
        WHERE id = $1
      `, [resourceId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      const resource = result.rows[0];
      
      // Check tenant access
      if (resource.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({
          success: false,
          error: 'Resource access denied',
          message: 'Resource belongs to different organization'
        });
      }

      // Add resource info to request
      req.resource = resource;
      next();

    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Access check failed'
      });
    }
  };
};

module.exports = {
  hasPermission,
  getUserPermissions,
  getUserRoles,
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireTenantAccess,
  requireResourceOwnership
};
