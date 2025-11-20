const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// ============================================================================
// LICENSE CATALOG ROUTES (SKUs/Plans)
// ============================================================================

// GET /api/licenses - List all license plans
router.get('/', async (req, res) => {
  try {
    const { category, is_active = 'true' } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    if (is_active !== 'all') {
      paramCount++;
      whereConditions.push(`is_active = $${paramCount}`);
      queryParams.push(is_active === 'true');
    }
    
    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    const { rows } = await query(`
      SELECT *
      FROM licenses
      ${whereClause}
      ORDER BY 
        CASE category
          WHEN 'starter' THEN 1
          WHEN 'professional' THEN 2
          WHEN 'enterprise' THEN 3
          ELSE 4
        END,
        price_monthly ASC
    `, queryParams);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/licenses/:id - Get single license
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await query(`
      SELECT l.*,
        (SELECT jsonb_agg(
          jsonb_build_object(
            'feature_id', lf.id,
            'feature_code', lf.feature_code,
            'feature_name', lf.feature_name,
            'limit_type', lfm.limit_type,
            'limit_value', lfm.limit_value,
            'is_included', lfm.is_included
          )
        )
        FROM license_feature_map lfm
        JOIN license_features lf ON lfm.feature_id = lf.id
        WHERE lfm.license_id = l.id
        ) as features
      FROM licenses l
      WHERE l.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching license:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/licenses - Create new license (Platform Admin only)
router.post('/', async (req, res) => {
  try {
    const {
      sku, name, description, category, price_monthly, price_annual,
      currency, billing_cycle, trial_days, grace_period_days
    } = req.body;
    
    const { rows } = await query(`
      INSERT INTO licenses (
        sku, name, description, category, price_monthly, price_annual,
        currency, billing_cycle, trial_days, grace_period_days
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [sku, name, description, category, price_monthly, price_annual,
        currency, billing_cycle, trial_days, grace_period_days]);
    
    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error creating license:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/licenses/:id - Update license
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, price_monthly, price_annual, is_active
    } = req.body;
    
    const { rows } = await query(`
      UPDATE licenses
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price_monthly = COALESCE($3, price_monthly),
          price_annual = COALESCE($4, price_annual),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, description, price_monthly, price_annual, is_active, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error updating license:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TENANT LICENSE ROUTES
// ============================================================================

// GET /api/licenses/tenant/:tenant_id - Get tenant's licenses
router.get('/tenant/:tenant_id', async (req, res) => {
  try {
    const { tenant_id } = req.params;
    
    const { rows } = await query(`
      SELECT tl.*, l.name as license_name, l.sku, l.category
      FROM tenant_licenses tl
      JOIN licenses l ON tl.license_id = l.id
      WHERE tl.tenant_id = $1
      ORDER BY tl.end_date DESC
    `, [tenant_id]);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching tenant licenses:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/licenses/assign - Assign license to tenant
router.post('/assign', async (req, res) => {
  try {
    const {
      tenant_id, license_id, start_date, end_date, price_paid,
      user_limit, storage_gb_limit, api_calls_limit, auto_renew
    } = req.body;
    
    const { rows } = await query(`
      INSERT INTO tenant_licenses (
        tenant_id, license_id, start_date, end_date, price_paid,
        user_limit, storage_gb_limit, api_calls_limit, auto_renew, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
      RETURNING *
    `, [tenant_id, license_id, start_date, end_date, price_paid,
        user_limit, storage_gb_limit, api_calls_limit, auto_renew]);
    
    // Create license event
    await query(`
      INSERT INTO license_events (tenant_license_id, event_type, new_status, triggered_by)
      VALUES ($1, 'created', 'active', 'system')
    `, [rows[0].id]);
    
    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error assigning license:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/licenses/tenant/:id/suspend - Suspend tenant license
router.put('/tenant/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const { rows } = await query(`
      UPDATE tenant_licenses
      SET status = 'suspended',
          suspended_at = CURRENT_TIMESTAMP,
          suspended_reason = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [reason, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant license not found' });
    }
    
    // Create license event
    await query(`
      INSERT INTO license_events (
        tenant_license_id, event_type, old_status, new_status, reason, triggered_by
      )
      VALUES ($1, 'suspended', 'active', 'suspended', $2, 'system')
    `, [id, reason]);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error suspending license:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/licenses/tenant/:id/renew - Renew tenant license
router.put('/tenant/:id/renew', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_end_date, price_paid } = req.body;
    
    const { rows } = await query(`
      UPDATE tenant_licenses
      SET end_date = $1,
          price_paid = COALESCE($2, price_paid),
          last_renewal_date = CURRENT_TIMESTAMP,
          status = 'active',
          suspended_at = NULL,
          suspended_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [new_end_date, price_paid, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant license not found' });
    }
    
    // Create license event
    await query(`
      INSERT INTO license_events (
        tenant_license_id, event_type, new_end_date, triggered_by
      )
      VALUES ($1, 'renewed', $2, 'system')
    `, [id, new_end_date]);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error renewing license:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LICENSE FEATURES ROUTES
// ============================================================================

// GET /api/licenses/features - Get all license features
router.get('/features/all', async (req, res) => {
  try {
    const { module_name, layer_number } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    if (module_name) {
      paramCount++;
      whereConditions.push(`module_name = $${paramCount}`);
      queryParams.push(module_name);
    }
    
    if (layer_number) {
      paramCount++;
      whereConditions.push(`layer_number = $${paramCount}`);
      queryParams.push(parseInt(layer_number));
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    const { rows } = await query(`
      SELECT *
      FROM license_features
      ${whereClause}
      ORDER BY module_name, feature_code
    `, queryParams);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/licenses/:license_id/features - Add feature to license
router.post('/:license_id/features', async (req, res) => {
  try {
    const { license_id } = req.params;
    const { feature_id, is_included, limit_type, limit_value } = req.body;
    
    const { rows } = await query(`
      INSERT INTO license_feature_map (
        license_id, feature_id, is_included, limit_type, limit_value
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [license_id, feature_id, is_included, limit_type, limit_value]);
    
    res.status(201).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error adding feature to license:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
