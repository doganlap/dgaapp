/**
 * Multi-Database Dashboard Routes
 * Updated to work with 3-database architecture:
 * - Compliance: shahin_ksa_compliance
 * - Finance: grc_master  
 * - Auth: shahin_access_control
 */

const express = require('express');
const { dbQueries } = require('../config/database');
const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get comprehensive dashboard statistics from all 3 databases
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

    // Fetch data from all 3 databases in parallel
    const [complianceStats, financeStats, authStats] = await Promise.all([
      // Compliance Database Stats
      dbQueries.compliance.query(`
        SELECT 
          COUNT(DISTINCT a.id) as assessments_count,
          COUNT(DISTINCT f.id) as frameworks_count,
          COUNT(DISTINCT fc.id) as controls_count,
          COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_assessments,
          COUNT(CASE WHEN a.status = 'in_progress' THEN 1 END) as in_progress_assessments,
          COALESCE(AVG(
            CASE
              WHEN a.status = 'completed' THEN 100
              WHEN a.status = 'in_progress' THEN 50
              WHEN a.status = 'draft' THEN 25
              ELSE 0
            END
          ), 0) as compliance_score
        FROM assessments a
        FULL OUTER JOIN frameworks f ON true
        FULL OUTER JOIN framework_controls fc ON f.id = fc.framework_id
        WHERE a.id IS NULL OR a.tenant_id = $1
      `, [tenantId]),

      // Finance Database Stats  
      dbQueries.finance.query(`
        SELECT 
          COUNT(DISTINCT t.id) as tenants_count,
          COUNT(DISTINCT o.id) as organizations_count,
          COUNT(DISTINCT tl.id) as licenses_count,
          COUNT(DISTINCT s.id) as subscriptions_count,
          COUNT(CASE WHEN tl.status = 'active' THEN 1 END) as active_licenses,
          COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions
        FROM tenants t
        LEFT JOIN organizations o ON t.id = o.tenant_id
        LEFT JOIN tenant_licenses tl ON t.id = tl.tenant_id
        LEFT JOIN subscriptions s ON t.id = s.tenant_id
        WHERE t.id = $1
      `, [tenantId]),

      // Auth Database Stats
      dbQueries.auth.query(`
        SELECT 
          COUNT(DISTINCT u.id) as users_count,
          COUNT(DISTINCT r.id) as roles_count,
          COUNT(DISTINCT p.id) as permissions_count,
          COUNT(DISTINCT us.id) as active_sessions_count,
          COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users
        FROM users u
        FULL OUTER JOIN roles r ON true
        FULL OUTER JOIN permissions p ON true
        LEFT JOIN user_sessions us ON u.id = us.user_id AND us.expires_at > NOW()
      `)
    ]);

    // Combine stats from all databases
    const complianceData = complianceStats.rows[0] || {};
    const financeData = financeStats.rows[0] || {};
    const authData = authStats.rows[0] || {};

    const stats = {
      // Compliance metrics
      assessments: parseInt(complianceData.assessments_count) || 0,
      frameworks: parseInt(complianceData.frameworks_count) || 0,
      controls: parseInt(complianceData.controls_count) || 0,
      completed_assessments: parseInt(complianceData.completed_assessments) || 0,
      in_progress_assessments: parseInt(complianceData.in_progress_assessments) || 0,
      compliance_score: Math.round(parseFloat(complianceData.compliance_score) * 10) / 10 || 0,
      
      // Finance metrics
      organizations: parseInt(financeData.organizations_count) || 0,
      licenses: parseInt(financeData.licenses_count) || 0,
      subscriptions: parseInt(financeData.subscriptions_count) || 0,
      active_licenses: parseInt(financeData.active_licenses) || 0,
      active_subscriptions: parseInt(financeData.active_subscriptions) || 0,
      
      // Auth metrics
      users: parseInt(authData.users_count) || 0,
      roles: parseInt(authData.roles_count) || 0,
      permissions: parseInt(authData.permissions_count) || 0,
      active_sessions: parseInt(authData.active_sessions_count) || 0,
      active_users: parseInt(authData.active_users) || 0,
      
      // Meta information
      databases: {
        compliance: 'shahin_ksa_compliance',
        finance: 'grc_master',
        auth: 'shahin_access_control'
      },
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats,
      source: 'multi-database',
      databases_queried: 3
    });
  } catch (error) {
    console.error('[Multi-DB Dashboard] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      message: error.message,
      source: 'multi-database'
    });
  }
});

/**
 * GET /api/dashboard/activity
 * Get recent activity from all databases
 */
router.get('/activity', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const limit = parseInt(req.query.limit) || 10;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    // Get activities from all databases - simplified queries
    const [complianceActivity, financeActivity, authActivity] = await Promise.all([
      // Compliance activities - simplified
      dbQueries.compliance.query(`
        SELECT 
          'assessment' as type,
          a.id as entity_id,
          a.name as title,
          'Assessment: ' || a.name as description,
          a.status as action,
          a.created_at as timestamp
        FROM assessments a
        ORDER BY a.created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)]),

      // Finance activities - simplified
      dbQueries.finance.query(`
        SELECT 
          'tenant' as type,
          t.id as entity_id,
          t.name as title,
          'Tenant: ' || t.name as description,
          t.status as action,
          t.created_at as timestamp
        FROM tenants t
        ORDER BY t.created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)]),

      // Auth activities - simplified
      dbQueries.auth.query(`
        SELECT 
          'user' as type,
          u.id as entity_id,
          u.email as title,
          'User: ' || u.email as description,
          CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END as action,
          u.created_at as timestamp
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)])
    ]);

    // Combine and sort activities
    const allActivities = [
      ...complianceActivity.rows.map(row => ({ ...row, source: 'compliance' })),
      ...financeActivity.rows.map(row => ({ ...row, source: 'finance' })),
      ...authActivity.rows.map(row => ({ ...row, source: 'auth' }))
    ];

    // Sort by timestamp and limit
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(activity => ({
        ...activity,
        time: formatTimeAgo(activity.timestamp),
        database: activity.source
      }));

    res.json({
      success: true,
      data: sortedActivities,
      source: 'multi-database',
      databases_queried: 3,
      pagination: {
        limit,
        total: sortedActivities.length
      }
    });
  } catch (error) {
    console.error('[Multi-DB Dashboard] Activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard activity',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/compliance
 * Get compliance metrics from compliance database
 */
router.get('/compliance', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    
    const complianceMetrics = await dbQueries.compliance.query(`
      SELECT 
        f.name as framework_name,
        COUNT(DISTINCT fc.id) as total_controls,
        COUNT(DISTINCT ar.id) as assessed_controls,
        AVG(CASE WHEN ar.compliance_score > 0 THEN ar.compliance_score END) as avg_score,
        COUNT(CASE WHEN ar.compliance_score >= 80 THEN 1 END) as compliant_controls,
        COUNT(CASE WHEN ar.compliance_score < 80 AND ar.compliance_score > 0 THEN 1 END) as non_compliant_controls
      FROM frameworks f
      LEFT JOIN framework_controls fc ON f.id = fc.framework_id
      LEFT JOIN assessment_responses ar ON fc.id = ar.control_id
      LEFT JOIN assessments a ON ar.assessment_id = a.id
      WHERE a.tenant_id = $1 OR a.id IS NULL
      GROUP BY f.id, f.name
      ORDER BY f.name
    `, [tenantId]);

    res.json({
      success: true,
      data: complianceMetrics.rows,
      source: 'compliance_database'
    });
  } catch (error) {
    console.error('[Multi-DB Dashboard] Compliance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/cross-db-summary
 * Get summary data from all databases for overview
 */
router.get('/cross-db-summary', async (req, res) => {
  try {
    const [complianceHealth, financeHealth, authHealth] = await Promise.all([
      dbQueries.compliance.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\''),
      dbQueries.finance.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\''),
      dbQueries.auth.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'')
    ]);

    const summary = {
      databases: {
        compliance: {
          name: 'shahin_ksa_compliance',
          tables: parseInt(complianceHealth.rows[0].table_count),
          status: 'connected',
          purpose: 'KSA Compliance Workflows'
        },
        finance: {
          name: 'grc_master',
          tables: parseInt(financeHealth.rows[0].table_count),
          status: 'connected',
          purpose: 'Finance & Administration'
        },
        auth: {
          name: 'shahin_access_control',
          tables: parseInt(authHealth.rows[0].table_count),
          status: 'connected',
          purpose: 'Access & Authority Control'
        }
      },
      architecture: '3-database',
      last_checked: new Date().toISOString()
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[Multi-DB Dashboard] Cross-DB summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cross-database summary',
      message: error.message
    });
  }
});

// Helper function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

module.exports = router;
