const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const documentsRoutes = require('./routes/documents');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// ==========================================
// MIDDLEWARE
// ==========================================

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Service-Token']
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Lower limit for file uploads
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Service token validation
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

// Serve uploaded files (for download)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// ROUTES
// ==========================================

// Health checks
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/readyz', async (req, res) => {
  const dbConnected = await testConnection();
  if (dbConnected) {
    res.status(200).json({ status: 'ready', service: 'document-service' });
  } else {
    res.status(503).json({ status: 'not ready', service: 'document-service' });
  }
});

// API Routes
app.use('/api/documents', documentsRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error('[Document Service] Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
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
      console.error('[Document Service] Database connection failed. Retrying in 5 seconds...');
      setTimeout(startServer, 5000);
      return;
    }

    app.listen(PORT, () => {
      console.log(`🚀 Document Service running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[Document Service] Failed to start:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;

