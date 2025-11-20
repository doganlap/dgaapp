/**
 * GRC Scoring, Leading Indicators & Guidance Controller
 * 
 * Provides:
 * - Compliance Scoring
 * - Risk Scoring
 * - Maturity Scoring
 * - Leading Indicators
 * - Guidance & Recommendations
 */

const { db } = require('../config/database');
const logger = require('../utils/logger');

// ========== COMPLIANCE SCORING ==========

exports.getComplianceScore = async (req, res) => {
  try {
    const { entity_id, framework_id, regulator_id } = req.query;

    let query = db('grc_control_assessments')
      .select(
        db.raw('COUNT(*) as total_controls'),
        db.raw('COUNT(CASE WHEN assessment_status = \'Compliant\' THEN 1 END) as compliant_controls'),
        db.raw('COUNT(CASE WHEN assessment_status = \'Partially Compliant\' THEN 1 END) as partial_controls'),
        db.raw('COUNT(CASE WHEN assessment_status = \'Non-Compliant\' THEN 1 END) as non_compliant_controls'),
        db.raw('AVG(COALESCE(implementation_percentage, 0)) as avg_implementation'),
        db.raw('COUNT(CASE WHEN implementation_status = \'Implemented\' THEN 1 END) as implemented_controls')
      );

    if (entity_id) query = query.where({ entity_id });
    if (framework_id) query = query.where({ framework_id });

    const result = await query.first();

    // Calculate compliance score (0-100)
    const total = parseInt(result.total_controls) || 0;
    const compliant = parseInt(result.compliant_controls) || 0;
    const partial = parseInt(result.partial_controls) || 0;
    const nonCompliant = parseInt(result.non_compliant_controls) || 0;

    let complianceScore = 0;
    if (total > 0) {
      // Full compliance = 100%, Partial = 50%, Non-compliant = 0%
      complianceScore = ((compliant * 100) + (partial * 50)) / total;
    }

    // Implementation score
    const implementationScore = parseFloat(result.avg_implementation) || 0;

    // Overall score (weighted: 70% compliance, 30% implementation)
    const overallScore = (complianceScore * 0.7) + (implementationScore * 0.3);

    // Score grade
    let grade = 'F';
    let gradeColor = 'red';
    if (overallScore >= 90) { grade = 'A'; gradeColor = 'green'; }
    else if (overallScore >= 80) { grade = 'B'; gradeColor = 'blue'; }
    else if (overallScore >= 70) { grade = 'C'; gradeColor = 'yellow'; }
    else if (overallScore >= 60) { grade = 'D'; gradeColor = 'orange'; }

    res.json({
      success: true,
      message: 'Compliance score calculated successfully',
      data: {
        compliance_score: Math.round(complianceScore * 100) / 100,
        implementation_score: Math.round(implementationScore * 100) / 100,
        overall_score: Math.round(overallScore * 100) / 100,
        grade,
        grade_color: gradeColor,
        breakdown: {
          total_controls: total,
          compliant: compliant,
          partial: partial,
          non_compliant: nonCompliant,
          implemented: parseInt(result.implemented_controls) || 0,
        },
        trends: await getComplianceTrends(entity_id, framework_id),
      },
    });
  } catch (error) {
    logger.error('Get compliance score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate compliance score',
      error: error.message,
    });
  }
};

// ========== RISK SCORING ==========

exports.getRiskScore = async (req, res) => {
  try {
    const { entity_id, framework_id } = req.query;

    let query = db('risks')
      .select(
        db.raw('COUNT(*) as total_risks'),
        db.raw('COUNT(CASE WHEN severity = \'High\' THEN 1 END) as high_risks'),
        db.raw('COUNT(CASE WHEN severity = \'Medium\' THEN 1 END) as medium_risks'),
        db.raw('COUNT(CASE WHEN severity = \'Low\' THEN 1 END) as low_risks'),
        db.raw('AVG(COALESCE(risk_score, 0)) as avg_risk_score'),
        db.raw('AVG(COALESCE(likelihood, 0)) as avg_likelihood'),
        db.raw('AVG(COALESCE(impact, 0)) as avg_impact'),
        db.raw('COUNT(CASE WHEN status = \'Open\' THEN 1 END) as open_risks'),
        db.raw('COUNT(CASE WHEN status = \'Mitigated\' THEN 1 END) as mitigated_risks')
      );

    if (entity_id) query = query.where({ entity_id });
    if (framework_id) query = query.where({ framework_id });

    const result = await query.first();

    const total = parseInt(result.total_risks) || 0;
    const high = parseInt(result.high_risks) || 0;
    const medium = parseInt(result.medium_risks) || 0;
    const low = parseInt(result.low_risks) || 0;
    const open = parseInt(result.open_risks) || 0;
    const mitigated = parseInt(result.mitigated_risks) || 0;

    // Risk score (0-100, where 100 = no risks, 0 = critical risks)
    // High risk = -30 points, Medium = -15, Low = -5
    let riskScore = 100;
    if (total > 0) {
      riskScore = Math.max(0, 100 - (high * 30) - (medium * 15) - (low * 5));
    }

    // Mitigation effectiveness
    const mitigationRate = total > 0 ? (mitigated / total) * 100 : 100;

    // Overall risk score (weighted: 60% risk level, 40% mitigation)
    const overallRiskScore = (riskScore * 0.6) + (mitigationRate * 0.4);

    // Risk level
    let riskLevel = 'Low';
    let riskColor = 'green';
    if (overallRiskScore < 40) { riskLevel = 'Critical'; riskColor = 'red'; }
    else if (overallRiskScore < 60) { riskLevel = 'High'; riskColor = 'orange'; }
    else if (overallRiskScore < 80) { riskLevel = 'Medium'; riskColor = 'yellow'; }

    res.json({
      success: true,
      message: 'Risk score calculated successfully',
      data: {
        risk_score: Math.round(overallRiskScore * 100) / 100,
        risk_level: riskLevel,
        risk_color: riskColor,
        breakdown: {
          total_risks: total,
          high: high,
          medium: medium,
          low: low,
          open: open,
          mitigated: mitigated,
        },
        metrics: {
          avg_risk_score: parseFloat(result.avg_risk_score) || 0,
          avg_likelihood: parseFloat(result.avg_likelihood) || 0,
          avg_impact: parseFloat(result.avg_impact) || 0,
          mitigation_rate: Math.round(mitigationRate * 100) / 100,
        },
        trends: await getRiskTrends(entity_id, framework_id),
      },
    });
  } catch (error) {
    logger.error('Get risk score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate risk score',
      error: error.message,
    });
  }
};

// ========== MATURITY SCORING ==========

exports.getMaturityScore = async (req, res) => {
  try {
    const { entity_id } = req.params;

    // Get maturity from digital_maturity_scores if available
    const maturityData = await db('digital_maturity_scores')
      .where({ entity_id })
      .orderBy('assessment_date', 'desc')
      .first();

    // Calculate maturity from GRC data
    const complianceScore = await calculateComplianceScore(entity_id);
    const riskScore = await calculateRiskScore(entity_id);
    const implementationRate = await calculateImplementationRate(entity_id);

    // Maturity score (weighted average)
    const maturityScore = (
      complianceScore * 0.4 +
      riskScore * 0.3 +
      implementationRate * 0.3
    );

    // Maturity level
    let maturityLevel = 'Initial';
    let maturityColor = 'red';
    if (maturityScore >= 80) { maturityLevel = 'Optimized'; maturityColor = 'green'; }
    else if (maturityScore >= 65) { maturityLevel = 'Managed'; maturityColor = 'blue'; }
    else if (maturityScore >= 50) { maturityLevel = 'Defined'; maturityColor = 'yellow'; }
    else if (maturityScore >= 35) { maturityLevel = 'Repeatable'; maturityColor = 'orange'; }

    res.json({
      success: true,
      message: 'Maturity score calculated successfully',
      data: {
        maturity_score: Math.round(maturityScore * 100) / 100,
        maturity_level: maturityLevel,
        maturity_color: maturityColor,
        components: {
          compliance_score: Math.round(complianceScore * 100) / 100,
          risk_score: Math.round(riskScore * 100) / 100,
          implementation_rate: Math.round(implementationRate * 100) / 100,
        },
        historical: maturityData || null,
        recommendations: await getMaturityRecommendations(maturityScore, maturityLevel),
      },
    });
  } catch (error) {
    logger.error('Get maturity score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate maturity score',
      error: error.message,
    });
  }
};

// ========== LEADING INDICATORS ==========

exports.getLeadingIndicators = async (req, res) => {
  try {
    const { entity_id } = req.query;

    const indicators = {
      // Compliance Leading Indicators
      compliance_velocity: await getComplianceVelocity(entity_id),
      assessment_frequency: await getAssessmentFrequency(entity_id),
      remediation_time: await getRemediationTime(entity_id),
      
      // Risk Leading Indicators
      risk_trend: await getRiskTrend(entity_id),
      new_risks_rate: await getNewRisksRate(entity_id),
      mitigation_velocity: await getMitigationVelocity(entity_id),
      
      // Implementation Leading Indicators
      implementation_velocity: await getImplementationVelocity(entity_id),
      plan_completion_rate: await getPlanCompletionRate(entity_id),
      task_throughput: await getTaskThroughput(entity_id),
      
      // Predictive Indicators
      compliance_forecast: await getComplianceForecast(entity_id),
      risk_forecast: await getRiskForecast(entity_id),
      maturity_forecast: await getMaturityForecast(entity_id),
    };

    // Overall leading indicator score
    const leadingScore = calculateLeadingScore(indicators);

    res.json({
      success: true,
      message: 'Leading indicators retrieved successfully',
      data: {
        leading_score: leadingScore,
        indicators,
        insights: generateLeadingInsights(indicators),
        recommendations: generateLeadingRecommendations(indicators),
      },
    });
  } catch (error) {
    logger.error('Get leading indicators error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leading indicators',
      error: error.message,
    });
  }
};

// ========== GUIDANCE & RECOMMENDATIONS ==========

exports.getGuidance = async (req, res) => {
  try {
    const { entity_id, framework_id, control_id, context } = req.query;

    const guidance = {
      // Framework-specific guidance
      framework_guidance: framework_id ? await getFrameworkGuidance(framework_id) : null,
      
      // Control-specific guidance
      control_guidance: control_id ? await getControlGuidance(control_id) : null,
      
      // Entity-specific guidance
      entity_guidance: entity_id ? await getEntityGuidance(entity_id) : null,
      
      // Best practices
      best_practices: await getBestPractices(context),
      
      // Recommendations
      recommendations: await getRecommendations(entity_id, framework_id),
      
      // Implementation roadmap
      roadmap: entity_id ? await getImplementationRoadmap(entity_id) : null,
    };

    res.json({
      success: true,
      message: 'Guidance retrieved successfully',
      data: guidance,
    });
  } catch (error) {
    logger.error('Get guidance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guidance',
      error: error.message,
    });
  }
};

// ========== HELPER FUNCTIONS ==========

async function calculateComplianceScore(entityId) {
  const result = await db('grc_control_assessments')
    .where({ entity_id: entityId })
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('COUNT(CASE WHEN assessment_status = \'Compliant\' THEN 1 END) as compliant'),
      db.raw('COUNT(CASE WHEN assessment_status = \'Partially Compliant\' THEN 1 END) as partial')
    )
    .first();
  
  const total = parseInt(result.total) || 0;
  if (total === 0) return 0;
  
  return ((parseInt(result.compliant) * 100) + (parseInt(result.partial) * 50)) / total;
}

async function calculateRiskScore(entityId) {
  const result = await db('risks')
    .where({ entity_id: entityId })
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('COUNT(CASE WHEN severity = \'High\' THEN 1 END) as high'),
      db.raw('COUNT(CASE WHEN severity = \'Medium\' THEN 1 END) as medium'),
      db.raw('COUNT(CASE WHEN severity = \'Low\' THEN 1 END) as low')
    )
    .first();
  
  const total = parseInt(result.total) || 0;
  if (total === 0) return 100;
  
  const riskScore = Math.max(0, 100 - (parseInt(result.high) * 30) - (parseInt(result.medium) * 15) - (parseInt(result.low) * 5));
  return riskScore;
}

async function calculateImplementationRate(entityId) {
  const result = await db('grc_control_assessments')
    .where({ entity_id: entityId })
    .select(db.raw('AVG(implementation_percentage) as avg'))
    .first();
  
  return parseFloat(result.avg) || 0;
}

async function getComplianceTrends(entityId, frameworkId) {
  // Get compliance trends over last 6 months
  const trends = await db('grc_control_assessments')
    .where({ entity_id: entityId })
    .where(function() {
      if (frameworkId) this.where({ framework_id: frameworkId });
    })
    .select(
      db.raw('DATE_TRUNC(\'month\', assessment_date) as month'),
      db.raw('COUNT(CASE WHEN assessment_status = \'Compliant\' THEN 1 END)::float / COUNT(*) * 100 as compliance_rate')
    )
    .whereNotNull('assessment_date')
    .groupBy(db.raw('DATE_TRUNC(\'month\', assessment_date)'))
    .orderBy('month', 'desc')
    .limit(6);
  
  return trends;
}

async function getRiskTrends(entityId, frameworkId) {
  const trends = await db('risks')
    .where({ entity_id: entityId })
    .where(function() {
      if (frameworkId) this.where({ framework_id: frameworkId });
    })
    .select(
      db.raw('DATE_TRUNC(\'month\', created_at) as month'),
      db.raw('COUNT(*) as risk_count'),
      db.raw('AVG(COALESCE(risk_score, 0)) as avg_risk_score')
    )
    .groupBy(db.raw('DATE_TRUNC(\'month\', created_at)'))
    .orderBy('month', 'desc')
    .limit(6);
  
  return trends;
}

async function getComplianceVelocity(entityId) {
  // Rate of compliance improvement
  const recent = await db('grc_control_assessments')
    .where({ entity_id: entityId })
    .where('assessment_date', '>=', db.raw('NOW() - INTERVAL \'30 days\''))
    .count('* as count')
    .first();
  
  const previous = await db('grc_control_assessments')
    .where({ entity_id: entityId })
    .whereBetween('assessment_date', [
      db.raw('NOW() - INTERVAL \'60 days\''),
      db.raw('NOW() - INTERVAL \'30 days\'')
    ])
    .count('* as count')
    .first();
  
  const recentCount = parseInt(recent.count) || 0;
  const previousCount = parseInt(previous.count) || 0;
  
  return {
    current: recentCount,
    previous: previousCount,
    change: previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0,
    trend: recentCount > previousCount ? 'improving' : recentCount < previousCount ? 'declining' : 'stable'
  };
}

async function getAssessmentFrequency(entityId) {
  const result = await db('grc_control_assessments')
    .where({ entity_id: entityId })
    .whereNotNull('assessment_date')
    .select(
      db.raw('AVG(EXTRACT(EPOCH FROM (next_assessment_date - assessment_date)) / 86400) as avg_days')
    )
    .first();
  
  return {
    avg_days_between: Math.round(parseFloat(result.avg_days) || 0),
    frequency: parseFloat(result.avg_days) < 90 ? 'High' : parseFloat(result.avg_days) < 180 ? 'Medium' : 'Low'
  };
}

async function getRemediationTime(entityId) {
  // Average time to remediate non-compliant controls
  const result = await db('grc_control_assessments')
    .where({ entity_id: entityId })
    .where({ assessment_status: 'Non-Compliant' })
    .whereNotNull('assessment_date')
    .select(
      db.raw('AVG(EXTRACT(EPOCH FROM (updated_at - assessment_date)) / 86400) as avg_days')
    )
    .first();
  
  return {
    avg_days: Math.round(parseFloat(result.avg_days) || 0),
    status: parseFloat(result.avg_days) < 30 ? 'Fast' : parseFloat(result.avg_days) < 90 ? 'Moderate' : 'Slow'
  };
}

async function getRiskTrend(entityId) {
  const recent = await db('risks')
    .where({ entity_id: entityId })
    .where('created_at', '>=', db.raw('NOW() - INTERVAL \'30 days\''))
    .count('* as count')
    .first();
  
  const previous = await db('risks')
    .where({ entity_id: entityId })
    .whereBetween('created_at', [
      db.raw('NOW() - INTERVAL \'60 days\''),
      db.raw('NOW() - INTERVAL \'30 days\'')
    ])
    .count('* as count')
    .first();
  
  const recentCount = parseInt(recent.count) || 0;
  const previousCount = parseInt(previous.count) || 0;
  
  return {
    current: recentCount,
    previous: previousCount,
    change: previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0,
    trend: recentCount > previousCount ? 'increasing' : recentCount < previousCount ? 'decreasing' : 'stable'
  };
}

async function getNewRisksRate(entityId) {
  const result = await db('risks')
    .where({ entity_id: entityId })
    .where('created_at', '>=', db.raw('NOW() - INTERVAL \'30 days\''))
    .count('* as count')
    .first();
  
  return {
    new_risks_30d: parseInt(result.count) || 0,
    rate: parseInt(result.count) > 5 ? 'High' : parseInt(result.count) > 2 ? 'Medium' : 'Low'
  };
}

async function getMitigationVelocity(entityId) {
  const result = await db('risks')
    .where({ entity_id: entityId })
    .where({ status: 'Mitigated' })
    .whereNotNull('mitigation_target_date')
    .select(
      db.raw('AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days')
    )
    .first();
  
  return {
    avg_days_to_mitigate: Math.round(parseFloat(result.avg_days) || 0),
    velocity: parseFloat(result.avg_days) < 30 ? 'Fast' : parseFloat(result.avg_days) < 90 ? 'Moderate' : 'Slow'
  };
}

async function getImplementationVelocity(entityId) {
  const result = await db('grc_implementation_plans')
    .where({ entity_id: entityId })
    .where({ plan_status: 'Completed' })
    .select(
      db.raw('AVG(EXTRACT(EPOCH FROM (actual_completion_date - start_date)) / 86400) as avg_days')
    )
    .first();
  
  return {
    avg_days_to_complete: Math.round(parseFloat(result.avg_days) || 0),
    velocity: parseFloat(result.avg_days) < 90 ? 'Fast' : parseFloat(result.avg_days) < 180 ? 'Moderate' : 'Slow'
  };
}

async function getPlanCompletionRate(entityId) {
  const result = await db('grc_implementation_plans')
    .where({ entity_id: entityId })
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('COUNT(CASE WHEN plan_status = \'Completed\' THEN 1 END) as completed'),
      db.raw('AVG(completion_percentage) as avg_completion')
    )
    .first();
  
  const total = parseInt(result.total) || 0;
  const completed = parseInt(result.completed) || 0;
  
  return {
    total_plans: total,
    completed_plans: completed,
    completion_rate: total > 0 ? (completed / total) * 100 : 0,
    avg_completion: parseFloat(result.avg_completion) || 0
  };
}

async function getTaskThroughput(entityId) {
  const result = await db('grc_implementation_tasks')
    .join('grc_implementation_plans', 'grc_implementation_tasks.plan_id', 'grc_implementation_plans.plan_id')
    .where({ 'grc_implementation_plans.entity_id': entityId })
    .where({ task_status: 'Completed' })
    .select(
      db.raw('COUNT(*) as completed_tasks'),
      db.raw('AVG(EXTRACT(EPOCH FROM (completed_date - created_at)) / 86400) as avg_days')
    )
    .first();
  
  return {
    completed_tasks: parseInt(result.completed_tasks) || 0,
    avg_days_per_task: Math.round(parseFloat(result.avg_days) || 0),
    throughput: parseInt(result.completed_tasks) > 20 ? 'High' : parseInt(result.completed_tasks) > 10 ? 'Medium' : 'Low'
  };
}

async function getComplianceForecast(entityId) {
  // Simple linear forecast based on trends
  const trends = await getComplianceTrends(entityId, null);
  if (trends.length < 2) {
    return { forecast: 'Insufficient data', confidence: 0 };
  }
  
  const recent = trends[0];
  const previous = trends[1];
  const change = recent.compliance_rate - previous.compliance_rate;
  const forecast = recent.compliance_rate + change;
  
  return {
    forecast: Math.max(0, Math.min(100, forecast)),
    confidence: trends.length >= 3 ? 'High' : 'Medium',
    trend: change > 0 ? 'Improving' : change < 0 ? 'Declining' : 'Stable'
  };
}

async function getRiskForecast(entityId) {
  const trends = await getRiskTrends(entityId, null);
  if (trends.length < 2) {
    return { forecast: 'Insufficient data', confidence: 0 };
  }
  
  const recent = trends[0];
  const previous = trends[1];
  const change = recent.avg_risk_score - previous.avg_risk_score;
  const forecast = recent.avg_risk_score + change;
  
  return {
    forecast: Math.max(0, Math.min(100, forecast)),
    confidence: trends.length >= 3 ? 'High' : 'Medium',
    trend: change > 0 ? 'Increasing' : change < 0 ? 'Decreasing' : 'Stable'
  };
}

async function getMaturityForecast(entityId) {
  // Forecast based on compliance and risk trends
  const complianceForecast = await getComplianceForecast(entityId);
  const riskForecast = await getRiskForecast(entityId);
  
  const maturityForecast = (
    (complianceForecast.forecast || 0) * 0.6 +
    (100 - (riskForecast.forecast || 0)) * 0.4
  );
  
  return {
    forecast: Math.max(0, Math.min(100, maturityForecast)),
    confidence: complianceForecast.confidence === 'High' && riskForecast.confidence === 'High' ? 'High' : 'Medium'
  };
}

function calculateLeadingScore(indicators) {
  // Calculate overall leading score based on indicators
  let score = 0;
  let count = 0;
  
  if (indicators.compliance_velocity.trend === 'improving') score += 20; else if (indicators.compliance_velocity.trend === 'declining') score += 0; else score += 10;
  count++;
  
  if (indicators.risk_trend.trend === 'decreasing') score += 20; else if (indicators.risk_trend.trend === 'increasing') score += 0; else score += 10;
  count++;
  
  if (indicators.implementation_velocity.velocity === 'Fast') score += 20; else if (indicators.implementation_velocity.velocity === 'Slow') score += 0; else score += 10;
  count++;
  
  return count > 0 ? Math.round(score / count) : 0;
}

function generateLeadingInsights(indicators) {
  const insights = [];
  
  if (indicators.compliance_velocity.trend === 'improving') {
    insights.push('Compliance is improving - positive trend detected');
  } else if (indicators.compliance_velocity.trend === 'declining') {
    insights.push('Compliance is declining - immediate attention required');
  }
  
  if (indicators.risk_trend.trend === 'increasing') {
    insights.push('Risk levels are increasing - review mitigation strategies');
  }
  
  if (indicators.remediation_time.status === 'Slow') {
    insights.push('Remediation time is slow - consider process improvements');
  }
  
  return insights;
}

function generateLeadingRecommendations(indicators) {
  const recommendations = [];
  
  if (indicators.compliance_velocity.trend === 'declining') {
    recommendations.push({
      priority: 'High',
      action: 'Increase assessment frequency',
      reason: 'Compliance velocity is declining'
    });
  }
  
  if (indicators.risk_trend.trend === 'increasing') {
    recommendations.push({
      priority: 'High',
      action: 'Implement proactive risk mitigation',
      reason: 'Risk trend is increasing'
    });
  }
  
  if (indicators.remediation_time.status === 'Slow') {
    recommendations.push({
      priority: 'Medium',
      action: 'Streamline remediation process',
      reason: 'Average remediation time is above target'
    });
  }
  
  return recommendations;
}

async function getFrameworkGuidance(frameworkId) {
  const framework = await db('grc_frameworks')
    .where({ framework_id: frameworkId })
    .first();
  
  if (!framework) return null;
  
  return {
    framework_name: framework.framework_name_en,
    description: framework.description,
    compliance_level: framework.compliance_level,
    implementation_guidance: framework.implementation_guidance || 'Follow standard implementation practices',
    best_practices: getFrameworkBestPractices(framework.framework_type),
  };
}

async function getControlGuidance(controlId) {
  const control = await db('grc_controls')
    .where({ control_id: controlId })
    .first();
  
  if (!control) return null;
  
  return {
    control_name: control.control_name_en,
    description: control.description,
    control_statement: control.control_statement,
    implementation_guidance: control.implementation_guidance,
    testing_procedures: control.testing_procedures,
    priority: control.priority,
  };
}

async function getEntityGuidance(entityId) {
  const entity = await db('dga_entities')
    .where({ entity_id: entityId })
    .first();
  
  if (!entity) return null;
  
  // Get applicable regulators
  const regulators = await db('grc_organization_regulators')
    .join('grc_regulators', 'grc_organization_regulators.regulator_id', 'grc_regulators.regulator_id')
    .where({ 'grc_organization_regulators.entity_id': entityId, 'grc_organization_regulators.is_active': true })
    .select('grc_regulators.*')
    .limit(10);
  
  // Get compliance score
  const complianceScore = await calculateComplianceScore(entityId);
  
  return {
    entity_name: entity.entity_name_en,
    sector: entity.sector,
    applicable_regulators: regulators.map(r => r.regulator_name_en),
    current_compliance_score: Math.round(complianceScore * 100) / 100,
    recommendations: await getEntityRecommendations(entityId, complianceScore),
  };
}

async function getBestPractices(context) {
  const practices = {
    compliance: [
      'Conduct regular assessments (quarterly recommended)',
      'Maintain comprehensive documentation',
      'Implement continuous monitoring',
      'Establish clear accountability',
      'Regular training and awareness programs'
    ],
    risk: [
      'Identify risks proactively',
      'Assess likelihood and impact regularly',
      'Develop mitigation plans for high risks',
      'Monitor risk trends',
      'Review and update risk register quarterly'
    ],
    implementation: [
      'Start with high-priority controls',
      'Break down into manageable tasks',
      'Set realistic timelines',
      'Track progress regularly',
      'Document lessons learned'
    ]
  };
  
  return practices[context] || practices.compliance;
}

async function getRecommendations(entityId, frameworkId) {
  const recommendations = [];
  
  // Get non-compliant controls
  const nonCompliant = await db('grc_control_assessments')
    .where({ entity_id: entityId })
    .where({ assessment_status: 'Non-Compliant' })
    .where(function() {
      if (frameworkId) this.where({ framework_id: frameworkId });
    })
    .join('grc_controls', 'grc_control_assessments.control_id', 'grc_controls.control_id')
    .select('grc_controls.*')
    .limit(5);
  
  nonCompliant.forEach(control => {
    recommendations.push({
      type: 'compliance',
      priority: control.priority || 'Medium',
      control: control.control_name_en,
      action: `Implement ${control.control_name_en}`,
      reason: 'Currently non-compliant',
      guidance: control.implementation_guidance
    });
  });
  
  // Get high risks
  const highRisks = await db('risks')
    .where({ entity_id: entityId })
    .where({ severity: 'High', status: 'Open' })
    .limit(3);
  
  highRisks.forEach(risk => {
    recommendations.push({
      type: 'risk',
      priority: 'High',
      risk: risk.risk_description,
      action: 'Mitigate high-priority risk',
      reason: 'High severity risk requires immediate attention',
      guidance: risk.mitigation_plan || 'Develop comprehensive mitigation plan'
    });
  });
  
  return recommendations;
}

async function getMaturityRecommendations(score, level) {
  const recommendations = [];
  
  if (level === 'Initial' || level === 'Repeatable') {
    recommendations.push({
      priority: 'High',
      action: 'Establish formal processes',
      reason: 'Maturity level is low - need structured approach'
    });
    recommendations.push({
      priority: 'High',
      action: 'Implement basic controls',
      reason: 'Focus on foundational controls first'
    });
  } else if (level === 'Defined') {
    recommendations.push({
      priority: 'Medium',
      action: 'Standardize processes',
      reason: 'Move from defined to managed level'
    });
    recommendations.push({
      priority: 'Medium',
      action: 'Enhance monitoring',
      reason: 'Improve visibility and tracking'
    });
  } else if (level === 'Managed') {
    recommendations.push({
      priority: 'Low',
      action: 'Optimize processes',
      reason: 'Fine-tune for efficiency'
    });
    recommendations.push({
      priority: 'Low',
      action: 'Continuous improvement',
      reason: 'Maintain and enhance maturity'
    });
  }
  
  return recommendations;
}

async function getImplementationRoadmap(entityId) {
  // Get pending implementation plans
  const plans = await db('grc_implementation_plans')
    .where({ entity_id: entityId })
    .whereIn('plan_status', ['Draft', 'Approved', 'In Progress'])
    .join('grc_frameworks', 'grc_implementation_plans.framework_id', 'grc_frameworks.framework_id')
    .select(
      'grc_implementation_plans.*',
      'grc_frameworks.framework_name_en'
    )
    .orderBy('grc_implementation_plans.priority', 'desc')
    .orderBy('grc_implementation_plans.target_completion_date', 'asc')
    .limit(10);
  
  return {
    active_plans: plans.length,
    roadmap: plans.map(plan => ({
      plan_name: plan.plan_name,
      framework: plan.framework_name_en,
      status: plan.plan_status,
      completion: plan.completion_percentage,
      target_date: plan.target_completion_date
    }))
  };
}

async function getEntityRecommendations(entityId, complianceScore) {
  const recommendations = [];
  
  if (complianceScore < 70) {
    recommendations.push('Focus on achieving basic compliance first');
    recommendations.push('Prioritize mandatory controls');
  } else if (complianceScore < 85) {
    recommendations.push('Work on partial compliance areas');
    recommendations.push('Enhance implementation completeness');
  } else {
    recommendations.push('Maintain compliance levels');
    recommendations.push('Focus on continuous improvement');
  }
  
  return recommendations;
}

function getFrameworkBestPractices(frameworkType) {
  const practices = {
    'Law': ['Ensure legal compliance', 'Regular legal review', 'Document legal basis'],
    'Regulation': ['Follow regulatory requirements', 'Maintain compliance records', 'Regular audits'],
    'Standard': ['Adhere to standard specifications', 'Regular assessments', 'Continuous improvement'],
    'Guideline': ['Follow recommended practices', 'Adapt to context', 'Regular review'],
    'Policy': ['Align with policy objectives', 'Regular policy review', 'Stakeholder communication']
  };
  
  return practices[frameworkType] || practices['Standard'];
}

