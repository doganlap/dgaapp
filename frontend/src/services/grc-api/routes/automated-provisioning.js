/**
 * Automated Tenant Provisioning API Routes
 * Fully automated tenant lifecycle management without human intervention
 */

const express = require('express');
const AutomatedTenantProvisioning = require('../services/AutomatedTenantProvisioning');
const router = express.Router();

// Initialize automated provisioning service
const provisioningService = new AutomatedTenantProvisioning();

/**
 * POST /api/automated-provisioning/provision
 * Fully automated tenant provisioning without human intervention
 */
router.post('/provision', async (req, res) => {
  try {
    console.log('🤖 Received automated provisioning request');
    
    const provisioningData = req.body;
    
    // Validate required data (minimal requirements)
    if (!provisioningData.tenant_name && !provisioningData.tenant_code) {
      return res.status(400).json({
        success: false,
        error: 'Either tenant_name or tenant_code is required for automated provisioning'
      });
    }
    
    // Execute fully automated provisioning
    const result = await provisioningService.provisionTenantAutomatically(provisioningData);
    
    res.status(201).json({
      success: true,
      message: 'Tenant provisioned automatically without human intervention',
      data: result,
      automation: {
        human_intervention: false,
        fully_automated: true,
        provisioning_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Automated provisioning failed:', error);
    res.status(500).json({
      success: false,
      error: 'Automated provisioning failed',
      message: error.message,
      automation: {
        human_intervention: false,
        fully_automated: true,
        error_time: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/automated-provisioning/bulk
 * Bulk automated tenant provisioning
 */
router.post('/bulk', async (req, res) => {
  try {
    console.log('🚀 Received bulk automated provisioning request');
    
    const { tenants } = req.body;
    
    if (!Array.isArray(tenants) || tenants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of tenant data is required for bulk provisioning'
      });
    }
    
    // Execute bulk automated provisioning
    const result = await provisioningService.bulkProvisionTenantsAutomatically(tenants);
    
    res.status(201).json({
      success: true,
      message: `Bulk provisioning completed: ${result.successful}/${result.total} tenants provisioned`,
      data: result,
      automation: {
        human_intervention: false,
        fully_automated: true,
        bulk_provisioning: true,
        total_tenants: result.total,
        successful_tenants: result.successful,
        failed_tenants: result.failed
      }
    });
    
  } catch (error) {
    console.error('❌ Bulk automated provisioning failed:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk automated provisioning failed',
      message: error.message
    });
  }
});

/**
 * POST /api/automated-provisioning/quick
 * Quick automated provisioning with minimal data
 */
router.post('/quick', async (req, res) => {
  try {
    console.log('⚡ Received quick automated provisioning request');
    
    // Generate minimal required data automatically
    const timestamp = Date.now();
    const quickProvisioningData = {
      tenant_name: req.body.tenant_name || `Quick Tenant ${timestamp}`,
      tenant_code: req.body.tenant_code || `quick-${timestamp}`,
      organization_name: req.body.organization_name || `Quick Organization ${timestamp}`,
      admin_email: req.body.admin_email || `admin${timestamp}@quick-tenant.com`,
      admin_username: req.body.admin_username || `admin${timestamp}`,
      ...req.body // Allow override of any defaults
    };
    
    // Execute quick automated provisioning
    const result = await provisioningService.provisionTenantAutomatically(quickProvisioningData);
    
    res.status(201).json({
      success: true,
      message: 'Quick tenant provisioning completed automatically',
      data: result,
      automation: {
        human_intervention: false,
        fully_automated: true,
        quick_provisioning: true,
        generated_data: {
          tenant_name: quickProvisioningData.tenant_name,
          tenant_code: quickProvisioningData.tenant_code,
          admin_email: quickProvisioningData.admin_email
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Quick automated provisioning failed:', error);
    res.status(500).json({
      success: false,
      error: 'Quick automated provisioning failed',
      message: error.message
    });
  }
});

/**
 * GET /api/automated-provisioning/status/:tenantId
 * Check automated provisioning status
 */
router.get('/status/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Query tenant status and related entities
    const { query } = require('../config/database');
    
    // First get tenant basic info
    const tenantResult = await query(`
      SELECT id, tenant_code, name, status, created_at
      FROM tenants 
      WHERE id = $1
    `, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }
    
    const tenant = tenantResult.rows[0];
    
    // Get counts separately to handle missing tables gracefully
    let organizationsCount = 0, usersCount = 0, assessmentsCount = 0, subscriptionsCount = 0;
    
    try {
      const orgResult = await query('SELECT COUNT(*) as count FROM organizations WHERE tenant_id = $1', [tenantId]);
      organizationsCount = parseInt(orgResult.rows[0].count);
    } catch (e) { /* organizations table might not exist */ }
    
    try {
      const userResult = await query('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1', [tenantId]);
      usersCount = parseInt(userResult.rows[0].count);
    } catch (e) { /* users table might not exist */ }
    
    try {
      const assessmentResult = await query('SELECT COUNT(*) as count FROM assessments WHERE tenant_id = $1', [tenantId]);
      assessmentsCount = parseInt(assessmentResult.rows[0].count);
    } catch (e) { /* assessments table might not exist */ }
    
    try {
      const subscriptionResult = await query('SELECT COUNT(*) as count FROM subscriptions WHERE tenant_id = $1', [tenantId]);
      subscriptionsCount = parseInt(subscriptionResult.rows[0].count);
    } catch (e) { /* subscriptions table might not exist */ }
    
    const statusResult = {
      rows: [{
        tenant_id: tenant.id,
        tenant_code: tenant.tenant_code,
        tenant_name: tenant.name,
        tenant_status: tenant.status,
        tenant_created: tenant.created_at,
        organizations_count: organizationsCount,
        users_count: usersCount,
        assessments_count: assessmentsCount,
        subscriptions_count: subscriptionsCount
      }]
    };
    
    if (statusResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }
    
    const status = statusResult.rows[0];
    
    res.json({
      success: true,
      data: {
        tenant: {
          id: status.tenant_id,
          code: status.tenant_code,
          name: status.tenant_name,
          status: status.tenant_status,
          created_at: status.tenant_created
        },
        provisioning_status: {
          organizations: status.organizations_count,
          users: status.users_count,
          assessments: status.assessments_count,
          subscriptions: status.subscriptions_count,
          fully_provisioned: status.organizations_count > 0 && status.users_count > 0
        },
        automation: {
          human_intervention: false,
          automated_provisioning: true
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/automated-provisioning/cleanup
 * Cleanup automated test tenants
 */
router.delete('/cleanup', async (req, res) => {
  try {
    console.log('🧹 Cleaning up automated test tenants...');
    
    const result = await provisioningService.cleanupAutomatedTenants();
    
    res.json({
      success: true,
      message: `Cleaned up ${result.cleaned_count} automated tenants`,
      data: result,
      automation: {
        cleanup_operation: true,
        human_intervention: false
      }
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
});

/**
 * POST /api/automated-provisioning/demo
 * Create demo tenant automatically for testing
 */
router.post('/demo', async (req, res) => {
  try {
    console.log('🎭 Creating demo tenant automatically...');
    
    const timestamp = Date.now();
    const demoData = {
      tenant_name: `Demo Tenant ${timestamp}`,
      tenant_code: `demo-${timestamp}`,
      organization_name: `Demo Organization ${timestamp}`,
      admin_email: `demo${timestamp}@demo-tenant.com`,
      admin_username: `demo${timestamp}`,
      admin_first_name: 'Demo',
      admin_last_name: 'User',
      sector: 'technology',
      industry: 'software',
      size_category: 'medium',
      plan_name: 'professional'
    };
    
    const result = await provisioningService.provisionTenantAutomatically(demoData);
    
    res.status(201).json({
      success: true,
      message: 'Demo tenant created automatically',
      data: result,
      demo: {
        login_url: result.credentials.login_url,
        username: result.credentials.admin_username,
        password: result.credentials.admin_password,
        dashboard_url: result.credentials.dashboard_url
      },
      automation: {
        human_intervention: false,
        fully_automated: true,
        demo_tenant: true
      }
    });
    
  } catch (error) {
    console.error('❌ Demo tenant creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Demo tenant creation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/automated-provisioning/health
 * Check automated provisioning service health
 */
router.get('/health', async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    // Test database connectivity
    const dbTest = await query('SELECT NOW() as current_time');
    
    // Count automated tenants
    const tenantCount = await query(`
      SELECT COUNT(*) as count 
      FROM tenants 
      WHERE tenant_code LIKE 'auto-%' OR tenant_code LIKE 'demo-%' OR tenant_code LIKE 'quick-%'
    `);
    
    res.json({
      success: true,
      service: 'Automated Tenant Provisioning',
      status: 'healthy',
      database: 'connected',
      current_time: dbTest.rows[0].current_time,
      automated_tenants: parseInt(tenantCount.rows[0].count),
      automation: {
        human_intervention: false,
        fully_automated: true,
        service_operational: true
      }
    });
    
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'Automated Tenant Provisioning',
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
