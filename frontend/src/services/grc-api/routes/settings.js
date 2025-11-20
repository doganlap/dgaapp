const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Default feature flags
const DEFAULT_FEATURE_FLAGS = {
  'risk.matrix': true,
  'evidence.ocr': true,
  'workflow.builder': true,
  'ai.agents': false,
  'billing': false,
  'notifications.realtime': true,
  'hijri.calendar': true,
  'export.excel': true,
  'multi.tenant': true,
  'partner.collaboration': true,
  'document.processing': true,
  'compliance.reporting': true,
  'assessment.templates': true,
  'framework.import': true,
  'sector.intelligence': true,
  'advanced.analytics': false,
  'api.access': true,
  'mobile.app': false
};

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'en',
  timezone: 'UTC',
  date_format: 'YYYY-MM-DD',
  currency: 'USD',
  notifications: {
    email: true,
    sms: false,
    push: true,
    assessment_reminders: true,
    compliance_alerts: true,
    system_updates: false
  },
  security: {
    session_timeout: 30,
    password_expiry: 90,
    two_factor_required: false,
    ip_whitelist_enabled: false
  },
  compliance: {
    auto_archive_completed: true,
    evidence_retention_days: 2555, // 7 years
    assessment_reminder_days: 7,
    framework_auto_update: true
  }
};

/**
 * GET /api/settings/feature-flags
 * Get feature flags for the tenant
 */
router.get('/feature-flags', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.json({
        success: true,
        data: { flags: DEFAULT_FEATURE_FLAGS }
      });
    }

    // Get tenant-specific feature flags
    const result = await query(`
      SELECT feature_flags 
      FROM tenants 
      WHERE id = $1
    `, [tenantId]);

    let flags = DEFAULT_FEATURE_FLAGS;
    
    if (result.rows.length > 0 && result.rows[0].feature_flags) {
      // Merge tenant-specific flags with defaults
      flags = {
        ...DEFAULT_FEATURE_FLAGS,
        ...result.rows[0].feature_flags
      };
    }

    res.json({
      success: true,
      data: { flags }
    });
  } catch (error) {
    console.error('[Settings] Feature flags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags',
      message: error.message
    });
  }
});

/**
 * PUT /api/settings/feature-flags
 * Update feature flags for the tenant
 */
router.put('/feature-flags', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { flags } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'X-Tenant-ID header is required'
      });
    }

    if (!flags || typeof flags !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid flags',
        message: 'Flags must be an object'
      });
    }

    // Get current flags
    const currentResult = await query(`
      SELECT feature_flags 
      FROM tenants 
      WHERE id = $1
    `, [tenantId]);

    let currentFlags = DEFAULT_FEATURE_FLAGS;
    if (currentResult.rows.length > 0 && currentResult.rows[0].feature_flags) {
      currentFlags = {
        ...DEFAULT_FEATURE_FLAGS,
        ...currentResult.rows[0].feature_flags
      };
    }

    // Merge with new flags
    const updatedFlags = {
      ...currentFlags,
      ...flags
    };

    // Update in database
    await query(`
      UPDATE tenants 
      SET 
        feature_flags = $2,
        updated_at = NOW()
      WHERE id = $1
    `, [tenantId, JSON.stringify(updatedFlags)]);

    res.json({
      success: true,
      data: { flags: updatedFlags },
      message: 'Feature flags updated successfully'
    });
  } catch (error) {
    console.error('[Settings] Update feature flags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flags',
      message: error.message
    });
  }
});

/**
 * GET /api/settings
 * Get all settings for the tenant
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.json({
        success: true,
        data: { settings: DEFAULT_SETTINGS }
      });
    }

    // Get tenant-specific settings
    const result = await query(`
      SELECT settings, feature_flags
      FROM tenants 
      WHERE id = $1
    `, [tenantId]);

    let settings = DEFAULT_SETTINGS;
    let flags = DEFAULT_FEATURE_FLAGS;
    
    if (result.rows.length > 0) {
      if (result.rows[0].settings) {
        settings = {
          ...DEFAULT_SETTINGS,
          ...result.rows[0].settings
        };
      }
      
      if (result.rows[0].feature_flags) {
        flags = {
          ...DEFAULT_FEATURE_FLAGS,
          ...result.rows[0].feature_flags
        };
      }
    }

    res.json({
      success: true,
      data: { 
        settings,
        feature_flags: flags
      }
    });
  } catch (error) {
    console.error('[Settings] Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/settings
 * Update settings for the tenant
 */
router.put('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { settings } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'X-Tenant-ID header is required'
      });
    }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings',
        message: 'Settings must be an object'
      });
    }

    // Get current settings
    const currentResult = await query(`
      SELECT settings 
      FROM tenants 
      WHERE id = $1
    `, [tenantId]);

    let currentSettings = DEFAULT_SETTINGS;
    if (currentResult.rows.length > 0 && currentResult.rows[0].settings) {
      currentSettings = {
        ...DEFAULT_SETTINGS,
        ...currentResult.rows[0].settings
      };
    }

    // Deep merge with new settings
    const updatedSettings = deepMerge(currentSettings, settings);

    // Update in database
    await query(`
      UPDATE tenants 
      SET 
        settings = $2,
        updated_at = NOW()
      WHERE id = $1
    `, [tenantId, JSON.stringify(updatedSettings)]);

    res.json({
      success: true,
      data: { settings: updatedSettings },
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('[Settings] Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

/**
 * GET /api/settings/defaults
 * Get default settings and feature flags
 */
router.get('/defaults', (req, res) => {
  res.json({
    success: true,
    data: {
      settings: DEFAULT_SETTINGS,
      feature_flags: DEFAULT_FEATURE_FLAGS
    }
  });
});

/**
 * POST /api/settings/reset
 * Reset settings to defaults
 */
router.post('/reset', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { type } = req.body; // 'settings', 'feature_flags', or 'all'

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
        message: 'X-Tenant-ID header is required'
      });
    }

    let updateQuery = '';
    let updateParams = [tenantId];

    switch (type) {
      case 'settings':
        updateQuery = `
          UPDATE tenants 
          SET settings = $2, updated_at = NOW()
          WHERE id = $1
        `;
        updateParams.push(JSON.stringify(DEFAULT_SETTINGS));
        break;
      case 'feature_flags':
        updateQuery = `
          UPDATE tenants 
          SET feature_flags = $2, updated_at = NOW()
          WHERE id = $1
        `;
        updateParams.push(JSON.stringify(DEFAULT_FEATURE_FLAGS));
        break;
      case 'all':
      default:
        updateQuery = `
          UPDATE tenants 
          SET 
            settings = $2,
            feature_flags = $3,
            updated_at = NOW()
          WHERE id = $1
        `;
        updateParams.push(JSON.stringify(DEFAULT_SETTINGS), JSON.stringify(DEFAULT_FEATURE_FLAGS));
        break;
    }

    await query(updateQuery, updateParams);

    res.json({
      success: true,
      data: {
        settings: DEFAULT_SETTINGS,
        feature_flags: DEFAULT_FEATURE_FLAGS
      },
      message: 'Settings reset to defaults successfully'
    });
  } catch (error) {
    console.error('[Settings] Reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset settings',
      message: error.message
    });
  }
});

// Helper function for deep merging objects
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

module.exports = router;
