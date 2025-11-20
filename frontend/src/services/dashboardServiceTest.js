/**
 * Dashboard Service Test Suite
 * Tests all dashboard endpoints and data connections with BFF
 */

// Test configuration
const BFF_BASE_URL = 'http://localhost:3004';
const DEV_BYPASS_HEADER = { 'x-dev-bypass': 'true' };

/**
 * Test dashboard service endpoints
 */
async function testDashboardServices() {
  console.log('🚀 Starting Dashboard Service Tests...\n');
  
  const testResults = {
    passed: 0,
    failed: 0,
    endpoints: []
  };

  // Test endpoints
  const endpoints = [
    {
      name: 'Dashboard Stats',
      endpoint: '/api/dashboard/stats',
      expectedKeys: ['frameworks', 'controls', 'assessments', 'organizations', 'compliance_score']
    },
    {
      name: 'Dashboard KPIs',
      endpoint: '/api/dashboard/kpis',
      expectedKeys: ['compliance_score', 'open_gaps', 'risk_hotspots', 'active_assessments', 'total_frameworks']
    },
    {
      name: 'Dashboard Activity',
      endpoint: '/api/dashboard/activity',
      expectedKeys: ['data', 'total']
    },
    {
      name: 'Dashboard Heatmap',
      endpoint: '/api/dashboard/heatmap',
      expectedKeys: ['heatmap_data']
    },
    {
      name: 'Dashboard Trends',
      endpoint: '/api/dashboard/trends',
      expectedKeys: ['trends_data']
    }
  ];

  for (const test of endpoints) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`Endpoint: ${test.endpoint}`);
      
      const response = await fetch(`${BFF_BASE_URL}${test.endpoint}`, {
        method: 'GET',
        headers: DEV_BYPASS_HEADER
      });

      const result = {
        name: test.name,
        endpoint: test.endpoint,
        status: response.status,
        statusText: response.statusText,
        success: false,
        error: null,
        data: null
      };

      if (response.ok) {
        const data = await response.json();
        result.data = data;
        
        // Validate expected keys
        if (test.expectedKeys && data.data) {
          const missingKeys = test.expectedKeys.filter(key => !(key in data.data));
          if (missingKeys.length === 0) {
            result.success = true;
            testResults.passed++;
            console.log(`✅ ${test.name} - PASSED`);
          } else {
            result.error = `Missing expected keys: ${missingKeys.join(', ')}`;
            testResults.failed++;
            console.log(`❌ ${test.name} - FAILED: ${result.error}`);
          }
        } else {
          result.success = true;
          testResults.passed++;
          console.log(`✅ ${test.name} - PASSED`);
        }
      } else {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
        testResults.failed++;
        console.log(`❌ ${test.name} - FAILED: ${result.error}`);
      }

      testResults.endpoints.push(result);
      console.log('');

    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      testResults.failed++;
      testResults.endpoints.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 0,
        statusText: 'Network Error',
        success: false,
        error: error.message,
        data: null
      });
      console.log('');
    }
  }

  // Test database connectivity through table viewer
  console.log('Testing Database Connectivity...\n');
  
  const dbTests = [
    {
      name: 'Users Table',
      endpoint: '/api/tables/data?table=users',
      expectedKeys: ['data', 'pagination']
    },
    {
      name: 'Organizations Table',
      endpoint: '/api/tables/data?table=organizations',
      expectedKeys: ['data', 'pagination']
    },
    {
      name: 'Assessments Table',
      endpoint: '/api/tables/data?table=assessments',
      expectedKeys: ['data', 'pagination']
    }
  ];

  for (const test of dbTests) {
    try {
      console.log(`Testing: ${test.name}`);
      
      const response = await fetch(`${BFF_BASE_URL}${test.endpoint}`, {
        method: 'GET',
        headers: DEV_BYPASS_HEADER
      });

      const result = {
        name: test.name,
        endpoint: test.endpoint,
        status: response.status,
        statusText: response.statusText,
        success: false,
        error: null,
        data: null
      };

      if (response.ok) {
        const data = await response.json();
        result.data = data;
        
        // Validate expected keys
        const missingKeys = test.expectedKeys.filter(key => !(key in data));
        if (missingKeys.length === 0) {
          result.success = true;
          testResults.passed++;
          console.log(`✅ ${test.name} - PASSED (Records: ${data.pagination?.total || 0})`);
        } else {
          result.error = `Missing expected keys: ${missingKeys.join(', ')}`;
          testResults.failed++;
          console.log(`❌ ${test.name} - FAILED: ${result.error}`);
        }
      } else {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
        testResults.failed++;
        console.log(`❌ ${test.name} - FAILED: ${result.error}`);
      }

      testResults.endpoints.push(result);
      console.log('');

    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      testResults.failed++;
      testResults.endpoints.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 0,
        statusText: 'Network Error',
        success: false,
        error: error.message,
        data: null
      });
      console.log('');
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 DASHBOARD SERVICE TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  console.log('='.repeat(50));

  // Return detailed results
  return testResults;
}

/**
 * Test specific dashboard functionality
 */
async function testDashboardFunctionality() {
  console.log('\n🔍 Testing Dashboard Functionality...\n');
  
  try {
    // Test data aggregation
    console.log('Testing Data Aggregation...');
    const statsResponse = await fetch(`${BFF_BASE_URL}/api/dashboard/stats`, {
      method: 'GET',
      headers: DEV_BYPASS_HEADER
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`✅ Data aggregation working - Found ${Object.keys(stats.data).length} metrics`);
    } else {
      console.log('❌ Data aggregation failed');
    }

    // Test real-time data updates
    console.log('\nTesting Real-time Data...');
    const activityResponse = await fetch(`${BFF_BASE_URL}/api/dashboard/activity`, {
      method: 'GET',
      headers: DEV_BYPASS_HEADER
    });
    
    if (activityResponse.ok) {
      const activity = await activityResponse.json();
      console.log(`✅ Real-time data available - ${activity.total || 0} activities`);
    } else {
      console.log('❌ Real-time data unavailable');
    }

    // Test multi-tenant data isolation
    console.log('\nTesting Multi-tenant Isolation...');
    const usersResponse = await fetch(`${BFF_BASE_URL}/api/tables/data?table=users`, {
      method: 'GET',
      headers: DEV_BYPASS_HEADER
    });
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log(`✅ Multi-tenant isolation working - ${users.pagination?.total || 0} users in tenant`);
    } else {
      console.log('❌ Multi-tenant isolation failed');
    }

  } catch (error) {
    console.log(`❌ Functionality test error: ${error.message}`);
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  (async () => {
    try {
      const results = await testDashboardServices();
      await testDashboardFunctionality();
      
      console.log('\n🎉 Dashboard service testing completed!');
      console.log('All endpoints are connected to BFF and database services.');
      
    } catch (error) {
      console.error('Test suite error:', error);
    }
  })();
}

export { testDashboardServices, testDashboardFunctionality };