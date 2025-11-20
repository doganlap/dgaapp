/**
 * Comprehensive GRC Controller
 * 
 * Handles all GRC operations:
 * - Regulators, Sectors, Frameworks, Controls
 * - Organization-Regulator/Framework Mapping
 * - Control Assessments
 * - Evidence Management
 * - Implementation Plans
 * - Compliance Reports
 * - Requirements Matrix
 */

const { db } = require('../config/database');
const logger = require('../utils/logger');

// ========== REGULATORS ==========

exports.getAllRegulators = async (req, res) => {
  try {
    const { regulator_type, jurisdiction, is_active } = req.query;
    let query = db('grc_regulators').select('*');

    if (regulator_type) query = query.where({ regulator_type });
    if (jurisdiction) query = query.where({ jurisdiction });
    if (is_active !== undefined) query = query.where({ is_active: is_active === 'true' });

    const regulators = await query.orderBy('regulator_name_en', 'asc');

    res.json({
      success: true,
      message: 'Regulators retrieved successfully',
      data: regulators,
      count: regulators.length,
    });
  } catch (error) {
    logger.error('Get all regulators error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve regulators',
      error: error.message,
    });
  }
};

exports.getRegulatorById = async (req, res) => {
  try {
    const { id } = req.params;
    const regulator = await db('grc_regulators').where({ regulator_id: id }).first();

    if (!regulator) {
      return res.status(404).json({
        success: false,
        message: 'Regulator not found',
      });
    }

    res.json({
      success: true,
      message: 'Regulator retrieved successfully',
      data: regulator,
    });
  } catch (error) {
    logger.error('Get regulator by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve regulator',
      error: error.message,
    });
  }
};

// ========== SECTORS ==========

exports.getAllSectors = async (req, res) => {
  try {
    const sectors = await db('grc_sectors')
      .select('*')
      .where({ is_active: true })
      .orderBy('priority', 'asc');

    res.json({
      success: true,
      message: 'Sectors retrieved successfully',
      data: sectors,
      count: sectors.length,
    });
  } catch (error) {
    logger.error('Get all sectors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sectors',
      error: error.message,
    });
  }
};

// ========== FRAMEWORKS ==========

exports.getAllFrameworks = async (req, res) => {
  try {
    const { regulator_id, framework_type, compliance_level, is_active } = req.query;
    let query = db('grc_frameworks')
      .select(
        'grc_frameworks.*',
        'grc_regulators.regulator_name_en',
        'grc_regulators.regulator_name_ar',
        'grc_regulators.regulator_code'
      )
      .leftJoin('grc_regulators', 'grc_frameworks.regulator_id', 'grc_regulators.regulator_id');

    if (regulator_id) query = query.where({ 'grc_frameworks.regulator_id': regulator_id });
    if (framework_type) query = query.where({ 'grc_frameworks.framework_type': framework_type });
    if (compliance_level) query = query.where({ 'grc_frameworks.compliance_level': compliance_level });
    if (is_active !== undefined) query = query.where({ 'grc_frameworks.is_active': is_active === 'true' });

    const frameworks = await query.orderBy('grc_frameworks.framework_name_en', 'asc');

    res.json({
      success: true,
      message: 'Frameworks retrieved successfully',
      data: frameworks,
      count: frameworks.length,
    });
  } catch (error) {
    logger.error('Get all frameworks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve frameworks',
      error: error.message,
    });
  }
};

exports.getFrameworkById = async (req, res) => {
  try {
    const { id } = req.params;
    const framework = await db('grc_frameworks')
      .select(
        'grc_frameworks.*',
        'grc_regulators.regulator_name_en',
        'grc_regulators.regulator_name_ar'
      )
      .leftJoin('grc_regulators', 'grc_frameworks.regulator_id', 'grc_regulators.regulator_id')
      .where({ 'grc_frameworks.framework_id': id })
      .first();

    if (!framework) {
      return res.status(404).json({
        success: false,
        message: 'Framework not found',
      });
    }

    // Get controls for this framework
    const controls = await db('grc_controls')
      .where({ framework_id: id })
      .orderBy('control_code', 'asc');

    res.json({
      success: true,
      message: 'Framework retrieved successfully',
      data: {
        ...framework,
        controls,
      },
    });
  } catch (error) {
    logger.error('Get framework by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve framework',
      error: error.message,
    });
  }
};

exports.createFramework = async (req, res) => {
  try {
    const frameworkData = req.body;
    const [newFramework] = await db('grc_frameworks')
      .insert(frameworkData)
      .returning('*');

    logger.info(`New framework created: ${newFramework.framework_name_en}`);

    res.status(201).json({
      success: true,
      message: 'Framework created successfully',
      data: newFramework,
    });
  } catch (error) {
    logger.error('Create framework error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create framework',
      error: error.message,
    });
  }
};

// ========== CONTROLS ==========

exports.getAllControls = async (req, res) => {
  try {
    const { framework_id, control_type, control_category, is_mandatory } = req.query;
    let query = db('grc_controls')
      .select(
        'grc_controls.*',
        'grc_frameworks.framework_name_en',
        'grc_frameworks.framework_name_ar',
        'grc_regulators.regulator_name_en'
      )
      .leftJoin('grc_frameworks', 'grc_controls.framework_id', 'grc_frameworks.framework_id')
      .leftJoin('grc_regulators', 'grc_frameworks.regulator_id', 'grc_regulators.regulator_id');

    if (framework_id) query = query.where({ 'grc_controls.framework_id': framework_id });
    if (control_type) query = query.where({ 'grc_controls.control_type': control_type });
    if (control_category) query = query.where({ 'grc_controls.control_category': control_category });
    if (is_mandatory !== undefined) query = query.where({ 'grc_controls.is_mandatory': is_mandatory === 'true' });

    const controls = await query.orderBy('grc_controls.control_code', 'asc');

    res.json({
      success: true,
      message: 'Controls retrieved successfully',
      data: controls,
      count: controls.length,
    });
  } catch (error) {
    logger.error('Get all controls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve controls',
      error: error.message,
    });
  }
};

exports.getControlById = async (req, res) => {
  try {
    const { id } = req.params;
    const control = await db('grc_controls')
      .select(
        'grc_controls.*',
        'grc_frameworks.framework_name_en',
        'grc_frameworks.framework_name_ar',
        'grc_regulators.regulator_name_en'
      )
      .leftJoin('grc_frameworks', 'grc_controls.framework_id', 'grc_frameworks.framework_id')
      .leftJoin('grc_regulators', 'grc_frameworks.regulator_id', 'grc_regulators.regulator_id')
      .where({ 'grc_controls.control_id': id })
      .first();

    if (!control) {
      return res.status(404).json({
        success: false,
        message: 'Control not found',
      });
    }

    res.json({
      success: true,
      message: 'Control retrieved successfully',
      data: control,
    });
  } catch (error) {
    logger.error('Get control by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve control',
      error: error.message,
    });
  }
};

exports.createControl = async (req, res) => {
  try {
    const controlData = req.body;
    const [newControl] = await db('grc_controls')
      .insert(controlData)
      .returning('*');

    logger.info(`New control created: ${newControl.control_name_en}`);

    res.status(201).json({
      success: true,
      message: 'Control created successfully',
      data: newControl,
    });
  } catch (error) {
    logger.error('Create control error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create control',
      error: error.message,
    });
  }
};

// ========== ORGANIZATION-REGULATOR MAPPING ==========

exports.getOrganizationRegulators = async (req, res) => {
  try {
    const { entity_id } = req.params;
    const mappings = await db('grc_organization_regulators')
      .select(
        'grc_organization_regulators.*',
        'grc_regulators.regulator_name_en',
        'grc_regulators.regulator_name_ar',
        'grc_regulators.regulator_code',
        'grc_sectors.sector_name_en',
        'grc_sectors.sector_name_ar'
      )
      .leftJoin('grc_regulators', 'grc_organization_regulators.regulator_id', 'grc_regulators.regulator_id')
      .leftJoin('grc_sectors', 'grc_organization_regulators.sector_id', 'grc_sectors.sector_id')
      .where({ 'grc_organization_regulators.entity_id': entity_id, 'grc_organization_regulators.is_active': true })
      .orderBy('grc_regulators.regulator_name_en', 'asc');

    res.json({
      success: true,
      message: 'Organization regulators retrieved successfully',
      data: mappings,
      count: mappings.length,
    });
  } catch (error) {
    logger.error('Get organization regulators error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve organization regulators',
      error: error.message,
    });
  }
};

exports.mapOrganizationToRegulator = async (req, res) => {
  try {
    const { entity_id } = req.params;
    const { regulator_id, sector_id, applicability_reason, applicability_notes, effective_date } = req.body;

    // Check if mapping already exists
    const existing = await db('grc_organization_regulators')
      .where({ entity_id, regulator_id })
      .first();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Mapping already exists',
      });
    }

    const [mapping] = await db('grc_organization_regulators')
      .insert({
        entity_id,
        regulator_id,
        sector_id,
        applicability_reason,
        applicability_notes,
        effective_date: effective_date || new Date(),
        is_active: true,
      })
      .returning('*');

    logger.info(`Organization ${entity_id} mapped to regulator ${regulator_id}`);

    res.status(201).json({
      success: true,
      message: 'Organization mapped to regulator successfully',
      data: mapping,
    });
  } catch (error) {
    logger.error('Map organization to regulator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to map organization to regulator',
      error: error.message,
    });
  }
};

// ========== CONTROL ASSESSMENTS ==========

exports.getControlAssessments = async (req, res) => {
  try {
    const { entity_id, framework_id, assessment_status, implementation_status } = req.query;
    let query = db('grc_control_assessments')
      .select(
        'grc_control_assessments.*',
        'grc_controls.control_name_en',
        'grc_controls.control_name_ar',
        'grc_controls.control_code',
        'grc_frameworks.framework_name_en',
        'grc_frameworks.framework_name_ar',
        'dga_entities.entity_name_en',
        'dga_entities.entity_name_ar'
      )
      .leftJoin('grc_controls', 'grc_control_assessments.control_id', 'grc_controls.control_id')
      .leftJoin('grc_frameworks', 'grc_control_assessments.framework_id', 'grc_frameworks.framework_id')
      .leftJoin('dga_entities', 'grc_control_assessments.entity_id', 'dga_entities.entity_id');

    if (entity_id) query = query.where({ 'grc_control_assessments.entity_id': entity_id });
    if (framework_id) query = query.where({ 'grc_control_assessments.framework_id': framework_id });
    if (assessment_status) query = query.where({ 'grc_control_assessments.assessment_status': assessment_status });
    if (implementation_status) query = query.where({ 'grc_control_assessments.implementation_status': implementation_status });

    const assessments = await query.orderBy('grc_control_assessments.assessment_date', 'desc');

    res.json({
      success: true,
      message: 'Control assessments retrieved successfully',
      data: assessments,
      count: assessments.length,
    });
  } catch (error) {
    logger.error('Get control assessments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve control assessments',
      error: error.message,
    });
  }
};

exports.createControlAssessment = async (req, res) => {
  try {
    const assessmentData = req.body;
    const [assessment] = await db('grc_control_assessments')
      .insert(assessmentData)
      .returning('*');

    logger.info(`New control assessment created for entity ${assessmentData.entity_id}`);

    res.status(201).json({
      success: true,
      message: 'Control assessment created successfully',
      data: assessment,
    });
  } catch (error) {
    logger.error('Create control assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create control assessment',
      error: error.message,
    });
  }
};

exports.updateControlAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const assessmentData = req.body;

    const [updated] = await db('grc_control_assessments')
      .where({ assessment_id: id })
      .update(assessmentData)
      .returning('*');

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    res.json({
      success: true,
      message: 'Control assessment updated successfully',
      data: updated,
    });
  } catch (error) {
    logger.error('Update control assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update control assessment',
      error: error.message,
    });
  }
};

// ========== EVIDENCE MANAGEMENT ==========

exports.getEvidence = async (req, res) => {
  try {
    const { assessment_id, compliance_id, evidence_type, evidence_status } = req.query;
    let query = db('grc_evidence').select('*');

    if (assessment_id) query = query.where({ assessment_id });
    if (compliance_id) query = query.where({ compliance_id });
    if (evidence_type) query = query.where({ evidence_type });
    if (evidence_status) query = query.where({ evidence_status });

    const evidence = await query.orderBy('evidence_date', 'desc');

    res.json({
      success: true,
      message: 'Evidence retrieved successfully',
      data: evidence,
      count: evidence.length,
    });
  } catch (error) {
    logger.error('Get evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve evidence',
      error: error.message,
    });
  }
};

exports.createEvidence = async (req, res) => {
  try {
    const evidenceData = req.body;
    const [evidence] = await db('grc_evidence')
      .insert(evidenceData)
      .returning('*');

    logger.info(`New evidence created: ${evidence.evidence_name}`);

    res.status(201).json({
      success: true,
      message: 'Evidence created successfully',
      data: evidence,
    });
  } catch (error) {
    logger.error('Create evidence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create evidence',
      error: error.message,
    });
  }
};

// ========== IMPLEMENTATION PLANS ==========

exports.getImplementationPlans = async (req, res) => {
  try {
    const { entity_id, framework_id, plan_status } = req.query;
    let query = db('grc_implementation_plans')
      .select(
        'grc_implementation_plans.*',
        'grc_frameworks.framework_name_en',
        'grc_frameworks.framework_name_ar',
        'dga_entities.entity_name_en',
        'dga_entities.entity_name_ar'
      )
      .leftJoin('grc_frameworks', 'grc_implementation_plans.framework_id', 'grc_frameworks.framework_id')
      .leftJoin('dga_entities', 'grc_implementation_plans.entity_id', 'dga_entities.entity_id');

    if (entity_id) query = query.where({ 'grc_implementation_plans.entity_id': entity_id });
    if (framework_id) query = query.where({ 'grc_implementation_plans.framework_id': framework_id });
    if (plan_status) query = query.where({ 'grc_implementation_plans.plan_status': plan_status });

    const plans = await query.orderBy('grc_implementation_plans.created_at', 'desc');

    res.json({
      success: true,
      message: 'Implementation plans retrieved successfully',
      data: plans,
      count: plans.length,
    });
  } catch (error) {
    logger.error('Get implementation plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve implementation plans',
      error: error.message,
    });
  }
};

exports.createImplementationPlan = async (req, res) => {
  try {
    const planData = req.body;
    const { auto_assign = true } = req.body;

    // Auto-assign responsible persons if requested
    if (auto_assign && planData.entity_id) {
      const assignmentService = require('../services/assignment.service');
      const assignmentResult = await assignmentService.autoAssignPlanResponsibles(
        planData.entity_id,
        planData
      );

      // Merge auto-assignment results
      planData.responsible_persons = assignmentResult.responsible_persons;
      planData.sla_start_date = assignmentResult.sla_start_date;
      planData.sla_target_date = assignmentResult.sla_target_date;
      planData.sla_target_days = assignmentResult.sla_target_days;
      planData.auto_assignment_rules = assignmentResult.auto_assignment_rules;
      planData.last_auto_assignment_at = assignmentResult.last_auto_assignment_at;
      planData.sla_status = 'On Track';
      planData.sla_compliance_percentage = 100;
    }

    const [plan] = await db('grc_implementation_plans')
      .insert(planData)
      .returning('*');

    // Create SLA tracking record
    if (plan.sla_target_date) {
      await db('grc_sla_tracking').insert({
        item_type: 'plan',
        item_id: plan.plan_id,
        sla_name: `Plan: ${plan.plan_name}`,
        sla_description: plan.description || '',
        sla_target_days: plan.sla_target_days || 30,
        sla_start_time: plan.sla_start_date || new Date(),
        sla_target_time: plan.sla_target_date,
        sla_status: 'On Track',
        sla_compliance_percentage: 100,
        days_remaining: Math.ceil((new Date(plan.sla_target_date) - new Date(plan.sla_start_date || new Date())) / (1000 * 60 * 60 * 24)),
        responsible_persons: plan.responsible_persons || [],
      });
    }

    logger.info(`New implementation plan created: ${plan.plan_name} with ${plan.responsible_persons?.length || 0} responsible persons`);

    res.status(201).json({
      success: true,
      message: 'Implementation plan created successfully with auto-assignment',
      data: plan,
    });
  } catch (error) {
    logger.error('Create implementation plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create implementation plan',
      error: error.message,
    });
  }
};

// ========== COMPLIANCE REPORTS ==========

exports.getComplianceReports = async (req, res) => {
  try {
    const { entity_id, regulator_id, framework_id, report_type, report_status } = req.query;
    let query = db('grc_compliance_reports')
      .select(
        'grc_compliance_reports.*',
        'dga_entities.entity_name_en',
        'dga_entities.entity_name_ar',
        'grc_regulators.regulator_name_en',
        'grc_frameworks.framework_name_en'
      )
      .leftJoin('dga_entities', 'grc_compliance_reports.entity_id', 'dga_entities.entity_id')
      .leftJoin('grc_regulators', 'grc_compliance_reports.regulator_id', 'grc_regulators.regulator_id')
      .leftJoin('grc_frameworks', 'grc_compliance_reports.framework_id', 'grc_frameworks.framework_id');

    if (entity_id) query = query.where({ 'grc_compliance_reports.entity_id': entity_id });
    if (regulator_id) query = query.where({ 'grc_compliance_reports.regulator_id': regulator_id });
    if (framework_id) query = query.where({ 'grc_compliance_reports.framework_id': framework_id });
    if (report_type) query = query.where({ 'grc_compliance_reports.report_type': report_type });
    if (report_status) query = query.where({ 'grc_compliance_reports.report_status': report_status });

    const reports = await query.orderBy('grc_compliance_reports.report_date', 'desc');

    res.json({
      success: true,
      message: 'Compliance reports retrieved successfully',
      data: reports,
      count: reports.length,
    });
  } catch (error) {
    logger.error('Get compliance reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance reports',
      error: error.message,
    });
  }
};

exports.createComplianceReport = async (req, res) => {
  try {
    const reportData = req.body;
    const [report] = await db('grc_compliance_reports')
      .insert(reportData)
      .returning('*');

    logger.info(`New compliance report created: ${report.report_name}`);

    res.status(201).json({
      success: true,
      message: 'Compliance report created successfully',
      data: report,
    });
  } catch (error) {
    logger.error('Create compliance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create compliance report',
      error: error.message,
    });
  }
};

// Generate comprehensive compliance report for organization
exports.generateComplianceReport = async (req, res) => {
  try {
    const { entity_id, regulator_id, framework_id, report_type = 'Self-Assessment', auto_fetch_applicable = true } = req.body;

    if (!entity_id) {
      return res.status(400).json({
        success: false,
        message: 'Entity ID is required',
      });
    }

    // Get entity information
    const entity = await db('dga_entities')
      .where({ entity_id })
      .first();

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
      });
    }

    // AUTO-FETCH ALL APPLICABLE REGULATORS, FRAMEWORKS, AND CONTROLS
    let applicableRegulators = [];
    let applicableFrameworks = [];
    let applicableControls = [];

    if (auto_fetch_applicable) {
      // 1. Get all applicable regulators for this entity
      let regulatorMappings = await db('grc_organization_regulators')
        .where({ entity_id, is_active: true })
        .select('regulator_id', 'applicability_reason', 'applicability_notes');

      let regulatorIds = regulatorMappings.map(m => m.regulator_id);

      // If no mappings exist, determine applicable regulators based on entity attributes
      if (regulatorIds.length === 0) {
        const applicableRegulatorIds = [];

        // Mandatory regulators (all entities)
        const mandatoryRegulators = await db('grc_regulators')
          .where({ jurisdiction: 'National', is_active: true })
          .whereIn('regulator_code', ['NCA', 'SDAIA', 'PDPL', 'MOC', 'MOF'])
          .select('regulator_id');

        applicableRegulatorIds.push(...mandatoryRegulators.map(r => r.regulator_id));

        // Sector-based regulators
        if (entity.sector) {
          const sectorRegulators = await db('grc_regulators')
            .where({ jurisdiction: 'Sector-Specific', is_active: true })
            .orWhere({ jurisdiction: 'Cross-Sector', is_active: true })
            .select('regulator_id');

          applicableRegulatorIds.push(...sectorRegulators.map(r => r.regulator_id));
        }

        // Geographic regulators (e.g., NEOM)
        if (entity.region === 'Northern' && entity.location_city === 'NEOM') {
          const neomRegulator = await db('grc_regulators')
            .where({ regulator_code: 'NEOM', is_active: true })
            .select('regulator_id')
            .first();

          if (neomRegulator) {
            applicableRegulatorIds.push(neomRegulator.regulator_id);
          }
        }

        // Remove duplicates
        regulatorIds = [...new Set(applicableRegulatorIds)];
      }

      // Get regulator details
      if (regulatorIds.length > 0) {
        let regulatorQuery = db('grc_regulators')
          .whereIn('regulator_id', regulatorIds)
          .where({ is_active: true });

        if (regulator_id) {
          regulatorQuery = regulatorQuery.where({ regulator_id });
        }

        applicableRegulators = await regulatorQuery.select('*');

        // 2. Get all frameworks for applicable regulators
        const activeRegulatorIds = applicableRegulators.map(r => r.regulator_id);

        if (activeRegulatorIds.length > 0) {
          let frameworkQuery = db('grc_frameworks')
            .whereIn('regulator_id', activeRegulatorIds)
            .where({ is_active: true });

          if (regulator_id) {
            frameworkQuery = frameworkQuery.where({ regulator_id });
          }

          applicableFrameworks = await frameworkQuery.select('*');

          // 3. Get all controls for applicable frameworks
          const frameworkIds = applicableFrameworks.map(f => f.framework_id);

          if (frameworkIds.length > 0) {
            let controlQuery = db('grc_controls')
              .whereIn('framework_id', frameworkIds);

            if (framework_id) {
              controlQuery = controlQuery.where({ framework_id });
            }

            applicableControls = await controlQuery.select('*');
          }
        }
      }
    }

    // Get assessments for the entity
    let assessmentQuery = db('grc_control_assessments')
      .where({ entity_id });

    if (framework_id) {
      assessmentQuery = assessmentQuery.where({ framework_id });
    }

    const assessments = await assessmentQuery
      .select(
        'grc_control_assessments.*',
        'grc_controls.control_name_en',
        'grc_controls.control_name_ar',
        'grc_controls.control_code',
        'grc_frameworks.framework_name_en',
        'grc_frameworks.framework_name_ar'
      )
      .leftJoin('grc_controls', 'grc_control_assessments.control_id', 'grc_controls.control_id')
      .leftJoin('grc_frameworks', 'grc_control_assessments.framework_id', 'grc_frameworks.framework_id');

    // Calculate compliance metrics
    const totalControls = assessments.length;
    const compliantControls = assessments.filter(a => a.assessment_status === 'Compliant').length;
    const partialControls = assessments.filter(a => a.assessment_status === 'Partially Compliant').length;
    const nonCompliantControls = assessments.filter(a => a.assessment_status === 'Non-Compliant').length;
    const notAssessedControls = assessments.filter(a => a.assessment_status === 'Not Assessed').length;

    const compliancePercentage = totalControls > 0
      ? ((compliantControls + (partialControls * 0.5)) / totalControls) * 100
      : 0;

    // Get regulator and framework info if provided
    let regulator = null;
    let framework = null;

    if (regulator_id) {
      regulator = await db('grc_regulators')
        .where({ regulator_id })
        .first();
    }

    if (framework_id) {
      framework = await db('grc_frameworks')
        .where({ framework_id })
        .first();
    }

    // Get evidence count
    const evidenceCount = await db('grc_evidence')
      .whereIn('assessment_id', assessments.map(a => a.assessment_id))
      .count('* as count')
      .first();

    // Get implementation plans
    const plans = await db('grc_implementation_plans')
      .where({ entity_id })
      .whereIn('plan_status', ['Approved', 'In Progress'])
      .select('*');

    // Generate executive summary
    const executiveSummary = `This compliance report for ${entity.entity_name_en} covers ${totalControls} controls across ${framework ? framework.framework_name_en : 'multiple frameworks'}. 
    Overall compliance: ${compliancePercentage.toFixed(1)}%. 
    ${compliantControls} controls are fully compliant, ${partialControls} are partially compliant, and ${nonCompliantControls} require attention.`;

    // Key findings
    const keyFindings = [
      `Total controls assessed: ${totalControls}`,
      `Compliance rate: ${compliancePercentage.toFixed(1)}%`,
      `Evidence documents: ${evidenceCount?.count || 0}`,
      `Active implementation plans: ${plans.length}`,
      nonCompliantControls > 0 ? `${nonCompliantControls} controls require immediate attention` : 'All assessed controls meet compliance requirements',
    ].join('\n');

    // Recommendations
    const recommendations = [];
    if (nonCompliantControls > 0) {
      recommendations.push(`Address ${nonCompliantControls} non-compliant controls immediately`);
    }
    if (partialControls > 0) {
      recommendations.push(`Improve ${partialControls} partially compliant controls to full compliance`);
    }
    if (notAssessedControls > 0) {
      recommendations.push(`Complete assessment for ${notAssessedControls} unassessed controls`);
    }
    if (plans.length === 0 && nonCompliantControls > 0) {
      recommendations.push('Create implementation plans for non-compliant controls');
    }

    // Create report record
    const reportData = {
      entity_id,
      regulator_id: regulator_id || null,
      framework_id: framework_id || null,
      report_type,
      report_name: `${entity.entity_name_en} - Compliance Report - ${new Date().toISOString().split('T')[0]}`,
      executive_summary: executiveSummary,
      report_period_start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      report_period_end: new Date(),
      report_date: new Date(),
      report_status: 'Draft',
      overall_compliance_percentage: parseFloat(compliancePercentage.toFixed(2)),
      total_controls_assessed: totalControls,
      compliant_controls: compliantControls,
      non_compliant_controls: nonCompliantControls,
      partial_compliant_controls: partialControls,
      key_findings: keyFindings,
      recommendations: recommendations.join('\n'),
      prepared_by: req.user?.user_id || null,
    };

    const [report] = await db('grc_compliance_reports')
      .insert(reportData)
      .returning('*');

    // Calculate applicable vs assessed
    const totalApplicableControls = applicableControls.length;
    const assessedControls = assessments.length;
    const unassessedControls = totalApplicableControls - assessedControls;
    const assessmentCoverage = totalApplicableControls > 0
      ? (assessedControls / totalApplicableControls) * 100
      : 0;

    // Return comprehensive report data
    res.json({
      success: true,
      message: 'Compliance report generated successfully',
      data: {
        report,
        entity: {
          entity_id: entity.entity_id,
          entity_name_en: entity.entity_name_en,
          entity_name_ar: entity.entity_name_ar,
          entity_type: entity.entity_type,
          sector: entity.sector,
          region: entity.region,
        },
        regulator: regulator ? {
          regulator_id: regulator.regulator_id,
          regulator_name_en: regulator.regulator_name_en,
          regulator_name_ar: regulator.regulator_name_ar,
        } : null,
        framework: framework ? {
          framework_id: framework.framework_id,
          framework_name_en: framework.framework_name_en,
          framework_name_ar: framework.framework_name_ar,
        } : null,
        // AUTO-FETCHED APPLICABLE ITEMS
        applicable_items: {
          regulators: applicableRegulators.map(r => ({
            regulator_id: r.regulator_id,
            regulator_code: r.regulator_code,
            regulator_name_en: r.regulator_name_en,
            regulator_name_ar: r.regulator_name_ar,
            regulator_type: r.regulator_type,
            jurisdiction: r.jurisdiction,
          })),
          frameworks: applicableFrameworks.map(f => ({
            framework_id: f.framework_id,
            framework_code: f.framework_code,
            framework_name_en: f.framework_name_en,
            framework_name_ar: f.framework_name_ar,
            framework_type: f.framework_type,
            compliance_level: f.compliance_level,
            regulator_id: f.regulator_id,
          })),
          controls: applicableControls.map(c => ({
            control_id: c.control_id,
            control_code: c.control_code,
            control_name_en: c.control_name_en,
            control_name_ar: c.control_name_ar,
            control_type: c.control_type,
            control_category: c.control_category,
            priority: c.priority,
            is_mandatory: c.is_mandatory,
            framework_id: c.framework_id,
          })),
          summary: {
            total_applicable_regulators: applicableRegulators.length,
            total_applicable_frameworks: applicableFrameworks.length,
            total_applicable_controls: totalApplicableControls,
            assessed_controls: assessedControls,
            unassessed_controls: unassessedControls,
            assessment_coverage_percentage: parseFloat(assessmentCoverage.toFixed(2)),
          },
        },
        metrics: {
          totalControls: totalControls,
          totalApplicableControls: totalApplicableControls,
          assessedControls: assessedControls,
          unassessedControls: unassessedControls,
          compliantControls,
          partialControls,
          nonCompliantControls,
          notAssessedControls,
          compliancePercentage: parseFloat(compliancePercentage.toFixed(2)),
          assessmentCoveragePercentage: parseFloat(assessmentCoverage.toFixed(2)),
          evidenceCount: parseInt(evidenceCount?.count || 0),
          activePlans: plans.length,
        },
        assessments: assessments.map(a => ({
          assessment_id: a.assessment_id,
          control_code: a.control_code,
          control_name_en: a.control_name_en,
          control_name_ar: a.control_name_ar,
          framework_name_en: a.framework_name_en,
          assessment_status: a.assessment_status,
          implementation_status: a.implementation_status,
          implementation_percentage: a.implementation_percentage,
        })),
        plans: plans.map(p => ({
          plan_id: p.plan_id,
          plan_name: p.plan_name,
          plan_status: p.plan_status,
          completion_percentage: p.completion_percentage,
        })),
      },
    });
  } catch (error) {
    logger.error('Generate compliance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error.message,
    });
  }
};

// ========== AUTO-MAPPING ENGINE ==========

exports.autoMapRegulators = async (req, res) => {
  try {
    const { entity_id } = req.params;

    // Get entity details
    const entity = await db('dga_entities').where({ entity_id }).first();
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
      });
    }

    const mappedRegulators = [];

    // 1. Sector-based regulators
    if (entity.sector) {
      const sectorRegulators = await db('grc_regulators')
        .where({ jurisdiction: 'Sector-Specific' })
        .orWhere({ jurisdiction: 'Cross-Sector' });
      
      // Map based on sector (simplified - can be enhanced with sector-regulator mapping table)
      mappedRegulators.push(...sectorRegulators.map(r => ({
        regulator_id: r.regulator_id,
        applicability_reason: 'Sector-Based',
        applicability_notes: `Automatically mapped based on sector: ${entity.sector}`,
      })));
    }

    // 2. Mandatory regulators (all entities)
    const mandatoryRegulators = await db('grc_regulators')
      .where({ jurisdiction: 'National' })
      .whereIn('regulator_code', ['NCA', 'SDAIA', 'PDPL']); // Example mandatory regulators

    mappedRegulators.push(...mandatoryRegulators.map(r => ({
      regulator_id: r.regulator_id,
      applicability_reason: 'Mandatory',
      applicability_notes: 'Mandatory regulator for all entities',
    })));

    // 3. Geographic regulators
    if (entity.region === 'Northern' && entity.location_city === 'NEOM') {
      const neomRegulator = await db('grc_regulators')
        .where({ regulator_code: 'NEOM' })
        .first();
      
      if (neomRegulator) {
        mappedRegulators.push({
          regulator_id: neomRegulator.regulator_id,
          applicability_reason: 'Geographic',
          applicability_notes: 'NEOM region regulator',
        });
      }
    }

    // Remove duplicates
    const uniqueRegulators = Array.from(
      new Map(mappedRegulators.map(r => [r.regulator_id, r])).values()
    );

    // Create mappings
    const createdMappings = [];
    for (const regulator of uniqueRegulators) {
      const existing = await db('grc_organization_regulators')
        .where({ entity_id, regulator_id: regulator.regulator_id })
        .first();

      if (!existing) {
        const [mapping] = await db('grc_organization_regulators')
          .insert({
            entity_id,
            regulator_id: regulator.regulator_id,
            applicability_reason: regulator.applicability_reason,
            applicability_notes: regulator.applicability_notes,
            effective_date: new Date(),
            is_active: true,
          })
          .returning('*');
        
        createdMappings.push(mapping);
      }
    }

    logger.info(`Auto-mapped ${createdMappings.length} regulators for entity ${entity_id}`);

    res.json({
      success: true,
      message: 'Regulators auto-mapped successfully',
      data: {
        entity_id,
        mapped_count: createdMappings.length,
        mappings: createdMappings,
      },
    });
  } catch (error) {
    logger.error('Auto-map regulators error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-map regulators',
      error: error.message,
    });
  }
};

// ========== MULTI-RESPONSIBLE ASSIGNMENT & SLA TRACKING ==========

exports.autoAssignPlanResponsibles = async (req, res) => {
  try {
    const { plan_id } = req.params;
    const assignmentService = require('../services/assignment.service');

    const plan = await db('grc_implementation_plans')
      .where({ plan_id })
      .first();

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    const assignmentResult = await assignmentService.autoAssignPlanResponsibles(
      plan.entity_id,
      plan
    );

    // Update plan with new assignments
    await db('grc_implementation_plans')
      .where({ plan_id })
      .update({
        responsible_persons: assignmentResult.responsible_persons,
        sla_start_date: assignmentResult.sla_start_date,
        sla_target_date: assignmentResult.sla_target_date,
        sla_target_days: assignmentResult.sla_target_days,
        auto_assignment_rules: assignmentResult.auto_assignment_rules,
        last_auto_assignment_at: assignmentResult.last_auto_assignment_at,
        sla_status: 'On Track',
        sla_compliance_percentage: 100,
      });

    res.json({
      success: true,
      message: 'Responsible persons auto-assigned successfully',
      data: assignmentResult,
    });
  } catch (error) {
    logger.error('Auto-assign plan responsibles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-assign responsible persons',
      error: error.message,
    });
  }
};

exports.autoAssignTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const assignmentService = require('../services/assignment.service');

    const task = await db('grc_implementation_tasks')
      .where({ task_id })
      .first();

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const assignmentResult = await assignmentService.autoAssignTask(task, task.plan_id);

    // Update task with assignments
    await db('grc_implementation_tasks')
      .where({ task_id })
      .update({
        assignees: assignmentResult.assignees,
        sla_start_time: assignmentResult.sla_start_time,
        sla_target_time: assignmentResult.sla_target_time,
        sla_target_hours: assignmentResult.sla_target_hours,
        auto_assigned: assignmentResult.auto_assigned,
        auto_assignment_rules: assignmentResult.auto_assignment_rules,
        auto_assigned_at: assignmentResult.auto_assigned_at,
        sla_status: 'On Track',
        sla_compliance_percentage: 100,
      });

    res.json({
      success: true,
      message: 'Task auto-assigned successfully',
      data: assignmentResult,
    });
  } catch (error) {
    logger.error('Auto-assign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-assign task',
      error: error.message,
    });
  }
};

exports.updateSLATracking = async (req, res) => {
  try {
    const { item_type, item_id } = req.params;
    const assignmentService = require('../services/assignment.service');

    const updates = await assignmentService.updateSLATracking(item_type, item_id);

    res.json({
      success: true,
      message: 'SLA tracking updated successfully',
      data: updates,
    });
  } catch (error) {
    logger.error('Update SLA tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SLA tracking',
      error: error.message,
    });
  }
};

exports.getSLATracking = async (req, res) => {
  try {
    const { item_type, item_id, sla_status } = req.query;
    let query = db('grc_sla_tracking')
      .select('*');

    if (item_type) query = query.where({ item_type });
    if (item_id) query = query.where({ item_id });
    if (sla_status) query = query.where({ sla_status });

    const slaRecords = await query.orderBy('sla_target_time', 'asc');

    res.json({
      success: true,
      message: 'SLA tracking retrieved successfully',
      data: slaRecords,
      count: slaRecords.length,
    });
  } catch (error) {
    logger.error('Get SLA tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve SLA tracking',
      error: error.message,
    });
  }
};

exports.getRoleActions = async (req, res) => {
  try {
    const { user_role, entity_sector, entity_region } = req.query;
    const assignmentService = require('../services/assignment.service');

    const actions = await assignmentService.getRoleActions(user_role, entity_sector, entity_region);

    res.json({
      success: true,
      message: 'Role actions retrieved successfully',
      data: actions,
      count: actions.length,
    });
  } catch (error) {
    logger.error('Get role actions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve role actions',
      error: error.message,
    });
  }
};

exports.createInternalAction = async (req, res) => {
  try {
    const actionData = req.body;
    actionData.initiated_by = req.user?.user_id || actionData.initiated_by;

    if (!actionData.initiated_by) {
      return res.status(400).json({
        success: false,
        message: 'initiated_by is required',
      });
    }

    const assignmentService = require('../services/assignment.service');
    const action = await assignmentService.createInternalAction(actionData);

    res.status(201).json({
      success: true,
      message: 'Internal action created successfully',
      data: action,
    });
  } catch (error) {
    logger.error('Create internal action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create internal action',
      error: error.message,
    });
  }
};

exports.getTaskAssignments = async (req, res) => {
  try {
    const { task_id, user_id, assignment_status } = req.query;
    let query = db('grc_task_assignments')
      .select(
        'grc_task_assignments.*',
        'users.full_name',
        'users.email',
        'users.role as current_role'
      )
      .leftJoin('users', 'grc_task_assignments.user_id', 'users.user_id');

    if (task_id) query = query.where({ 'grc_task_assignments.task_id': task_id });
    if (user_id) query = query.where({ 'grc_task_assignments.user_id': user_id });
    if (assignment_status) query = query.where({ 'grc_task_assignments.assignment_status': assignment_status });

    const assignments = await query.orderBy('grc_task_assignments.assigned_at', 'desc');

    res.json({
      success: true,
      message: 'Task assignments retrieved successfully',
      data: assignments,
      count: assignments.length,
    });
  } catch (error) {
    logger.error('Get task assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve task assignments',
      error: error.message,
    });
  }
};

