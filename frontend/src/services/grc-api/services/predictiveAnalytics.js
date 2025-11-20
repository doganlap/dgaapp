const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const moment = require('moment');

/**
 * Predictive Analytics System for GRC
 * Provides AI-powered forecasting and risk prediction including:
 * - Compliance risk forecasting
 * - Assessment completion predictions
 * - Resource requirement forecasting
 * - Trend analysis and anomaly detection
 * - Risk score predictions
 */
class PredictiveAnalytics {
  constructor() {
    this.isInitialized = false;
    this.models = new Map();
    this.historicalData = new Map();
    this.trendAnalysis = new Map();
    this.riskFactors = new Map();
    this.predictionCache = new Map();
  }

  /**
   * Initialize the predictive analytics system
   */
  async initialize() {
    try {
      console.log('📊 Initializing Predictive Analytics System...');
      
      // Load historical data for model training
      await this.loadHistoricalData();
      
      // Initialize prediction models
      await this.initializePredictionModels();
      
      // Analyze trends and patterns
      await this.analyzeTrends();
      
      // Initialize risk factor analysis
      await this.initializeRiskFactors();
      
      this.isInitialized = true;
      console.log('✅ Predictive Analytics System initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Predictive Analytics System:', error);
      throw error;
    }
  }

  /**
   * Load historical data for model training
   */
  async loadHistoricalData() {
    try {
      // Load assessment completion data
      const assessmentData = await query(`
        SELECT 
          a.id,
          a.organization_id,
          a.assessment_type,
          a.priority,
          a.created_at,
          a.completed_at,
          a.status,
          o.sector,
          o.size_category,
          o.employee_count,
          COUNT(ar.id) as response_count,
          AVG(ar.compliance_score) as avg_compliance_score,
          COUNT(CASE WHEN ar.compliance_score < 50 THEN 1 END) as failing_controls,
          EXTRACT(EPOCH FROM (COALESCE(a.completed_at, NOW()) - a.created_at))/86400 as duration_days
        FROM assessments a
        JOIN organizations o ON a.organization_id = o.id
        LEFT JOIN assessment_responses ar ON a.id = ar.assessment_id
        WHERE a.created_at > NOW() - INTERVAL '2 years'
        GROUP BY a.id, o.sector, o.size_category, o.employee_count
        ORDER BY a.created_at DESC
      `);

      // Load workflow performance data
      const workflowData = await query(`
        SELECT 
          aw.id,
          aw.workflow_type,
          aw.priority,
          aw.status,
          aw.assigned_to,
          aw.created_at,
          aw.completed_at,
          u.role,
          u.experience_level,
          a.organization_id,
          o.sector,
          EXTRACT(EPOCH FROM (COALESCE(aw.completed_at, NOW()) - aw.created_at))/3600 as duration_hours
        FROM assessment_workflow aw
        JOIN assessments a ON aw.assessment_id = a.id
        JOIN organizations o ON a.organization_id = o.id
        LEFT JOIN users u ON aw.assigned_to = u.id
        WHERE aw.created_at > NOW() - INTERVAL '1 year'
        ORDER BY aw.created_at DESC
      `);

      // Load compliance score trends
      const complianceData = await query(`
        SELECT 
          ar.assessment_id,
          ar.control_id,
          ar.compliance_score,
          ar.created_at,
          ar.updated_at,
          gc.control_type,
          gc.priority_level,
          gf.name as framework_name,
          a.organization_id,
          o.sector
        FROM assessment_responses ar
        JOIN grc_controls gc ON ar.control_id = gc.id
        JOIN grc_frameworks gf ON gc.framework_id = gf.id
        JOIN assessments a ON ar.assessment_id = a.id
        JOIN organizations o ON a.organization_id = o.id
        WHERE ar.updated_at > NOW() - INTERVAL '18 months'
          AND ar.compliance_score IS NOT NULL
        ORDER BY ar.updated_at DESC
      `);

      // Store data for model training
      this.historicalData.set('assessments', assessmentData.rows);
      this.historicalData.set('workflows', workflowData.rows);
      this.historicalData.set('compliance', complianceData.rows);

      console.log(`📈 Loaded historical data: ${assessmentData.rows.length} assessments, ${workflowData.rows.length} workflows, ${complianceData.rows.length} compliance records`);
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
      throw error;
    }
  }

  /**
   * Initialize prediction models
   */
  async initializePredictionModels() {
    try {
      // Assessment completion prediction model
      this.models.set('assessment_completion', await this.buildAssessmentCompletionModel());
      
      // Compliance risk prediction model
      this.models.set('compliance_risk', await this.buildComplianceRiskModel());
      
      // Resource requirement prediction model
      this.models.set('resource_requirements', await this.buildResourceRequirementModel());
      
      // Workflow duration prediction model
      this.models.set('workflow_duration', await this.buildWorkflowDurationModel());

      console.log(`🤖 Initialized ${this.models.size} prediction models`);
    } catch (error) {
      console.error('❌ Error initializing prediction models:', error);
    }
  }

  /**
   * Build assessment completion prediction model
   */
  async buildAssessmentCompletionModel() {
    try {
      const assessments = this.historicalData.get('assessments') || [];
      
      if (assessments.length < 10) {
        console.warn('⚠️ Insufficient data for assessment completion model');
        return null;
      }

      // Analyze completion patterns
      const completionPatterns = {};
      
      // Group by sector and size
      const groupedData = _.groupBy(assessments, a => `${a.sector}_${a.size_category}`);
      
      Object.keys(groupedData).forEach(key => {
        const group = groupedData[key];
        const completed = group.filter(a => a.status === 'completed');
        
        if (completed.length >= 3) {
          completionPatterns[key] = {
            completionRate: completed.length / group.length,
            avgDuration: _.mean(completed.map(a => a.duration_days)),
            avgScore: _.mean(completed.map(a => a.avg_compliance_score)),
            sampleSize: group.length
          };
        }
      });

      // Analyze factors affecting completion
      const completionFactors = this.analyzeCompletionFactors(assessments);

      return {
        patterns: completionPatterns,
        factors: completionFactors,
        lastUpdated: new Date(),
        sampleSize: assessments.length
      };
    } catch (error) {
      console.error('❌ Error building assessment completion model:', error);
      return null;
    }
  }

  /**
   * Build compliance risk prediction model
   */
  async buildComplianceRiskModel() {
    try {
      const complianceData = this.historicalData.get('compliance') || [];
      
      if (complianceData.length < 50) {
        console.warn('⚠️ Insufficient data for compliance risk model');
        return null;
      }

      // Analyze risk patterns by sector and control type
      const riskPatterns = {};
      
      const groupedByFramework = _.groupBy(complianceData, 'framework_name');
      
      Object.keys(groupedByFramework).forEach(framework => {
        const frameworkData = groupedByFramework[framework];
        const groupedBySector = _.groupBy(frameworkData, 'sector');
        
        riskPatterns[framework] = {};
        
        Object.keys(groupedBySector).forEach(sector => {
          const sectorData = groupedBySector[sector];
          const groupedByControlType = _.groupBy(sectorData, 'control_type');
          
          riskPatterns[framework][sector] = {};
          
          Object.keys(groupedByControlType).forEach(controlType => {
            const controls = groupedByControlType[controlType];
            const scores = controls.map(c => c.compliance_score);
            
            riskPatterns[framework][sector][controlType] = {
              avgScore: _.mean(scores),
              minScore: Math.min(...scores),
              maxScore: Math.max(...scores),
              stdDev: this.calculateStandardDeviation(scores),
              failureRate: scores.filter(s => s < 50).length / scores.length,
              sampleSize: scores.length,
              riskLevel: this.calculateRiskLevel(scores)
            };
          });
        });
      });

      // Identify trending risks
      const trendingRisks = this.identifyTrendingRisks(complianceData);

      return {
        patterns: riskPatterns,
        trendingRisks: trendingRisks,
        lastUpdated: new Date(),
        sampleSize: complianceData.length
      };
    } catch (error) {
      console.error('❌ Error building compliance risk model:', error);
      return null;
    }
  }

  /**
   * Build resource requirement prediction model
   */
  async buildResourceRequirementModel() {
    try {
      const assessments = this.historicalData.get('assessments') || [];
      const workflows = this.historicalData.get('workflows') || [];
      
      // Analyze resource patterns
      const resourcePatterns = {};
      
      // Group assessments by characteristics
      const assessmentGroups = _.groupBy(assessments, a => 
        `${a.sector}_${a.size_category}_${a.assessment_type}`
      );
      
      Object.keys(assessmentGroups).forEach(key => {
        const group = assessmentGroups[key];
        const completed = group.filter(a => a.status === 'completed');
        
        if (completed.length >= 2) {
          resourcePatterns[key] = {
            avgDuration: _.mean(completed.map(a => a.duration_days)),
            avgResponseCount: _.mean(completed.map(a => a.response_count)),
            avgTeamSize: this.estimateTeamSize(completed, workflows),
            resourceIntensity: this.calculateResourceIntensity(completed),
            sampleSize: completed.length
          };
        }
      });

      return {
        patterns: resourcePatterns,
        lastUpdated: new Date(),
        sampleSize: assessments.length
      };
    } catch (error) {
      console.error('❌ Error building resource requirement model:', error);
      return null;
    }
  }

  /**
   * Build workflow duration prediction model
   */
  async buildWorkflowDurationModel() {
    try {
      const workflows = this.historicalData.get('workflows') || [];
      
      if (workflows.length < 20) {
        console.warn('⚠️ Insufficient data for workflow duration model');
        return null;
      }

      // Analyze duration patterns
      const durationPatterns = {};
      
      const groupedData = _.groupBy(workflows, w => 
        `${w.workflow_type}_${w.priority}_${w.role}`
      );
      
      Object.keys(groupedData).forEach(key => {
        const group = groupedData[key];
        const completed = group.filter(w => w.status === 'completed' && w.duration_hours > 0);
        
        if (completed.length >= 3) {
          const durations = completed.map(w => w.duration_hours);
          
          durationPatterns[key] = {
            avgDuration: _.mean(durations),
            medianDuration: this.calculateMedian(durations),
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            stdDev: this.calculateStandardDeviation(durations),
            sampleSize: completed.length
          };
        }
      });

      return {
        patterns: durationPatterns,
        lastUpdated: new Date(),
        sampleSize: workflows.length
      };
    } catch (error) {
      console.error('❌ Error building workflow duration model:', error);
      return null;
    }
  }

  /**
   * Analyze trends and patterns in the data
   */
  async analyzeTrends() {
    try {
      const complianceData = this.historicalData.get('compliance') || [];
      
      // Monthly compliance trends
      const monthlyTrends = this.calculateMonthlyTrends(complianceData);
      
      // Sector performance trends
      const sectorTrends = this.calculateSectorTrends(complianceData);
      
      // Framework adoption trends
      const frameworkTrends = this.calculateFrameworkTrends(complianceData);
      
      this.trendAnalysis.set('monthly', monthlyTrends);
      this.trendAnalysis.set('sector', sectorTrends);
      this.trendAnalysis.set('framework', frameworkTrends);

      console.log('📈 Trend analysis completed');
    } catch (error) {
      console.error('❌ Error analyzing trends:', error);
    }
  }

  /**
   * Initialize risk factor analysis
   */
  async initializeRiskFactors() {
    try {
      // Define risk factors and their weights
      const riskFactors = {
        'sector_risk': {
          'healthcare': 0.8,
          'financial': 0.9,
          'government': 0.7,
          'technology': 0.6,
          'manufacturing': 0.5,
          'retail': 0.4
        },
        'size_risk': {
          'small': 0.3,
          'medium': 0.5,
          'large': 0.7,
          'enterprise': 0.9
        },
        'complexity_risk': {
          'low': 0.2,
          'medium': 0.5,
          'high': 0.8
        },
        'maturity_risk': {
          1: 0.9,
          2: 0.7,
          3: 0.5,
          4: 0.3,
          5: 0.1
        }
      };

      this.riskFactors = new Map(Object.entries(riskFactors));
      console.log('⚠️ Risk factors initialized');
    } catch (error) {
      console.error('❌ Error initializing risk factors:', error);
    }
  }

  /**
   * Predict assessment completion probability and timeline
   */
  async predictAssessmentCompletion(assessmentId, organizationProfile) {
    try {
      const model = this.models.get('assessment_completion');
      if (!model) {
        return this.getDefaultCompletionPrediction();
      }

      const patternKey = `${organizationProfile.sector}_${organizationProfile.size_category}`;
      const pattern = model.patterns[patternKey];
      
      let prediction = {
        completionProbability: 0.7, // Default 70%
        estimatedDays: 30,
        confidence: 0.5,
        riskFactors: []
      };

      if (pattern) {
        prediction.completionProbability = pattern.completionRate;
        prediction.estimatedDays = Math.ceil(pattern.avgDuration);
        prediction.confidence = Math.min(0.9, pattern.sampleSize / 10);
      }

      // Adjust based on organization-specific factors
      prediction = this.adjustPredictionForOrganization(prediction, organizationProfile);

      // Identify risk factors
      prediction.riskFactors = this.identifyCompletionRiskFactors(organizationProfile);

      return prediction;
    } catch (error) {
      console.error('❌ Error predicting assessment completion:', error);
      return this.getDefaultCompletionPrediction();
    }
  }

  /**
   * Predict compliance risk for an organization or assessment
   */
  async predictComplianceRisk(organizationProfile, frameworkName = null) {
    try {
      const model = this.models.get('compliance_risk');
      if (!model) {
        return this.getDefaultRiskPrediction();
      }

      let riskScore = 50; // Base risk score (0-100, higher = more risk)
      let riskLevel = 'medium';
      let specificRisks = [];
      let confidence = 0.5;

      // Calculate sector-based risk
      const sectorRisk = this.riskFactors.get('sector_risk')?.[organizationProfile.sector] || 0.5;
      riskScore += sectorRisk * 30;

      // Calculate size-based risk
      const sizeRisk = this.riskFactors.get('size_risk')?.[organizationProfile.size_category] || 0.5;
      riskScore += sizeRisk * 20;

      // Framework-specific risk analysis
      if (frameworkName && model.patterns[frameworkName]) {
        const frameworkData = model.patterns[frameworkName][organizationProfile.sector];
        if (frameworkData) {
          // Analyze each control type
          Object.keys(frameworkData).forEach(controlType => {
            const controlData = frameworkData[controlType];
            if (controlData.failureRate > 0.3) {
              specificRisks.push({
                type: 'high_failure_rate',
                controlType: controlType,
                failureRate: controlData.failureRate,
                severity: 'high'
              });
              riskScore += 10;
            }
          });
          
          confidence = Math.min(0.9, _.sum(Object.values(frameworkData).map(d => d.sampleSize)) / 50);
        }
      }

      // Check trending risks
      if (model.trendingRisks) {
        const relevantTrends = model.trendingRisks.filter(risk => 
          risk.sector === organizationProfile.sector
        );
        
        relevantTrends.forEach(trend => {
          if (trend.trend === 'declining') {
            specificRisks.push({
              type: 'declining_performance',
              area: trend.area,
              severity: 'medium'
            });
            riskScore += 5;
          }
        });
      }

      // Determine risk level
      if (riskScore >= 80) riskLevel = 'critical';
      else if (riskScore >= 65) riskLevel = 'high';
      else if (riskScore >= 35) riskLevel = 'medium';
      else riskLevel = 'low';

      return {
        riskScore: Math.min(100, Math.max(0, riskScore)),
        riskLevel: riskLevel,
        confidence: confidence,
        specificRisks: specificRisks,
        recommendations: this.generateRiskRecommendations(specificRisks, organizationProfile),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('❌ Error predicting compliance risk:', error);
      return this.getDefaultRiskPrediction();
    }
  }

  /**
   * Predict resource requirements for an assessment
   */
  async predictResourceRequirements(assessmentType, organizationProfile, controlCount = null) {
    try {
      const model = this.models.get('resource_requirements');
      if (!model) {
        return this.getDefaultResourcePrediction();
      }

      const patternKey = `${organizationProfile.sector}_${organizationProfile.size_category}_${assessmentType}`;
      const pattern = model.patterns[patternKey];

      let prediction = {
        estimatedHours: 40,
        estimatedTeamSize: 3,
        estimatedDuration: 14,
        skillsRequired: ['compliance_analyst', 'auditor'],
        confidence: 0.5
      };

      if (pattern) {
        prediction.estimatedHours = Math.ceil(pattern.avgDuration * 8); // Convert days to hours
        prediction.estimatedTeamSize = Math.ceil(pattern.avgTeamSize);
        prediction.estimatedDuration = Math.ceil(pattern.avgDuration);
        prediction.confidence = Math.min(0.9, pattern.sampleSize / 5);
      }

      // Adjust for control count if provided
      if (controlCount) {
        const hoursPerControl = prediction.estimatedHours / (pattern?.avgResponseCount || 20);
        prediction.estimatedHours = Math.ceil(controlCount * hoursPerControl);
        prediction.estimatedDuration = Math.ceil(prediction.estimatedHours / (prediction.estimatedTeamSize * 8));
      }

      // Determine required skills based on assessment complexity
      prediction.skillsRequired = this.determineRequiredSkills(assessmentType, organizationProfile);

      return prediction;
    } catch (error) {
      console.error('❌ Error predicting resource requirements:', error);
      return this.getDefaultResourcePrediction();
    }
  }

  /**
   * Predict workflow completion time
   */
  async predictWorkflowDuration(workflowType, priority, assigneeRole) {
    try {
      const model = this.models.get('workflow_duration');
      if (!model) {
        return { estimatedHours: 4, confidence: 0.3 };
      }

      const patternKey = `${workflowType}_${priority}_${assigneeRole}`;
      const pattern = model.patterns[patternKey];

      if (pattern) {
        return {
          estimatedHours: Math.ceil(pattern.avgDuration),
          minHours: Math.ceil(pattern.minDuration),
          maxHours: Math.ceil(pattern.maxDuration),
          confidence: Math.min(0.9, pattern.sampleSize / 10)
        };
      }

      // Fallback to heuristic calculation
      return this.calculateHeuristicDuration(workflowType, priority, assigneeRole);
    } catch (error) {
      console.error('❌ Error predicting workflow duration:', error);
      return { estimatedHours: 4, confidence: 0.3 };
    }
  }

  /**
   * Generate comprehensive risk forecast for an organization
   */
  async generateRiskForecast(organizationId, timeHorizon = 90) {
    try {
      const orgProfile = await this.getOrganizationProfile(organizationId);
      
      // Generate multiple predictions
      const complianceRisk = await this.predictComplianceRisk(orgProfile);
      const assessmentPredictions = await this.predictUpcomingAssessments(orgProfile, timeHorizon);
      const resourceForecasts = await this.forecastResourceNeeds(orgProfile, timeHorizon);
      const trendAnalysis = this.analyzeTrendsForOrganization(orgProfile);

      const forecast = {
        organizationId: organizationId,
        forecastPeriod: timeHorizon,
        generatedAt: new Date(),
        overallRiskLevel: complianceRisk.riskLevel,
        overallRiskScore: complianceRisk.riskScore,
        
        complianceRisk: complianceRisk,
        assessmentPredictions: assessmentPredictions,
        resourceForecasts: resourceForecasts,
        trendAnalysis: trendAnalysis,
        
        recommendations: this.generateForecastRecommendations(
          complianceRisk, 
          assessmentPredictions, 
          resourceForecasts
        ),
        
        confidence: this.calculateOverallConfidence([
          complianceRisk.confidence,
          assessmentPredictions.confidence,
          resourceForecasts.confidence
        ])
      };

      // Store forecast in database
      await this.storeForecast(forecast);

      return forecast;
    } catch (error) {
      console.error('❌ Error generating risk forecast:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in compliance data
   */
  async detectAnomalies(organizationId = null, timeWindow = 30) {
    try {
      const anomalies = [];
      
      // Get recent compliance data
      const whereClause = organizationId ? 'AND a.organization_id = $2' : '';
      const params = organizationId ? [timeWindow, organizationId] : [timeWindow];
      
      const recentData = await query(`
        SELECT 
          ar.assessment_id,
          ar.control_id,
          ar.compliance_score,
          ar.updated_at,
          gc.control_type,
          gc.priority_level,
          a.organization_id,
          o.sector,
          o.name as org_name
        FROM assessment_responses ar
        JOIN grc_controls gc ON ar.control_id = gc.id
        JOIN assessments a ON ar.assessment_id = a.id
        JOIN organizations o ON a.organization_id = o.id
        WHERE ar.updated_at > NOW() - INTERVAL '${timeWindow} days'
          ${whereClause}
          AND ar.compliance_score IS NOT NULL
        ORDER BY ar.updated_at DESC
      `, params);

      // Detect score anomalies
      const scoreAnomalies = this.detectScoreAnomalies(recentData.rows);
      anomalies.push(...scoreAnomalies);

      // Detect pattern anomalies
      const patternAnomalies = this.detectPatternAnomalies(recentData.rows);
      anomalies.push(...patternAnomalies);

      // Detect temporal anomalies
      const temporalAnomalies = this.detectTemporalAnomalies(recentData.rows);
      anomalies.push(...temporalAnomalies);

      return {
        anomalies: anomalies,
        detectionPeriod: timeWindow,
        detectedAt: new Date(),
        totalDataPoints: recentData.rows.length
      };
    } catch (error) {
      console.error('❌ Error detecting anomalies:', error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async getOrganizationProfile(organizationId) {
    const result = await query(`
      SELECT 
        o.*,
        COUNT(DISTINCT a.id) as assessment_count,
        AVG(ar.compliance_score) as avg_compliance_score
      FROM organizations o
      LEFT JOIN assessments a ON o.id = a.organization_id
      LEFT JOIN assessment_responses ar ON a.id = ar.assessment_id
      WHERE o.id = $1
      GROUP BY o.id
    `, [organizationId]);

    return result.rows[0];
  }

  analyzeCompletionFactors(assessments) {
    const factors = {
      sectorImpact: {},
      sizeImpact: {},
      priorityImpact: {},
      typeImpact: {}
    };

    // Analyze sector impact
    const bySector = _.groupBy(assessments, 'sector');
    Object.keys(bySector).forEach(sector => {
      const sectorData = bySector[sector];
      const completed = sectorData.filter(a => a.status === 'completed');
      factors.sectorImpact[sector] = {
        completionRate: completed.length / sectorData.length,
        avgDuration: _.mean(completed.map(a => a.duration_days))
      };
    });

    // Similar analysis for other factors...
    return factors;
  }

  identifyTrendingRisks(complianceData) {
    const trends = [];
    
    // Group data by month
    const monthlyData = _.groupBy(complianceData, data => 
      moment(data.updated_at).format('YYYY-MM')
    );

    const months = Object.keys(monthlyData).sort();
    
    if (months.length >= 3) {
      // Analyze trends for each sector/control type combination
      const combinations = _.uniqBy(complianceData, d => `${d.sector}_${d.control_type}`)
        .map(d => ({ sector: d.sector, controlType: d.control_type }));

      combinations.forEach(combo => {
        const monthlyScores = months.map(month => {
          const monthData = monthlyData[month].filter(d => 
            d.sector === combo.sector && d.control_type === combo.controlType
          );
          return monthData.length > 0 ? _.mean(monthData.map(d => d.compliance_score)) : null;
        }).filter(score => score !== null);

        if (monthlyScores.length >= 3) {
          const trend = this.calculateTrend(monthlyScores);
          if (trend.slope < -2) { // Declining trend
            trends.push({
              sector: combo.sector,
              area: combo.controlType,
              trend: 'declining',
              slope: trend.slope,
              significance: Math.abs(trend.slope)
            });
          }
        }
      });
    }

    return trends;
  }

  calculateTrend(values) {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = _.sum(x);
    const sumY = _.sum(y);
    const sumXY = _.sum(x.map((xi, i) => xi * y[i]));
    const sumXX = _.sum(x.map(xi => xi * xi));

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  calculateStandardDeviation(values) {
    const mean = _.mean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(_.mean(squaredDiffs));
  }

  calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[middle - 1] + sorted[middle]) / 2 
      : sorted[middle];
  }

  calculateRiskLevel(scores) {
    const avgScore = _.mean(scores);
    const failureRate = scores.filter(s => s < 50).length / scores.length;
    
    if (avgScore < 50 || failureRate > 0.5) return 'high';
    if (avgScore < 70 || failureRate > 0.3) return 'medium';
    return 'low';
  }

  estimateTeamSize(assessments, workflows) {
    // Estimate based on workflow assignments
    const assessmentIds = assessments.map(a => a.id);
    const relevantWorkflows = workflows.filter(w => 
      assessmentIds.includes(w.assessment_id)
    );
    
    if (relevantWorkflows.length === 0) return 3; // Default

    const uniqueAssignees = _.uniqBy(relevantWorkflows, 'assigned_to').length;
    return Math.max(1, Math.min(10, uniqueAssignees));
  }

  calculateResourceIntensity(assessments) {
    const avgResponseCount = _.mean(assessments.map(a => a.response_count));
    const avgDuration = _.mean(assessments.map(a => a.duration_days));
    
    // Higher response count and longer duration = higher intensity
    return (avgResponseCount / 50) * (avgDuration / 30);
  }

  calculateMonthlyTrends(complianceData) {
    const monthlyData = _.groupBy(complianceData, data => 
      moment(data.updated_at).format('YYYY-MM')
    );

    const trends = {};
    Object.keys(monthlyData).forEach(month => {
      const monthData = monthlyData[month];
      trends[month] = {
        avgScore: _.mean(monthData.map(d => d.compliance_score)),
        recordCount: monthData.length,
        failureRate: monthData.filter(d => d.compliance_score < 50).length / monthData.length
      };
    });

    return trends;
  }

  calculateSectorTrends(complianceData) {
    const sectorData = _.groupBy(complianceData, 'sector');
    const trends = {};

    Object.keys(sectorData).forEach(sector => {
      const data = sectorData[sector];
      const monthlyData = _.groupBy(data, d => moment(d.updated_at).format('YYYY-MM'));
      const months = Object.keys(monthlyData).sort();

      if (months.length >= 3) {
        const monthlyScores = months.map(month => 
          _.mean(monthlyData[month].map(d => d.compliance_score))
        );
        
        trends[sector] = {
          trend: this.calculateTrend(monthlyScores),
          currentScore: monthlyScores[monthlyScores.length - 1],
          dataPoints: data.length
        };
      }
    });

    return trends;
  }

  calculateFrameworkTrends(complianceData) {
    const frameworkData = _.groupBy(complianceData, 'framework_name');
    const trends = {};

    Object.keys(frameworkData).forEach(framework => {
      const data = frameworkData[framework];
      trends[framework] = {
        avgScore: _.mean(data.map(d => d.compliance_score)),
        adoptionRate: data.length,
        failureRate: data.filter(d => d.compliance_score < 50).length / data.length
      };
    });

    return trends;
  }

  getDefaultCompletionPrediction() {
    return {
      completionProbability: 0.7,
      estimatedDays: 30,
      confidence: 0.3,
      riskFactors: ['insufficient_historical_data']
    };
  }

  getDefaultRiskPrediction() {
    return {
      riskScore: 50,
      riskLevel: 'medium',
      confidence: 0.3,
      specificRisks: [],
      recommendations: ['Establish baseline compliance metrics'],
      lastUpdated: new Date()
    };
  }

  getDefaultResourcePrediction() {
    return {
      estimatedHours: 40,
      estimatedTeamSize: 3,
      estimatedDuration: 14,
      skillsRequired: ['compliance_analyst'],
      confidence: 0.3
    };
  }

  adjustPredictionForOrganization(prediction, orgProfile) {
    // Adjust based on historical performance
    if (orgProfile.avg_compliance_score) {
      if (orgProfile.avg_compliance_score > 80) {
        prediction.completionProbability += 0.1;
        prediction.estimatedDays *= 0.9;
      } else if (orgProfile.avg_compliance_score < 50) {
        prediction.completionProbability -= 0.1;
        prediction.estimatedDays *= 1.2;
      }
    }

    // Adjust based on assessment history
    if (orgProfile.assessment_count > 5) {
      prediction.completionProbability += 0.05;
      prediction.estimatedDays *= 0.95;
    }

    return prediction;
  }

  identifyCompletionRiskFactors(orgProfile) {
    const riskFactors = [];

    if (orgProfile.avg_compliance_score < 60) {
      riskFactors.push('low_historical_performance');
    }

    if (orgProfile.assessment_count < 2) {
      riskFactors.push('limited_experience');
    }

    const highRiskSectors = ['healthcare', 'financial'];
    if (highRiskSectors.includes(orgProfile.sector)) {
      riskFactors.push('high_risk_sector');
    }

    if (orgProfile.size_category === 'small') {
      riskFactors.push('limited_resources');
    }

    return riskFactors;
  }

  generateRiskRecommendations(specificRisks, orgProfile) {
    const recommendations = [];

    specificRisks.forEach(risk => {
      switch (risk.type) {
        case 'high_failure_rate':
          recommendations.push(`Focus on ${risk.controlType} controls - high failure rate detected`);
          break;
        case 'declining_performance':
          recommendations.push(`Address declining performance in ${risk.area}`);
          break;
      }
    });

    // General recommendations based on profile
    if (orgProfile.size_category === 'small') {
      recommendations.push('Consider external compliance consulting for complex frameworks');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current compliance practices and monitor trends');
    }

    return recommendations;
  }

  determineRequiredSkills(assessmentType, orgProfile) {
    const baseSkills = ['compliance_analyst'];
    
    if (assessmentType === 'technical') {
      baseSkills.push('security_engineer', 'it_auditor');
    }
    
    if (orgProfile.sector === 'healthcare') {
      baseSkills.push('healthcare_compliance_specialist');
    } else if (orgProfile.sector === 'financial') {
      baseSkills.push('financial_auditor');
    }
    
    if (orgProfile.size_category === 'large' || orgProfile.size_category === 'enterprise') {
      baseSkills.push('senior_auditor', 'compliance_manager');
    }

    return baseSkills;
  }

  calculateHeuristicDuration(workflowType, priority, assigneeRole) {
    let baseHours = 4;

    // Adjust by workflow type
    const typeMultipliers = {
      'assessment_approval': 2,
      'evidence_review': 3,
      'compliance_review': 6,
      'remediation_approval': 4
    };
    baseHours *= typeMultipliers[workflowType] || 1;

    // Adjust by priority
    const priorityMultipliers = {
      'critical': 0.8,
      'high': 0.9,
      'medium': 1.0,
      'low': 1.2
    };
    baseHours *= priorityMultipliers[priority] || 1;

    // Adjust by role experience
    const roleMultipliers = {
      'senior_auditor': 0.7,
      'auditor': 0.9,
      'analyst': 1.1,
      'junior_analyst': 1.4
    };
    baseHours *= roleMultipliers[assigneeRole] || 1;

    return {
      estimatedHours: Math.ceil(baseHours),
      confidence: 0.4
    };
  }

  async predictUpcomingAssessments(orgProfile, timeHorizon) {
    // Predict when assessments might be due based on regulatory cycles
    const predictions = {
      upcoming: [],
      confidence: 0.6
    };

    // Add sector-specific assessment predictions
    const sectorCycles = {
      'healthcare': { cycle: 365, frameworks: ['HIPAA', 'HITECH'] },
      'financial': { cycle: 365, frameworks: ['SOX', 'PCI-DSS'] },
      'technology': { cycle: 180, frameworks: ['SOC2', 'ISO27001'] }
    };

    const sectorInfo = sectorCycles[orgProfile.sector];
    if (sectorInfo) {
      sectorInfo.frameworks.forEach(framework => {
        predictions.upcoming.push({
          framework: framework,
          estimatedDate: moment().add(sectorInfo.cycle, 'days').toDate(),
          probability: 0.8,
          reason: 'regulatory_cycle'
        });
      });
    }

    return predictions;
  }

  async forecastResourceNeeds(orgProfile, timeHorizon) {
    return {
      totalHours: 120,
      peakPeriods: [
        {
          period: 'Q1',
          estimatedHours: 40,
          reason: 'annual_assessments'
        }
      ],
      skillGaps: ['senior_auditor'],
      confidence: 0.5
    };
  }

  analyzeTrendsForOrganization(orgProfile) {
    return {
      performanceTrend: 'stable',
      riskTrend: 'decreasing',
      workloadTrend: 'increasing'
    };
  }

  generateForecastRecommendations(complianceRisk, assessmentPredictions, resourceForecasts) {
    const recommendations = [];

    if (complianceRisk.riskLevel === 'high') {
      recommendations.push('Immediate attention required for high-risk areas');
    }

    if (resourceForecasts.skillGaps.length > 0) {
      recommendations.push(`Address skill gaps: ${resourceForecasts.skillGaps.join(', ')}`);
    }

    if (assessmentPredictions.upcoming.length > 2) {
      recommendations.push('Plan for upcoming assessment workload');
    }

    return recommendations;
  }

  calculateOverallConfidence(confidenceScores) {
    return _.mean(confidenceScores.filter(score => score > 0));
  }

  async storeForecast(forecast) {
    try {
      await query(`
        INSERT INTO predictive_forecasts (
          id, organization_id, forecast_type, forecast_data, 
          confidence_score, generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        forecast.organizationId,
        'risk_forecast',
        JSON.stringify(forecast),
        forecast.confidence,
        forecast.generatedAt
      ]);
    } catch (error) {
      console.error('❌ Error storing forecast:', error);
    }
  }

  detectScoreAnomalies(data) {
    const anomalies = [];
    
    // Group by organization and control type
    const grouped = _.groupBy(data, d => `${d.organization_id}_${d.control_type}`);
    
    Object.keys(grouped).forEach(key => {
      const group = grouped[key];
      if (group.length < 3) return;
      
      const scores = group.map(d => d.compliance_score);
      const mean = _.mean(scores);
      const stdDev = this.calculateStandardDeviation(scores);
      
      // Detect outliers (scores more than 2 standard deviations from mean)
      group.forEach(item => {
        const zScore = Math.abs(item.compliance_score - mean) / stdDev;
        if (zScore > 2) {
          anomalies.push({
            type: 'score_outlier',
            organizationId: item.organization_id,
            organizationName: item.org_name,
            controlType: item.control_type,
            score: item.compliance_score,
            expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev],
            severity: zScore > 3 ? 'high' : 'medium',
            detectedAt: item.updated_at
          });
        }
      });
    });
    
    return anomalies;
  }

  detectPatternAnomalies(data) {
    // Detect unusual patterns in compliance data
    const anomalies = [];
    
    if (!data || data.length < 3) {
      return anomalies;
    }
    
    try {
      // Calculate statistical measures
      const values = data.map(d => d.value || d.score || 0);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Detect outliers using z-score method
      data.forEach((item, index) => {
        const value = item.value || item.score || 0;
        const zScore = Math.abs((value - mean) / stdDev);
        
        if (zScore > 2.5) { // Values more than 2.5 standard deviations from mean
          anomalies.push({
            type: 'pattern_anomaly',
            index,
            value,
            expected: mean,
            deviation: zScore,
            severity: zScore > 3 ? 'high' : 'medium',
            description: `Unusual pattern detected: value ${value} deviates significantly from expected ${mean.toFixed(2)}`,
            timestamp: item.timestamp || new Date().toISOString(),
            metadata: {
              zScore: zScore.toFixed(2),
              mean: mean.toFixed(2),
              stdDev: stdDev.toFixed(2)
            }
          });
        }
      });
      
      // Detect sudden changes in trend
      for (let i = 1; i < values.length; i++) {
        const change = Math.abs(values[i] - values[i-1]);
        const avgChange = values.slice(0, i).reduce((sum, val, idx, arr) => {
          if (idx === 0) return 0;
          return sum + Math.abs(val - arr[idx-1]);
        }, 0) / Math.max(1, i-1);
        
        if (change > avgChange * 3) { // Sudden change is 3x the average change
          anomalies.push({
            type: 'trend_anomaly',
            index: i,
            value: values[i],
            previousValue: values[i-1],
            change,
            expectedChange: avgChange,
            severity: change > avgChange * 5 ? 'high' : 'medium',
            description: `Sudden trend change detected: ${change.toFixed(2)} vs expected ${avgChange.toFixed(2)}`,
            timestamp: data[i].timestamp || new Date().toISOString()
          });
        }
      }
      
    } catch (error) {
      console.error('Pattern anomaly detection error:', error);
    }
    
    return anomalies;
  }

  detectTemporalAnomalies(data) {
    // Detect time-based anomalies
    const anomalies = [];
    
    if (!data || data.length < 5) {
      return anomalies;
    }
    
    try {
      // Sort data by timestamp
      const sortedData = [...data].sort((a, b) => 
        new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
      );
      
      // Detect missing time periods
      for (let i = 1; i < sortedData.length; i++) {
        const current = new Date(sortedData[i].timestamp);
        const previous = new Date(sortedData[i-1].timestamp);
        const timeDiff = current - previous;
        
        // Expected interval (assume daily data if not specified)
        const expectedInterval = 24 * 60 * 60 * 1000; // 1 day in milliseconds
        
        if (timeDiff > expectedInterval * 2) { // Gap more than 2 expected intervals
          anomalies.push({
            type: 'temporal_gap',
            startTime: previous.toISOString(),
            endTime: current.toISOString(),
            gapDuration: timeDiff,
            expectedInterval,
            severity: timeDiff > expectedInterval * 7 ? 'high' : 'medium',
            description: `Data gap detected: ${Math.round(timeDiff / expectedInterval)} intervals missing`,
            timestamp: current.toISOString()
          });
        }
      }
      
      // Detect unusual activity patterns by hour/day
      const hourlyActivity = {};
      const dailyActivity = {};
      
      sortedData.forEach(item => {
        const date = new Date(item.timestamp);
        const hour = date.getHours();
        const day = date.getDay(); // 0 = Sunday, 6 = Saturday
        
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
        dailyActivity[day] = (dailyActivity[day] || 0) + 1;
      });
      
      // Check for unusual hourly patterns (activity outside business hours)
      Object.entries(hourlyActivity).forEach(([hour, count]) => {
        const h = parseInt(hour);
        const totalCount = sortedData.length;
        const percentage = (count / totalCount) * 100;
        
        // Flag if more than 20% of activity happens outside business hours (6 PM - 8 AM)
        if ((h < 8 || h > 18) && percentage > 20) {
          anomalies.push({
            type: 'unusual_hour_activity',
            hour: h,
            count,
            percentage: percentage.toFixed(1),
            severity: percentage > 40 ? 'high' : 'medium',
            description: `Unusual activity pattern: ${percentage.toFixed(1)}% of activity at ${h}:00`,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Check for unusual daily patterns (weekend activity)
      Object.entries(dailyActivity).forEach(([day, count]) => {
        const d = parseInt(day);
        const totalCount = sortedData.length;
        const percentage = (count / totalCount) * 100;
        
        // Flag if more than 15% of activity happens on weekends
        if ((d === 0 || d === 6) && percentage > 15) {
          const dayName = d === 0 ? 'Sunday' : 'Saturday';
          anomalies.push({
            type: 'weekend_activity',
            day: d,
            dayName,
            count,
            percentage: percentage.toFixed(1),
            severity: percentage > 25 ? 'medium' : 'low',
            description: `Unusual weekend activity: ${percentage.toFixed(1)}% on ${dayName}`,
            timestamp: new Date().toISOString()
          });
        }
      });
      
    } catch (error) {
      console.error('Temporal anomaly detection error:', error);
    }
    
    return anomalies;
  }
}

module.exports = PredictiveAnalytics;
