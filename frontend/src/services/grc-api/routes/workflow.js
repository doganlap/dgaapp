const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireRole, requireOrganizationAccess } = require('../middleware/auth');
const { validateRequest, validateParams, uuidSchema } = require('../middleware/validation');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const router = express.Router();

// Validation schemas
const workflowActionSchema = Joi.object({
  comment: Joi.string().max(1000).optional(),
  reason: Joi.string().max(1000).optional(),
  comments: Joi.array().items(Joi.string().max(500)).optional(),
  userId: Joi.string().uuid().optional()
});

/**
 * GET /api/assessment-workflow
 * Get all workflow items (admin/manager only)
 */
router.get('/', authenticateToken, requireRole(['super_admin', 'admin', 'manager']), async (req, res) => {
  try {
    const { status, organization_id, assignee_id, page = 1, limit = 50 } = req.query;
    
    let whereConditions = ['aw.is_active = true'];
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
      whereConditions.push(`aw.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (assignee_id) {
      paramCount++;
      whereConditions.push(`aw.assigned_to = $${paramCount}`);
      queryParams.push(assignee_id);
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await query(`
      SELECT 
        aw.id,
        aw.assessment_id,
        aw.workflow_type,
        aw.status,
        aw.priority,
        aw.assigned_to,
        aw.assigned_by,
        aw.due_date,
        aw.created_at,
        aw.updated_at,
        a.name as assessment_name,
        o.name as organization_name,
        assignee.first_name || ' ' || assignee.last_name as assignee_name,
        assigner.first_name || ' ' || assigner.last_name as assigner_name
      FROM assessment_workflow aw
      JOIN assessments a ON aw.assessment_id = a.id
      JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN users assignee ON aw.assigned_to = assignee.id
      LEFT JOIN users assigner ON aw.assigned_by = assigner.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        CASE aw.priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        aw.due_date ASC NULLS LAST,
        aw.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM assessment_workflow aw
      JOIN assessments a ON aw.assessment_id = a.id
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
    console.error('Error fetching workflow items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow items',
      message: error.message
    });
  }
});

/**
 * GET /api/assessment-workflow/:id
 * Get workflow item by ID
 */
router.get('/:id', authenticateToken, validateParams(Joi.object({ id: uuidSchema })), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        aw.*,
        a.name as assessment_name,
        a.status as assessment_status,
        o.name as organization_name,
        assignee.first_name || ' ' || assignee.last_name as assignee_name,
        assignee.email as assignee_email,
        assigner.first_name || ' ' || assigner.last_name as assigner_name
      FROM assessment_workflow aw
      JOIN assessments a ON aw.assessment_id = a.id
      JOIN organizations o ON a.organization_id = o.id
      LEFT JOIN users assignee ON aw.assigned_to = assignee.id
      LEFT JOIN users assigner ON aw.assigned_by = assigner.id
      WHERE aw.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow item not found'
      });
    }

    const workflowItem = result.rows[0];

    // Check access permissions
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      // Users can only see workflow items from their organization or assigned to them
      if (workflowItem.organization_id !== req.user.organization_id && 
          workflowItem.assigned_to !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only view workflow items from your organization or assigned to you'
        });
      }
    }

    res.json({
      success: true,
      data: workflowItem
    });

  } catch (error) {
    console.error('Error fetching workflow item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow item',
      message: error.message
    });
  }
});

/**
 * POST /api/assessment-workflow/:id/approve
 * Approve workflow item
 */
router.post('/:id/approve', 
  authenticateToken, 
  requireRole(['super_admin', 'admin', 'manager']),
  validateParams(Joi.object({ id: uuidSchema })),
  validateRequest(workflowActionSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comment } = req.body;

      await transaction(async (client) => {
        // Get workflow item
        const workflowResult = await client.query(`
          SELECT aw.*, a.organization_id
          FROM assessment_workflow aw
          JOIN assessments a ON aw.assessment_id = a.id
          WHERE aw.id = $1 AND aw.is_active = true
        `, [id]);

        if (workflowResult.rows.length === 0) {
          throw new Error('Workflow item not found');
        }

        const workflowItem = workflowResult.rows[0];

        // Check organization access
        if (req.user.role !== 'super_admin' && workflowItem.organization_id !== req.user.organization_id) {
          throw new Error('Access denied');
        }

        // Update workflow status
        await client.query(`
          UPDATE assessment_workflow 
          SET 
            status = 'approved',
            approved_by = $1,
            approved_at = CURRENT_TIMESTAMP,
            approval_comment = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [req.user.id, comment, id]);

        // Add to workflow history
        await client.query(`
          INSERT INTO assessment_workflow_history (
            id, workflow_id, action, performed_by, comment, created_at
          ) VALUES ($1, $2, 'approved', $3, $4, CURRENT_TIMESTAMP)
        `, [uuidv4(), id, req.user.id, comment]);

        // Update assessment status if needed
        if (workflowItem.workflow_type === 'assessment_approval') {
          await client.query(`
            UPDATE assessments 
            SET status = 'approved', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [workflowItem.assessment_id]);
        }
      });

      res.json({
        success: true,
        message: 'Workflow item approved successfully'
      });

    } catch (error) {
      console.error('Error approving workflow item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve workflow item',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/assessment-workflow/:id/reject
 * Reject workflow item
 */
router.post('/:id/reject',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager']),
  validateParams(Joi.object({ id: uuidSchema })),
  validateRequest(workflowActionSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason required',
          message: 'Please provide a reason for rejection'
        });
      }

      await transaction(async (client) => {
        // Get workflow item
        const workflowResult = await client.query(`
          SELECT aw.*, a.organization_id
          FROM assessment_workflow aw
          JOIN assessments a ON aw.assessment_id = a.id
          WHERE aw.id = $1 AND aw.is_active = true
        `, [id]);

        if (workflowResult.rows.length === 0) {
          throw new Error('Workflow item not found');
        }

        const workflowItem = workflowResult.rows[0];

        // Check organization access
        if (req.user.role !== 'super_admin' && workflowItem.organization_id !== req.user.organization_id) {
          throw new Error('Access denied');
        }

        // Update workflow status
        await client.query(`
          UPDATE assessment_workflow 
          SET 
            status = 'rejected',
            rejected_by = $1,
            rejected_at = CURRENT_TIMESTAMP,
            rejection_reason = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [req.user.id, reason, id]);

        // Add to workflow history
        await client.query(`
          INSERT INTO assessment_workflow_history (
            id, workflow_id, action, performed_by, comment, created_at
          ) VALUES ($1, $2, 'rejected', $3, $4, CURRENT_TIMESTAMP)
        `, [uuidv4(), id, req.user.id, reason]);

        // Update assessment status if needed
        if (workflowItem.workflow_type === 'assessment_approval') {
          await client.query(`
            UPDATE assessments 
            SET status = 'under_review', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [workflowItem.assessment_id]);
        }
      });

      res.json({
        success: true,
        message: 'Workflow item rejected successfully'
      });

    } catch (error) {
      console.error('Error rejecting workflow item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject workflow item',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/assessment-workflow/:id/request-changes
 * Request changes for workflow item
 */
router.post('/:id/request-changes',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager']),
  validateParams(Joi.object({ id: uuidSchema })),
  validateRequest(workflowActionSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      if (!comments || comments.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Change requests required',
          message: 'Please provide specific change requests'
        });
      }

      await transaction(async (client) => {
        // Get workflow item
        const workflowResult = await client.query(`
          SELECT aw.*, a.organization_id
          FROM assessment_workflow aw
          JOIN assessments a ON aw.assessment_id = a.id
          WHERE aw.id = $1 AND aw.is_active = true
        `, [id]);

        if (workflowResult.rows.length === 0) {
          throw new Error('Workflow item not found');
        }

        const workflowItem = workflowResult.rows[0];

        // Check organization access
        if (req.user.role !== 'super_admin' && workflowItem.organization_id !== req.user.organization_id) {
          throw new Error('Access denied');
        }

        // Update workflow status
        await client.query(`
          UPDATE assessment_workflow 
          SET 
            status = 'changes_requested',
            change_requested_by = $1,
            change_requested_at = CURRENT_TIMESTAMP,
            change_requests = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [req.user.id, JSON.stringify(comments), id]);

        // Add to workflow history
        await client.query(`
          INSERT INTO assessment_workflow_history (
            id, workflow_id, action, performed_by, comment, created_at
          ) VALUES ($1, $2, 'changes_requested', $3, $4, CURRENT_TIMESTAMP)
        `, [uuidv4(), id, req.user.id, comments.join('; ')]);

        // Update assessment status if needed
        if (workflowItem.workflow_type === 'assessment_approval') {
          await client.query(`
            UPDATE assessments 
            SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [workflowItem.assessment_id]);
        }
      });

      res.json({
        success: true,
        message: 'Change requests submitted successfully'
      });

    } catch (error) {
      console.error('Error requesting changes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to request changes',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/assessment-workflow/:id/assign
 * Assign workflow item to user
 */
router.post('/:id/assign',
  authenticateToken,
  requireRole(['super_admin', 'admin', 'manager']),
  validateParams(Joi.object({ id: uuidSchema })),
  validateRequest(workflowActionSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required',
          message: 'Please specify a user to assign to'
        });
      }

      await transaction(async (client) => {
        // Verify user exists and is active
        const userResult = await client.query(`
          SELECT id, first_name, last_name, organization_id
          FROM users 
          WHERE id = $1 AND status = 'active'
        `, [userId]);

        if (userResult.rows.length === 0) {
          throw new Error('User not found or inactive');
        }

        const assigneeUser = userResult.rows[0];

        // Get workflow item
        const workflowResult = await client.query(`
          SELECT aw.*, a.organization_id
          FROM assessment_workflow aw
          JOIN assessments a ON aw.assessment_id = a.id
          WHERE aw.id = $1 AND aw.is_active = true
        `, [id]);

        if (workflowResult.rows.length === 0) {
          throw new Error('Workflow item not found');
        }

        const workflowItem = workflowResult.rows[0];

        // Check organization access
        if (req.user.role !== 'super_admin') {
          if (workflowItem.organization_id !== req.user.organization_id ||
              assigneeUser.organization_id !== req.user.organization_id) {
            throw new Error('Access denied');
          }
        }

        // Update workflow assignment
        await client.query(`
          UPDATE assessment_workflow 
          SET 
            assigned_to = $1,
            assigned_by = $2,
            assigned_at = CURRENT_TIMESTAMP,
            status = CASE WHEN status = 'unassigned' THEN 'assigned' ELSE status END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [userId, req.user.id, id]);

        // Add to workflow history
        await client.query(`
          INSERT INTO assessment_workflow_history (
            id, workflow_id, action, performed_by, comment, created_at
          ) VALUES ($1, $2, 'assigned', $3, $4, CURRENT_TIMESTAMP)
        `, [uuidv4(), id, req.user.id, `Assigned to ${assigneeUser.first_name} ${assigneeUser.last_name}`]);
      });

      res.json({
        success: true,
        message: 'Workflow item assigned successfully'
      });

    } catch (error) {
      console.error('Error assigning workflow item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign workflow item',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/assessment-workflow/:id/history
 * Get workflow history
 */
router.get('/:id/history', 
  authenticateToken, 
  validateParams(Joi.object({ id: uuidSchema })), 
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if workflow item exists and user has access
      const workflowResult = await query(`
        SELECT aw.id, a.organization_id
        FROM assessment_workflow aw
        JOIN assessments a ON aw.assessment_id = a.id
        WHERE aw.id = $1
      `, [id]);

      if (workflowResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow item not found'
        });
      }

      const workflowItem = workflowResult.rows[0];

      // Check organization access
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && 
          workflowItem.organization_id !== req.user.organization_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get workflow history
      const historyResult = await query(`
        SELECT 
          awh.id,
          awh.action,
          awh.comment,
          awh.created_at,
          u.first_name || ' ' || u.last_name as performed_by_name,
          u.email as performed_by_email
        FROM assessment_workflow_history awh
        LEFT JOIN users u ON awh.performed_by = u.id
        WHERE awh.workflow_id = $1
        ORDER BY awh.created_at DESC
      `, [id]);

      res.json({
        success: true,
        data: historyResult.rows
      });

    } catch (error) {
      console.error('Error fetching workflow history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch workflow history',
        message: error.message
      });
    }
  }
);

module.exports = router;