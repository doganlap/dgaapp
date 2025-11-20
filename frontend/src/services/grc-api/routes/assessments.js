const express = require('express');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

/**
 * GET /api/assessments
 * Get all assessments with tenant filtering
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
      organization_id,
      status,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically - ALWAYS include tenant filter
    let whereConditions = ['a.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramCount = 1;

    if (organization_id) {
      paramCount++;
      whereConditions.push(`a.organization_id = $${paramCount}`);
      queryParams.push(organization_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`a.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`a.title ILIKE $${paramCount}`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM assessments a
      WHERE ${whereClause}
    `, queryParams);

    // Get assessments with pagination
    queryParams.push(limit, offset);
    const result = await query(`
      SELECT
        a.*,
        o.name as organization_name,
        o.industry as organization_industry
      FROM assessments a
      LEFT JOIN organizations o ON a.organization_id = o.id AND o.tenant_id = a.tenant_id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: result.rows,
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
    console.error('❌ Error fetching assessments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessments',
      message: error.message
    });
  }
});

/**
 * GET /api/assessments/:id
 * Get assessment by ID with tenant filtering
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

    // Get assessment details with tenant filtering
    const result = await query(`
      SELECT
        a.*,
        o.name as organization_name,
        o.industry as organization_industry
      FROM assessments a
      LEFT JOIN organizations o ON a.organization_id = o.id AND o.tenant_id = a.tenant_id
      WHERE a.id = $1 AND a.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
        message: 'The requested assessment does not exist'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessment',
      message: error.message
    });
  }
});

/**
 * POST /api/assessments
 * Create a new assessment
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
      title,
      description,
      organization_id,
      framework_id,
      assessment_type = 'compliance',
      scope,
      objectives,
      methodology
    } = req.body;

    // Validate required fields
    if (!title || !organization_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'title and organization_id are required'
      });
    }

    // Verify organization exists and belongs to tenant
    const orgCheck = await query(`
      SELECT id FROM organizations
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `, [organization_id, tenantId]);

    if (orgCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid organization',
        message: 'Organization not found or not accessible'
      });
    }

    const id = uuidv4();

    const result = await query(`
      INSERT INTO assessments (
        id, tenant_id, title, description, organization_id, framework_id,
        assessment_type, scope, objectives, methodology, status, is_active,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      id, tenantId, title, description, organization_id, framework_id,
      assessment_type, scope, objectives, methodology
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Assessment created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assessment',
      message: error.message
    });
  }
});

/**
 * PUT /api/assessments/:id
 * Update an assessment
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
      title,
      description,
      organization_id,
      framework_id,
      assessment_type,
      scope,
      objectives,
      methodology,
      status,
      is_active
    } = req.body;

    const result = await query(`
      UPDATE assessments SET
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        organization_id = COALESCE($5, organization_id),
        framework_id = COALESCE($6, framework_id),
        assessment_type = COALESCE($7, assessment_type),
        scope = COALESCE($8, scope),
        objectives = COALESCE($9, objectives),
        methodology = COALESCE($10, methodology),
        status = COALESCE($11, status),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [
      id, tenantId, title, description, organization_id, framework_id,
      assessment_type, scope, objectives, methodology, status, is_active
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
        message: 'The requested assessment does not exist'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Assessment updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update assessment',
      message: error.message
    });
  }
});

/**
 * DELETE /api/assessments/:id
 * Soft delete an assessment
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
      UPDATE assessments
      SET is_active = false, status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, title
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found',
        message: 'The requested assessment does not exist'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Assessment deactivated successfully'
    });

  } catch (error) {
    console.error('❌ Error deactivating assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate assessment',
      message: error.message
    });
  }
});

module.exports = router;
