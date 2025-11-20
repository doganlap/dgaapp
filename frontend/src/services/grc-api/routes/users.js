const express = require('express');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

/**
 * GET /api/users
 * Get all users with tenant filtering
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'x-tenant-id header is required'
      });
    }

    const {
      page = 1,
      limit = 10,
      role,
      status,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build WHERE clause dynamically - ALWAYS include tenant filter
    let whereConditions = ['tenant_id = $1'];
    let queryParams = [tenantId];
    let paramCount = 1;

    if (role) {
      paramCount++;
      whereConditions.push(`role = $${paramCount}`);
      queryParams.push(role);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users
      WHERE ${whereClause}
    `, queryParams);

    // Get users with pagination (don't expose sensitive fields)
    queryParams.push(limit, offset);
    const usersResult = await query(`
      SELECT 
        id, first_name, last_name, email, role, status, phone, 
        organization_id, department, position, language, timezone,
        is_active, created_at, updated_at
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: usersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID with tenant filtering
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'x-tenant-id header is required'
      });
    }

    // Get user details with tenant filtering (exclude password)
    const userResult = await query(`
      SELECT 
        id, first_name, last_name, email, role, status, phone,
        organization_id, department, position, language, timezone,
        is_active, created_at, updated_at
      FROM users 
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    res.json({
      success: true,
      data: userResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'x-tenant-id header is required'
      });
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      role = 'user',
      organization_id,
      department,
      position,
      language = 'en',
      timezone = 'UTC'
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'first_name, last_name, and email are required'
      });
    }

    // Check if email already exists in this tenant
    const existingUser = await query(`
      SELECT id FROM users WHERE email = $1 AND tenant_id = $2
    `, [email, tenantId]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
        message: 'A user with this email already exists'
      });
    }

    const id = uuidv4();
    
    const result = await query(`
      INSERT INTO users (
        id, tenant_id, first_name, last_name, email, phone, role,
        organization_id, department, position, language, timezone,
        status, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, first_name, last_name, email, role, status, phone,
                  organization_id, department, position, language, timezone,
                  is_active, created_at
    `, [
      id, tenantId, first_name, last_name, email, phone, role,
      organization_id, department, position, language, timezone
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});

/**
 * PUT /api/users/:id
 * Update a user
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'x-tenant-id header is required'
      });
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      role,
      organization_id,
      department,
      position,
      language,
      timezone,
      status,
      is_active
    } = req.body;

    const result = await query(`
      UPDATE users SET
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        role = COALESCE($7, role),
        organization_id = COALESCE($8, organization_id),
        department = COALESCE($9, department),
        position = COALESCE($10, position),
        language = COALESCE($11, language),
        timezone = COALESCE($12, timezone),
        status = COALESCE($13, status),
        is_active = COALESCE($14, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, first_name, last_name, email, role, status, phone,
                organization_id, department, position, language, timezone,
                is_active, updated_at
    `, [
      id, tenantId, first_name, last_name, email, phone, role,
      organization_id, department, position, language, timezone,
      status, is_active
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * Soft delete a user
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'x-tenant-id header is required'
      });
    }

    const result = await query(`
      UPDATE users 
      SET is_active = false, status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, first_name, last_name, email
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('❌ Error deactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user',
      message: error.message
    });
  }
});

module.exports = router;