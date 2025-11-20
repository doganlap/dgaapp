const express = require('express');
const { query, transaction } = require('../../config/database');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole, requirePermission } = require('../../middleware/rbac');
const router = express.Router();

/**
 * GET /api/supervisor/departments
 * Get departments that supervisor can manage
 */
router.get('/departments',
  authenticateToken,
  requireRole(['supervisor_admin', 'super_admin']),
  async (req, res) => {
    try {
      let queryText, params = [];

      if (req.user.role === 'super_admin') {
        // Super admin can see all departments
        queryText = `
          SELECT
            d.*,
            COUNT(u.id) as user_count,
            COUNT(a.id) as assessment_count,
            t.name as tenant_name
          FROM departments d
          LEFT JOIN users u ON d.id = u.department_id AND u.status = 'active'
          LEFT JOIN assessments a ON d.id = a.department_id
          LEFT JOIN tenants t ON d.tenant_id = t.id
          GROUP BY d.id, t.name
          ORDER BY t.name, d.name
        `;
      } else {
        // Supervisor admin can only see departments within their tenant
        queryText = `
          SELECT
            d.*,
            COUNT(u.id) as user_count,
            COUNT(a.id) as assessment_count,
            t.name as tenant_name
          FROM departments d
          LEFT JOIN users u ON d.id = u.department_id AND u.status = 'active'
          LEFT JOIN assessments a ON d.id = a.department_id
          LEFT JOIN tenants t ON d.tenant_id = t.id
          WHERE d.tenant_id = $1
          GROUP BY d.id, t.name
          ORDER BY d.name
        `;
        params = [req.user.tenant_id];
      }

      const result = await query(queryText, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        userRole: req.user.role
      });

    } catch (error) {
      console.error('Supervisor departments error:', error);
      res.status(500).json({
        success: false,
        error: 'Unable to fetch departments',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/supervisor/departments
 * Create new department (supervisor admin only within their tenant)
 */
router.post('/departments',
  authenticateToken,
  requireRole(['supervisor_admin', 'super_admin']),
  async (req, res) => {
    try {
      const { name, description, budget, managerId } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Department name is required'
        });
      }

      // Supervisor admin can only create departments in their tenant
      const tenantId = req.user.role === 'super_admin'
        ? req.body.tenantId || req.user.tenant_id
        : req.user.tenant_id;

      const result = await query(`
        INSERT INTO departments (name, description, budget, manager_id, tenant_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [name, description, budget, managerId, tenantId, req.user.id]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Department created successfully'
      });

    } catch (error) {
      console.error('Create department error:', error);
      res.status(500).json({
        success: false,
        error: 'Unable to create department',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/supervisor/users
 * Get users that supervisor can manage
 */
router.get('/users',
  authenticateToken,
  requireRole(['supervisor_admin', 'super_admin']),
  async (req, res) => {
    try {
      const { departmentId, status, role, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = ['u.tenant_id = $1'];
      let params = [req.user.tenant_id];
      let paramCount = 1;

      // Supervisor admin can only see users in their tenant
      if (req.user.role !== 'super_admin') {
        // Additional restrictions for supervisor admin if needed
      }

      if (departmentId) {
        paramCount++;
        whereConditions.push(`u.department_id = $${paramCount}`);
        params.push(departmentId);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`u.status = $${paramCount}`);
        params.push(status);
      }

      if (role) {
        paramCount++;
        whereConditions.push(`u.role = $${paramCount}`);
        params.push(role);
      }

      const queryText = `
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          u.status,
          u.last_login,
          u.created_at,
          d.name as department_name,
          t.name as tenant_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY u.last_name, u.first_name
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      params.push(limit, offset);

      const [usersResult, countResult] = await Promise.all([
        query(queryText, params),
        query(`
          SELECT COUNT(*) as total
          FROM users u
          WHERE ${whereConditions.join(' AND ')}
        `, params.slice(0, -2))
      ]);

      res.json({
        success: true,
        data: usersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Supervisor users error:', error);
      res.status(500).json({
        success: false,
        error: 'Unable to fetch users',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/supervisor/assessments
 * Get assessments for supervision
 */
router.get('/assessments',
  authenticateToken,
  requireRole(['supervisor_admin', 'super_admin']),
  async (req, res) => {
    try {
      const { status, departmentId, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = ['a.tenant_id = $1'];
      let params = [req.user.tenant_id];
      let paramCount = 1;

      if (departmentId) {
        paramCount++;
        whereConditions.push(`a.department_id = $${paramCount}`);
        params.push(departmentId);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`a.status = $${paramCount}`);
        params.push(status);
      }

      const queryText = `
        SELECT
          a.id,
          a.name,
          a.description,
          a.status,
          a.progress,
          a.due_date,
          a.created_at,
          a.updated_at,
          d.name as department_name,
          f.name as framework_name,
          u.first_name || ' ' || u.last_name as assessor_name
        FROM assessments a
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN grc_frameworks f ON a.framework_id = f.id
        LEFT JOIN users u ON a.assessor_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY a.due_date ASC, a.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      params.push(limit, offset);

      const [assessmentsResult, countResult] = await Promise.all([
        query(queryText, params),
        query(`
          SELECT COUNT(*) as total
          FROM assessments a
          WHERE ${whereConditions.join(' AND ')}
        `, params.slice(0, -2))
      ]);

      res.json({
        success: true,
        data: assessmentsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Supervisor assessments error:', error);
      res.status(500).json({
        success: false,
        error: 'Unable to fetch assessments',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/supervisor/assessments/:id/approve
 * Approve assessment (supervisor admin privilege)
 */
router.post('/assessments/:id/approve',
  authenticateToken,
  requireRole(['supervisor_admin', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      const result = await transaction(async (client) => {
        // Check if assessment exists and is in correct state
        const assessmentResult = await client.query(`
          SELECT * FROM assessments
          WHERE id = $1 AND tenant_id = $2
        `, [id, req.user.tenant_id]);

        if (assessmentResult.rows.length === 0) {
          throw new Error('Assessment not found');
        }

        const assessment = assessmentResult.rows[0];

        if (assessment.status !== 'submitted') {
          throw new Error('Assessment must be submitted before approval');
        }

        // Update assessment status to approved
        const updateResult = await client.query(`
          UPDATE assessments
          SET
            status = 'approved',
            approved_by = $1,
            approved_at = NOW(),
            supervisor_comments = $2,
            updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `, [req.user.id, comments, id]);

        // Log approval action
        await client.query(`
          INSERT INTO audit_logs (
            user_id, action, resource_type, resource_id,
            details, tenant_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          req.user.id,
          'ASSESSMENT_APPROVED',
          'assessment',
          id,
          JSON.stringify({
            assessmentName: assessment.name,
            approverRole: req.user.role,
            comments: comments
          }),
          req.user.tenant_id
        ]);

        return updateResult.rows[0];
      });

      res.json({
        success: true,
        data: result,
        message: 'Assessment approved successfully'
      });

    } catch (error) {
      console.error('Assessment approval error:', error);
      res.status(500).json({
        success: false,
        error: 'Unable to approve assessment',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/supervisor/dashboard
 * Supervisor admin dashboard data
 */
router.get('/dashboard',
  authenticateToken,
  requireRole(['supervisor_admin', 'super_admin']),
  async (req, res) => {
    try {
      const tenantId = req.user.tenant_id;

      const [
        departmentStats,
        assessmentStats,
        userStats,
        recentActivity
      ] = await Promise.all([
        // Department statistics
        query(`
          SELECT
            COUNT(*) as total_departments,
            COUNT(CASE WHEN manager_id IS NOT NULL THEN 1 END) as departments_with_managers
          FROM departments
          WHERE tenant_id = $1
        `, [tenantId]),

        // Assessment statistics
        query(`
          SELECT
            status,
            COUNT(*) as count
          FROM assessments
          WHERE tenant_id = $1
          GROUP BY status
        `, [tenantId]),

        // User statistics by department
        query(`
          SELECT
            d.name as department_name,
            COUNT(u.id) as user_count,
            COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users
          FROM departments d
          LEFT JOIN users u ON d.id = u.department_id
          WHERE d.tenant_id = $1
          GROUP BY d.id, d.name
          ORDER BY d.name
        `, [tenantId]),

        // Recent activity
        query(`
          SELECT
            al.action,
            al.resource_type,
            al.created_at,
            u.first_name || ' ' || u.last_name as user_name,
            al.details
          FROM audit_logs al
          JOIN users u ON al.user_id = u.id
          WHERE al.tenant_id = $1
          ORDER BY al.created_at DESC
          LIMIT 10
        `, [tenantId])
      ]);

      res.json({
        success: true,
        data: {
          departments: departmentStats.rows[0],
          assessments: assessmentStats.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
          }, {}),
          usersByDepartment: userStats.rows,
          recentActivity: recentActivity.rows
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Supervisor dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Unable to load dashboard',
        message: error.message
      });
    }
  }
);

module.exports = router;
