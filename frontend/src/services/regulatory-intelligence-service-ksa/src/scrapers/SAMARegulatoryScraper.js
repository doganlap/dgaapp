/**
 * SAMA (Saudi Central Bank) Regulatory Scraper
 * Monitors SAMA website for new regulations, circulars, and supervisory rules
 * Website: https://www.sama.gov.sa
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');
const { getCachedRegulatoryData, cacheRegulatoryData } = require('../../config/redis');

class SAMARegulatoryScraper {
  constructor() {
    this.regulatorId = 'SAMA';
    this.regulatorName = 'Saudi Central Bank (SAMA)';
    this.baseUrl = 'https://www.sama.gov.sa';
    this.regulationsUrl = `${this.baseUrl}/en-us/laws-and-regulations/Pages/default.aspx`;
    this.circularsUrl = `${this.baseUrl}/en-us/laws-and-regulations/Pages/Circulars.aspx`;
  }

  /**
   * Main scraping function
   */
  async scrape() {
    logger.info(`🔍 Starting SAMA regulatory scrape...`);

    try {
      // Check cache first
      const cacheKey = `${this.regulatorId}:recent_changes`;
      const cached = await getCachedRegulatoryData(cacheKey);
      
      if (cached && cached.timestamp > Date.now() - 3600000) { // 1 hour cache
        logger.info(`✅ SAMA: Using cached data (${cached.changes.length} changes)`);
        return cached.changes;
      }

      const changes = [];

      // Scrape regulations page
      const regulations = await this.scrapeRegulations();
      changes.push(...regulations);

      // Scrape circulars page
      const circulars = await this.scrapeCirculars();
      changes.push(...circulars);

      // Cache results
      await cacheRegulatoryData(cacheKey, {
        timestamp: Date.now(),
        changes
      }, 3600); // 1 hour

      logger.info(`✅ SAMA scrape completed: ${changes.length} changes found`);
      return changes;

    } catch (error) {
      logger.error(`❌ SAMA scrape error:`, error);
      return [];
    }
  }

  /**
   * Scrape regulations and supervisory rules
   */
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

      // Example scraping logic (adjust selectors based on actual SAMA website structure)
      $('.regulation-item, .law-item, article').each((i, elem) => {
        const title = $(elem).find('h2, h3, .title').text().trim();
        const description = $(elem).find('.description, .summary, p').first().text().trim();
        const link = $(elem).find('a').attr('href');
        const dateText = $(elem).find('.date, .publish-date, time').text().trim();

        if (title) {
          regulations.push({
            regulatorId: this.regulatorId,
            regulatorName: this.regulatorName,
            title: title,
            titleAr: null, // Would need Arabic version scraping
            description: description,
            descriptionAr: null,
            regulationUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
            effectiveDate: this.parseDate(dateText),
            deadlineDate: null,
            urgencyLevel: 'high', // SAMA regulations are typically high priority
            affectedSectors: ['Banking', 'Financial Services', 'Insurance'],
            changeType: 'regulation',
            documentRef: this.extractDocumentRef(title)
          });
        }
      });

      logger.info(`✅ SAMA: Scraped ${regulations.length} regulations`);
      return regulations;

    } catch (error) {
      logger.error(`❌ SAMA regulations scrape error:`, error.message);
      return [];
    }
  }

  /**
   * Scrape SAMA circulars
   */
  async scrapeCirculars() {
    try {
      const response = await axios.get(this.circularsUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const circulars = [];

      // Example scraping logic (adjust selectors based on actual website)
      $('.circular-item, .document-item, li').each((i, elem) => {
        const title = $(elem).find('a, .title').text().trim();
        const link = $(elem).find('a').attr('href');
        const dateText = $(elem).find('.date, time').text().trim();

        if (title && title.length > 10) {
          circulars.push({
            regulatorId: this.regulatorId,
            regulatorName: this.regulatorName,
            title: title,
            titleAr: null,
            description: `SAMA Circular - ${title.substring(0, 100)}`,
            descriptionAr: null,
            regulationUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
            effectiveDate: this.parseDate(dateText),
            deadlineDate: null,
            urgencyLevel: 'medium',
            affectedSectors: ['Banking', 'Financial Services'],
            changeType: 'circular',
            documentRef: this.extractDocumentRef(title)
          });
        }
      });

      logger.info(`✅ SAMA: Scraped ${circulars.length} circulars`);
      return circulars;

    } catch (error) {
      logger.error(`❌ SAMA circulars scrape error:`, error.message);
      return [];
    }
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateText) {
    if (!dateText) return null;

    try {
      const date = new Date(dateText);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  /**
   * Extract document reference number from title
   */
  extractDocumentRef(title) {
    // Common SAMA document reference formats: "Circular No. 123/2024", "Rule 45-2024"
    const match = title.match(/(?:No\.|#|Circular|Rule)\s*[:\.]?\s*([A-Z0-9\-\/]+)/i);
    return match ? match[1] : null;
  }
}

module.exports = SAMARegulatoryScraper;

