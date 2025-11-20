const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireRole, requireOrganizationAccess } = require('../middleware/auth');
const { validateRequest, validateParams, uuidSchema } = require('../middleware/validation');
const { uploadSingle, validateFile, scanForVirus, getFileInfo, cleanupFile } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Validation schemas
const evidenceUploadSchema = Joi.object({
  title: Joi.string().max(255).required(),
  description: Joi.string().max(1000).optional(),
  evidence_type: Joi.string().valid('document', 'screenshot', 'video', 'link', 'other').required(),
  external_url: Joi.string().uri().optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  is_confidential: Joi.boolean().default(false),
  retention_period: Joi.number().integer().min(0).optional(),
  category: Joi.string().max(100).optional(),
  subcategory: Joi.string().max(100).optional()
});

const evidenceUpdateSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  is_confidential: Joi.boolean().optional(),
  retention_period: Joi.number().integer().min(0).optional(),
  category: Joi.string().max(100).optional(),
  subcategory: Joi.string().max(100).optional(),
  status: Joi.string().valid('active', 'archived', 'deleted').optional()
});

/**
 * GET /api/evidence-library
 * Get all evidence items
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      organization_id, 
      evidence_type, 
      category, 
      is_confidential, 
      status = 'active',
      search,
      page = 1, 
      limit = 50 
    } = req.query;
    
    let whereConditions = ['el.status = $1'];
    let queryParams = [status];
    let paramCount = 1;

    // Organization filter (non-super admins see only their org)
    if (req.user.role !== 'super_admin') {
      paramCount++;
      whereConditions.push(`el.organization_id = $${paramCount}`);
      queryParams.push(req.user.organization_id);
    } else if (organization_id) {
      paramCount++;
      whereConditions.push(`el.organization_id = $${paramCount}`);
      queryParams.push(organization_id);
    }

    if (evidence_type) {
      paramCount++;
      whereConditions.push(`el.evidence_type = $${paramCount}`);
      queryParams.push(evidence_type);
    }

    if (category) {
      paramCount++;
      whereConditions.push(`el.category = $${paramCount}`);
      queryParams.push(category);
    }

    if (is_confidential !== undefined) {
      paramCount++;
      whereConditions.push(`el.is_confidential = $${paramCount}`);
      queryParams.push(is_confidential === 'true');
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(el.title ILIKE $${paramCount} OR el.description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await query(`
      SELECT 
        el.id,
        el.title,
        el.description,
        el.evidence_type,
        el.category,
        el.subcategory,
        el.file_name,
        el.file_size,
        el.file_type,
        el.external_url,
        el.tags,
        el.is_confidential,
        el.status,
        el.upload_date,
        el.created_at,
        o.name as organization_name,
        uploader.first_name || ' ' || uploader.last_name as uploaded_by_name,
        COUNT(ear.id) as usage_count
      FROM evidence_library el
      JOIN organizations o ON el.organization_id = o.id
      LEFT JOIN users uploader ON el.uploaded_by = uploader.id
      LEFT JOIN evidence_assessment_relations ear ON el.id = ear.evidence_id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY el.id, o.name, uploader.first_name, uploader.last_name
      ORDER BY el.upload_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM evidence_library el
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
    console.error('Error fetching evidence library:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evidence library',
      message: error.message
    });
  }
});

/**
 * GET /api/evidence-library/:id
 * Get evidence item by ID
 */
router.get('/:id', authenticateToken, validateParams(Joi.object({ id: uuidSchema })), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        el.*,
        o.name as organization_name,
        uploader.first_name || ' ' || uploader.last_name as uploaded_by_name,
        uploader.email as uploaded_by_email
      FROM evidence_library el
      JOIN organizations o ON el.organization_id = o.id
      LEFT JOIN users uploader ON el.uploaded_by = uploader.id
      WHERE el.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence item not found'
      });
    }

    const evidence = result.rows[0];

    // Check access permissions
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      if (evidence.organization_id !== req.user.organization_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only view evidence from your organization'
        });
      }
    }

    // Get usage information
    const usageResult = await query(`
      SELECT 
        a.id as assessment_id,
        a.name as assessment_name,
        ar.id as response_id,
        c.control_code,
        c.title as control_title
      FROM evidence_assessment_relations ear
      JOIN assessment_responses ar ON ear.response_id = ar.id
      JOIN assessments a ON ar.assessment_id = a.id
      JOIN grc_controls c ON ar.control_id = c.id
      WHERE ear.evidence_id = $1
      ORDER BY a.name, c.control_code
    `, [id]);

    res.json({
      success: true,
      data: {
        ...evidence,
        usage: usageResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching evidence item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evidence item',
      message: error.message
    });
  }
});

/**
 * POST /api/evidence-library/upload
 * Upload new evidence item
 */
router.post('/upload',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager', 'assessor']),
  uploadSingle('file'),
  validateFile,
  scanForVirus,
  validateRequest(evidenceUploadSchema),
  async (req, res) => {
    try {
      const {
        title,
        description,
        evidence_type,
        external_url,
        tags,
        is_confidential,
        retention_period,
        category,
        subcategory
      } = req.body;

      // Validate evidence type requirements
      if (evidence_type === 'link' && !external_url) {
        return res.status(400).json({
          success: false,
          error: 'External URL required for link evidence type'
        });
      }

      if (evidence_type !== 'link' && !req.file) {
        return res.status(400).json({
          success: false,
          error: 'File required for non-link evidence types'
        });
      }

      const evidenceId = uuidv4();
      const fileInfo = req.file ? getFileInfo(req.file) : null;

      const result = await query(`
        INSERT INTO evidence_library (
          id, organization_id, title, description, evidence_type,
          file_name, file_path, file_size, file_type, external_url,
          tags, is_confidential, retention_period, category, subcategory,
          uploaded_by, upload_date, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, title, evidence_type, upload_date
      `, [
        evidenceId,
        req.user.organization_id,
        title,
        description,
        evidence_type,
        fileInfo?.originalName,
        fileInfo?.path,
        fileInfo?.size,
        fileInfo?.mimetype,
        external_url,
        JSON.stringify(tags || []),
        is_confidential,
        retention_period,
        category,
        subcategory,
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message: 'Evidence uploaded successfully',
        data: result.rows[0]
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        cleanupFile(req.file.path);
      }

      console.error('Error uploading evidence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload evidence',
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/evidence-library/:id
 * Update evidence item
 */
router.put('/:id',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager', 'assessor']),
  validateParams(Joi.object({ id: uuidSchema })),
  validateRequest(evidenceUpdateSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if evidence exists and user has access
      const existingResult = await query(`
        SELECT el.*, o.id as org_id
        FROM evidence_library el
        JOIN organizations o ON el.organization_id = o.id
        WHERE el.id = $1
      `, [id]);

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evidence item not found'
        });
      }

      const existing = existingResult.rows[0];

      // Check access permissions
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        if (existing.organization_id !== req.user.organization_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          
          if (key === 'tags') {
            updateValues.push(JSON.stringify(updateData[key]));
          } else {
            updateValues.push(updateData[key]);
          }
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      // Add updated_at
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      updateValues.push(new Date());

      // Add ID for WHERE clause
      paramCount++;
      updateValues.push(id);

      const result = await query(`
        UPDATE evidence_library 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, title, evidence_type, status, updated_at
      `, updateValues);

      res.json({
        success: true,
        message: 'Evidence updated successfully',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating evidence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update evidence',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/evidence-library/:id/download
 * Download evidence file
 */
router.get('/:id/download',
  authenticateToken,
  validateParams(Joi.object({ id: uuidSchema })),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await query(`
        SELECT el.*, o.name as organization_name
        FROM evidence_library el
        JOIN organizations o ON el.organization_id = o.id
        WHERE el.id = $1 AND el.status = 'active'
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evidence item not found'
        });
      }

      const evidence = result.rows[0];

      // Check access permissions
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        if (evidence.organization_id !== req.user.organization_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }

      // Check if it's a file-based evidence
      if (evidence.evidence_type === 'link') {
        return res.status(400).json({
          success: false,
          error: 'Cannot download link evidence',
          message: 'This evidence is a link, not a downloadable file',
          external_url: evidence.external_url
        });
      }

      // Check if file exists
      if (!evidence.file_path || !fs.existsSync(evidence.file_path)) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          message: 'The evidence file may have been deleted or moved'
        });
      }

      // Log download activity
      await query(`
        INSERT INTO evidence_download_log (
          id, evidence_id, downloaded_by, download_date, ip_address
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
      `, [uuidv4(), id, req.user.id, req.ip]);

      // Set appropriate headers
      const filename = evidence.file_name || `evidence_${id}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', evidence.file_type || 'application/octet-stream');
      res.setHeader('Content-Length', evidence.file_size);

      // Stream the file
      const fileStream = fs.createReadStream(evidence.file_path);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error downloading evidence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download evidence',
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/evidence-library/:id/status
 * Update evidence status
 */
router.put('/:id/status',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager']),
  validateParams(Joi.object({ id: uuidSchema })),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'archived', 'deleted'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: 'Status must be one of: active, archived, deleted'
        });
      }

      const result = await query(`
        UPDATE evidence_library el
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        FROM organizations o
        WHERE el.id = $2 
          AND el.organization_id = o.id
          AND ($3 = 'super_admin' OR o.id = $4)
        RETURNING el.id, el.title, el.status
      `, [status, id, req.user.role, req.user.organization_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evidence item not found or access denied'
        });
      }

      res.json({
        success: true,
        message: `Evidence ${status} successfully`,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating evidence status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update evidence status',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/evidence-library/:id
 * Delete evidence item (soft delete)
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager']),
  validateParams(Joi.object({ id: uuidSchema })),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if evidence is in use
      const usageResult = await query(`
        SELECT COUNT(*) as usage_count
        FROM evidence_assessment_relations
        WHERE evidence_id = $1
      `, [id]);

      if (parseInt(usageResult.rows[0].usage_count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'Evidence in use',
          message: 'Cannot delete evidence that is currently being used in assessments'
        });
      }

      const result = await query(`
        UPDATE evidence_library el
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        FROM organizations o
        WHERE el.id = $1 
          AND el.organization_id = o.id
          AND ($2 = 'super_admin' OR o.id = $3)
        RETURNING el.id, el.title
      `, [id, req.user.role, req.user.organization_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Evidence item not found or access denied'
        });
      }

      res.json({
        success: true,
        message: 'Evidence deleted successfully',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error deleting evidence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete evidence',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/evidence-library/categories
 * Get evidence categories and statistics
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        category,
        subcategory,
        evidence_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_confidential = true THEN 1 END) as confidential_count
      FROM evidence_library el
      WHERE el.status = 'active'
        AND ($1 = 'super_admin' OR el.organization_id = $2)
      GROUP BY category, subcategory, evidence_type
      ORDER BY category, subcategory, evidence_type
    `, [req.user.role, req.user.organization_id]);

    // Group by category
    const categories = {};
    result.rows.forEach(row => {
      const category = row.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = {
          name: category,
          total_count: 0,
          subcategories: {},
          evidence_types: {}
        };
      }

      categories[category].total_count += parseInt(row.count);

      if (row.subcategory) {
        if (!categories[category].subcategories[row.subcategory]) {
          categories[category].subcategories[row.subcategory] = 0;
        }
        categories[category].subcategories[row.subcategory] += parseInt(row.count);
      }

      if (!categories[category].evidence_types[row.evidence_type]) {
        categories[category].evidence_types[row.evidence_type] = 0;
      }
      categories[category].evidence_types[row.evidence_type] += parseInt(row.count);
    });

    res.json({
      success: true,
      data: Object.values(categories)
    });

  } catch (error) {
    console.error('Error fetching evidence categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evidence categories',
      message: error.message
    });
  }
});

module.exports = router;