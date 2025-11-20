/**
 * Enhanced API Service with retry logic, better error handling, and request cancellation
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  withCredentials: true
});

// Request ID counter for tracking
let requestIdCounter = 0;

// Store for active requests (for cancellation)
const activeRequests = new Map();

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `web_${Date.now()}_${++requestIdCounter}`;
}

/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(message, code, statusCode, details = {}) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Request interceptor
 */
api.interceptors.request.use(
  (config) => {
    // Add request ID for tracking
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    config.metadata = { requestId, startTime: Date.now() };

    // Add auth token from localStorage if exists
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add tenant ID (for multi-tenancy)
    const tenantId = localStorage.getItem('tenantId') || '42c676e2-8d5e-4b1d-ae80-3986b82dd5c5';
    config.headers['X-Tenant-ID'] = tenantId;

    // Store cancel token for potential cancellation
    const cancelTokenSource = axios.CancelToken.source();
    config.cancelToken = cancelTokenSource.token;
    activeRequests.set(requestId, cancelTokenSource);

    // Log in development
    if (import.meta.env.MODE === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        requestId,
        data: config.data,
        params: config.params
      });
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 */
api.interceptors.response.use(
  (response) => {
    const requestId = response.config.metadata?.requestId;
    const duration = Date.now() - (response.config.metadata?.startTime || 0);

    // Remove from active requests
    if (requestId) {
      activeRequests.delete(requestId);
    }

    // Log in development
    if (import.meta.env.MODE === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        requestId,
        status: response.status,
        duration: `${duration}ms`,
        data: response.data
      });
    }

    return response;
  },
  async (error) => {
    const requestId = error.config?.metadata?.requestId;
    
    // Remove from active requests
    if (requestId) {
      activeRequests.delete(requestId);
    }

    // Handle cancelled requests
    if (axios.isCancel(error)) {
      console.log('[API Request Cancelled]', error.message);
      return Promise.reject(new APIError('Request cancelled', 'REQUEST_CANCELLED', 0));
    }

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const errorMessage = data?.message || data?.error || 'An error occurred';
      const errorCode = data?.code || `HTTP_${status}`;

      console.error(`[API Error] ${status} - ${errorMessage}`, {
        requestId,
        url: error.config?.url,
        method: error.config?.method,
        data: data
      });

      // Handle specific status codes
      switch (status) {
        case 401:
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(new APIError('Unauthorized', 'UNAUTHORIZED', 401));

        case 403:
          // Forbidden
          return Promise.reject(new APIError('Access denied', 'FORBIDDEN', 403, data));

        case 404:
          // Not found
          return Promise.reject(new APIError('Resource not found', 'NOT_FOUND', 404, data));

        case 422:
          // Validation error
          return Promise.reject(new APIError('Validation failed', 'VALIDATION_ERROR', 422, data));

        case 429: {
          // Rate limit exceeded - include retry information if available
          const retryAfter = data?.retryAfter || data?.retry_after;
          const message = retryAfter 
            ? `Too many requests. Please try again in ${retryAfter} seconds.`
            : 'Too many requests. Please try again later.';
          return Promise.reject(new APIError(message, 'RATE_LIMIT_EXCEEDED', 429, data));
        }

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          return Promise.reject(new APIError('Server error', 'SERVER_ERROR', status, data));

        default:
          return Promise.reject(new APIError(errorMessage, errorCode, status, data));
      }
    } else if (error.request) {
      // Request made but no response received (network error)
      console.error('[API Network Error]', {
        requestId,
        url: error.config?.url,
        method: error.config?.method
      });
      return Promise.reject(new APIError('Network error', 'NETWORK_ERROR', 0));
    } else {
      // Something else happened
      console.error('[API Unknown Error]', error);
      return Promise.reject(new APIError('An unexpected error occurred', 'UNKNOWN_ERROR', 0));
    }
  }
);

/**
 * Cancel all active requests
 */
export function cancelAllRequests(reason = 'Component unmounted') {
  activeRequests.forEach((cancelSource) => {
    cancelSource.cancel(reason);
  });
  activeRequests.clear();
}

/**
 * Cancel specific request by ID
 */
export function cancelRequest(requestId) {
  const cancelSource = activeRequests.get(requestId);
  if (cancelSource) {
    cancelSource.cancel('Request cancelled by user');
    activeRequests.delete(requestId);
  }
}

/**
 * Retry failed request with exponential backoff
 */
async function retryRequest(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Stop retrying on rate limit errors (429) to avoid making the problem worse
      if (error.statusCode === 429 || i === retries - 1 || error.statusCode === 401 || error.statusCode === 403) {
        throw error;
      }
      const backoffDelay = delay * Math.pow(2, i);
      console.log(`[API Retry] Attempt ${i + 1}/${retries} after ${backoffDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}

/**
 * API service methods with retry capability
 */
export const apiService = {
  // Generic HTTP methods
  get: (url, config = {}) => retryRequest(() => api.get(url, config)),
  post: (url, data, config = {}) => api.post(url, data, config),
  put: (url, data, config = {}) => api.put(url, data, config),
  patch: (url, data, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),

  // Upload with progress tracking
  upload: (url, formData, onProgress) => {
    return api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
  },

  // Download with progress tracking
  download: (url, filename, onProgress) => {
    return api.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    }).then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  }
};

export { APIError };
export default api;
