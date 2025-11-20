const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

// Import services
const RAGEngine = require('./services/ragEngine');
const VectorStore = require('./services/vectorStore');
const EmbeddingService = require('./services/embeddingService');
const DocumentProcessor = require('./services/documentProcessor');
const QueryProcessor = require('./services/queryProcessor');

// Import routes
const ragRoutes = require('./routes/rag');
const searchRoutes = require('./routes/search');
const documentsRoutes = require('./routes/documents');
const analyticsRoutes = require('./routes/analytics');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3006;

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
// INITIALIZE RAG SERVICES
// ==========================================

let ragEngine, vectorStore, embeddingService, documentProcessor, queryProcessor;

const initializeRAGServices = async () => {
  try {
    console.log('🧠 Initializing RAG services...');
    
    // Initialize core services
    embeddingService = new EmbeddingService();
    vectorStore = new VectorStore();
    documentProcessor = new DocumentProcessor();
    queryProcessor = new QueryProcessor();
    ragEngine = new RAGEngine(vectorStore, embeddingService, queryProcessor);
    
    // Initialize services in order
    await embeddingService.initialize();
    await vectorStore.initialize();
    await documentProcessor.initialize();
    await queryProcessor.initialize();
    await ragEngine.initialize();
    
    console.log('✅ RAG services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RAG services:', error);
    throw error;
  }
};

// Make services available to routes
app.locals.ragEngine = () => ragEngine;
app.locals.vectorStore = () => vectorStore;
app.locals.embeddingService = () => embeddingService;
app.locals.documentProcessor = () => documentProcessor;
app.locals.queryProcessor = () => queryProcessor;

// ==========================================
// ROUTES
// ==========================================

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'rag-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/readyz', async (req, res) => {
  try {
    const servicesReady = ragEngine && vectorStore && embeddingService && documentProcessor;
    if (servicesReady) {
      const vectorStoreStatus = await vectorStore.healthCheck();
      const embeddingStatus = await embeddingService.healthCheck();
      
      res.status(200).json({ 
        status: 'ready', 
        service: 'rag-service',
        services: {
          ragEngine: !!ragEngine,
          vectorStore: vectorStoreStatus,
          embeddingService: embeddingStatus,
          documentProcessor: !!documentProcessor,
          queryProcessor: !!queryProcessor
        }
      });
    } else {
      res.status(503).json({ 
        status: 'not ready', 
        service: 'rag-service',
        message: 'RAG services not initialized'
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      service: 'rag-service',
      error: error.message
    });
  }
});

app.use('/api/rag', ragRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/analytics', analyticsRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error('[RAG Service] Error:', err);
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
    await initializeRAGServices();

    app.listen(PORT, () => {
      console.log(`🚀 RAG Service running on port ${PORT}`);
      console.log(`🧠 AI-powered document analysis: ACTIVE`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[RAG Service] Failed to start:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
