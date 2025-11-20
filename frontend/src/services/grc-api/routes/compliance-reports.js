const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireRole, requireOrganizationAccess } = require('../middleware/auth');
const { validateRequest, validateParams, uuidSchema } = require('../middleware/validation');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const router = express.Router();

// Validation schemas
const reportGenerationSchema = Joi.object({
  assessment_id: Joi.string().uuid().required(),
  report_type: Joi.string().valid('executive_summary', 'detailed', 'compliance_matrix', 'gap_analysis', 'remediation_plan').required(),
  include_evidence: Joi.boolean().default(false),
  include_recommendations: Joi.boolean().default(true),
  format: Joi.string().valid('pdf', 'html', 'excel', 'json').default('pdf'),
  template_id: Joi.string().uuid().optional(),
  custom_sections: Joi.array().items(Joi.string()).optional(),
  filters: Joi.object({
    criticality_levels: Joi.array().items(Joi.string().valid('critical', 'high', 'medium', 'low')).optional(),
    compliance_status: Joi.array().items(Joi.string().valid('compliant', 'partially_compliant', 'non_compliant')).optional(),
    frameworks: Joi.array().items(Joi.string().uuid()).optional(),
    controls: Joi.array().items(Joi.string().uuid()).optional()
  }).optional()
});

/**
 * GET /api/compliance-reports
 * Get all compliance reports
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { organization_id, status, report_type, page = 1, limit = 50 } = req.query;
    
    let whereConditions = ['cr.is_active = true'];
    let queryParams = [];
    let paramCount = 0;

    // Organization filter (non-super admins see only their org)
    if (req.user.role !== 'super_admin') {
      paramCount++;
      whereConditions.push(`a.organization_id = $${paramCount}`);
      queryParams.push(req.user.organization_id);
    } else if (organization_id) {
      paramCount++;
      whereConditions.push(`a.organization_id = $${paramCount}`);
      queryParams.push(organization_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`cr.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (report_type) {
      paramCount++;
      whereConditions.push(`cr.report_type = $${paramCount}`);
      queryParams.push(report_type);
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await query(`
      SELECT 
        cr.id,
        cr.assessment_id,
        cr.report_type,
        cr.status,
        cr.format,
        cr.file_path,
        cr.file_size,
        cr.generated_at,
        cr.submitted_at,
        cr.approved_at,
        cr.created_at,
        a.name as assessment_name,
        o.name as organization_name,
        generator.first_name || ' ' || generator.last_name as generated_by_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM compliance_reports cr
      JOIN assessments a ON cr.assessment_id = a.id
      JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN users generator ON cr.generated_by = generator.id
      LEFT JOIN users approver ON cr.approved_by = approver.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY cr.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM compliance_reports cr
      JOIN assessments a ON cr.assessment_id = a.id
      WHERE ${whereConditions.join(' AND ')}
    `, queryParams.slice(0, paramCount));

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching compliance reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance reports',
      message: error.message
    });
  }
});

/**
 * GET /api/compliance-reports/:id
 * Get compliance report by ID
 */
router.get('/:id', authenticateToken, validateParams(Joi.object({ id: uuidSchema })), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        cr.*,
        a.name as assessment_name,
        a.status as assessment_status,
        o.name as organization_name,
        generator.first_name || ' ' || generator.last_name as generated_by_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name,
        submitter.first_name || ' ' || submitter.last_name as submitted_by_name
      FROM compliance_reports cr
      JOIN assessments a ON cr.assessment_id = a.id
      JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN users generator ON cr.generated_by = generator.id
      LEFT JOIN users approver ON cr.approved_by = approver.id
      LEFT JOIN users submitter ON cr.submitted_by = submitter.id
      WHERE cr.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Compliance report not found'
      });
    }

    const report = result.rows[0];

    // Check access permissions
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      if (report.organization_id !== req.user.organization_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only view reports from your organization'
        });
      }
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error fetching compliance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance report',
      message: error.message
    });
  }
});

/**
 * POST /api/compliance-reports/generate
 * Generate new compliance report
 */
router.post('/generate',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager', 'assessor']),
  validateRequest(reportGenerationSchema),
  async (req, res) => {
    try {
      const {
        assessment_id,
        report_type,
        include_evidence,
        include_recommendations,
        format,
        template_id,
        custom_sections,
        filters
      } = req.body;

      await transaction(async (client) => {
        // Verify assessment exists and user has access
        const assessmentResult = await client.query(`
          SELECT a.*, o.name as organization_name
          FROM assessments a
          JOIN organizations o ON a.organization_id = o.id
          WHERE a.id = $1
        `, [assessment_id]);

        if (assessmentResult.rows.length === 0) {
          throw new Error('Assessment not found');
        }

        const assessment = assessmentResult.rows[0];

        // Check organization access
        if (req.user.role !== 'super_admin' && assessment.organization_id !== req.user.organization_id) {
          throw new Error('Access denied');
        }

        // Generate report data
        const reportData = await generateReportData(client, assessment_id, report_type, filters);

        // Create report record
        const reportId = uuidv4();
        const reportResult = await client.query(`
          INSERT INTO compliance_reports (
            id, assessment_id, report_type, status, format, 
            include_evidence, include_recommendations, template_id,
            custom_sections, filters, report_data, generated_by, 
            generated_at, created_at, updated_at
          ) VALUES ($1, $2, $3, 'generating', $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `, [
          reportId,
          assessment_id,
          report_type,
          format,
          include_evidence,
          include_recommendations,
          template_id,
          JSON.stringify(custom_sections || []),
          JSON.stringify(filters || {}),
          JSON.stringify(reportData),
          req.user.id
        ]);

        // In a real implementation, you would queue this for background processing
        // For now, we'll simulate immediate generation
        setTimeout(async () => {
          try {
            const filePath = await generateReportFile(reportData, format, report_type);
            const fileSize = await getFileSize(filePath);

            await query(`
              UPDATE compliance_reports 
              SET status = 'generated', file_path = $1, file_size = $2, updated_at = CURRENT_TIMESTAMP
              WHERE id = $3
            `, [filePath, fileSize, reportId]);
          } catch (error) {
            console.error('Error generating report file:', error);
            await query(`
              UPDATE compliance_reports 
              SET status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [error.message, reportId]);
          }
        }, 1000);

        res.status(201).json({
          success: true,
          message: 'Report generation started',
          data: {
            id: reportId,
            status: 'generating',
            estimated_completion: new Date(Date.now() + 30000) // 30 seconds estimate
          }
        });
      });

    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate compliance report',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/compliance-reports/:id/submit
 * Submit compliance report
 */
router.post('/:id/submit',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager']),
  validateParams(Joi.object({ id: uuidSchema })),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await query(`
        UPDATE compliance_reports cr
        SET 
          status = 'submitted',
          submitted_by = $1,
          submitted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        FROM assessments a
        WHERE cr.id = $2 
          AND cr.assessment_id = a.id
          AND cr.status = 'generated'
          AND ($3 = 'super_admin' OR a.organization_id = $4)
        RETURNING cr.id, cr.status
      `, [req.user.id, id, req.user.role, req.user.organization_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Report not found or cannot be submitted',
          message: 'Report must be in generated status to submit'
        });
      }

      res.json({
        success: true,
        message: 'Report submitted successfully',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error submitting compliance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit compliance report',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/compliance-reports/:id/approve
 * Approve compliance report
 */
router.post('/:id/approve',
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  validateParams(Joi.object({ id: uuidSchema })),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comment } = req.body;

      const result = await query(`
        UPDATE compliance_reports cr
        SET 
          status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          approval_comment = $2,
          updated_at = CURRENT_TIMESTAMP
        FROM assessments a
        WHERE cr.id = $3 
          AND cr.assessment_id = a.id
          AND cr.status = 'submitted'
          AND ($4 = 'super_admin' OR a.organization_id = $5)
        RETURNING cr.id, cr.status
      `, [req.user.id, comment, id, req.user.role, req.user.organization_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Report not found or cannot be approved',
          message: 'Report must be in submitted status to approve'
        });
      }

      res.json({
        success: true,
        message: 'Report approved successfully',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error approving compliance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve compliance report',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/compliance-reports/:id/export
 * Export compliance report
 */
router.get('/:id/export',
  authenticateToken,
  validateParams(Joi.object({ id: uuidSchema })),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { format } = req.query;

      const result = await query(`
        SELECT cr.*, a.organization_id
        FROM compliance_reports cr
        JOIN assessments a ON cr.assessment_id = a.id
        WHERE cr.id = $1 AND cr.status IN ('generated', 'submitted', 'approved')
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Report not found or not ready for export'
        });
      }

      const report = result.rows[0];

      // Check access permissions
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        if (report.organization_id !== req.user.organization_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }

      // Check if file exists
      const fs = require('fs');
      if (!report.file_path || !fs.existsSync(report.file_path)) {
        return res.status(404).json({
          success: false,
          error: 'Report file not found',
          message: 'The report file may have been deleted or moved'
        });
      }

      // Set appropriate headers
      const filename = `compliance_report_${report.report_type}_${new Date().toISOString().split('T')[0]}.${report.format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', getContentType(report.format));

      // Stream the file
      const fileStream = fs.createReadStream(report.file_path);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error exporting compliance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export compliance report',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/compliance-metrics/:orgId
 * Get compliance metrics for organization
 */
router.get('/metrics/:orgId',
  authenticateToken,
  validateParams(Joi.object({ orgId: uuidSchema })),
  async (req, res) => {
    try {
      const { orgId } = req.params;

      // Check access permissions
      if (req.user.role !== 'super_admin' && req.user.organization_id !== orgId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get compliance metrics
      const metricsResult = await query(`
        SELECT 
          COUNT(DISTINCT a.id) as total_assessments,
          COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_assessments,
          COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as approved_assessments,
          AVG(CASE WHEN a.status IN ('completed', 'approved') THEN calculate_compliance_score(a.id) END) as avg_compliance_score,
          AVG(CASE WHEN a.status IN ('completed', 'approved') THEN calculate_weighted_compliance_score(a.id) END) as avg_weighted_score,
          COUNT(DISTINCT cr.id) as total_reports,
          COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.id END) as approved_reports
        FROM assessments a
        LEFT JOIN compliance_reports cr ON a.id = cr.assessment_id
        WHERE a.organization_id = $1
      `, [orgId]);

      // Get framework compliance breakdown
      const frameworkMetrics = await query(`
        SELECT 
          f.name as framework_name,
          f.framework_code,
          COUNT(DISTINCT ar.control_id) as total_controls,
          COUNT(CASE WHEN ar.response_value = 'compliant' THEN 1 END) as compliant_controls,
          COUNT(CASE WHEN ar.response_value = 'partially_compliant' THEN 1 END) as partial_controls,
          COUNT(CASE WHEN ar.response_value = 'non_compliant' THEN 1 END) as non_compliant_controls,
          ROUND(
            COUNT(CASE WHEN ar.response_value = 'compliant' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN ar.response_value != 'not_applicable' THEN 1 END), 0), 2
          ) as compliance_percentage
        FROM assessments a
        JOIN assessment_responses ar ON a.id = ar.assessment_id
        JOIN grc_controls c ON ar.control_id = c.id
        JOIN grc_frameworks f ON c.framework_id = f.id
        WHERE a.organization_id = $1 AND a.status IN ('completed', 'approved')
        GROUP BY f.id, f.name, f.framework_code
        ORDER BY compliance_percentage DESC
      `, [orgId]);

      // Get trend data (last 12 months)
      const trendData = await query(`
        SELECT 
          DATE_TRUNC('month', a.updated_at) as month,
          AVG(calculate_compliance_score(a.id)) as avg_score,
          COUNT(a.id) as assessment_count
        FROM assessments a
        WHERE a.organization_id = $1 
          AND a.status IN ('completed', 'approved')
          AND a.updated_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', a.updated_at)
        ORDER BY month
      `, [orgId]);

      res.json({
        success: true,
        data: {
          overview: metricsResult.rows[0],
          framework_breakdown: frameworkMetrics.rows,
          trend_data: trendData.rows,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching compliance metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch compliance metrics',
        message: error.message
      });
    }
  }
);

// Helper functions
async function generateReportData(client, assessmentId, reportType, filters = {}) {
  // This is a simplified version - in production, this would be much more comprehensive
  const assessmentData = await client.query(`
    SELECT a.*, o.name as organization_name, o.sector
    FROM assessments a
    JOIN organizations o ON a.organization_id = o.id
    WHERE a.id = $1
  `, [assessmentId]);

  const responsesData = await client.query(`
    SELECT 
      ar.*,
      c.control_code,
      c.title,
      c.criticality_level,
      c.is_mandatory,
      f.name as framework_name,
      r.name as regulator_name
    FROM assessment_responses ar
    JOIN grc_controls c ON ar.control_id = c.id
    JOIN grc_frameworks f ON c.framework_id = f.id
    JOIN regulators r ON f.regulator_id = r.id
    WHERE ar.assessment_id = $1
    ORDER BY c.criticality_level, c.control_code
  `, [assessmentId]);

  const statistics = await client.query(`
    SELECT get_assessment_statistics($1) as stats
  `, [assessmentId]);

  return {
    assessment: assessmentData.rows[0],
    responses: responsesData.rows,
    statistics: statistics.rows[0].stats,
    report_type: reportType,
    generated_at: new Date().toISOString()
  };
}

async function generateReportFile(reportData, format, reportType) {
  // This is a placeholder - in production, you would use libraries like:
  // - PDFKit or Puppeteer for PDF generation
  // - ExcelJS for Excel files
  // - Template engines for HTML
  
  const fs = require('fs');
  const path = require('path');
  
  const reportsDir = path.join(process.env.UPLOAD_DIR || './uploads', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const filename = `${reportType}_${Date.now()}.${format}`;
  const filePath = path.join(reportsDir, filename);
  
  // For now, just write JSON data
  fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
  
  return filePath;
}

async function getFileSize(filePath) {
  const fs = require('fs');
  const stats = fs.statSync(filePath);
  return stats.size;
}

function getContentType(format) {
  const contentTypes = {
    pdf: 'application/pdf',
    html: 'text/html',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json'
  };
  return contentTypes[format] || 'application/octet-stream';
}

module.exports = router;