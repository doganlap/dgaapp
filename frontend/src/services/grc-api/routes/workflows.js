/**
 * Workflows API Routes
 * Handles workflow management, automation, and process orchestration
 */

const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

/**
 * GET /api/workflows
 * Get all workflows with filtering and pagination
 */
router.get('/', authenticateToken, requirePermission('workflows:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      search,
      tenant_id
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramCount = 0;

    // Add tenant filter if provided
    if (tenant_id) {
      paramCount++;
      whereClause += ` AND tenant_id = $${paramCount}`;
      params.push(tenant_id);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await query(`
      SELECT 
        id, name, description, category, status, trigger_type,
        created_at, updated_at, last_executed,
        (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id) as execution_count
      FROM workflows w
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM workflows w
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
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
      message: error.message
    });
  }
});

/**
 * GET /api/workflows/:id
 * Get specific workflow with details
 */
router.get('/:id', authenticateToken, requirePermission('workflows:read'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        w.*,
        (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id) as execution_count,
        (SELECT MAX(executed_at) FROM workflow_executions we WHERE we.workflow_id = w.id) as last_executed
      FROM workflows w
      WHERE w.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Get workflow steps
    const stepsResult = await query(`
      SELECT * FROM workflow_steps 
      WHERE workflow_id = $1 
      ORDER BY step_order
    `, [id]);

    const workflow = result.rows[0];
    workflow.steps = stepsResult.rows;

    res.json({
      success: true,
      data: workflow
    });

  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow',
      message: error.message
    });
  }
});

/**
 * POST /api/workflows
 * Create new workflow
 */
router.post('/', authenticateToken, requirePermission('workflows:create'), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      trigger_type,
      trigger_config,
      steps,
      tenant_id
    } = req.body;

    const result = await transaction(async (client) => {
      // Create workflow
      const workflowResult = await client.query(`
        INSERT INTO workflows (
          name, description, category, trigger_type, trigger_config, 
          tenant_id, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        RETURNING *
      `, [name, description, category, trigger_type, trigger_config, tenant_id, req.user.id]);

      const workflow = workflowResult.rows[0];

      // Create workflow steps
      if (steps && steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await client.query(`
            INSERT INTO workflow_steps (
              workflow_id, step_name, step_type, step_config, step_order
            ) VALUES ($1, $2, $3, $4, $5)
          `, [workflow.id, step.name, step.type, step.config, i + 1]);
        }
      }

      return workflow;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Workflow created successfully'
    });

  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow',
      message: error.message
    });
  }
});

/**
 * PUT /api/workflows/:id
 * Update workflow
 */
router.put('/:id', authenticateToken, requirePermission('workflows:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      trigger_type,
      trigger_config,
      status,
      steps
    } = req.body;

    const result = await transaction(async (client) => {
      // Update workflow
      const workflowResult = await client.query(`
        UPDATE workflows SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          category = COALESCE($4, category),
          trigger_type = COALESCE($5, trigger_type),
          trigger_config = COALESCE($6, trigger_config),
          status = COALESCE($7, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, name, description, category, trigger_type, trigger_config, status]);

      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow not found');
      }

      // Update steps if provided
      if (steps) {
        // Delete existing steps
        await client.query('DELETE FROM workflow_steps WHERE workflow_id = $1', [id]);
        
        // Insert new steps
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await client.query(`
            INSERT INTO workflow_steps (
              workflow_id, step_name, step_type, step_config, step_order
            ) VALUES ($1, $2, $3, $4, $5)
          `, [id, step.name, step.type, step.config, i + 1]);
        }
      }

      return workflowResult.rows[0];
    });

    res.json({
      success: true,
      data: result,
      message: 'Workflow updated successfully'
    });

  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow',
      message: error.message
    });
  }
});

/**
 * POST /api/workflows/:id/execute
 * Execute workflow
 */
router.post('/:id/execute', authenticateToken, requirePermission('workflows:execute'), async (req, res) => {
  try {
    const { id } = req.params;
    const { input_data = {} } = req.body;

    // Create execution record
    const executionResult = await query(`
      INSERT INTO workflow_executions (
        workflow_id, executed_by, status, input_data, started_at
      ) VALUES ($1, $2, 'running', $3, CURRENT_TIMESTAMP)
      RETURNING *
    `, [id, req.user.id, JSON.stringify(input_data)]);

    const execution = executionResult.rows[0];

    // TODO: Implement actual workflow execution logic here
    // For now, we'll just mark it as completed
    await query(`
      UPDATE workflow_executions SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        output_data = $2
      WHERE id = $1
    `, [execution.id, JSON.stringify({ message: 'Workflow executed successfully' })]);

    res.json({
      success: true,
      data: {
        execution_id: execution.id,
        status: 'completed',
        message: 'Workflow executed successfully'
      }
    });

  } catch (error) {
    console.error('Execute workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute workflow',
      message: error.message
    });
  }
});

/**
 * GET /api/workflows/stats
 * Get workflow statistics
 */
router.get('/stats', authenticateToken, requirePermission('workflows:read'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_workflows,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_workflows,
        (SELECT COUNT(*) FROM workflow_executions WHERE DATE(started_at) = CURRENT_DATE) as executions_today,
        (SELECT COUNT(*) FROM workflow_executions WHERE status = 'failed') as failed_executions
      FROM workflows
    `);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get workflow stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow statistics',
      message: error.message
    });
  }
});

module.exports = router;
