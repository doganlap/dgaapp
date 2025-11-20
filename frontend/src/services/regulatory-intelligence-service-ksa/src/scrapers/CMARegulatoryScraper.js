/**
 * CMA (Capital Market Authority) Regulatory Scraper
 * Monitors CMA website for capital market and securities regulations
 * Website: https://cma.org.sa
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');
const { getCachedRegulatoryData, cacheRegulatoryData } = require('../../config/redis');

class CMARegulatoryScraper {
  constructor() {
    this.regulatorId = 'CMA';
    this.regulatorName = 'Capital Market Authority';
    this.baseUrl = 'https://cma.org.sa';
    this.regulationsUrl = `${this.baseUrl}/en/RulesRegulations/Pages/default.aspx`;
  }

  async scrape() {
    logger.info(`🔍 Starting CMA regulatory scrape...`);

    try {
      const cacheKey = `${this.regulatorId}:recent_changes`;
      const cached = await getCachedRegulatoryData(cacheKey);
      
      if (cached && cached.timestamp > Date.now() - 3600000) {
        logger.info(`✅ CMA: Using cached data (${cached.changes.length} changes)`);
        return cached.changes;
      }

      const changes = await this.scrapeRegulations();

      await cacheRegulatoryData(cacheKey, {
        timestamp: Date.now(),
        changes
      }, 3600);

      logger.info(`✅ CMA scrape completed: ${changes.length} changes found`);
      return changes;

    } catch (error) {
      logger.error(`❌ CMA scrape error:`, error);
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

      $('.regulation-item, .rule-item, article, .cma-update').each((i, elem) => {
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
            description: description || `CMA Capital Market Regulation: ${title}`,
            descriptionAr: null,
            regulationUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
            effectiveDate: this.parseDate(dateText),
            deadlineDate: null,
            urgencyLevel: this.determineUrgency(title),
            affectedSectors: ['Banking', 'Financial Services', 'Investment', 'Insurance', 'Capital Markets'],
            changeType: 'capital_market_regulation',
            documentRef: this.extractDocumentRef(title)
          });
        }
      });

      logger.info(`✅ CMA: Scraped ${regulations.length} regulations`);
      return regulations;

    } catch (error) {
      logger.error(`❌ CMA regulations scrape error:`, error.message);
      return [];
    }
  }

  determineUrgency(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('mandatory') || titleLower.includes('required') ||
        titleLower.includes('disclosure') || titleLower.includes('listing')) {
      return 'high';
    }
    if (titleLower.includes('amendment') || titleLower.includes('update')) {
      return 'medium';
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
    const match = title.match(/(?:CMA|Rule|Regulation)[:\-\s]*([A-Z0-9\-\/]+)/i);
    return match ? match[1] : null;
  }
}

module.exports = CMARegulatoryScraper;

