#!/usr/bin/env node

/**
 * UI Database Integration Test Runner
 * Runs comprehensive tests for all UI component database interactions
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  // Test directories
  unitTestsDir: path.join(__dirname, 'unit', 'frontend'),
  e2eTestsDir: path.join(__dirname, 'e2e'),
  
  // Test files
  testFiles: [
    'ui-database-integration.test.js',
    'hooks-api-integration.test.js',
    'ui-database-flow.test.js'
  ],
  
  // Environment variables
  env: {
    NODE_ENV: 'test',
    TEST_BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    TEST_API_URL: process.env.TEST_API_URL || 'http://localhost:5001',
    DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  },
  
  // Test options
  options: {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    watch: process.argv.includes('--watch') || process.argv.includes('-w'),
    coverage: process.argv.includes('--coverage') || process.argv.includes('-c'),
    e2eOnly: process.argv.includes('--e2e-only'),
    unitOnly: process.argv.includes('--unit-only'),
    bail: process.argv.includes('--bail'),
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Utility functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSection = (title) => {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
};

const logSubsection = (title) => {
  log(`\n${'-'.repeat(40)}`, 'blue');
  log(`${title}`, 'blue');
  log(`${'-'.repeat(40)}`, 'blue');
};

// Check if required dependencies are installed
const checkDependencies = () => {
  logSection('Checking Dependencies');
  
  const requiredPackages = [
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@playwright/test',
    'jest',
    'react-query'
  ];
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log('❌ package.json not found', 'red');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  let allInstalled = true;
  
  requiredPackages.forEach(pkg => {
    if (allDeps[pkg]) {
      log(`✅ ${pkg} - ${allDeps[pkg]}`, 'green');
    } else {
      log(`❌ ${pkg} - Not installed`, 'red');
      allInstalled = false;
    }
  });
  
  return allInstalled;
};

// Check if test files exist
const checkTestFiles = () => {
  logSection('Checking Test Files');
  
  let allExist = true;
  
  // Check unit test files
  const unitTestFiles = [
    'ui-database-integration.test.js',
    'hooks-api-integration.test.js'
  ];
  
  unitTestFiles.forEach(file => {
    const filePath = path.join(TEST_CONFIG.unitTestsDir, file);
    if (fs.existsSync(filePath)) {
      log(`✅ Unit Test: ${file}`, 'green');
    } else {
      log(`❌ Unit Test: ${file} - Not found`, 'red');
      allExist = false;
    }
  });
  
  // Check E2E test files
  const e2eTestFiles = ['ui-database-flow.test.js'];
  
  e2eTestFiles.forEach(file => {
    const filePath = path.join(TEST_CONFIG.e2eTestsDir, file);
    if (fs.existsSync(filePath)) {
      log(`✅ E2E Test: ${file}`, 'green');
    } else {
      log(`❌ E2E Test: ${file} - Not found`, 'red');
      allExist = false;
    }
  });
  
  return allExist;
};

// Run Jest unit tests
const runUnitTests = () => {
  return new Promise((resolve, reject) => {
    logSubsection('Running Unit Tests');
    
    const jestArgs = [
      '--testPathPattern=tests/unit/frontend',
      '--testEnvironment=jsdom',
      '--setupFilesAfterEnv=<rootDir>/tests/setup.js',
    ];
    
    if (TEST_CONFIG.options.verbose) {
      jestArgs.push('--verbose');
    }
    
    if (TEST_CONFIG.options.watch) {
      jestArgs.push('--watch');
    }
    
    if (TEST_CONFIG.options.coverage) {
      jestArgs.push('--coverage');
      jestArgs.push('--coverageDirectory=tests/coverage/unit');
    }
    
    if (TEST_CONFIG.options.bail) {
      jestArgs.push('--bail');
    }
    
    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: 'inherit',
      env: { ...process.env, ...TEST_CONFIG.env },
      cwd: path.join(__dirname, '..')
    });
    
    jest.on('close', (code) => {
      if (code === 0) {
        log('✅ Unit tests passed', 'green');
        resolve();
      } else {
        log('❌ Unit tests failed', 'red');
        reject(new Error(`Unit tests failed with code ${code}`));
      }
    });
    
    jest.on('error', (error) => {
      log(`❌ Error running unit tests: ${error.message}`, 'red');
      reject(error);
    });
  });
};

// Run Playwright E2E tests
const runE2ETests = () => {
  return new Promise((resolve, reject) => {
    logSubsection('Running E2E Tests');
    
    const playwrightArgs = ['test', 'tests/e2e/ui-database-flow.test.js'];
    
    if (TEST_CONFIG.options.verbose) {
      playwrightArgs.push('--reporter=list');
    }
    
    const playwright = spawn('npx', ['playwright', ...playwrightArgs], {
      stdio: 'inherit',
      env: { ...process.env, ...TEST_CONFIG.env },
      cwd: path.join(__dirname, '..')
    });
    
    playwright.on('close', (code) => {
      if (code === 0) {
        log('✅ E2E tests passed', 'green');
        resolve();
      } else {
        log('❌ E2E tests failed', 'red');
        reject(new Error(`E2E tests failed with code ${code}`));
      }
    });
    
    playwright.on('error', (error) => {
      log(`❌ Error running E2E tests: ${error.message}`, 'red');
      reject(error);
    });
  });
};

// Generate test report
const generateReport = (results) => {
  logSection('Test Results Summary');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: TEST_CONFIG.env,
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
    }
  };
  
  // Display summary
  log(`Total Test Suites: ${reportData.summary.total}`, 'bright');
  log(`Passed: ${reportData.summary.passed}`, 'green');
  log(`Failed: ${reportData.summary.failed}`, 'red');
  
  // Save report to file
  const reportPath = path.join(__dirname, 'reports', 'ui-database-test-report.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  log(`\n📄 Report saved to: ${reportPath}`, 'cyan');
  
  return reportData.summary.failed === 0;
};

// Main test runner function
const runTests = async () => {
  try {
    logSection('UI Database Integration Test Runner');
    log(`Test Environment: ${TEST_CONFIG.env.NODE_ENV}`, 'yellow');
    log(`Frontend URL: ${TEST_CONFIG.env.TEST_BASE_URL}`, 'yellow');
    log(`API URL: ${TEST_CONFIG.env.TEST_API_URL}`, 'yellow');
    
    // Pre-flight checks
    if (!checkDependencies()) {
      log('\n❌ Missing required dependencies. Please install them first.', 'red');
      process.exit(1);
    }
    
    if (!checkTestFiles()) {
      log('\n❌ Missing test files. Please ensure all test files are present.', 'red');
      process.exit(1);
    }
    
    const results = [];
    
    // Run unit tests
    if (!TEST_CONFIG.options.e2eOnly) {
      try {
        await runUnitTests();
        results.push({ suite: 'Unit Tests', status: 'passed' });
      } catch (error) {
        results.push({ suite: 'Unit Tests', status: 'failed', error: error.message });
        if (TEST_CONFIG.options.bail) {
          throw error;
        }
      }
    }
    
    // Run E2E tests
    if (!TEST_CONFIG.options.unitOnly) {
      try {
        await runE2ETests();
        results.push({ suite: 'E2E Tests', status: 'passed' });
      } catch (error) {
        results.push({ suite: 'E2E Tests', status: 'failed', error: error.message });
        if (TEST_CONFIG.options.bail) {
          throw error;
        }
      }
    }
    
    // Generate report
    const allPassed = generateReport(results);
    
    if (allPassed) {
      log('\n🎉 All tests passed!', 'green');
      process.exit(0);
    } else {
      log('\n💥 Some tests failed!', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n💥 Test runner error: ${error.message}`, 'red');
    process.exit(1);
  }
};

// Display help
const showHelp = () => {
  log('UI Database Integration Test Runner', 'bright');
  log('\nUsage: node run-ui-database-tests.js [options]', 'cyan');
  log('\nOptions:', 'yellow');
  log('  --verbose, -v     Verbose output');
  log('  --watch, -w       Watch mode for unit tests');
  log('  --coverage, -c    Generate coverage report');
  log('  --e2e-only        Run only E2E tests');
  log('  --unit-only       Run only unit tests');
  log('  --bail            Stop on first failure');
  log('  --help, -h        Show this help message');
  log('\nEnvironment Variables:', 'yellow');
  log('  TEST_BASE_URL     Frontend URL (default: http://localhost:3000)');
  log('  TEST_API_URL      API URL (default: http://localhost:5001)');
  log('  TEST_DATABASE_URL Database URL for testing');
};

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run the tests
runTests();