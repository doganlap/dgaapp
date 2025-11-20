/**
 * Audit Logs API Routes
 * Handles system audit trails, activity logs, and compliance tracking
 */

const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const router = express.Router();

/**
 * GET /api/audit-logs
 * Get audit logs with filtering and pagination
 */
router.get('/', authenticateToken, requirePermission('audit:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      action,
      user_id,
      start_date,
      end_date,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (action) {
      paramCount++;
      whereClause += ` AND action = $${paramCount}`;
      params.push(action);
    }

    if (user_id) {
      paramCount++;
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (start_date) {
      paramCount++;
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (description ILIKE $${paramCount} OR details::text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await query(`
      SELECT 
        al.*,
        u.first_name,
        u.last_name,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM audit_logs al
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
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/audit-logs/:id
 * Get specific audit log entry
 */
router.get('/:id', authenticateToken, requirePermission('audit:read'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        al.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Audit log entry not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log',
      message: error.message
    });
  }
});

/**
 * POST /api/audit-logs
 * Create audit log entry
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      category,
      action,
      description,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent
    } = req.body;

    const result = await query(`
      INSERT INTO audit_logs (
        user_id, category, action, description, resource_type, 
        resource_id, details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.user.id, category, action, description, resource_type,
      resource_id, JSON.stringify(details), ip_address, user_agent
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Audit log entry created successfully'
    });

  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create audit log entry',
      message: error.message
    });
  }
});

/**
 * GET /api/audit-logs/users/:userId
 * Get user activity logs
 */
router.get('/users/:userId', authenticateToken, requirePermission('audit:read'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, days = 30 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT 
        al.*,
        u.first_name,
        u.last_name,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1 
        AND al.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity logs',
      message: error.message
    });
  }
});

/**
 * GET /api/audit-logs/security
 * Get security events
 */
router.get('/security', authenticateToken, requirePermission('audit:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, severity } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE category IN ('security', 'authentication', 'authorization')";
    let params = [limit, offset];
    let paramCount = 2;

    if (severity) {
      paramCount++;
      whereClause += ` AND severity = $${paramCount}`;
      params.push(severity);
    }

    const result = await query(`
      SELECT 
        al.*,
        u.first_name,
        u.last_name,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security events',
      message: error.message
    });
  }
});

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics
 */
router.get('/stats', authenticateToken, requirePermission('audit:read'), async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN category = 'security' THEN 1 END) as security_events,
        COUNT(CASE WHEN category = 'authentication' THEN 1 END) as auth_events,
        COUNT(CASE WHEN category = 'data' THEN 1 END) as data_events,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_events
      FROM audit_logs 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `);

    // Get top actions
    const actionsResult = await query(`
      SELECT action, COUNT(*) as count
      FROM audit_logs 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get daily activity
    const dailyResult = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        summary: result.rows[0],
        top_actions: actionsResult.rows,
        daily_activity: dailyResult.rows
      }
    });

  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/audit-logs/search
 * Advanced search for audit logs
 */
router.post('/search', authenticateToken, requirePermission('audit:read'), async (req, res) => {
  try {
    const {
      query: searchQuery,
      filters = {},
      date_range = {},
      page = 1,
      limit = 20
    } = req.body;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramCount = 0;

    // Add search query
    if (searchQuery) {
      paramCount++;
      whereClause += ` AND (description ILIKE $${paramCount} OR details::text ILIKE $${paramCount})`;
      params.push(`%${searchQuery}%`);
    }

    // Add filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        paramCount++;
        whereClause += ` AND ${key} = $${paramCount}`;
        params.push(filters[key]);
      }
    });

    // Add date range
    if (date_range.start) {
      paramCount++;
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(date_range.start);
    }

    if (date_range.end) {
      paramCount++;
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(date_range.end);
    }

    const result = await query(`
      SELECT 
        al.*,
        u.first_name,
        u.last_name,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Search audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search audit logs',
      message: error.message
    });
  }
});

module.exports = router;
