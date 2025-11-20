const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const notificationLogger = require('../services/loggerService');
const Bull = require('bull');

// Initialize queue (would be shared with main server)
const notificationQueue = new Bull('notification processing', process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Send single notification
 */
router.post('/send',
  [
    body('type').isIn(['email', 'sms']).withMessage('Type must be email or sms'),
    body('recipients').isArray().withMessage('Recipients must be an array'),
    body('recipients.*').isString().withMessage('Each recipient must be a string'),
    body('template').optional().isString(),
    body('message').optional().isString(),
    body('subject').optional().isString(),
    body('data').optional().isObject(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
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

      const { type, recipients, template, message, subject, data = {}, priority = 'normal', options = {} } = req.body;
      const tenantId = req.headers['x-tenant-id'];

      // Enhanced data with context
      const enhancedData = {
        ...data,
        tenantId,
        timestamp: new Date().toISOString(),
        priority
      };

      // Queue options based on priority
      const queueOptions = {
        priority: priority === 'urgent' ? 1 : priority === 'high' ? 2 : priority === 'normal' ? 3 : 4,
        attempts: type === 'email' ? 3 : 2,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      };

      let job;

      if (type === 'email') {
        if (!template && !message) {
          return res.status(400).json({
            success: false,
            error: 'Either template or message is required for email'
          });
        }

        job = await notificationQueue.add('email', {
          recipients,
          template: template || 'simple',
          data: template ? enhancedData : { ...enhancedData, message, subject },
          options
        }, queueOptions);

      } else if (type === 'sms') {
        if (!message && !template) {
          return res.status(400).json({
            success: false,
            error: 'Either message or template is required for SMS'
          });
        }

        job = await notificationQueue.add('sms', {
          recipients,
          message: message || null,
          template: template || null,
          data: enhancedData,
          options
        }, queueOptions);
      }

      notificationLogger.info('Notification queued successfully', {
        type,
        jobId: job.id,
        recipients: recipients.length,
        priority,
        tenantId
      });

      res.json({
        success: true,
        message: 'Notification queued successfully',
        jobId: job.id,
        type,
        recipients: recipients.length,
        status: 'queued',
        priority
      });

    } catch (error) {
      notificationLogger.error('Failed to queue notification', {
        error: error.message,
        type: req.body.type,
        tenantId: req.headers['x-tenant-id']
      });

      res.status(500).json({
        success: false,
        error: 'Failed to queue notification',
        message: error.message
      });
    }
  }
);

/**
 * Get notification status by job ID
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await notificationQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const jobState = await job.getState();
    const progress = job.progress();

    res.json({
      success: true,
      jobId,
      state: jobState,
      progress,
      data: job.data,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason
    });

  } catch (error) {
    notificationLogger.error('Failed to get notification status', {
      jobId: req.params.jobId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get notification status',
      message: error.message
    });
  }
});

/**
 * Get notification statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    const [waiting, active, completed, failed] = await Promise.all([
      notificationQueue.getWaiting(),
      notificationQueue.getActive(),
      notificationQueue.getCompleted(),
      notificationQueue.getFailed()
    ]);

    // Filter by tenant if provided
    const filterByTenant = (jobs) => {
      if (!tenantId) return jobs;
      return jobs.filter(job => job.data?.data?.tenantId === tenantId);
    };

    const stats = {
      queue: {
        waiting: filterByTenant(waiting).length,
        active: filterByTenant(active).length,
        completed: filterByTenant(completed).length,
        failed: filterByTenant(failed).length
      },
      total: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      },
      tenantId: tenantId || 'all',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      statistics: stats
    });

  } catch (error) {
    notificationLogger.error('Failed to get notification statistics', {
      error: error.message,
      tenantId: req.headers['x-tenant-id']
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get notification statistics',
      message: error.message
    });
  }
});

module.exports = router;
