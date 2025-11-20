const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/notifications/send - Send notification
router.post('/send', async (req, res) => {
  try {
    const {
      to,
      type,
      subject,
      content,
      data = {},
      template,
      templateData
    } = req.body;

    if (!to || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Recipient (to) and type are required'
      });
    }

    // Store notification in database
    const notificationId = uuidv4();
    await query(`
      INSERT INTO notifications (
        id, tenant_id, recipient_email, notification_type,
        subject, content, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP)
    `, [
      notificationId,
      req.headers['x-tenant-id'] || null,
      Array.isArray(to) ? to[0] : to,
      type,
      subject || emailService.getNotificationSubject(type, data),
      content || ''
    ]);

    // Send email
    try {
      const result = await emailService.sendEmail(
        to,
        subject || emailService.getNotificationSubject(type, data),
        content || '',
        {
          template,
          templateData: templateData || data
        }
      );

      // Update notification status
      await query(`
        UPDATE notifications
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP, message_id = $1
        WHERE id = $2
      `, [result.messageId, notificationId]);

      res.json({
        success: true,
        message: 'Notification sent successfully',
        data: {
          notificationId,
          messageId: result.messageId
        }
      });
    } catch (emailError) {
      // Update notification status to failed
      await query(`
        UPDATE notifications
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [emailError.message, notificationId]);

      throw emailError;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message
    });
  }
});

// POST /api/notifications/email - Send email directly
router.post('/email', async (req, res) => {
  try {
    const { to, subject, content, options = {} } = req.body;

    if (!to || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Recipient (to), subject, and content are required'
      });
    }

    const result = await emailService.sendEmail(to, subject, content, options);

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// GET /api/notifications - Get notifications
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { status, type, limit = 50 } = req.query;

    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (tenantId) {
      sql += ` AND tenant_id = $${paramIndex++}`;
      params.push(tenantId);
    }

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (type) {
      sql += ` AND notification_type = $${paramIndex++}`;
      params.push(type);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// GET /api/notifications/templates - Get available templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      'notification_partner_invitation',
      'notification_assessment_completed',
      'notification_control_updated',
      'notification_password_reset',
      'notification_welcome',
      'notification_collaboration_request'
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
});

module.exports = router;

