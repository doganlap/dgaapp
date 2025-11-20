const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const _ = require('lodash');

/**
 * Autonomous Assessment Generation System
 * Automatically generates assessments, controls, and scoring based on:
 * - Organization profile and sector
 * - Regulatory frameworks
 * - Historical assessment data
 * - AI-powered content generation
 */
class AutonomousAssessment {
  constructor() {
    this.isInitialized = false;
    this.frameworkTemplates = new Map();
    this.sectorProfiles = new Map();
    this.assessmentPatterns = new Map();
    this.scoringModels = new Map();
  }

  /**
   * Initialize the autonomous assessment system
   */
  async initialize() {
    try {
      console.log('🤖 Initializing Autonomous Assessment System...');
      
      // Load framework templates
      await this.loadFrameworkTemplates();
      
      // Load sector profiles
      await this.loadSectorProfiles();
      
      // Analyze assessment patterns
      await this.analyzeAssessmentPatterns();
      
      // Initialize scoring models
      await this.initializeScoringModels();
      
      this.isInitialized = true;
      console.log('✅ Autonomous Assessment System initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Autonomous Assessment System:', error);
      throw error;
    }
  }

  /**
   * Load framework templates and control mappings
   */
  async loadFrameworkTemplates() {
    try {
      const frameworks = await query(`
        SELECT 
          gf.id,
          gf.name,
          COALESCE(gf.version, '1.0') as version,
          COALESCE(gf.description, '') as description,
          COALESCE(gf.sector_applicability, ARRAY[]::text[]) as sector_applicability,
          COALESCE(gf.complexity_level, 3) as complexity_level,
          COUNT(gc.id) as control_count
        FROM grc_frameworks gf
        LEFT JOIN grc_controls gc ON gf.id = gc.framework_id
        WHERE COALESCE(gf.status, 'active') = 'active'
        GROUP BY gf.id, gf.name, gf.version, gf.description, gf.sector_applicability, gf.complexity_level
        ORDER BY gf.name
      `);

      for (const framework of frameworks.rows) {
        // Load controls for each framework
        const controls = await query(`
          SELECT 
            gc.id,
            COALESCE(gc.control_id, 'CTRL-' || gc.id::text) as control_id,
            COALESCE(gc.title, 'Control Title') as title,
            COALESCE(gc.description, '') as description,
            COALESCE(gc.control_type, 'policy') as control_type,
            COALESCE(gc.priority_level, 'medium') as priority_level,
            COALESCE(gc.implementation_guidance, '') as implementation_guidance,
            COALESCE(gc.testing_procedures, '') as testing_procedures,
            COALESCE(gc.sector_specific_notes, '') as sector_specific_notes,
            sc.sector,
            COALESCE(sc.applicability_score, 50) as applicability_score,
            COALESCE(sc.implementation_complexity, 'medium') as implementation_complexity
          FROM grc_controls gc
          LEFT JOIN sector_controls sc ON gc.id = sc.control_id
          WHERE gc.framework_id = $1
            AND COALESCE(gc.status, 'active') = 'active'
          ORDER BY gc.control_id
        `, [framework.id]);

        this.frameworkTemplates.set(framework.id, {
          ...framework,
          controls: controls.rows
        });
      }

      console.log(`📋 Loaded ${frameworks.rows.length} framework templates`);
    } catch (error) {
      console.error('❌ Error loading framework templates:', error);
      throw error;
    }
  }

  /**
   * Load sector-specific profiles and requirements
   */
  async loadSectorProfiles() {
    try {
      // Get sector statistics and patterns
      const sectorStats = await query(`
        SELECT 
          o.sector,
          COUNT(DISTINCT o.id) as org_count,
          COUNT(DISTINCT a.id) as assessment_count,
          AVG(CASE WHEN a.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate,
          AVG(EXTRACT(EPOCH FROM (a.completed_at - a.created_at))/86400) as avg_completion_days,
          COUNT(DISTINCT gc.framework_id) as framework_count
        FROM organizations o
        LEFT JOIN assessments a ON o.id = a.organization_id
        LEFT JOIN assessment_responses ar ON a.id = ar.assessment_id
        LEFT JOIN grc_controls gc ON ar.control_id = gc.id
        WHERE o.sector IS NOT NULL
        GROUP BY o.sector
        HAVING COUNT(DISTINCT o.id) > 0
        ORDER BY org_count DESC
      `);

      for (const sector of sectorStats.rows) {
        // Get common frameworks for this sector
        const sectorFrameworks = await query(`
          SELECT 
            gf.id,
            gf.name,
            COUNT(DISTINCT a.id) as usage_count,
            AVG(ar.compliance_score) as avg_score
          FROM grc_frameworks gf
          JOIN grc_controls gc ON gf.id = gc.framework_id
          JOIN assessment_responses ar ON gc.id = ar.control_id
          JOIN assessments a ON ar.assessment_id = a.id
          JOIN organizations o ON a.organization_id = o.id
          WHERE o.sector = $1
            AND a.status = 'completed'
          GROUP BY gf.id, gf.name
          ORDER BY usage_count DESC
          LIMIT 10
        `, [sector.sector]);

        // Get common control patterns
        const controlPatterns = await query(`
          SELECT 
            gc.control_type,
            gc.priority_level,
            COUNT(*) as frequency,
            AVG(ar.compliance_score) as avg_score,
            STDDEV(ar.compliance_score) as score_variance
          FROM grc_controls gc
          JOIN assessment_responses ar ON gc.id = ar.control_id
          JOIN assessments a ON ar.assessment_id = a.id
          JOIN organizations o ON a.organization_id = o.id
          WHERE o.sector = $1
            AND a.status = 'completed'
          GROUP BY gc.control_type, gc.priority_level
          ORDER BY frequency DESC
        `, [sector.sector]);

        this.sectorProfiles.set(sector.sector, {
          ...sector,
          frameworks: sectorFrameworks.rows,
          controlPatterns: controlPatterns.rows
        });
      }

      console.log(`🏢 Loaded ${sectorStats.rows.length} sector profiles`);
    } catch (error) {
      console.error('❌ Error loading sector profiles:', error);
      throw error;
    }
  }

  /**
   * Analyze historical assessment patterns for AI training
   */
  async analyzeAssessmentPatterns() {
    try {
      // Analyze completion patterns
      const completionPatterns = await query(`
        SELECT 
          o.sector,
          o.size_category,
          a.assessment_type,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (a.completed_at - a.created_at))/86400) as avg_days,
          AVG(ar.compliance_score) as avg_score,
          COUNT(DISTINCT ar.control_id) as avg_controls
        FROM assessments a
        JOIN organizations o ON a.organization_id = o.id
        JOIN assessment_responses ar ON a.id = ar.assessment_id
        WHERE a.status = 'completed'
          AND a.completed_at IS NOT NULL
        GROUP BY o.sector, o.size_category, a.assessment_type
        HAVING COUNT(*) >= 3
        ORDER BY count DESC
      `);

      // Analyze control difficulty patterns
      const controlDifficulty = await query(`
        SELECT 
          gc.control_type,
          gc.priority_level,
          AVG(ar.compliance_score) as avg_score,
          STDDEV(ar.compliance_score) as score_variance,
          COUNT(CASE WHEN ar.compliance_score < 50 THEN 1 END)::float / COUNT(*) as failure_rate,
          AVG(EXTRACT(EPOCH FROM (ar.updated_at - ar.created_at))/3600) as avg_hours_to_complete
        FROM grc_controls gc
        JOIN assessment_responses ar ON gc.id = ar.control_id
        JOIN assessments a ON ar.assessment_id = a.id
        WHERE a.status = 'completed'
        GROUP BY gc.control_type, gc.priority_level
        HAVING COUNT(*) >= 10
        ORDER BY failure_rate DESC
      `);

      // Store patterns for AI model training
      this.assessmentPatterns.set('completion', completionPatterns.rows);
      this.assessmentPatterns.set('difficulty', controlDifficulty.rows);

      console.log('📊 Assessment patterns analyzed');
    } catch (error) {
      console.error('❌ Error analyzing assessment patterns:', error);
      throw error;
    }
  }

  /**
   * Initialize AI-powered scoring models
   */
  async initializeScoringModels() {
    try {
      // Create scoring models based on historical data
      const scoringData = this.assessmentPatterns.get('difficulty') || [];
      
      scoringData.forEach(pattern => {
        const modelKey = `${pattern.control_type}_${pattern.priority_level}`;
        this.scoringModels.set(modelKey, {
          expectedScore: pattern.avg_score,
          variance: pattern.score_variance,
          failureRate: pattern.failure_rate,
          avgCompletionHours: pattern.avg_hours_to_complete,
          difficulty: this.calculateDifficultyScore(pattern)
        });
      });

      console.log(`🎯 Initialized ${this.scoringModels.size} scoring models`);
    } catch (error) {
      console.error('❌ Error initializing scoring models:', error);
    }
  }

  /**
   * Generate autonomous assessment for an organization
   */
  async generateAssessment(organizationId, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Autonomous Assessment System not initialized');
      }

      console.log(`🤖 Generating autonomous assessment for organization ${organizationId}...`);

      // Get organization profile
      const orgProfile = await this.getOrganizationProfile(organizationId);
      
      // Select appropriate frameworks
      const selectedFrameworks = await this.selectFrameworks(orgProfile, options);
      
      // Generate assessment structure
      const assessmentStructure = await this.generateAssessmentStructure(
        orgProfile, 
        selectedFrameworks, 
        options
      );
      
      // Create assessment in database
      const assessment = await this.createAssessment(
        organizationId, 
        assessmentStructure, 
        options
      );
      
      // Generate controls and questions
      await this.generateControlsAndQuestions(assessment.id, assessmentStructure);
      
      // Generate initial scoring predictions
      await this.generateScoringPredictions(assessment.id, orgProfile);
      
      console.log(`✅ Autonomous assessment generated: ${assessment.id}`);
      
      return assessment;
    } catch (error) {
      console.error('❌ Error generating autonomous assessment:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive organization profile
   */
  async getOrganizationProfile(organizationId) {
    try {
      const orgResult = await query(`
        SELECT 
          o.*,
          COUNT(DISTINCT a.id) as assessment_history_count,
          AVG(CASE WHEN a.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate,
          AVG(ar.compliance_score) as avg_compliance_score,
          COUNT(DISTINCT gc.framework_id) as framework_experience
        FROM organizations o
        LEFT JOIN assessments a ON o.id = a.organization_id
        LEFT JOIN assessment_responses ar ON a.id = ar.assessment_id
        LEFT JOIN grc_controls gc ON ar.control_id = gc.id
        WHERE o.id = $1
        GROUP BY o.id
      `, [organizationId]);

      if (orgResult.rows.length === 0) {
        throw new Error('Organization not found');
      }

      const org = orgResult.rows[0];

      // Get recent assessment performance
      const recentPerformance = await query(`
        SELECT 
          a.id,
          a.name,
          a.status,
          a.created_at,
          a.completed_at,
          AVG(ar.compliance_score) as avg_score
        FROM assessments a
        LEFT JOIN assessment_responses ar ON a.id = ar.assessment_id
        WHERE a.organization_id = $1
          AND a.created_at > NOW() - INTERVAL '1 year'
        GROUP BY a.id, a.name, a.status, a.created_at, a.completed_at
        ORDER BY a.created_at DESC
        LIMIT 5
      `, [organizationId]);

      return {
        ...org,
        recentPerformance: recentPerformance.rows,
        maturityLevel: this.calculateMaturityLevel(org),
        riskProfile: this.calculateRiskProfile(org)
      };
    } catch (error) {
      console.error('❌ Error getting organization profile:', error);
      throw error;
    }
  }

  /**
   * Select appropriate frameworks based on organization profile
   */
  async selectFrameworks(orgProfile, options = {}) {
    try {
      const selectedFrameworks = [];
      
      // Get sector profile
      const sectorProfile = this.sectorProfiles.get(orgProfile.sector);
      
      if (sectorProfile) {
        // Use sector-specific framework recommendations
        const recommendedFrameworks = sectorProfile.frameworks
          .filter(fw => fw.usage_count >= 3) // Only popular frameworks
          .slice(0, options.maxFrameworks || 3);
        
        for (const fw of recommendedFrameworks) {
          const framework = this.frameworkTemplates.get(fw.id);
          if (framework) {
            selectedFrameworks.push({
              ...framework,
              selectionReason: `Popular in ${orgProfile.sector} sector (${fw.usage_count} uses)`,
              expectedScore: fw.avg_score,
              priority: this.calculateFrameworkPriority(framework, orgProfile)
            });
          }
        }
      }

      // Add mandatory frameworks based on organization size and type
      const mandatoryFrameworks = await this.getMandatoryFrameworks(orgProfile);
      for (const fw of mandatoryFrameworks) {
        if (!selectedFrameworks.find(sf => sf.id === fw.id)) {
          selectedFrameworks.push(fw);
        }
      }

      // Sort by priority
      selectedFrameworks.sort((a, b) => b.priority - a.priority);

      return selectedFrameworks.slice(0, options.maxFrameworks || 5);
    } catch (error) {
      console.error('❌ Error selecting frameworks:', error);
      throw error;
    }
  }

  /**
   * Generate assessment structure with AI optimization
   */
  async generateAssessmentStructure(orgProfile, frameworks, options = {}) {
    try {
      const structure = {
        name: this.generateAssessmentName(orgProfile, frameworks),
        description: this.generateAssessmentDescription(orgProfile, frameworks),
        assessmentType: options.assessmentType || 'comprehensive',
        priority: options.priority || 'medium',
        frameworks: frameworks,
        estimatedDuration: this.estimateAssessmentDuration(orgProfile, frameworks),
        complexity: this.calculateAssessmentComplexity(frameworks),
        controls: []
      };

      // Generate control selection for each framework
      for (const framework of frameworks) {
        const frameworkControls = await this.selectControlsForFramework(
          framework, 
          orgProfile, 
          options
        );
        structure.controls.push(...frameworkControls);
      }

      // Optimize control order for better user experience
      structure.controls = this.optimizeControlOrder(structure.controls, orgProfile);

      return structure;
    } catch (error) {
      console.error('❌ Error generating assessment structure:', error);
      throw error;
    }
  }

  /**
   * Select controls for a specific framework based on organization profile
   */
  async selectControlsForFramework(framework, orgProfile, options = {}) {
    try {
      const selectedControls = [];
      const allControls = framework.controls || [];
      
      // Filter controls based on sector applicability
      const applicableControls = allControls.filter(control => {
        // Check if control is applicable to organization's sector
        if (control.sector && control.sector !== orgProfile.sector) {
          return false;
        }
        
        // Check organization maturity level
        if (orgProfile.maturityLevel < 3 && control.priority_level === 'advanced') {
          return false;
        }
        
        return true;
      });

      // Score and rank controls
      const scoredControls = applicableControls.map(control => ({
        ...control,
        relevanceScore: this.calculateControlRelevance(control, orgProfile),
        difficultyScore: this.calculateControlDifficulty(control, orgProfile),
        priorityScore: this.calculateControlPriority(control, orgProfile)
      }));

      // Select controls based on organization size and complexity
      const maxControls = this.calculateMaxControls(orgProfile, framework);
      const sortedControls = scoredControls
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, maxControls);

      // Add framework context to each control
      for (const control of sortedControls) {
        selectedControls.push({
          ...control,
          frameworkId: framework.id,
          frameworkName: framework.name,
          estimatedHours: this.estimateControlCompletionTime(control, orgProfile),
          aiGenerated: true,
          selectionReason: this.generateControlSelectionReason(control, orgProfile)
        });
      }

      return selectedControls;
    } catch (error) {
      console.error('❌ Error selecting controls for framework:', error);
      throw error;
    }
  }

  /**
   * Create assessment in database
   */
  async createAssessment(organizationId, structure, options = {}) {
    try {
      return await transaction(async (client) => {
        // Create main assessment record
        const assessmentId = uuidv4();
        const assessmentResult = await client.query(`
          INSERT INTO assessments (
            id, organization_id, name, description, assessment_type,
            priority, status, estimated_duration_hours, complexity_level,
            ai_generated, ai_generation_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `, [
          assessmentId,
          organizationId,
          structure.name,
          structure.description,
          structure.assessmentType,
          structure.priority,
          'draft',
          structure.estimatedDuration,
          structure.complexity,
          true,
          JSON.stringify({
            frameworks: structure.frameworks.map(f => ({ id: f.id, name: f.name })),
            controlCount: structure.controls.length,
            generationTimestamp: new Date().toISOString(),
            generationVersion: '1.0'
          })
        ]);

        const assessment = assessmentResult.rows[0];

        // Create assessment template associations
        for (const framework of structure.frameworks) {
          await client.query(`
            INSERT INTO assessment_templates (
              id, assessment_id, template_name, template_version,
              framework_id, is_primary, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          `, [
            uuidv4(),
            assessmentId,
            framework.name,
            framework.version,
            framework.id,
            structure.frameworks[0].id === framework.id
          ]);
        }

        return assessment;
      });
    } catch (error) {
      console.error('❌ Error creating assessment:', error);
      throw error;
    }
  }

  /**
   * Generate controls and questions for the assessment
   */
  async generateControlsAndQuestions(assessmentId, structure) {
    try {
      await transaction(async (client) => {
        for (const control of structure.controls) {
          // Create assessment response record
          const responseId = uuidv4();
          await client.query(`
            INSERT INTO assessment_responses (
              id, assessment_id, control_id, question_text, 
              response_type, is_required, display_order,
              ai_generated_question, estimated_completion_minutes,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            responseId,
            assessmentId,
            control.id,
            await this.generateQuestionText(control),
            this.determineResponseType(control),
            control.priority_level !== 'optional',
            structure.controls.indexOf(control) + 1,
            true,
            Math.ceil(control.estimatedHours * 60)
          ]);

          // Generate evidence requirements
          const evidenceRequirements = await this.generateEvidenceRequirements(control);
          for (const evidence of evidenceRequirements) {
            await client.query(`
              INSERT INTO assessment_evidence (
                id, assessment_id, response_id, evidence_type,
                description, is_required, ai_generated,
                created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            `, [
              uuidv4(),
              assessmentId,
              responseId,
              evidence.type,
              evidence.description,
              evidence.required,
              true
            ]);
          }
        }
      });

      console.log(`✅ Generated ${structure.controls.length} controls and questions`);
    } catch (error) {
      console.error('❌ Error generating controls and questions:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered question text for a control
   */
  async generateQuestionText(control) {
    try {
      // Use AI service if available, otherwise use template-based generation
      if (process.env.RAG_SERVICE_URL) {
        const response = await axios.post(`${process.env.RAG_SERVICE_URL}/api/rag/query`, {
          question: `Generate a comprehensive assessment question for the control: ${control.title}. The question should be specific, measurable, and help assess compliance with: ${control.description}`,
          taskType: 'assessmentGeneration',
          tenantId: 'system'
        }, {
          headers: {
            'X-Service-Token': process.env.SERVICE_TOKEN || 'default-token'
          }
        });

        if (response.data.success && response.data.answer) {
          return response.data.answer;
        }
      }

      // Fallback to template-based generation
      return this.generateQuestionFromTemplate(control);
    } catch (error) {
      console.error('❌ Error generating AI question text:', error);
      return this.generateQuestionFromTemplate(control);
    }
  }

  /**
   * Generate question from template (fallback method)
   */
  generateQuestionFromTemplate(control) {
    const templates = {
      'policy': `Does your organization have a documented ${control.title.toLowerCase()} policy? Please describe the policy scope, approval process, and review frequency.`,
      'procedure': `What procedures are in place for ${control.title.toLowerCase()}? Please provide details on implementation steps, responsible parties, and monitoring mechanisms.`,
      'technical': `How does your organization implement ${control.title.toLowerCase()}? Please describe technical controls, configurations, and validation methods.`,
      'governance': `What governance structure exists for ${control.title.toLowerCase()}? Please describe oversight responsibilities, reporting mechanisms, and decision-making processes.`
    };

    const controlType = control.control_type || 'policy';
    const template = templates[controlType] || templates['policy'];
    
    return template;
  }

  /**
   * Generate evidence requirements for a control
   */
  async generateEvidenceRequirements(control) {
    const evidenceTypes = {
      'policy': [
        { type: 'document', description: 'Policy document', required: true },
        { type: 'document', description: 'Approval records', required: true },
        { type: 'document', description: 'Review and update history', required: false }
      ],
      'procedure': [
        { type: 'document', description: 'Procedure documentation', required: true },
        { type: 'document', description: 'Training records', required: false },
        { type: 'screenshot', description: 'Implementation evidence', required: false }
      ],
      'technical': [
        { type: 'screenshot', description: 'System configuration', required: true },
        { type: 'document', description: 'Technical specifications', required: true },
        { type: 'log', description: 'System logs or reports', required: false }
      ],
      'governance': [
        { type: 'document', description: 'Governance charter or framework', required: true },
        { type: 'document', description: 'Meeting minutes or reports', required: false },
        { type: 'document', description: 'Organizational chart', required: false }
      ]
    };

    const controlType = control.control_type || 'policy';
    return evidenceTypes[controlType] || evidenceTypes['policy'];
  }

  /**
   * Generate scoring predictions for the assessment
   */
  async generateScoringPredictions(assessmentId, orgProfile) {
    try {
      const responses = await query(`
        SELECT ar.id, ar.control_id, gc.control_type, gc.priority_level
        FROM assessment_responses ar
        JOIN grc_controls gc ON ar.control_id = gc.id
        WHERE ar.assessment_id = $1
      `, [assessmentId]);

      for (const response of responses.rows) {
        const modelKey = `${response.control_type}_${response.priority_level}`;
        const scoringModel = this.scoringModels.get(modelKey);
        
        let predictedScore = 70; // Default prediction
        let confidence = 0.5;

        if (scoringModel) {
          // Adjust prediction based on organization maturity
          predictedScore = scoringModel.expectedScore;
          
          // Adjust for organization maturity level
          const maturityAdjustment = (orgProfile.maturityLevel - 3) * 5;
          predictedScore += maturityAdjustment;
          
          // Adjust for organization size
          if (orgProfile.size_category === 'large') {
            predictedScore += 5;
          } else if (orgProfile.size_category === 'small') {
            predictedScore -= 5;
          }
          
          // Calculate confidence based on historical data
          confidence = Math.max(0.3, Math.min(0.9, 1 - (scoringModel.variance / 100)));
        }

        // Store prediction
        await query(`
          UPDATE assessment_responses 
          SET 
            ai_predicted_score = $1,
            ai_prediction_confidence = $2,
            ai_prediction_metadata = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [
          Math.max(0, Math.min(100, predictedScore)),
          confidence,
          JSON.stringify({
            model: modelKey,
            factors: {
              maturityLevel: orgProfile.maturityLevel,
              sizeCategory: orgProfile.size_category,
              historicalPerformance: orgProfile.avg_compliance_score
            }
          }),
          response.id
        ]);
      }

      console.log(`🎯 Generated scoring predictions for ${responses.rows.length} controls`);
    } catch (error) {
      console.error('❌ Error generating scoring predictions:', error);
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  calculateMaturityLevel(org) {
    let maturity = 1; // Basic level

    // Factor in assessment history
    if (org.assessment_history_count > 10) maturity += 2;
    else if (org.assessment_history_count > 5) maturity += 1;

    // Factor in completion rate
    if (org.completion_rate > 0.8) maturity += 1;

    // Factor in average compliance score
    if (org.avg_compliance_score > 80) maturity += 2;
    else if (org.avg_compliance_score > 60) maturity += 1;

    // Factor in framework experience
    if (org.framework_experience > 5) maturity += 1;

    return Math.min(5, maturity);
  }

  calculateRiskProfile(org) {
    let risk = 'medium'; // Default

    // High-risk sectors
    const highRiskSectors = ['healthcare', 'financial', 'government', 'energy'];
    if (highRiskSectors.includes(org.sector)) {
      risk = 'high';
    }

    // Large organizations typically have higher risk
    if (org.size_category === 'large') {
      risk = risk === 'medium' ? 'high' : risk;
    }

    // Low compliance history increases risk
    if (org.avg_compliance_score < 50) {
      risk = 'high';
    }

    return risk;
  }

  calculateFrameworkPriority(framework, orgProfile) {
    let priority = 50; // Base priority

    // Sector alignment
    if (framework.sector_applicability && 
        framework.sector_applicability.includes(orgProfile.sector)) {
      priority += 30;
    }

    // Complexity vs maturity alignment
    const complexityMatch = Math.abs(framework.complexity_level - orgProfile.maturityLevel);
    priority += (5 - complexityMatch) * 5;

    // Size appropriateness
    if (orgProfile.size_category === 'large' && framework.complexity_level >= 4) {
      priority += 10;
    } else if (orgProfile.size_category === 'small' && framework.complexity_level <= 2) {
      priority += 10;
    }

    return priority;
  }

  async getMandatoryFrameworks(orgProfile) {
    // Define mandatory frameworks based on sector and size
    const mandatoryMappings = {
      'healthcare': ['HIPAA', 'HITECH'],
      'financial': ['SOX', 'PCI-DSS'],
      'government': ['NIST', 'FedRAMP'],
      'technology': ['SOC2', 'ISO27001']
    };

    const mandatory = mandatoryMappings[orgProfile.sector] || [];
    const frameworks = [];

    for (const frameworkName of mandatory) {
      for (const [id, framework] of this.frameworkTemplates.entries()) {
        if (framework.name.includes(frameworkName)) {
          frameworks.push({
            ...framework,
            selectionReason: `Mandatory for ${orgProfile.sector} sector`,
            priority: 100
          });
          break;
        }
      }
    }

    return frameworks;
  }

  generateAssessmentName(orgProfile, frameworks) {
    const frameworkNames = frameworks.map(f => f.name).slice(0, 2).join(' & ');
    const date = new Date().toISOString().split('T')[0];
    return `${orgProfile.name} - ${frameworkNames} Assessment (${date})`;
  }

  generateAssessmentDescription(orgProfile, frameworks) {
    return `Autonomous assessment generated for ${orgProfile.name} (${orgProfile.sector} sector) ` +
           `covering ${frameworks.length} framework(s): ${frameworks.map(f => f.name).join(', ')}. ` +
           `This assessment is tailored to your organization's maturity level and sector requirements.`;
  }

  estimateAssessmentDuration(orgProfile, frameworks) {
    let baseHours = 20; // Minimum assessment time

    // Add time per framework
    baseHours += frameworks.length * 15;

    // Adjust for organization size
    const sizeMultipliers = {
      'small': 0.7,
      'medium': 1.0,
      'large': 1.5,
      'enterprise': 2.0
    };
    baseHours *= sizeMultipliers[orgProfile.size_category] || 1.0;

    // Adjust for maturity (more mature orgs are faster)
    baseHours *= (6 - orgProfile.maturityLevel) / 5;

    return Math.ceil(baseHours);
  }

  calculateAssessmentComplexity(frameworks) {
    const avgComplexity = _.mean(frameworks.map(f => f.complexity_level || 3));
    
    if (avgComplexity >= 4) return 'high';
    if (avgComplexity >= 3) return 'medium';
    return 'low';
  }

  calculateControlRelevance(control, orgProfile) {
    let relevance = 50; // Base relevance

    // Sector-specific controls get higher relevance
    if (control.sector === orgProfile.sector) {
      relevance += 30;
    }

    // Priority level alignment
    const priorityScores = {
      'critical': 100,
      'high': 80,
      'medium': 60,
      'low': 40,
      'optional': 20
    };
    relevance += (priorityScores[control.priority_level] || 50) * 0.3;

    return relevance;
  }

  calculateControlDifficulty(control, orgProfile) {
    const modelKey = `${control.control_type}_${control.priority_level}`;
    const scoringModel = this.scoringModels.get(modelKey);
    
    if (scoringModel) {
      return scoringModel.difficulty;
    }

    // Default difficulty calculation
    const difficultyMap = {
      'critical': 90,
      'high': 70,
      'medium': 50,
      'low': 30,
      'optional': 20
    };

    return difficultyMap[control.priority_level] || 50;
  }

  calculateControlPriority(control, orgProfile) {
    const relevance = this.calculateControlRelevance(control, orgProfile);
    const difficulty = this.calculateControlDifficulty(control, orgProfile);
    
    // Higher relevance, appropriate difficulty = higher priority
    return relevance - (Math.abs(difficulty - (orgProfile.maturityLevel * 20)) * 0.5);
  }

  calculateMaxControls(orgProfile, framework) {
    let baseControls = 20; // Default

    // Adjust for organization size
    const sizeMultipliers = {
      'small': 0.6,
      'medium': 1.0,
      'large': 1.4,
      'enterprise': 2.0
    };
    baseControls *= sizeMultipliers[orgProfile.size_category] || 1.0;

    // Adjust for maturity
    baseControls *= (orgProfile.maturityLevel / 3);

    // Framework-specific limits
    const totalControls = framework.controls?.length || 50;
    return Math.min(Math.ceil(baseControls), Math.floor(totalControls * 0.8));
  }

  estimateControlCompletionTime(control, orgProfile) {
    let baseHours = 2; // Default

    // Adjust by control type
    const typeMultipliers = {
      'policy': 1.0,
      'procedure': 1.5,
      'technical': 2.0,
      'governance': 1.2
    };
    baseHours *= typeMultipliers[control.control_type] || 1.0;

    // Adjust by priority
    const priorityMultipliers = {
      'critical': 2.0,
      'high': 1.5,
      'medium': 1.0,
      'low': 0.7,
      'optional': 0.5
    };
    baseHours *= priorityMultipliers[control.priority_level] || 1.0;

    // Adjust for organization maturity (more mature = faster)
    baseHours *= (6 - orgProfile.maturityLevel) / 5;

    return Math.max(0.5, Math.ceil(baseHours * 10) / 10);
  }

  generateControlSelectionReason(control, orgProfile) {
    const reasons = [];

    if (control.sector === orgProfile.sector) {
      reasons.push(`sector-specific for ${orgProfile.sector}`);
    }

    if (control.priority_level === 'critical') {
      reasons.push('critical priority');
    }

    if (control.relevanceScore > 80) {
      reasons.push('high relevance');
    }

    return reasons.join(', ') || 'standard requirement';
  }

  optimizeControlOrder(controls, orgProfile) {
    // Sort controls for optimal user experience
    return controls.sort((a, b) => {
      // Critical controls first
      if (a.priority_level === 'critical' && b.priority_level !== 'critical') return -1;
      if (b.priority_level === 'critical' && a.priority_level !== 'critical') return 1;

      // Then by difficulty (easier first for momentum)
      const diffA = this.calculateControlDifficulty(a, orgProfile);
      const diffB = this.calculateControlDifficulty(b, orgProfile);
      
      return diffA - diffB;
    });
  }

  determineResponseType(control) {
    // Determine the most appropriate response type based on control characteristics
    if (control.control_type === 'technical') {
      return 'file_upload'; // Technical controls often need screenshots/configs
    } else if (control.priority_level === 'critical') {
      return 'long_text'; // Critical controls need detailed responses
    } else {
      return 'short_text'; // Default to short text
    }
  }

  calculateDifficultyScore(pattern) {
    // Calculate difficulty based on failure rate and completion time
    let difficulty = 50; // Base difficulty

    // Higher failure rate = higher difficulty
    difficulty += pattern.failure_rate * 50;

    // Longer completion time = higher difficulty
    if (pattern.avg_hours_to_complete > 8) {
      difficulty += 20;
    } else if (pattern.avg_hours_to_complete > 4) {
      difficulty += 10;
    }

    // Lower average score = higher difficulty
    difficulty += (100 - pattern.avg_score) * 0.3;

    return Math.min(100, Math.max(10, difficulty));
  }
}

module.exports = AutonomousAssessment;
