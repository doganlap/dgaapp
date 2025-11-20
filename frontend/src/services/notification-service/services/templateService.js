const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class TemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.cache = new Map();
  }

  /**
   * Load template from file
   */
  async loadTemplate(templateName) {
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
      const content = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(content);
      
      this.cache.set(templateName, template);
      return template;
    } catch (error) {
      console.error(`[Template Service] Failed to load template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Render template with data
   */
  async renderTemplate(templateName, data) {
    try {
      const template = await this.loadTemplate(templateName);
      const html = template(data);
      
      // Generate plain text version (simple strip of HTML tags)
      const text = html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      return { html, text };
    } catch (error) {
      console.error(`[Template Service] Failed to render template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new TemplateService();

