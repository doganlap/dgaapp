const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const partnersRoutes = require('./routes/partners');
const collaborationsRoutes = require('./routes/collaborations');
const resourcesRoutes = require('./routes/resources');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3003;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Service-Token']
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

const validateServiceToken = (req, res, next) => {
  const serviceToken = req.headers['x-service-token'];
  const expectedToken = process.env.SERVICE_TOKEN || 'default-token';
  
  if (!serviceToken || serviceToken === expectedToken) {
    return next();
  }
  
  if (req.path.startsWith('/api/') && serviceToken !== expectedToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid service token',
      message: 'Service-to-service authentication failed'
    });
  }
  
  next();
};

app.use('/api/', validateServiceToken);

// ==========================================
// ROUTES
// ==========================================

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'partner-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/readyz', async (req, res) => {
  const dbConnected = await testConnection();
  if (dbConnected) {
    res.status(200).json({ status: 'ready', service: 'partner-service' });
  } else {
    res.status(503).json({ status: 'not ready', service: 'partner-service' });
  }
});

app.use('/api/partners', partnersRoutes);
app.use('/api/collaborations', collaborationsRoutes);
app.use('/api/partners', resourcesRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error('[Partner Service] Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.path} not found`
  });
});

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('[Partner Service] Database connection failed. Retrying in 5 seconds...');
      setTimeout(startServer, 5000);
      return;
    }

    app.listen(PORT, () => {
      console.log(`🚀 Partner Service running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[Partner Service] Failed to start:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;

