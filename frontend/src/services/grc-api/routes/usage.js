const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// ============================================================================
// USAGE TRACKING & ENFORCEMENT ROUTES
// ============================================================================

// GET /api/usage/check-entitlement - Check if tenant has access to feature
router.get('/check-entitlement', async (req, res) => {
  try {
    const { tenant_id, feature_code } = req.query;
    
    if (!tenant_id || !feature_code) {
      return res.status(400).json({ 
        error: 'tenant_id and feature_code are required' 
      });
    }
    
    const { rows } = await query(`
      SELECT check_license_entitlement($1::uuid, $2::varchar) as result
    `, [tenant_id, feature_code]);
    
    const result = rows[0]?.result || {};
    
    if (!result.licensed) {
      return res.status(402).json({
        allowed: false,
        licensed: false,
        message: `Feature ${feature_code} requires an active license`,
        upgrade_url: '/platform/licenses/upgrade'
      });
    }
    
    // Check if expired
    if (new Date(result.end_date) < new Date()) {
      return res.status(402).json({
        allowed: false,
        licensed: false,
        expired: true,
        message: 'License has expired',
        end_date: result.end_date
      });
    }
    
    res.json({
      allowed: true,
      licensed: true,
      license_name: result.license_name,
      status: result.status,
      end_date: result.end_date
    });
  } catch (error) {
    console.error('Error checking entitlement:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/usage/check-limit - Check usage limits
router.get('/check-limit', async (req, res) => {
  try {
    const { tenant_id, usage_type } = req.query;
    
    if (!tenant_id || !usage_type) {
      return res.status(400).json({ 
        error: 'tenant_id and usage_type are required' 
      });
    }
    
    const { rows } = await query(`
      SELECT check_usage_limit($1::uuid, $2::varchar) as result
    `, [tenant_id, usage_type]);
    
    const result = rows[0]?.result || {};
    
    if (result.is_over_limit) {
      return res.status(429).json({
        allowed: false,
        over_limit: true,
        usage_type: usage_type,
        used: result.used_value,
        limit: result.limit_value,
        percentage: result.percentage_used,
        message: `${usage_type} limit exceeded`,
        suggest_upgrade: true
      });
    }
    
    res.json({
      allowed: true,
      usage_type: usage_type,
      used: result.used_value,
      limit: result.limit_value,
      percentage: result.percentage_used,
      warning: result.percentage_used >= 80 ? 'Approaching limit' : null
    });
  } catch (error) {
    console.error('Error checking usage limit:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usage/track - Track usage event
router.post('/track', async (req, res) => {
  try {
    const { tenant_id, feature_code, usage_type, value = 1 } = req.body;
    
    if (!tenant_id || !feature_code || !usage_type) {
      return res.status(400).json({ 
        error: 'tenant_id, feature_code, and usage_type are required' 
      });
    }
    
    // Get active tenant license
    const licenseResult = await query(`
      SELECT id FROM tenant_licenses
      WHERE tenant_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
      ORDER BY end_date DESC
      LIMIT 1
    `, [tenant_id]);
    
    if (licenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active license found' });
    }
    
    const tenantLicenseId = licenseResult.rows[0].id;
    
    // Get feature
    const featureResult = await query(`
      SELECT id FROM license_features WHERE feature_code = $1
    `, [feature_code]);
    
    if (featureResult.rows.length === 0) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    
    const featureId = featureResult.rows[0].id;
    
    // Get current period dates
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Upsert usage record
    const { rows } = await query(`
      INSERT INTO tenant_license_usage (
        tenant_license_id, feature_id, period_start, period_end,
        usage_type, used_value, limit_value
      )
      VALUES ($1, $2, $3, $4, $5, $6, 
        (SELECT limit_value FROM license_feature_map WHERE feature_id = $2 AND license_id = (
          SELECT license_id FROM tenant_licenses WHERE id = $1
        ))
      )
      ON CONFLICT (tenant_license_id, feature_id, period_start)
      DO UPDATE SET used_value = tenant_license_usage.used_value + $6
      RETURNING *
    `, [tenantLicenseId, featureId, periodStart, periodEnd, usage_type, value]);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/usage/tenant/:tenant_id - Get tenant's current usage
router.get('/tenant/:tenant_id', async (req, res) => {
  try {
    const { tenant_id } = req.params;
    
    const { rows } = await query(`
      SELECT 
        lf.feature_code,
        lf.feature_name,
        tlu.usage_type,
        tlu.used_value,
        tlu.limit_value,
        tlu.percentage_used,
        tlu.is_over_limit,
        tlu.period_start,
        tlu.period_end
      FROM tenant_license_usage tlu
      JOIN license_features lf ON tlu.feature_id = lf.id
      JOIN tenant_licenses tl ON tlu.tenant_license_id = tl.id
      WHERE tl.tenant_id = $1
        AND tl.status = 'active'
        AND tlu.period_start = DATE_TRUNC('month', CURRENT_DATE)
      ORDER BY tlu.percentage_used DESC
    `, [tenant_id]);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching tenant usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/usage/tenant/:tenant_id/history - Get usage history
router.get('/tenant/:tenant_id/history', async (req, res) => {
  try {
    const { tenant_id } = req.params;
    const { months = 6, usage_type } = req.query;
    
    let usageTypeFilter = '';
    let params = [tenant_id, months];
    
    if (usage_type) {
      usageTypeFilter = 'AND tlu.usage_type = $3';
      params.push(usage_type);
    }
    
    const { rows } = await query(`
      SELECT 
        tlu.period_start,
        tlu.period_end,
        tlu.usage_type,
        lf.feature_name,
        tlu.used_value,
        tlu.limit_value,
        tlu.percentage_used
      FROM tenant_license_usage tlu
      JOIN license_features lf ON tlu.feature_id = lf.id
      JOIN tenant_licenses tl ON tlu.tenant_license_id = tl.id
      WHERE tl.tenant_id = $1
        AND tlu.period_start >= CURRENT_DATE - INTERVAL '1 month' * $2
        ${usageTypeFilter}
      ORDER BY tlu.period_start DESC, tlu.usage_type
    `, params);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/usage/warnings - Get tenants approaching limits
router.get('/warnings', async (req, res) => {
  try {
    const { threshold = 80 } = req.query;
    
    const { rows } = await query(`
      SELECT 
        tl.tenant_id,
        lf.feature_code,
        lf.feature_name,
        tlu.usage_type,
        tlu.used_value,
        tlu.limit_value,
        tlu.percentage_used,
        tlu.is_over_limit
      FROM tenant_license_usage tlu
      JOIN tenant_licenses tl ON tlu.tenant_license_id = tl.id
      JOIN license_features lf ON tlu.feature_id = lf.id
      WHERE tl.status = 'active'
        AND tlu.period_start = DATE_TRUNC('month', CURRENT_DATE)
        AND tlu.percentage_used >= $1
      ORDER BY tlu.percentage_used DESC
    `, [threshold]);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching usage warnings:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LICENSE EVENTS (AUDIT TRAIL)
// ============================================================================

// GET /api/usage/events/:tenant_license_id - Get license event history
router.get('/events/:tenant_license_id', async (req, res) => {
  try {
    const { tenant_license_id } = req.params;
    const { limit = 50 } = req.query;
    
    const { rows } = await query(`
      SELECT *
      FROM license_events
      WHERE tenant_license_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [tenant_license_id, limit]);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching license events:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PLATFORM ANALYTICS
// ============================================================================

// GET /api/usage/analytics/platform - Platform-wide usage analytics
router.get('/analytics/platform', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        COUNT(DISTINCT tl.tenant_id) as total_tenants,
        COUNT(*) as total_active_licenses,
        SUM(CASE WHEN tlu.is_over_limit THEN 1 ELSE 0 END) as tenants_over_limit,
        AVG(tlu.percentage_used) as avg_usage_percentage,
        SUM(tlu.used_value) FILTER (WHERE tlu.usage_type = 'USERS') as total_users,
        SUM(tlu.used_value) FILTER (WHERE tlu.usage_type = 'STORAGE') as total_storage_gb,
        SUM(tlu.used_value) FILTER (WHERE tlu.usage_type = 'API_CALLS') as total_api_calls
      FROM tenant_licenses tl
      LEFT JOIN tenant_license_usage tlu ON tl.id = tlu.tenant_license_id
        AND tlu.period_start = DATE_TRUNC('month', CURRENT_DATE)
      WHERE tl.status = 'active'
    `);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/usage/analytics/revenue - Revenue metrics
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        SUM(price_paid) as total_arr,
        AVG(price_paid) as avg_arr_per_tenant,
        COUNT(*) as active_licenses,
        SUM(price_paid) FILTER (WHERE billing_cycle = 'monthly') * 12 as monthly_arr_annualized,
        SUM(price_paid) FILTER (WHERE billing_cycle = 'annual') as annual_arr
      FROM tenant_licenses
      WHERE status = 'active'
        AND end_date >= CURRENT_DATE
    `);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
