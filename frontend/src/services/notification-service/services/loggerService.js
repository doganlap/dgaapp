const winston = require('winston');
require('winston-daily-rotate-file');

// Create logger service with multiple transports
const loggerService = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  defaultMeta: {
    service: 'notification-service',
    version: '2.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),

    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Daily rotate file for all logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/notification-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // Daily rotate file for audit logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          if (meta.type === 'audit') {
            return JSON.stringify({ timestamp, level, message, ...meta });
          }
          return '';
        })
      )
    })
  ]
});

// Enhanced logging methods for notification service
class NotificationLogger {
  constructor() {
    this.logger = loggerService;

    // Ensure logs directory exists
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const fs = require('fs');
    const path = require('path');

    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  // Standard logging methods
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Notification-specific logging methods
  logEmailSent(recipients, template, messageId, meta = {}) {
    this.logger.info('Email notification sent', {
      type: 'email-sent',
      recipients: Array.isArray(recipients) ? recipients.length : 1,
      template,
      messageId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logEmailFailed(recipients, template, error, meta = {}) {
    this.logger.error('Email notification failed', {
      type: 'email-failed',
      recipients: Array.isArray(recipients) ? recipients.length : 1,
      template,
      error: error.message || error,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logSMSSent(recipients, messageId, meta = {}) {
    this.logger.info('SMS notification sent', {
      type: 'sms-sent',
      recipients: Array.isArray(recipients) ? recipients.length : 1,
      messageId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logSMSFailed(recipients, error, meta = {}) {
    this.logger.error('SMS notification failed', {
      type: 'sms-failed',
      recipients: Array.isArray(recipients) ? recipients.length : 1,
      error: error.message || error,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logTemplateRendered(templateName, templateType, meta = {}) {
    this.logger.info('Template rendered', {
      type: 'template-rendered',
      templateName,
      templateType,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logTemplateError(templateName, templateType, error, meta = {}) {
    this.logger.error('Template rendering failed', {
      type: 'template-error',
      templateName,
      templateType,
      error: error.message || error,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logQueueJob(jobType, jobId, status, meta = {}) {
    this.logger.info('Queue job processed', {
      type: 'queue-job',
      jobType,
      jobId,
      status,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logBulkOperation(operationType, total, successful, failed, meta = {}) {
    this.logger.info('Bulk operation completed', {
      type: 'bulk-operation',
      operationType,
      total,
      successful,
      failed,
      successRate: ((successful / total) * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logAPIRequest(method, url, statusCode, responseTime, meta = {}) {
    this.logger.info('API request', {
      type: 'api-request',
      method,
      url,
      statusCode,
      responseTime: responseTime + 'ms',
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logSecurityEvent(eventType, description, meta = {}) {
    this.logger.warn('Security event', {
      type: 'security-event',
      eventType,
      description,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Audit logging for compliance
  auditLog(action, resource, userId, meta = {}) {
    this.logger.info('Audit event', {
      type: 'audit',
      action,
      resource,
      userId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Performance monitoring
  logPerformance(operation, duration, meta = {}) {
    const level = duration > 5000 ? 'warn' : 'info';
    this.logger.log(level, 'Performance metric', {
      type: 'performance',
      operation,
      duration: duration + 'ms',
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Health check logging
  logHealthCheck(service, status, details = {}) {
    this.logger.info('Health check', {
      type: 'health-check',
      service,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Rate limiting logging
  logRateLimit(identifier, limit, current, meta = {}) {
    this.logger.warn('Rate limit triggered', {
      type: 'rate-limit',
      identifier,
      limit,
      current,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Configuration logging
  logConfigChange(setting, oldValue, newValue, userId, meta = {}) {
    this.logger.info('Configuration changed', {
      type: 'config-change',
      setting,
      oldValue: oldValue ? '[REDACTED]' : null,
      newValue: newValue ? '[REDACTED]' : null,
      userId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Error aggregation helper
  createErrorSummary(errors) {
    const summary = errors.reduce((acc, error) => {
      const key = error.type || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    this.logger.error('Error summary', {
      type: 'error-summary',
      totalErrors: errors.length,
      errorTypes: summary,
      timestamp: new Date().toISOString()
    });

    return summary;
  }
}

module.exports = new NotificationLogger();
