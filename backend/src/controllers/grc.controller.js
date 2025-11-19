const { db } = require('../config/database');
const logger = require('../utils/logger');

// ========== GRC DASHBOARD ==========

exports.getDashboard = async (req, res) => {
  try {
    // Get risk summary
    const riskSummary = await db('risks')
      .select(
        db.raw('COUNT(*) as total_risks'),
        db.raw('COUNT(CASE WHEN severity = \'High\' THEN 1 END) as high_risks'),
        db.raw('COUNT(CASE WHEN severity = \'Medium\' THEN 1 END) as medium_risks'),
        db.raw('COUNT(CASE WHEN severity = \'Low\' THEN 1 END) as low_risks')
      )
      .first();

    // Get compliance summary
    const complianceSummary = await db('compliance_records')
      .select(
        db.raw('COUNT(*) as total_records'),
        db.raw('COUNT(CASE WHEN status = \'Compliant\' THEN 1 END) as compliant'),
        db.raw('COUNT(CASE WHEN status = \'Non-Compliant\' THEN 1 END) as non_compliant'),
        db.raw('COUNT(CASE WHEN status = \'In Progress\' THEN 1 END) as in_progress')
      )
      .first();

    // Get recent risks
    const recentRisks = await db('risks')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(5);

    // Get recent compliance issues
    const recentCompliance = await db('compliance_records')
      .where({ status: 'Non-Compliant' })
      .select('*')
      .orderBy('audit_date', 'desc')
      .limit(5);

    // Get compliance by standard
    const complianceByStandard = await db('compliance_records')
      .select('standard_name', db.raw('COUNT(*) as count'))
      .groupBy('standard_name');

    res.json({
      success: true,
      message: 'GRC dashboard data retrieved successfully',
      data: {
        riskSummary,
        complianceSummary,
        recentRisks,
        recentCompliance,
        complianceByStandard,
      },
    });
  } catch (error) {
    logger.error('Get GRC dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve GRC dashboard',
      error: error.message,
    });
  }
};

exports.getInsights = async (req, res) => {
  try {
    // AI-powered insights (simulated - can be enhanced with ML models)
    const insights = {
      highRisks: await db('risks')
        .where({ severity: 'High' })
        .count('* as count')
        .first(),
      upcomingComplianceDeadlines: await db('compliance_records')
        .where({ status: 'In Progress' })
        .select('*')
        .orderBy('audit_date', 'asc')
        .limit(5),
      riskTrends: await db('risks')
        .select(db.raw('DATE(created_at) as date'), db.raw('COUNT(*) as count'))
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date', 'desc')
        .limit(30),
      recommendations: [
        {
          type: 'risk',
          priority: 'high',
          message: 'High severity risks require immediate attention',
          action: 'Review and mitigate high severity risks',
        },
        {
          type: 'compliance',
          priority: 'medium',
          message: '5 compliance audits due in next 30 days',
          action: 'Schedule compliance audits',
        },
      ],
    };

    res.json({
      success: true,
      message: 'Insights retrieved successfully',
      data: insights,
    });
  } catch (error) {
    logger.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve insights',
      error: error.message,
    });
  }
};

// ========== RISK MANAGEMENT ==========

exports.getAllRisks = async (req, res) => {
  try {
    const { severity, status, entity_id, page = 1, limit = 50 } = req.query;
    
    let query = db('risks').select('risks.*', 'dga_entities.entity_name_en', 'dga_entities.entity_name_ar');
    
    query = query.leftJoin('dga_entities', 'risks.entity_id', 'dga_entities.entity_id');
    
    if (severity) query = query.where({ 'risks.severity': severity });
    if (status) query = query.where({ 'risks.status': status });
    if (entity_id) query = query.where({ 'risks.entity_id': entity_id });
    
    const offset = (page - 1) * limit;
    const risks = await query.limit(limit).offset(offset).orderBy('risks.created_at', 'desc');
    
    const total = await db('risks').count('* as count').first();
    
    res.json({
      success: true,
      message: 'Risks retrieved successfully',
      data: {
        risks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get all risks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risks',
      error: error.message,
    });
  }
};

exports.getRiskById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const risk = await db('risks')
      .select('risks.*', 'dga_entities.entity_name_en', 'dga_entities.entity_name_ar')
      .leftJoin('dga_entities', 'risks.entity_id', 'dga_entities.entity_id')
      .where({ 'risks.risk_id': id })
      .first();
    
    if (!risk) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Risk retrieved successfully',
      data: risk,
    });
  } catch (error) {
    logger.error('Get risk by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk',
      error: error.message,
    });
  }
};

exports.createRisk = async (req, res) => {
  try {
    const riskData = req.body;
    
    const [newRisk] = await db('risks')
      .insert(riskData)
      .returning('*');
    
    logger.info(`New risk created: ${newRisk.risk_name}`);
    
    res.status(201).json({
      success: true,
      message: 'Risk created successfully',
      data: newRisk,
    });
  } catch (error) {
    logger.error('Create risk error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create risk',
      error: error.message,
    });
  }
};

exports.updateRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const [updatedRisk] = await db('risks')
      .where({ risk_id: id })
      .update(updateData)
      .returning('*');
    
    if (!updatedRisk) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Risk updated successfully',
      data: updatedRisk,
    });
  } catch (error) {
    logger.error('Update risk error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update risk',
      error: error.message,
    });
  }
};

exports.deleteRisk = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await db('risks')
      .where({ risk_id: id })
      .del();
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Risk deleted successfully',
    });
  } catch (error) {
    logger.error('Delete risk error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete risk',
      error: error.message,
    });
  }
};

exports.getRiskAnalytics = async (req, res) => {
  try {
    const analytics = {
      bySeverity: await db('risks')
        .select('severity', db.raw('COUNT(*) as count'))
        .groupBy('severity'),
      byStatus: await db('risks')
        .select('status', db.raw('COUNT(*) as count'))
        .groupBy('status'),
      byEntity: await db('risks')
        .select('dga_entities.entity_name_en', db.raw('COUNT(*) as count'))
        .leftJoin('dga_entities', 'risks.entity_id', 'dga_entities.entity_id')
        .groupBy('dga_entities.entity_name_en')
        .orderBy('count', 'desc')
        .limit(10),
    };
    
    res.json({
      success: true,
      message: 'Risk analytics retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    logger.error('Get risk analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk analytics',
      error: error.message,
    });
  }
};

exports.getRiskTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const trends = await db('risks')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as count'),
        db.raw('AVG(risk_score) as avg_score')
      )
      .where('created_at', '>=', db.raw(`CURRENT_DATE - INTERVAL '${days} days'`))
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');
    
    res.json({
      success: true,
      message: 'Risk trends retrieved successfully',
      data: trends,
    });
  } catch (error) {
    logger.error('Get risk trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk trends',
      error: error.message,
    });
  }
};

// ========== COMPLIANCE MANAGEMENT ==========

exports.getAllCompliance = async (req, res) => {
  try {
    const { standard_name, status, entity_id, page = 1, limit = 50 } = req.query;
    
    let query = db('compliance_records')
      .select('compliance_records.*', 'dga_entities.entity_name_en', 'dga_entities.entity_name_ar');
    
    query = query.leftJoin('dga_entities', 'compliance_records.entity_id', 'dga_entities.entity_id');
    
    if (standard_name) query = query.where({ 'compliance_records.standard_name': standard_name });
    if (status) query = query.where({ 'compliance_records.status': status });
    if (entity_id) query = query.where({ 'compliance_records.entity_id': entity_id });
    
    const offset = (page - 1) * limit;
    const compliance = await query.limit(limit).offset(offset).orderBy('compliance_records.audit_date', 'desc');
    
    const total = await db('compliance_records').count('* as count').first();
    
    res.json({
      success: true,
      message: 'Compliance records retrieved successfully',
      data: {
        compliance,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get all compliance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance records',
      error: error.message,
    });
  }
};

exports.getComplianceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const compliance = await db('compliance_records')
      .select('compliance_records.*', 'dga_entities.entity_name_en', 'dga_entities.entity_name_ar')
      .leftJoin('dga_entities', 'compliance_records.entity_id', 'dga_entities.entity_id')
      .where({ 'compliance_records.compliance_id': id })
      .first();
    
    if (!compliance) {
      return res.status(404).json({
        success: false,
        message: 'Compliance record not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Compliance record retrieved successfully',
      data: compliance,
    });
  } catch (error) {
    logger.error('Get compliance by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance record',
      error: error.message,
    });
  }
};

exports.createCompliance = async (req, res) => {
  try {
    const complianceData = req.body;
    
    const [newCompliance] = await db('compliance_records')
      .insert(complianceData)
      .returning('*');
    
    logger.info(`New compliance record created: ${newCompliance.standard_name}`);
    
    res.status(201).json({
      success: true,
      message: 'Compliance record created successfully',
      data: newCompliance,
    });
  } catch (error) {
    logger.error('Create compliance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create compliance record',
      error: error.message,
    });
  }
};

exports.updateCompliance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const [updatedCompliance] = await db('compliance_records')
      .where({ compliance_id: id })
      .update(updateData)
      .returning('*');
    
    if (!updatedCompliance) {
      return res.status(404).json({
        success: false,
        message: 'Compliance record not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Compliance record updated successfully',
      data: updatedCompliance,
    });
  } catch (error) {
    logger.error('Update compliance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update compliance record',
      error: error.message,
    });
  }
};

exports.getComplianceAnalytics = async (req, res) => {
  try {
    const analytics = {
      byStandard: await db('compliance_records')
        .select('standard_name', db.raw('COUNT(*) as count'))
        .groupBy('standard_name'),
      byStatus: await db('compliance_records')
        .select('status', db.raw('COUNT(*) as count'))
        .groupBy('status'),
      byEntity: await db('compliance_records')
        .select('dga_entities.entity_name_en', db.raw('COUNT(*) as count'))
        .leftJoin('dga_entities', 'compliance_records.entity_id', 'dga_entities.entity_id')
        .groupBy('dga_entities.entity_name_en')
        .orderBy('count', 'desc')
        .limit(10),
    };
    
    res.json({
      success: true,
      message: 'Compliance analytics retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    logger.error('Get compliance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance analytics',
      error: error.message,
    });
  }
};

exports.getComplianceByStandard = async (req, res) => {
  try {
    const { standard } = req.params;
    
    const compliance = await db('compliance_records')
      .select('compliance_records.*', 'dga_entities.entity_name_en', 'dga_entities.entity_name_ar')
      .leftJoin('dga_entities', 'compliance_records.entity_id', 'dga_entities.entity_id')
      .where({ 'compliance_records.standard_name': standard })
      .orderBy('audit_date', 'desc');
    
    res.json({
      success: true,
      message: `Compliance records for ${standard} retrieved successfully`,
      data: compliance,
    });
  } catch (error) {
    logger.error('Get compliance by standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance records',
      error: error.message,
    });
  }
};

exports.getEntityCompliance = async (req, res) => {
  try {
    const { entityId } = req.params;
    
    const compliance = await db('compliance_records')
      .where({ entity_id: entityId })
      .select('*')
      .orderBy('audit_date', 'desc');
    
    res.json({
      success: true,
      message: 'Entity compliance retrieved successfully',
      data: compliance,
    });
  } catch (error) {
    logger.error('Get entity compliance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve entity compliance',
      error: error.message,
    });
  }
};

// ========== GOVERNANCE ==========

exports.getGovernanceOverview = async (req, res) => {
  try {
    const overview = {
      totalPolicies: 0, // Can be extended with policies table
      totalFrameworks: 0, // Can be extended with frameworks table
      totalControls: 0, // Can be extended with controls table
      complianceRate: await db('compliance_records')
        .select(
          db.raw('COUNT(CASE WHEN status = \'Compliant\' THEN 1 END) * 100.0 / COUNT(*) as rate')
        )
        .first(),
    };
    
    res.json({
      success: true,
      message: 'Governance overview retrieved successfully',
      data: overview,
    });
  } catch (error) {
    logger.error('Get governance overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve governance overview',
      error: error.message,
    });
  }
};

exports.getGovernancePolicies = async (req, res) => {
  try {
    // Placeholder - can be extended with policies table
    res.json({
      success: true,
      message: 'Governance policies retrieved successfully',
      data: [],
    });
  } catch (error) {
    logger.error('Get governance policies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve governance policies',
      error: error.message,
    });
  }
};

exports.getGovernanceFrameworks = async (req, res) => {
  try {
    // Placeholder - can be extended with frameworks table
    res.json({
      success: true,
      message: 'Governance frameworks retrieved successfully',
      data: [],
    });
  } catch (error) {
    logger.error('Get governance frameworks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve governance frameworks',
      error: error.message,
    });
  }
};

exports.getGovernanceControls = async (req, res) => {
  try {
    // Placeholder - can be extended with controls table
    res.json({
      success: true,
      message: 'Governance controls retrieved successfully',
      data: [],
    });
  } catch (error) {
    logger.error('Get governance controls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve governance controls',
      error: error.message,
    });
  }
};

// ========== INSIGHTS & ANALYTICS ==========

exports.getRiskPredictions = async (req, res) => {
  try {
    // AI-powered risk predictions (simulated)
    const predictions = {
      highRiskEntities: await db('risks')
        .select('dga_entities.entity_name_en', db.raw('COUNT(*) as risk_count'))
        .leftJoin('dga_entities', 'risks.entity_id', 'dga_entities.entity_id')
        .where({ 'risks.severity': 'High' })
        .groupBy('dga_entities.entity_name_en')
        .orderBy('risk_count', 'desc')
        .limit(5),
      trendAnalysis: 'Increasing risk trend detected in 3 entities',
      recommendations: [
        'Implement additional controls for high-risk entities',
        'Schedule risk assessment reviews',
      ],
    };
    
    res.json({
      success: true,
      message: 'Risk predictions retrieved successfully',
      data: predictions,
    });
  } catch (error) {
    logger.error('Get risk predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk predictions',
      error: error.message,
    });
  }
};

exports.getComplianceTrends = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const trends = await db('compliance_records')
      .select(
        db.raw('DATE(audit_date) as date'),
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN status = \'Compliant\' THEN 1 END) as compliant')
      )
      .where('audit_date', '>=', db.raw(`CURRENT_DATE - INTERVAL '${days} days'`))
      .groupBy(db.raw('DATE(audit_date)'))
      .orderBy('date', 'asc');
    
    res.json({
      success: true,
      message: 'Compliance trends retrieved successfully',
      data: trends,
    });
  } catch (error) {
    logger.error('Get compliance trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance trends',
      error: error.message,
    });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const recommendations = [
      {
        id: 1,
        type: 'risk',
        priority: 'high',
        title: 'Address Critical Risks',
        description: '3 critical risks require immediate mitigation',
        action: 'Review and implement mitigation strategies',
      },
      {
        id: 2,
        type: 'compliance',
        priority: 'medium',
        title: 'Schedule Compliance Audits',
        description: '5 compliance audits due in next 30 days',
        action: 'Schedule and prepare for upcoming audits',
      },
    ];
    
    res.json({
      success: true,
      message: 'Recommendations retrieved successfully',
      data: recommendations,
    });
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendations',
      error: error.message,
    });
  }
};

exports.getHeatmap = async (req, res) => {
  try {
    const heatmap = await db('risks')
      .select(
        'dga_entities.entity_name_en',
        'dga_entities.region',
        'risks.severity',
        db.raw('COUNT(*) as risk_count')
      )
      .leftJoin('dga_entities', 'risks.entity_id', 'dga_entities.entity_id')
      .groupBy('dga_entities.entity_name_en', 'dga_entities.region', 'risks.severity');
    
    res.json({
      success: true,
      message: 'Heatmap data retrieved successfully',
      data: heatmap,
    });
  } catch (error) {
    logger.error('Get heatmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve heatmap',
      error: error.message,
    });
  }
};

// ========== REPORTS ==========

exports.getExecutiveSummary = async (req, res) => {
  try {
    const summary = {
      riskSummary: await db('risks')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN risk_level = \'Critical\' THEN 1 END) as critical')
        )
        .first(),
      complianceSummary: await db('compliance_records')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN status = \'Compliant\' THEN 1 END) as compliant')
        )
        .first(),
      topRisks: await db('risks')
        .select('*')
        .where({ severity: 'High' })
        .orderBy('created_at', 'desc')
        .limit(5),
    };
    
    res.json({
      success: true,
      message: 'Executive summary retrieved successfully',
      data: summary,
    });
  } catch (error) {
    logger.error('Get executive summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve executive summary',
      error: error.message,
    });
  }
};

exports.getRiskReport = async (req, res) => {
  try {
    const report = {
      overview: await db('risks')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN severity = \'High\' THEN 1 END) as high_risks')
        )
        .first(),
      bySeverity: await db('risks')
        .select('severity', db.raw('COUNT(*) as count'))
        .groupBy('severity'),
      byEntity: await db('risks')
        .select('dga_entities.entity_name_en', db.raw('COUNT(*) as count'))
        .leftJoin('dga_entities', 'risks.entity_id', 'dga_entities.entity_id')
        .groupBy('dga_entities.entity_name_en')
        .orderBy('count', 'desc'),
    };
    
    res.json({
      success: true,
      message: 'Risk report retrieved successfully',
      data: report,
    });
  } catch (error) {
    logger.error('Get risk report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk report',
      error: error.message,
    });
  }
};

exports.getComplianceReport = async (req, res) => {
  try {
    const report = {
      overview: await db('compliance_records')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN status = \'Compliant\' THEN 1 END) as compliant')
        )
        .first(),
      byStandard: await db('compliance_records')
        .select('standard_name', db.raw('COUNT(*) as count'))
        .groupBy('standard_name'),
      byStatus: await db('compliance_records')
        .select('status', db.raw('COUNT(*) as count'))
        .groupBy('status'),
    };
    
    res.json({
      success: true,
      message: 'Compliance report retrieved successfully',
      data: report,
    });
  } catch (error) {
    logger.error('Get compliance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance report',
      error: error.message,
    });
  }
};

