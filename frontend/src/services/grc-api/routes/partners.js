const express = require('express');
const { query, transaction } = require('../config/database');
const Joi = require('joi');
const router = express.Router();

// Validation schemas
const partnerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  company_name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[\+]?[0-9\-\(\)\s]+$/).optional(),
  website: Joi.string().uri().optional(),
  industry: Joi.string().max(100).optional(),
  country: Joi.string().max(100).optional(),
  city: Joi.string().max(100).optional(),
  address: Joi.string().max(500).optional(),
  partnership_type: Joi.string().valid(
    'technology', 'consulting', 'implementation', 'reseller',
    'vendor', 'regulatory_advisor', 'audit_firm', 'compliance_specialist'
  ).required(),
  status: Joi.string().valid('active', 'inactive', 'pending', 'suspended').default('pending'),
  risk_level: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  compliance_requirements: Joi.array().items(Joi.string()).optional(),
  certifications: Joi.array().items(Joi.string()).optional(),
  contract_start_date: Joi.date().optional(),
  contract_end_date: Joi.date().optional(),
  annual_revenue: Joi.number().positive().optional(),
  contact_person: Joi.string().max(255).optional(),
  notes: Joi.string().max(2000).optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

const partnerUpdateSchema = partnerSchema.fork(
  ['name', 'company_name', 'email', 'partnership_type'],
  (schema) => schema.optional()
);

/**
 * GET /api/partners
 * Get all partners with filtering, searching, and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      partnership_type,
      risk_level,
      industry,
      country,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Search functionality
    if (search) {
      paramCount++;
      whereConditions.push(`(
        LOWER(p.name) LIKE LOWER($${paramCount}) OR
        LOWER(p.company_name) LIKE LOWER($${paramCount}) OR
        LOWER(p.email) LIKE LOWER($${paramCount})
      )`);
      queryParams.push(`%${search}%`);
    }

    // Filters
    if (status) {
      paramCount++;
      whereConditions.push(`p.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (partnership_type) {
      paramCount++;
      whereConditions.push(`p.partnership_type = $${paramCount}`);
      queryParams.push(partnership_type);
    }

    if (risk_level) {
      paramCount++;
      whereConditions.push(`p.risk_level = $${paramCount}`);
      queryParams.push(risk_level);
    }

    if (industry) {
      paramCount++;
      whereConditions.push(`LOWER(p.industry) = LOWER($${paramCount})`);
      queryParams.push(industry);
    }

    if (country) {
      paramCount++;
      whereConditions.push(`LOWER(p.country) = LOWER($${paramCount})`);
      queryParams.push(country);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort parameters
    const allowedSortFields = ['name', 'company_name', 'created_at', 'status', 'partnership_type', 'risk_level'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM partners p
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get partners with pagination
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const partnersQuery = `
      SELECT
        p.*,
        (
          SELECT COUNT(*)
          FROM partner_assessments pa
          WHERE pa.partner_id = p.id AND pa.status = 'completed'
        ) as completed_assessments,
        (
          SELECT COUNT(*)
          FROM partner_documents pd
          WHERE pd.partner_id = p.id
        ) as document_count
      FROM partners p
      ${whereClause}
      ORDER BY p.${sortField} ${sortDirection}
      LIMIT $${paramCount-1} OFFSET $${paramCount}
    `;

    const result = await query(partnersQuery, queryParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners',
      message: error.message
    });
  }
});

/**
 * GET /api/partners/:id
 * Get partner by ID with detailed information
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        p.*,
        (
          SELECT COUNT(*)
          FROM partner_assessments pa
          WHERE pa.partner_id = p.id
        ) as total_assessments,
        (
          SELECT COUNT(*)
          FROM partner_assessments pa
          WHERE pa.partner_id = p.id AND pa.status = 'completed'
        ) as completed_assessments,
        (
          SELECT COUNT(*)
          FROM partner_documents pd
          WHERE pd.partner_id = p.id
        ) as document_count,
        (
          SELECT AVG(pa.score)::numeric(5,2)
          FROM partner_assessments pa
          WHERE pa.partner_id = p.id AND pa.status = 'completed'
        ) as average_score
      FROM partners p
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const partner = result.rows[0];

    // Get recent assessments
    const assessments = await query(`
      SELECT pa.*, at.name as template_name
      FROM partner_assessments pa
      LEFT JOIN assessment_templates at ON pa.template_id = at.id
      WHERE pa.partner_id = $1
      ORDER BY pa.created_at DESC
      LIMIT 5
    `, [id]);

    partner.recent_assessments = assessments.rows;

    res.json({
      success: true,
      data: partner
    });

  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partner',
      message: error.message
    });
  }
});

/**
 * POST /api/partners
 * Create new partner
 */
router.post('/', async (req, res) => {
  try {
    const { error, value } = partnerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const {
      name, company_name, email, phone, website, industry, country, city, address,
      partnership_type, status, risk_level, compliance_requirements, certifications,
      contract_start_date, contract_end_date, annual_revenue, contact_person, notes, tags
    } = value;

    // Check for duplicate email
    const existingPartner = await query('SELECT id FROM partners WHERE email = $1', [email]);
    if (existingPartner.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Partner with this email already exists'
      });
    }

    const result = await query(`
      INSERT INTO partners (
        name, company_name, email, phone, website, industry, country, city, address,
        partnership_type, status, risk_level, compliance_requirements, certifications,
        contract_start_date, contract_end_date, annual_revenue, contact_person, notes, tags,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        NOW(), NOW()
      ) RETURNING *
    `, [
      name, company_name, email, phone, website, industry, country, city, address,
      partnership_type, status, risk_level,
      compliance_requirements ? JSON.stringify(compliance_requirements) : null,
      certifications ? JSON.stringify(certifications) : null,
      contract_start_date, contract_end_date, annual_revenue, contact_person, notes,
      tags ? JSON.stringify(tags) : null
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Partner created successfully'
    });

  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create partner',
      message: error.message
    });
  }
});

/**
 * PUT /api/partners/:id
 * Update partner
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = partnerUpdateSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    // Check if partner exists
    const existingPartner = await query('SELECT id FROM partners WHERE id = $1', [id]);
    if (existingPartner.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        paramCount++;
        if (['compliance_requirements', 'certifications', 'tags'].includes(key)) {
          updates.push(`${key} = $${paramCount}`);
          params.push(JSON.stringify(val));
        } else {
          updates.push(`${key} = $${paramCount}`);
          params.push(val);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    params.push(id);

    const updateQuery = `
      UPDATE partners
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, params);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Partner updated successfully'
    });

  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update partner',
      message: error.message
    });
  }
});

/**
 * DELETE /api/partners/:id
 * Delete partner (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE partners SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      ['inactive', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    res.json({
      success: true,
      message: 'Partner deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete partner',
      message: error.message
    });
  }
});

/**
 * GET /api/partners/analytics/dashboard
 * Partner analytics dashboard data
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const analytics = await transaction(async (client) => {
      // Partner counts by status
      const statusCounts = await client.query(`
        SELECT status, COUNT(*) as count
        FROM partners
        GROUP BY status
      `);

      // Partner counts by type
      const typeCounts = await client.query(`
        SELECT partnership_type, COUNT(*) as count
        FROM partners
        GROUP BY partnership_type
        ORDER BY count DESC
      `);

      // Risk distribution
      const riskDistribution = await client.query(`
        SELECT risk_level, COUNT(*) as count
        FROM partners
        GROUP BY risk_level
      `);

      // Recent activities
      const recentActivities = await client.query(`
        SELECT
          p.name,
          p.company_name,
          'partner_created' as activity_type,
          p.created_at as activity_date
        FROM partners p
        WHERE p.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY p.created_at DESC
        LIMIT 10
      `);

      // Compliance metrics
      const complianceMetrics = await client.query(`
        SELECT
          COUNT(*) as total_partners,
          COUNT(CASE WHEN contract_end_date > NOW() THEN 1 END) as active_contracts,
          COUNT(CASE WHEN contract_end_date <= NOW() + INTERVAL '30 days' THEN 1 END) as expiring_soon
        FROM partners
        WHERE status = 'active'
      `);

      return {
        statusCounts: statusCounts.rows,
        typeCounts: typeCounts.rows,
        riskDistribution: riskDistribution.rows,
        recentActivities: recentActivities.rows,
        complianceMetrics: complianceMetrics.rows[0]
      };
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching partner analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partner analytics',
      message: error.message
    });
  }
});

/**
 * POST /api/partners/:id/assessments
 * Create assessment for partner
 */
router.post('/:id/assessments', async (req, res) => {
  try {
    const { id } = req.params;
    const { template_id, name, description, due_date } = req.body;

    // Verify partner exists
    const partner = await query('SELECT id FROM partners WHERE id = $1', [id]);
    if (partner.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const result = await query(`
      INSERT INTO partner_assessments (
        partner_id, template_id, name, description, due_date, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'draft', NOW(), NOW())
      RETURNING *
    `, [id, template_id, name, description, due_date]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Partner assessment created successfully'
    });

  } catch (error) {
    console.error('Error creating partner assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create partner assessment',
      message: error.message
    });
  }
});

module.exports = router;
