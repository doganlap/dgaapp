/**
 * Cross-Database API Routes
 * Handles operations that span across compliance, finance, and auth databases
 */

const express = require('express');
const router = express.Router();
const crossDbOps = require('../services/crossDatabaseOperations');
const { dbQueries } = require('../config/database');

// Middleware for basic request logging
router.use((req, res, next) => {
    console.log(`[CROSS-DB] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

/**
 * Health check for all databases
 */
router.get('/health', async (req, res) => {
    try {
        const health = await crossDbOps.healthCheck();
        
        const allHealthy = Object.values(health).every(db => db.status === 'healthy');
        
        res.status(allHealthy ? 200 : 503).json({
            success: allHealthy,
            timestamp: new Date().toISOString(),
            databases: health,
            summary: {
                total: Object.keys(health).length,
                healthy: Object.values(health).filter(db => db.status === 'healthy').length,
                errors: Object.values(health).filter(db => db.status === 'error').length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            message: error.message
        });
    }
});

/**
 * Get user with full profile from all databases
 */
router.get('/users/:userId/profile', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const profile = await crossDbOps.getUserWithFullProfile(userId);
        
        res.json({
            success: true,
            data: profile,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(error.message === 'User not found' ? 404 : 500).json({
            success: false,
            error: 'Failed to get user profile',
            message: error.message
        });
    }
});

/**
 * Create assessment with authentication and audit logging
 */
router.post('/assessments', async (req, res) => {
    try {
        const { name, description, assessment_type, priority } = req.body;
        const userId = req.headers['x-user-id'] || req.body.user_id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Assessment name is required'
            });
        }

        const assessmentData = {
            name,
            description,
            assessment_type,
            priority
        };

        const assessment = await crossDbOps.createAssessmentWithAuth(assessmentData, userId);
        
        res.status(201).json({
            success: true,
            data: assessment,
            message: 'Assessment created successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating assessment:', error);
        const statusCode = error.message.includes('permission') ? 403 : 
                          error.message.includes('not found') ? 404 : 500;
        
        res.status(statusCode).json({
            success: false,
            error: 'Failed to create assessment',
            message: error.message
        });
    }
});

/**
 * Get tenant summary with compliance and finance data
 */
router.get('/tenants/:tenantId/summary', async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID is required'
            });
        }

        const summary = await crossDbOps.getTenantSummary(tenantId);
        
        res.json({
            success: true,
            data: summary,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting tenant summary:', error);
        res.status(error.message === 'Tenant not found' ? 404 : 500).json({
            success: false,
            error: 'Failed to get tenant summary',
            message: error.message
        });
    }
});

/**
 * Authenticate user
 */
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const authResult = await crossDbOps.authenticateUser(email, password);
        
        res.json({
            success: true,
            data: authResult,
            message: 'Authentication successful',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: error.message
        });
    }
});

/**
 * Get database statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const [complianceStats, financeStats, authStats] = await Promise.all([
            // Compliance database stats
            dbQueries.compliance.query(`
                SELECT 
                    'compliance' as database,
                    COUNT(DISTINCT assessments.id) as total_assessments,
                    COUNT(DISTINCT frameworks.id) as total_frameworks,
                    COUNT(CASE WHEN assessments.status = 'completed' THEN 1 END) as completed_assessments
                FROM assessments
                FULL OUTER JOIN frameworks ON true
            `),
            
            // Finance database stats
            dbQueries.finance.query(`
                SELECT 
                    'finance' as database,
                    COUNT(DISTINCT tenants.id) as total_tenants,
                    COUNT(DISTINCT tenant_licenses.id) as total_licenses,
                    COUNT(DISTINCT subscriptions.id) as total_subscriptions
                FROM tenants
                FULL OUTER JOIN tenant_licenses ON tenants.id = tenant_licenses.tenant_id
                FULL OUTER JOIN subscriptions ON tenants.id = subscriptions.tenant_id
            `),
            
            // Auth database stats
            dbQueries.auth.query(`
                SELECT 
                    'auth' as database,
                    COUNT(DISTINCT users.id) as total_users,
                    COUNT(DISTINCT roles.id) as total_roles,
                    COUNT(DISTINCT permissions.id) as total_permissions,
                    COUNT(DISTINCT user_sessions.id) as active_sessions
                FROM users
                FULL OUTER JOIN roles ON true
                FULL OUTER JOIN permissions ON true
                FULL OUTER JOIN user_sessions ON users.id = user_sessions.user_id 
                    AND user_sessions.expires_at > NOW()
            `)
        ]);

        res.json({
            success: true,
            data: {
                compliance: complianceStats.rows[0] || {},
                finance: financeStats.rows[0] || {},
                auth: authStats.rows[0] || {}
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting database stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get database statistics',
            message: error.message
        });
    }
});

/**
 * Test cross-database operations
 */
router.get('/test', async (req, res) => {
    try {
        const tests = [];
        
        // Test 1: Check all database connections
        try {
            const health = await crossDbOps.healthCheck();
            tests.push({
                name: 'Database Connections',
                status: Object.values(health).every(db => db.status === 'healthy') ? 'PASS' : 'FAIL',
                details: health
            });
        } catch (error) {
            tests.push({
                name: 'Database Connections',
                status: 'FAIL',
                error: error.message
            });
        }

        // Test 2: Query each database
        const dbTests = [];
        for (const dbType of ['compliance', 'finance', 'auth']) {
            try {
                const result = await dbQueries[dbType].query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'');
                dbTests.push({
                    database: dbType,
                    status: 'PASS',
                    tables: result.rows[0].table_count
                });
            } catch (error) {
                dbTests.push({
                    database: dbType,
                    status: 'FAIL',
                    error: error.message
                });
            }
        }
        
        tests.push({
            name: 'Database Queries',
            status: dbTests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
            details: dbTests
        });

        const allPassed = tests.every(t => t.status === 'PASS');
        
        res.json({
            success: allPassed,
            message: allPassed ? 'All tests passed' : 'Some tests failed',
            tests,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Test execution failed',
            message: error.message
        });
    }
});

module.exports = router;
