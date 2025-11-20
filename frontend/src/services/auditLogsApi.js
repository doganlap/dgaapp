/**
 * Audit Logs API Service
 * Handles system audit trails, activity logs, and compliance tracking
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005'; // Use BFF port

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auditLogsApi = {
  // Get audit logs
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/api/audit-logs', { params });
    return response.data;
  },

  // Get audit log by ID
  getAuditLog: async (id) => {
    const response = await api.get(`/api/audit-logs/${id}`);
    return response.data;
  },

  // Create audit log entry
  createAuditLog: async (logData) => {
    const response = await api.post('/api/audit-logs', logData);
    return response.data;
  },

  // Get user activity logs
  getUserActivityLogs: async (userId, params = {}) => {
    const response = await api.get(`/api/audit-logs/users/${userId}`, { params });
    return response.data;
  },

  // Get system activity logs
  getSystemActivityLogs: async (params = {}) => {
    const response = await api.get('/api/audit-logs/system', { params });
    return response.data;
  },

  // Get security events
  getSecurityEvents: async (params = {}) => {
    const response = await api.get('/api/audit-logs/security', { params });
    return response.data;
  },

  // Get compliance audit trail
  getComplianceAuditTrail: async (params = {}) => {
    const response = await api.get('/api/audit-logs/compliance', { params });
    return response.data;
  },

  // Export audit logs
  exportAuditLogs: async (params = {}) => {
    const response = await api.get('/api/audit-logs/export', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Get audit statistics
  getAuditStats: async (params = {}) => {
    const response = await api.get('/api/audit-logs/stats', { params });
    return response.data;
  },

  // Get audit log categories
  getAuditCategories: async () => {
    const response = await api.get('/api/audit-logs/categories');
    return response.data;
  },

  // Search audit logs
  searchAuditLogs: async (searchParams) => {
    const response = await api.post('/api/audit-logs/search', searchParams);
    return response.data;
  }
};

export default auditLogsApi;
