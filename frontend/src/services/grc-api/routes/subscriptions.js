const express = require('express');
const { query, transaction } = require('../config/database');
const Joi = require('joi');
const router = express.Router();

// Validation schemas
const subscriptionSchema = Joi.object({
  organization_id: Joi.string().uuid().required(),
  plan_name: Joi.string().valid(
    'starter', 'professional', 'enterprise', 'compliance_plus', 'audit_premium'
  ).required(),
  billing_cycle: Joi.string().valid('monthly', 'yearly').default('monthly'),
  max_users: Joi.number().integer().min(1).required(),
  max_organizations: Joi.number().integer().min(1).default(1),
  max_assessments: Joi.number().integer().min(1).optional(),
  max_storage_gb: Joi.number().integer().min(1).default(10),
  features: Joi.array().items(Joi.string()).required(),
  price: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('USD'),
  trial_end_date: Joi.date().optional(),
  starts_at: Joi.date().default(() => new Date()),
  ends_at: Joi.date().optional(),
  auto_renew: Joi.boolean().default(true),
  payment_method: Joi.string().optional(),
  billing_contact: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    company: Joi.string().optional(),
    address: Joi.string().optional()
  }).optional()
});

const usageSchema = Joi.object({
  subscription_id: Joi.string().uuid().required(),
  metric_name: Joi.string().valid(
    'active_users', 'storage_used', 'api_calls', 'assessments_created',
    'reports_generated', 'documents_processed', 'ai_queries'
  ).required(),
  value: Joi.number().min(0).required(),
  recorded_at: Joi.date().default(() => new Date())
});

const featureAccessSchema = Joi.object({
  feature_name: Joi.string().required(),
  is_enabled: Joi.boolean().required(),
  usage_limit: Joi.number().integer().min(0).optional(),
  reset_period: Joi.string().valid('daily', 'weekly', 'monthly').optional()
});

/**
 * GET /api/subscriptions
 * Get all subscriptions with filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      plan_name,
      organization_id,
      billing_cycle,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Search functionality
    if (search) {
      paramCount++;
      whereConditions.push(`(
        LOWER(o.name) LIKE LOWER($${paramCount}) OR
        LOWER(s.plan_name) LIKE LOWER($${paramCount})
      )`);
      queryParams.push(`%${search}%`);
    }

    // Filters
    if (status) {
      paramCount++;
      whereConditions.push(`s.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (plan_name) {
      paramCount++;
      whereConditions.push(`s.plan_name = $${paramCount}`);
      queryParams.push(plan_name);
    }

    if (organization_id) {
      paramCount++;
      whereConditions.push(`s.organization_id = $${paramCount}`);
      queryParams.push(organization_id);
    }

    if (billing_cycle) {
      paramCount++;
      whereConditions.push(`s.billing_cycle = $${paramCount}`);
      queryParams.push(billing_cycle);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM subscriptions s
      JOIN organizations o ON s.organization_id = o.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get subscriptions with pagination
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const subscriptionsQuery = `
      SELECT
        s.*,
        o.name as organization_name,
        CASE
          WHEN s.ends_at IS NULL OR s.ends_at > NOW() THEN 'active'
          ELSE 'expired'
        END as computed_status,
        CASE
          WHEN s.trial_end_date > NOW() THEN true
          ELSE false
        END as is_trial,
        (
          SELECT COUNT(*)
          FROM users u
          WHERE u.organization_id = s.organization_id AND u.is_active = true
        ) as current_users,
        (
          SELECT SUM(value)
          FROM subscription_usage su
          WHERE su.subscription_id = s.id
            AND su.metric_name = 'storage_used'
            AND su.recorded_at >= date_trunc('month', NOW())
        )::integer as current_storage_gb
      FROM subscriptions s
      JOIN organizations o ON s.organization_id = o.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramCount-1} OFFSET $${paramCount}
    `;

    const result = await query(subscriptionsQuery, queryParams);

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
      }
    });

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions',
      message: error.message
    });
  }
});

/**
 * GET /api/subscriptions/:id
 * Get subscription by ID with usage details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        s.*,
        o.name as organization_name,
        o.email as organization_email,
        CASE
          WHEN s.ends_at IS NULL OR s.ends_at > NOW() THEN 'active'
          ELSE 'expired'
        END as computed_status
      FROM subscriptions s
      JOIN organizations o ON s.organization_id = o.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    const subscription = result.rows[0];

    // Get current usage metrics
    const usage = await query(`
      SELECT
        metric_name,
        SUM(value) as total_usage,
        MAX(recorded_at) as last_recorded
      FROM subscription_usage
      WHERE subscription_id = $1
        AND recorded_at >= date_trunc('month', NOW())
      GROUP BY metric_name
    `, [id]);

    subscription.current_usage = usage.rows.reduce((acc, row) => {
      acc[row.metric_name] = {
        value: parseFloat(row.total_usage),
        last_recorded: row.last_recorded
      };
      return acc;
    }, {});

    // Get feature access
    const features = await query(`
      SELECT *
      FROM subscription_features
      WHERE subscription_id = $1
    `, [id]);

    subscription.feature_access = features.rows;

    // Get billing history
    const billingHistory = await query(`
      SELECT *
      FROM subscription_billing
      WHERE subscription_id = $1
      ORDER BY billing_date DESC
      LIMIT 12
    `, [id]);

    subscription.billing_history = billingHistory.rows;

    res.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
      message: error.message
    });
  }
});

/**
 * POST /api/subscriptions
 * Create new subscription
 */
router.post('/', async (req, res) => {
  try {
    const { error, value } = subscriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const subscription = await transaction(async (client) => {
      // Check if organization already has an active subscription
      const existing = await client.query(
        `SELECT id FROM subscriptions
         WHERE organization_id = $1 AND status = 'active' AND (ends_at IS NULL OR ends_at > NOW())`,
        [value.organization_id]
      );

      if (existing.rows.length > 0) {
        throw new Error('Organization already has an active subscription');
      }

      // Create subscription
      const subscriptionResult = await client.query(`
        INSERT INTO subscriptions (
          organization_id, plan_name, billing_cycle, max_users, max_organizations,
          max_assessments, max_storage_gb, features, price, currency,
          trial_end_date, starts_at, ends_at, auto_renew, payment_method,
          billing_contact, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active', NOW(), NOW()
        ) RETURNING *
      `, [
        value.organization_id, value.plan_name, value.billing_cycle,
        value.max_users, value.max_organizations, value.max_assessments,
        value.max_storage_gb, JSON.stringify(value.features), value.price,
        value.currency, value.trial_end_date, value.starts_at, value.ends_at,
        value.auto_renew, value.payment_method,
        value.billing_contact ? JSON.stringify(value.billing_contact) : null
      ]);

      const subscription = subscriptionResult.rows[0];

      // Create feature access records
      const featureInserts = value.features.map(feature => {
        return client.query(`
          INSERT INTO subscription_features (subscription_id, feature_name, is_enabled, created_at)
          VALUES ($1, $2, true, NOW())
        `, [subscription.id, feature]);
      });

      await Promise.all(featureInserts);

      return subscription;
    });

    res.status(201).json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully'
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
      message: error.message
    });
  }
});

/**
 * PUT /api/subscriptions/:id
 * Update subscription
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if subscription exists
    const existing = await query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    const allowedUpdates = [
      'plan_name', 'billing_cycle', 'max_users', 'max_organizations',
      'max_assessments', 'max_storage_gb', 'features', 'price',
      'ends_at', 'auto_renew', 'payment_method', 'billing_contact', 'status'
    ];

    Object.entries(updateData).forEach(([key, val]) => {
      if (allowedUpdates.includes(key) && val !== undefined) {
        paramCount++;
        if (['features', 'billing_contact'].includes(key)) {
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
        error: 'No valid fields to update'
      });
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    params.push(id);

    const updateQuery = `
      UPDATE subscriptions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, params);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Subscription updated successfully'
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription',
      message: error.message
    });
  }
});

/**
 * POST /api/subscriptions/:id/usage
 * Record usage metrics
 */
router.post('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = usageSchema.validate({ ...req.body, subscription_id: id });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { metric_name, value: metricValue, recorded_at } = value;

    // Check if subscription exists
    const subscription = await query('SELECT id FROM subscriptions WHERE id = $1', [id]);
    if (subscription.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    const result = await query(`
      INSERT INTO subscription_usage (subscription_id, metric_name, value, recorded_at, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [id, metric_name, metricValue, recorded_at]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Usage recorded successfully'
    });

  } catch (error) {
    console.error('Error recording usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record usage',
      message: error.message
    });
  }
});

/**
 * GET /api/subscriptions/:id/usage
 * Get usage analytics for subscription
 */
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'month', metric_name } = req.query;

    // Determine date range based on period
    let dateCondition = '';
    switch (period) {
      case 'day':
        dateCondition = 'recorded_at >= date_trunc(\'day\', NOW())';
        break;
      case 'week':
        dateCondition = 'recorded_at >= date_trunc(\'week\', NOW())';
        break;
      case 'year':
        dateCondition = 'recorded_at >= date_trunc(\'year\', NOW())';
        break;
      default:
        dateCondition = 'recorded_at >= date_trunc(\'month\', NOW())';
    }

    let metricFilter = '';
    const params = [id];
    if (metric_name) {
      metricFilter = 'AND metric_name = $2';
      params.push(metric_name);
    }

    const usage = await query(`
      SELECT
        metric_name,
        DATE(recorded_at) as usage_date,
        SUM(value) as daily_total,
        AVG(value) as daily_average,
        MAX(value) as peak_usage
      FROM subscription_usage
      WHERE subscription_id = $1 AND ${dateCondition} ${metricFilter}
      GROUP BY metric_name, DATE(recorded_at)
      ORDER BY usage_date DESC, metric_name
    `, params);

    // Get current limits from subscription
    const subscription = await query(`
      SELECT max_users, max_organizations, max_assessments, max_storage_gb, features
      FROM subscriptions
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      data: {
        usage_history: usage.rows,
        limits: subscription.rows[0],
        period
      }
    });

  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/subscriptions/plans
 * Get available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        name: 'starter',
        display_name: 'Starter Plan',
        description: 'Basic GRC functionality for small teams',
        max_users: 5,
        max_organizations: 1,
        max_assessments: 10,
        max_storage_gb: 5,
        features: ['basic_assessments', 'basic_reports', 'email_support'],
        monthly_price: 99,
        yearly_price: 990,
        is_trial_available: true,
        trial_days: 14
      },
      {
        name: 'professional',
        display_name: 'Professional Plan',
        description: 'Advanced features for growing organizations',
        max_users: 25,
        max_organizations: 3,
        max_assessments: 100,
        max_storage_gb: 25,
        features: [
          'advanced_assessments', 'custom_frameworks', 'advanced_reports',
          'workflow_automation', 'api_access', 'priority_support'
        ],
        monthly_price: 299,
        yearly_price: 2990,
        is_trial_available: true,
        trial_days: 14
      },
      {
        name: 'enterprise',
        display_name: 'Enterprise Plan',
        description: 'Complete GRC solution with advanced AI features',
        max_users: 100,
        max_organizations: 10,
        max_assessments: null, // unlimited
        max_storage_gb: 100,
        features: [
          'all_professional_features', 'ai_insights', 'predictive_analytics',
          'custom_integrations', 'sso', 'dedicated_support', 'compliance_automation'
        ],
        monthly_price: 799,
        yearly_price: 7990,
        is_trial_available: true,
        trial_days: 30
      },
      {
        name: 'compliance_plus',
        display_name: 'Compliance Plus',
        description: 'Specialized compliance management with regulatory intelligence',
        max_users: 50,
        max_organizations: 5,
        max_assessments: 500,
        max_storage_gb: 50,
        features: [
          'regulatory_intelligence', 'compliance_automation', 'audit_management',
          'risk_monitoring', 'regulatory_updates', 'compliance_dashboard'
        ],
        monthly_price: 599,
        yearly_price: 5990,
        is_trial_available: false
      }
    ];

    res.json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans',
      message: error.message
    });
  }
});

/**
 * POST /api/subscriptions/:id/features
 * Manage feature access for subscription
 */
router.post('/:id/features', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = featureAccessSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { feature_name, is_enabled, usage_limit, reset_period } = value;

    // Check if subscription exists
    const subscription = await query('SELECT id FROM subscriptions WHERE id = $1', [id]);
    if (subscription.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    // Upsert feature access
    const result = await query(`
      INSERT INTO subscription_features (
        subscription_id, feature_name, is_enabled, usage_limit, reset_period, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (subscription_id, feature_name)
      DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        usage_limit = EXCLUDED.usage_limit,
        reset_period = EXCLUDED.reset_period,
        updated_at = NOW()
      RETURNING *
    `, [id, feature_name, is_enabled, usage_limit, reset_period]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Feature access updated successfully'
    });

  } catch (error) {
    console.error('Error updating feature access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feature access',
      message: error.message
    });
  }
});

/**
 * GET /api/subscriptions/analytics/dashboard
 * Subscription analytics dashboard
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const analytics = await transaction(async (client) => {
      // Subscription counts by status and plan
      const statusCounts = await client.query(`
        SELECT
          status,
          plan_name,
          COUNT(*) as count
        FROM subscriptions
        GROUP BY status, plan_name
      `);

      // Revenue analytics
      const revenue = await client.query(`
        SELECT
          SUM(CASE WHEN billing_cycle = 'monthly' THEN price ELSE price/12 END) as monthly_recurring_revenue,
          AVG(price) as average_price,
          COUNT(*) as total_subscriptions
        FROM subscriptions
        WHERE status = 'active'
      `);

      // Usage trends
      const usageTrends = await client.query(`
        SELECT
          metric_name,
          AVG(value) as average_usage,
          MAX(value) as peak_usage,
          COUNT(*) as data_points
        FROM subscription_usage
        WHERE recorded_at >= NOW() - INTERVAL '30 days'
        GROUP BY metric_name
      `);

      // Churn analysis
      const churnData = await client.query(`
        SELECT
          DATE_TRUNC('month', updated_at) as month,
          COUNT(*) as churned_subscriptions
        FROM subscriptions
        WHERE status = 'cancelled'
          AND updated_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', updated_at)
        ORDER BY month
      `);

      return {
        statusCounts: statusCounts.rows,
        revenue: revenue.rows[0],
        usageTrends: usageTrends.rows,
        churnData: churnData.rows
      };
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription analytics',
      message: error.message
    });
  }
});

module.exports = router;
