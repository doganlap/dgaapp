const nodemailer = require('nodemailer');
const mjml = require('mjml');
const winston = require('winston');
require('dotenv').config();

class EmailService {
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

    this.transporter = nodemailer.createTransport(emailConfig);
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
   * Send email
   */
  async sendEmail(to, subject, content, options = {}) {
    try {
      const {
        from = process.env.SMTP_FROM || 'noreply@grc-system.com',
        cc,
        bcc,
        attachments,
        template,
        templateData
      } = options;

      let htmlContent = content;
      let textContent = content;

      // Use template if provided
      if (template && templateData) {
        const rendered = await templateService.renderTemplate(template, templateData);
        htmlContent = rendered.html;
        textContent = rendered.text;
      }

      const mailOptions = {
        from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: textContent,
        html: htmlContent,
        ...(cc && { cc: Array.isArray(cc) ? cc.join(', ') : cc }),
        ...(bcc && { bcc: Array.isArray(bcc) ? bcc.join(', ') : bcc }),
        ...(attachments && { attachments })
      };

      const info = await transporter.sendMail(mailOptions);

      console.log(`[Email Service] Email sent: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('[Email Service] Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send notification email
   */
  async sendNotification(userEmail, notificationType, data) {
    try {
      const template = `notification_${notificationType}`;
      const subject = this.getNotificationSubject(notificationType, data);

      return await this.sendEmail(
        userEmail,
        subject,
        '', // Content will come from template
        {
          template,
          templateData: data
        }
      );
    } catch (error) {
      console.error('[Email Service] Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Get notification subject based on type
   */
  getNotificationSubject(type, data) {
    const subjects = {
      partner_invitation: `Partner Invitation from ${data.tenantName || 'GRC System'}`,
      assessment_completed: `Assessment Completed: ${data.assessmentName || 'Assessment'}`,
      control_updated: `Control Updated: ${data.controlName || 'Control'}`,
      password_reset: 'Password Reset Request',
      welcome: 'Welcome to GRC System',
      collaboration_request: 'Collaboration Request'
    };

    return subjects[type] || 'Notification from GRC System';
  }
}

module.exports = new EmailService();

