const handlebars = require('handlebars');
const mjml = require('mjml');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

class TemplateServiceEnhanced {
  constructor() {
    this.emailTemplates = new Map();
    this.smsTemplates = new Map();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/template-service.log' })
      ]
    });

    this.initializeTemplates();
  }

  /**
   * Initialize all templates
   */
  async initializeTemplates() {
    try {
      await this.loadEmailTemplates();
      await this.loadSMSTemplates();
      this.addDefaultTemplates();
      this.logger.info('All notification templates loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load templates', { error: error.message });
      this.addDefaultTemplates(); // Fallback to defaults
    }
  }

  /**
   * Load MJML email templates from files
   */
  async loadEmailTemplates() {
    const templatesDir = path.join(__dirname, '..', 'templates', 'email');

    try {
      const templateFiles = await fs.readdir(templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.mjml')) {
          const templateName = path.basename(file, '.mjml');
          const templatePath = path.join(templatesDir, file);
          const mjmlContent = await fs.readFile(templatePath, 'utf8');

          this.emailTemplates.set(templateName, mjmlContent);
          this.logger.info(`Email template loaded: ${templateName}`);
        }
      }
    } catch (error) {
      this.logger.warn('Email templates directory not found, using defaults only');
    }
  }

  /**
   * Load SMS templates from files
   */
  async loadSMSTemplates() {
    const templatesDir = path.join(__dirname, '..', 'templates', 'sms');

    try {
      const templateFiles = await fs.readdir(templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.txt')) {
          const templateName = path.basename(file, '.txt');
          const templatePath = path.join(templatesDir, file);
          const content = await fs.readFile(templatePath, 'utf8');

          this.smsTemplates.set(templateName, content);
          this.logger.info(`SMS template loaded: ${templateName}`);
        }
      }
    } catch (error) {
      this.logger.warn('SMS templates directory not found, using defaults only');
    }
  }

  /**
   * Add default email templates
   */
  addDefaultTemplates() {
    // Default email templates using MJML
    const defaultEmailTemplates = {
      'assessment-assigned': `
        <mjml>
          <mj-head>
            <mj-title>Assessment Assigned - GRC Platform</mj-title>
            <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
            <mj-attributes>
              <mj-all font-family="Inter, Arial, sans-serif" />
              <mj-text font-size="16px" line-height="1.5" />
            </mj-attributes>
          </mj-head>
          <mj-body background-color="#f8fafc">
            <mj-section background-color="#ffffff" padding="40px">
              <mj-column>
                <mj-text font-size="24px" font-weight="600" color="#1f2937">
                  New Assessment Assigned
                </mj-text>
                <mj-text color="#6b7280">
                  Hello {{assigneeName}},
                </mj-text>
                <mj-text color="#374151">
                  You have been assigned a new assessment: <strong>{{assessmentTitle}}</strong>
                </mj-text>
                <mj-text color="#374151">
                  <strong>Due Date:</strong> {{dueDate}}<br>
                  <strong>Priority:</strong> {{priority}}<br>
                  <strong>Framework:</strong> {{framework}}
                </mj-text>
                <mj-button background-color="#3b82f6" color="#ffffff" href="{{assessmentUrl}}">
                  Start Assessment
                </mj-button>
                <mj-text color="#9ca3af" font-size="14px">
                  If you have questions, please contact your GRC administrator.
                </mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>`,

      'assessment-reminder': `
        <mjml>
          <mj-head>
            <mj-title>Assessment Reminder - GRC Platform</mj-title>
            <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
          </mj-head>
          <mj-body background-color="#f8fafc">
            <mj-section background-color="#ffffff" padding="40px">
              <mj-column>
                <mj-text font-size="24px" font-weight="600" color="#dc2626">
                  Assessment Due Soon
                </mj-text>
                <mj-text color="#374151">
                  Hello {{assigneeName}},
                </mj-text>
                <mj-text color="#374151">
                  Your assessment <strong>{{assessmentTitle}}</strong> is due in {{daysRemaining}} days.
                </mj-text>
                <mj-text color="#374151">
                  Current Progress: {{progressPercentage}}% complete
                </mj-text>
                <mj-button background-color="#dc2626" color="#ffffff" href="{{assessmentUrl}}">
                  Continue Assessment
                </mj-button>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>`,

      'assessment-completed': `
        <mjml>
          <mj-head>
            <mj-title>Assessment Completed - GRC Platform</mj-title>
            <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
          </mj-head>
          <mj-body background-color="#f8fafc">
            <mj-section background-color="#ffffff" padding="40px">
              <mj-column>
                <mj-text font-size="24px" font-weight="600" color="#059669">
                  Assessment Completed
                </mj-text>
                <mj-text color="#374151">
                  Congratulations {{assigneeName}},
                </mj-text>
                <mj-text color="#374151">
                  You have successfully completed the assessment: <strong>{{assessmentTitle}}</strong>
                </mj-text>
                <mj-text color="#374151">
                  <strong>Completion Date:</strong> {{completionDate}}<br>
                  <strong>Final Score:</strong> {{finalScore}}%<br>
                  <strong>Status:</strong> {{complianceStatus}}
                </mj-text>
                <mj-button background-color="#059669" color="#ffffff" href="{{reportUrl}}">
                  View Report
                </mj-button>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>`,

      'collaboration-invite': `
        <mjml>
          <mj-head>
            <mj-title>Collaboration Invitation - GRC Platform</mj-title>
            <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
          </mj-head>
          <mj-body background-color="#f8fafc">
            <mj-section background-color="#ffffff" padding="40px">
              <mj-column>
                <mj-text font-size="24px" font-weight="600" color="#7c3aed">
                  Collaboration Invitation
                </mj-text>
                <mj-text color="#374151">
                  Hello {{inviteeName}},
                </mj-text>
                <mj-text color="#374151">
                  {{inviterName}} has invited you to collaborate on: <strong>{{assessmentTitle}}</strong>
                </mj-text>
                <mj-text color="#374151">
                  You can now view and contribute to this assessment in real-time.
                </mj-text>
                <mj-button background-color="#7c3aed" color="#ffffff" href="{{collaborationUrl}}">
                  Join Collaboration
                </mj-button>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>`,

      'simple': `
        <mjml>
          <mj-head>
            <mj-title>{{subject}}</mj-title>
            <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" />
          </mj-head>
          <mj-body background-color="#f8fafc">
            <mj-section background-color="#ffffff" padding="40px">
              <mj-column>
                <mj-text font-size="18px" font-weight="600" color="#1f2937">
                  {{subject}}
                </mj-text>
                <mj-text color="#374151">
                  {{message}}
                </mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>`
    };

    // Default SMS templates
    const defaultSMSTemplates = {
      'assessment-assigned': 'Hi {{assigneeName}}, you have been assigned a new GRC assessment: {{assessmentTitle}}. Due: {{dueDate}}. Start now: {{shortUrl}}',
      'assessment-reminder': 'Reminder: Your assessment "{{assessmentTitle}}" is due in {{daysRemaining}} days. Complete it here: {{shortUrl}}',
      'assessment-completed': 'Great job {{assigneeName}}! You completed "{{assessmentTitle}}" with {{finalScore}}% score. View report: {{shortUrl}}',
      'collaboration-invite': '{{inviterName}} invited you to collaborate on "{{assessmentTitle}}". Join here: {{shortUrl}}',
      'default': '{{message}}'
    };

    // Add templates to maps
    Object.entries(defaultEmailTemplates).forEach(([name, template]) => {
      if (!this.emailTemplates.has(name)) {
        this.emailTemplates.set(name, template);
      }
    });

    Object.entries(defaultSMSTemplates).forEach(([name, template]) => {
      if (!this.smsTemplates.has(name)) {
        this.smsTemplates.set(name, template);
      }
    });

    this.logger.info('Default templates added');
  }

  /**
   * Render email template with MJML
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   */
  async renderEmailTemplate(templateName, data = {}) {
    try {
      const mjmlTemplate = this.emailTemplates.get(templateName);

      if (!mjmlTemplate) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      // Compile with Handlebars first
      const handlebarsTemplate = handlebars.compile(mjmlTemplate);
      const mjmlContent = handlebarsTemplate(data);

      // Convert MJML to HTML
      const { html, errors } = mjml(mjmlContent);

      if (errors && errors.length > 0) {
        this.logger.warn('MJML compilation warnings', { templateName, errors });
      }

      // Extract subject from data or use default
      const subject = data.subject || this.extractSubjectFromMjml(mjmlContent) || 'GRC Platform Notification';

      // Create text version
      const text = this.htmlToText(html);

      this.logger.info('Email template rendered', { templateName });

      return {
        html,
        text,
        subject
      };

    } catch (error) {
      this.logger.error('Email template rendering failed', {
        templateName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Render SMS template
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   */
  renderSMSTemplate(templateName, data = {}) {
    try {
      const template = this.smsTemplates.get(templateName) || this.smsTemplates.get('default');

      if (!template) {
        throw new Error(`SMS template '${templateName}' not found`);
      }

      const handlebarsTemplate = handlebars.compile(template);
      const message = handlebarsTemplate(data);

      this.logger.info('SMS template rendered', { templateName });

      return message;

    } catch (error) {
      this.logger.error('SMS template rendering failed', {
        templateName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Extract subject from MJML title tag
   */
  extractSubjectFromMjml(mjmlContent) {
    const titleMatch = mjmlContent.match(/<mj-title>(.*?)<\/mj-title>/i);
    return titleMatch ? titleMatch[1] : null;
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get available templates
   */
  getAvailableTemplates() {
    return {
      email: Array.from(this.emailTemplates.keys()),
      sms: Array.from(this.smsTemplates.keys())
    };
  }

  /**
   * Add or update template
   */
  setTemplate(type, name, content) {
    if (type === 'email') {
      this.emailTemplates.set(name, content);
    } else if (type === 'sms') {
      this.smsTemplates.set(name, content);
    } else {
      throw new Error('Template type must be "email" or "sms"');
    }

    this.logger.info('Template updated', { type, name });
  }

  /**
   * Remove template
   */
  removeTemplate(type, name) {
    let deleted = false;

    if (type === 'email') {
      deleted = this.emailTemplates.delete(name);
    } else if (type === 'sms') {
      deleted = this.smsTemplates.delete(name);
    }

    if (deleted) {
      this.logger.info('Template removed', { type, name });
    }

    return deleted;
  }
}

// Export singleton instance
module.exports = new TemplateServiceEnhanced();
