/**
 * Jest Configuration for UI Database Integration Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Root directory
  rootDir: '../',
  
  // Test directories
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/frontend/src/pages/$1',
    '^@services/(.*)$': '<rootDir>/frontend/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/frontend/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/frontend/src/utils/$1',
    '^@context/(.*)$': '<rootDir>/frontend/src/context/$1',
  },
  
  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-object-rest-spread'
      ]
    }],
    '^.+\\.css$': 'jest-transform-css',
    '^.+\\.(png|jpg|jpeg|gif|webp|svg)$': 'jest-transform-file'
  },
  
  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@testing-library|react-query)/)'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'frontend/src/**/*.{js,jsx,ts,tsx}',
    '!frontend/src/**/*.d.ts',
    '!frontend/src/index.js',
    '!frontend/src/reportWebVitals.js',
    '!frontend/src/**/*.stories.{js,jsx,ts,tsx}',
    '!frontend/src/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  coverageDirectory: '<rootDir>/tests/coverage',
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './frontend/src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './frontend/src/hooks/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Test results processor
  testResultsProcessor: '<rootDir>/tests/processors/test-results-processor.js',
  
  // Custom reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/tests/reports',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/tests/reports',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'UI Database Integration Test Report'
    }]
  ],
  
  // Snapshot serializers
  snapshotSerializers: [
    '@emotion/jest/serializer'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/frontend/src'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/tests/e2e/'
  ],
  
  // Watch ignore patterns
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/tests/coverage/',
    '<rootDir>/tests/reports/'
  ],
  
  // Notify mode
  notify: true,
  notifyMode: 'failure-change',
  
  // Bail configuration
  bail: false,
  
  // Max workers
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/tests/.jest-cache',
  
  // Preset
  preset: undefined,
  
  // Projects (for multi-project setup)
  projects: undefined,
  
  // Runner
  runner: 'jest-runner',
  
  // Test name pattern
  testNamePattern: undefined,
  
  // Test regex
  testRegex: undefined,
  
  // Unmocked module path patterns
  unmockedModulePathPatterns: undefined,
  
  // Update snapshot
  updateSnapshot: false,
  
  // Use stderr
  useStderr: false,
  
  // Watch
  watch: false,
  watchAll: false,
  
  // Force exit
  forceExit: false,
  
  // Detect open handles
  detectOpenHandles: false,
  
  // Collect coverage from
  collectCoverage: false,
  
  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/build/',
    '/dist/'
  ],
  
  // Coverage provider
  coverageProvider: 'v8',
  
  // Dependency extractor
  dependencyExtractor: undefined,
  
  // Display name
  displayName: {
    name: 'UI Database Integration Tests',
    color: 'blue'
  },
  
  // Expand
  expand: false,
  
  // Extra globals
  extraGlobals: [],
  
  // Find related tests
  findRelatedTests: false,
  
  // Global setup
  globalSetup: undefined,
  
  // Global teardown
  globalTeardown: undefined,
  
  // Haste
  haste: undefined,
  
  // Inject globals
  injectGlobals: true,
  
  // List tests
  listTests: false,
  
  // Log heap usage
  logHeapUsage: false,
  
  // Max concurrency
  maxConcurrency: 5,
  
  // No coverage
  collectCoverageOnlyFrom: undefined,
  
  // No stack trace
  noStackTrace: false,
  
  // Pass with no tests
  passWithNoTests: false,
  
  // Prettier path
  prettierPath: 'prettier',
  
  // Reset mocks
  resetMocks: false,
  
  // Reset modules
  resetModules: false,
  
  // Resolve snapshot path
  resolveSnapshotPath: undefined,
  
  // Roots
  roots: [
    '<rootDir>/frontend/src',
    '<rootDir>/tests'
  ],
  
  // Run in band
  runInBand: false,
  
  // Setup files
  setupFiles: [],
  
  // Silent
  silent: false,
  
  // Skip filter
  skipFilter: false,
  
  // Slow test threshold
  slowTestThreshold: 5,
  
  // Snapshot format
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true
  },
  
  // Snapshot resolver
  snapshotResolver: undefined,
  
  // Test location in results
  testLocationInResults: false,
  
  // Test sequence
  testSequencer: '@jest/test-sequencer',
  
  // Timer
  timers: 'real',
  
  // Transform ignore patterns
  // Already defined above
  
  // Watch ignore patterns
  // Already defined above
  
  // WorkerIdleMemoryLimit
  workerIdleMemoryLimit: undefined
};