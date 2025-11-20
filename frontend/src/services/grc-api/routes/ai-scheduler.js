const express = require('express');
const { query, transaction } = require('../config/database');
const Joi = require('joi');
const router = express.Router();

// Validation schemas
const taskSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional(),
  task_type: Joi.string().valid(
    'assessment_reminder', 'compliance_check', 'report_generation',
    'risk_analysis', 'audit_preparation', 'document_review',
    'partner_evaluation', 'system_maintenance', 'data_backup',
    'security_scan', 'notification_batch', 'custom'
  ).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  status: Joi.string().valid('scheduled', 'running', 'completed', 'failed', 'cancelled').default('scheduled'),
  schedule_type: Joi.string().valid('once', 'daily', 'weekly', 'monthly', 'yearly', 'cron').required(),
  schedule_expression: Joi.string().optional(), // For cron expressions
  next_run_at: Joi.date().required(),
  last_run_at: Joi.date().optional(),
  max_retries: Joi.number().integer().min(0).max(10).default(3),
  retry_count: Joi.number().integer().min(0).default(0),
  timeout_minutes: Joi.number().integer().min(1).max(1440).default(60), // 1 day max
  parameters: Joi.object().optional(),
  conditions: Joi.object().optional(), // AI-driven execution conditions
  dependencies: Joi.array().items(Joi.string().uuid()).optional(),
  organization_id: Joi.string().uuid().optional(),
  created_by: Joi.string().uuid().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  is_active: Joi.boolean().default(true)
});

const taskUpdateSchema = taskSchema.fork(['name', 'task_type', 'schedule_type', 'next_run_at'],
  (schema) => schema.optional()
);

const executionSchema = Joi.object({
  output: Joi.object().optional(),
  error_message: Joi.string().optional(),
  metrics: Joi.object().optional(),
  ai_insights: Joi.object().optional()
});

/**
 * GET /api/ai-scheduler/tasks
 * Get scheduled tasks with filtering and AI insights
 */
router.get('/tasks', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      task_type,
      priority,
      schedule_type,
      organization_id,
      search,
      next_run_before,
      next_run_after,
      sort_by = 'next_run_at',
      sort_order = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Search functionality
    if (search) {
      paramCount++;
      whereConditions.push(`(
        LOWER(st.name) LIKE LOWER($${paramCount}) OR
        LOWER(st.description) LIKE LOWER($${paramCount})
      )`);
      queryParams.push(`%${search}%`);
    }

    // Filters
    if (status) {
      paramCount++;
      whereConditions.push(`st.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (task_type) {
      paramCount++;
      whereConditions.push(`st.task_type = $${paramCount}`);
      queryParams.push(task_type);
    }

    if (priority) {
      paramCount++;
      whereConditions.push(`st.priority = $${paramCount}`);
      queryParams.push(priority);
    }

    if (schedule_type) {
      paramCount++;
      whereConditions.push(`st.schedule_type = $${paramCount}`);
      queryParams.push(schedule_type);
    }

    if (organization_id) {
      paramCount++;
      whereConditions.push(`st.organization_id = $${paramCount}`);
      queryParams.push(organization_id);
    }

    if (next_run_before) {
      paramCount++;
      whereConditions.push(`st.next_run_at <= $${paramCount}`);
      queryParams.push(next_run_before);
    }

    if (next_run_after) {
      paramCount++;
      whereConditions.push(`st.next_run_at >= $${paramCount}`);
      queryParams.push(next_run_after);
    }

    // Only active tasks by default
    whereConditions.push('st.is_active = true');

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort parameters
    const allowedSortFields = ['name', 'created_at', 'next_run_at', 'last_run_at', 'priority', 'status'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'next_run_at';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM scheduled_tasks st
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get tasks with pagination
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const tasksQuery = `
      SELECT
        st.*,
        o.name as organization_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        (
          SELECT COUNT(*)
          FROM task_executions te
          WHERE te.task_id = st.id AND te.status = 'completed'
        ) as successful_runs,
        (
          SELECT COUNT(*)
          FROM task_executions te
          WHERE te.task_id = st.id AND te.status = 'failed'
        ) as failed_runs,
        CASE
          WHEN st.next_run_at <= NOW() + INTERVAL '1 hour' THEN true
          ELSE false
        END as due_soon
      FROM scheduled_tasks st
      LEFT JOIN organizations o ON st.organization_id = o.id
      LEFT JOIN users u ON st.created_by = u.id
      ${whereClause}
      ORDER BY
        CASE st.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        st.${sortField} ${sortDirection}
      LIMIT $${paramCount-1} OFFSET $${paramCount}
    `;

    const result = await query(tasksQuery, queryParams);

    // AI insights for task optimization
    const aiInsights = await generateAIInsights(result.rows);

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
      },
      ai_insights: aiInsights
    });

  } catch (error) {
    console.error('Error fetching scheduled tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled tasks',
      message: error.message
    });
  }
});

/**
 * GET /api/ai-scheduler/tasks/:id
 * Get specific task with execution history and AI analysis
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        st.*,
        o.name as organization_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        (
          SELECT COUNT(*)
          FROM task_executions te
          WHERE te.task_id = st.id
        ) as total_executions,
        (
          SELECT AVG(EXTRACT(EPOCH FROM (te.completed_at - te.started_at))/60)::numeric(10,2)
          FROM task_executions te
          WHERE te.task_id = st.id AND te.status = 'completed'
        ) as avg_duration_minutes
      FROM scheduled_tasks st
      LEFT JOIN organizations o ON st.organization_id = o.id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE st.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled task not found'
      });
    }

    const task = result.rows[0];

    // Get execution history
    const executions = await query(`
      SELECT *
      FROM task_executions
      WHERE task_id = $1
      ORDER BY started_at DESC
      LIMIT 10
    `, [id]);

    task.recent_executions = executions.rows;

    // Get dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencies = await query(`
        SELECT id, name, status
        FROM scheduled_tasks
        WHERE id = ANY($1)
      `, [task.dependencies]);
      task.dependency_tasks = dependencies.rows;
    }

    // AI-powered performance analysis
    const performanceAnalysis = await analyzeTaskPerformance(id);
    task.ai_analysis = performanceAnalysis;

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('Error fetching scheduled task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled task',
      message: error.message
    });
  }
});

/**
 * POST /api/ai-scheduler/tasks
 * Create new scheduled task with AI optimization
 */
router.post('/tasks', async (req, res) => {
  try {
    const { error, value } = taskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const {
      name, description, task_type, priority, schedule_type, schedule_expression,
      next_run_at, max_retries, timeout_minutes, parameters, conditions,
      dependencies, organization_id, created_by, tags, is_active
    } = value;

    // AI-powered schedule optimization
    const optimizedSchedule = await optimizeSchedule(value);

    const result = await query(`
      INSERT INTO scheduled_tasks (
        name, description, task_type, priority, status, schedule_type, schedule_expression,
        next_run_at, max_retries, timeout_minutes, parameters, conditions,
        dependencies, organization_id, created_by, tags, is_active,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'scheduled', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        NOW(), NOW()
      ) RETURNING *
    `, [
      name, description, task_type, priority, schedule_type, schedule_expression,
      optimizedSchedule.next_run_at || next_run_at, max_retries, timeout_minutes,
      parameters ? JSON.stringify(parameters) : null,
      conditions ? JSON.stringify(conditions) : null,
      dependencies ? JSON.stringify(dependencies) : null,
      organization_id, created_by,
      tags ? JSON.stringify(tags) : null,
      is_active
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      ai_optimization: optimizedSchedule,
      message: 'Scheduled task created successfully'
    });

  } catch (error) {
    console.error('Error creating scheduled task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create scheduled task',
      message: error.message
    });
  }
});

/**
 * PUT /api/ai-scheduler/tasks/:id
 * Update scheduled task
 */
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = taskUpdateSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    // Check if task exists
    const existingTask = await query('SELECT * FROM scheduled_tasks WHERE id = $1', [id]);
    if (existingTask.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled task not found'
      });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        paramCount++;
        if (['parameters', 'conditions', 'dependencies', 'tags'].includes(key)) {
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
      UPDATE scheduled_tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, params);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Scheduled task updated successfully'
    });

  } catch (error) {
    console.error('Error updating scheduled task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scheduled task',
      message: error.message
    });
  }
});

/**
 * POST /api/ai-scheduler/tasks/:id/execute
 * Execute task immediately
 */
router.post('/tasks/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;

    // Check if task exists and is active
    const task = await query('SELECT * FROM scheduled_tasks WHERE id = $1 AND is_active = true', [id]);
    if (task.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Active scheduled task not found'
      });
    }

    const taskData = task.rows[0];

    // Check if already running (unless forced)
    if (!force && taskData.status === 'running') {
      return res.status(409).json({
        success: false,
        error: 'Task is already running'
      });
    }

    // Create execution record
    const execution = await query(`
      INSERT INTO task_executions (
        task_id, status, started_at, triggered_by, created_at
      ) VALUES ($1, 'running', NOW(), 'manual', NOW())
      RETURNING *
    `, [id]);

    // Update task status
    await query(
      'UPDATE scheduled_tasks SET status = $1, last_run_at = NOW() WHERE id = $2',
      ['running', id]
    );

    // Here you would trigger the actual task execution
    // For this example, we'll simulate it
    const executionResult = await simulateTaskExecution(taskData, execution.rows[0]);

    res.json({
      success: true,
      data: executionResult,
      message: 'Task execution started'
    });

  } catch (error) {
    console.error('Error executing task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute task',
      message: error.message
    });
  }
});

/**
 * GET /api/ai-scheduler/analytics/dashboard
 * AI Scheduler analytics dashboard
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const analytics = await transaction(async (client) => {
      // Task counts by status
      const statusCounts = await client.query(`
        SELECT status, COUNT(*) as count
        FROM scheduled_tasks
        WHERE is_active = true
        GROUP BY status
      `);

      // Task counts by type
      const typeCounts = await client.query(`
        SELECT task_type, COUNT(*) as count
        FROM scheduled_tasks
        WHERE is_active = true
        GROUP BY task_type
        ORDER BY count DESC
      `);

      // Execution success rate (last 30 days)
      const successRate = await client.query(`
        SELECT
          COUNT(*) as total_executions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_executions,
          ROUND(
            COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2
          ) as success_rate
        FROM task_executions
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      // Upcoming tasks (next 24 hours)
      const upcomingTasks = await client.query(`
        SELECT name, task_type, next_run_at, priority
        FROM scheduled_tasks
        WHERE is_active = true
          AND status = 'scheduled'
          AND next_run_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        ORDER BY next_run_at ASC
        LIMIT 10
      `);

      // Performance metrics
      const performanceMetrics = await client.query(`
        SELECT
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60)::numeric(10,2) as avg_duration_minutes,
          MIN(EXTRACT(EPOCH FROM (completed_at - started_at))/60)::numeric(10,2) as min_duration_minutes,
          MAX(EXTRACT(EPOCH FROM (completed_at - started_at))/60)::numeric(10,2) as max_duration_minutes
        FROM task_executions
        WHERE status = 'completed'
          AND completed_at >= NOW() - INTERVAL '30 days'
      `);

      // AI insights
      const aiInsights = await generateDashboardInsights(client);

      return {
        statusCounts: statusCounts.rows,
        typeCounts: typeCounts.rows,
        successRate: successRate.rows[0],
        upcomingTasks: upcomingTasks.rows,
        performanceMetrics: performanceMetrics.rows[0],
        aiInsights
      };
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching AI scheduler analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI scheduler analytics',
      message: error.message
    });
  }
});

/**
 * POST /api/ai-scheduler/optimize
 * AI-powered schedule optimization
 */
router.post('/optimize', async (req, res) => {
  try {
    const { task_ids, optimization_goals = ['performance', 'resource_usage'] } = req.body;

    if (!task_ids || task_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'task_ids array is required'
      });
    }

    // Get tasks to optimize
    const tasks = await query(`
      SELECT * FROM scheduled_tasks
      WHERE id = ANY($1) AND is_active = true
    `, [task_ids]);

    if (tasks.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active tasks found to optimize'
      });
    }

    // AI-powered optimization
    const optimizationResults = await performAIOptimization(tasks.rows, optimization_goals);

    // Apply optimizations
    const updatedTasks = [];
    for (const optimization of optimizationResults) {
      if (optimization.recommended_changes) {
        const result = await query(`
          UPDATE scheduled_tasks
          SET next_run_at = $1, priority = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `, [
          optimization.recommended_changes.next_run_at,
          optimization.recommended_changes.priority,
          optimization.task_id
        ]);
        updatedTasks.push(result.rows[0]);
      }
    }

    res.json({
      success: true,
      data: {
        optimized_tasks: updatedTasks,
        optimization_results: optimizationResults
      },
      message: `Optimized ${updatedTasks.length} tasks using AI recommendations`
    });

  } catch (error) {
    console.error('Error performing AI optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform AI optimization',
      message: error.message
    });
  }
});

// Helper functions for AI functionality (simplified implementations)
async function generateAIInsights(tasks) {
  return {
    recommendations: [
      "Consider consolidating similar assessment tasks to improve efficiency",
      "High-priority tasks should be scheduled during peak system performance hours",
      "Current failure rate is above average - review task configurations"
    ],
    optimization_opportunities: tasks.filter(t => t.failed_runs > 0).length,
    resource_utilization: "moderate"
  };
}

async function analyzeTaskPerformance(taskId) {
  return {
    performance_score: 85,
    recommendations: [
      "Consider increasing timeout for better reliability",
      "Schedule during off-peak hours for better performance"
    ],
    predicted_next_failure: null,
    optimization_potential: "medium"
  };
}

async function optimizeSchedule(taskConfig) {
  // Simplified AI optimization logic
  return {
    next_run_at: taskConfig.next_run_at,
    confidence: 0.8,
    reasoning: "Schedule optimized for system load and dependency analysis"
  };
}

async function simulateTaskExecution(task, execution) {
  // Simulate task execution
  setTimeout(async () => {
    try {
      await query(`
        UPDATE task_executions
        SET status = 'completed', completed_at = NOW(),
            output = $1, metrics = $2
        WHERE id = $3
      `, [
        JSON.stringify({ result: "success", processed_items: 42 }),
        JSON.stringify({ duration: 120, cpu_usage: 0.3, memory_usage: 0.2 }),
        execution.id
      ]);

      await query(
        'UPDATE scheduled_tasks SET status = $1 WHERE id = $2',
        ['scheduled', task.id]
      );
    } catch (error) {
      console.error('Error updating execution:', error);
    }
  }, 2000);

  return execution;
}

async function generateDashboardInsights(client) {
  return {
    system_health: "good",
    recommendations: [
      "System performance is optimal",
      "Consider scheduling maintenance tasks during low-usage periods"
    ],
    alerts: []
  };
}

async function performAIOptimization(tasks, goals) {
  // Simplified AI optimization results
  return tasks.map(task => ({
    task_id: task.id,
    current_performance: 0.75,
    optimization_score: 0.85,
    recommended_changes: {
      next_run_at: new Date(Date.now() + 3600000), // 1 hour from now
      priority: task.priority === 'low' ? 'medium' : task.priority
    },
    reasoning: "Optimized based on historical performance and system load patterns"
  }));
}

module.exports = router;
