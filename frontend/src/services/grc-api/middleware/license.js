/**
 * License Enforcement Middleware
 * Checks if tenant has valid license and entitlement for requested feature
 */

const { query } = require('../config/database');

/**
 * Middleware to check license entitlement for a feature
 * @param {string} featureCode - The feature code to check (e.g., 'FRAMEWORKS', 'ASSESSMENTS')
 */
function requireLicense(featureCode) {
  return async (req, res, next) => {
    try {
      // Extract tenant_id from request
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] || req.query.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Tenant ID is required',
          code: 'NO_TENANT_ID'
        });
      }
      
      // Check license entitlement
      const { rows } = await query(`
        SELECT check_license_entitlement($1::uuid, $2::varchar) as result
      `, [tenantId, featureCode]);
      
      const result = rows[0]?.result || {};
      
      // Not licensed
      if (!result.licensed) {
        return res.status(402).json({
          error: 'Payment Required',
          message: `Feature "${featureCode}" requires an active license`,
          feature_code: featureCode,
          licensed: false,
          upgrade_url: '/platform/licenses/upgrade',
          code: 'UNLICENSED'
        });
      }
      
      // License expired
      if (new Date(result.end_date) < new Date()) {
        return res.status(402).json({
          error: 'License Expired',
          message: 'Your license has expired. Please renew to continue.',
          feature_code: featureCode,
          expired: true,
          end_date: result.end_date,
          renewal_url: '/platform/licenses/renew',
          code: 'LICENSE_EXPIRED'
        });
      }
      
      // License suspended
      if (result.status === 'suspended') {
        return res.status(403).json({
          error: 'License Suspended',
          message: 'Your license has been suspended. Please contact support.',
          feature_code: featureCode,
          suspended: true,
          code: 'LICENSE_SUSPENDED'
        });
      }
      
      // Valid license - attach license info to request
      req.license = {
        feature_code: featureCode,
        licensed: true,
        license_name: result.license_name,
        status: result.status,
        end_date: result.end_date,
        tenant_id: tenantId
      };
      
      next();
    } catch (error) {
      console.error('License check error:', error);
      
      // Fail-open or fail-closed based on environment
      const strictMode = process.env.LICENSE_ENFORCEMENT_MODE === 'strict';
      
      if (strictMode) {
        return res.status(500).json({
          error: 'License Check Failed',
          message: 'Unable to verify license. Please try again.',
          code: 'LICENSE_CHECK_FAILED'
        });
      }
      
      // In non-strict mode, allow access but log error
      console.warn(`License check failed for feature ${featureCode}, allowing access (non-strict mode)`);
      req.license = { fallback: true, error: error.message };
      next();
    }
  };
}

/**
 * Middleware to check usage limits
 * @param {string} usageType - The usage type to check (e.g., 'USERS', 'STORAGE', 'API_CALLS')
 */
function checkUsageLimit(usageType) {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] || req.query.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Tenant ID is required'
        });
      }
      
      // Check usage limit
      const { rows } = await query(`
        SELECT check_usage_limit($1::uuid, $2::varchar) as result
      `, [tenantId, usageType]);
      
      const result = rows[0]?.result || {};
      
      // Over limit
      if (result.is_over_limit) {
        return res.status(429).json({
          error: 'Usage Limit Exceeded',
          message: `${usageType} limit has been exceeded`,
          usage_type: usageType,
          used: result.used_value,
          limit: result.limit_value,
          percentage: result.percentage_used,
          upgrade_url: '/platform/licenses/upgrade',
          code: 'USAGE_LIMIT_EXCEEDED'
        });
      }
      
      // Approaching limit (warning at 80%)
      if (result.percentage_used >= 80) {
        // Add warning header but allow request
        res.setHeader('X-Usage-Warning', `Approaching ${usageType} limit (${result.percentage_used}%)`);
        res.setHeader('X-Usage-Used', result.used_value);
        res.setHeader('X-Usage-Limit', result.limit_value);
      }
      
      // Attach usage info to request
      req.usage = {
        usage_type: usageType,
        used: result.used_value,
        limit: result.limit_value,
        percentage: result.percentage_used
      };
      
      next();
    } catch (error) {
      console.error('Usage check error:', error);
      
      // Fail-open in case of error (log but allow)
      console.warn(`Usage check failed for ${usageType}, allowing access`);
      req.usage = { fallback: true, error: error.message };
      next();
    }
  };
}

/**
 * Middleware to track API usage
 * Increments API call counter for tenant
 */
async function trackAPIUsage(req, res, next) {
  try {
    const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return next(); // Skip tracking if no tenant
    }
    
    // Track in background (don't block request)
    setImmediate(async () => {
      try {
        await query(`
          -- Track API call
          WITH active_license AS (
            SELECT id, license_id FROM tenant_licenses
            WHERE tenant_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
            LIMIT 1
          ),
          feature AS (
            SELECT id FROM license_features WHERE feature_code = 'API_CALLS'
          )
          INSERT INTO tenant_license_usage (
            tenant_license_id, feature_id, period_start, period_end,
            usage_type, used_value, limit_value
          )
          SELECT 
            al.id,
            f.id,
            DATE_TRUNC('month', CURRENT_DATE),
            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date,
            'API_CALLS',
            1,
            (SELECT limit_value FROM license_feature_map 
             WHERE feature_id = f.id AND license_id = al.license_id)
          FROM active_license al, feature f
          ON CONFLICT (tenant_license_id, feature_id, period_start)
          DO UPDATE SET used_value = tenant_license_usage.used_value + 1
        `, [tenantId]);
      } catch (error) {
        console.error('API usage tracking error:', error);
      }
    });
    
    next();
  } catch (error) {
    console.error('API usage middleware error:', error);
    next(); // Don't block request
  }
}

/**
 * Middleware to log license check attempts (for audit)
 */
async function auditLicenseAccess(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.json = function(body) {
    // Log denied access attempts
    if (res.statusCode === 402 || res.statusCode === 403) {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'];
      const featureCode = req.license?.feature_code || 'UNKNOWN';
      
      console.log('[License Audit] Access Denied:', {
        tenant_id: tenantId,
        feature_code: featureCode,
        status_code: res.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        user_agent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      });
    }
    
    return originalJson(body);
  };
  
  next();
}

module.exports = {
  requireLicense,
  checkUsageLimit,
  trackAPIUsage,
  auditLicenseAccess
};
