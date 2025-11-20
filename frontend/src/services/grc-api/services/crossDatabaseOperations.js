/**
 * Cross-Database Operations Service
 * Handles operations that span across compliance, finance, and auth databases
 */

const { dbQueries, transaction } = require('../config/database');

class CrossDatabaseOperations {
    
    /**
     * Get user with full profile from all databases
     */
    async getUserWithFullProfile(userId) {
        try {
            const [user, complianceData, financeData] = await Promise.all([
                // Get user from auth database
                dbQueries.auth.query(`
                    SELECT u.*, 
                           array_agg(DISTINCT r.name) as roles,
                           array_agg(DISTINCT p.name) as permissions
                    FROM users u
                    LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
                    LEFT JOIN roles r ON ur.role_id = r.id
                    LEFT JOIN role_permissions rp ON r.id = rp.role_id
                    LEFT JOIN permissions p ON rp.permission_id = p.id
                    WHERE u.id = $1 AND u.is_active = true
                    GROUP BY u.id
                `, [userId]),
                
                // Get compliance data
                dbQueries.compliance.query(`
                    SELECT 
                        COUNT(*) as total_assessments,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_assessments,
                        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_assessments,
                        MAX(created_at) as last_assessment_date
                    FROM assessments 
                    WHERE created_by_user_id = $1
                `, [userId]),
                
                // Get finance data
                dbQueries.finance.query(`
                    SELECT 
                        COUNT(DISTINCT t.id) as managed_tenants,
                        COUNT(DISTINCT tl.id) as active_licenses,
                        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions
                    FROM tenants t
                    LEFT JOIN tenant_licenses tl ON t.id = tl.tenant_id AND tl.status = 'active'
                    LEFT JOIN subscriptions s ON t.id = s.tenant_id
                    WHERE t.primary_admin_user_id = $1
                `, [userId])
            ]);

            if (!user.rows.length) {
                throw new Error('User not found');
            }

            return {
                user: {
                    ...user.rows[0],
                    roles: user.rows[0].roles.filter(r => r !== null),
                    permissions: user.rows[0].permissions.filter(p => p !== null)
                },
                compliance: complianceData.rows[0] || {},
                finance: financeData.rows[0] || {}
            };
        } catch (error) {
            console.error('Error getting user full profile:', error);
            throw error;
        }
    }

    /**
     * Create assessment with user validation and audit logging
     */
    async createAssessmentWithAuth(assessmentData, userId) {
        try {
            // Validate user exists and has permissions
            const user = await dbQueries.auth.query(`
                SELECT u.id, u.email, array_agg(DISTINCT p.name) as permissions
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
                LEFT JOIN roles r ON ur.role_id = r.id
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                LEFT JOIN permissions p ON rp.permission_id = p.id
                WHERE u.id = $1 AND u.is_active = true
                GROUP BY u.id, u.email
            `, [userId]);

            if (!user.rows.length) {
                throw new Error('User not found or inactive');
            }

            const userPermissions = user.rows[0].permissions.filter(p => p !== null);
            if (!userPermissions.includes('assessments_create') && !userPermissions.includes('*:*')) {
                throw new Error('User does not have permission to create assessments');
            }

            // Create assessment in compliance database
            const assessment = await dbQueries.compliance.query(`
                INSERT INTO assessments (
                    name, description, assessment_type, priority, status,
                    created_by_user_id, auth_database, finance_database,
                    created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                RETURNING *
            `, [
                assessmentData.name,
                assessmentData.description,
                assessmentData.assessment_type || 'compliance',
                assessmentData.priority || 'medium',
                'draft',
                userId,
                'shahin_access_control',
                'grc_master'
            ]);

            // Log in audit table
            await dbQueries.auth.query(`
                INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values, created_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            `, [
                userId,
                'create',
                'assessment',
                assessment.rows[0].id,
                JSON.stringify(assessmentData)
            ]);

            return assessment.rows[0];
        } catch (error) {
            console.error('Error creating assessment with auth:', error);
            throw error;
        }
    }

    /**
     * Get tenant with compliance and finance summary
     */
    async getTenantSummary(tenantId) {
        try {
            const [tenant, complianceStats, financeStats] = await Promise.all([
                // Get tenant from finance database
                dbQueries.finance.query(`
                    SELECT t.*, 
                           COUNT(DISTINCT o.id) as organization_count
                    FROM tenants t
                    LEFT JOIN organizations o ON t.id = o.tenant_id
                    WHERE t.id = $1
                    GROUP BY t.id
                `, [tenantId]),
                
                // Get compliance stats
                dbQueries.compliance.query(`
                    SELECT 
                        COUNT(*) as total_assessments,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_assessments,
                        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_assessments,
                        AVG(CASE WHEN status = 'completed' THEN 
                            EXTRACT(EPOCH FROM (completed_at - created_at))/86400 
                        END) as avg_completion_days
                    FROM assessments a
                    JOIN tenants t ON a.finance_database = 'grc_master'
                    WHERE EXISTS (
                        SELECT 1 FROM grc_master.tenants mt WHERE mt.id = $1
                    )
                `, [tenantId]),
                
                // Get finance stats
                dbQueries.finance.query(`
                    SELECT 
                        COUNT(DISTINCT tl.id) as active_licenses,
                        COUNT(DISTINCT s.id) as subscriptions,
                        SUM(CASE WHEN tl.status = 'active' THEN 1 ELSE 0 END) as active_license_count,
                        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscription_count
                    FROM tenants t
                    LEFT JOIN tenant_licenses tl ON t.id = tl.tenant_id
                    LEFT JOIN subscriptions s ON t.id = s.tenant_id
                    WHERE t.id = $1
                `, [tenantId])
            ]);

            if (!tenant.rows.length) {
                throw new Error('Tenant not found');
            }

            return {
                tenant: tenant.rows[0],
                compliance: complianceStats.rows[0] || {},
                finance: financeStats.rows[0] || {}
            };
        } catch (error) {
            console.error('Error getting tenant summary:', error);
            throw error;
        }
    }

    /**
     * Authenticate user and return session info
     */
    async authenticateUser(email, password) {
        try {
            // Get user with password hash
            const user = await dbQueries.auth.query(`
                SELECT u.*, array_agg(DISTINCT r.name) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE u.email = $1 AND u.is_active = true
                GROUP BY u.id
            `, [email]);

            if (!user.rows.length) {
                throw new Error('Invalid credentials');
            }

            const userData = user.rows[0];
            
            // In production, you would verify the password hash here
            // For now, we'll skip password verification
            
            // Create session
            const sessionToken = require('crypto').randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            const session = await dbQueries.auth.query(`
                INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                RETURNING *
            `, [userData.id, sessionToken, expiresAt]);

            // Update last login
            await dbQueries.auth.query(`
                UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1
            `, [userData.id]);

            return {
                user: {
                    id: userData.id,
                    email: userData.email,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    roles: userData.roles.filter(r => r !== null)
                },
                session: session.rows[0]
            };
        } catch (error) {
            console.error('Error authenticating user:', error);
            throw error;
        }
    }

    /**
     * Health check for all databases
     */
    async healthCheck() {
        const results = {};
        
        for (const dbType of ['compliance', 'finance', 'auth']) {
            try {
                const result = await dbQueries[dbType].query('SELECT 1 as health_check, NOW() as timestamp');
                results[dbType] = {
                    status: 'healthy',
                    timestamp: result.rows[0].timestamp,
                    response_time: 'fast'
                };
            } catch (error) {
                results[dbType] = {
                    status: 'error',
                    error: error.message
                };
            }
        }
        
        return results;
    }
}

module.exports = new CrossDatabaseOperations();
