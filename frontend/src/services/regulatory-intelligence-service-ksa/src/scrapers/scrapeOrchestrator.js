/**
 * Scrape Orchestrator
 * Coordinates scraping of all 6 Saudi regulatory authorities
 * Runs scheduled jobs to monitor regulatory changes
 */

const cron = require('node-cron');
const logger = require('../../utils/logger');
const SAMARegulatoryScraper = require('./SAMARegulatoryScraper');
const NCARegulatoryScraper = require('./NCARegulatoryScraper');
const MOHRegulatoryScraper = require('./MOHRegulatoryScraper');
const ZATCARegulatoryScraper = require('./ZATCARegulatoryScraper');
const SDAIARegulatoryScraper = require('./SDAIARegulatoryScraper');
const CMARegulatoryScraper = require('./CMARegulatoryScraper');

const scrapers = [
  {
    name: 'SAMA (Saudi Central Bank)',
    scraper: new SAMARegulatoryScraper(),
    schedule: '0 */6 * * *' // Every 6 hours
  },
  {
    name: 'NCA (National Cybersecurity Authority)',
    scraper: new NCARegulatoryScraper(),
    schedule: '0 */4 * * *' // Every 4 hours  
  },
  {
    name: 'MOH (Ministry of Health)',
    scraper: new MOHRegulatoryScraper(),
    schedule: '0 */6 * * *' // Every 6 hours
  },
  {
    name: 'ZATCA (Zakat, Tax and Customs Authority)',
    scraper: new ZATCARegulatoryScraper(),
    schedule: '0 */6 * * *' // Every 6 hours
  },
  {
    name: 'SDAIA (Saudi Data & AI Authority)',
    scraper: new SDAIARegulatoryScraper(),
    schedule: '0 */6 * * *' // Every 6 hours
  },
  {
    name: 'CMA (Capital Market Authority)',
    scraper: new CMARegulatoryScraper(),
    schedule: '0 */6 * * *' // Every 6 hours
  }
];

/**
 * Start regulatory scraping jobs
 */
function startRegulatoryScraping() {
  logger.info('🚀 Starting regulatory scraping for 6 KSA authorities...');

  scrapers.forEach(({ name, scraper, schedule }) => {
    // Schedule periodic scraping
    cron.schedule(schedule, async () => {
      logger.info(`⏰ Running scheduled scrape for ${name}`);
      try {
        const changes = await scraper.scrape();
        logger.info(`✅ ${name}: Found ${changes.length} regulatory changes`);
        
        if (changes.length > 0) {
          // Process and notify about new changes
          await processRegulatoryChanges(name, changes);
        }
      } catch (error) {
        logger.error(`❌ Error scraping ${name}:`, error);
      }
    });

    logger.info(`✅ Scheduled scraping for ${name} (${schedule})`);

    // Run initial scrape immediately
    setTimeout(async () => {
      logger.info(`🔍 Running initial scrape for ${name}`);
      try {
        const changes = await scraper.scrape();
        logger.info(`✅ ${name}: Found ${changes.length} regulatory changes (initial)`);
        
        if (changes.length > 0) {
          await processRegulatoryChanges(name, changes);
        }
      } catch (error) {
        logger.error(`❌ Error in initial scrape for ${name}:`, error);
      }
    }, Math.random() * 10000); // Random delay 0-10 seconds to avoid overwhelming systems
  });
}

/**
 * Process regulatory changes and trigger notifications
 */
async function processRegulatoryChanges(regulatorName, changes) {
  const { saveRegulatoryChange } = require('../../config/database');
  const { analyzeImpact } = require('../analyzers/ImpactAnalysisEngine');
  const { sendNotifications } = require('../notifications/NotificationOrchestrator');

  for (const change of changes) {
    try {
      // Save to database
      const savedChange = await saveRegulatoryChange(change);
      
      // Analyze impact using AI
      const impactAnalysis = await analyzeImpact(savedChange);
      
      // Send notifications to affected organizations
      await sendNotifications(savedChange, impactAnalysis);
      
      logger.info(`✅ Processed change: ${change.title.substring(0, 50)}...`);
    } catch (error) {
      logger.error(`❌ Error processing change:`, error);
    }
  }
}

/**
 * Run manual scrape for specific regulator
 */
async function runManualScrape(regulatorId) {
  const scraperInfo = scrapers.find(s => 
    s.scraper.regulatorId === regulatorId
  );

  if (!scraperInfo) {
    throw new Error(`No scraper found for regulator: ${regulatorId}`);
  }

  logger.info(`🔍 Running manual scrape for ${scraperInfo.name}`);
  const changes = await scraperInfo.scraper.scrape();
  await processRegulatoryChanges(scraperInfo.name, changes);
  
  return {
    regulator: scraperInfo.name,
    changesFound: changes.length,
    changes
  };
}

module.exports = {
  startRegulatoryScraping,
  runManualScrape
};

