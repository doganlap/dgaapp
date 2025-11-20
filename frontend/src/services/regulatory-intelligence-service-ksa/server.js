/**
 * Regulatory Intelligence Service - KSA
 * Real-time monitoring and analysis of Saudi Arabian regulatory changes
 * 
 * Monitors: SAMA, NCA, MOH, SDAIA, ZATCA, CMA
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const regulatoryRoutes = require('./routes/regulatory');
const { initializeDatabase } = require('./config/database');
const { initializeRedis } = require('./config/redis');
const { startRegulatoryScraping } = require('./src/scrapers/scrapeOrchestrator');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'regulatory-intelligence-ksa',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'regulatory-intelligence-ksa',
    timestamp: new Date().toISOString()
  });
});

app.get('/readyz', async (req, res) => {
  try {
    // Check database connection
    const dbHealth = await initializeDatabase();
    // Check Redis connection
    const redisHealth = await initializeRedis();
    
    if (dbHealth && redisHealth) {
      res.status(200).json({ 
        status: 'ready',
        database: 'connected',
        redis: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Routes
app.use('/api/regulatory', regulatoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, async () => {
  logger.info(`🚀 Regulatory Intelligence Service (KSA) running on port ${PORT}`);
  
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('✅ Database initialized');
    
    // Initialize Redis
    await initializeRedis();
    logger.info('✅ Redis initialized');
    
    // Start regulatory scraping jobs
    startRegulatoryScraping();
    logger.info('✅ Regulatory monitoring started for 6 KSA regulators');
    
  } catch (error) {
    logger.error('❌ Initialization error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;

