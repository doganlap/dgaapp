/**
 * Analytics API Service
 * Connects to database for analytics data
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const analyticsApi = {
  // Get tenant analytics data
  getTenantAnalytics: async (tenantId, filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/tenant/${tenantId}`, {
        params: filters,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tenant analytics:', error);
      throw error;
    }
  },

  // Get usage trends over time
  getUsageTrends: async (tenantId, timeframe = '30d') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/usage-trends/${tenantId}`, {
        params: { timeframe },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching usage trends:', error);
      throw error;
    }
  },

  // Get feature breakdown analytics
  getFeatureBreakdown: async (tenantId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/feature-breakdown/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching feature breakdown:', error);
      throw error;
    }
  },

  // Get efficiency metrics
  getEfficiencyMetrics: async (tenantId, dateRange = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/efficiency/${tenantId}`, {
        params: dateRange,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching efficiency metrics:', error);
      throw error;
    }
  },

  // Get usage alerts
  getUsageAlerts: async (tenantId, threshold = 80) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/alerts/${tenantId}`, {
        params: { threshold },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching usage alerts:', error);
      throw error;
    }
  },

  // Export analytics data
  exportAnalytics: async (tenantId, format = 'json') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/export/${tenantId}`, {
        params: { format },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  },

  // Get real-time analytics
  getRealTimeAnalytics: async (tenantId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/realtime/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching real-time analytics:', error);
      throw error;
    }
  },

  // Get predictive analytics
  getPredictiveAnalytics: async (tenantId, daysAhead = 30) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/predictive/${tenantId}`, {
        params: { daysAhead },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
 console.error('Error fetching predictive analytics:', error);
      throw error;
    }
  }
};

export default analyticsApi;