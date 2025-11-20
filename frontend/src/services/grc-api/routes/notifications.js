const express = require('express');
const { query, transaction } = require('../config/database');
const Joi = require('joi');
const router = express.Router();

// Validation schemas
const notificationSchema = Joi.object({
  recipient_id: Joi.number().integer().positive().required(),
  recipient_type: Joi.string().valid('user', 'organization', 'partner', 'role').default('user'),
  type: Joi.string().valid(
    'assessment_due', 'compliance_alert', 'document_expiry', 'audit_scheduled',
    'risk_threshold', 'partner_update', 'system_maintenance', 'security_alert',
    'workflow_approval', 'report_ready', 'deadline_reminder', 'custom'
  ).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  title: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).max(2000).required(),
  action_url: Joi.string().uri().optional(),
  action_text: Joi.string().max(50).optional(),
  scheduled_at: Joi.date().optional(),
  expires_at: Joi.date().optional(),
  metadata: Joi.object().optional(),
  channels: Joi.array().items(
    Joi.string().valid('in_app', 'email', 'sms', 'webhook', 'slack')
  ).default(['in_app'])
});

const notificationUpdateSchema = Joi.object({
  status: Joi.string().valid('read', 'unread', 'archived', 'dismissed'),
  read_at: Joi.date().optional()
});

const templateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  type: Joi.string().valid(
    'assessment_due', 'compliance_alert', 'document_expiry', 'audit_scheduled',
    'risk_threshold', 'partner_update', 'system_maintenance', 'security_alert',
    'workflow_approval', 'report_ready', 'deadline_reminder', 'custom'
  ).required(),
  title_template: Joi.string().min(1).max(255).required(),
  message_template: Joi.string().min(1).max(2000).required(),
  default_priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  default_channels: Joi.array().items(
    Joi.string().valid('in_app', 'email', 'sms', 'webhook', 'slack')
  ).default(['in_app']),
  is_active: Joi.boolean().default(true),
  variables: Joi.array().items(Joi.string()).optional()
});

/**
 * GET /api/notifications
 * Get notifications for current user/organization with filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      type,
      priority,
      start_date,
      end_date,
      unread_only = false
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Default recipient filtering (would be based on authenticated user in real app)
    // For now, we'll show all notifications
    whereConditions.push('n.recipient_id IS NOT NULL');

    // Status filtering
    if (status !== 'all') {
      paramCount++;
      whereConditions.push(`n.status = $${paramCount}`);
      queryParams.push(status);
    }

    // Unread only filter
    if (unread_only === 'true') {
      whereConditions.push('n.status = \'unread\'');
    }

    // Type filtering
    if (type) {
      paramCount++;
      whereConditions.push(`n.type = $${paramCount}`);
      queryParams.push(type);
    }

    // Priority filtering
    if (priority) {
      paramCount++;
      whereConditions.push(`n.priority = $${paramCount}`);
      queryParams.push(priority);
    }

    // Date range filtering
    if (start_date) {
      paramCount++;
      whereConditions.push(`n.created_at >= $${paramCount}`);
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`n.created_at <= $${paramCount}`);
      queryParams.push(end_date);
    }

    // Exclude expired notifications
    whereConditions.push('(n.expires_at IS NULL OR n.expires_at > NOW())');

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get notifications with pagination
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const notificationsQuery = `
      SELECT
        n.*,
        CASE
          WHEN n.recipient_type = 'user' THEN u.first_name || ' ' || u.last_name
          WHEN n.recipient_type = 'organization' THEN o.name
          WHEN n.recipient_type = 'partner' THEN p.company_name
          ELSE 'System'
        END as recipient_name
      FROM notifications n
      LEFT JOIN users u ON n.recipient_type = 'user' AND n.recipient_id = u.id
      LEFT JOIN organizations o ON n.recipient_type = 'organization' AND n.recipient_id = o.id
      LEFT JOIN partners p ON n.recipient_type = 'partner' AND n.recipient_id = p.id
      ${whereClause}
      ORDER BY
        CASE n.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        n.created_at DESC
      LIMIT $${paramCount-1} OFFSET $${paramCount}
    `;

    const result = await query(notificationsQuery, queryParams);

    // Get unread count
    const unreadQuery = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE status = 'unread' AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const unreadResult = await query(unreadQuery);

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
      unread_count: parseInt(unreadResult.rows[0].unread_count)
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/:id
 * Get specific notification and mark as read
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT n.*
      FROM notifications n
      WHERE n.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    const notification = result.rows[0];

    // Mark as read if it was unread
    if (notification.status === 'unread') {
      await query(
        'UPDATE notifications SET status = $1, read_at = NOW(), updated_at = NOW() WHERE id = $2',
        ['read', id]
      );
      notification.status = 'read';
      notification.read_at = new Date();
    }

    res.json({
      success: true,
      data: notification
    });

  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications
 * Create new notification
 */
router.post('/', async (req, res) => {
  try {
    const { error, value } = notificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const {
      recipient_id, recipient_type, type, priority, title, message,
      action_url, action_text, scheduled_at, expires_at, metadata, channels
    } = value;

    const result = await query(`
      INSERT INTO notifications (
        recipient_id, recipient_type, type, priority, title, message,
        action_url, action_text, scheduled_at, expires_at, metadata, channels,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'unread', NOW(), NOW()
      ) RETURNING *
    `, [
      recipient_id, recipient_type, type, priority, title, message,
      action_url, action_text, scheduled_at, expires_at,
      metadata ? JSON.stringify(metadata) : null,
      JSON.stringify(channels)
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id
 * Update notification status
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = notificationUpdateSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const { status, read_at } = value;
    let updateQuery = 'UPDATE notifications SET status = $1, updated_at = NOW()';
    let params = [status, id];

    if (status === 'read' && !read_at) {
      updateQuery += ', read_at = NOW()';
    } else if (read_at) {
      updateQuery += ', read_at = $3';
      params = [status, id, read_at];
    }

    updateQuery += ' WHERE id = $2 RETURNING *';

    const result = await query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Notification updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 */
router.post('/mark-all-read', async (req, res) => {
  try {
    const { recipient_id, recipient_type = 'user' } = req.body;

    if (!recipient_id) {
      return res.status(400).json({
        success: false,
        error: 'recipient_id is required'
      });
    }

    const result = await query(`
      UPDATE notifications
      SET status = 'read', read_at = NOW(), updated_at = NOW()
      WHERE recipient_id = $1 AND recipient_type = $2 AND status = 'unread'
    `, [recipient_id, recipient_type]);

    res.json({
      success: true,
      message: `Marked ${result.rowCount} notifications as read`
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
      message: error.message
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/analytics/dashboard
 * Notification analytics
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const analytics = await transaction(async (client) => {
      // Notification counts by status
      const statusCounts = await client.query(`
        SELECT status, COUNT(*) as count
        FROM notifications
        WHERE (expires_at IS NULL OR expires_at > NOW())
        GROUP BY status
      `);

      // Notification counts by type
      const typeCounts = await client.query(`
        SELECT type, COUNT(*) as count
        FROM notifications
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY type
        ORDER BY count DESC
      `);

      // Priority distribution
      const priorityCounts = await client.query(`
        SELECT priority, COUNT(*) as count
        FROM notifications
        WHERE (expires_at IS NULL OR expires_at > NOW())
        GROUP BY priority
      `);

      // Daily notification volume (last 7 days)
      const dailyVolume = await client.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM notifications
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      return {
        statusCounts: statusCounts.rows,
        typeCounts: typeCounts.rows,
        priorityCounts: priorityCounts.rows,
        dailyVolume: dailyVolume.rows
      };
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/templates
 * Get notification templates
 */
router.get('/templates', async (req, res) => {
  try {
    const result = await query(`
      SELECT *
      FROM notification_templates
      WHERE is_active = true
      ORDER BY type, name
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification templates',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/templates
 * Create notification template
 */
router.post('/templates', async (req, res) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const {
      name, type, title_template, message_template, default_priority,
      default_channels, is_active, variables
    } = value;

    const result = await query(`
      INSERT INTO notification_templates (
        name, type, title_template, message_template, default_priority,
        default_channels, is_active, variables, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      name, type, title_template, message_template, default_priority,
      JSON.stringify(default_channels), is_active,
      variables ? JSON.stringify(variables) : null
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Notification template created successfully'
    });

  } catch (error) {
    console.error('Error creating notification template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification template',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/send
 * Send notification using template
 */
router.post('/send', async (req, res) => {
  try {
    const { template_id, recipients, variables = {}, scheduled_at } = req.body;

    if (!template_id || !recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'template_id and recipients are required'
      });
    }

    // Get template
    const template = await query('SELECT * FROM notification_templates WHERE id = $1', [template_id]);
    if (template.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const tmpl = template.rows[0];

    // Process template variables
    let title = tmpl.title_template;
    let message = tmpl.message_template;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });

    // Create notifications for each recipient
    const notifications = [];
    for (const recipient of recipients) {
      const result = await query(`
        INSERT INTO notifications (
          recipient_id, recipient_type, type, priority, title, message,
          scheduled_at, channels, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unread', NOW(), NOW())
        RETURNING *
      `, [
        recipient.id, recipient.type || 'user', tmpl.type, tmpl.default_priority,
        title, message, scheduled_at, JSON.stringify(tmpl.default_channels)
      ]);
      notifications.push(result.rows[0]);
    }

    res.status(201).json({
      success: true,
      data: notifications,
      message: `${notifications.length} notifications created successfully`
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notifications',
      message: error.message
    });
  }
});

module.exports = router;
