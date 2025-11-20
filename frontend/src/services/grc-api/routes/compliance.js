const express = require('express');
const { dbQueries } = require('../config/database');
const router = express.Router();

/**
 * GET /api/compliance
 * Get all compliance data with filtering
 */
router.get('/', async (req, res) => {
  try {
    const { framework_id, organization_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (framework_id) {
      paramCount++;
      whereConditions.push(`framework_id = $${paramCount}`);
      queryParams.push(framework_id);
    }

    if (organization_id) {
      paramCount++;
      whereConditions.push(`organization_id = $${paramCount}`);
      queryParams.push(organization_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await dbQueries.compliance.query(`
      SELECT COUNT(*) as total 
      FROM compliance_assessments 
      ${whereClause}
    `, queryParams);

    // Get compliance data with pagination
    queryParams.push(limit, offset);
    const { rows } = await dbQueries.compliance.query(`
      SELECT 
        ca.*,
        f.name as framework_name,
        f.name_ar as framework_name_ar,
        o.name as organization_name
      FROM compliance_assessments ca
      LEFT JOIN grc_frameworks f ON ca.framework_id = f.id
      LEFT JOIN organizations o ON ca.organization_id = o.id
      ${whereClause}
      ORDER BY ca.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching compliance data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch compliance data',
      error: error.message 
    });
  }
});

/**
 * GET /api/compliance/gaps
 * Get compliance gaps
 */
router.get('/gaps', async (req, res) => {
  try {
    const { framework_id, severity, status = 'open' } = req.query;
    
    let whereConditions = [`status = $1`];
    let queryParams = [status];
    let paramCount = 1;

    if (framework_id) {
      paramCount++;
      whereConditions.push(`framework_id = $${paramCount}`);
      queryParams.push(framework_id);
    }

    if (severity) {
      paramCount++;
      whereConditions.push(`severity = $${paramCount}`);
      queryParams.push(severity);
    }

    const whereClause = whereConditions.join(' AND ');

    const { rows } = await dbQueries.compliance.query(`
      SELECT 
        cg.*,
        cc.control_id,
        cc.control_name,
        cc.control_description,
        f.name as framework_name
      FROM compliance_gaps cg
      LEFT JOIN compliance_controls cc ON cg.control_id = cc.id
      LEFT JOIN grc_frameworks f ON cg.framework_id = f.id
      WHERE ${whereClause}
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        cg.created_at DESC
    `, queryParams);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching compliance gaps:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch compliance gaps',
      error: error.message 
    });
  }
});

/**
 * GET /api/compliance/tasks
 * Get compliance tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    const { status, assignee_id, priority } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (status && status !== 'all') {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (assignee_id) {
      paramCount++;
      whereConditions.push(`assignee_id = $${paramCount}`);
      queryParams.push(assignee_id);
    }

    if (priority) {
      paramCount++;
      whereConditions.push(`priority = $${paramCount}`);
      queryParams.push(priority);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const { rows } = await dbQueries.compliance.query(`
      SELECT 
        ct.*,
        u.first_name || ' ' || u.last_name as assignee_name,
        cg.gap_description,
        cc.control_name
      FROM compliance_tasks ct
      LEFT JOIN users u ON ct.assignee_id = u.id
      LEFT JOIN compliance_gaps cg ON ct.gap_id = cg.id
      LEFT JOIN compliance_controls cc ON cg.control_id = cc.id
      ${whereClause}
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        ct.due_date ASC
    `, queryParams);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching compliance tasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch compliance tasks',
      error: error.message 
    });
  }
});

/**
 * GET /api/compliance/score
 * Get overall compliance score
 */
router.get('/score', async (req, res) => {
  try {
    const { organization_id, framework_id } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (organization_id) {
      paramCount++;
      whereConditions.push(`ca.organization_id = $${paramCount}`);
      queryParams.push(organization_id);
    }

    if (framework_id) {
      paramCount++;
      whereConditions.push(`ca.framework_id = $${paramCount}`);
      queryParams.push(framework_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get overall compliance score
    const { rows } = await dbQueries.compliance.query(`
      SELECT 
        AVG(ca.compliance_score) as overall_score,
        COUNT(DISTINCT ca.framework_id) as total_frameworks,
        COUNT(DISTINCT ca.id) as total_assessments,
        SUM(CASE WHEN ca.compliance_score >= 90 THEN 1 ELSE 0 END) as fully_compliant,
        SUM(CASE WHEN ca.compliance_score >= 70 AND ca.compliance_score < 90 THEN 1 ELSE 0 END) as partially_compliant,
        SUM(CASE WHEN ca.compliance_score < 70 THEN 1 ELSE 0 END) as non_compliant
      FROM compliance_assessments ca
      ${whereClause}
    `, queryParams);

    // Get trend data (last 6 months)
    const trendResult = await dbQueries.compliance.query(`
      SELECT 
        DATE_TRUNC('month', ca.assessment_date) as month,
        AVG(ca.compliance_score) as avg_score
      FROM compliance_assessments ca
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} ca.assessment_date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', ca.assessment_date)
      ORDER BY month ASC
    `, queryParams);

    res.json({
      success: true,
      data: {
        overall_score: parseFloat(rows[0].overall_score || 0).toFixed(1),
        total_frameworks: parseInt(rows[0].total_frameworks || 0),
        total_assessments: parseInt(rows[0].total_assessments || 0),
        compliance_breakdown: {
          fully_compliant: parseInt(rows[0].fully_compliant || 0),
          partially_compliant: parseInt(rows[0].partially_compliant || 0),
          non_compliant: parseInt(rows[0].non_compliant || 0)
        },
        trend: trendResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching compliance score:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch compliance score',
      error: error.message 
    });
  }
});

/**
 * POST /api/compliance/assessments
 * Create a new compliance assessment
 */
router.post('/assessments', async (req, res) => {
  try {
    const {
      framework_id,
      organization_id,
      assessment_name,
      assessment_type,
      assessor_id
    } = req.body;

    const { rows } = await dbQueries.compliance.query(`
      INSERT INTO compliance_assessments (
        framework_id,
        organization_id,
        assessment_name,
        assessment_type,
        assessor_id,
        status,
        assessment_date,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'in_progress', NOW(), NOW(), NOW())
      RETURNING *
    `, [framework_id, organization_id, assessment_name, assessment_type, assessor_id]);

    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error creating compliance assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create compliance assessment',
      error: error.message 
    });
  }
});

/**
 * PUT /api/compliance/assessments/:id
 * Update compliance assessment
 */
router.put('/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      compliance_score,
      status,
      findings,
      recommendations
    } = req.body;

    const { rows } = await dbQueries.compliance.query(`
      UPDATE compliance_assessments
      SET 
        compliance_score = COALESCE($1, compliance_score),
        status = COALESCE($2, status),
        findings = COALESCE($3, findings),
        recommendations = COALESCE($4, recommendations),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [compliance_score, status, findings, recommendations, id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error updating compliance assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update compliance assessment',
      error: error.message 
    });
  }
});

module.exports = router;
