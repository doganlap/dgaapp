const express = require('express');
const { dbQueries } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireRole, requireTenantAccess } = require('../middleware/rbac');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

/**
 * GET /api/tenants
 * Get all tenants (super admin only) or current tenant info
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    let queryText, params = [];

    if (req.user && req.user.role === 'super_admin') {
      // Super admin can see all tenants - simplified query
      queryText = `
        SELECT 
          t.*
        FROM tenants t
        ORDER BY t.created_at DESC
      `;
    } else {
      // Regular users can only see their own tenant
      queryText = `
        SELECT 
          t.*,
          COUNT(u.id) as user_count,
          COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users
        FROM tenants t
        LEFT JOIN users u ON t.id = u.tenant_id
        WHERE t.id = $1
        GROUP BY t.id
      `;
      params = [req.user.tenant_id];
    }

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenants',
      message: error.message
    });
  }
});

/**
 * GET /api/tenants/:id
 * Get specific tenant details
 */
router.get('/:id', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const tenantId = req.params.id;

    const result = await query(`
      SELECT 
        t.*,
        COUNT(u.id) as user_count,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      WHERE t.id = $1
      GROUP BY t.id
    `, [tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant',
      message: error.message
    });
  }
});

/**
 * POST /api/tenants
 * Create new tenant (super admin only)
 */
router.post('/', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const {
      tenant_code,
      name,
      display_name,
      industry,
      sector,
      country = 'Saudi Arabia',
      email,
      phone,
      address,
      subscription_tier = 'basic',
      max_users = 10
    } = req.body;

    // Validation
    if (!tenant_code || !name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Tenant code, name, and email are required'
      });
    }

    // Check if tenant code already exists
    const existingTenant = await query(
      'SELECT id FROM tenants WHERE tenant_code = $1',
      [tenant_code.toLowerCase()]
    );

    if (existingTenant.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Tenant already exists',
        message: 'A tenant with this code already exists'
      });
    }

    const result = await transaction(async (client) => {
      // Create tenant
      const tenantResult = await client.query(`
        INSERT INTO tenants (
          tenant_code, name, display_name, industry, sector, 
          country, email, phone, address, subscription_tier, max_users
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        tenant_code.toLowerCase(),
        name,
        display_name || name,
        industry,
        sector,
        country,
        email,
        phone,
        address,
        subscription_tier,
        max_users
      ]);

      const tenant = tenantResult.rows[0];

      // Create tenant-specific roles (optional)
      await client.query(`
        INSERT INTO roles (name, display_name, description, permissions, tenant_id)
        VALUES 
        ($1, $2, $3, $4, $5),
        ($6, $7, $8, $9, $10)
      `, [
        `${tenant_code}_admin`,
        `${name} Administrator`,
        `Administrator role for ${name}`,
        '["tenant:*"]',
        tenant.id,
        `${tenant_code}_user`,
        `${name} User`,
        `Standard user role for ${name}`,
        '["assessments:read", "assessments:create", "reports:read"]',
        tenant.id
      ]);

      return tenant;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Tenant created successfully'
    });

  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tenant',
      message: error.message
    });
  }
});

/**
 * PUT /api/tenants/:id
 * Update tenant information
 */
router.put('/:id', authenticateToken, requireTenantAccess, requirePermission('tenants:update'), async (req, res) => {
  try {
    const tenantId = req.params.id;
    const {
      name,
      display_name,
      industry,
      sector,
      country,
      email,
      phone,
      address,
      subscription_tier,
      max_users,
      is_active
    } = req.body;

    const result = await query(`
      UPDATE tenants SET
        name = COALESCE($2, name),
        display_name = COALESCE($3, display_name),
        industry = COALESCE($4, industry),
        sector = COALESCE($5, sector),
        country = COALESCE($6, country),
        email = COALESCE($7, email),
        phone = COALESCE($8, phone),
        address = COALESCE($9, address),
        subscription_tier = COALESCE($10, subscription_tier),
        max_users = COALESCE($11, max_users),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      tenantId, name, display_name, industry, sector,
      country, email, phone, address, subscription_tier,
      max_users, is_active
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Tenant updated successfully'
    });

  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tenant',
      message: error.message
    });
  }
});

/**
 * GET /api/tenants/:id/users
 * Get users in a tenant
 */
router.get('/:id/users', authenticateToken, requireTenantAccess, requirePermission('users:read'), async (req, res) => {
  try {
    const tenantId = req.params.id;
    const { page = 1, limit = 10, status, role } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE u.tenant_id = $1';
    let params = [tenantId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND u.status = $${paramCount}`;
      params.push(status);
    }

    if (role) {
      paramCount++;
      whereClause += ` AND u.role = $${paramCount}`;
      params.push(role);
    }

    const result = await query(`
      SELECT 
        u.id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.role,
        u.status,
        u.last_login,
        u.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'name', r.name,
              'display_name', r.display_name
            )
          ) FILTER (WHERE r.id IS NOT NULL), 
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id, u.email, u.username, u.first_name, u.last_name, u.role, u.status, u.last_login, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get tenant users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant users',
      message: error.message
    });
  }
});

/**
 * GET /api/tenants/:id/stats
 * Get tenant statistics
 */
router.get('/:id/stats', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const tenantId = req.params.id;

    const result = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.id END) as active_users,
        COUNT(DISTINCT CASE WHEN u.role IN ('admin', 'tenant_admin') THEN u.id END) as admin_users,
        COUNT(DISTINCT CASE WHEN u.last_login > CURRENT_DATE - INTERVAL '30 days' THEN u.id END) as recent_logins,
        MAX(u.created_at) as last_user_created,
        MAX(u.last_login) as last_login
      FROM users u
      WHERE u.tenant_id = $1
    `, [tenantId]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant statistics',
      message: error.message
    });
  }
});

module.exports = router;
