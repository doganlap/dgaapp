const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

/**
 * GET /api/sector-controls/:sectorCode
 * Get all applicable controls, regulators, and frameworks for a specific sector
 * This is the core sector-based intelligence endpoint
 */
router.get('/:sectorCode', async (req, res) => {
  try {
    const { sectorCode } = req.params;
    
    console.log(`🔍 Fetching sector controls for: ${sectorCode}`);

    // Get applicable regulators for this sector
    const regulatorsResult = await query(`
      SELECT DISTINCT 
        r.id,
        r.name,
        r.name_ar,
        r.code,
        r.description,
        r.sector,
        r.jurisdiction,
        r.website,
        r.contact_email,
        r.authority_type,
        r.is_active
      FROM regulators r
      WHERE (r.sector = $1 OR r.sector = 'all' OR r.sector IS NULL)
        AND r.is_active = true
      ORDER BY r.name
    `, [sectorCode]);

    console.log(`📋 Found ${regulatorsResult.rows.length} applicable regulators`);

    // Get applicable frameworks for this sector
    const frameworksResult = await query(`
      SELECT 
        f.id,
        f.name,
        f.name_ar,
        f.framework_code,
        f.version,
        f.description,
        f.regulator_id,
        f.is_mandatory,
        f.effective_date,
        f.framework_type,
        f.document_url,
        r.name as regulator_name,
        r.code as regulator_code,
        COUNT(c.id) as control_count
      FROM grc_frameworks f
      JOIN regulators r ON f.regulator_id = r.id
      LEFT JOIN grc_controls c ON f.id = c.framework_id AND c.is_active = true
      WHERE (r.sector = $1 OR r.sector = 'all' OR r.sector IS NULL)
        AND f.is_active = true
        AND r.is_active = true
      GROUP BY f.id, f.name, f.name_ar, f.framework_code, f.version, f.description, 
               f.regulator_id, f.is_mandatory, f.effective_date, f.framework_type, 
               f.document_url, r.name, r.code
      ORDER BY f.is_mandatory DESC, f.name
    `, [sectorCode]);

    console.log(`📚 Found ${frameworksResult.rows.length} applicable frameworks`);

    // Get applicable controls for this sector
    const controlsResult = await query(`
      SELECT 
        c.id,
        c.framework_id,
        c.control_code,
        c.title,
        c.title_ar,
        c.description,
        c.description_ar,
        c.control_type,
        c.criticality_level,
        c.is_mandatory,
        c.control_category,
        c.control_subcategory,
        c.assessment_frequency,
        c.assessment_method,
        c.implementation_guidance,
        c.evidence_requirements,
        f.name as framework_name,
        f.framework_code,
        r.name as regulator_name,
        r.code as regulator_code
      FROM grc_controls c
      JOIN grc_frameworks f ON c.framework_id = f.id
      JOIN regulators r ON f.regulator_id = r.id
      WHERE (r.sector = $1 OR r.sector = 'all' OR r.sector IS NULL)
        AND c.is_active = true
        AND f.is_active = true
        AND r.is_active = true
      ORDER BY 
        c.criticality_level = 'critical' DESC,
        c.criticality_level = 'high' DESC,
        c.criticality_level = 'medium' DESC,
        c.criticality_level = 'low' DESC,
        c.is_mandatory DESC,
        f.name,
        c.control_code
    `, [sectorCode]);

    console.log(`🎯 Found ${controlsResult.rows.length} applicable controls`);

    // Calculate statistics
    const mandatoryCount = controlsResult.rows.filter(c => c.is_mandatory).length;
    const optionalCount = controlsResult.rows.filter(c => !c.is_mandatory).length;
    
    // Group controls by framework
    const controlsByFramework = controlsResult.rows.reduce((acc, control) => {
      const frameworkKey = control.framework_code;
      if (!acc[frameworkKey]) {
        acc[frameworkKey] = {
          framework_id: control.framework_id,
          framework_name: control.framework_name,
          framework_code: control.framework_code,
          regulator_name: control.regulator_name,
          regulator_code: control.regulator_code,
          controls: []
        };
      }
      acc[frameworkKey].controls.push(control);
      return acc;
    }, {});

    // Calculate criticality distribution
    const criticalityStats = controlsResult.rows.reduce((acc, control) => {
      acc[control.criticality_level] = (acc[control.criticality_level] || 0) + 1;
      return acc;
    }, {});

    // Build response
    const response = {
      success: true,
      sector: sectorCode,
      timestamp: new Date().toISOString(),
      regulators: regulatorsResult.rows,
      frameworks: frameworksResult.rows,
      controls: controlsResult.rows,
      controls_by_framework: controlsByFramework,
      statistics: {
        total_regulators: regulatorsResult.rows.length,
        total_frameworks: frameworksResult.rows.length,
        total_controls: controlsResult.rows.length,
        mandatory_controls: mandatoryCount,
        optional_controls: optionalCount,
        criticality_distribution: criticalityStats,
        compliance_complexity_score: Math.min(100, Math.round(
          (controlsResult.rows.length * 0.5) + 
          (mandatoryCount * 0.8) + 
          (frameworksResult.rows.length * 2)
        ))
      },
      recommendations: generateSectorRecommendations(sectorCode, {
        totalControls: controlsResult.rows.length,
        mandatoryControls: mandatoryCount,
        frameworks: frameworksResult.rows.length,
        regulators: regulatorsResult.rows.length
      })
    };

    console.log(`✅ Sector intelligence generated for ${sectorCode}`);
    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching sector controls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sector controls',
      message: error.message,
      sector: req.params.sectorCode
    });
  }
});

/**
 * GET /api/sector-controls
 * Get available sectors with basic statistics
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching available sectors');

    // Get all sectors from regulators
    const sectorsResult = await query(`
      SELECT DISTINCT 
        r.sector,
        COUNT(DISTINCT r.id) as regulator_count,
        COUNT(DISTINCT f.id) as framework_count,
        COUNT(DISTINCT c.id) as control_count
      FROM regulators r
      LEFT JOIN grc_frameworks f ON r.id = f.regulator_id AND f.is_active = true
      LEFT JOIN grc_controls c ON f.id = c.framework_id AND c.is_active = true
      WHERE r.is_active = true 
        AND r.sector IS NOT NULL 
        AND r.sector != 'all'
      GROUP BY r.sector
      ORDER BY r.sector
    `);

    // Also get organizations by sector to show usage
    const orgSectorsResult = await query(`
      SELECT 
        sector,
        COUNT(*) as organization_count,
        AVG(estimated_control_count) as avg_control_count
      FROM organizations 
      WHERE is_active = true 
        AND sector IS NOT NULL
      GROUP BY sector
      ORDER BY organization_count DESC
    `);

    // Combine the data
    const sectors = sectorsResult.rows.map(sector => {
      const orgData = orgSectorsResult.rows.find(org => org.sector === sector.sector);
      return {
        ...sector,
        organization_count: parseInt(orgData?.organization_count || 0),
        avg_control_count: Math.round(parseFloat(orgData?.avg_control_count || 0))
      };
    });

    res.json({
      success: true,
      sectors,
      total_sectors: sectors.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching sectors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sectors',
      message: error.message
    });
  }
});

/**
 * POST /api/sector-controls/seed
 * Seed regulators, frameworks, and controls into the database for demo/testing
 */
router.post('/seed', async (req, res) => {
  try {
    const sector = req.body?.sector || 'banking';

    const ensureRegulator = async (code, name, sector) => {
      const existing = await query('SELECT id FROM regulators WHERE code = $1', [code]);
      if (existing.rows.length > 0) return existing.rows[0].id;
      const result = await query(
        `INSERT INTO regulators (name, code, sector, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        [name, code, sector]
      );
      return result.rows[0].id;
    };

    const ensureFramework = async (frameworkCode, name, regulatorId) => {
      const existing = await query('SELECT id FROM grc_frameworks WHERE framework_code = $1', [frameworkCode]);
      if (existing.rows.length > 0) return existing.rows[0].id;
      const result = await query(
        `INSERT INTO grc_frameworks (name, framework_code, regulator_id, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        [name, frameworkCode, regulatorId]
      );
      return result.rows[0].id;
    };

    const ensureControl = async (frameworkId, controlCode, title, criticality, isMandatory) => {
      const existing = await query('SELECT id FROM grc_controls WHERE control_code = $1', [controlCode]);
      if (existing.rows.length > 0) return existing.rows[0].id;
      const result = await query(
        `INSERT INTO grc_controls (framework_id, control_code, title, criticality_level, is_mandatory, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id`,
        [frameworkId, controlCode, title, criticality, !!isMandatory]
      );
      return result.rows[0].id;
    };

    // Seed regulators
    const samaId = await ensureRegulator('SAMA', 'Saudi Central Bank (SAMA)', sector);
    const ncaId = await ensureRegulator('NCA', 'National Cybersecurity Authority (NCA)', 'technology');
    const citcId = await ensureRegulator('CITC', 'Communications and Information Technology Commission (CITC)', 'telecommunications');

    // Seed frameworks
    const isoId = await ensureFramework('ISO27001', 'ISO 27001', samaId);
    const nistId = await ensureFramework('NIST-CSF', 'NIST Cybersecurity Framework', ncaId);
    const samaCsId = await ensureFramework('SAMA-CS', 'SAMA Cybersecurity Framework', samaId);

    // Seed controls
    await ensureControl(isoId, 'ISO-AC-01', 'Access Control Policy', 'medium', true);
    await ensureControl(isoId, 'ISO-CR-02', 'Cryptography Standard', 'high', false);
    await ensureControl(nistId, 'NIST-PR.AC-3', 'Identity Management', 'medium', true);
    await ensureControl(nistId, 'NIST-DE.AE-1', 'Anomalies Detection', 'low', false);
    await ensureControl(samaCsId, 'SAMA-CS-AC-05', 'Privileged Access Management', 'high', true);

    res.json({ success: true, message: 'Sector controls seed completed', sector });
  } catch (error) {
    console.error('❌ Error seeding sector controls:', error);
    res.status(500).json({ success: false, error: 'Seed failed', message: error.message });
  }
});

/**
 * POST /api/sector-controls/auto-configure
 * Auto-configure organization based on sector and characteristics
 */
router.post('/auto-configure', async (req, res) => {
  try {
    const { 
      sector, 
      sub_sector, 
      employee_count, 
      processes_personal_data, 
      data_sensitivity_level 
    } = req.body;

    console.log(`🤖 Auto-configuring for sector: ${sector}`);

    // Get sector intelligence
    const sectorData = await query(`
      SELECT * FROM sector_controls_view WHERE sector = $1
    `, [sector]);

    // Calculate estimated control count using the database function
    const controlCountResult = await query(`
      SELECT estimate_control_count($1, $2, $3, $4) as estimated_count
    `, [sector, employee_count || 100, processes_personal_data || false, data_sensitivity_level || 'medium']);

    // Get auto-assigned regulators
    const regulatorsResult = await query(`
      SELECT auto_assign_regulators($1, $2) as regulator_codes
    `, [sector, sub_sector]);

    const regulatorCodes = regulatorsResult.rows[0]?.regulator_codes || [];

    // Get auto-assigned frameworks
    const frameworksResult = await query(`
      SELECT auto_assign_frameworks($1) as framework_codes
    `, [regulatorCodes]);

    const frameworkCodes = frameworksResult.rows[0]?.framework_codes || [];

    // Get detailed regulator and framework information
    const detailedRegulatorsResult = await query(`
      SELECT * FROM regulators 
      WHERE code = ANY($1) AND is_active = true
      ORDER BY name
    `, [regulatorCodes]);

    const detailedFrameworksResult = await query(`
      SELECT f.*, r.name as regulator_name, r.code as regulator_code
      FROM grc_frameworks f
      JOIN regulators r ON f.regulator_id = r.id
      WHERE f.framework_code = ANY($1) AND f.is_active = true
      ORDER BY f.name
    `, [frameworkCodes]);

    const response = {
      success: true,
      sector,
      sub_sector,
      auto_configuration: {
        regulators: detailedRegulatorsResult.rows,
        frameworks: detailedFrameworksResult.rows,
        estimated_control_count: controlCountResult.rows[0]?.estimated_count || 0,
        regulator_codes: regulatorCodes,
        framework_codes: frameworkCodes
      },
      recommendations: generateAutoConfigRecommendations(sector, {
        employeeCount: employee_count,
        processesPersonalData: processes_personal_data,
        dataSensitivity: data_sensitivity_level,
        regulatorCount: detailedRegulatorsResult.rows.length,
        frameworkCount: detailedFrameworksResult.rows.length
      }),
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Auto-configuration completed for ${sector}`);
    res.json(response);

  } catch (error) {
    console.error('❌ Error in auto-configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Auto-configuration failed',
      message: error.message
    });
  }
});

// Helper function to generate sector-specific recommendations
function generateSectorRecommendations(sector, stats) {
  const recommendations = [];

  // Base recommendations based on control count
  if (stats.totalControls > 100) {
    recommendations.push({
      type: 'complexity',
      priority: 'high',
      title: 'High Complexity Sector',
      description: `This sector has ${stats.totalControls} applicable controls. Consider phased implementation approach.`,
      action: 'Plan assessment in phases, starting with critical and mandatory controls'
    });
  }

  // Mandatory controls recommendations
  if (stats.mandatoryControls > 50) {
    recommendations.push({
      type: 'compliance',
      priority: 'critical',
      title: 'High Mandatory Requirements',
      description: `${stats.mandatoryControls} mandatory controls require immediate attention.`,
      action: 'Prioritize mandatory controls in your compliance roadmap'
    });
  }

  // Sector-specific recommendations
  switch (sector) {
    case 'healthcare':
      recommendations.push({
        type: 'sector_specific',
        priority: 'high',
        title: 'Healthcare Data Protection',
        description: 'Healthcare sector requires special attention to patient data privacy and medical device security.',
        action: 'Focus on PHI protection controls and medical device cybersecurity'
      });
      break;
    
    case 'finance':
      recommendations.push({
        type: 'sector_specific',
        priority: 'critical',
        title: 'Financial Services Compliance',
        description: 'Financial sector has stringent regulatory requirements and frequent assessments.',
        action: 'Implement continuous monitoring and quarterly assessment cycles'
      });
      break;
    
    case 'government':
      recommendations.push({
        type: 'sector_specific',
        priority: 'critical',
        title: 'Government Security Standards',
        description: 'Government entities must meet national cybersecurity standards.',
        action: 'Align with national cybersecurity framework and implement advanced threat protection'
      });
      break;
  }

  return recommendations;
}

// Helper function to generate auto-configuration recommendations
function generateAutoConfigRecommendations(sector, characteristics) {
  const recommendations = [];

  // Size-based recommendations
  if (characteristics.employeeCount < 50) {
    recommendations.push({
      type: 'implementation',
      priority: 'medium',
      title: 'Small Organization Approach',
      description: 'Consider simplified compliance approach suitable for small organizations.',
      action: 'Focus on essential controls and leverage automated tools'
    });
  } else if (characteristics.employeeCount > 1000) {
    recommendations.push({
      type: 'implementation',
      priority: 'high',
      title: 'Enterprise Compliance Program',
      description: 'Large organization requires comprehensive compliance program.',
      action: 'Establish dedicated compliance team and implement enterprise GRC platform'
    });
  }

  // Data processing recommendations
  if (characteristics.processesPersonalData) {
    recommendations.push({
      type: 'privacy',
      priority: 'high',
      title: 'Personal Data Processing',
      description: 'Organization processes personal data requiring privacy controls.',
      action: 'Implement data protection impact assessments and privacy by design'
    });
  }

  return recommendations;
}

module.exports = router;
