const { query } = require('../config/database');
let tf;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (error) {
  console.warn('TensorFlow not available, using fallback ML implementation');
  tf = null;
}
const { Matrix } = require('ml-matrix');
const moment = require('moment');
const _ = require('lodash');

/**
 * AI-Powered Autonomous Scheduler
 * Uses machine learning to optimize task scheduling, predict completion times,
 * and automatically assign tasks based on historical data and user patterns
 */
class AIScheduler {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.taskPatterns = new Map();
    this.userPerformanceProfiles = new Map();
    this.optimizationHistory = [];
  }

  /**
   * Initialize the AI scheduler with historical data and trained models
   */
  async initialize() {
    try {
      console.log('🤖 Initializing AI Scheduler...');
      
      // Load historical task data for training
      await this.loadHistoricalData();
      
      // Initialize or load pre-trained model
      await this.initializeModel();
      
      // Build user performance profiles
      await this.buildUserProfiles();
      
      // Analyze task patterns
      await this.analyzeTaskPatterns();
      
      this.isInitialized = true;
      console.log('✅ AI Scheduler initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Scheduler:', error);
      throw error;
    }
  }

  /**
   * Load historical task and assessment data for ML training
   */
  async loadHistoricalData() {
    try {
      console.log('📊 Loading historical data for AI scheduler...');
      
      // Load real historical data from database
      const assessmentsData = await this.db.query(`
        SELECT 
          a.id,
          a.name,
          a.status,
          a.priority,
          a.created_at,
          a.updated_at,
          a.completed_at,
          a.organization_id,
          o.sector,
          o.size_category,
          COUNT(DISTINCT ar.id) as response_count,
          COUNT(DISTINCT ae.id) as evidence_count,
          EXTRACT(EPOCH FROM (a.completed_at - a.created_at))/3600 as completion_hours
        FROM assessments a
        JOIN organizations o ON a.organization_id = o.id
        LEFT JOIN assessment_responses ar ON a.id = ar.assessment_id
        LEFT JOIN assessment_evidence ae ON a.id = ae.assessment_id
        WHERE a.status = 'completed' 
          AND a.completed_at IS NOT NULL
          AND a.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY a.id, a.name, a.status, a.priority, a.created_at, a.updated_at, 
                 a.completed_at, a.organization_id, o.sector, o.size_category
        ORDER BY a.created_at DESC
        LIMIT 1000
      `);
      
      const workflowsData = await this.db.query(`
        SELECT 
          w.id,
          w.workflow_type,
          w.priority,
          w.status,
          w.created_at,
          w.updated_at,
          w.completed_at,
          w.organization_id,
          o.sector,
          o.size_category,
          COUNT(DISTINCT wt.id) as task_count,
          EXTRACT(EPOCH FROM (w.completed_at - w.created_at))/3600 as completion_hours
        FROM workflows w
        JOIN organizations o ON w.organization_id = o.id
        LEFT JOIN workflow_tasks wt ON w.id = wt.workflow_id
        WHERE w.status = 'completed'
          AND w.completed_at IS NOT NULL
          AND w.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY w.id, w.workflow_type, w.priority, w.status, w.created_at, 
                 w.updated_at, w.completed_at, w.organization_id, o.sector, o.size_category
        ORDER BY w.created_at DESC
        LIMIT 1000
      `);
      
      this.historicalAssessments = assessmentsData.rows || [];
      this.historicalWorkflows = workflowsData.rows || [];
      
      console.log(`📊 Loaded ${this.historicalAssessments.length} assessments and ${this.historicalWorkflows.length} workflows from database`);
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
      // Use empty arrays as fallback - no mock data
      this.historicalAssessments = [];
      this.historicalWorkflows = [];
    }
  }

  /**
   * Initialize or load the ML model for task completion prediction
   */
  async initializeModel() {
    try {
      // Check if TensorFlow is available
      if (!tf) {
        console.warn('TensorFlow not available, using rule-based scheduling');
        this.model = {
          predict: (input) => {
            // Simple rule-based prediction fallback
            const [priority, complexity, userExperience, taskType, organizationSize, sector, evidenceCount, responseCount] = input;
            
            // Base prediction on simple rules
            let baseHours = 24; // Default 24 hours
            
            // Adjust based on priority
            if (priority === 'high') baseHours *= 0.5;
            else if (priority === 'medium') baseHours *= 0.8;
            
            // Adjust based on complexity
            if (complexity === 'complex') baseHours *= 2;
            else if (complexity === 'moderate') baseHours *= 1.5;
            
            // Adjust based on user experience
            if (userExperience > 0.8) baseHours *= 0.7;
            else if (userExperience < 0.3) baseHours *= 1.3;
            
            return [[baseHours]];
          }
        };
        return;
      }

      // For now, create a simple neural network for task completion prediction
      // In production, you might load a pre-trained model
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [8], units: 16, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 8, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'linear' })
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Train the model if we have sufficient data
      if (this.historicalWorkflows.length > 50) {
        await this.trainModel();
      }

      console.log('🧠 ML model initialized');
    } catch (error) {
      console.error('❌ Error initializing ML model:', error);
      // Continue without ML model - use heuristic methods
      this.model = null;
    }
  }

  /**
   * Train the ML model on historical data
   */
  async trainModel() {
    try {
      const trainingData = this.prepareTrainingData();
      if (trainingData.inputs.length < 10) {
        console.log('⚠️ Insufficient training data, skipping model training');
        return;
      }

      const xs = tf.tensor2d(trainingData.inputs);
      const ys = tf.tensor2d(trainingData.outputs, [trainingData.outputs.length, 1]);

      await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        verbose: 0
      });

      xs.dispose();
      ys.dispose();

      console.log('🎯 Model training completed');
    } catch (error) {
      console.error('❌ Error training model:', error);
    }
  }

  /**
   * Prepare training data from historical workflows
   */
  prepareTrainingData() {
    const inputs = [];
    const outputs = [];

    this.historicalWorkflows.forEach(workflow => {
      if (workflow.completion_hours && workflow.completion_hours > 0) {
        // Feature engineering: convert categorical data to numerical
        const features = [
          this.encodeWorkflowType(workflow.workflow_type),
          this.encodePriority(workflow.priority),
          this.encodeRole(workflow.role),
          this.encodeExperienceLevel(workflow.experience_level),
          moment(workflow.assigned_at).hour(), // Hour of day
          moment(workflow.assigned_at).day(),  // Day of week
          Math.log(workflow.completion_hours + 1), // Log transform for better distribution
          1 // Bias term
        ];

        inputs.push(features);
        outputs.push(workflow.completion_hours);
      }
    });

    return { inputs, outputs };
  }

  /**
   * Build performance profiles for users based on historical data
   */
  async buildUserProfiles() {
    try {
      const userStats = {};

      this.historicalWorkflows.forEach(workflow => {
        if (!workflow.assigned_to || !workflow.completion_hours) return;

        if (!userStats[workflow.assigned_to]) {
          userStats[workflow.assigned_to] = {
            tasks: [],
            avgCompletionTime: 0,
            reliability: 0,
            expertise: {},
            workloadCapacity: 0
          };
        }

        userStats[workflow.assigned_to].tasks.push(workflow);
      });

      // Calculate performance metrics for each user
      Object.keys(userStats).forEach(userId => {
        const user = userStats[userId];
        const tasks = user.tasks;

        // Average completion time
        user.avgCompletionTime = _.mean(tasks.map(t => t.completion_hours));

        // Reliability (percentage of tasks completed on time)
        user.reliability = tasks.filter(t => t.status === 'completed').length / tasks.length;

        // Expertise by workflow type
        const expertiseByType = _.groupBy(tasks, 'workflow_type');
        Object.keys(expertiseByType).forEach(type => {
          const typeTasks = expertiseByType[type];
          user.expertise[type] = {
            count: typeTasks.length,
            avgTime: _.mean(typeTasks.map(t => t.completion_hours)),
            successRate: typeTasks.filter(t => t.status === 'completed').length / typeTasks.length
          };
        });

        // Workload capacity (tasks per week)
        const weeklyTasks = _.groupBy(tasks, t => moment(t.assigned_at).format('YYYY-WW'));
        user.workloadCapacity = _.mean(Object.values(weeklyTasks).map(week => week.length));

        this.userPerformanceProfiles.set(userId, user);
      });

      console.log(`👥 Built performance profiles for ${Object.keys(userStats).length} users`);
    } catch (error) {
      console.error('❌ Error building user profiles:', error);
    }
  }

  /**
   * Analyze task patterns and identify optimization opportunities
   */
  async analyzeTaskPatterns() {
    try {
      // Analyze completion time patterns by various factors
      const patterns = {
        byWorkflowType: {},
        byPriority: {},
        byTimeOfDay: {},
        byDayOfWeek: {},
        bySector: {}
      };

      this.historicalWorkflows.forEach(workflow => {
        if (!workflow.completion_hours) return;

        // By workflow type
        if (!patterns.byWorkflowType[workflow.workflow_type]) {
          patterns.byWorkflowType[workflow.workflow_type] = [];
        }
        patterns.byWorkflowType[workflow.workflow_type].push(workflow.completion_hours);

        // By priority
        if (!patterns.byPriority[workflow.priority]) {
          patterns.byPriority[workflow.priority] = [];
        }
        patterns.byPriority[workflow.priority].push(workflow.completion_hours);

        // By time of day
        const hour = moment(workflow.assigned_at).hour();
        const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        if (!patterns.byTimeOfDay[timeSlot]) {
          patterns.byTimeOfDay[timeSlot] = [];
        }
        patterns.byTimeOfDay[timeSlot].push(workflow.completion_hours);

        // By day of week
        const dayOfWeek = moment(workflow.assigned_at).format('dddd');
        if (!patterns.byDayOfWeek[dayOfWeek]) {
          patterns.byDayOfWeek[dayOfWeek] = [];
        }
        patterns.byDayOfWeek[dayOfWeek].push(workflow.completion_hours);
      });

      // Calculate statistics for each pattern
      Object.keys(patterns).forEach(patternType => {
        Object.keys(patterns[patternType]).forEach(key => {
          const times = patterns[patternType][key];
          patterns[patternType][key] = {
            count: times.length,
            avg: _.mean(times),
            median: this.median(times),
            std: this.standardDeviation(times),
            min: Math.min(...times),
            max: Math.max(...times)
          };
        });
      });

      this.taskPatterns = patterns;
      console.log('📈 Task patterns analyzed successfully');
    } catch (error) {
      console.error('❌ Error analyzing task patterns:', error);
    }
  }

  /**
   * Main optimization function - runs every 5 minutes
   */
  async optimizeScheduling() {
    if (!this.isInitialized) {
      console.log('⚠️ AI Scheduler not initialized, skipping optimization');
      return;
    }

    try {
      console.log('🔄 Starting autonomous scheduling optimization...');

      // Get pending tasks
      const pendingTasks = await this.getPendingTasks();
      
      if (pendingTasks.length === 0) {
        console.log('✅ No pending tasks to optimize');
        return;
      }

      // Get available users
      const availableUsers = await this.getAvailableUsers();

      // Optimize task assignments
      const optimizations = await this.generateOptimalAssignments(pendingTasks, availableUsers);

      // Apply optimizations
      await this.applyOptimizations(optimizations);

      console.log(`✅ Optimization completed: ${optimizations.length} tasks optimized`);
    } catch (error) {
      console.error('❌ Error in scheduling optimization:', error);
    }
  }

  /**
   * Get pending tasks that need assignment or re-assignment
   */
  async getPendingTasks() {
    try {
      const result = await query(`
        SELECT 
          aw.id,
          aw.assessment_id,
          aw.workflow_type,
          aw.priority,
          aw.assigned_to,
          aw.due_date,
          aw.created_at,
          a.organization_id,
          o.sector,
          o.size_category
        FROM assessment_workflow aw
        JOIN assessments a ON aw.assessment_id = a.id
        JOIN organizations o ON a.organization_id = o.id
        WHERE aw.status IN ('pending', 'assigned') 
          AND aw.is_active = true
          AND (aw.assigned_to IS NULL OR aw.assigned_at < NOW() - INTERVAL '2 hours')
        ORDER BY 
          CASE aw.priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          aw.created_at ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting pending tasks:', error);
      return [];
    }
  }

  /**
   * Get available users with their current workload
   */
  async getAvailableUsers() {
    try {
      const result = await query(`
        SELECT 
          u.id,
          u.role,
          u.experience_level,
          u.organization_id,
          COUNT(aw.id) as current_workload,
          AVG(CASE WHEN aw.completed_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (aw.completed_at - aw.assigned_at))/3600 
              ELSE NULL END) as avg_completion_time
        FROM users u
        LEFT JOIN assessment_workflow aw ON u.id = aw.assigned_to 
          AND aw.status IN ('assigned', 'in_progress')
          AND aw.is_active = true
        WHERE u.status = 'active'
          AND u.role IN ('manager', 'analyst', 'auditor', 'compliance_officer')
        GROUP BY u.id, u.role, u.experience_level, u.organization_id
        HAVING COUNT(aw.id) < 10  -- Max workload limit
        ORDER BY current_workload ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting available users:', error);
      return [];
    }
  }

  /**
   * Generate optimal task assignments using AI/ML
   */
  async generateOptimalAssignments(tasks, users) {
    const assignments = [];

    for (const task of tasks) {
      const bestUser = await this.findBestUserForTask(task, users);
      
      if (bestUser) {
        const estimatedCompletionTime = await this.predictCompletionTime(task, bestUser);
        
        assignments.push({
          taskId: task.id,
          userId: bestUser.id,
          estimatedHours: estimatedCompletionTime,
          confidence: this.calculateAssignmentConfidence(task, bestUser),
          reasoning: this.generateAssignmentReasoning(task, bestUser)
        });

        // Update user's workload for next iteration
        bestUser.current_workload += 1;
      }
    }

    return assignments;
  }

  /**
   * Find the best user for a specific task using ML and heuristics
   */
  async findBestUserForTask(task, users) {
    let bestUser = null;
    let bestScore = -1;

    for (const user of users) {
      const score = await this.calculateUserTaskScore(user, task);
      
      if (score > bestScore) {
        bestScore = score;
        bestUser = user;
      }
    }

    return bestUser;
  }

  /**
   * Calculate how well a user matches a task
   */
  async calculateUserTaskScore(user, task) {
    let score = 0;

    // Base score from user performance profile
    const profile = this.userPerformanceProfiles.get(user.id);
    if (profile) {
      // Expertise in this workflow type
      const expertise = profile.expertise[task.workflow_type];
      if (expertise) {
        score += expertise.successRate * 30; // Up to 30 points for success rate
        score += Math.max(0, 20 - expertise.avgTime) * 2; // Faster completion = higher score
      }

      // Reliability bonus
      score += profile.reliability * 20; // Up to 20 points for reliability

      // Workload penalty
      score -= user.current_workload * 5; // Penalty for high workload
    }

    // Role matching
    const roleMatch = this.getRoleMatchScore(user.role, task.workflow_type);
    score += roleMatch * 15; // Up to 15 points for role match

    // Experience level bonus
    const experienceBonus = this.getExperienceLevelScore(user.experience_level);
    score += experienceBonus * 10; // Up to 10 points for experience

    // Priority urgency factor
    const priorityMultiplier = this.getPriorityMultiplier(task.priority);
    score *= priorityMultiplier;

    return Math.max(0, score);
  }

  /**
   * Predict task completion time using ML model or heuristics
   */
  async predictCompletionTime(task, user) {
    try {
      if (this.model) {
        // Use ML model for prediction
        const features = tf.tensor2d([[
          this.encodeWorkflowType(task.workflow_type),
          this.encodePriority(task.priority),
          this.encodeRole(user.role),
          this.encodeExperienceLevel(user.experience_level),
          moment().hour(),
          moment().day(),
          await this.getHistoricalAverage(user.id, task.type), // Historical average completion time
          1  // Bias term
        ]]);

        const prediction = this.model.predict(features);
        const hours = await prediction.data();
        
        features.dispose();
        prediction.dispose();

        return Math.max(0.5, hours[0]); // Minimum 30 minutes
      } else {
        // Use heuristic method
        return this.heuristicCompletionTime(task, user);
      }
    } catch (error) {
      console.error('❌ Error predicting completion time:', error);
      return this.heuristicCompletionTime(task, user);
    }
  }

  /**
   * Heuristic-based completion time estimation
   */
  heuristicCompletionTime(task, user) {
    let baseTime = 4; // Default 4 hours

    // Adjust by workflow type
    const workflowTimeMap = {
      'assessment_approval': 2,
      'evidence_review': 3,
      'compliance_review': 6,
      'remediation_approval': 4
    };
    baseTime = workflowTimeMap[task.workflow_type] || baseTime;

    // Adjust by priority
    const priorityMultiplier = {
      'critical': 0.8, // Rush job
      'high': 0.9,
      'medium': 1.0,
      'low': 1.2
    };
    baseTime *= priorityMultiplier[task.priority] || 1.0;

    // Adjust by user experience
    const experienceMultiplier = {
      'junior': 1.5,
      'mid': 1.0,
      'senior': 0.8,
      'expert': 0.6
    };
    baseTime *= experienceMultiplier[user.experience_level] || 1.0;

    // Add workload factor
    baseTime *= (1 + user.current_workload * 0.1);

    return Math.round(baseTime * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Apply the generated optimizations
   */
  async applyOptimizations(optimizations) {
    for (const optimization of optimizations) {
      try {
        await query(`
          UPDATE assessment_workflow 
          SET 
            assigned_to = $1,
            assigned_at = CURRENT_TIMESTAMP,
            status = 'assigned',
            estimated_completion_hours = $2,
            ai_assignment_confidence = $3,
            ai_assignment_reasoning = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [
          optimization.userId,
          optimization.estimatedHours,
          optimization.confidence,
          optimization.reasoning,
          optimization.taskId
        ]);

        // Log the optimization
        await query(`
          INSERT INTO ai_optimization_log (
            id, task_id, user_id, optimization_type, confidence, reasoning, created_at
          ) VALUES ($1, $2, $3, 'auto_assignment', $4, $5, CURRENT_TIMESTAMP)
        `, [
          require('uuid').v4(),
          optimization.taskId,
          optimization.userId,
          optimization.confidence,
          optimization.reasoning
        ]);

      } catch (error) {
        console.error(`❌ Error applying optimization for task ${optimization.taskId}:`, error);
      }
    }
  }

  /**
   * Comprehensive daily optimization
   */
  async comprehensiveOptimization() {
    try {
      console.log('🧠 Running comprehensive daily optimization...');

      // Retrain model with latest data
      await this.loadHistoricalData();
      if (this.historicalWorkflows.length > 50) {
        await this.trainModel();
      }

      // Update user profiles
      await this.buildUserProfiles();

      // Analyze new patterns
      await this.analyzeTaskPatterns();

      // Generate optimization report
      await this.generateOptimizationReport();

      console.log('✅ Comprehensive optimization completed');
    } catch (error) {
      console.error('❌ Error in comprehensive optimization:', error);
    }
  }

  /**
   * Generate daily optimization insights report
   */
  async generateOptimizationReport() {
    try {
      const report = {
        date: moment().format('YYYY-MM-DD'),
        totalOptimizations: this.optimizationHistory.length,
        averageConfidence: _.mean(this.optimizationHistory.map(o => o.confidence)),
        topPerformers: this.getTopPerformers(),
        bottlenecks: await this.identifyBottlenecks(),
        recommendations: this.generateRecommendations()
      };

      // Store report in database
      await query(`
        INSERT INTO ai_optimization_reports (
          id, report_date, report_data, created_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [
        require('uuid').v4(),
        report.date,
        JSON.stringify(report)
      ]);

      console.log('📊 Daily optimization report generated');
    } catch (error) {
      console.error('❌ Error generating optimization report:', error);
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  encodeWorkflowType(type) {
    const mapping = {
      'assessment_approval': 1,
      'evidence_review': 2,
      'compliance_review': 3,
      'remediation_approval': 4
    };
    return mapping[type] || 0;
  }

  encodePriority(priority) {
    const mapping = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    return mapping[priority] || 2;
  }

  encodeRole(role) {
    const mapping = {
      'analyst': 1,
      'auditor': 2,
      'manager': 3,
      'compliance_officer': 4,
      'admin': 5
    };
    return mapping[role] || 1;
  }

  encodeExperienceLevel(level) {
    const mapping = {
      'junior': 1,
      'mid': 2,
      'senior': 3,
      'expert': 4
    };
    return mapping[level] || 2;
  }

  getRoleMatchScore(role, workflowType) {
    const roleWorkflowMatrix = {
      'analyst': {
        'assessment_approval': 0.7,
        'evidence_review': 0.9,
        'compliance_review': 0.8,
        'remediation_approval': 0.6
      },
      'auditor': {
        'assessment_approval': 0.9,
        'evidence_review': 0.8,
        'compliance_review': 0.9,
        'remediation_approval': 0.7
      },
      'manager': {
        'assessment_approval': 0.8,
        'evidence_review': 0.6,
        'compliance_review': 0.7,
        'remediation_approval': 0.9
      },
      'compliance_officer': {
        'assessment_approval': 0.9,
        'evidence_review': 0.7,
        'compliance_review': 0.9,
        'remediation_approval': 0.8
      }
    };

    return roleWorkflowMatrix[role]?.[workflowType] || 0.5;
  }

  getExperienceLevelScore(level) {
    const mapping = {
      'junior': 0.6,
      'mid': 0.8,
      'senior': 0.9,
      'expert': 1.0
    };
    return mapping[level] || 0.7;
  }

  getPriorityMultiplier(priority) {
    const mapping = {
      'critical': 1.3,
      'high': 1.1,
      'medium': 1.0,
      'low': 0.9
    };
    return mapping[priority] || 1.0;
  }

  calculateAssignmentConfidence(task, user) {
    // Simple confidence calculation based on available data
    let confidence = 0.5; // Base confidence

    const profile = this.userPerformanceProfiles.get(user.id);
    if (profile) {
      const expertise = profile.expertise[task.workflow_type];
      if (expertise && expertise.count > 5) {
        confidence += expertise.successRate * 0.3;
      }
      confidence += profile.reliability * 0.2;
    }

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  generateAssignmentReasoning(task, user) {
    const reasons = [];
    
    const profile = this.userPerformanceProfiles.get(user.id);
    if (profile) {
      const expertise = profile.expertise[task.workflow_type];
      if (expertise) {
        reasons.push(`${expertise.count} completed ${task.workflow_type} tasks`);
        reasons.push(`${Math.round(expertise.successRate * 100)}% success rate`);
      }
      reasons.push(`${Math.round(profile.reliability * 100)}% reliability`);
    }

    reasons.push(`Current workload: ${user.current_workload} tasks`);
    reasons.push(`Role match: ${user.role}`);

    return reasons.join('; ');
  }

  getTopPerformers() {
    const performers = Array.from(this.userPerformanceProfiles.entries())
      .map(([userId, profile]) => ({
        userId,
        reliability: profile.reliability,
        avgTime: profile.avgCompletionTime,
        score: profile.reliability * 0.7 + (1 / (profile.avgCompletionTime + 1)) * 0.3
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return performers;
  }

  async identifyBottlenecks() {
    // Identify workflow types or users that are causing delays
    const bottlenecks = [];
    
    // Check for overloaded users
    const overloadedUsers = await query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        COUNT(aw.id) as task_count
      FROM users u
      JOIN assessment_workflow aw ON u.id = aw.assigned_to
      WHERE aw.status IN ('assigned', 'in_progress')
        AND aw.is_active = true
      GROUP BY u.id, u.first_name, u.last_name
      HAVING COUNT(aw.id) > 8
      ORDER BY task_count DESC
    `);

    overloadedUsers.rows.forEach(user => {
      bottlenecks.push({
        type: 'overloaded_user',
        userId: user.id,
        name: `${user.first_name} ${user.last_name}`,
        taskCount: user.task_count
      });
    });

    return bottlenecks;
  }

  generateRecommendations() {
    const recommendations = [];

    // Analyze patterns and generate recommendations
    if (this.taskPatterns.byTimeOfDay) {
      const morningAvg = this.taskPatterns.byTimeOfDay.morning?.avg;
      const afternoonAvg = this.taskPatterns.byTimeOfDay.afternoon?.avg;
      
      if (morningAvg && afternoonAvg && morningAvg < afternoonAvg * 0.8) {
        recommendations.push('Schedule complex tasks in the morning for better performance');
      }
    }

    // Add more intelligent recommendations based on patterns
    recommendations.push('Consider cross-training team members to reduce bottlenecks');
    recommendations.push('Implement automated task routing for routine workflows');

    return recommendations;
  }

  median(numbers) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[middle - 1] + sorted[middle]) / 2 
      : sorted[middle];
  }

  standardDeviation(numbers) {
    const mean = _.mean(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return Math.sqrt(_.mean(squaredDiffs));
  }

  /**
   * Get historical average completion time for a user and task type
   */
  async getHistoricalAverage(userId, taskType) {
    try {
      // Query historical task completion data
      const query = `
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_hours
        FROM tasks 
        WHERE assigned_to = ? 
        AND task_type = ? 
        AND status = 'completed' 
        AND completed_at IS NOT NULL
        AND created_at >= NOW() - INTERVAL '90 days'
      `;
      
      const [rows] = await this.db.execute(query, [userId, taskType]);
      
      if (rows.length > 0 && rows[0].avg_hours) {
        return parseFloat(rows[0].avg_hours);
      }
      
      // Fallback to task type averages if no user history
      const typeQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_hours
        FROM tasks 
        WHERE task_type = ? 
        AND status = 'completed' 
        AND completed_at IS NOT NULL
        AND created_at >= NOW() - INTERVAL '180 days'
      `;
      
      const [typeRows] = await this.db.execute(typeQuery, [taskType]);
      
      if (typeRows.length > 0 && typeRows[0].avg_hours) {
        return parseFloat(typeRows[0].avg_hours);
      }
      
      // Default estimates by task type
      const defaultEstimates = {
        'assessment': 4.0,
        'review': 2.0,
        'documentation': 3.0,
        'compliance_check': 1.5,
        'audit': 6.0,
        'training': 2.5,
        'meeting': 1.0,
        'report': 4.5,
        'analysis': 5.0
      };
      
      return defaultEstimates[taskType] || 3.0; // Default 3 hours
      
    } catch (error) {
      console.error('Error getting historical average:', error);
      return 3.0; // Default fallback
    }
  }
}

module.exports = AIScheduler;
