/**
 * Regulatory Intelligence API Routes
 * Provides endpoints for accessing regulatory changes and managing compliance calendar
 */

const express = require('express');
const router = express.Router();
const { getRecentChanges } = require('../config/database');
const { runManualScrape } = require('../src/scrapers/scrapeOrchestrator');
const { analyzeImpact } = require('../src/analyzers/ImpactAnalysisEngine');
const { addToCalendar, getUpcomingDeadlines, markCompleted } = require('../src/calendar/ComplianceDeadlineTracker');
const logger = require('../utils/logger');

/**
 * GET /api/regulatory/changes
 * Get recent regulatory changes
 */
router.get('/changes', async (req, res) => {
  try {
    const { regulator, limit = 50 } = req.query;
    const changes = await getRecentChanges(regulator, parseInt(limit));
    
    res.json({
      success: true,
      count: changes.length,
      data: changes
    });
  } catch (error) {
    logger.error('Error fetching changes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch regulatory changes'
    });
  }
});

/**
 * GET /api/regulatory/changes/:id
 * Get specific regulatory change with impact analysis
 */
router.get('/changes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = require('../config/database');
    
    const result = await pool.query(
      'SELECT * FROM regulatory_changes WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Regulatory change not found'
      });
    }
    
    const change = result.rows[0];
    const impact = await analyzeImpact(change);
    
    res.json({
      success: true,
      data: {
        ...change,
        impact
      }
    });
  } catch (error) {
    logger.error('Error fetching change details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch change details'
    });
  }
});

/**
 * POST /api/regulatory/scrape/:regulator
 * Trigger manual scrape for specific regulator
 */
router.post('/scrape/:regulator', async (req, res) => {
  try {
    const { regulator } = req.params;
    const result = await runManualScrape(regulator.toUpperCase());
    
    res.json({
      success: true,
      message: 'Manual scrape completed',
      data: result
    });
  } catch (error) {
    logger.error('Error running manual scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/regulatory/regulators
 * Get list of monitored regulators
 */
router.get('/regulators', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'SAMA', name: 'Saudi Central Bank', nameAr: 'البنك المركزي السعودي' },
      { id: 'NCA', name: 'National Cybersecurity Authority', nameAr: 'الهيئة الوطنية للأمن السيبراني' },
      { id: 'MOH', name: 'Ministry of Health', nameAr: 'وزارة الصحة' },
      { id: 'ZATCA', name: 'Zakat, Tax and Customs Authority', nameAr: 'هيئة الزكاة والضريبة والجمارك' },
      { id: 'SDAIA', name: 'Saudi Data & AI Authority', nameAr: 'الهيئة السعودية للبيانات والذكاء الاصطناعي' },
      { id: 'CMA', name: 'Capital Market Authority', nameAr: 'هيئة السوق المالية' }
    ]
  });
});

/**
 * POST /api/regulatory/calendar/add
 * Add regulatory change to organization calendar
 */
router.post('/calendar/add', async (req, res) => {
  try {
    const { regulatoryChangeId, organizationId } = req.body;
    
    if (!regulatoryChangeId || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'regulatoryChangeId and organizationId are required'
      });
    }
    
    const calendarItem = await addToCalendar(regulatoryChangeId, organizationId);
    
    res.json({
      success: true,
      message: 'Added to compliance calendar',
      data: calendarItem
    });
  } catch (error) {
    logger.error('Error adding to calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add to calendar'
    });
  }
});

/**
 * GET /api/regulatory/calendar/:organizationId
 * Get upcoming compliance deadlines for organization
 */
router.get('/calendar/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { days = 30 } = req.query;
    
    const deadlines = await getUpcomingDeadlines(
      parseInt(organizationId),
      parseInt(days)
    );
    
    res.json({
      success: true,
      count: deadlines.length,
      data: deadlines
    });
  } catch (error) {
    logger.error('Error fetching calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar'
    });
  }
});

/**
 * PUT /api/regulatory/calendar/:id/complete
 * Mark deadline as completed
 */
router.put('/calendar/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await markCompleted(parseInt(id));
    
    res.json({
      success: true,
      message: 'Deadline marked as completed',
      data: updated
    });
  } catch (error) {
    logger.error('Error marking deadline complete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark deadline as completed'
    });
  }
});

/**
 * GET /api/regulatory/stats
 * Get statistics about regulatory monitoring
 */
router.get('/stats', async (req, res) => {
  try {
    const { pool } = require('../config/database');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_changes,
        COUNT(CASE WHEN urgency_level = 'critical' THEN 1 END) as critical_changes,
        COUNT(CASE WHEN urgency_level = 'high' THEN 1 END) as high_changes,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as changes_last_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as changes_last_month
      FROM regulatory_changes
    `;
    
    const result = await pool.query(statsQuery);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;

