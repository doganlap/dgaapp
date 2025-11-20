/**
 * API Endpoints Service Layer
 * Based on: Shahin GRC Master Spec - All 20 Pages
 * 
 * Comprehensive API service mapping for all modules:
 * - Dashboard, Assessments, Frameworks, Compliance, Controls
 * - Organizations, Regulators, Risk Management, Reports, Documents
 * - Workflows, Partners, Notifications, Regulatory Intelligence
 * - AI Scheduler, RAG Service, Users, Audit Logs, Database, Settings
 */

import axios from 'axios';

// API Base URL from environment (normalize to include single /api)
const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';
const API_BASE_URL = RAW_API_BASE.endsWith('/api') ? RAW_API_BASE : `${RAW_API_BASE}/api`;

// Create axios instance with default config
let api;
try {
  api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
} catch (error) {
  // In test environment, create a minimal mock
  api = {
    interceptors: {
      request: { use: () => {} },
      response: { use: () => {} }
    },
    get: () => Promise.resolve({ data: {} }),
    post: () => Promise.resolve({ data: {} }),
    put: () => Promise.resolve({ data: {} }),
    delete: () => Promise.resolve({ data: {} }),
    patch: () => Promise.resolve({ data: {} }),
  };
}

// Request interceptor for auth token
if (api && api.interceptors && api.interceptors.request) {
  api.interceptors.request.use((config) => {
    // Handle test environment where localStorage might not be available immediately
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // In test environment, localStorage might not be available
      console.warn('localStorage not available for auth token:', error.message);
    }
    
    // Add tenant_id if available
    try {
      const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenant_id') : null;
      if (tenantId) {
        config.params = config.params || {};
        config.params.tenant_id = tenantId;
      }
    } catch (error) {
      console.warn('localStorage not available for tenant_id:', error.message);
    }
    return config;
  });
}

// Response interceptor for error handling
if (api && api.interceptors && api.interceptors.response) {
  api.interceptors.response.use(
    (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Allow callers to handle unauthorized (e.g., demo fallback)
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
  );
}

/**
 * Page 1: Dashboard APIs
 */
export const dashboardAPI = {
  // GET /api/dashboard/kpis?tenant_id=...&range=30d
  getKPIs: (params = {}) => api.get('/dashboard/kpis', { params }),
  
  // GET /api/dashboard/heatmap?type=controls|risks&framework_id=...
  getHeatmap: (type, frameworkId) => api.get('/dashboard/heatmap', {
    params: { type, framework_id: frameworkId },
  }),
  
  // GET /api/dashboard/trends?range=30d|90d
  getTrends: (range = '30d') => api.get('/dashboard/trends', { params: { range } }),
  
  // GET /api/dashboard/activity
  getActivity: (params = {}) => api.get('/dashboard/activity', { params }),
  
  // GET /api/dashboard/cross-db-summary
  getCrossDbSummary: (params = {}) => api.get('/dashboard/cross-db-summary', { params }),
};

/**
 * Page 2: Assessments APIs
 */
export const assessmentsAPI = {
  // GET /api/assessments
  getAll: (params = {}) => api.get('/assessments', { params }),
  
  // GET /api/assessments/:id
  getById: (id) => api.get(`/assessments/${id}`),
  
  // POST /api/assessments
  create: (data) => api.post('/assessments', data),
  
  // PUT /api/assessments/:id
  update: (id, data) => api.put(`/assessments/${id}`, data),
  
  // DELETE /api/assessments/:id
  delete: (id) => api.delete(`/assessments/${id}`),
  
  // POST /api/assessments/:id/questions/generate (RAG + rules)
  generateQuestions: (id, params = {}) => api.post(`/assessments/${id}/questions/generate`, params),
  
  // GET /api/assessments/:id/questions
  getQuestions: (id) => api.get(`/assessments/${id}/questions`),
  
  // POST /api/assessments/:id/responses/:qid
  submitResponse: (id, questionId, data) => api.post(`/assessments/${id}/responses/${questionId}`, data),
  
  // GET /api/assessments/:id/progress
  getProgress: (id) => api.get(`/assessments/${id}/progress`),
};

/**
 * Page 3: Frameworks APIs
 */
export const frameworksAPI = {
  // GET /api/frameworks
  getAll: (params = {}) => api.get('/frameworks', { params }),
  
  // GET /api/frameworks/:id
  getById: (id) => api.get(`/frameworks/${id}`),
  
  // POST /api/frameworks/:id/import
  import: (id, data) => api.post(`/frameworks/${id}/import`, data),
  
  // GET /api/frameworks/:id/coverage
  getCoverage: (id) => api.get(`/frameworks/${id}/coverage`),
  
  // GET /api/frameworks/:id/sections
  getSections: (id) => api.get(`/frameworks/${id}/sections`),
  
  // GET /api/frameworks/:id/controls
  getControls: (id) => api.get(`/frameworks/${id}/controls`),
  
  // GET /api/frameworks/analytics
  getAnalytics: () => api.get('/frameworks/analytics'),
  
  // POST /api/frameworks
  create: (data) => api.post('/frameworks', data),
  
  // PUT /api/frameworks/:id
  update: (id, data) => api.put(`/frameworks/${id}`, data),
  
  // DELETE /api/frameworks/:id
  delete: (id) => api.delete(`/frameworks/${id}`),
  
  // PATCH /api/frameworks/:id/status
  updateStatus: (id, status) => api.patch(`/frameworks/${id}/status`, { status }),
};

/**
 * Page 4: Compliance Tracking APIs
 */
export const complianceAPI = {
  // GET /api/compliance/gaps
  getGaps: (params = {}) => api.get('/compliance/gaps', { params }),
  
  // GET /api/compliance/score
  getScore: (params = {}) => api.get('/compliance/score', { params }),
  
  // POST /api/tasks
  createTask: (data) => api.post('/tasks', data),
  
  // GET /api/tasks
  getTasks: (params = {}) => api.get('/tasks', { params }),
  
  // PUT /api/tasks/:id
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
};

/**
 * Page 5: Controls APIs
 */
export const controlsAPI = {
  // GET /api/controls/:id
  getById: (id) => api.get(`/controls/${id}`),
  
  // GET /api/controls
  getAll: (params = {}) => api.get('/controls', { params }),
  
  // POST /api/controls/:id/tests
  createTest: (id, data) => api.post(`/controls/${id}/tests`, data),
  
  // POST /api/controls/:id/evidence
  addEvidence: (id, data) => api.post(`/controls/${id}/evidence`, data),
  
  // GET /api/controls/:id/implementation
  getImplementation: (id) => api.get(`/controls/${id}/implementation`),
  
  // PUT /api/controls/:id/implementation
  updateImplementation: (id, data) => api.put(`/controls/${id}/implementation`, data),
};

/**
 * Page 6: Organizations APIs
 */
export const organizationsAPI = {
  // POST /api/organizations
  create: (data) => api.post('/organizations', data),
  
  // GET /api/organizations
  getAll: (params = {}) => api.get('/organizations', { params }),
  
  // GET /api/organizations/:id
  getById: (id) => api.get(`/organizations/${id}`),
  
  // PUT /api/organizations/:id
  update: (id, data) => api.put(`/organizations/${id}`, data),
  
  // DELETE /api/organizations/:id
  delete: (id) => api.delete(`/organizations/${id}`),
  
  // GET /api/organizations/:id/units
  getUnits: (id) => api.get(`/organizations/${id}/units`),
  
  // POST /api/organizations/:id/units
  createUnit: (id, data) => api.post(`/organizations/${id}/units`, data),
};

/**
 * Page 7: Regulators APIs
 */
export const regulatorsAPI = {
  // GET /api/regulators/:id
  getById: (id) => api.get(`/regulators/${id}`),
  
  // GET /api/regulators
  getAll: (params = {}) => api.get('/regulators', { params }),
  
  // GET /api/regulators/:id/publications
  getPublications: (id, params = {}) => api.get(`/regulators/${id}/publications`, { params }),
  
  // POST /api/regulators
  create: (data) => api.post('/regulators', data),
  
  // PUT /api/regulators/:id
  update: (id, data) => api.put(`/regulators/${id}`, data),
  
  // DELETE /api/regulators/:id
  delete: (id) => api.delete(`/regulators/${id}`),
  
  // GET /api/regulators/stats
  getStats: () => api.get('/regulators/stats'),
  
  // GET /api/regulators/changes
  getChanges: (regulator, params = {}) => api.get('/regulators/changes', { params: { ...params, regulator } }),
  
  // GET /api/regulators/:regulatorId/changes
  getRegulatorChanges: (regulatorId, params = {}) => api.get(`/regulators/${regulatorId}/changes`, { params }),
  
  // Regulatory Intelligence APIs
  
  // GET /api/regulators/regulatory-intelligence/feed
  getRegulatoryFeed: (params = {}) => api.get('/regulators/regulatory-intelligence/feed', { params }),
  
  // GET /api/regulators/regulatory-intelligence/stats
  getRegulatoryStats: () => api.get('/regulators/regulatory-intelligence/stats'),
  
  // GET /api/regulators/regulatory-intelligence/calendar
  getRegulatoryCalendar: (params = {}) => api.get('/regulators/regulatory-intelligence/calendar', { params }),
  
  // GET /api/regulators/regulatory-intelligence/impact/:changeId
  getRegulatoryImpact: (changeId) => api.get(`/regulators/regulatory-intelligence/impact/${changeId}`),
  
  // GET /api/regulatory-intelligence/analytics
  getAnalytics: (params = {}) => api.get('/regulatory-intelligence/analytics', { params }),
  
  // Alias for getAnalytics to match dashboard usage
  getRegulatoryAnalytics: (params = {}) => api.get('/regulatory-intelligence/analytics', { params }),
  
  // POST /api/regulators/regulatory-intelligence/subscribe
  subscribeToRegulatoryUpdates: (data) => api.post('/regulators/regulatory-intelligence/subscribe', data),
};

/**
 * Page 8: Risk Management APIs
 */
export const risksAPI = {
  // POST /api/risks
  create: (data) => api.post('/risks', data),
  
  // GET /api/risks
  getAll: (params = {}) => api.get('/risks', { params }),
  
  // GET /api/risks/:id
  getById: (id) => api.get(`/risks/${id}`),
  
  // PUT /api/risks/:id
  update: (id, data) => api.put(`/risks/${id}`, data),
  
  // DELETE /api/risks/:id
  delete: (id) => api.delete(`/risks/${id}`),
  
  // POST /api/risks/:id/assess
  assess: (id, data) => api.post(`/risks/${id}/assess`, data),
  
  // POST /api/risks/:id/treatments
  addTreatment: (id, data) => api.post(`/risks/${id}/treatments`, data),
  
  // GET /api/risks/heatmap
  getHeatmap: (params = {}) => api.get('/risks/heatmap', { params }),
  
  // GET /api/risks/metrics
  getMetrics: () => api.get('/risks/metrics'),
  
  // GET /api/risks/realtime
  getRealTimeMetrics: () => api.get('/risks/realtime'),
  
  // GET /api/risks/trends
  getTrends: (params = {}) => api.get('/risks/trends', { params }),
  
  // GET /api/risks/export
  export: (params = {}) => api.get('/risks/export', { params }),
};

/**
 * Page 9: Reports APIs
 */
export const reportsAPI = {
  // POST /api/reports/run?template=...
  run: (template, params = {}) => api.post('/reports/run', { template, ...params }),
  
  // GET /api/reports/templates
  getTemplates: () => api.get('/reports/templates'),
  
  // GET /api/reports/runs
  getRuns: (params = {}) => api.get('/reports/runs', { params }),
  
  // GET /api/reports/runs/:id/download
  download: (id) => api.get(`/reports/runs/${id}/download`, { responseType: 'blob' }),
};

/**
 * Page 10: Documents APIs
 */
export const documentsAPI = {
  // POST /api/documents
  create: (data) => api.post('/documents', data),

  // GET /api/documents
  getAll: (params = {}) => api.get('/documents', { params }),

  // GET /api/documents/:id
  getById: (id) => api.get(`/documents/${id}`),

  // POST /api/documents/upload - Upload new document
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // POST /api/documents/:id/upload - Upload to existing document
  uploadVersion: (id, formData) => api.post(`/documents/${id}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // DELETE /api/documents/:id
  delete: (id) => api.delete(`/documents/${id}`),

  // GET /api/documents/stats
  getStats: () => api.get('/documents/stats'),

  // GET /api/documents/:id/versions
  getVersions: (id) => api.get(`/documents/${id}/versions`),
};

/**
 * Evidence Management APIs
 */
export const evidenceAPI = {
  // GET /api/evidence
  getAll: (params = {}) => api.get('/evidence', { params }),
  
  // GET /api/evidence/:id
  getById: (id) => api.get(`/evidence/${id}`),
  
  // POST /api/evidence
  create: (data) => api.post('/evidence', data),
  
  // PUT /api/evidence/:id
  update: (id, data) => api.put(`/evidence/${id}`, data),
  
  // DELETE /api/evidence/:id
  delete: (id) => api.delete(`/evidence/${id}`),
  
  // POST /api/evidence/upload
  upload: (formData) => api.post('/evidence/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // GET /api/evidence/analytics
  getAnalytics: () => api.get('/evidence/analytics'),
  
  // PATCH /api/evidence/:id/status
  updateStatus: (id, status) => api.patch(`/evidence/${id}/status`, { status }),
  
  // GET /api/evidence/categories
  getCategories: () => api.get('/evidence/categories'),
  
  // GET /api/evidence/stats
  getStats: () => api.get('/evidence/stats'),
};

/**
 * Page 11: Workflows APIs
 */
export const workflowsAPI = {
  // POST /api/workflows
  create: (data) => api.post('/workflows', data),
  
  // GET /api/workflows
  getAll: (params = {}) => api.get('/workflows', { params }),
  
  // GET /api/workflows/:id
  getById: (id) => api.get(`/workflows/${id}`),
  
  // PUT /api/workflows/:id
  update: (id, data) => api.put(`/workflows/${id}`, data),
  
  // DELETE /api/workflows/:id
  delete: (id) => api.delete(`/workflows/${id}`),
  
  // POST /api/workflows/:id/instances
  createInstance: (id, data) => api.post(`/workflows/${id}/instances`, data),
  
  // GET /api/workflows/instances/:id
  getInstance: (id) => api.get(`/workflows/instances/${id}`),
  
  // PUT /api/workflows/instances/:id
  updateInstance: (id, data) => api.put(`/workflows/instances/${id}`, data),
  
  // DELETE /api/workflows/instances/:id
  deleteInstance: (id) => api.delete(`/workflows/instances/${id}`),
  
  // GET /api/workflows/templates
  getTemplates: () => api.get('/workflows/templates'),
  // PUT /api/workflows/templates/:id
  updateTemplate: (id, data) => api.put(`/workflows/templates/${id}`, data),
  
  // GET /api/workflows/stats
  getStats: () => api.get('/workflows/stats'),
};

/**
 * Page 12: Partners/Vendors APIs
 */
export const vendorsAPI = {
  // POST /api/vendors
  create: (data) => api.post('/vendors', data),
  
  // GET /api/vendors
  getAll: (params = {}) => api.get('/vendors', { params }),
  
  // GET /api/vendors/:id
  getById: (id) => api.get(`/vendors/${id}`),
  
  // PUT /api/vendors/:id
  update: (id, data) => api.put(`/vendors/${id}`, data),
  
  // DELETE /api/vendors/:id
  delete: (id) => api.delete(`/vendors/${id}`),
  
  // POST /api/vendors/:id/assess
  assess: (id, data) => api.post(`/vendors/${id}/assess`, data),
  
  // POST /api/vendors/:id/risks
  addRisk: (id, data) => api.post(`/vendors/${id}/risks`, data),
  
  // GET /api/vendors/:id/risks
  getRisks: (id) => api.get(`/vendors/${id}/risks`),
  
  // GET /api/vendors/stats
  getStats: () => api.get('/vendors/stats'),
};

/**
 * Page 13: Notifications APIs
 */
export const notificationsAPI = {
  // POST /api/notifications/send
  send: (data) => api.post('/notifications/send', data),

  // GET /api/notifications
  getAll: (params = {}) => api.get('/notifications', { params }),

  // PUT /api/notifications/:id/read
  markAsRead: (id) => api.put(`/notifications/${id}/read`),

  // PUT /api/notifications/:id/unread
  markAsUnread: (id) => api.put(`/notifications/${id}/unread`),

  // PUT /api/notifications/:id/archive
  archive: (id) => api.put(`/notifications/${id}/archive`),

  // DELETE /api/notifications/:id
  delete: (id) => api.delete(`/notifications/${id}`),

  // GET /api/notifications/stats
  getStats: () => api.get('/notifications/stats'),

  // GET /api/notifications/preferences
  getPreferences: () => api.get('/notifications/preferences'),

  // PUT /api/notifications/preferences
  updatePreferences: (data) => api.put('/notifications/preferences', data),
};

/**
 * Page 14: Regulatory Intelligence APIs
 */
export const regIntelAPI = {
  // POST /api/regintel/crawl
  crawl: (data) => api.post('/regintel/crawl', data),
  
  // GET /api/regintel/diff?framework_id=&from=&to=
  getDiff: (frameworkId, fromVersion, toVersion) => api.get('/regintel/diff', {
    params: { framework_id: frameworkId, from: fromVersion, to: toVersion },
  }),
  
  // GET /api/regintel/updates
  getUpdates: (params = {}) => api.get('/regintel/updates', { params }),
  
  // GET /api/regulatory-intelligence/feed
  getFeed: (params = {}) => api.get('/regulatory-intelligence/feed', { params }),
  
  // GET /api/regulatory-intelligence/calendar
  getCalendar: (params = {}) => api.get('/regulatory-intelligence/calendar', { params }),
  
  // GET /api/regulatory-intelligence/stats
  getStats: () => api.get('/regulatory-intelligence/stats'),
  
  // GET /api/regulatory-intelligence/impact/:id
  getImpact: (changeId) => api.get(`/regulatory-intelligence/impact/${changeId}`),
  
  // GET /api/regulatory-intelligence/analytics
  getAnalytics: (params = {}) => api.get('/regulatory-intelligence/analytics', { params }),
  
  // POST /api/regulatory-intelligence/subscribe
  subscribe: (data) => api.post('/regulatory-intelligence/subscribe', data),
};

/**
 * Page 15: AI Scheduler APIs
 */
export const schedulerAPI = {
  // POST /api/scheduler/jobs
  createJob: (data) => api.post('/scheduler/jobs', data),
  
  // GET /api/scheduler/jobs
  getJobs: (params = {}) => api.get('/scheduler/jobs', { params }),
  
  // POST /api/scheduler/triggers
  createTrigger: (data) => api.post('/scheduler/triggers', data),
  
  // GET /api/scheduler/runs
  getRuns: (params = {}) => api.get('/scheduler/runs', { params }),

  // GET /api/scheduler/stats
  getStats: () => api.get('/scheduler/stats'),

  // Canonical CRUD for useCRUD hook
  getAll: (params = {}) => api.get('/scheduler/jobs', { params }),
  getById: (id) => api.get(`/scheduler/jobs/${id}`),
  create: (data) => api.post('/scheduler/jobs', data),
  update: (id, data) => api.put(`/scheduler/jobs/${id}`, data),
  delete: (id) => api.delete(`/scheduler/jobs/${id}`),
};

/**
 * Page 16: RAG Service APIs
 */
export const ragAPI = {
  // Documents CRUD operations
  // POST /api/rag/documents - Upload and process document
  createDocument: (data) => api.post('/rag/documents', data),
  
  // GET /api/rag/documents
  getDocuments: (params = {}) => api.get('/rag/documents', { params }),
  
  // GET /api/rag/documents/:id
  getDocument: (id) => api.get(`/rag/documents/${id}`),
  
  // PUT /api/rag/documents/:id
  updateDocument: (id, data) => api.put(`/rag/documents/${id}`, data),
  
  // DELETE /api/rag/documents/:id
  deleteDocument: (id) => api.delete(`/rag/documents/${id}`),
  
  // Query operations
  // POST /api/rag/query - Query RAG system
  query: (query, limit = 5, minRelevance = 0.7) => api.post('/rag/query', { query, limit, minRelevance }),
  
  // GET /api/rag/queries - Get query history
  getQueries: (params = {}) => api.get('/rag/queries', { params }),
  
  // Statistics
  // GET /api/rag/stats
  getStats: () => api.get('/rag/stats'),
  
  // POST /api/rag/reindex - Reindex all documents
  reindex: () => api.post('/rag/reindex'),
  
  // Legacy endpoints (for backward compatibility)
  // POST /api/rag/ask
  ask: (question, context = {}) => api.post('/rag/ask', { question, ...context }),
  
  // GET /api/rag/sources?session_id=
  getSources: (sessionId) => api.get('/rag/sources', { params: { session_id: sessionId } }),
  
  // POST /api/rag/feedback
  submitFeedback: (sessionId, feedback) => api.post('/rag/feedback', { session_id: sessionId, ...feedback }),
};

/**
 * Page 17: Users APIs
 */
export const usersAPI = {
  // POST /api/users/invite
  invite: (data) => api.post('/users/invite', data),
  
  // GET /api/users
  getAll: (params = {}) => api.get('/users', { params }),
  
  // GET /api/users/:id
  getById: (id) => api.get(`/users/${id}`),
  
  // PUT /api/users/:id
  update: (id, data) => api.put(`/users/${id}`, data),
  
  // POST /api/users/:id/roles
  assignRoles: (id, roles) => api.post(`/users/${id}/roles`, { roles }),
  
  // DELETE /api/users/:id
  delete: (id) => api.delete(`/users/${id}`),
};

/**
 * Page 18: Audit Logs APIs
 */
export const auditAPI = {
  // GET /api/audit?entity=...&actor=...&from=...&to=...
  getLogs: (params = {}) => api.get('/audit', { params }),
  
  // GET /api/audit/export
  export: (params = {}) => api.get('/audit/export', {
    params,
    responseType: 'blob',
  }),
};

/**
 * Page 19: Database Health APIs
 */
export const dbAPI = {
  // GET /api/db/health
  getHealth: () => api.get('/db/health'),
  
  // GET /api/db/metrics
  getMetrics: (params = {}) => api.get('/db/metrics', { params }),
};

/**
 * Page 20: Settings APIs
 */
export const settingsAPI = {
  // PUT /api/tenant/settings
  updateTenant: (data) => api.put('/tenant/settings', data),
  
  // GET /api/tenant/settings
  getTenant: () => api.get('/tenant/settings'),
  
  // POST /api/integrations/test
  testIntegration: (type, config) => api.post('/integrations/test', { type, ...config }),
  
  // PUT /api/integrations/:type
  updateIntegration: (type, config) => api.put(`/integrations/${type}`, config),
  
  // GET /api/integrations
  getIntegrations: () => api.get('/integrations'),
};

/**
 * Translation APIs
 */
export const translationAPI = {
  // POST /api/translation/text
  translateText: (data) => api.post('/translation/text', data),
  
  // POST /api/translation/document/:id
  translateDocument: (id, data) => api.post(`/translation/document/${id}`, data),
  
  // POST /api/translation/batch
  batchTranslate: (data) => api.post('/translation/batch', data),
  
  // GET /api/translation/cache
  getCachedTranslation: (params) => api.get('/translation/cache', { params }),
  
  // GET /api/translation/stats
  getStats: () => api.get('/translation/stats'),
  
  // POST /api/translation/detect
  detectLanguage: (data) => api.post('/translation/detect', data),
  
  // GET /api/translation/languages
  getSupportedLanguages: () => api.get('/translation/languages'),
};

/**
 * Authentication APIs (not in spec pages, but needed)
 */
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

/**
 * Combined API service object
 */
const apiService = {
  dashboard: dashboardAPI,
  assessments: assessmentsAPI,
  frameworks: frameworksAPI,
  compliance: complianceAPI,
  controls: controlsAPI,
  organizations: organizationsAPI,
  regulators: regulatorsAPI,
  risks: risksAPI,
  reports: reportsAPI,
  documents: documentsAPI,
  evidence: evidenceAPI,
  workflows: workflowsAPI,
  vendors: vendorsAPI,
  notifications: notificationsAPI,
  regIntel: regIntelAPI,
  regulatoryIntelligence: regIntelAPI, // Alias for dashboard compatibility
  scheduler: schedulerAPI,
  rag: ragAPI,
  users: usersAPI,
  audit: auditAPI,
  db: dbAPI,
  health: {
    getGitStatus: () => api.get('/health/git'),
    getDbStatus: () => api.get('/health/database'),
    getApiStatus: () => api.get('/health/detailed'),
  },
  monitoring: {
    getPerformanceMetrics: () => api.get('/monitoring/performance'),
    getSystemMetrics: () => api.get('/monitoring/system'),
    getDatabaseMetrics: () => api.get('/monitoring/database'),
    getNetworkMetrics: () => api.get('/monitoring/network'),
    getAlertHistory: (limit = 50) => api.get(`/monitoring/alerts?limit=${limit}`),
    getRealTimeMetrics: () => api.get('/monitoring/realtime'),
    getHistoricalMetrics: (startDate, endDate) => api.get(`/monitoring/historical?start=${startDate}&end=${endDate}`),
    createAlert: (alertData) => api.post('/monitoring/alerts', alertData),
    updateAlertStatus: (alertId, status) => api.patch(`/monitoring/alerts/${alertId}/status`, { status }),
    getUptimeStats: () => api.get('/monitoring/uptime'),
    getResourceUsage: () => api.get('/monitoring/resources'),
  },
  settings: settingsAPI,
  translation: translationAPI,
  auth: authAPI,

  /**
   * Analytics APIs
   */
  analytics: {
    getMultiDimensional: (params) => api.get('/analytics/multi-dimensional', { params }),
    getComplianceTrends: (params) => api.get('/analytics/compliance-trends', { params }),
    getRiskHeatmap: (params) => api.get('/analytics/risk-heatmap', { params }),
    getUserActivityPatterns: (params) => api.get('/analytics/user-activity-patterns', { params }),
    getFinancialPerformance: (params) => api.get('/analytics/financial-performance', { params }),
    getSystemPerformance: (params) => api.get('/analytics/system-performance', { params }),
  },

  /**
   * Vercel Monitoring APIs
   */
  vercel: {
    getDeployments: () => api.get('/vercel/deployments'),
    getStatus: () => api.get('/vercel/status'),
  },
};

export default apiService;
