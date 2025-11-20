const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// ============================================================================
// RENEWAL OPPORTUNITIES ROUTES
// ============================================================================

// GET /api/renewals - Get renewal pipeline (120-day view)
router.get('/', async (req, res) => {
  try {
    const { status, churn_risk, days_range = 120 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      whereConditions.push(`ro.status = $${paramCount}`);
      queryParams.push(status);
    }
    
    if (churn_risk) {
      paramCount++;
      whereConditions.push(`ro.churn_risk = $${paramCount}`);
      queryParams.push(churn_risk);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'AND ' + whereConditions.join(' AND ')
      : '';
    
    const { rows } = await query(`
      SELECT * FROM v_renewals_120d
      WHERE days_until_expiry <= $${paramCount + 1}
      ${whereClause}
      ORDER BY days_until_expiry ASC
    `, [...queryParams, parseInt(days_range)]);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching renewals:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/renewals/:id - Get single renewal opportunity
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await query(`
      SELECT ro.*, 
        tl.tenant_id,
        tl.price_paid as current_arr,
        tl.end_date as license_end_date,
        l.name as license_name,
        l.sku
      FROM renewal_opportunities ro
      JOIN tenant_licenses tl ON ro.tenant_license_id = tl.id
      JOIN licenses l ON tl.license_id = l.id
      WHERE ro.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Renewal opportunity not found' });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching renewal:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/renewals - Create renewal opportunity
router.post('/', async (req, res) => {
  try {
    const {
      tenant_license_id, renewal_type, proposed_arr, assigned_to,
      discount_offered, price_increase_pct
    } = req.body;
    
    // Get current license info
    const licenseResult = await query(`
      SELECT price_paid, end_date FROM tenant_licenses WHERE id = $1
    `, [tenant_license_id]);
    
    if (licenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant license not found' });
    }
    
    const currentARR = licenseResult.rows[0].price_paid;
    const endDate = licenseResult.rows[0].end_date;
    const renewalTargetDate = new Date(endDate);
    renewalTargetDate.setDate(renewalTargetDate.getDate() - 30); // 30 days before
    
    const { rows } = await query(`
      INSERT INTO renewal_opportunities (
        tenant_license_id, renewal_type, current_arr, proposed_arr,
        value_change, license_end_date, renewal_target_date,
        assigned_to, discount_offered, price_increase_pct, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
      RETURNING *
    `, [
      tenant_license_id, renewal_type, currentARR, proposed_arr,
      (proposed_arr - currentARR), endDate, renewalTargetDate,
      assigned_to, discount_offered, price_increase_pct
    ]);
    
    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error creating renewal opportunity:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/renewals/:id/status - Update renewal status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, terms_accepted, renewed_at } = req.body;
    
    const { rows } = await query(`
      UPDATE renewal_opportunities
      SET status = $1,
          terms_accepted = COALESCE($2, terms_accepted),
          renewed_at = COALESCE($3, renewed_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, terms_accepted, renewed_at, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Renewal opportunity not found' });
    }
    
    // If renewed, update the tenant license
    if (status === 'renewed' && renewed_at) {
      await query(`
        UPDATE tenant_licenses
        SET last_renewal_date = $1,
            status = 'active'
        WHERE id = (SELECT tenant_license_id FROM renewal_opportunities WHERE id = $2)
      `, [renewed_at, id]);
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error updating renewal status:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/renewals/:id/assign - Assign renewal to user
router.put('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;
    
    const { rows } = await query(`
      UPDATE renewal_opportunities
      SET assigned_to = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [assigned_to, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Renewal opportunity not found' });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error assigning renewal:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/renewals/:id/risk - Update churn risk
router.put('/:id/risk', async (req, res) => {
  try {
    const { id } = req.params;
    const { churn_risk, health_score } = req.body;
    
    const { rows } = await query(`
      UPDATE renewal_opportunities
      SET churn_risk = $1,
          health_score = COALESCE($2, health_score),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [churn_risk, health_score, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Renewal opportunity not found' });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error updating churn risk:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DUNNING EXECUTION LOGS
// ============================================================================

// GET /api/renewals/dunning/logs - Get dunning execution logs
router.get('/dunning/logs', async (req, res) => {
  try {
    const { tenant_license_id, status, limit = 50 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    if (tenant_license_id) {
      paramCount++;
      whereConditions.push(`tenant_license_id = $${paramCount}`);
      queryParams.push(tenant_license_id);
    }
    
    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    queryParams.push(limit);
    
    const { rows } = await query(`
      SELECT del.*,
        tl.tenant_id,
        l.name as license_name
      FROM dunning_execution_log del
      JOIN tenant_licenses tl ON del.tenant_license_id = tl.id
      JOIN licenses l ON tl.license_id = l.id
      ${whereClause}
      ORDER BY del.executed_at DESC
      LIMIT $${paramCount + 1}
    `, queryParams);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching dunning logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RENEWAL ANALYTICS
// ============================================================================

// GET /api/renewals/analytics/summary - Get renewal pipeline summary
router.get('/analytics/summary', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        COUNT(*) as total_renewals,
        SUM(CASE WHEN days_until_expiry <= 30 THEN 1 ELSE 0 END) as expiring_30d,
        SUM(CASE WHEN days_until_expiry <= 60 THEN 1 ELSE 0 END) as expiring_60d,
        SUM(CASE WHEN days_until_expiry <= 90 THEN 1 ELSE 0 END) as expiring_90d,
        SUM(current_arr) as total_arr_at_risk,
        SUM(CASE WHEN renewal_status = 'won' THEN proposed_arr ELSE 0 END) as arr_secured,
        SUM(CASE WHEN churn_risk = 'critical' THEN 1 ELSE 0 END) as critical_risk_count,
        SUM(CASE WHEN churn_risk = 'high' THEN 1 ELSE 0 END) as high_risk_count,
        AVG(avg_usage_percentage) as avg_usage_rate
      FROM v_renewals_120d
    `);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching renewal analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/renewals/analytics/by-month - Get renewals grouped by month
router.get('/analytics/by-month', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        DATE_TRUNC('month', end_date) as month,
        COUNT(*) as renewal_count,
        SUM(current_arr) as total_arr,
        AVG(avg_usage_percentage) as avg_usage
      FROM v_renewals_120d
      GROUP BY DATE_TRUNC('month', end_date)
      ORDER BY month ASC
    `);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching monthly renewals:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
