const EventEmitter = require('events');
const cron = require('node-cron');
const prometheus = require('prom-client');
const db = require('../config/database');

/**
 * Enterprise Monitoring Service
 * Provides real-time compliance monitoring, alerting, and analytics
 */
class EnterpriseMonitoringService extends EventEmitter {
  constructor() {
    super();
    
    // Initialize Prometheus metrics
    this.initializeMetrics();
    
    // Active monitors
    this.monitors = new Map();
    
    // Alert thresholds
    this.alertThresholds = {
      compliance_score: {
        critical: 60,
        warning: 75
      },
      certificate_expiry: {
        critical: 7, // days
        warning: 30
      },
      assessment_overdue: {
        critical: 14, // days
        warning: 7
      }
    };
    
    // Start background monitoring
    this.startBackgroundMonitoring();
  }
  
  /**
   * Initialize Prometheus metrics
   */
  initializeMetrics() {
    // Register default metrics
    prometheus.register.setDefaultLabels({
      app: 'grc-platform',
      service: 'monitoring'
    });
    
    prometheus.collectDefaultMetrics();
    
    // Custom metrics
    this.metrics = {
      complianceScore: new prometheus.Gauge({
        name: 'grc_compliance_score',
        help: 'Current compliance score by organization and framework',
        labelNames: ['organization_id', 'framework', 'tenant_id']
      }),
      
      assessmentCount: new prometheus.Gauge({
        name: 'grc_assessments_total',
        help: 'Total number of assessments by status',
        labelNames: ['status', 'tenant_id']
      }),
      
      controlImplementation: new prometheus.Gauge({
        name: 'grc_controls_implemented',
        help: 'Number of implemented controls by framework',
        labelNames: ['framework', 'tenant_id']
      }),
      
      alertsGenerated: new prometheus.Counter({
        name: 'grc_alerts_total',
        help: 'Total number of alerts generated',
        labelNames: ['type', 'severity', 'tenant_id']
      }),
      
      certificateExpiry: new prometheus.Gauge({
        name: 'grc_certificates_expiring',
        help: 'Number of certificates expiring within timeframe',
        labelNames: ['days_until_expiry', 'tenant_id']
      })
    };
  }
  
  /**
   * Start monitoring for an organization
   */
  async startMonitoring(organizationId, tenantId) {
    try {
      console.log(`📊 Starting monitoring for organization ${organizationId}`);
      
      const monitorKey = `${tenantId}_${organizationId}`;
      
      if (this.monitors.has(monitorKey)) {
        console.log(`⚠️ Monitoring already active for ${monitorKey}`);
        return;
      }
      
      // Create monitor instances
      const monitors = [
        new ComplianceScoreMonitor(organizationId, tenantId, this),
        new CertificateExpiryMonitor(organizationId, tenantId, this),
        new AssessmentDeadlineMonitor(organizationId, tenantId, this),
        new RegulatoryChangeMonitor(organizationId, tenantId, this),
        new SecurityIncidentMonitor(organizationId, tenantId, this),
        new ControlDriftMonitor(organizationId, tenantId, this)
      ];
      
      // Start all monitors
      monitors.forEach(monitor => {
        monitor.start();
        monitor.on('alert', (alert) => this.handleAlert(alert));
        monitor.on('metric', (metric) => this.updateMetric(metric));
      });
      
      this.monitors.set(monitorKey, monitors);
      
      console.log(`✅ Started ${monitors.length} monitors for ${monitorKey}`);
      
    } catch (error) {
      console.error(`❌ Failed to start monitoring for ${organizationId}:`, error);
      throw error;
    }
  }
  
  /**
   * Stop monitoring for an organization
   */
  async stopMonitoring(organizationId, tenantId) {
    const monitorKey = `${tenantId}_${organizationId}`;
    
    if (this.monitors.has(monitorKey)) {
      const monitors = this.monitors.get(monitorKey);
      monitors.forEach(monitor => monitor.stop());
      this.monitors.delete(monitorKey);
      
      console.log(`🛑 Stopped monitoring for ${monitorKey}`);
    }
  }
  
  /**
   * Handle alert from monitors
   */
  async handleAlert(alert) {
    try {
      console.log(`🚨 Alert received: ${alert.type} - ${alert.severity}`);
      
      // Update metrics
      this.metrics.alertsGenerated.inc({
        type: alert.type,
        severity: alert.severity,
        tenant_id: alert.tenantId
      });
      
      // Assess alert severity
      const processedAlert = await this.processAlert(alert);
      
      // Store alert in database
      await this.storeAlert(processedAlert);
      
      // Determine recipients
      const recipients = await this.getAlertRecipients(alert.type, alert.organizationId, alert.tenantId);
      
      // Send notifications
      if (recipients.length > 0) {
        await this.sendAlertNotifications(processedAlert, recipients);
      }
      
      // Create incident if critical
      if (alert.severity === 'critical') {
        await this.createIncident(processedAlert);
      }
      
      // Emit alert event for real-time updates
      this.emit('alert', processedAlert);
      
    } catch (error) {
      console.error('❌ Error handling alert:', error);
    }
  }
  
  /**
   * Process and enrich alert
   */
  async processAlert(alert) {
    const processedAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      status: 'open',
      acknowledgedBy: null,
      resolvedBy: null,
      escalationLevel: 0
    };
    
    // Add context information
    if (alert.organizationId) {
      processedAlert.organizationInfo = await this.getOrganizationInfo(alert.organizationId);
    }
    
    // Calculate risk score
    processedAlert.riskScore = this.calculateAlertRiskScore(alert);
    
    // Determine escalation path
    processedAlert.escalationPath = await this.getEscalationPath(alert.type, alert.organizationId, alert.tenantId);
    
    return processedAlert;
  }
  
  /**
   * Update Prometheus metrics
   */
  updateMetric(metric) {
    try {
      const { name, value, labels } = metric;
      
      if (this.metrics[name]) {
        if (this.metrics[name].set) {
          this.metrics[name].set(labels, value);
        } else if (this.metrics[name].inc) {
          this.metrics[name].inc(labels, value);
        }
      }
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  }
  
  /**
   * Start background monitoring tasks
   */
  startBackgroundMonitoring() {
    // Update compliance metrics every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await this.updateComplianceMetrics();
    });
    
    // Check certificate expiry daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      await this.checkCertificateExpiry();
    });
    
    // Generate daily compliance reports at midnight
    cron.schedule('0 0 * * *', async () => {
      await this.generateDailyReports();
    });
    
    // Clean up old alerts weekly
    cron.schedule('0 2 * * 0', async () => {
      await this.cleanupOldAlerts();
    });
    
    console.log('📅 Background monitoring tasks scheduled');
  }
  
  /**
   * Update compliance metrics for all organizations
   */
  async updateComplianceMetrics() {
    try {
      const query = `
        SELECT 
          o.id as organization_id,
          o.tenant_id,
          f.name as framework,
          AVG(ar.score) as avg_score
        FROM organizations o
        JOIN assessments a ON o.id = a.organization_id
        JOIN grc_frameworks f ON a.framework_id = f.id
        JOIN assessment_responses ar ON a.id = ar.assessment_id
        WHERE a.status = 'completed'
        GROUP BY o.id, o.tenant_id, f.id
      `;
      
      const [rows] = await db.execute(query);
      
      rows.forEach(row => {
        this.metrics.complianceScore.set({
          organization_id: row.organization_id,
          framework: row.framework,
          tenant_id: row.tenant_id
        }, row.avg_score);
      });
      
      console.log(`📊 Updated compliance metrics for ${rows.length} organization-framework combinations`);
      
    } catch (error) {
      console.error('Error updating compliance metrics:', error);
    }
  }
  
  /**
   * Check certificate expiry across all organizations
   */
  async checkCertificateExpiry() {
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          c.expiry_date,
          c.organization_id,
          o.tenant_id,
          DATEDIFF(c.expiry_date, NOW()) as days_until_expiry
        FROM certificates c
        JOIN organizations o ON c.organization_id = o.id
        WHERE c.expiry_date > NOW()
        AND DATEDIFF(c.expiry_date, NOW()) <= 90
        ORDER BY days_until_expiry ASC
      `;
      
      const [certificates] = await db.execute(query);
      
      for (const cert of certificates) {
        const daysUntilExpiry = cert.days_until_expiry;
        
        // Update metrics
        this.metrics.certificateExpiry.set({
          days_until_expiry: daysUntilExpiry.toString(),
          tenant_id: cert.tenant_id
        }, 1);
        
        // Generate alerts based on thresholds
        let severity = null;
        if (daysUntilExpiry <= this.alertThresholds.certificate_expiry.critical) {
          severity = 'critical';
        } else if (daysUntilExpiry <= this.alertThresholds.certificate_expiry.warning) {
          severity = 'warning';
        }
        
        if (severity) {
          await this.handleAlert({
            type: 'certificate_expiry',
            severity,
            organizationId: cert.organization_id,
            tenantId: cert.tenant_id,
            message: `Certificate "${cert.name}" expires in ${daysUntilExpiry} days`,
            data: {
              certificateId: cert.id,
              certificateName: cert.name,
              expiryDate: cert.expiry_date,
              daysUntilExpiry
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error checking certificate expiry:', error);
    }
  }
  
  /**
   * Generate daily compliance reports
   */
  async generateDailyReports() {
    try {
      console.log('📈 Generating daily compliance reports...');
      
      // Get all active tenants
      const [tenants] = await db.execute('SELECT id FROM tenants WHERE is_active = true');
      
      for (const tenant of tenants) {
        await this.generateTenantDailyReport(tenant.id);
      }
      
      console.log(`✅ Generated daily reports for ${tenants.length} tenants`);
      
    } catch (error) {
      console.error('Error generating daily reports:', error);
    }
  }
  
  /**
   * Generate daily report for a specific tenant
   */
  async generateTenantDailyReport(tenantId) {
    try {
      const reportData = await this.gatherDailyReportData(tenantId);
      
      // Store report in database
      const reportQuery = `
        INSERT INTO daily_reports (
          tenant_id, report_date, report_data, created_at
        ) VALUES (?, CURDATE(), ?, NOW())
        ON DUPLICATE KEY UPDATE
        report_data = VALUES(report_data),
        updated_at = NOW()
      `;
      
      await db.execute(reportQuery, [tenantId, JSON.stringify(reportData)]);
      
      // Send report to stakeholders if configured
      const stakeholders = await this.getReportStakeholders(tenantId);
      if (stakeholders.length > 0) {
        await this.sendDailyReport(reportData, stakeholders, tenantId);
      }
      
    } catch (error) {
      console.error(`Error generating daily report for tenant ${tenantId}:`, error);
    }
  }
  
  /**
   * Gather data for daily report
   */
  async gatherDailyReportData(tenantId) {
    const queries = {
      organizations: `
        SELECT COUNT(*) as count FROM organizations WHERE tenant_id = ?
      `,
      assessments: `
        SELECT 
          status,
          COUNT(*) as count
        FROM assessments a
        JOIN organizations o ON a.organization_id = o.id
        WHERE o.tenant_id = ?
        GROUP BY status
      `,
      compliance_scores: `
        SELECT 
          AVG(ar.score) as avg_score,
          MIN(ar.score) as min_score,
          MAX(ar.score) as max_score
        FROM assessment_responses ar
        JOIN assessments a ON ar.assessment_id = a.id
        JOIN organizations o ON a.organization_id = o.id
        WHERE o.tenant_id = ? AND a.status = 'completed'
      `,
      recent_alerts: `
        SELECT 
          type,
          severity,
          COUNT(*) as count
        FROM alerts
        WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY type, severity
      `
    };
    
    const reportData = {
      tenantId,
      reportDate: new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString()
    };
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        const [rows] = await db.execute(query, [tenantId]);
        reportData[key] = rows;
      } catch (error) {
        console.error(`Error executing query for ${key}:`, error);
        reportData[key] = [];
      }
    }
    
    return reportData;
  }
  
  /**
   * Get Prometheus metrics endpoint
   */
  async getMetrics() {
    return prometheus.register.metrics();
  }
  
  /**
   * Get monitoring dashboard data
   */
  async getDashboardData(tenantId, timeRange = '24h') {
    try {
      const dashboardData = {
        overview: await this.getOverviewMetrics(tenantId, timeRange),
        alerts: await this.getRecentAlerts(tenantId, timeRange),
        compliance: await this.getComplianceMetrics(tenantId, timeRange),
        trends: await this.getTrendData(tenantId, timeRange)
      };
      
      return dashboardData;
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }
  
  /**
   * Utility methods
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  calculateAlertRiskScore(alert) {
    const severityScores = { low: 1, medium: 3, high: 7, critical: 10 };
    const typeMultipliers = {
      compliance_violation: 2,
      security_incident: 3,
      certificate_expiry: 1.5,
      assessment_overdue: 1,
      regulatory_change: 1.2
    };
    
    const baseScore = severityScores[alert.severity] || 1;
    const multiplier = typeMultipliers[alert.type] || 1;
    
    return Math.round(baseScore * multiplier);
  }
  
  async storeAlert(alert) {
    const query = `
      INSERT INTO alerts (
        id, type, severity, organization_id, tenant_id, message, 
        data, risk_score, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.execute(query, [
      alert.id,
      alert.type,
      alert.severity,
      alert.organizationId,
      alert.tenantId,
      alert.message,
      JSON.stringify(alert.data || {}),
      alert.riskScore,
      alert.status,
      alert.timestamp
    ]);
  }
  
  async getAlertRecipients(alertType, organizationId, tenantId) {
    const query = `
      SELECT DISTINCT u.email, u.name
      FROM users u
      JOIN user_alert_subscriptions uas ON u.id = uas.user_id
      WHERE uas.alert_type = ? 
      AND (uas.organization_id = ? OR uas.organization_id IS NULL)
      AND u.tenant_id = ?
      AND u.is_active = true
    `;
    
    const [rows] = await db.execute(query, [alertType, organizationId, tenantId]);
    return rows;
  }
  
  async sendAlertNotifications(alert, recipients) {
    // Implementation would depend on notification service
    console.log(`📧 Sending alert notifications to ${recipients.length} recipients`);
    // This would integrate with the notification service
  }
  
  async createIncident(alert) {
    const query = `
      INSERT INTO incidents (
        alert_id, title, description, severity, organization_id, 
        tenant_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
    `;
    
    await db.execute(query, [
      alert.id,
      `Critical Alert: ${alert.type}`,
      alert.message,
      alert.severity,
      alert.organizationId,
      alert.tenantId,
      alert.timestamp
    ]);
  }
}

/**
 * Base Monitor Class
 */
class BaseMonitor extends EventEmitter {
  constructor(organizationId, tenantId, monitoringService) {
    super();
    this.organizationId = organizationId;
    this.tenantId = tenantId;
    this.monitoringService = monitoringService;
    this.isRunning = false;
    this.interval = null;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.run(); // Run immediately
    
    // Set up interval for periodic checks
    this.interval = setInterval(() => {
      this.run();
    }, this.getCheckInterval());
  }
  
  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  getCheckInterval() {
    return 5 * 60 * 1000; // 5 minutes default
  }
  
  async run() {
    // Override in subclasses
  }
}

/**
 * Compliance Score Monitor
 */
class ComplianceScoreMonitor extends BaseMonitor {
  async run() {
    try {
      const query = `
        SELECT 
          f.name as framework,
          AVG(ar.score) as avg_score
        FROM assessments a
        JOIN grc_frameworks f ON a.framework_id = f.id
        JOIN assessment_responses ar ON a.id = ar.assessment_id
        WHERE a.organization_id = ? AND a.status = 'completed'
        GROUP BY f.id
      `;
      
      const [rows] = await db.execute(query, [this.organizationId]);
      
      for (const row of rows) {
        // Update metric
        this.emit('metric', {
          name: 'complianceScore',
          value: row.avg_score,
          labels: {
            organization_id: this.organizationId,
            framework: row.framework,
            tenant_id: this.tenantId
          }
        });
        
        // Check thresholds
        if (row.avg_score < this.monitoringService.alertThresholds.compliance_score.critical) {
          this.emit('alert', {
            type: 'compliance_score',
            severity: 'critical',
            organizationId: this.organizationId,
            tenantId: this.tenantId,
            message: `Compliance score for ${row.framework} is critically low: ${row.avg_score}%`,
            data: { framework: row.framework, score: row.avg_score }
          });
        } else if (row.avg_score < this.monitoringService.alertThresholds.compliance_score.warning) {
          this.emit('alert', {
            type: 'compliance_score',
            severity: 'warning',
            organizationId: this.organizationId,
            tenantId: this.tenantId,
            message: `Compliance score for ${row.framework} is below target: ${row.avg_score}%`,
            data: { framework: row.framework, score: row.avg_score }
          });
        }
      }
    } catch (error) {
      console.error('Error in ComplianceScoreMonitor:', error);
    }
  }
}

/**
 * Certificate Expiry Monitor
 */
class CertificateExpiryMonitor extends BaseMonitor {
  getCheckInterval() {
    return 24 * 60 * 60 * 1000; // Daily
  }
  
  async run() {
    try {
      const query = `
        SELECT id, name, expiry_date, DATEDIFF(expiry_date, NOW()) as days_until_expiry
        FROM certificates
        WHERE organization_id = ? AND expiry_date > NOW()
        AND DATEDIFF(expiry_date, NOW()) <= 90
      `;
      
      const [certificates] = await db.execute(query, [this.organizationId]);
      
      for (const cert of certificates) {
        const days = cert.days_until_expiry;
        let severity = null;
        
        if (days <= this.monitoringService.alertThresholds.certificate_expiry.critical) {
          severity = 'critical';
        } else if (days <= this.monitoringService.alertThresholds.certificate_expiry.warning) {
          severity = 'warning';
        }
        
        if (severity) {
          this.emit('alert', {
            type: 'certificate_expiry',
            severity,
            organizationId: this.organizationId,
            tenantId: this.tenantId,
            message: `Certificate "${cert.name}" expires in ${days} days`,
            data: {
              certificateId: cert.id,
              certificateName: cert.name,
              daysUntilExpiry: days
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in CertificateExpiryMonitor:', error);
    }
  }
}

/**
 * Assessment Deadline Monitor
 */
class AssessmentDeadlineMonitor extends BaseMonitor {
  async run() {
    try {
      const query = `
        SELECT id, name, due_date, DATEDIFF(due_date, NOW()) as days_until_due
        FROM assessments
        WHERE organization_id = ? AND status IN ('draft', 'in_progress')
        AND due_date IS NOT NULL AND due_date > NOW()
        AND DATEDIFF(due_date, NOW()) <= 30
      `;
      
      const [assessments] = await db.execute(query, [this.organizationId]);
      
      for (const assessment of assessments) {
        const days = assessment.days_until_due;
        let severity = null;
        
        if (days <= this.monitoringService.alertThresholds.assessment_overdue.critical) {
          severity = 'critical';
        } else if (days <= this.monitoringService.alertThresholds.assessment_overdue.warning) {
          severity = 'warning';
        }
        
        if (severity) {
          this.emit('alert', {
            type: 'assessment_deadline',
            severity,
            organizationId: this.organizationId,
            tenantId: this.tenantId,
            message: `Assessment "${assessment.name}" is due in ${days} days`,
            data: {
              assessmentId: assessment.id,
              assessmentName: assessment.name,
              daysUntilDue: days
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in AssessmentDeadlineMonitor:', error);
    }
  }
}

/**
 * Placeholder monitors (to be implemented)
 */
class RegulatoryChangeMonitor extends BaseMonitor {
  async run() {
    // Monitor for regulatory changes from external sources
    // Implementation would depend on regulatory data feeds
  }
}

class SecurityIncidentMonitor extends BaseMonitor {
  async run() {
    // Monitor for security incidents from SIEM/security tools
    // Implementation would depend on security tool integrations
  }
}

class ControlDriftMonitor extends BaseMonitor {
  async run() {
    // Monitor for control configuration drift
    // Implementation would depend on configuration management tools
  }
}

module.exports = EnterpriseMonitoringService;
