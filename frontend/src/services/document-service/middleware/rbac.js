// Simple RBAC middleware for document service
const { requireTenantAccess, requirePermission } = require('./auth');

module.exports = {
  requireTenantAccess,
  requirePermission
};

