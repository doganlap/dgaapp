/**
 * ZATCA (Zakat, Tax and Customs Authority) Regulatory Scraper
 * Monitors ZATCA website for tax, zakat, and customs regulations
 * Website: https://zatca.gov.sa
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');
const { getCachedRegulatoryData, cacheRegulatoryData } = require('../../config/redis');

class ZATCARegulatoryScraper {
  constructor() {
    this.regulatorId = 'ZATCA';
    this.regulatorName = 'Zakat, Tax and Customs Authority';
    this.baseUrl = 'https://zatca.gov.sa';
    this.regulationsUrl = `${this.baseUrl}/en/RulesRegulations/Pages/default.aspx`;
  }

  async scrape() {
    logger.info(`🔍 Starting ZATCA regulatory scrape...`);

    try {
      const cacheKey = `${this.regulatorId}:recent_changes`;
      const cached = await getCachedRegulatoryData(cacheKey);
      
      if (cached && cached.timestamp > Date.now() - 3600000) {
        logger.info(`✅ ZATCA: Using cached data (${cached.changes.length} changes)`);
        return cached.changes;
      }

      const changes = await this.scrapeRegulations();

      await cacheRegulatoryData(cacheKey, {
        timestamp: Date.now(),
        changes
      }, 3600);

      logger.info(`✅ ZATCA scrape completed: ${changes.length} changes found`);
      return changes;

    } catch (error) {
      logger.error(`❌ ZATCA scrape error:`, error);
      return [];
    }
  }

  async scrapeRegulations() {
    try {
      const response = await axios.get(this.regulationsUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const regulations = [];

      $('.regulation-item, .tax-update, article, .news-item').each((i, elem) => {
        const title = $(elem).find('h2, h3, .title, a').first().text().trim();
        const description = $(elem).find('.description, .summary, p').first().text().trim();
        const link = $(elem).find('a').attr('href');
        const dateText = $(elem).find('.date, time').text().trim();

        if (title && title.length > 10) {
          regulations.push({
            regulatorId: this.regulatorId,
            regulatorName: this.regulatorName,
            title: title,
            titleAr: null,
            description: description || `ZATCA Tax/Zakat Regulation: ${title}`,
            descriptionAr: null,
            regulationUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
            effectiveDate: this.parseDate(dateText),
            deadlineDate: this.calculateTaxDeadline(dateText),
            urgencyLevel: this.determineUrgency(title),
            affectedSectors: ['All Sectors', 'Commerce', 'Retail', 'Manufacturing', 'Services'],
            changeType: 'tax_regulation',
            documentRef: this.extractDocumentRef(title)
          });
        }
      });

      logger.info(`✅ ZATCA: Scraped ${regulations.length} regulations`);
      return regulations;

    } catch (error) {
      logger.error(`❌ ZATCA regulations scrape error:`, error.message);
      return [];
    }
  }

  determineUrgency(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('vat') || titleLower.includes('e-invoicing') ||
        titleLower.includes('mandatory') || titleLower.includes('penalty')) {
      return 'high';
    }
    if (titleLower.includes('deadline') || titleLower.includes('filing')) {
      return 'high';
    }
    return 'medium';
  }

  calculateTaxDeadline(dateText) {
    const effectiveDate = this.parseDate(dateText);
    if (!effectiveDate) return null;

    // Tax regulations typically have 3 months compliance window
    const deadline = new Date(effectiveDate);
    deadline.setMonth(deadline.getMonth() + 3);
    return deadline.toISOString().split('T')[0];
  }

  parseDate(dateText) {
    if (!dateText) return null;
    try {
      const date = new Date(dateText);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  extractDocumentRef(title) {
    const match = title.match(/(?:ZATCA|VAT|Circular)[:\-\s]*([A-Z0-9\-\/]+)/i);
    return match ? match[1] : null;
  }
}

module.exports = ZATCARegulatoryScraper;

