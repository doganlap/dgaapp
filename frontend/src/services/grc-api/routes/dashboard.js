const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get overall dashboard statistics with tenant filtering
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'x-tenant-id header is required'
      });
    }

    // Get counts for various entities
    const [
      assessmentsResult,
      organizationsResult,
      frameworksResult,
      controlsResult,
      usersResult
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM assessments WHERE tenant_id = $1', [tenantId]),
      query('SELECT COUNT(*) as count FROM organizations WHERE tenant_id = $1', [tenantId]),
      query('SELECT COUNT(*) as count FROM grc_frameworks'),
      query('SELECT COUNT(*) as count FROM grc_controls'),
      query('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1', [tenantId])
    ]);

    // Calculate simple compliance score based on completed assessments
    const complianceResult = await query(`
      SELECT
        COALESCE(AVG(
          CASE
            WHEN status = 'completed' THEN 100
            WHEN status = 'in_progress' THEN 50
            WHEN status = 'draft' THEN 25
            ELSE 0
          END
        ), 0) as compliance_score
      FROM assessments
      WHERE tenant_id = $1
    `, [tenantId]);

    const stats = {
      assessments: parseInt(assessmentsResult.rows[0].count),
      organizations: parseInt(organizationsResult.rows[0].count),
      frameworks: parseInt(frameworksResult.rows[0].count),
      controls: parseInt(controlsResult.rows[0].count),
      users: parseInt(usersResult.rows[0].count),
      compliance_score: Math.round(parseFloat(complianceResult.rows[0].compliance_score) * 10) / 10
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Dashboard] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/activity
 * Get recent activity/audit logs from activities table
 */
router.get('/activity', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'x-tenant-id header is required'
      });
    }
    
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    try {
      // Try to get from activities table first
      const activitiesResult = await query(`
        SELECT
          id,
          title,
          description,
          activity_type as action,
          entity_type,
          entity_id,
          user_id,
          metadata,
          created_at as timestamp
        FROM activities
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [tenantId, limit, offset]);

      if (activitiesResult.rows.length > 0) {
        const activities = activitiesResult.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          action: row.action || 'activity',
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          user_id: row.user_id,
          timestamp: row.timestamp,
          time: formatTimeAgo(row.timestamp),
          metadata: row.metadata || {}
        }));

        return res.json({
          success: true,
          data: activities,
          pagination: {
            limit,
            offset,
            total: activities.length
          }
        });
      }
    } catch (tableError) {
      console.log('[Dashboard] Activities table not ready, using fallback');
    }

    // Fallback: Generate recent activities from core tables
    const fallbackQuery = `
      WITH recent_activities AS (
        -- Organization activities
        SELECT
          id as entity_id,
          'organization' as entity_type,
          name as title,
          'Organization: ' || name as description,
          created_at as timestamp,
          'create' as action,
          created_by as user_id
        FROM organizations
        WHERE tenant_id = $1
        
        UNION ALL
        
        -- Assessment activities
        SELECT
          id as entity_id,
          'assessment' as entity_type,
          title as title,
          'Assessment: ' || title as description,
          created_at as timestamp,
          'create' as action,
          created_by as user_id
        FROM assessments
        WHERE tenant_id = $1
        
        UNION ALL
        
        -- User activities
        SELECT
          id as entity_id,
          'user' as entity_type,
          COALESCE(first_name || ' ' || last_name, email) as title,
          'User registered: ' || COALESCE(first_name || ' ' || last_name, email) as description,
          created_at as timestamp,
          'create' as action,
          id as user_id
        FROM users
        WHERE tenant_id = $1
      )
      SELECT *
      FROM recent_activities
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(fallbackQuery, [tenantId, limit, offset]);

    const activities = result.rows.map(row => ({
      id: row.entity_id,
      title: row.title,
      description: row.description,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      user_id: row.user_id,
      timestamp: row.timestamp,
      time: formatTimeAgo(row.timestamp),
      metadata: {}
    }));

    res.json({
      success: true,
      data: activities,
      pagination: {
        limit,
        offset,
        total: activities.length
      }
    });

  } catch (error) {
    console.error('[Dashboard] Activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard activity',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/compliance-overview
 * Get compliance overview statistics
 */
router.get('/compliance-overview', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'x-tenant-id header is required'
      });
    }

    // Get assessment status distribution
    const statusResult = await query(`
      SELECT
        status,
        COUNT(*) as count
      FROM assessments
      WHERE tenant_id = $1
      GROUP BY status
    `, [tenantId]);

    // Get recent assessments
    const recentResult = await query(`
      SELECT
        a.id,
        a.title,
        a.status,
        a.completion_date,
        a.created_at,
        o.name as organization_name
      FROM assessments a
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE a.tenant_id = $1
      ORDER BY a.created_at DESC
      LIMIT 5
    `, [tenantId]);

    const statusCounts = {};
    statusResult.rows.forEach(row => {
      statusCounts[row.status] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        status_distribution: statusCounts,
        recent_assessments: recentResult.rows
      }
    });

  } catch (error) {
    console.error('[Dashboard] Compliance overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance overview',
      message: error.message
    });
  }
});

// Helper function to format time ago
function formatTimeAgo(date) {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  
  return new Date(date).toLocaleDateString();
}

module.exports = router;