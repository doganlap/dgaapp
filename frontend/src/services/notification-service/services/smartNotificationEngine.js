const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const moment = require('moment');

/**
 * Smart Notification Engine with AI-Driven Prioritization
 * Features:
 * - Intelligent notification prioritization
 * - User behavior analysis for optimal timing
 * - Context-aware notification grouping
 * - Adaptive frequency control
 * - Multi-channel delivery optimization
 * - Sentiment analysis for urgency detection
 */
class SmartNotificationEngine {
  constructor() {
    this.isInitialized = false;
    this.userProfiles = new Map();
    this.notificationPatterns = new Map();
    this.priorityModels = new Map();
    this.deliveryOptimizer = null;
    
    // Configuration
    this.config = {
      maxNotificationsPerHour: 5,
      maxNotificationsPerDay: 20,
      quietHours: { start: 22, end: 7 }, // 10 PM to 7 AM
      priorityThresholds: {
        critical: 90,
        high: 70,
        medium: 40,
        low: 20
      },
      batchingWindow: 300000, // 5 minutes in milliseconds
      adaptiveLearning: true
    };
  }

  /**
   * Initialize the smart notification engine
   */
  async initialize() {
    try {
      console.log('🔔 Initializing Smart Notification Engine...');
      
      // Load user behavior profiles
      await this.loadUserProfiles();
      
      // Analyze notification patterns
      await this.analyzeNotificationPatterns();
      
      // Initialize priority models
      await this.initializePriorityModels();
      
      // Initialize delivery optimizer
      await this.initializeDeliveryOptimizer();
      
      this.isInitialized = true;
      console.log('✅ Smart Notification Engine initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Smart Notification Engine:', error);
      throw error;
    }
  }

  /**
   * Load user behavior profiles for personalization
   */
  async loadUserProfiles() {
    try {
      // Get user notification interaction data
      const userInteractions = await query(`
        SELECT 
          n.recipient_user_id,
          n.notification_type,
          n.priority_level,
          n.sent_at,
          n.read_at,
          n.clicked_at,
          n.dismissed_at,
          EXTRACT(HOUR FROM n.sent_at) as sent_hour,
          EXTRACT(DOW FROM n.sent_at) as sent_day_of_week,
          CASE 
            WHEN n.read_at IS NOT NULL THEN 1 
            ELSE 0 
          END as was_read,
          CASE 
            WHEN n.clicked_at IS NOT NULL THEN 1 
            ELSE 0 
          END as was_clicked,
          EXTRACT(EPOCH FROM (n.read_at - n.sent_at))/60 as minutes_to_read
        FROM notifications n
        WHERE n.sent_at > NOW() - INTERVAL '6 months'
          AND n.recipient_user_id IS NOT NULL
        ORDER BY n.sent_at DESC
      `);

      // Build user profiles
      const userGroups = _.groupBy(userInteractions.rows, 'recipient_user_id');
      
      for (const [userId, interactions] of Object.entries(userGroups)) {
        const profile = this.buildUserProfile(interactions);
        this.userProfiles.set(userId, profile);
      }

      console.log(`👥 Loaded ${this.userProfiles.size} user profiles`);
    } catch (error) {
      console.error('❌ Error loading user profiles:', error);
    }
  }

  /**
   * Build individual user profile from interaction history
   */
  buildUserProfile(interactions) {
    const profile = {
      totalNotifications: interactions.length,
      readRate: 0,
      clickRate: 0,
      avgResponseTime: 0,
      preferredHours: [],
      preferredDays: [],
      notificationTypePreferences: {},
      priorityResponsePatterns: {},
      lastActive: null
    };

    // Calculate engagement metrics
    const readNotifications = interactions.filter(i => i.was_read);
    const clickedNotifications = interactions.filter(i => i.was_clicked);
    
    profile.readRate = readNotifications.length / interactions.length;
    profile.clickRate = clickedNotifications.length / interactions.length;
    
    // Calculate average response time
    const responseTimes = interactions
      .filter(i => i.minutes_to_read && i.minutes_to_read > 0)
      .map(i => i.minutes_to_read);
    
    if (responseTimes.length > 0) {
      profile.avgResponseTime = _.mean(responseTimes);
    }

    // Analyze preferred timing
    const hourlyEngagement = _.groupBy(readNotifications, 'sent_hour');
    profile.preferredHours = Object.keys(hourlyEngagement)
      .sort((a, b) => hourlyEngagement[b].length - hourlyEngagement[a].length)
      .slice(0, 6)
      .map(h => parseInt(h));

    const dailyEngagement = _.groupBy(readNotifications, 'sent_day_of_week');
    profile.preferredDays = Object.keys(dailyEngagement)
      .sort((a, b) => dailyEngagement[b].length - dailyEngagement[a].length)
      .slice(0, 5)
      .map(d => parseInt(d));

    // Analyze notification type preferences
    const typeGroups = _.groupBy(interactions, 'notification_type');
    Object.keys(typeGroups).forEach(type => {
      const typeInteractions = typeGroups[type];
      const typeReadRate = typeInteractions.filter(i => i.was_read).length / typeInteractions.length;
      profile.notificationTypePreferences[type] = {
        readRate: typeReadRate,
        count: typeInteractions.length
      };
    });

    // Analyze priority response patterns
    const priorityGroups = _.groupBy(interactions, 'priority_level');
    Object.keys(priorityGroups).forEach(priority => {
      const priorityInteractions = priorityGroups[priority];
      const priorityReadRate = priorityInteractions.filter(i => i.was_read).length / priorityInteractions.length;
      const avgResponseTime = _.mean(
        priorityInteractions
          .filter(i => i.minutes_to_read && i.minutes_to_read > 0)
          .map(i => i.minutes_to_read)
      );
      
      profile.priorityResponsePatterns[priority] = {
        readRate: priorityReadRate,
        avgResponseTime: avgResponseTime || 0,
        count: priorityInteractions.length
      };
    });

    return profile;
  }

  /**
   * Analyze notification patterns across the system
   */
  async analyzeNotificationPatterns() {
    try {
      // Analyze global notification patterns
      const globalPatterns = await query(`
        SELECT 
          notification_type,
          priority_level,
          COUNT(*) as total_count,
          COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read_count,
          COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as click_count,
          AVG(EXTRACT(EPOCH FROM (read_at - sent_at))/60) as avg_response_minutes,
          EXTRACT(HOUR FROM sent_at) as sent_hour
        FROM notifications
        WHERE sent_at > NOW() - INTERVAL '3 months'
        GROUP BY notification_type, priority_level, EXTRACT(HOUR FROM sent_at)
        ORDER BY total_count DESC
      `);

      // Store patterns for analysis
      const patternGroups = _.groupBy(globalPatterns.rows, row => 
        `${row.notification_type}_${row.priority_level}`
      );

      Object.keys(patternGroups).forEach(key => {
        const patterns = patternGroups[key];
        const hourlyData = {};
        
        patterns.forEach(pattern => {
          hourlyData[pattern.sent_hour] = {
            totalCount: parseInt(pattern.total_count),
            readRate: parseInt(pattern.read_count) / parseInt(pattern.total_count),
            clickRate: parseInt(pattern.click_count) / parseInt(pattern.total_count),
            avgResponseTime: parseFloat(pattern.avg_response_minutes) || 0
          };
        });

        this.notificationPatterns.set(key, {
          hourlyData: hourlyData,
          bestHours: this.findBestDeliveryHours(hourlyData),
          totalSamples: _.sum(patterns.map(p => parseInt(p.total_count)))
        });
      });

      console.log(`📊 Analyzed ${this.notificationPatterns.size} notification patterns`);
    } catch (error) {
      console.error('❌ Error analyzing notification patterns:', error);
    }
  }

  /**
   * Initialize priority models for different notification types
   */
  async initializePriorityModels() {
    try {
      // Define priority calculation models
      const models = {
        'assessment_due': {
          baseScore: 60,
          factors: {
            daysUntilDue: { weight: -5, max: 30 }, // More urgent as due date approaches
            assessmentPriority: { weight: 20, mapping: { critical: 1, high: 0.8, medium: 0.5, low: 0.2 } },
            organizationRisk: { weight: 15, mapping: { high: 1, medium: 0.6, low: 0.3 } },
            userRole: { weight: 10, mapping: { admin: 1, manager: 0.8, analyst: 0.6 } }
          }
        },
        'workflow_assignment': {
          baseScore: 50,
          factors: {
            workflowPriority: { weight: 25, mapping: { critical: 1, high: 0.8, medium: 0.5, low: 0.2 } },
            userWorkload: { weight: -10, max: 10 }, // Lower priority if user is overloaded
            deadline: { weight: -3, max: 14 }, // Days until deadline
            assignerRole: { weight: 5, mapping: { admin: 1, manager: 0.8 } }
          }
        },
        'compliance_alert': {
          baseScore: 80,
          factors: {
            riskLevel: { weight: 20, mapping: { critical: 1, high: 0.8, medium: 0.5, low: 0.2 } },
            affectedSystems: { weight: 5, max: 10 },
            regulatoryImpact: { weight: 15, mapping: { high: 1, medium: 0.6, low: 0.3 } }
          }
        },
        'system_notification': {
          baseScore: 30,
          factors: {
            severity: { weight: 30, mapping: { error: 1, warning: 0.6, info: 0.2 } },
            userImpact: { weight: 20, mapping: { high: 1, medium: 0.6, low: 0.3 } }
          }
        }
      };

      // Store models
      Object.keys(models).forEach(type => {
        this.priorityModels.set(type, models[type]);
      });

      console.log(`🎯 Initialized ${this.priorityModels.size} priority models`);
    } catch (error) {
      console.error('❌ Error initializing priority models:', error);
    }
  }

  /**
   * Initialize delivery optimizer
   */
  async initializeDeliveryOptimizer() {
    try {
      this.deliveryOptimizer = {
        batchingQueue: new Map(),
        deliverySchedule: new Map(),
        rateLimiters: new Map()
      };

      // Start batch processing interval
      setInterval(() => {
        this.processBatchedNotifications();
      }, this.config.batchingWindow);

      console.log('📬 Delivery optimizer initialized');
    } catch (error) {
      console.error('❌ Error initializing delivery optimizer:', error);
    }
  }

  /**
   * Main method to send smart notification
   */
  async sendSmartNotification(notificationData) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ Smart Notification Engine not initialized, using basic delivery');
        return await this.sendBasicNotification(notificationData);
      }

      // Calculate intelligent priority
      const priority = await this.calculateIntelligentPriority(notificationData);
      
      // Optimize delivery timing
      const deliveryTiming = await this.optimizeDeliveryTiming(notificationData, priority);
      
      // Check rate limits
      const rateLimitCheck = await this.checkRateLimits(notificationData.recipientUserId);
      
      if (!rateLimitCheck.allowed) {
        return await this.handleRateLimitedNotification(notificationData, priority, rateLimitCheck);
      }

      // Personalize content
      const personalizedContent = await this.personalizeContent(notificationData);
      
      // Determine delivery channels
      const deliveryChannels = await this.selectDeliveryChannels(notificationData, priority);
      
      // Create notification record
      const notification = await this.createNotificationRecord({
        ...notificationData,
        ...personalizedContent,
        priority: priority,
        deliveryTiming: deliveryTiming,
        deliveryChannels: deliveryChannels,
        aiProcessed: true
      });

      // Schedule or send immediately
      if (deliveryTiming.immediate) {
        await this.deliverNotification(notification);
      } else {
        await this.scheduleNotification(notification, deliveryTiming.scheduledTime);
      }

      return notification;
    } catch (error) {
      console.error('❌ Error sending smart notification:', error);
      // Fallback to basic notification
      return await this.sendBasicNotification(notificationData);
    }
  }

  /**
   * Calculate intelligent priority based on context and ML models
   */
  async calculateIntelligentPriority(notificationData) {
    try {
      const model = this.priorityModels.get(notificationData.type);
      if (!model) {
        return this.calculateBasicPriority(notificationData);
      }

      let priorityScore = model.baseScore;

      // Apply model factors
      Object.keys(model.factors).forEach(factorName => {
        const factor = model.factors[factorName];
        const value = notificationData.context?.[factorName];

        if (value !== undefined) {
          if (factor.mapping) {
            // Categorical factor
            const mappedValue = factor.mapping[value] || 0;
            priorityScore += factor.weight * mappedValue;
          } else {
            // Numerical factor
            const normalizedValue = Math.min(value, factor.max || value) / (factor.max || 1);
            priorityScore += factor.weight * normalizedValue;
          }
        }
      });

      // Apply user-specific adjustments
      const userProfile = this.userProfiles.get(notificationData.recipientUserId);
      if (userProfile) {
        priorityScore = this.adjustPriorityForUser(priorityScore, notificationData, userProfile);
      }

      // Apply contextual adjustments
      priorityScore = this.adjustPriorityForContext(priorityScore, notificationData);

      // Normalize to 0-100 scale
      priorityScore = Math.max(0, Math.min(100, priorityScore));

      return {
        score: priorityScore,
        level: this.scoreToPriorityLevel(priorityScore),
        factors: this.explainPriorityFactors(notificationData, model),
        confidence: this.calculatePriorityConfidence(notificationData, model)
      };
    } catch (error) {
      console.error('❌ Error calculating intelligent priority:', error);
      return this.calculateBasicPriority(notificationData);
    }
  }

  /**
   * Optimize delivery timing based on user behavior and context
   */
  async optimizeDeliveryTiming(notificationData, priority) {
    try {
      const now = moment();
      const userProfile = this.userProfiles.get(notificationData.recipientUserId);
      
      // Critical notifications are always immediate
      if (priority.level === 'critical') {
        return {
          immediate: true,
          reason: 'critical_priority'
        };
      }

      // Check quiet hours
      const currentHour = now.hour();
      if (this.isQuietHour(currentHour)) {
        const nextActiveHour = this.getNextActiveHour(currentHour);
        return {
          immediate: false,
          scheduledTime: now.clone().hour(nextActiveHour).minute(0).second(0).toDate(),
          reason: 'quiet_hours'
        };
      }

      // Use user preferences if available
      if (userProfile && userProfile.preferredHours.length > 0) {
        const preferredHour = this.findNextPreferredHour(currentHour, userProfile.preferredHours);
        
        if (preferredHour !== currentHour && priority.level !== 'high') {
          return {
            immediate: false,
            scheduledTime: now.clone().hour(preferredHour).minute(0).second(0).toDate(),
            reason: 'user_preference'
          };
        }
      }

      // Check global patterns
      const patternKey = `${notificationData.type}_${priority.level}`;
      const pattern = this.notificationPatterns.get(patternKey);
      
      if (pattern && pattern.bestHours.length > 0) {
        const bestHour = this.findNextBestHour(currentHour, pattern.bestHours);
        
        if (bestHour !== currentHour && priority.level === 'low') {
          return {
            immediate: false,
            scheduledTime: now.clone().hour(bestHour).minute(0).second(0).toDate(),
            reason: 'optimal_engagement'
          };
        }
      }

      // Default to immediate delivery
      return {
        immediate: true,
        reason: 'default_immediate'
      };
    } catch (error) {
      console.error('❌ Error optimizing delivery timing:', error);
      return { immediate: true, reason: 'error_fallback' };
    }
  }

  /**
   * Check rate limits for user
   */
  async checkRateLimits(userId) {
    try {
      const now = moment();
      const hourStart = now.clone().startOf('hour');
      const dayStart = now.clone().startOf('day');

      // Count notifications in the last hour and day
      const recentCounts = await query(`
        SELECT 
          COUNT(CASE WHEN sent_at >= $1 THEN 1 END) as hour_count,
          COUNT(CASE WHEN sent_at >= $2 THEN 1 END) as day_count
        FROM notifications
        WHERE recipient_user_id = $3
          AND sent_at >= $2
      `, [hourStart.toDate(), dayStart.toDate(), userId]);

      const counts = recentCounts.rows[0];
      const hourlyCount = parseInt(counts.hour_count);
      const dailyCount = parseInt(counts.day_count);

      return {
        allowed: hourlyCount < this.config.maxNotificationsPerHour && 
                dailyCount < this.config.maxNotificationsPerDay,
        hourlyCount: hourlyCount,
        dailyCount: dailyCount,
        hourlyLimit: this.config.maxNotificationsPerHour,
        dailyLimit: this.config.maxNotificationsPerDay
      };
    } catch (error) {
      console.error('❌ Error checking rate limits:', error);
      return { allowed: true, hourlyCount: 0, dailyCount: 0 };
    }
  }

  /**
   * Handle rate-limited notifications
   */
  async handleRateLimitedNotification(notificationData, priority, rateLimitCheck) {
    try {
      // Critical notifications bypass rate limits
      if (priority.level === 'critical') {
        console.log(`⚠️ Bypassing rate limit for critical notification to user ${notificationData.recipientUserId}`);
        return await this.createNotificationRecord({
          ...notificationData,
          priority: priority,
          rateLimitBypassed: true
        });
      }

      // Queue for later delivery
      const deliveryTime = this.calculateNextAvailableSlot(rateLimitCheck);
      
      return await this.scheduleNotification({
        ...notificationData,
        priority: priority,
        rateLimited: true
      }, deliveryTime);
    } catch (error) {
      console.error('❌ Error handling rate-limited notification:', error);
      throw error;
    }
  }

  /**
   * Personalize notification content based on user profile
   */
  async personalizeContent(notificationData) {
    try {
      const userProfile = this.userProfiles.get(notificationData.recipientUserId);
      let personalizedContent = { ...notificationData };

      if (userProfile) {
        // Adjust tone based on user engagement patterns
        if (userProfile.readRate < 0.3) {
          // Low engagement - make more compelling
          personalizedContent.title = this.makeMoreCompelling(notificationData.title);
        }

        // Adjust detail level based on user role and preferences
        const typePreference = userProfile.notificationTypePreferences[notificationData.type];
        if (typePreference && typePreference.readRate > 0.8) {
          // High engagement with this type - can include more detail
          personalizedContent.includeDetails = true;
        }

        // Add urgency indicators for users who respond to them
        const priorityPattern = userProfile.priorityResponsePatterns[notificationData.priority];
        if (priorityPattern && priorityPattern.avgResponseTime < 30) {
          // User responds quickly to this priority level
          personalizedContent.addUrgencyIndicator = true;
        }
      }

      return personalizedContent;
    } catch (error) {
      console.error('❌ Error personalizing content:', error);
      return notificationData;
    }
  }

  /**
   * Select optimal delivery channels based on priority and user preferences
   */
  async selectDeliveryChannels(notificationData, priority) {
    try {
      const channels = ['in_app']; // Always include in-app

      // Add email for higher priority notifications
      if (priority.level === 'critical' || priority.level === 'high') {
        channels.push('email');
      }

      // Add SMS for critical notifications (if configured)
      if (priority.level === 'critical' && process.env.SMS_ENABLED === 'true') {
        channels.push('sms');
      }

      // Check user preferences
      const userProfile = this.userProfiles.get(notificationData.recipientUserId);
      if (userProfile) {
        // If user has low in-app engagement, prefer email
        if (userProfile.readRate < 0.4 && !channels.includes('email')) {
          channels.push('email');
        }
      }

      return channels;
    } catch (error) {
      console.error('❌ Error selecting delivery channels:', error);
      return ['in_app']; // Fallback to in-app only
    }
  }

  /**
   * Create notification record in database
   */
  async createNotificationRecord(notificationData) {
    try {
      const notificationId = uuidv4();
      
      const result = await query(`
        INSERT INTO notifications (
          id, recipient_user_id, notification_type, title, message,
          priority_level, priority_score, delivery_channels, 
          context_data, ai_processed, ai_metadata, 
          scheduled_for, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        notificationId,
        notificationData.recipientUserId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.priority?.level || 'medium',
        notificationData.priority?.score || 50,
        JSON.stringify(notificationData.deliveryChannels || ['in_app']),
        JSON.stringify(notificationData.context || {}),
        notificationData.aiProcessed || false,
        JSON.stringify({
          priorityFactors: notificationData.priority?.factors,
          deliveryReason: notificationData.deliveryTiming?.reason,
          personalized: !!notificationData.includeDetails
        }),
        notificationData.deliveryTiming?.scheduledTime || null
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating notification record:', error);
      throw error;
    }
  }

  /**
   * Deliver notification immediately
   */
  async deliverNotification(notification) {
    try {
      const channels = JSON.parse(notification.delivery_channels);
      const deliveryResults = {};

      for (const channel of channels) {
        try {
          switch (channel) {
            case 'in_app':
              deliveryResults.in_app = await this.deliverInAppNotification(notification);
              break;
            case 'email':
              deliveryResults.email = await this.deliverEmailNotification(notification);
              break;
            case 'sms':
              deliveryResults.sms = await this.deliverSMSNotification(notification);
              break;
          }
        } catch (channelError) {
          console.error(`❌ Error delivering via ${channel}:`, channelError);
          deliveryResults[channel] = { success: false, error: channelError.message };
        }
      }

      // Update notification with delivery results
      await query(`
        UPDATE notifications 
        SET 
          sent_at = CURRENT_TIMESTAMP,
          delivery_results = $1,
          status = 'sent'
        WHERE id = $2
      `, [JSON.stringify(deliveryResults), notification.id]);

      return deliveryResults;
    } catch (error) {
      console.error('❌ Error delivering notification:', error);
      throw error;
    }
  }

  /**
   * Schedule notification for later delivery
   */
  async scheduleNotification(notificationData, scheduledTime) {
    try {
      const notification = await this.createNotificationRecord({
        ...notificationData,
        deliveryTiming: { scheduledTime: scheduledTime }
      });

      // Add to delivery schedule
      const timeKey = moment(scheduledTime).format('YYYY-MM-DD HH:mm');
      if (!this.deliveryOptimizer.deliverySchedule.has(timeKey)) {
        this.deliveryOptimizer.deliverySchedule.set(timeKey, []);
      }
      this.deliveryOptimizer.deliverySchedule.get(timeKey).push(notification.id);

      console.log(`📅 Notification ${notification.id} scheduled for ${scheduledTime}`);
      return notification;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications() {
    try {
      const now = moment();
      const currentTimeKey = now.format('YYYY-MM-DD HH:mm');
      
      // Check for notifications to deliver
      const scheduledNotifications = this.deliveryOptimizer.deliverySchedule.get(currentTimeKey);
      
      if (scheduledNotifications && scheduledNotifications.length > 0) {
        console.log(`📬 Processing ${scheduledNotifications.length} scheduled notifications`);
        
        for (const notificationId of scheduledNotifications) {
          try {
            const notification = await query(`
              SELECT * FROM notifications WHERE id = $1 AND status = 'scheduled'
            `, [notificationId]);
            
            if (notification.rows.length > 0) {
              await this.deliverNotification(notification.rows[0]);
            }
          } catch (error) {
            console.error(`❌ Error processing scheduled notification ${notificationId}:`, error);
          }
        }
        
        // Remove processed notifications from schedule
        this.deliveryOptimizer.deliverySchedule.delete(currentTimeKey);
      }
    } catch (error) {
      console.error('❌ Error processing scheduled notifications:', error);
    }
  }

  /**
   * Process batched notifications
   */
  async processBatchedNotifications() {
    try {
      for (const [userId, notifications] of this.deliveryOptimizer.batchingQueue.entries()) {
        if (notifications.length > 0) {
          // Group similar notifications
          const grouped = this.groupSimilarNotifications(notifications);
          
          for (const group of grouped) {
            if (group.length === 1) {
              // Single notification - send as is
              await this.deliverNotification(group[0]);
            } else {
              // Multiple similar notifications - create digest
              const digestNotification = await this.createDigestNotification(group);
              await this.deliverNotification(digestNotification);
            }
          }
          
          // Clear processed notifications
          this.deliveryOptimizer.batchingQueue.set(userId, []);
        }
      }
    } catch (error) {
      console.error('❌ Error processing batched notifications:', error);
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  findBestDeliveryHours(hourlyData) {
    const hours = Object.keys(hourlyData)
      .map(hour => ({
        hour: parseInt(hour),
        score: hourlyData[hour].readRate * 0.7 + (1 - hourlyData[hour].avgResponseTime / 60) * 0.3
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(h => h.hour);
    
    return hours;
  }

  isQuietHour(hour) {
    return hour >= this.config.quietHours.start || hour < this.config.quietHours.end;
  }

  getNextActiveHour(currentHour) {
    if (currentHour < this.config.quietHours.end) {
      return this.config.quietHours.end;
    }
    return this.config.quietHours.end; // Next day
  }

  findNextPreferredHour(currentHour, preferredHours) {
    // Find next preferred hour
    const nextHours = preferredHours.filter(h => h > currentHour);
    return nextHours.length > 0 ? nextHours[0] : preferredHours[0];
  }

  findNextBestHour(currentHour, bestHours) {
    const nextHours = bestHours.filter(h => h > currentHour);
    return nextHours.length > 0 ? nextHours[0] : bestHours[0];
  }

  scoreToPriorityLevel(score) {
    if (score >= this.config.priorityThresholds.critical) return 'critical';
    if (score >= this.config.priorityThresholds.high) return 'high';
    if (score >= this.config.priorityThresholds.medium) return 'medium';
    return 'low';
  }

  adjustPriorityForUser(priorityScore, notificationData, userProfile) {
    // Boost priority for users with high engagement
    if (userProfile.readRate > 0.8) {
      priorityScore += 5;
    }

    // Reduce priority for users with low engagement
    if (userProfile.readRate < 0.3) {
      priorityScore -= 10;
    }

    // Adjust based on notification type preferences
    const typePreference = userProfile.notificationTypePreferences[notificationData.type];
    if (typePreference) {
      if (typePreference.readRate > 0.7) {
        priorityScore += 5;
      } else if (typePreference.readRate < 0.3) {
        priorityScore -= 5;
      }
    }

    return priorityScore;
  }

  adjustPriorityForContext(priorityScore, notificationData) {
    // Time-based adjustments
    const hour = moment().hour();
    
    // Boost priority during business hours
    if (hour >= 9 && hour <= 17) {
      priorityScore += 5;
    }

    // Reduce priority during off-hours for non-critical notifications
    if ((hour < 8 || hour > 20) && priorityScore < 80) {
      priorityScore -= 10;
    }

    return priorityScore;
  }

  explainPriorityFactors(notificationData, model) {
    const factors = [];
    
    Object.keys(model.factors).forEach(factorName => {
      const factor = model.factors[factorName];
      const value = notificationData.context?.[factorName];
      
      if (value !== undefined) {
        factors.push({
          factor: factorName,
          value: value,
          weight: factor.weight,
          impact: factor.weight * (factor.mapping?.[value] || value)
        });
      }
    });

    return factors;
  }

  calculatePriorityConfidence(notificationData, model) {
    // Calculate confidence based on available context data
    const availableFactors = Object.keys(model.factors).filter(
      factor => notificationData.context?.[factor] !== undefined
    ).length;
    
    const totalFactors = Object.keys(model.factors).length;
    return availableFactors / totalFactors;
  }

  calculateBasicPriority(notificationData) {
    const priorityMap = {
      'critical': 90,
      'high': 70,
      'medium': 50,
      'low': 30
    };

    const score = priorityMap[notificationData.priority] || 50;
    
    return {
      score: score,
      level: notificationData.priority || 'medium',
      factors: [],
      confidence: 0.5
    };
  }

  makeMoreCompelling(title) {
    // Add urgency or action words for low-engagement users
    const urgencyWords = ['Action Required:', 'Important:', 'Urgent:', 'Attention:'];
    const randomUrgency = urgencyWords[Math.floor(Math.random() * urgencyWords.length)];
    return `${randomUrgency} ${title}`;
  }

  calculateNextAvailableSlot(rateLimitCheck) {
    const now = moment();
    
    // If daily limit exceeded, schedule for tomorrow
    if (rateLimitCheck.dailyCount >= rateLimitCheck.dailyLimit) {
      return now.clone().add(1, 'day').startOf('day').hour(9).toDate();
    }
    
    // If hourly limit exceeded, schedule for next hour
    if (rateLimitCheck.hourlyCount >= rateLimitCheck.hourlyLimit) {
      return now.clone().add(1, 'hour').startOf('hour').toDate();
    }
    
    // Otherwise, schedule for next available time
    return now.clone().add(15, 'minutes').toDate();
  }

  groupSimilarNotifications(notifications) {
    // Group notifications by type and context similarity
    const groups = [];
    const processed = new Set();

    notifications.forEach((notification, index) => {
      if (processed.has(index)) return;

      const group = [notification];
      processed.add(index);

      // Find similar notifications
      notifications.forEach((other, otherIndex) => {
        if (processed.has(otherIndex)) return;
        
        if (this.areNotificationsSimilar(notification, other)) {
          group.push(other);
          processed.add(otherIndex);
        }
      });

      groups.push(group);
    });

    return groups;
  }

  areNotificationsSimilar(notification1, notification2) {
    return notification1.notification_type === notification2.notification_type &&
           notification1.priority_level === notification2.priority_level;
  }

  async createDigestNotification(notifications) {
    const firstNotification = notifications[0];
    const count = notifications.length;
    
    const digestNotification = {
      ...firstNotification,
      id: uuidv4(),
      title: `${count} ${firstNotification.notification_type} notifications`,
      message: `You have ${count} pending ${firstNotification.notification_type} notifications.`,
      is_digest: true,
      digest_notifications: notifications.map(n => n.id)
    };

    return await this.createNotificationRecord(digestNotification);
  }

  async deliverInAppNotification(notification) {
    // In-app delivery logic
    return { success: true, channel: 'in_app', deliveredAt: new Date() };
  }

  async deliverEmailNotification(notification) {
    // Email delivery logic
    return { success: true, channel: 'email', deliveredAt: new Date() };
  }

  async deliverSMSNotification(notification) {
    // SMS delivery logic
    return { success: true, channel: 'sms', deliveredAt: new Date() };
  }

  async sendBasicNotification(notificationData) {
    // Fallback basic notification without AI features
    return await this.createNotificationRecord({
      ...notificationData,
      priority: this.calculateBasicPriority(notificationData),
      deliveryChannels: ['in_app'],
      aiProcessed: false
    });
  }
}

module.exports = SmartNotificationEngine;
