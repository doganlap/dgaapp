import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
}

// Entity APIs
export const entityAPI = {
  getAll: (params) => api.get('/dga/entities', { params }),
  getById: (id) => api.get(`/dga/entities/${id}`),
  create: (data) => api.post('/dga/entities', data),
  update: (id, data) => api.put(`/dga/entities/${id}`, data),
  delete: (id) => api.delete(`/dga/entities/${id}`),
}

// Program APIs
export const programAPI = {
  getAll: (params) => api.get('/dga/programs', { params }),
  getById: (id) => api.get(`/dga/programs/${id}`),
  create: (data) => api.post('/dga/programs', data),
  update: (id, data) => api.put(`/dga/programs/${id}`, data),
}

// Budget APIs
export const budgetAPI = {
  getOverview: () => api.get('/dga/budget/overview'),
  getEntityBudget: (entityId) => api.get(`/dga/budget/entity/${entityId}`),
}

// Finance APIs
export const financeAPI = {
  getSummary: () => api.get('/dga/finance/summary'),
  getContracts: () => api.get('/dga/finance/contracts'),
  getInvoices: (params) => api.get('/dga/finance/invoices', { params }),
  generateReport: (params) => api.get('/dga/finance/report', { params }),
  getBudgetTrends: (params) => api.get('/dga/finance/budget-trends', { params }),
  getContractAnalysis: (params) => api.get('/dga/finance/contract-analysis', { params }),
}

// Reporting APIs
export const reportingAPI = {
  getNationalOverview: () => api.get('/dga/reporting/overview'),
  getRegionalReport: (region) => api.get(`/dga/reporting/region/${region}`),
  getKPIs: () => api.get('/dga/reporting/kpis'),
}

// Rich data APIs
export const dgaDataAPI = {
  getAllKPIs: (params) => api.get('/dga/kpis', { params }),
  getComplianceRecords: (params) => api.get('/dga/compliance-records', { params }),
  getRisks: (params) => api.get('/dga/risks', { params }),
  getDigitalMaturityScores: (params) => api.get('/dga/digital-maturity-scores', { params }),
  getStakeholderConsensus: (params) => api.get('/dga/stakeholder-consensus', { params }),
}

// Project APIs
export const projectAPI = {
  getAll: (params) => api.get('/dga/projects', { params }),
  getById: (id) => api.get(`/dga/projects/${id}`),
}

// Ticket APIs
export const ticketAPI = {
  getAll: (params) => api.get('/dga/tickets', { params }),
  create: (data) => api.post('/dga/tickets', data),
  update: (id, data) => api.put(`/dga/tickets/${id}`, data),
}

// GRC APIs
export const grcAPI = {
  // Dashboard
  getDashboard: () => api.get('/grc/dashboard'),
  getInsights: () => api.get('/grc/dashboard/insights'),
  
  // Risks
  getAllRisks: (params) => api.get('/grc/risks', { params }),
  getRiskById: (id) => api.get(`/grc/risks/${id}`),
  createRisk: (data) => api.post('/grc/risks', data),
  updateRisk: (id, data) => api.put(`/grc/risks/${id}`, data),
  deleteRisk: (id) => api.delete(`/grc/risks/${id}`),
  getRiskAnalytics: () => api.get('/grc/risks/analytics/overview'),
  getRiskTrends: (params) => api.get('/grc/risks/analytics/trends', { params }),
  
  // Compliance
  getAllCompliance: (params) => api.get('/grc/compliance', { params }),
  getComplianceById: (id) => api.get(`/grc/compliance/${id}`),
  createCompliance: (data) => api.post('/grc/compliance', data),
  updateCompliance: (id, data) => api.put(`/grc/compliance/${id}`, data),
  getComplianceAnalytics: () => api.get('/grc/compliance/analytics/overview'),
  getComplianceByStandard: (standard) => api.get(`/grc/compliance/standards/${standard}`),
  getEntityCompliance: (entityId) => api.get(`/grc/compliance/entity/${entityId}`),
  
  // Governance
  getGovernanceOverview: () => api.get('/grc/governance/overview'),
  getGovernancePolicies: () => api.get('/grc/governance/policies'),
  getGovernanceFrameworks: () => api.get('/grc/governance/frameworks'),
  getGovernanceControls: () => api.get('/grc/governance/controls'),
  
  // Insights
  getRiskPredictions: () => api.get('/grc/insights/risk-predictions'),
}

// Comprehensive GRC APIs
export const comprehensiveGrcAPI = {
  // Regulators
  getAllRegulators: (params) => api.get('/grc/comprehensive/regulators', { params }),
  getRegulatorById: (id) => api.get(`/grc/comprehensive/regulators/${id}`),
  
  // Sectors
  getAllSectors: () => api.get('/grc/comprehensive/sectors'),
  
  // Frameworks
  getAllFrameworks: (params) => api.get('/grc/comprehensive/frameworks', { params }),
  getFrameworkById: (id) => api.get(`/grc/comprehensive/frameworks/${id}`),
  createFramework: (data) => api.post('/grc/comprehensive/frameworks', data),
  
  // Controls
  getAllControls: (params) => api.get('/grc/comprehensive/controls', { params }),
  getControlById: (id) => api.get(`/grc/comprehensive/controls/${id}`),
  createControl: (data) => api.post('/grc/comprehensive/controls', data),
  
  // Organization-Regulator Mapping
  getOrganizationRegulators: (entityId) => api.get(`/grc/comprehensive/organizations/${entityId}/regulators`),
  mapOrganizationToRegulator: (entityId, data) => api.post(`/grc/comprehensive/organizations/${entityId}/regulators`, data),
  autoMapRegulators: (entityId) => api.post(`/grc/comprehensive/organizations/${entityId}/regulators/auto-map`),
  
  // Control Assessments
  getControlAssessments: (params) => api.get('/grc/comprehensive/assessments', { params }),
  createControlAssessment: (data) => api.post('/grc/comprehensive/assessments', data),
  updateControlAssessment: (id, data) => api.put(`/grc/comprehensive/assessments/${id}`, data),
  
  // Evidence
  getEvidence: (params) => api.get('/grc/comprehensive/evidence', { params }),
  createEvidence: (data) => api.post('/grc/comprehensive/evidence', data),
  
  // Implementation Plans
  getImplementationPlans: (params) => api.get('/grc/comprehensive/plans', { params }),
  createImplementationPlan: (data) => api.post('/grc/comprehensive/plans', data),
  
  // Compliance Reports
  getComplianceReports: (params) => api.get('/grc/comprehensive/reports', { params }),
  createComplianceReport: (data) => api.post('/grc/comprehensive/reports', data),
  generateComplianceReport: (data) => api.post('/grc/comprehensive/reports/generate', data),
}

// GRC Scoring, Leading Indicators & Guidance APIs
export const grcScoringAPI = {
  // Scoring
  getComplianceScore: (params) => api.get('/grc/scoring/compliance', { params }),
  getRiskScore: (params) => api.get('/grc/scoring/risk', { params }),
  getMaturityScore: (entityId) => api.get(`/grc/scoring/maturity/${entityId}`),
  
  // Leading Indicators
  getLeadingIndicators: (params) => api.get('/grc/indicators/leading', { params }),
  
  // Guidance
  getGuidance: (params) => api.get('/grc/guidance', { params }),
}

// Additional GRC Insights APIs (if needed separately)
export const grcInsightsAPI = {
  getComplianceTrends: (params) => api.get('/grc/insights/compliance-trends', { params }),
  getRecommendations: () => api.get('/grc/insights/recommendations'),
  getHeatmap: () => api.get('/grc/insights/heatmap'),
  
  // Reports
  getExecutiveSummary: () => api.get('/grc/reports/executive-summary'),
  getRiskReport: () => api.get('/grc/reports/risk-report'),
  getComplianceReport: () => api.get('/grc/reports/compliance-report'),
}

export default api
