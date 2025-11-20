const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');
const { query, transaction } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Microsoft Authentication Service
 * Handles Azure AD/Entra ID integration for tenant-level SSO
 */

class MicrosoftAuthService {
  constructor() {
    this.msalInstances = new Map(); // Cache MSAL instances per tenant
  }

  /**
   * Get or create MSAL instance for a tenant
   */
  async getMsalInstance(tenantId) {
    if (this.msalInstances.has(tenantId)) {
      return this.msalInstances.get(tenantId);
    }

    // Get tenant Microsoft configuration
    const configResult = await query(`
      SELECT microsoft_tenant_id, microsoft_client_id, microsoft_client_secret
      FROM tenants 
      WHERE id = $1 AND microsoft_auth_enabled = true
    `, [tenantId]);

    if (configResult.rows.length === 0) {
      throw new Error('Microsoft authentication not configured for this tenant');
    }

    const config = configResult.rows[0];
    
    const msalConfig = {
      auth: {
        clientId: config.microsoft_client_id,
        clientSecret: config.microsoft_client_secret,
        authority: `https://login.microsoftonline.com/${config.microsoft_tenant_id}`
      }
    };

    const msalInstance = new ConfidentialClientApplication(msalConfig);
    this.msalInstances.set(tenantId, msalInstance);
    
    return msalInstance;
  }

  /**
   * Get Microsoft login URL for a tenant
   */
  async getMicrosoftLoginUrl(tenantId, redirectUri, state = null) {
    try {
      const msalInstance = await this.getMsalInstance(tenantId);
      
      const authCodeUrlParameters = {
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        redirectUri: redirectUri,
        state: state
      };

      const authUrl = await msalInstance.getAuthCodeUrl(authCodeUrlParameters);
      return authUrl;
    } catch (error) {
      console.error('Error generating Microsoft login URL:', error);
      throw error;
    }
  }

  /**
   * Handle Microsoft callback and authenticate user
   */
  async handleMicrosoftCallback(tenantId, code, redirectUri) {
    try {
      const msalInstance = await this.getMsalInstance(tenantId);
      
      // Exchange code for tokens
      const tokenRequest = {
        code: code,
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        redirectUri: redirectUri
      };

      const response = await msalInstance.acquireTokenByCode(tokenRequest);
      
      // Get user profile from Microsoft Graph
      const userProfile = await this.getMicrosoftUserProfile(response.accessToken);
      
      // Find or create user
      const user = await this.findOrCreateMicrosoftUser(tenantId, userProfile, response);
      
      // Generate JWT token
      const jwtToken = generateToken(user);
      
      return {
        user,
        token: jwtToken,
        microsoftTokens: {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresOn: response.expiresOn
        }
      };
    } catch (error) {
      console.error('Error handling Microsoft callback:', error);
      throw error;
    }
  }

  /**
   * Get user profile from Microsoft Graph API
   */
  async getMicrosoftUserProfile(accessToken) {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Microsoft user profile:', error);
      throw error;
    }
  }

  /**
   * Find existing user or create new one from Microsoft profile
   */
  async findOrCreateMicrosoftUser(tenantId, microsoftProfile, tokens) {
    return await transaction(async (client) => {
      // Check if user exists by Microsoft ID
      let userResult = await client.query(`
        SELECT * FROM users 
        WHERE microsoft_id = $1 AND tenant_id = $2
      `, [microsoftProfile.id, tenantId]);

      let user;

      if (userResult.rows.length > 0) {
        // Update existing user
        user = userResult.rows[0];
        
        await client.query(`
          UPDATE users SET
            email = $1,
            microsoft_email = $2,
            first_name = $3,
            last_name = $4,
            last_microsoft_sync = CURRENT_TIMESTAMP,
            last_login = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [
          microsoftProfile.mail || microsoftProfile.userPrincipalName,
          microsoftProfile.mail || microsoftProfile.userPrincipalName,
          microsoftProfile.givenName,
          microsoftProfile.surname,
          user.id
        ]);

      } else {
        // Check if user exists by email
        const emailResult = await client.query(`
          SELECT * FROM users 
          WHERE email = $1 AND tenant_id = $2
        `, [microsoftProfile.mail || microsoftProfile.userPrincipalName, tenantId]);

        if (emailResult.rows.length > 0) {
          // Link existing user to Microsoft
          user = emailResult.rows[0];
          
          await client.query(`
            UPDATE users SET
              microsoft_id = $1,
              microsoft_email = $2,
              auth_provider = 'microsoft',
              last_microsoft_sync = CURRENT_TIMESTAMP,
              last_login = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [microsoftProfile.id, microsoftProfile.mail || microsoftProfile.userPrincipalName, user.id]);

        } else {
          // Get tenant configuration for auto-provisioning
          const tenantConfig = await client.query(`
            SELECT microsoft_auto_provision, microsoft_default_role
            FROM tenants WHERE id = $1
          `, [tenantId]);

          if (!tenantConfig.rows[0]?.microsoft_auto_provision) {
            throw new Error('User not found and auto-provisioning is disabled');
          }

          // Create new user
          const newUserResult = await client.query(`
            INSERT INTO users (
              id, email, microsoft_id, microsoft_email, first_name, last_name,
              role, tenant_id, auth_provider, status, password_hash,
              last_microsoft_sync, last_login, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
          `, [
            uuidv4(),
            microsoftProfile.mail || microsoftProfile.userPrincipalName,
            microsoftProfile.id,
            microsoftProfile.mail || microsoftProfile.userPrincipalName,
            microsoftProfile.givenName,
            microsoftProfile.surname,
            tenantConfig.rows[0].microsoft_default_role,
            tenantId,
            'microsoft',
            'active',
            await bcrypt.hash(uuidv4(), 12) // Random password for Microsoft users
          ]);

          user = newUserResult.rows[0];

          // Assign default role
          const roleResult = await client.query(`
            SELECT id FROM roles 
            WHERE name = $1 AND (tenant_id = $2 OR is_system_role = true) 
            LIMIT 1
          `, [user.role, tenantId]);

          if (roleResult.rows.length > 0) {
            await client.query(`
              INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
              VALUES ($1, $2, $3, true)
            `, [user.id, roleResult.rows[0].id, user.id]);
          }
        }
      }

      // Store/update Microsoft tokens
      await client.query(`
        INSERT INTO user_auth_tokens (
          user_id, provider, access_token, refresh_token, 
          expires_at, scope, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, provider) 
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          scope = EXCLUDED.scope,
          updated_at = CURRENT_TIMESTAMP
      `, [
        user.id,
        'microsoft',
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresOn,
        'openid profile email User.Read'
      ]);

      return user;
    });
  }

  /**
   * Check if tenant requires Microsoft authentication
   */
  async tenantRequiresMicrosoftAuth(tenantId) {
    const result = await query(`
      SELECT microsoft_auth_enabled FROM tenants WHERE id = $1
    `, [tenantId]);
    
    return result.rows[0]?.microsoft_auth_enabled || false;
  }

  /**
   * Get tenant Microsoft configuration
   */
  async getTenantMicrosoftConfig(tenantId) {
    const result = await query(`
      SELECT 
        microsoft_tenant_id,
        microsoft_client_id,
        microsoft_domain,
        microsoft_auto_provision,
        microsoft_default_role
      FROM tenants 
      WHERE id = $1 AND microsoft_auth_enabled = true
    `, [tenantId]);
    
    return result.rows[0] || null;
  }

  /**
   * Refresh Microsoft access token
   */
  async refreshMicrosoftToken(userId) {
    try {
      // Get stored refresh token
      const tokenResult = await query(`
        SELECT t.refresh_token, u.tenant_id
        FROM user_auth_tokens t
        JOIN users u ON t.user_id = u.id
        WHERE t.user_id = $1 AND t.provider = 'microsoft'
      `, [userId]);

      if (tokenResult.rows.length === 0) {
        throw new Error('No Microsoft refresh token found');
      }

      const { refresh_token, tenant_id } = tokenResult.rows[0];
      const msalInstance = await this.getMsalInstance(tenant_id);

      const refreshRequest = {
        refreshToken: refresh_token,
        scopes: ['openid', 'profile', 'email', 'User.Read']
      };

      const response = await msalInstance.acquireTokenByRefreshToken(refreshRequest);

      // Update stored tokens
      await query(`
        UPDATE user_auth_tokens SET
          access_token = $1,
          refresh_token = $2,
          expires_at = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4 AND provider = 'microsoft'
      `, [response.accessToken, response.refreshToken, response.expiresOn, userId]);

      return response.accessToken;
    } catch (error) {
      console.error('Error refreshing Microsoft token:', error);
      throw error;
    }
  }
}

module.exports = new MicrosoftAuthService();
