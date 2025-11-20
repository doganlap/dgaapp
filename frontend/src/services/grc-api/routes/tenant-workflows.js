const express = require('express');
const { query } = require('../config/database');
const { requirePermission, requireTenantAccess } = require('../middleware/rbac');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * TENANT-SPECIFIC WORKFLOW & APPROVAL SYSTEM
 * Role-based approval workflows per tenant with custom hierarchies
 */

// Apply authentication and tenant access to all routes
router.use(authenticateToken);
router.use(requireTenantAccess);

/**
 * GET /api/tenant-workflows/:tenantId/roles
 * Get tenant-specific roles and approval hierarchy
 */
router.get('/:tenantId/roles', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const rolesResult = await query(`
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.permissions,
        r.approval_level,
        r.can_approve_up_to_amount,
        r.workflow_permissions,
        r.created_at,
        COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
      WHERE r.tenant_id = $1 OR r.is_system_role = true
      GROUP BY r.id, r.name, r.display_name, r.description, r.permissions, 
               r.approval_level, r.can_approve_up_to_amount, r.workflow_permissions, r.created_at
      ORDER BY r.approval_level DESC, r.name
    `, [tenantId]);

    // Get approval hierarchy
    const hierarchyResult = await query(`
      SELECT 
        ah.id,
        ah.role_id,
        ah.parent_role_id,
        ah.approval_order,
        ah.is_required,
        ah.can_delegate,
        r1.name as role_name,
        r2.name as parent_role_name
      FROM approval_hierarchy ah
      JOIN roles r1 ON ah.role_id = r1.id
      LEFT JOIN roles r2 ON ah.parent_role_id = r2.id
      WHERE ah.tenant_id = $1
      ORDER BY ah.approval_order
    `, [tenantId]);

    res.json({
      success: true,
      data: {
        roles: rolesResult.rows,
        hierarchy: hierarchyResult.rows
      }
    });

  } catch (error) {
    console.error('Get tenant roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant roles',
      message: error.message
    });
  }
});

/**
 * GET /api/tenant-workflows/:tenantId/workflow-templates
 * Get tenant-specific workflow templates
 */
router.get('/:tenantId/workflow-templates', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const templatesResult = await query(`
      SELECT 
        wt.id,
        wt.name,
        wt.description,
        wt.category,
        wt.steps,
        wt.approval_matrix,
        wt.estimated_duration,
        wt.is_active,
        wt.created_at,
        wt.updated_at,
        COUNT(w.id) as usage_count
      FROM workflow_templates wt
      LEFT JOIN workflows w ON wt.id = w.template_id
      WHERE wt.tenant_id = $1 OR wt.is_global = true
      GROUP BY wt.id, wt.name, wt.description, wt.category, wt.steps, 
               wt.approval_matrix, wt.estimated_duration, wt.is_active, 
               wt.created_at, wt.updated_at
      ORDER BY wt.name
    `, [tenantId]);

    res.json({
      success: true,
      data: templatesResult.rows
    });

  } catch (error) {
    console.error('Get workflow templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow templates',
      message: error.message
    });
  }
});

/**
 * POST /api/tenant-workflows/:tenantId/workflow-templates
 * Create tenant-specific workflow template
 */
router.post('/:tenantId/workflow-templates', requirePermission('workflows.admin'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { 
      name, 
      description, 
      category, 
      steps, 
      approval_matrix, 
      estimated_duration,
      auto_assign_rules 
    } = req.body;

    const result = await query(`
      INSERT INTO workflow_templates (
        tenant_id, name, description, category, steps, 
        approval_matrix, estimated_duration, auto_assign_rules, 
        created_by, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *
    `, [
      tenantId, name, description, category, 
      JSON.stringify(steps), JSON.stringify(approval_matrix), 
      estimated_duration, JSON.stringify(auto_assign_rules), 
      req.user.id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Workflow template created successfully'
    });

  } catch (error) {
    console.error('Create workflow template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow template',
      message: error.message
    });
  }
});

/**
 * GET /api/tenant-workflows/:tenantId/workflows
 * Get tenant workflows with approval status
 */
router.get('/:tenantId/workflows', requirePermission('workflows.read'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status, assignee, category, page = 1, limit = 20 } = req.query;
    
    let whereConditions = ['w.tenant_id = $1'];
    let queryParams = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`w.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (assignee) {
      whereConditions.push(`w.current_assignee_id = $${paramIndex}`);
      queryParams.push(assignee);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`w.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    const offset = (page - 1) * limit;
    
    const workflowsResult = await query(`
      SELECT 
        w.id,
        w.name,
        w.description,
        w.category,
        w.status,
        w.priority,
        w.current_step,
        w.total_steps,
        w.progress_percentage,
        w.current_assignee_id,
        w.due_date,
        w.created_at,
        w.updated_at,
        u1.name as current_assignee_name,
        u2.name as created_by_name,
        wt.name as template_name,
        (
          SELECT COUNT(*) 
          FROM workflow_approvals wa 
          WHERE wa.workflow_id = w.id AND wa.status = 'pending'
        ) as pending_approvals,
        (
          SELECT COUNT(*) 
          FROM workflow_approvals wa 
          WHERE wa.workflow_id = w.id AND wa.status = 'approved'
        ) as completed_approvals
      FROM workflows w
      LEFT JOIN users u1 ON w.current_assignee_id = u1.id
      LEFT JOIN users u2 ON w.created_by = u2.id
      LEFT JOIN workflow_templates wt ON w.template_id = wt.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY w.updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM workflows w
      WHERE ${whereConditions.join(' AND ')}
    `, queryParams);

    res.json({
      success: true,
      data: {
        workflows: workflowsResult.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
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
 * POST /api/tenant-workflows/:tenantId/workflows
 * Create new workflow instance
 */
router.post('/:tenantId/workflows', requirePermission('workflows.create'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { 
      template_id, 
      name, 
      description, 
      priority, 
      due_date, 
      initial_data,
      auto_assign 
    } = req.body;

    // Get template details
    const templateResult = await query(`
      SELECT * FROM workflow_templates 
      WHERE id = $1 AND (tenant_id = $2 OR is_global = true)
    `, [template_id, tenantId]);

    if (templateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found'
      });
    }

    const template = templateResult.rows[0];
    
    // Determine initial assignee based on auto-assignment rules
    let initialAssignee = req.user.id;
    if (auto_assign && template.auto_assign_rules) {
      const autoAssignResult = await determineInitialAssignee(
        tenantId, 
        template.auto_assign_rules, 
        initial_data
      );
      if (autoAssignResult.assignee_id) {
        initialAssignee = autoAssignResult.assignee_id;
      }
    }

    // Create workflow instance
    const workflowResult = await query(`
      INSERT INTO workflows (
        tenant_id, template_id, name, description, category,
        priority, status, current_step, total_steps,
        current_assignee_id, due_date, initial_data,
        created_by, progress_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 1, $7, $8, $9, $10, $11, 0)
      RETURNING *
    `, [
      tenantId, template_id, name, description, template.category,
      priority, template.steps.length, initialAssignee, due_date,
      JSON.stringify(initial_data), req.user.id
    ]);

    const workflow = workflowResult.rows[0];

    // Create initial approval steps based on template
    await createApprovalSteps(workflow.id, template.approval_matrix, tenantId);

    res.status(201).json({
      success: true,
      data: workflow,
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
 * POST /api/tenant-workflows/:tenantId/workflows/:workflowId/approve
 * Approve workflow step
 */
router.post('/:tenantId/workflows/:workflowId/approve', requirePermission('workflows.approve'), async (req, res) => {
  try {
    const { tenantId, workflowId } = req.params;
    const { comments, attachments, next_assignee_id } = req.body;

    // Get current workflow state
    const workflowResult = await query(`
      SELECT * FROM workflows 
      WHERE id = $1 AND tenant_id = $2
    `, [workflowId, tenantId]);

    if (workflowResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const workflow = workflowResult.rows[0];

    // Check if user can approve current step
    const canApprove = await checkApprovalPermission(
      req.user.id, 
      workflowId, 
      workflow.current_step,
      tenantId
    );

    if (!canApprove.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Approval permission denied',
        message: canApprove.reason
      });
    }

    // Record approval
    await query(`
      INSERT INTO workflow_approvals (
        workflow_id, step_number, approver_id, status,
        comments, attachments, approved_at
      ) VALUES ($1, $2, $3, 'approved', $4, $5, CURRENT_TIMESTAMP)
    `, [workflowId, workflow.current_step, req.user.id, comments, JSON.stringify(attachments)]);

    // Advance workflow to next step
    const nextStep = await advanceWorkflowStep(workflowId, next_assignee_id, tenantId);

    res.json({
      success: true,
      data: {
        workflow_id: workflowId,
        current_step: nextStep.current_step,
        status: nextStep.status,
        next_assignee: nextStep.next_assignee
      },
      message: 'Workflow step approved successfully'
    });

  } catch (error) {
    console.error('Approve workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve workflow step',
      message: error.message
    });
  }
});

/**
 * POST /api/tenant-workflows/:tenantId/workflows/:workflowId/reject
 * Reject workflow step
 */
router.post('/:tenantId/workflows/:workflowId/reject', requirePermission('workflows.approve'), async (req, res) => {
  try {
    const { tenantId, workflowId } = req.params;
    const { reason, comments, return_to_step } = req.body;

    // Record rejection
    await query(`
      INSERT INTO workflow_approvals (
        workflow_id, step_number, approver_id, status,
        rejection_reason, comments, approved_at
      ) VALUES ($1, $2, $3, 'rejected', $4, $5, CURRENT_TIMESTAMP)
    `, [workflowId, req.body.current_step, req.user.id, reason, comments]);

    // Return workflow to specified step or creator
    const returnStep = return_to_step || 1;
    await query(`
      UPDATE workflows 
      SET status = 'rejected', 
          current_step = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
    `, [returnStep, workflowId, tenantId]);

    res.json({
      success: true,
      message: 'Workflow step rejected successfully'
    });

  } catch (error) {
    console.error('Reject workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject workflow step',
      message: error.message
    });
  }
});

/**
 * GET /api/tenant-workflows/:tenantId/my-approvals
 * Get pending approvals for current user
 */
router.get('/:tenantId/my-approvals', requirePermission('workflows.approve'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const approvalsResult = await query(`
      SELECT 
        w.id as workflow_id,
        w.name as workflow_name,
        w.description,
        w.priority,
        w.current_step,
        w.due_date,
        w.created_at,
        wa.step_number,
        wa.required_role,
        wa.can_delegate,
        u.name as created_by_name,
        wt.name as template_name
      FROM workflows w
      JOIN workflow_approvals wa ON w.id = wa.workflow_id
      LEFT JOIN users u ON w.created_by = u.id
      LEFT JOIN workflow_templates wt ON w.template_id = wt.id
      WHERE w.tenant_id = $1 
        AND w.status = 'pending'
        AND wa.status = 'pending'
        AND (
          wa.assignee_id = $2 
          OR wa.required_role IN (
            SELECT r.name FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = $2 AND ur.is_active = true
          )
        )
      ORDER BY w.priority DESC, w.due_date ASC
    `, [tenantId, req.user.id]);

    res.json({
      success: true,
      data: approvalsResult.rows
    });

  } catch (error) {
    console.error('Get my approvals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals',
      message: error.message
    });
  }
});

/**
 * Helper Functions
 */

async function determineInitialAssignee(tenantId, autoAssignRules, initialData) {
  try {
    // Implement auto-assignment logic based on rules
    // This could include department, role, workload, etc.
    
    for (const rule of autoAssignRules) {
      if (rule.condition && evaluateCondition(rule.condition, initialData)) {
        const assigneeResult = await query(`
          SELECT u.id FROM users u
          JOIN user_roles ur ON u.id = ur.user_id
          JOIN roles r ON ur.role_id = r.id
          WHERE u.tenant_id = $1 
            AND r.name = $2 
            AND u.is_active = true
            AND ur.is_active = true
          ORDER BY u.current_workload ASC
          LIMIT 1
        `, [tenantId, rule.assign_to_role]);
        
        if (assigneeResult.rows.length > 0) {
          return { assignee_id: assigneeResult.rows[0].id };
        }
      }
    }
    
    return { assignee_id: null };
  } catch (error) {
    console.error('Auto-assign error:', error);
    return { assignee_id: null };
  }
}

async function createApprovalSteps(workflowId, approvalMatrix, tenantId) {
  try {
    for (let i = 0; i < approvalMatrix.length; i++) {
      const step = approvalMatrix[i];
      
      await query(`
        INSERT INTO workflow_approvals (
          workflow_id, step_number, required_role, 
          assignee_id, is_required, can_delegate, 
          status, timeout_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      `, [
        workflowId, i + 1, step.role, 
        step.specific_assignee_id, step.is_required, 
        step.can_delegate, step.timeout_hours || 72
      ]);
    }
  } catch (error) {
    console.error('Create approval steps error:', error);
    throw error;
  }
}

async function checkApprovalPermission(userId, workflowId, currentStep, tenantId) {
  try {
    const result = await query(`
      SELECT 
        wa.required_role,
        wa.assignee_id,
        wa.can_delegate,
        EXISTS(
          SELECT 1 FROM user_roles ur 
          JOIN roles r ON ur.role_id = r.id 
          WHERE ur.user_id = $1 
            AND r.name = wa.required_role 
            AND ur.is_active = true
            AND (r.tenant_id = $4 OR r.is_system_role = true)
        ) as has_required_role
      FROM workflow_approvals wa
      WHERE wa.workflow_id = $2 AND wa.step_number = $3
    `, [userId, workflowId, currentStep, tenantId]);

    if (result.rows.length === 0) {
      return { allowed: false, reason: 'Approval step not found' };
    }

    const approval = result.rows[0];
    
    if (approval.assignee_id && approval.assignee_id !== userId) {
      return { allowed: false, reason: 'Not assigned to this user' };
    }
    
    if (!approval.has_required_role) {
      return { allowed: false, reason: 'User does not have required role' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Check approval permission error:', error);
    return { allowed: false, reason: 'Permission check failed' };
  }
}

async function advanceWorkflowStep(workflowId, nextAssigneeId, tenantId) {
  try {
    // Get current workflow state
    const workflowResult = await query(`
      SELECT * FROM workflows WHERE id = $1
    `, [workflowId]);
    
    const workflow = workflowResult.rows[0];
    const nextStep = workflow.current_step + 1;
    
    if (nextStep > workflow.total_steps) {
      // Workflow completed
      await query(`
        UPDATE workflows 
        SET status = 'completed', 
            progress_percentage = 100,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [workflowId]);
      
      return { current_step: workflow.total_steps, status: 'completed' };
    } else {
      // Advance to next step
      const progressPercentage = Math.round((nextStep / workflow.total_steps) * 100);
      
      await query(`
        UPDATE workflows 
        SET current_step = $1, 
            progress_percentage = $2,
            current_assignee_id = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [nextStep, progressPercentage, nextAssigneeId, workflowId]);
      
      return { current_step: nextStep, status: 'pending', next_assignee: nextAssigneeId };
    }
  } catch (error) {
    console.error('Advance workflow step error:', error);
    throw error;
  }
}

function evaluateCondition(condition, data) {
  // Simple condition evaluation - can be enhanced with a proper expression engine
  try {
    // Example: { field: "department", operator: "equals", value: "finance" }
    const fieldValue = data[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return fieldValue && fieldValue.includes(condition.value);
      case 'greater_than':
        return parseFloat(fieldValue) > parseFloat(condition.value);
      case 'less_than':
        return parseFloat(fieldValue) < parseFloat(condition.value);
      default:
        return false;
    }
  } catch (error) {
    console.error('Condition evaluation error:', error);
    return false;
  }
}

module.exports = router;
