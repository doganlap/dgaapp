/**
 * NCA (National Cybersecurity Authority) Regulatory Scraper
 * Monitors NCA website for cybersecurity regulations, controls, and updates
 * Website: https://nca.gov.sa
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');
const { getCachedRegulatoryData, cacheRegulatoryData } = require('../../config/redis');

class NCARegulatoryScraper {
  constructor() {
    this.regulatorId = 'NCA';
    this.regulatorName = 'National Cybersecurity Authority';
    this.baseUrl = 'https://nca.gov.sa';
    this.regulationsUrl = `${this.baseUrl}/pages/regulations.html`;
    this.controlsUrl = `${this.baseUrl}/pages/ecc.html`; // Essential Cybersecurity Controls
  }

  /**
   * Main scraping function
   */
  async scrape() {
    logger.info(`🔍 Starting NCA regulatory scrape...`);

    try {
      const cacheKey = `${this.regulatorId}:recent_changes`;
      const cached = await getCachedRegulatoryData(cacheKey);
      
      if (cached && cached.timestamp > Date.now() - 3600000) {
        logger.info(`✅ NCA: Using cached data (${cached.changes.length} changes)`);
        return cached.changes;
      }

      const changes = [];

      // Scrape regulations
      const regulations = await this.scrapeRegulations();
      changes.push(...regulations);

      // Scrape Essential Cybersecurity Controls updates
      const controlUpdates = await this.scrapeControlUpdates();
      changes.push(...controlUpdates);

      // Cache results
      await cacheRegulatoryData(cacheKey, {
        timestamp: Date.now(),
        changes
      }, 3600);

      logger.info(`✅ NCA scrape completed: ${changes.length} changes found`);
      return changes;

    } catch (error) {
      logger.error(`❌ NCA scrape error:`, error);
      return [];
    }
  }

  /**
   * Scrape NCA regulations and policies
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

      $('.regulation-card, .policy-item, article, .content-item').each((i, elem) => {
        const title = $(elem).find('h2, h3, h4, .title, .card-title').text().trim();
        const description = $(elem).find('.description, .summary, p').first().text().trim();
        const link = $(elem).find('a').first().attr('href');
        const dateText = $(elem).find('.date, .publish-date, time').text().trim();

        if (title && title.length > 5) {
          regulations.push({
            regulatorId: this.regulatorId,
            regulatorName: this.regulatorName,
            title: title,
            titleAr: null,
            description: description || `NCA Cybersecurity Regulation: ${title}`,
            descriptionAr: null,
            regulationUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
            effectiveDate: this.parseDate(dateText),
            deadlineDate: this.calculateDeadline(dateText),
            urgencyLevel: this.determineUrgency(title),
            affectedSectors: this.determineAffectedSectors(title),
            changeType: 'cybersecurity_regulation',
            documentRef: this.extractDocumentRef(title)
          });
        }
      });

      logger.info(`✅ NCA: Scraped ${regulations.length} regulations`);
      return regulations;

    } catch (error) {
      logger.error(`❌ NCA regulations scrape error:`, error.message);
      return [];
    }
  }

  /**
   * Scrape Essential Cybersecurity Controls updates
   */
  async scrapeControlUpdates() {
    try {
      const response = await axios.get(this.controlsUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const updates = [];

      $('.control-update, .ecc-update, .update-item').each((i, elem) => {
        const title = $(elem).find('h2, h3, .title').text().trim();
        const description = $(elem).find('.description, p').first().text().trim();
        const link = $(elem).find('a').attr('href');

        if (title) {
          updates.push({
            regulatorId: this.regulatorId,
            regulatorName: this.regulatorName,
            title: `ECC Update: ${title}`,
            titleAr: null,
            description: description,
            descriptionAr: null,
            regulationUrl: link ? (link.startsWith('http') ? link : `${this.baseUrl}${link}`) : null,
            effectiveDate: null,
            deadlineDate: null,
            urgencyLevel: 'high', // ECC updates are typically high priority
            affectedSectors: ['All Sectors', 'Critical Infrastructure', 'Government', 'Banking', 'Healthcare', 'Telecommunications'],
            changeType: 'control_update',
            documentRef: this.extractControlRef(title)
          });
        }
      });

      logger.info(`✅ NCA: Scraped ${updates.length} control updates`);
      return updates;

    } catch (error) {
      logger.error(`❌ NCA control updates scrape error:`, error.message);
      return [];
    }
  }

  /**
   * Determine urgency based on keywords in title
   */
  determineUrgency(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('critical') || titleLower.includes('urgent') || 
        titleLower.includes('mandatory') || titleLower.includes('breach')) {
      return 'critical';
    }
    if (titleLower.includes('essential') || titleLower.includes('required') ||
        titleLower.includes('compliance')) {
      return 'high';
    }
    return 'medium';
  }

  /**
   * Determine affected sectors based on content
   */
  determineAffectedSectors(title) {
    const sectors = [];
    const titleLower = title.toLowerCase();

    if (titleLower.includes('critical infrastructure')) {
      sectors.push('Critical Infrastructure');
    }
    if (titleLower.includes('bank') || titleLower.includes('financial')) {
      sectors.push('Banking', 'Financial Services');
    }
    if (titleLower.includes('health') || titleLower.includes('hospital')) {
      sectors.push('Healthcare');
    }
    if (titleLower.includes('telecom') || titleLower.includes('communication')) {
      sectors.push('Telecommunications');
    }
    if (titleLower.includes('government') || titleLower.includes('public sector')) {
      sectors.push('Government');
    }

    return sectors.length > 0 ? sectors : ['All Sectors'];
  }

  /**
   * Calculate compliance deadline (typically 6 months for NCA)
   */
  calculateDeadline(dateText) {
    const effectiveDate = this.parseDate(dateText);
    if (!effectiveDate) return null;

    const deadline = new Date(effectiveDate);
    deadline.setMonth(deadline.getMonth() + 6); // 6 months to comply
    return deadline.toISOString().split('T')[0];
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
   * Extract document reference number
   */
  extractDocumentRef(title) {
    const match = title.match(/(?:NCA|ECC|Policy|Regulation)[:\-\s]*([A-Z0-9\-\/]+)/i);
    return match ? match[1] : null;
  }

  /**
   * Extract control reference from title
   */
  extractControlRef(title) {
    const match = title.match(/(?:ECC|Control)[:\-\s]*([0-9\.\-]+)/i);
    return match ? `ECC-${match[1]}` : null;
  }
}

module.exports = NCARegulatoryScraper;

