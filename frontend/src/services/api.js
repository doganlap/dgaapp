import axios from 'axios';
import { toast } from 'sonner';

const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;
const appendApiSegment = (url) => {
  const sanitized = url.replace(/\/+$/, '');
  return sanitized.endsWith('/api') ? sanitized : `${sanitized}/api`;
};

const ensureApiBaseUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    const relative = trimmed === '/' ? '/api' : appendApiSegment(trimmed);
    return relative.replace(/\/+$/, '');
  }

  if (ABSOLUTE_URL_REGEX.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const apiPath = (parsed.pathname === '/' || parsed.pathname === '')
        ? '/api'
        : appendApiSegment(parsed.pathname);
      if (typeof window !== 'undefined' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        const origin = window.location.origin;
        return `${origin}${apiPath}`.replace(/\/$/, '');
      }
      parsed.pathname = apiPath;
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return appendApiSegment(trimmed);
    }
  }

  return appendApiSegment(trimmed);
};

const rawBaseUrl =
  import.meta.env.VITE_BFF_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL;

const isLocalHost = typeof window !== 'undefined' && (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname));

// In production, if no BFF URL is set, default to the BFF project URL
const getApiBaseUrl = () => {
  if (isLocalHost) {
    return '/api';
  }
  
  if (rawBaseUrl) {
    return ensureApiBaseUrl(rawBaseUrl);
  }
  
  // Production fallback: use BFF project URL
  if (import.meta.env.PROD) {
    return 'https://bff-shahin-ai.vercel.app/api';
  }
  
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with error handling for test environment
let api;
try {
  api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });

  api.interceptors.request.use(
    (config) => {
      // Ensure cookies are sent; auth is HTTP-only cookies
      config.withCredentials = true;

      // Attach dynamic tenant context if available
      try {
        const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenant_id') : null;
        if (tenantId) {
          config.headers['x-tenant-id'] = tenantId;
        }
      } catch {}

      // Attach Authorization token if present
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('app_token') : null;
        if (token && !config.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch {}

      // Attach CSRF token in production for mutating requests
      try {
        const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes((config.method || 'get').toUpperCase());
        const isProd = (import.meta.env?.PROD) || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
        if (isMutating && typeof document !== 'undefined' && isProd) {
          const match = document.cookie.split('; ').find((c) => c.startsWith('csrfToken='));
          if (match) {
            const csrf = match.split('=')[1];
            if (csrf) {
              config.headers['X-CSRF-Token'] = csrf;
            }
          }
        }
      } catch {}

      // Centralized request metadata for observability
      const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      config.headers['X-Request-ID'] = reqId;
      config.headers['X-Client'] = 'web-frontend';
      const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
      config.headers['X-App-Version'] = appVersion;

      // Hint for audit on mutating operations
      const method = (config.method || 'get').toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        config.headers['X-Audit-Action'] = `${method} ${config.url}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );
} catch (error) {
  // In test environment, create a minimal mock
  api = {
    interceptors: {
      request: { use: () => {} },
      response: { use: () => {} }
    },
    defaults: { withCredentials: false },
    get: () => Promise.resolve({ data: {} }),
    post: () => Promise.resolve({ data: {} }),
    put: () => Promise.resolve({ data: {} }),
    delete: () => Promise.resolve({ data: {} }),
    patch: () => Promise.resolve({ data: {} }),
  };
}

// Set axios to send credentials (cookies) with every request
if (api && api.defaults) {
  api.defaults.withCredentials = true;
}

if (api && api.interceptors && api.interceptors.response) {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // Enhanced error handling with detailed logging and user feedback
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      // Handle different types of errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      // Network connection errors
      const networkError = new Error('Network Error: Unable to connect to server. Please check if the backend is running.');
      networkError.type = 'NETWORK_ERROR';
      networkError.originalError = error;
      toast.error('Network error: cannot reach backend');
      return Promise.reject(networkError);
    }

    if (error.response?.status === 401) {
      // Unauthorized - let callers handle (e.g., demo fallback)
      console.warn('Unauthorized access - allowing caller to handle 401');
      toast.warning('Unauthorized');
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      // Forbidden - insufficient permissions
      const permissionError = new Error('Access Denied: You do not have permission to perform this action.');
      permissionError.type = 'PERMISSION_ERROR';
      permissionError.originalError = error;
      toast.error('Access denied');
      return Promise.reject(permissionError);
    }

    if (error.response?.status === 404) {
      // Not found
      const notFoundError = new Error('Resource not found. The requested data may have been deleted or moved.');
      notFoundError.type = 'NOT_FOUND_ERROR';
      notFoundError.originalError = error;
      toast.info('Resource not found');
      return Promise.reject(notFoundError);
    }

    if (error.response?.status === 429) {
      const rateLimitError = new Error('Rate limit exceeded. Please try again later.');
      rateLimitError.type = 'RATE_LIMIT_ERROR';
      rateLimitError.originalError = error;
      const headerRetry = error.response?.headers?.['retry-after'] || error.response?.headers?.['Retry-After'];
      const bodyRetry = error.response?.data?.retryAfter;
      rateLimitError.retryAfter = Number(headerRetry || bodyRetry || 0) || undefined;
      toast.warning('Too many requests');
      return Promise.reject(rateLimitError);
    }

    if (error.response?.status >= 500) {
      // Server errors
      const serverError = new Error('Server Error: Something went wrong on our end. Please try again later.');
      serverError.type = 'SERVER_ERROR';
      serverError.originalError = error;
      toast.error('Server error');
      try {
        if (typeof window !== 'undefined') {
          const path = (error.config?.url || '').split('?')[0] || '';
          const module = path.replace(/^\/?/, '').split('/')[0] || 'api';
          window.dispatchEvent(new CustomEvent('service-error', {
            detail: {
              module,
              status: error.response?.status,
              url: error.config?.url || path
            }
          }));
        }
      } catch {}
      return Promise.reject(serverError);
    }

    if (error.response?.status === 422) {
      // Validation errors
      const validationError = new Error(error.response?.data?.message || 'Validation Error: Please check your input data.');
      validationError.type = 'VALIDATION_ERROR';
      validationError.originalError = error;
      validationError.validationErrors = error.response?.data?.errors;
      toast.warning('Validation error');
      return Promise.reject(validationError);
    }

    // Default error handling
    const genericError = new Error(error.response?.data?.message || error.message || 'An unexpected error occurred.');
    genericError.type = 'GENERIC_ERROR';
    genericError.originalError = error;
    toast.error(genericError.message);
    return Promise.reject(genericError);
  }
  );
}

const apiServices = {
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    logout: () => api.post('/auth/logout'),
    refreshToken: () => api.post('/auth/refresh'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
    me: () => api.get('/auth/me')
  },
  users: {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (userData) => api.post('/users', userData),
    update: (id, userData) => api.put(`/users/${id}`, userData),
    delete: (id) => api.delete(`/users/${id}`),
    updateProfile: (userData) => api.put('/users/profile', userData),
    changePassword: (passwordData) => api.put('/users/change-password', passwordData)
  },
  tenants: {
    getAll: (params) => api.get('/tenants', { params }),
    getById: (id) => api.get(`/tenants/${id}`),
    create: (tenantData) => api.post('/tenants', tenantData),
    update: (id, tenantData) => api.put(`/tenants/${id}`, tenantData),
    delete: (id) => api.delete(`/tenants/${id}`),
    getSettings: (id) => api.get(`/tenants/${id}/settings`),
    updateSettings: (id, settings) => api.put(`/tenants/${id}/settings`, settings)
  },
  organizations: {
    getAll: (params) => api.get('/organizations', { params }),
    getById: (id) => api.get(`/organizations/${id}`),
    create: (orgData) => api.post('/organizations', orgData),
    update: (id, orgData) => api.put(`/organizations/${id}`, orgData),
    delete: (id) => api.delete(`/organizations/${id}`),
    getAssessments: (id, params) => api.get(`/organizations/${id}/assessments`, { params }),
    getCompliance: (id) => api.get(`/organizations/${id}/compliance`),
    getMetrics: (id) => api.get(`/organizations/${id}/metrics`),
    seed: () => api.post('/organizations/seed')
  },
  regulators: {
    getAll: (params) => api.get('/regulators', { params }),
    getById: (id) => api.get(`/regulators/${id}`),
    create: (regulatorData) => api.post('/regulators', regulatorData),
    update: (id, regulatorData) => api.put(`/regulators/${id}`, regulatorData),
    delete: (id) => api.delete(`/regulators/${id}`),
    getFrameworks: (id, params) => api.get(`/regulators/${id}/frameworks`, { params }),
    getStatistics: (id) => api.get(`/regulators/${id}/statistics`),
    seed: () => api.post('/regulators/seed')
  },
  frameworks: {
    getAll: (params) => api.get('/frameworks', { params }),
    getById: (id) => api.get(`/frameworks/${id}`),
    create: (frameworkData) => api.post('/frameworks', frameworkData),
    update: (id, frameworkData) => api.put(`/frameworks/${id}`, frameworkData),
    delete: (id) => api.delete(`/frameworks/${id}`),
    getControls: (id, params) => api.get(`/frameworks/${id}/controls`, { params }),
    getAssessments: (id, params) => api.get(`/frameworks/${id}/assessments`, { params }),
    import: (frameworkData) => api.post('/frameworks/import', frameworkData),
    export: (id) => api.get(`/frameworks/${id}/export`),
    seed: () => api.post('/frameworks/seed')
  },
  controls: {
    getAll: (params) => api.get('/controls', { params }),
    getById: (id) => api.get(`/controls/${id}`),
    create: (controlData) => api.post('/controls', controlData),
    update: (id, controlData) => api.put(`/controls/${id}`, controlData),
    delete: (id) => api.delete(`/controls/${id}`),
    bulkUpdate: (controlsData) => api.put('/controls/bulk', controlsData),
    getResponses: (id, params) => api.get(`/controls/${id}/responses`, { params }),
    getEvidence: (id, params) => api.get(`/controls/${id}/evidence`, { params })
  },
  assessments: {
    getAll: (params) => api.get('/assessments', { params }),
    getById: (id) => api.get(`/assessments/${id}`),
    create: (assessmentData) => api.post('/assessments', assessmentData),
    update: (id, assessmentData) => api.put(`/assessments/${id}`, assessmentData),
    delete: (id) => api.delete(`/assessments/${id}`),
    getResponses: (id, params) => api.get(`/assessments/${id}/responses`, { params }),
    getEvidence: (id, params) => api.get(`/assessments/${id}/evidence`, { params }),
    getReport: (id) => api.get(`/assessments/${id}/report`),
    submit: (id) => api.post(`/assessments/${id}/submit`),
    approve: (id, approvalData) => api.post(`/assessments/${id}/approve`, approvalData),
    reject: (id, rejectionData) => api.post(`/assessments/${id}/reject`, rejectionData)
  },
  templates: {
    getAll: (params) => api.get('/assessment-templates', { params }),
    getById: (id) => api.get(`/assessment-templates/${id}`),
    create: (templateData) => api.post('/assessment-templates', templateData),
    update: (id, templateData) => api.put(`/assessment-templates/${id}`, templateData),
    delete: (id) => api.delete(`/assessment-templates/${id}`),
    clone: (id, cloneData) => api.post(`/assessment-templates/${id}/clone`, cloneData),
    export: (id) => api.get(`/assessment-templates/${id}/export`),
    import: (templateData) => api.post('/assessment-templates/import', templateData)
  },
  responses: {
    getAll: (params) => api.get('/assessment-responses', { params }),
    getById: (id) => api.get(`/assessment-responses/${id}`),
    create: (responseData) => api.post('/assessment-responses', responseData),
    update: (id, responseData) => api.put(`/assessment-responses/${id}`, responseData),
    delete: (id) => api.delete(`/assessment-responses/${id}`),
    bulkCreate: (responsesData) => api.post('/assessment-responses/bulk', responsesData),
    bulkUpdate: (responsesData) => api.put('/assessment-responses/bulk', responsesData)
  },
  evidence: {
    getAll: (params) => api.get('/assessment-evidence', { params }),
    getById: (id) => api.get(`/assessment-evidence/${id}`),
    create: (evidenceData) => api.post('/assessment-evidence', evidenceData),
    update: (id, evidenceData) => api.put(`/assessment-evidence/${id}`, evidenceData),
    delete: (id) => api.delete(`/assessment-evidence/${id}`),
    upload: (formData) =>
      api.post('/assessment-evidence/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    download: (id) =>
      api.get(`/assessment-evidence/${id}/download`, { responseType: 'blob' }),
    getCategories: () => api.get('/assessment-evidence/categories'),
    getStats: () => api.get('/assessment-evidence/stats'),
    getAnalytics: () => api.get('/assessment-evidence/analytics')
  },
  documents: {
    getAll: (params) => api.get('/documents', { params }),
    getById: (id) => api.get(`/documents/${id}`),
    upload: (formData) =>
      api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    delete: (id) => api.delete(`/documents/${id}`),
    process: (id) => api.post(`/documents/${id}/process`),
    search: (query) => api.get('/documents/search', { params: { q: query } })
  },
  sectorControls: {
    getAll: (params) => api.get('/sector-controls', { params }),
    getById: (id) => api.get(`/sector-controls/${id}`),
    getBySector: (sector, params) => api.get(`/sector-controls/sector/${sector}`, { params }),
    getEstimate: (estimateData) => api.post('/sector-controls/estimate', estimateData),
    getMapping: (mappingData) => api.post('/sector-controls/mapping', mappingData),
    seed: (sector) => api.post('/sector-controls/seed', { sector })
  },
  reports: {
    getComplianceReport: (params) => api.get('/reports/compliance', { params }),
    getAssessmentReport: (id) => api.get(`/reports/assessment/${id}`),
    getOrganizationReport: (id, params) =>
      api.get(`/reports/organization/${id}`, { params }),
    getFrameworkReport: (id, params) =>
      api.get(`/reports/framework/${id}`, { params }),
    getCustomReport: (reportData) => api.post('/reports/custom', reportData),
    exportReport: (reportId, format) =>
      api.get(`/reports/${reportId}/export/${format}`, { responseType: 'blob' })
  },
  dashboard: {
    getStats: () => api.get('/dashboard/stats'),
    getMetrics: (params) => api.get('/dashboard/metrics', { params }),
    getActivity: (params) => api.get('/dashboard/activity', { params }),
    getCompliance: (params) => api.get('/dashboard/compliance', { params }),
    getRiskMetrics: (params) => api.get('/dashboard/risk', { params }),
    getCrossDbSummary: () => api.get('/dashboard/cross-db-summary')
  },
  // Multi-Database Operations (3-Database Architecture)
  crossDb: {
    getHealth: () => api.get('/cross-db/health'),
    getStats: () => api.get('/cross-db/stats'),
    getUserProfile: (userId) => api.get(`/cross-db/users/${userId}/profile`),
    createAssessment: (assessmentData) => api.post('/cross-db/assessments', assessmentData),
    getTenantSummary: (tenantId) => api.get(`/cross-db/tenants/${tenantId}/summary`),
    login: (credentials) => api.post('/cross-db/auth/login', credentials),
    test: () => api.get('/cross-db/test')
  },
  // Advanced Analytics (15+ Charts)
  analytics: {
    getMultiDimensional: (params) => api.get('/analytics/multi-dimensional', { params }),
    getComplianceTrends: (params) => api.get('/analytics/compliance-trends', { params }),
    getRiskHeatmap: (params) => api.get('/analytics/risk-heatmap', { params }),
    getUserActivityPatterns: (params) => api.get('/analytics/user-activity-patterns', { params }),
    getFinancialPerformance: (params) => api.get('/analytics/financial-performance', { params }),
    getSystemPerformance: (params) => api.get('/analytics/system-performance', { params })
  },
  tables: {
    getTableData: (params) => api.get('/tables/data', { params }),
    getTableSchema: (params) => api.get('/tables/schema', { params }),
    exportTable: (tableName, format) => api.get(`/tables/${tableName}/export/${format}`, { responseType: 'blob' })
  },
  partners: {
    getAll: (params) => api.get('/partners', { params }),
    getById: (id) => api.get(`/partners/${id}`),
    create: (partnerData) => api.post('/partners', partnerData),
    update: (id, partnerData) => api.put(`/partners/${id}`, partnerData),
    delete: (id) => api.delete(`/partners/${id}`),
    invite: (inviteData) => api.post('/partners/invite', inviteData),
    getAnalytics: () => api.get('/partners/analytics'),
    getAssessments: (id, params) => api.get(`/partners/${id}/assessments`, { params }),
    updateStatus: (id, status) => api.put(`/partners/${id}/status`, { status }),
    getDocuments: (id, params) => api.get(`/partners/${id}/documents`, { params }),
    uploadDocument: (id, formData) => api.post(`/partners/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteDocument: (partnerId, documentId) => api.delete(`/partners/${partnerId}/documents/${documentId}`),
    generateReport: (id, params) => api.post(`/partners/${id}/report`, params),
    bulkUpdate: (updates) => api.put('/partners/bulk', { updates }),
    export: (format, params) => api.get(`/partners/export/${format}`, {
      params,
      responseType: 'blob'
    })
  },
  collaborations: {
    getAll: (params) => api.get('/collaborations', { params }),
    getById: (id) => api.get(`/collaborations/${id}`),
    create: (collaborationData) => api.post('/collaborations', collaborationData),
    update: (id, collaborationData) => api.put(`/collaborations/${id}`, collaborationData),
    delete: (id) => api.delete(`/collaborations/${id}`)
  },
  notifications: {
    send: (notificationData) => api.post('/notifications/send', notificationData),
    sendEmail: (emailData) => api.post('/notifications/email', emailData),
    getAll: (params) => api.get('/notifications', { params }),
    getTemplates: () => api.get('/notifications/templates'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`)
  },
  adminAnthropic: {
    getKey: (id) => api.get(`/platform/anthropic/api-keys/${id}`),
    revokeKey: (id) => api.delete(`/platform/anthropic/api-keys/${id}`)
  },
  settings: {
    getFeatureFlags: () => api.get('/settings/feature-flags'),
    updateFeatureFlags: (flags) => api.put('/settings/feature-flags', { flags }),
    getSettings: () => api.get('/settings'),
    updateSettings: (settings) => api.put('/settings', { settings }),
    getDefaults: () => api.get('/settings/defaults'),
    reset: (type) => api.post('/settings/reset', { type })
  },
  regulatory: {
    getChanges: (regulator, limit = 50) => api.get('/regulatory/changes', { params: { regulator, limit } }),
    getChangeDetails: (id) => api.get(`/regulatory/changes/${id}`),
    scrapeRegulator: (regulator) => api.post(`/regulatory/scrape/${regulator}`),
    getRegulators: () => api.get('/regulatory/regulators'),
    addToCalendar: (regulatoryChangeId, organizationId) =>
      api.post('/regulatory/calendar/add', { regulatoryChangeId, organizationId }),
    getCalendar: (organizationId, days = 30) =>
      api.get(`/regulatory/calendar/${organizationId}`, { params: { days } }),
    markDeadlineComplete: (id) => api.put(`/regulatory/calendar/${id}/complete`),
    getStats: () => api.get('/regulatory/stats')
  },
  rag: {
    query: (query, options = {}) => api.post('/rag/query', { query, ...options }),
    uploadDocument: (file, metadata = {}) => {
      const formData = new FormData();
      formData.append('document', file);
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
      return api.post('/rag/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    getDocuments: (params) => api.get('/rag/documents', { params }),
    getDocumentById: (id) => api.get(`/rag/documents/${id}`),
    deleteDocument: (id) => api.delete(`/rag/documents/${id}`),
    reprocessDocument: (id) => api.post(`/rag/documents/${id}/reprocess`),
    getChunks: (documentId, params) => api.get(`/rag/documents/${documentId}/chunks`, { params }),
    getEmbeddings: (documentId) => api.get(`/rag/documents/${documentId}/embeddings`),
    search: (query, filters = {}) => api.post('/rag/search', { query, filters }),
    getStats: () => api.get('/rag/stats'),
    getSettings: () => api.get('/rag/settings'),
    updateSettings: (settings) => api.put('/rag/settings', settings)
  },
  workflow: {
    getWorkflows: (params) => api.get('/assessment-workflow', { params }),
    getById: (id) => api.get(`/assessment-workflow/${id}`),
    create: (workflowData) => api.post('/assessment-workflow', workflowData),
    update: (id, workflowData) => api.put(`/assessment-workflow/${id}`, workflowData),
    delete: (id) => api.delete(`/assessment-workflow/${id}`),
    updateStatus: (id, status) => api.put(`/assessment-workflow/${id}/status`, { status }),
    approve: (id, approvalData) => api.post(`/assessment-workflow/${id}/approve`, approvalData),
    reject: (id, rejectionData) => api.post(`/assessment-workflow/${id}/reject`, rejectionData),
    reassign: (id, assigneeId) => api.put(`/assessment-workflow/${id}/reassign`, { assigneeId }),
    getTemplates: () => api.get('/assessment-workflow/templates'),
    createFromTemplate: (templateId, workflowData) => api.post(`/assessment-workflow/templates/${templateId}/create`, workflowData),
    getStats: () => api.get('/assessment-workflow/stats'),
    getAnalytics: (params) => api.get('/assessment-workflow/analytics', { params })
  },
  regulatoryIntelligence: {
    getRegulations: (params) => api.get('/regulatory-intelligence/regulations', { params }),
    getRegulationById: (id) => api.get(`/regulatory-intelligence/regulations/${id}`),
    createAlert: (alertData) => api.post('/regulatory-intelligence/alerts', alertData),
    getAlerts: (params) => api.get('/regulatory-intelligence/alerts', { params }),
    getCalendar: (params) => api.get('/regulatory-intelligence/calendar', { params }),
    updateCompliance: (regulationId, complianceData) => api.put(`/regulatory-intelligence/regulations/${regulationId}/compliance`, complianceData),
    getAnalytics: (params) => api.get('/regulatory-intelligence/analytics', { params }),
    getStats: () => api.get('/regulatory-intelligence/stats')
  },
  aiScheduler: {
    getTasks: (params) => api.get('/scheduler/jobs', { params }),
    getTaskById: (id) => api.get(`/scheduler/jobs/${id}`),
    createTask: (taskData) => api.post('/scheduler/jobs', taskData),
    updateTask: (id, taskData) => api.put(`/scheduler/jobs/${id}`, taskData),
    deleteTask: (id) => api.delete(`/scheduler/jobs/${id}`),
    runTask: (id) => api.post(`/scheduler/jobs/${id}/execute`),
    pauseTask: (id) => api.put(`/scheduler/jobs/${id}`, { isActive: false }),
    getAutomationRules: () => Promise.resolve({ data: { rules: [] } }),
    createAutomationRule: (ruleData) => Promise.resolve({ data: { success: true } }),
    updateAutomationRule: (id, ruleData) => Promise.resolve({ data: { success: true } }),
    getAiSuggestions: () => Promise.resolve({ data: { suggestions: [] } }),
    implementSuggestion: (id) => Promise.resolve({ data: { success: true } }),
    dismissSuggestion: (id) => Promise.resolve({ data: { success: true } }),
    getStats: () => api.get('/scheduler/stats'),
    getAnalytics: (params) => api.get('/scheduler/stats', { params })
  },
  subscriptions: {
    getAll: (params) => api.get('/subscriptions', { params }),
    getById: (id) => api.get(`/subscriptions/${id}`),
    create: (subscriptionData) => api.post('/subscriptions', subscriptionData),
    update: (id, subscriptionData) => api.put(`/subscriptions/${id}`, subscriptionData),
    recordUsage: (id, usageData) => api.post(`/subscriptions/${id}/usage`, usageData),
    getUsage: (id, params) => api.get(`/subscriptions/${id}/usage`, { params }),
    getPlans: () => api.get('/subscriptions/plans'),
    updateFeatures: (id, featureData) => api.post(`/subscriptions/${id}/features`, featureData),
    getAnalytics: () => api.get('/subscriptions/analytics/dashboard')
  },
  autoAssessment: {
    getPreview: (tenantId) => api.get(`/auto-assessment/preview/${tenantId}`),
    generate: (tenantId, options) => api.post(`/auto-assessment/generate-from-tenant/${tenantId}`, options)
  }
};

// Export regulatoryAPI separately for convenience
export const regulatoryAPI = apiServices.regulatory;

export { api, apiServices };
