const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import database connection
const { testConnection } = require('./config/database');
// const passport = require('./config/passport');
const { optionalAuth } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const tenantsRoutes = require('./routes/tenants');
const documentsRoutes = require('./routes/documents');
const assessmentTemplatesRoutes = require('./routes/assessment-templates');
const sectorControlsRoutes = require('./routes/sector-controls');
const organizationsRoutes = require('./routes/organizations');
const assessmentsRoutes = require('./routes/assessments');
const frameworksRoutes = require('./routes/frameworks');
const controlsRoutes = require('./routes/controls');
const regulatorsRoutes = require('./routes/regulators');
const assessmentResponsesRoutes = require('./routes/assessment-responses');
const assessmentEvidenceRoutes = require('./routes/assessment-evidence');
const usersRoutes = require('./routes/users');
const tablesRoutes = require('./routes/tables');
const workflowRoutes = require('./routes/workflow');
const complianceRoutes = require('./routes/compliance');
const complianceReportsRoutes = require('./routes/compliance-reports');
const evidenceLibraryRoutes = require('./routes/evidence-library');
const dashboardRoutes = require('./routes/dashboard-multi-db');
const settingsRoutes = require('./routes/settings');
const ragRoutes = require('./routes/rag');

// Import new feature routes
const partnersRoutes = require('./routes/partners');
const notificationsRoutes = require('./routes/notifications');
const aiSchedulerRoutes = require('./routes/ai-scheduler');
const subscriptionsRoutes = require('./routes/subscriptions');

// Import MSP License & Renewal routes
const licensesRoutes = require('./routes/licenses');
const renewalsRoutes = require('./routes/renewals');
const usageRoutes = require('./routes/usage');

// Import new feature routes
const workflowsRoutes = require('./routes/workflows');
const auditLogsRoutes = require('./routes/audit-logs');
// const vectorSearchRoutes = require('./routes/vector-search'); // Moved to /demo
const automatedProvisioningRoutes = require('./routes/automated-provisioning');

// Import Auto Assessment Generator
const autoAssessmentRoutes = require('./routes/auto-assessment-generator');

// Import Cross-Database Operations
const crossDatabaseRoutes = require('./routes/cross-database');

// Import Advanced Analytics (Fixed)
const advancedAnalyticsRoutes = require('./routes/analytics-fixed');
const aiProxyRoutes = require('./routes/ai-proxy');

// Import admin routes
const supervisorRoutes = require('./routes/admin/supervisorRoutes');
// const platformRoutes = require('./routes/admin/platformRoutes'); // Moved to /demo



// Create Express app
const app = express();
// Trigger restart
const PORT = process.env.PORT || 3000;

// ==========================================
// CORS MIDDLEWARE (MUST BE FIRST!)
// ==========================================

// CORS configuration - More permissive for development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5001',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175'
    ];

    const isAllowed = allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Enhanced security headers - simplified for development
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  hsts: false, // Disable HSTS for development
  noSniff: true,
  xssFilter: true
}));

// Cookie parsing for auth cookies
app.use(cookieParser());

// Basic CSRF in production: set token cookie on GET, require X-CSRF-Token for mutating
const crypto = require('crypto');
app.use((req, res, next) => {
  try {
    const secure = process.env.NODE_ENV === 'production';
    if (req.method === 'GET' && !req.cookies.csrfToken) {
      const csrf = crypto.randomBytes(20).toString('hex');
      res.cookie('csrfToken', csrf, {
        httpOnly: false,
        secure,
        sameSite: 'Lax',
        path: '/',
      });
    }
  } catch {}
  next();
});

app.use((req, res, next) => {
  const secure = process.env.NODE_ENV === 'production';
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (secure && mutating) {
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies && req.cookies.csrfToken;
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return res.status(403).json({ success: false, message: 'CSRF validation failed' });
    }
  }
  next();
});

// Optional authentication middleware to populate req.user if token is present
// app.use('/api/', optionalAuth);

// Enhanced rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip auth routes and document uploads
    if (req.path.startsWith('/auth') || req.path.startsWith('/documents/upload')) {
      return true;
    }
    // Skip for authenticated users
    if (req.user) {
      return true;
    }
    return false;
  },
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Stricter rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
// app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/documents/upload', uploadLimiter);

// Register auth routes before security stack
app.use('/api/auth', authRoutes);

// Enhanced security middleware stack
const { securityStack } = require('./middleware/security');
app.use('/api/', ...securityStack());

// ==========================================
// GENERAL MIDDLEWARE
// ==========================================

// CORS is already configured above

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware (already applied above)

// Passport middleware
// app.use(passport.initialize());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Note: Frontend is now a separate service, no longer served from here
// app.use(express.static(path.join(__dirname, '../frontend/build')));

// ==========================================
// API ROUTES
// ==========================================

// Health check endpoints (must be before catch-all route)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'connected'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'connected' // This will be updated after DB test
  });
});

// API version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    name: 'GRC Template System API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Production-ready compliance platform with sector-based intelligence',
    author: 'Shahin-AI Platform',
    endpoints: {
      health: '/api/health',
      sectorControls: '/api/sector-controls',
      organizations: '/api/organizations',
      assessments: '/api/assessments',
      frameworks: '/api/grc-frameworks',
      controls: '/api/grc-controls',
      regulators: '/api/regulators',
      assessmentTemplates: '/api/assessment-templates',
      assessmentResponses: '/api/assessment-responses',
      assessmentEvidence: '/api/assessment-evidence',
      users: '/api/users',
      tables: '/api/tables',
      partners: '/api/partners',
      notifications: '/api/notifications',
      aiScheduler: '/api/ai-scheduler',
      subscriptions: '/api/subscriptions'
    }
  });
});

// Register API routes
app.use('/api/tenants', tenantsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/assessment-templates', assessmentTemplatesRoutes);
app.use('/api/sector-controls', sectorControlsRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/grc-frameworks', frameworksRoutes);
app.use('/api/frameworks', frameworksRoutes); // Alias for convenience
app.use('/api/grc-controls', controlsRoutes);
app.use('/api/controls', controlsRoutes); // Alias for convenience
app.use('/api/regulators', regulatorsRoutes);
app.use('/api/assessment-responses', assessmentResponsesRoutes);
app.use('/api/assessment-evidence', assessmentEvidenceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/assessment-workflow', workflowRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/compliance-reports', complianceReportsRoutes);
app.use('/api/compliance-metrics', complianceReportsRoutes);
app.use('/api/evidence-library', evidenceLibraryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/rag', ragRoutes);

// ==========================================
// NEW FEATURE ROUTES
// ==========================================

// Partners management
app.use('/api/partners', partnersRoutes);

// Notifications system
app.use('/api/notifications', notificationsRoutes);

// AI Scheduler
app.use('/api/ai-scheduler', aiSchedulerRoutes);

// Subscription management
app.use('/api/subscriptions', subscriptionsRoutes);

// ==========================================
// MSP LICENSE & RENEWAL ROUTES
// ==========================================

// License catalog and tenant licenses
app.use('/api/licenses', licensesRoutes);

// Renewal opportunities and dunning
app.use('/api/renewals', renewalsRoutes);

// Usage tracking and enforcement
app.use('/api/usage', usageRoutes);

// Workflows and automation
app.use('/api/workflows', workflowsRoutes);

// Audit logs and compliance
app.use('/api/audit-logs', auditLogsRoutes);

// Vector search and RAG
// app.use('/api/vector-search', vectorSearchRoutes); // Moved to /demo

// Automated tenant provisioning (no human intervention)
app.use('/api/automated-provisioning', automatedProvisioningRoutes);

// Auto Assessment Generator (KSA Regulators)
app.use('/api/auto-assessment', autoAssessmentRoutes);

// Cross-Database Operations (3-Database Architecture)
app.use('/api/cross-db', crossDatabaseRoutes);

// Advanced Analytics (15+ Holistic Charts)
app.use('/api/analytics', advancedAnalyticsRoutes);
app.use('/api/ai', aiProxyRoutes);

// Regulatory Market Intelligence
const regulatoryMarketRoutes = require('./routes/regulatory-market');
app.use('/api/regulatory', regulatoryMarketRoutes);

// Simplified Test Endpoints (No Auth)
app.get('/api/tenants-simple', async (req, res) => {
  try {
    const { dbQueries } = require('./config/database');
    const result = await dbQueries.finance.query('SELECT id, name, status, created_at FROM tenants ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/frameworks-simple', async (req, res) => {
  try {
    const { dbQueries } = require('./config/database');
    const result = await dbQueries.compliance.query('SELECT id, name, description, created_at FROM frameworks ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users-simple', async (req, res) => {
  try {
    const { dbQueries } = require('./config/database');
    const result = await dbQueries.auth.query('SELECT id, email, username, first_name, last_name, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simplified Test Endpoints (No Auth)
app.get('/api/tenants-simple', async (req, res) => {
  try {
    const { dbQueries } = require('./config/database');
    const result = await dbQueries.finance.query('SELECT id, name, status, created_at FROM tenants ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/frameworks-simple', async (req, res) => {
  try {
    const { dbQueries } = require('./config/database');
    const result = await dbQueries.compliance.query('SELECT id, name, description, created_at FROM frameworks ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users-simple', async (req, res) => {
  try {
    const { dbQueries } = require('./config/database');
    const result = await dbQueries.auth.query('SELECT id, email, username, first_name, last_name, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/activity-simple', async (req, res) => {
  try {
    const { dbQueries } = require('./config/database');
    const limit = parseInt(req.query.limit) || 10;

    // Get simple activities from all databases
    const [complianceActivity, financeActivity, authActivity] = await Promise.all([
      dbQueries.compliance.query(`
        SELECT
          'assessment' as type,
          id as entity_id,
          'Assessment created' as title,
          'New assessment created' as description,
          status as action,
          created_at as timestamp
        FROM assessments
        ORDER BY created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)]),

      dbQueries.finance.query(`
        SELECT
          'tenant' as type,
          id as entity_id,
          name as title,
          'Tenant: ' || name as description,
          status as action,
          created_at as timestamp
        FROM tenants
        ORDER BY created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)]),

      dbQueries.auth.query(`
        SELECT
          'user' as type,
          id as entity_id,
          email as title,
          'User: ' || email as description,
          CASE WHEN is_active THEN 'active' ELSE 'inactive' END as action,
          created_at as timestamp
        FROM users
        ORDER BY created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)])
    ]);

    // Combine activities
    const allActivities = [
      ...complianceActivity.rows.map(row => ({ ...row, source: 'compliance' })),
      ...financeActivity.rows.map(row => ({ ...row, source: 'finance' })),
      ...authActivity.rows.map(row => ({ ...row, source: 'auth' }))
    ];

    // Sort by timestamp
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.json({
      success: true,
      data: sortedActivities,
      source: 'multi-database',
      databases_queried: 3
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/activity-simple', async (req, res) => {
  try {
    const { dbQueries } = require('./config/database');
    const limit = parseInt(req.query.limit) || 10;

    // Get simple activities from all databases
    const [complianceActivity, financeActivity, authActivity] = await Promise.all([
      dbQueries.compliance.query(`
        SELECT
          'assessment' as type,
          id as entity_id,
          'Assessment created' as title,
          'New assessment created' as description,
          status as action,
          created_at as timestamp
        FROM assessments
        ORDER BY created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)]),

      dbQueries.finance.query(`
        SELECT
          'tenant' as type,
          id as entity_id,
          name as title,
          'Tenant: ' || name as description,
          status as action,
          created_at as timestamp
        FROM tenants
        ORDER BY created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)]),

      dbQueries.auth.query(`
        SELECT
          'user' as type,
          id as entity_id,
          email as title,
          'User: ' || email as description,
          CASE WHEN is_active THEN 'active' ELSE 'inactive' END as action,
          created_at as timestamp
        FROM users
        ORDER BY created_at DESC
        LIMIT $1
      `, [Math.ceil(limit / 3)])
    ]);

    // Combine activities
    const allActivities = [
      ...complianceActivity.rows.map(row => ({ ...row, source: 'compliance' })),
      ...financeActivity.rows.map(row => ({ ...row, source: 'finance' })),
      ...authActivity.rows.map(row => ({ ...row, source: 'auth' }))
    ];

    // Sort by timestamp
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.json({
      success: true,
      data: sortedActivities,
      source: 'multi-database',
      databases_queried: 3
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Supervisor admin routes
app.use('/api/supervisor', supervisorRoutes);

// Platform admin routes
// app.use('/api/platform', platformRoutes); // Moved to /demo



// ==========================================
// FRONTEND ROUTING
// ==========================================

// Note: Frontend is now a separate service (web container)
// All non-API routes should return 404 or be handled by BFF
app.get('*', (req, res, next) => {
  // Allow health check and other system endpoints
  if (req.path === '/health' || req.path === '/healthz' || req.path === '/ready') {
    return next();
  }
  
  // Only handle non-API routes that aren't already handled
  if (!req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: 'Not found',
      message: 'Frontend is served separately. Access via http://localhost:5174'
    });
  } else {
    // Pass to next middleware for API routes
    next();
  }
});

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
    availableEndpoints: [
      '/api/health',
      '/api/version',
      '/api/sector-controls',
      '/api/organizations',
      '/api/assessments',
      '/api/grc-frameworks',
      '/api/grc-controls',
      '/api/regulators',
      '/api/assessment-templates',
      '/api/assessment-responses',
      '/api/assessment-evidence',
      '/api/users',
      '/api/tables'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error handler:', error);

  // Database errors
  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      message: 'A record with this information already exists',
      details: error.detail
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Foreign key constraint violation',
      message: 'Referenced record does not exist',
      details: error.detail
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: error.message,
      details: error.details
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Authentication token is invalid'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Authentication token has expired'
    });
  }

  // Default error response
  const statusCode = error.statusCode || error.status || 500;
  res.status(statusCode).json({
    success: false,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ==========================================
// SERVER STARTUP
// ==========================================

const startServer = async () => {
  try {
    // Test database connection
    console.log('[INFO] Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('[ERROR] Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log('===============================================');
      console.log('[INFO] GRC Template System Backend Started');
      console.log('===============================================');
      console.log(`[INFO] Server running on port ${PORT}`);
      console.log(`[INFO] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[INFO] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[INFO] API docs: http://localhost:${PORT}/api/version`);
      console.log('===============================================');
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n[INFO] Received ${signal}. Graceful shutdown...`);
      server.close(() => {
        console.log('[INFO] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
