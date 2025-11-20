const nodemailer = require('nodemailer');
const mjml = require('mjml');
const winston = require('winston');
require('dotenv').config();

class EmailServiceEnhanced {
  constructor() {
    this.transporter = null;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/email-service.log' }),
        new winston.transports.Console()
      ]
    });

    this.initializeTransporter();
  }

  initializeTransporter() {
    // Support multiple email providers
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    };

    // Azure Service Bus Email or SendGrid support
    if (process.env.EMAIL_PROVIDER === 'sendgrid') {
      emailConfig.host = 'smtp.sendgrid.net';
      emailConfig.port = 587;
      emailConfig.auth = {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      };
    }

    this.transporter = nodemailer.createTransporter(emailConfig);
  }

  async verifyConfiguration() {
    try {
      await this.transporter.verify();
      this.logger.info('Email service configuration verified');
      return true;
    } catch (error) {
      this.logger.error('Email configuration verification failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send templated email using MJML
   * @param {Array} recipients - Array of email addresses
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   * @param {Object} options - Email options
   */
  async sendTemplatedEmail(recipients, templateName, data = {}, options = {}) {
    try {
      const templateService = require('./templateService');
      const { html, subject, text } = await templateService.renderEmailTemplate(templateName, data);

      const emailOptions = {
        from: options.from || process.env.SMTP_FROM || '"GRC Assessment Platform" <noreply@grc-platform.com>',
        to: Array.isArray(recipients) ? recipients.join(', ') : recipients,
        subject: options.subject || subject,
        text: text,
        html: html,
        attachments: options.attachments || [],
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        headers: {
          'X-Template': templateName,
          'X-Tenant-ID': data.tenantId || 'default',
          'X-Priority': data.priority || 'normal'
        }
      };

      // Add tracking if enabled
      if (process.env.EMAIL_TRACKING === 'true') {
        emailOptions.headers['X-Tracking-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      const result = await this.transporter.sendMail(emailOptions);

      this.logger.info('Email sent successfully', {
        messageId: result.messageId,
        recipients: recipients.length || 1,
        template: templateName,
        accepted: result.accepted,
        rejected: result.rejected
      });

      return {
        success: true,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        template: templateName
      };

    } catch (error) {
      this.logger.error('Failed to send templated email', {
        error: error.message,
        template: templateName,
        recipients: recipients.length || 1
      });
      throw error;
    }
  }

  /**
   * Send simple email without template
   * @param {Array} recipients - Array of email addresses
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   * @param {Object} options - Email options
   */
  async sendSimpleEmail(recipients, subject, message, options = {}) {
    try {
      const emailOptions = {
        from: options.from || process.env.SMTP_FROM || '"GRC Assessment Platform" <noreply@grc-platform.com>',
        to: Array.isArray(recipients) ? recipients.join(', ') : recipients,
        subject: subject,
        text: message,
        html: options.html || message.replace(/\n/g, '<br>'),
        attachments: options.attachments || [],
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc
      };

      const result = await this.transporter.sendMail(emailOptions);

      this.logger.info('Simple email sent successfully', {
        messageId: result.messageId,
        recipients: recipients.length || 1,
        subject: subject
      });

      return {
        success: true,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      };

    } catch (error) {
      this.logger.error('Failed to send simple email', {
        error: error.message,
        subject: subject,
        recipients: recipients.length || 1
      });
      throw error;
    }
  }

  /**
   * Send bulk emails with different templates
   * @param {Array} emailBatch - Array of email configurations
   */
  async sendBulkEmails(emailBatch) {
    const results = [];
    const batchSize = 10; // Process in batches

    for (let i = 0; i < emailBatch.length; i += batchSize) {
      const batch = emailBatch.slice(i, i + batchSize);

      const batchPromises = batch.map(async (emailConfig, index) => {
        try {
          const { recipients, template, data, options } = emailConfig;
          const result = await this.sendTemplatedEmail(recipients, template, data, options);

          return {
            index: i + index,
            success: true,
            result
          };
        } catch (error) {
          return {
            index: i + index,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value));

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < emailBatch.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.logger.info('Bulk email batch completed', {
      total: emailBatch.length,
      successful,
      failed
    });

    return {
      total: emailBatch.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get email service statistics
   */
  async getStatistics() {
    // This would typically query a database for sent email stats
    // For now, return basic transporter info
    try {
      const isConnected = await this.transporter.verify();

      return {
        isConnected,
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        host: process.env.SMTP_HOST,
        poolSize: this.transporter.pool ? 'enabled' : 'disabled',
        secure: process.env.SMTP_SECURE === 'true'
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error.message
      };
    }
  }

  /**
   * Close email service connections
   */
  async close() {
    if (this.transporter) {
      this.transporter.close();
      this.logger.info('Email service connections closed');
    }
  }
}

module.exports = new EmailServiceEnhanced();
