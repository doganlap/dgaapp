const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cron = require('node-cron');
require('dotenv').config();

// Import services
const AIScheduler = require('./services/aiScheduler');
// const TaskPrioritizer = require('./services/taskPrioritizer');
// const WorkloadBalancer = require('./services/workloadBalancer');
// const PredictiveAnalytics = require('./services/predictiveAnalytics');

// Import routes
// const schedulerRoutes = require('./routes/scheduler');
// const analyticsRoutes = require('./routes/analytics');
// const tasksRoutes = require('./routes/tasks');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3007;

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

// ==========================================
// INITIALIZE AI SERVICES
// ==========================================

let aiScheduler, taskPrioritizer, workloadBalancer, predictiveAnalytics;

const initializeAIServices = async () => {
  try {
    console.log('🤖 Initializing AI services...');

    aiScheduler = new AIScheduler();
    // taskPrioritizer = new TaskPrioritizer();
    // workloadBalancer = new WorkloadBalancer();
    // predictiveAnalytics = new PredictiveAnalytics();

    await aiScheduler.initialize();
    // await taskPrioritizer.initialize();
    // await workloadBalancer.initialize();
    // await predictiveAnalytics.initialize();

    console.log('✅ AI services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AI services:', error);
    throw error;
  }
};

// Make services available to routes
app.locals.aiScheduler = () => aiScheduler;
app.locals.taskPrioritizer = () => taskPrioritizer;
app.locals.workloadBalancer = () => workloadBalancer;
app.locals.predictiveAnalytics = () => predictiveAnalytics;

// ==========================================
// ROUTES
// ==========================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ai-scheduler-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/readyz', async (req, res) => {
  try {
    const servicesReady = aiScheduler; // Only check for available services
    if (servicesReady) {
      res.status(200).json({
        status: 'ready',
        service: 'ai-scheduler-service',
        services: {
          aiScheduler: !!aiScheduler,
          taskPrioritizer: false, // Not available
          workloadBalancer: false, // Not available
          predictiveAnalytics: false // Not available
        }
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        service: 'ai-scheduler-service',
        message: 'AI services not initialized'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'ai-scheduler-service',
      error: error.message
    });
  }
});

// app.use('/api/scheduler', schedulerRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/tasks', tasksRoutes);

// ==========================================
// AUTONOMOUS CRON JOBS
// ==========================================

const setupAutonomousJobs = () => {
  console.log('⏰ Setting up autonomous cron jobs...');

  // Every 5 minutes: Process pending tasks and optimize scheduling
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('🔄 Running autonomous task optimization...');
      await aiScheduler.optimizeScheduling();
      await taskPrioritizer.reprioritizeTasks();
    } catch (error) {
      console.error('❌ Error in autonomous task optimization:', error);
    }
  });

  // Every 15 minutes: Balance workloads
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('⚖️ Running workload balancing...');
      await workloadBalancer.balanceWorkloads();
    } catch (error) {
      console.error('❌ Error in workload balancing:', error);
    }
  });

  // Every hour: Update predictive models
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('📊 Updating predictive analytics models...');
      await predictiveAnalytics.updateModels();
    } catch (error) {
      console.error('❌ Error updating predictive models:', error);
    }
  });

  // Daily at 2 AM: Comprehensive analysis and optimization
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🧠 Running daily comprehensive AI analysis...');
      await aiScheduler.comprehensiveOptimization();
      await predictiveAnalytics.generateDailyInsights();
    } catch (error) {
      console.error('❌ Error in daily AI analysis:', error);
    }
  });

  console.log('✅ Autonomous cron jobs configured');
};

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error('[AI Scheduler Service] Error:', err);
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
    await initializeAIServices();
    setupAutonomousJobs();

    app.listen(PORT, () => {
      console.log(`🚀 AI Scheduler Service running on port ${PORT}`);
      console.log(`🤖 Autonomous features: ACTIVE`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[AI Scheduler Service] Failed to start:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
