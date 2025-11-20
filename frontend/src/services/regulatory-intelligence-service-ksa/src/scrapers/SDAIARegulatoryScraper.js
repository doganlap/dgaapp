/**
 * SDAIA (Saudi Data & AI Authority) Regulatory Scraper
 * Monitors SDAIA website for data protection and AI regulations
 * Website: https://sdaia.gov.sa
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');
const { getCachedRegulatoryData, cacheRegulatoryData } = require('../../config/redis');

class SDAIARegulatoryScraper {
  constructor() {
    this.regulatorId = 'SDAIA';
    this.regulatorName = 'Saudi Data & AI Authority';
    this.baseUrl = 'https://sdaia.gov.sa';
    this.regulationsUrl = `${this.baseUrl}/en/SDAIA/Regulations/Pages/default.aspx`;
  }

  async scrape() {
    logger.info(`🔍 Starting SDAIA regulatory scrape...`);

    try {
      const cacheKey = `${this.regulatorId}:recent_changes`;
      const cached = await getCachedRegulatoryData(cacheKey);
      
      if (cached && cached.timestamp > Date.now() - 3600000) {
        logger.info(`✅ SDAIA: Using cached data (${cached.changes.length} changes)`);
        return cached.changes;
      }

      const changes = await this.scrapeRegulations();

      await cacheRegulatoryData(cacheKey, {
        timestamp: Date.now(),
        changes
      }, 3600);

      logger.info(`✅ SDAIA scrape completed: ${changes.length} changes found`);
      return changes;

    } catch (error) {
      logger.error(`❌ SDAIA scrape error:`, error);
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

      $('.regulation-card, .policy-item, article, .pdpl-update').each((i, elem) => {
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
            description: description || `SDAIA Data/AI Regulation: ${title}`,
            descriptionAr: null,
            regulationUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
            effectiveDate: this.parseDate(dateText),
            deadlineDate: this.calculateDeadline(dateText),
            urgencyLevel: this.determineUrgency(title),
            affectedSectors: ['Technology', 'E-commerce', 'Banking', 'Healthcare', 'All Sectors'],
            changeType: 'data_regulation',
            documentRef: this.extractDocumentRef(title)
          });
        }
      });

      logger.info(`✅ SDAIA: Scraped ${regulations.length} regulations`);
      return regulations;

    } catch (error) {
      logger.error(`❌ SDAIA regulations scrape error:`, error.message);
      return [];
    }
  }

  determineUrgency(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('pdpl') || titleLower.includes('personal data') ||
        titleLower.includes('privacy') || titleLower.includes('mandatory')) {
      return 'high';
    }
    if (titleLower.includes('ai') || titleLower.includes('artificial intelligence')) {
      return 'high';
    }
    return 'medium';
  }

  calculateDeadline(dateText) {
    const effectiveDate = this.parseDate(dateText);
    if (!effectiveDate) return null;

    // PDPL regulations typically have 6 months compliance window
    const deadline = new Date(effectiveDate);
    deadline.setMonth(deadline.getMonth() + 6);
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
    const match = title.match(/(?:SDAIA|PDPL|Policy)[:\-\s]*([A-Z0-9\-\/]+)/i);
    return match ? match[1] : null;
  }
}

module.exports = SDAIARegulatoryScraper;

