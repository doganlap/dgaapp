/**
 * MOH (Ministry of Health) Regulatory Scraper
 * Monitors MOH website for health regulations and compliance requirements
 * Website: https://www.moh.gov.sa
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');
const { getCachedRegulatoryData, cacheRegulatoryData } = require('../../config/redis');

class MOHRegulatoryScraper {
  constructor() {
    this.regulatorId = 'MOH';
    this.regulatorName = 'Ministry of Health';
    this.baseUrl = 'https://www.moh.gov.sa';
    this.regulationsUrl = `${this.baseUrl}/en/Ministry/Rules/Pages/default.aspx`;
  }

  async scrape() {
    logger.info(`🔍 Starting MOH regulatory scrape...`);

    try {
      const cacheKey = `${this.regulatorId}:recent_changes`;
      const cached = await getCachedRegulatoryData(cacheKey);
      
      if (cached && cached.timestamp > Date.now() - 3600000) {
        logger.info(`✅ MOH: Using cached data (${cached.changes.length} changes)`);
        return cached.changes;
      }

      const changes = await this.scrapeRegulations();

      await cacheRegulatoryData(cacheKey, {
        timestamp: Date.now(),
        changes
      }, 3600);

      logger.info(`✅ MOH scrape completed: ${changes.length} changes found`);
      return changes;

    } catch (error) {
      logger.error(`❌ MOH scrape error:`, error);
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

      $('.regulation-item, .rule-item, article, .content-block').each((i, elem) => {
        const title = $(elem).find('h2, h3, .title, a').first().text().trim();
        const description = $(elem).find('.description, p').first().text().trim();
        const link = $(elem).find('a').attr('href');
        const dateText = $(elem).find('.date, time').text().trim();

        if (title && title.length > 10) {
          regulations.push({
            regulatorId: this.regulatorId,
            regulatorName: this.regulatorName,
            title: title,
            titleAr: null,
            description: description || `MOH Health Regulation: ${title}`,
            descriptionAr: null,
            regulationUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
            effectiveDate: this.parseDate(dateText),
            deadlineDate: null,
            urgencyLevel: this.determineUrgency(title),
            affectedSectors: ['Healthcare', 'Hospitals', 'Clinics', 'Pharmaceutical', 'Medical Devices'],
            changeType: 'health_regulation',
            documentRef: this.extractDocumentRef(title)
          });
        }
      });

      logger.info(`✅ MOH: Scraped ${regulations.length} regulations`);
      return regulations;

    } catch (error) {
      logger.error(`❌ MOH regulations scrape error:`, error.message);
      return [];
    }
  }

  determineUrgency(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('patient safety') || titleLower.includes('emergency') ||
        titleLower.includes('critical')) {
      return 'critical';
    }
    if (titleLower.includes('mandatory') || titleLower.includes('required')) {
      return 'high';
    }
    return 'medium';
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
    const match = title.match(/(?:MOH|Regulation|Rule)[:\-\s]*([A-Z0-9\-\/]+)/i);
    return match ? match[1] : null;
  }
}

module.exports = MOHRegulatoryScraper;

