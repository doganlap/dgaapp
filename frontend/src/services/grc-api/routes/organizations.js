const express = require('express');
const { dbQueries, query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

/**
 * GET /api/organizations
 * Get all organizations with tenant filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    // Get tenant ID from header
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
      sector,
      country,
      search,
      is_active = true
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically - ALWAYS include tenant filter
    let whereConditions = ['tenant_id = $1', 'is_active = $2'];
    let queryParams = [tenantId, is_active];
    let paramCount = 2;

    if (sector) {
      paramCount++;
      whereConditions.push(`sector = $${paramCount}`);
      queryParams.push(sector);
    }

    if (country) {
      paramCount++;
      whereConditions.push(`country = $${paramCount}`);
      queryParams.push(country);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(name ILIKE $${paramCount} OR name_ar ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await dbQueries.finance.query(`
      SELECT COUNT(*) as total
      FROM organizations
      WHERE ${whereClause}
    `, queryParams);

    // Get organizations with pagination
    queryParams.push(limit, offset);
    const organizationsResult = await dbQueries.finance.query(`
      SELECT
        id, name, status, is_active, created_at, updated_at
      FROM organizations
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: organizationsResult.rows,
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
    res.status(500).json({ success: false, error: 'Failed to fetch organizations' });
  }
});

/**
 * GET /api/organizations/:id
 * Get organization by ID with tenant filtering
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

    // Get organization details with tenant filtering
    const orgResult = await query(`
      SELECT * FROM organizations
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `, [id, tenantId]);

    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
        message: 'The requested organization does not exist or has been deactivated'
      });
    }

    res.json({
      success: true,
      data: orgResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization',
      message: error.message
    });
  }
});

/**
 * POST /api/organizations
 * Create a new organization
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
      name,
      name_ar,
      code,
      type,
      sector,
      industry,
      size,
      country,
      city,
      address,
      phone,
      email,
      website,
      description
    } = req.body;

    // Validate required fields
    if (!name || !industry) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Missing required field: industry'
      });
    }

    const id = uuidv4();

    const result = await query(`
      INSERT INTO organizations (
        id, tenant_id, name, name_ar, code, type, sector, industry, size,
        country, city, address, phone, email, website, description, is_active,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      id, tenantId, name, name_ar, code, type, sector, industry, size,
      country, city, address, phone, email, website, description
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Organization created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organization',
      message: error.message
    });
  }
});

/**
 * PUT /api/organizations/:id
 * Update an organization
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
      name,
      name_ar,
      code,
      type,
      sector,
      industry,
      size,
      country,
      city,
      address,
      phone,
      email,
      website,
      description,
      is_active
    } = req.body;

    const result = await query(`
      UPDATE organizations SET
        name = COALESCE($3, name),
        name_ar = COALESCE($4, name_ar),
        code = COALESCE($5, code),
        type = COALESCE($6, type),
        sector = COALESCE($7, sector),
        industry = COALESCE($8, industry),
        size = COALESCE($9, size),
        country = COALESCE($10, country),
        city = COALESCE($11, city),
        address = COALESCE($12, address),
        phone = COALESCE($13, phone),
        email = COALESCE($14, email),
        website = COALESCE($15, website),
        description = COALESCE($16, description),
        is_active = COALESCE($17, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [
      id, tenantId, name, name_ar, code, type, sector, industry, size,
      country, city, address, phone, email, website, description, is_active
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
        message: 'The requested organization does not exist'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Organization updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization',
      message: error.message
    });
  }
});

/**
 * DELETE /api/organizations/:id
 * Soft delete an organization
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
      UPDATE organizations
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, name
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
        message: 'The requested organization does not exist'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Organization deactivated successfully'
    });

  } catch (error) {
    console.error('❌ Error deactivating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate organization',
      message: error.message
    });
  }
});

module.exports = router;

/**
 * POST /api/organizations/seed
 * Seed demo organizations for the current tenant
 */
router.post('/seed', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const orgs = [
      { name: 'Alpha Bank KSA', sector: 'banking', industry: 'financial_services', country: 'SA', city: 'Riyadh' },
      { name: 'Nexus Tech', sector: 'technology', industry: 'software', country: 'SA', city: 'Jeddah' },
      { name: 'Telecom United', sector: 'telecommunications', industry: 'telecom', country: 'SA', city: 'Dammam' },
    ];

    for (const o of orgs) {
      const existing = await query('SELECT id FROM organizations WHERE name = $1 AND tenant_id = $2', [o.name, tenantId]);
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO organizations (id, tenant_id, name, sector, industry, country, city, is_active, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [tenantId, o.name, o.sector, o.industry, o.country, o.city]
        );
      }
    }

    res.json({ success: true, message: 'Organizations seed completed' });
  } catch (error) {
    console.error('❌ Error seeding organizations:', error);
    res.status(500).json({ success: false, error: 'Seed failed', message: error.message });
  }
});
