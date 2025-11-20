const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const microsoftAuthService = require('../services/microsoftAuth');
const router = express.Router();

/**
 * GET /api/microsoft-auth/login/:tenantId
 * Initiate Microsoft authentication for a tenant
 */
router.get('/login/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { redirect_uri } = req.query;

    // Validate tenant exists and has Microsoft auth enabled
    const tenantResult = await query(`
      SELECT id, name, microsoft_auth_enabled, microsoft_domain
      FROM tenants 
      WHERE id = $1 AND microsoft_auth_enabled = true AND is_active = true
    `, [tenantId]);

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found or Microsoft authentication not enabled',
        message: 'This organization does not support Microsoft authentication'
      });
    }

    const tenant = tenantResult.rows[0];
    const defaultRedirectUri = `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/microsoft-auth/callback/${tenantId}`;
    const redirectUri = redirect_uri || defaultRedirectUri;
    
    // Generate state parameter for security
    const state = Buffer.from(JSON.stringify({
      tenantId,
      redirectUri: redirect_uri,
      timestamp: Date.now()
    })).toString('base64');

    // Get Microsoft login URL
    const loginUrl = await microsoftAuthService.getMicrosoftLoginUrl(
      tenantId, 
      redirectUri, 
      state
    );

    res.json({
      success: true,
      data: {
        loginUrl,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.microsoft_domain
        },
        redirectUri
      }
    });

  } catch (error) {
    console.error('Microsoft login initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate Microsoft login',
      message: error.message
    });
  }
});

/**
 * GET /api/microsoft-auth/callback/:tenantId
 * Handle Microsoft authentication callback
 */
router.get('/callback/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { code, state, error, error_description } = req.query;

    // Handle Microsoft auth errors
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Microsoft authentication failed',
        message: error_description || error,
        details: { error, error_description }
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code',
        message: 'No authorization code received from Microsoft'
      });
    }

    // Validate state parameter
    let stateData = {};
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        
        // Check if state is recent (within 10 minutes)
        if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
          return res.status(400).json({
            success: false,
            error: 'Invalid state parameter',
            message: 'Authentication request has expired'
          });
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid state parameter',
          message: 'State parameter is malformed'
        });
      }
    }

    const redirectUri = `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/microsoft-auth/callback/${tenantId}`;
    
    // Handle Microsoft callback
    const authResult = await microsoftAuthService.handleMicrosoftCallback(
      tenantId, 
      code, 
      redirectUri
    );

    // If there's a custom redirect URI in state, redirect there
    if (stateData.redirectUri) {
      const redirectUrl = new URL(stateData.redirectUri);
      redirectUrl.searchParams.set('token', authResult.token);
      redirectUrl.searchParams.set('user_id', authResult.user.id);
      redirectUrl.searchParams.set('success', 'true');
      
      return res.redirect(redirectUrl.toString());
    }

    // Default response
    res.json({
      success: true,
      message: 'Microsoft authentication successful',
      data: {
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          first_name: authResult.user.first_name,
          last_name: authResult.user.last_name,
          role: authResult.user.role,
          tenant_id: authResult.user.tenant_id,
          auth_provider: 'microsoft'
        },
        token: authResult.token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Microsoft callback error:', error);
    
    // If there's a custom redirect URI, redirect with error
    if (req.query.state) {
      try {
        const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        if (stateData.redirectUri) {
          const redirectUrl = new URL(stateData.redirectUri);
          redirectUrl.searchParams.set('error', 'authentication_failed');
          redirectUrl.searchParams.set('message', error.message);
          
          return res.redirect(redirectUrl.toString());
        }
      } catch (e) {
        // Ignore state parsing errors
      }
    }

    res.status(500).json({
      success: false,
      error: 'Microsoft authentication failed',
      message: error.message
    });
  }
});

/**
 * POST /api/microsoft-auth/configure/:tenantId
 * Configure Microsoft authentication for a tenant (Admin only)
 */
router.post('/configure/:tenantId', authenticateToken, requirePermission('tenants:update'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      microsoft_tenant_id,
      microsoft_client_id,
      microsoft_client_secret,
      microsoft_domain,
      microsoft_auto_provision = true,
      microsoft_default_role = 'user',
      microsoft_auth_enabled = true
    } = req.body;

    // Validate required fields
    if (!microsoft_tenant_id || !microsoft_client_id || !microsoft_client_secret) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Microsoft Tenant ID, Client ID, and Client Secret are required'
      });
    }

    // Check if user has access to this tenant
    if (req.user.role !== 'super_admin' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only configure Microsoft authentication for your own tenant'
      });
    }

    // Update tenant Microsoft configuration
    const result = await query(`
      UPDATE tenants SET
        microsoft_auth_enabled = $1,
        microsoft_tenant_id = $2,
        microsoft_client_id = $3,
        microsoft_client_secret = $4,
        microsoft_domain = $5,
        microsoft_auto_provision = $6,
        microsoft_default_role = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, name, microsoft_auth_enabled, microsoft_domain, microsoft_auto_provision, microsoft_default_role
    `, [
      microsoft_auth_enabled,
      microsoft_tenant_id,
      microsoft_client_id,
      microsoft_client_secret,
      microsoft_domain,
      microsoft_auto_provision,
      microsoft_default_role,
      tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'Microsoft authentication configured successfully',
      data: {
        tenant: result.rows[0],
        loginUrl: `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/microsoft-auth/login/${tenantId}`
      }
    });

  } catch (error) {
    console.error('Microsoft configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure Microsoft authentication',
      message: error.message
    });
  }
});

/**
 * GET /api/microsoft-auth/config/:tenantId
 * Get Microsoft authentication configuration for a tenant
 */
router.get('/config/:tenantId', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Check if user has access to this tenant
    if (req.user.role !== 'super_admin' && req.user.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await query(`
      SELECT 
        id, name, microsoft_auth_enabled, microsoft_domain,
        microsoft_auto_provision, microsoft_default_role,
        microsoft_client_id, microsoft_tenant_id
      FROM tenants 
      WHERE id = $1
    `, [tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    const config = result.rows[0];
    
    // Don't expose client secret
    delete config.microsoft_client_secret;

    res.json({
      success: true,
      data: {
        ...config,
        loginUrl: config.microsoft_auth_enabled 
          ? `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/microsoft-auth/login/${tenantId}`
          : null
      }
    });

  } catch (error) {
    console.error('Get Microsoft config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Microsoft configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/microsoft-auth/refresh-token
 * Refresh Microsoft access token
 */
router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const accessToken = await microsoftAuthService.refreshMicrosoftToken(userId);

    res.json({
      success: true,
      data: {
        accessToken,
        tokenType: 'Bearer'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

/**
 * GET /api/microsoft-auth/status/:tenantId
 * Check Microsoft authentication status for a tenant (public endpoint)
 */
router.get('/status/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const result = await query(`
      SELECT 
        id, name, microsoft_auth_enabled, microsoft_domain
      FROM tenants 
      WHERE id = $1 AND is_active = true
    `, [tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    const tenant = result.rows[0];

    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        microsoftAuthEnabled: tenant.microsoft_auth_enabled,
        microsoftDomain: tenant.microsoft_domain,
        loginUrl: tenant.microsoft_auth_enabled 
          ? `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/microsoft-auth/login/${tenantId}`
          : null
      }
    });

  } catch (error) {
    console.error('Microsoft status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Microsoft authentication status',
      message: error.message
    });
  }
});

module.exports = router;
