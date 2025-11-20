/**
 * Test Setup Configuration
 * Global setup for UI database integration tests
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FormData
global.FormData = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
}));

// Mock File and Blob
global.File = jest.fn().mockImplementation((bits, name, options) => ({
  name,
  size: bits.length,
  type: options?.type || '',
  lastModified: Date.now(),
}));

global.Blob = jest.fn().mockImplementation((bits, options) => ({
  size: bits.reduce((acc, bit) => acc + bit.length, 0),
  type: options?.type || '',
}));

// Console error suppression for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: React.createFactory() is deprecated') ||
       args[0].includes('API Error:') ||
       args[0].includes('Error loading') ||
       args[0].includes('Error fetching'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Create mock API response
  createMockApiResponse: (data, status = 200) => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' },
  }),

  // Create mock error response
  createMockErrorResponse: (message, status = 500) => {
    const error = new Error(message);
    error.response = {
      status,
      data: { message },
    };
    return error;
  },

  // Wait for async operations
  waitForAsync: () => new Promise(resolve => setTimeout(resolve, 0)),

  // Mock component props
  createMockProps: (overrides = {}) => ({
    loading: false,
    error: null,
    data: [],
    onRefresh: jest.fn(),
    onError: jest.fn(),
    ...overrides,
  }),

  // Mock React Query client
  createMockQueryClient: () => ({
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
    refetchQueries: jest.fn(),
    clear: jest.fn(),
  }),
};

// Database test utilities
global.dbTestUtils = {
  // Mock database records
  mockOrganizations: [
    {
      id: 1,
      name: 'Test Bank',
      industry: 'Financial Services',
      country: 'KSA',
      sector: 'FIN',
      is_active: true,
      assessment_count: 5,
      compliance_score: 85.5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 2,
      name: 'Test Hospital',
      industry: 'Healthcare',
      country: 'UAE',
      sector: 'HLT',
      is_active: true,
      assessment_count: 3,
      compliance_score: 92.0,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-16T00:00:00Z',
    },
  ],

  mockRegulators: [
    {
      id: 1,
      name: 'Saudi Arabian Monetary Authority',
      abbreviation: 'SAMA',
      jurisdiction: 'KSA',
      website: 'https://sama.gov.sa',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'National Cybersecurity Authority',
      abbreviation: 'NCA',
      jurisdiction: 'KSA',
      website: 'https://nca.gov.sa',
      created_at: '2024-01-01T00:00:00Z',
    },
  ],

  mockFrameworks: [
    {
      id: 1,
      name: 'SAMA Cybersecurity Framework',
      abbreviation: 'SAMA-CSF',
      version: '1.0',
      regulator_id: 1,
      published_at: '2024-01-01T00:00:00Z',
      is_active: true,
    },
    {
      id: 2,
      name: 'NCA Essential Cybersecurity Controls',
      abbreviation: 'NCA-ECC',
      version: '2.0',
      regulator_id: 2,
      published_at: '2024-01-01T00:00:00Z',
      is_active: true,
    },
  ],

  mockControls: [
    {
      id: 1,
      framework_id: 1,
      control_id: 'SAMA-CSF-001',
      title: 'Access Control Management',
      description: 'Implement comprehensive access control measures',
      category: 'Access Control',
      criticality_level: 'high',
      is_mandatory: true,
    },
    {
      id: 2,
      framework_id: 1,
      control_id: 'SAMA-CSF-002',
      title: 'Data Encryption',
      description: 'Encrypt sensitive data at rest and in transit',
      category: 'Data Protection',
      criticality_level: 'high',
      is_mandatory: true,
    },
  ],

  mockAssessments: [
    {
      id: 1,
      name: 'Q1 2024 Compliance Assessment',
      organization_id: 1,
      framework_id: 1,
      status: 'in_progress',
      due_date: '2024-03-31T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 2,
      name: 'Annual Security Review',
      organization_id: 2,
      framework_id: 2,
      status: 'completed',
      completed_at: '2024-01-30T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-30T00:00:00Z',
    },
  ],

  mockAssessmentResponses: [
    {
      id: 1,
      assessment_id: 1,
      control_id: 1,
      status: 'compliant',
      comments: 'Access control policies are in place and regularly reviewed',
      evidence_count: 2,
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 2,
      assessment_id: 1,
      control_id: 2,
      status: 'non_compliant',
      comments: 'Encryption implementation needs improvement',
      evidence_count: 1,
      updated_at: '2024-01-15T00:00:00Z',
    },
  ],

  mockEvidence: [
    {
      id: 1,
      assessment_response_id: 1,
      title: 'Access Control Policy Document',
      description: 'Company access control policy and procedures',
      filename: 'access-control-policy.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf',
      is_confidential: false,
      uploaded_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 2,
      assessment_response_id: 2,
      title: 'Encryption Configuration',
      description: 'Database encryption configuration screenshot',
      filename: 'encryption-config.png',
      file_size: 512000,
      mime_type: 'image/png',
      is_confidential: true,
      uploaded_at: '2024-01-15T00:00:00Z',
    },
  ],

  mockDashboardStats: {
    regulators: 25,
    frameworks: 21,
    controls: 2568,
    assessments: 45,
    organizations: 12,
    compliance_score: 87.5,
    recent_activity: [
      {
        id: 1,
        action: 'Assessment Created',
        entity: 'Q1 2024 Compliance Assessment',
        timestamp: '2024-01-15T10:30:00Z',
      },
      {
        id: 2,
        action: 'Evidence Uploaded',
        entity: 'Access Control Policy Document',
        timestamp: '2024-01-15T09:15:00Z',
      },
    ],
  },
};

// API mock helpers
global.apiMockHelpers = {
  // Setup successful API mocks
  setupSuccessfulMocks: (mockApiServices) => {
    mockApiServices.organizations.getAll.mockResolvedValue({
      data: { data: global.dbTestUtils.mockOrganizations }
    });
    
    mockApiServices.regulators.getAll.mockResolvedValue({
      data: { data: global.dbTestUtils.mockRegulators }
    });
    
    mockApiServices.frameworks.getAll.mockResolvedValue({
      data: { data: global.dbTestUtils.mockFrameworks }
    });
    
    mockApiServices.controls.getAll.mockResolvedValue({
      data: {
        data: global.dbTestUtils.mockControls,
        pagination: { total: 2568, page: 1, limit: 20 }
      }
    });
    
    mockApiServices.assessments.getAll.mockResolvedValue({
      data: { data: global.dbTestUtils.mockAssessments }
    });
    
    mockApiServices.dashboard.getStats.mockResolvedValue({
      data: global.dbTestUtils.mockDashboardStats
    });
  },

  // Setup error mocks
  setupErrorMocks: (mockApiServices, errorType = 'generic') => {
    const error = errorType === 'network' 
      ? global.testUtils.createMockErrorResponse('Network Error', 0)
      : global.testUtils.createMockErrorResponse('API Error', 500);
    
    Object.values(mockApiServices).forEach(service => {
      Object.values(service).forEach(method => {
        if (typeof method === 'function') {
          method.mockRejectedValue(error);
        }
      });
    });
  },
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});