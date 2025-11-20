const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { verifyConnection } = require('./config/smtp');

// Import routes
const notificationsRoutes = require('./routes/notifications');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3004;

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
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/readyz', async (req, res) => {
  const smtpConnected = await verifyConnection();
  if (smtpConnected) {
    res.status(200).json({ status: 'ready', service: 'notification-service' });
  } else {
    res.status(503).json({ status: 'not ready', service: 'notification-service' });
  }
});

app.use('/api/notifications', notificationsRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error('[Notification Service] Error:', err);
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
    const smtpConnected = await verifyConnection();
    if (!smtpConnected) {
      console.warn('[Notification Service] SMTP connection failed, but continuing...');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Notification Service running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[Notification Service] Failed to start:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;

