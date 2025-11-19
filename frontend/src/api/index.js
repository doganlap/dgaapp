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

export default api
