/**
 * Auto Assessment Generator API Routes
 * Exposes the autonomous assessment service with KSA regulator mappings
 */

const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, requireTenantAccess } = require('../middleware/rbac');
const AutonomousAssessment = require('../services/autonomousAssessment');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Initialize autonomous assessment service
const autonomousService = new AutonomousAssessment();
let isServiceInitialized = false;

// ============================================================================
// KSA REGULATOR-SECTOR MAPPINGS
// ============================================================================
const KSA_REGULATOR_MAPPINGS = {
  // Financial Services
  'finance': {
    primary: ['SAMA', 'NCA', 'ZATCA'],
    secondary: ['CMA', 'MHRSD'],
    frameworks: ['Basel III', 'SAMA Cybersecurity Framework', 'AML/CFT']
  },
  'banking': {
    primary: ['SAMA', 'NCA', 'ZATCA'],
    secondary: ['CMA'],
    frameworks: ['Basel III', 'SAMA Cybersecurity Framework', 'PCI-DSS', 'AML/CFT']
  },
  'insurance': {
    primary: ['SAMA', 'NCA', 'ZATCA'],
    secondary: ['MHRSD'],
    frameworks: ['SAMA Insurance Regulations', 'SAMA Cybersecurity Framework']
  },
  'investment': {
    primary: ['CMA', 'SAMA', 'NCA', 'ZATCA'],
    secondary: [],
    frameworks: ['CMA Investment Regulations', 'AML/CFT', 'Market Conduct']
  },

  // Healthcare
  'healthcare': {
    primary: ['MOH', 'NCA', 'ZATCA'],
    secondary: ['SFDA', 'MHRSD'],
    frameworks: ['MOH Health Data Protection', 'Medical Device Regulations', 'Patient Privacy']
  },
  'hospital': {
    primary: ['MOH', 'NCA', 'ZATCA'],
    secondary: ['SFDA', 'MHRSD'],
    frameworks: ['MOH Hospital Licensing', 'Medical Records Management', 'Patient Safety']
  },
  'clinic': {
    primary: ['MOH', 'NCA', 'ZATCA'],
    secondary: ['MHRSD'],
    frameworks: ['MOH Clinic Licensing', 'Medical Practice Standards']
  },
  'pharmacy': {
    primary: ['SFDA', 'MOH', 'NCA', 'ZATCA'],
    secondary: ['MHRSD'],
    frameworks: ['SFDA Pharmacy Regulations', 'Drug Safety Standards']
  },

  // Government & Public Sector
  'government': {
    primary: ['NCA', 'ZATCA', 'MISA'],
    secondary: ['MCIT', 'MHRSD'],
    frameworks: ['NCA Cybersecurity Framework', 'Government Digital Transformation', 'Data Classification']
  },
  'ministry': {
    primary: ['NCA', 'ZATCA', 'MISA'],
    secondary: ['MCIT'],
    frameworks: ['Government Security Standards', 'Public Data Protection', 'Digital Services']
  },
  'municipality': {
    primary: ['NCA', 'ZATCA', 'MOMRAH'],
    secondary: ['MISA'],
    frameworks: ['Municipal Services Standards', 'Smart City Framework']
  },

  // Education
  'education': {
    primary: ['MOE', 'NCA', 'ZATCA'],
    secondary: ['MHRSD', 'MCIT'],
    frameworks: ['Education Data Protection', 'Student Privacy', 'Digital Learning Standards']
  },
  'university': {
    primary: ['MOE', 'NCA', 'ZATCA'],
    secondary: ['MCIT'],
    frameworks: ['Higher Education Standards', 'Research Data Protection', 'Academic Freedom']
  },
  'school': {
    primary: ['MOE', 'NCA', 'ZATCA'],
    secondary: [],
    frameworks: ['K-12 Education Standards', 'Student Safety', 'Curriculum Compliance']
  },

  // Energy & Utilities
  'energy': {
    primary: ['ECRA', 'NCA', 'ZATCA'],
    secondary: ['MEWA', 'MHRSD'],
    frameworks: ['Energy Sector Cybersecurity', 'Critical Infrastructure Protection', 'Environmental Compliance']
  },
  'oil_gas': {
    primary: ['ECRA', 'NCA', 'ZATCA', 'MEIM'],
    secondary: ['MEWA'],
    frameworks: ['Petroleum Safety Standards', 'Environmental Protection', 'Industrial Security']
  },
  'electric': {
    primary: ['ECRA', 'NCA', 'ZATCA'],
    secondary: ['MEWA'],
    frameworks: ['Electrical Safety Standards', 'Grid Security', 'Renewable Energy Compliance']
  },
  'water': {
    primary: ['MEWA', 'NCA', 'ZATCA'],
    secondary: ['MOH'],
    frameworks: ['Water Quality Standards', 'Environmental Protection', 'Public Health']
  },

  // Telecommunications & IT
  'telecom': {
    primary: ['CITC', 'NCA', 'ZATCA'],
    secondary: ['MCIT', 'MHRSD'],
    frameworks: ['CITC Telecom Regulations', 'Data Protection', 'Network Security']
  },
  'mobile_network': {
    primary: ['CITC', 'NCA', 'ZATCA'],
    secondary: ['MCIT'],
    frameworks: ['Mobile Network Security', 'Consumer Protection', 'Spectrum Management']
  },
  'isp': {
    primary: ['CITC', 'NCA', 'ZATCA'],
    secondary: ['MCIT'],
    frameworks: ['Internet Service Standards', 'Content Filtering', 'Data Localization']
  },
  'technology': {
    primary: ['CITC', 'NCA', 'ZATCA'],
    secondary: ['MCIT', 'MISA'],
    frameworks: ['Data Protection', 'Cybersecurity Framework', 'Digital Services']
  },

  // Retail & Commerce
  'retail': {
    primary: ['MCI', 'NCA', 'ZATCA'],
    secondary: ['MHRSD', 'SFDA'],
    frameworks: ['Consumer Protection', 'E-commerce Standards', 'Product Safety']
  },
  'ecommerce': {
    primary: ['MCI', 'NCA', 'ZATCA', 'CITC'],
    secondary: ['SAMA'],
    frameworks: ['E-commerce Law', 'Payment Security', 'Consumer Rights', 'Data Protection']
  },
  'supermarket': {
    primary: ['MCI', 'ZATCA', 'SFDA'],
    secondary: ['MOH', 'MHRSD'],
    frameworks: ['Food Safety Standards', 'Consumer Protection', 'Retail Licensing']
  },

  // Manufacturing & Industrial
  'manufacturing': {
    primary: ['MEIM', 'NCA', 'ZATCA'],
    secondary: ['MEWA', 'MHRSD'],
    frameworks: ['Industrial Safety Standards', 'Environmental Compliance', 'Product Quality']
  },
  'factory': {
    primary: ['MEIM', 'ZATCA', 'MEWA'],
    secondary: ['MHRSD', 'MOH'],
    frameworks: ['Factory Safety Standards', 'Industrial Licensing', 'Worker Safety']
  },

  // Transportation & Logistics
  'transportation': {
    primary: ['MOT', 'NCA', 'ZATCA'],
    secondary: ['MHRSD'],
    frameworks: ['Transportation Safety', 'Logistics Standards', 'Vehicle Regulations']
  },

  // Default/Other
  'other': {
    primary: ['NCA', 'ZATCA'],
    secondary: ['MHRSD'],
    frameworks: ['Basic Cybersecurity', 'Tax Compliance', 'Labor Standards']
  }
};

// ============================================================================
// MIDDLEWARE - Initialize Service
// ============================================================================
router.use(async (req, res, next) => {
  try {
    if (!isServiceInitialized) {
      console.log('🤖 Initializing Autonomous Assessment Service...');
      await autonomousService.initialize();
      isServiceInitialized = true;
      console.log('✅ Autonomous Assessment Service ready');
    }
    next();
  } catch (error) {
    console.error('❌ Failed to initialize Autonomous Assessment Service:', error);
    res.status(500).json({
      success: false,
      error: 'Service initialization failed',
      message: error.message
    });
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * POST /api/auto-assessment/generate-from-tenant/:tenantId
 * Generate assessment automatically based on tenant profile
 */
router.post('/generate-from-tenant/:tenantId', 
  authenticateToken, 
  requireTenantAccess, 
  requirePermission('assessments:create'),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      const options = req.body || {};

      console.log(`🤖 Auto-generating assessment for tenant: ${tenantId}`);

      // Get tenant profile with sector and industry
      const tenantProfile = await getTenantProfile(tenantId);
      
      // Get applicable KSA regulators
      const applicableRegulators = getApplicableRegulators(
        tenantProfile.sector, 
        tenantProfile.industry
      );

      // Get organizations for this tenant
      const organizations = await query(`
        SELECT id, name, sector, industry, size_category
        FROM organizations 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC
        LIMIT 1
      `, [tenantId]);

      if (organizations.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No organization found for tenant',
          message: 'Please create an organization first'
        });
      }

      const organization = organizations.rows[0];

      // Generate assessment using autonomous service
      const assessment = await autonomousService.generateAssessment(
        organization.id,
        {
          ...options,
          regulators: applicableRegulators.primary,
          frameworks: applicableRegulators.frameworks,
          maxFrameworks: options.maxFrameworks || 3,
          assessmentType: 'regulatory_compliance',
          priority: 'high'
        }
      );

      // Create regulator compliance records
      await createRegulatorComplianceRecords(
        assessment.id, 
        tenantId, 
        applicableRegulators
      );

      res.status(201).json({
        success: true,
        data: {
          assessment,
          regulators: applicableRegulators,
          tenantProfile,
          organization: organization.name
        },
        message: `Assessment auto-generated for ${applicableRegulators.primary.length} KSA regulators`
      });

    } catch (error) {
      console.error('❌ Error auto-generating assessment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-generate assessment',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/auto-assessment/generate-from-profile
 * Generate assessment from custom profile (for testing/preview)
 */
router.post('/generate-from-profile',
  authenticateToken,
  requirePermission('assessments:create'),
  async (req, res) => {
    try {
      const { 
        sector, 
        industry, 
        organizationId, 
        companySize = 'medium',
        ...options 
      } = req.body;

      if (!sector || !industry || !organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'sector, industry, and organizationId are required'
        });
      }

      // Get applicable regulators
      const applicableRegulators = getApplicableRegulators(sector, industry);

      // Generate assessment
      const assessment = await autonomousService.generateAssessment(
        organizationId,
        {
          ...options,
          regulators: applicableRegulators.primary,
          frameworks: applicableRegulators.frameworks,
          maxFrameworks: options.maxFrameworks || 3,
          assessmentType: 'regulatory_compliance'
        }
      );

      res.status(201).json({
        success: true,
        data: {
          assessment,
          regulators: applicableRegulators,
          profile: { sector, industry, companySize }
        },
        message: `Assessment generated for ${applicableRegulators.primary.length} regulators`
      });

    } catch (error) {
      console.error('❌ Error generating assessment from profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate assessment',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/auto-assessment/regulators/:sector
 * Get applicable regulators for a sector
 */
router.get('/regulators/:sector',
  authenticateToken,
  async (req, res) => {
    try {
      const { sector } = req.params;
      const { industry } = req.query;

      const regulators = getApplicableRegulators(sector, industry);

      res.json({
        success: true,
        data: regulators,
        sector,
        industry: industry || 'general'
      });

    } catch (error) {
      console.error('❌ Error getting regulators:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get regulators',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/auto-assessment/preview/:tenantId
 * Preview what would be generated without creating assessment
 */
router.get('/preview/:tenantId',
  authenticateToken,
  requireTenantAccess,
  async (req, res) => {
    try {
      const { tenantId } = req.params;

      // Get tenant profile
      const tenantProfile = await getTenantProfile(tenantId);
      
      // Get applicable regulators
      const applicableRegulators = getApplicableRegulators(
        tenantProfile.sector, 
        tenantProfile.industry
      );

      // Get estimated metrics
      const estimatedMetrics = {
        regulatorCount: applicableRegulators.primary.length + applicableRegulators.secondary.length,
        frameworkCount: applicableRegulators.frameworks.length,
        estimatedControls: applicableRegulators.frameworks.length * 25, // Rough estimate
        estimatedDuration: applicableRegulators.frameworks.length * 15 + 20, // Hours
        complexity: applicableRegulators.primary.length > 3 ? 'high' : 'medium'
      };

      res.json({
        success: true,
        data: {
          tenantProfile,
          regulators: applicableRegulators,
          estimatedMetrics,
          previewOnly: true
        }
      });

    } catch (error) {
      console.error('❌ Error generating preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate preview',
        message: error.message
      });
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tenant profile with sector and industry information
 */
async function getTenantProfile(tenantId) {
  try {
    const result = await query(`
      SELECT 
        t.id,
        t.name,
        t.sector,
        t.industry,
        t.country,
        t.subscription_tier,
        COUNT(DISTINCT o.id) as organization_count,
        COUNT(DISTINCT a.id) as assessment_count
      FROM tenants t
      LEFT JOIN organizations o ON t.id = o.tenant_id
      LEFT JOIN assessments a ON o.id = a.organization_id
      WHERE t.id = $1
      GROUP BY t.id, t.name, t.sector, t.industry, t.country, t.subscription_tier
    `, [tenantId]);

    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error getting tenant profile:', error);
    throw error;
  }
}

/**
 * Get applicable KSA regulators based on sector and industry
 */
function getApplicableRegulators(sector, industry = null) {
  // Try specific industry first, then fall back to sector
  const mapping = KSA_REGULATOR_MAPPINGS[industry] || 
                   KSA_REGULATOR_MAPPINGS[sector] || 
                   KSA_REGULATOR_MAPPINGS['other'];

  return {
    primary: mapping.primary || [],
    secondary: mapping.secondary || [],
    frameworks: mapping.frameworks || [],
    total: (mapping.primary || []).length + (mapping.secondary || []).length
  };
}

/**
 * Create regulator compliance tracking records
 */
async function createRegulatorComplianceRecords(assessmentId, tenantId, regulators) {
  try {
    await transaction(async (client) => {
      // Create records for primary regulators
      for (const regulator of regulators.primary) {
        await client.query(`
          INSERT INTO regulator_compliance (
            id, assessment_id, tenant_id, regulator_code, regulator_name,
            compliance_status, priority_level, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        `, [
          uuidv4(),
          assessmentId,
          tenantId,
          regulator,
          getRegulatorFullName(regulator),
          'pending',
          'high'
        ]);
      }

      // Create records for secondary regulators
      for (const regulator of regulators.secondary) {
        await client.query(`
          INSERT INTO regulator_compliance (
            id, assessment_id, tenant_id, regulator_code, regulator_name,
            compliance_status, priority_level, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        `, [
          uuidv4(),
          assessmentId,
          tenantId,
          regulator,
          getRegulatorFullName(regulator),
          'pending',
          'medium'
        ]);
      }
    });

    console.log(`✅ Created compliance records for ${regulators.primary.length + regulators.secondary.length} regulators`);
  } catch (error) {
    console.error('❌ Error creating regulator compliance records:', error);
    throw error;
  }
}

/**
 * Get full regulator name from code
 */
function getRegulatorFullName(code) {
  const regulatorNames = {
    'SAMA': 'Saudi Arabian Monetary Authority',
    'NCA': 'National Cybersecurity Authority',
    'CITC': 'Communications and Information Technology Commission',
    'CMA': 'Capital Market Authority',
    'MOH': 'Ministry of Health',
    'SFDA': 'Saudi Food and Drug Authority',
    'MOE': 'Ministry of Education',
    'ECRA': 'Electricity and Cogeneration Regulatory Authority',
    'MEWA': 'Ministry of Environment, Water and Agriculture',
    'ZATCA': 'Zakat, Tax and Customs Authority',
    'MCI': 'Ministry of Commerce and Investment',
    'MEIM': 'Ministry of Energy, Industry and Mineral Resources',
    'MOT': 'Ministry of Transport',
    'MCIT': 'Ministry of Communications and Information Technology',
    'MISA': 'Ministry of Interior - Saudi Arabia',
    'MOMRAH': 'Ministry of Municipal and Rural Affairs and Housing',
    'MHRSD': 'Ministry of Human Resources and Social Development'
  };

  return regulatorNames[code] || code;
}

module.exports = router;
