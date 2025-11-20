const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const Bull = require('bull');
const Redis = require('redis');
require('dotenv').config();

// Enhanced services
const emailService = require('./services/emailService');
const smsService = require('./services/smsService');
const templateService = require('./services/templateService');
const notificationLogger = require('./services/loggerService');

// Import routes
const notificationsRoutes = require('./routes/notifications');
const templatesRoutes = require('./routes/templates');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3004;

// ==========================================
// REDIS & QUEUE SETUP
// ==========================================

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Notification queue for async processing
const notificationQueue = new Bull('notification processing', process.env.REDIS_URL || 'redis://localhost:6379');

// Queue processors
notificationQueue.process('email', async (job) => {
  const { recipients, template, data, options } = job.data;
  try {
    await emailService.sendTemplatedEmail(recipients, template, data, options);
    notificationLogger.info('Email notification processed successfully', {
      recipients: recipients.length,
      template,
      jobId: job.id
    });
  } catch (error) {
    notificationLogger.error('Email notification failed', {
      error: error.message,
      recipients: recipients.length,
      template,
      jobId: job.id
    });
    throw error;
  }
});

notificationQueue.process('sms', async (job) => {
  const { recipients, message, options } = job.data;
  try {
    await smsService.sendSMS(recipients, message, options);
    notificationLogger.info('SMS notification processed successfully', {
      recipients: recipients.length,
      jobId: job.id
    });
  } catch (error) {
    notificationLogger.error('SMS notification failed', {
      error: error.message,
      recipients: recipients.length,
      jobId: job.id
    });
    throw error;
  }
});

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Service-Token']
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for notification service
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Service token validation
const validateServiceToken = (req, res, next) => {
  const serviceToken = req.headers['x-service-token'];
  const expectedToken = process.env.SERVICE_TOKEN || 'default-token';

  if (serviceToken !== expectedToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid service token'
    });
  }

  next();
};

// Request logging middleware
app.use((req, res, next) => {
  notificationLogger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    tenantId: req.headers['x-tenant-id']
  });
  next();
});

// ==========================================
// ROUTES
// ==========================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    queue: {
      waiting: notificationQueue.waiting(),
      active: notificationQueue.active(),
      completed: notificationQueue.completed(),
      failed: notificationQueue.failed()
    }
  });
});

// Enhanced notification endpoints
app.use('/api/notifications', validateServiceToken, notificationsRoutes);
app.use('/api/templates', validateServiceToken, templatesRoutes);

// Bulk notification endpoint
app.post('/api/notifications/bulk',
  validateServiceToken,
  [
    body('notifications').isArray().withMessage('Notifications must be an array'),
    body('notifications.*.type').isIn(['email', 'sms', 'push']).withMessage('Invalid notification type'),
    body('notifications.*.recipients').isArray().withMessage('Recipients must be an array'),
    body('notifications.*.template').optional().isString(),
    body('notifications.*.message').optional().isString(),
    body('notifications.*.priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { notifications, options = {} } = req.body;
      const tenantId = req.headers['x-tenant-id'];
      const results = [];

      for (const notification of notifications) {
        try {
          const { type, recipients, template, message, data = {}, priority = 'normal' } = notification;

          // Enhanced data with tenant context
          const enhancedData = {
            ...data,
            tenantId,
            timestamp: new Date().toISOString(),
            priority
          };

          let jobOptions = {
            priority: priority === 'urgent' ? 1 : priority === 'high' ? 2 : priority === 'normal' ? 3 : 4,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            }
          };

          let job;
          if (type === 'email' && template) {
            job = await notificationQueue.add('email', {
              recipients,
              template,
              data: enhancedData,
              options
            }, jobOptions);
          } else if (type === 'sms') {
            job = await notificationQueue.add('sms', {
              recipients,
              message: message || templateService.renderSMSTemplate('default', enhancedData),
              options
            }, jobOptions);
          }

          results.push({
            success: true,
            jobId: job?.id,
            type,
            recipients: recipients.length,
            status: 'queued'
          });

        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            type: notification.type
          });

          notificationLogger.error('Bulk notification item failed', {
            error: error.message,
            notification,
            tenantId
          });
        }
      }

      res.json({
        success: true,
        message: 'Bulk notifications queued',
        results,
        total: notifications.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

    } catch (error) {
      notificationLogger.error('Bulk notification failed', {
        error: error.message,
        tenantId: req.headers['x-tenant-id']
      });

      res.status(500).json({
        success: false,
        error: 'Failed to process bulk notifications',
        message: error.message
      });
    }
  }
);

// Template rendering endpoint
app.post('/api/templates/render',
  validateServiceToken,
  [
    body('template').isString().withMessage('Template name is required'),
    body('type').isIn(['email', 'sms']).withMessage('Invalid template type'),
    body('data').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { template, type, data = {} } = req.body;
      const tenantId = req.headers['x-tenant-id'];

      const enhancedData = {
        ...data,
        tenantId,
        timestamp: new Date().toISOString()
      };

      let rendered;
      if (type === 'email') {
        rendered = await templateService.renderEmailTemplate(template, enhancedData);
      } else if (type === 'sms') {
        rendered = templateService.renderSMSTemplate(template, enhancedData);
      }

      res.json({
        success: true,
        rendered,
        template,
        type
      });

    } catch (error) {
      notificationLogger.error('Template rendering failed', {
        error: error.message,
        template: req.body.template,
        type: req.body.type
      });

      res.status(500).json({
        success: false,
        error: 'Failed to render template',
        message: error.message
      });
    }
  }
);

// Queue status endpoint
app.get('/api/queue/status', validateServiceToken, async (req, res) => {
  try {
    const waiting = await notificationQueue.waiting();
    const active = await notificationQueue.active();
    const completed = await notificationQueue.completed();
    const failed = await notificationQueue.failed();

    res.json({
      success: true,
      queue: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        isPaused: await notificationQueue.isPaused(),
        name: notificationQueue.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  notificationLogger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// ==========================================
// SERVER STARTUP
// ==========================================

const startServer = async () => {
  try {
    // Initialize Redis connection
    await redisClient.connect();
    console.log('✅ Redis connected successfully');

    // Verify email configuration
    await emailService.verifyConfiguration();
    console.log('✅ Email service verified');

    // Load notification templates
    await templateService.loadTemplates();
    console.log('✅ Notification templates loaded');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Enhanced Notification Service running on port ${PORT}`);
      console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📱 SMS Service: ${process.env.TWILIO_ACCOUNT_SID ? 'Enabled' : 'Disabled'}`);

      notificationLogger.info('Notification service started', {
        port: PORT,
        environment: process.env.NODE_ENV,
        version: '2.0.0'
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🔄 Received SIGTERM, shutting down gracefully');

      await notificationQueue.close();
      await redisClient.quit();

      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start notification service:', error);
    process.exit(1);
  }
};

startServer();
