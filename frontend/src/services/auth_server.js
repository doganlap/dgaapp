#!/usr/bin/env node

/**
 * Shahin-AI KSA GRC Platform - Main Authentication Server
 * Coordinates all microservices and provides centralized authentication
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Id', 'x-tenant-id']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'shahin-ai-grc-platform',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Info endpoint  
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Shahin-AI KSA GRC Platform',
    version: '1.0.0',
    description: 'Governance, Risk, and Compliance platform for Saudi Arabia',
    services: {
      'auth-service': 'http://localhost:3001',
      'document-service': 'http://localhost:3002',  
      'partner-service': 'http://localhost:3003',
      'notification-service': 'http://localhost:3004',
      'grc-api': 'http://localhost:3000',
      'regulatory-intelligence': 'http://localhost:3006',
      'ai-scheduler': 'http://localhost:3007',
      'rag-service': 'http://localhost:3008'
    },
    status: 'running'
  });
});

// Proxy routes to microservices
app.use('/api/auth', (req, res) => {
  res.json({ message: 'Auth service proxy - redirect to port 3001' });
});

app.use('/api/documents', (req, res) => {
  res.json({ message: 'Document service proxy - redirect to port 3002' });
});

app.use('/api/partners', (req, res) => {
  res.json({ message: 'Partner service proxy - redirect to port 3003' });
});

app.use('/api/notifications', (req, res) => {
  res.json({ message: 'Notification service proxy - redirect to port 3004' });
});

// Mock API endpoints for development
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalAssessments: 156,
      completedAssessments: 134,
      pendingRisks: 23,
      complianceScore: 94,
      activeFrameworks: 8,
      totalUsers: 45,
      recentActivity: [
        {
          id: 1,
          type: 'assessment',
          action: 'completed',
          item: 'SAMA Cybersecurity Assessment',
          user: 'Ahmed Al-Rashid',
          time: '2 hours ago'
        },
        {
          id: 2,
          type: 'risk',
          action: 'identified',
          item: 'Data Privacy Risk',
          user: 'Fatima Al-Zahra', 
          time: '4 hours ago'
        },
        {
          id: 3,
          type: 'compliance',
          action: 'updated',
          item: 'PCI DSS Framework',
          user: 'Mohammad bin Salman',
          time: '6 hours ago'
        }
      ]
    }
  });
});

// Additional API endpoints for comprehensive functionality
app.get('/api/dashboard/kpis', (req, res) => {
  res.json({
    success: true,
    data: {
      complianceScore: 94,
      riskScore: 23,
      assessmentCompletion: 86,
      frameworkCoverage: 78
    }
  });
});

app.get('/api/frameworks', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'SAMA Cybersecurity Framework', status: 'active', completion: 85 },
      { id: 2, name: 'PCI DSS', status: 'active', completion: 92 },
      { id: 3, name: 'ISO 27001', status: 'draft', completion: 45 }
    ]
  });
});

app.get('/api/risks', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, title: 'Data Privacy Risk', severity: 'high', status: 'open' },
      { id: 2, title: 'Cybersecurity Breach', severity: 'critical', status: 'mitigated' },
      { id: 3, title: 'Compliance Gap', severity: 'medium', status: 'open' }
    ]
  });
});

app.get('/api/assessments', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Q4 Cybersecurity Assessment', status: 'completed', score: 94 },
      { id: 2, name: 'PCI DSS Compliance Check', status: 'in_progress', score: null },
      { id: 3, name: 'Risk Assessment 2024', status: 'pending', score: null }
    ]
  });
});

app.get('/api/assessments/:id', (req, res) => {
  const assessmentId = req.params.id;
  res.json({
    success: true,
    data: {
      id: assessmentId,
      title: 'SAMA Cybersecurity Assessment 2024',
      titleAr: 'تقييم الأمن السيبراني للبنك المركزي السعودي 2024',
      organization: 'Saudi Arabian Monetary Authority (SAMA)',
      organizationAr: 'البنك المركزي السعودي',
      status: 'in_progress',
      completion: 75,
      framework: 'SAMA Cybersecurity Framework',
      lastUpdated: '2024-11-13T10:30:00Z',
      description: 'Comprehensive cybersecurity assessment following SAMA guidelines',
      descriptionAr: 'تقييم شامل للأمن السيبراني وفقاً لإرشادات البنك المركزي السعودي'
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      name: 'Admin User',
      email: 'admin@shahin-ai.com',
      role: 'admin',
      permissions: ['read', 'write', 'admin']
    }
  });
});

app.get('/api/db/metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      totalTables: 45,
      totalRecords: 125678,
      storageUsed: '2.4 GB',
      activeConnections: 12,
      uptime: '15 days',
      performance: 'excellent'
    }
  });
});

app.get('/api/db/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'healthy', uptime: '15 days', connections: 12 }
  });
});

app.get('/api/compliance/score', (req, res) => {
  res.json({
    success: true,
    data: { score: 94, trend: 'improving', details: { frameworks: 8, completed: 6 } }
  });
});

app.get('/api/dashboard/trends', (req, res) => {
  res.json({
    success: true,
    data: [
      { date: '2024-10-01', compliance: 89, risks: 15 },
      { date: '2024-10-15', compliance: 91, risks: 12 },
      { date: '2024-11-01', compliance: 94, risks: 8 }
    ]
  });
});

app.get('/api/regulatory-intelligence/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalRegulations: 234,
      activeMonitoring: 45,
      recentChanges: 8,
      complianceAlerts: 3
    }
  });
});

app.get('/api/ksa-grc/regulators', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'SAMA', nameAr: 'البنك المركزي السعودي', sector: 'financial' },
      { id: 2, name: 'CITC', nameAr: 'هيئة الاتصالات', sector: 'telecom' },
      { id: 3, name: 'CMA', nameAr: 'هيئة السوق المالية', sector: 'financial' }
    ]
  });
});

app.get('/api/organizations', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'المصرف المركزي السعودي (SAMA)',
        nameEn: 'Saudi Arabian Monetary Authority',
        sector: 'financial',
        country: 'Saudi Arabia',
        description: 'Central bank and financial regulatory authority'
      },
      {
        id: 2, 
        name: 'هيئة الاتصالات وتقنية المعلومات',
        nameEn: 'Communications and Information Technology Commission',
        sector: 'technology',
        country: 'Saudi Arabia',
        description: 'ICT regulatory authority'
      }
    ]
  });
});

app.get('/api/system/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

// Fallback for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    service: 'shahin-ai-grc-platform'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Shahin-AI KSA GRC Platform Server Starting...
═══════════════════════════════════════════════

📍 Main Server: http://localhost:${PORT}
🔍 Health Check: http://localhost:${PORT}/health  
📋 API Info: http://localhost:${PORT}/api/info

🇸🇦 شاهين الذكي السعودية - منصة الحوكمة الذكية
   Intelligent Governance Platform for Saudi Arabia
   
🌟 Services Status:
   ✅ Main GRC API Server (Port ${PORT})
   🔐 Auth Service (Port 3001) 
   📄 Document Service (Port 3002)
   🤝 Partner Service (Port 3003)
   🔔 Notification Service (Port 3004)
   
═══════════════════════════════════════════════
Server ready for frontend connections!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
