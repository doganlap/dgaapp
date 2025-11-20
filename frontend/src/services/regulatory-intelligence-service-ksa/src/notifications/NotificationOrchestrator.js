/**
 * Notification Orchestrator
 * Coordinates sending notifications via multiple channels
 */

const WhatsAppNotifier = require('./WhatsAppNotifier');
const SMSNotifier = require('./SMSNotifier');
const EmailDigestGenerator = require('./EmailDigestGenerator');
const logger = require('../../utils/logger');
const { pool } = require('../../config/database');

const whatsappNotifier = new WhatsAppNotifier();
const smsNotifier = new SMSNotifier();
const emailNotifier = new EmailDigestGenerator();

/**
 * Send notifications about regulatory change to affected organizations
 */
async function sendNotifications(regulatoryChange, impactAnalysis) {
  try {
    logger.info(`📢 Sending notifications for: ${regulatoryChange.title.substring(0, 50)}...`);

    // Get affected organizations
    const affectedOrgs = await getAffectedOrganizations(regulatoryChange);
    
    if (affectedOrgs.length === 0) {
      logger.info(`ℹ️ No organizations affected by this regulatory change`);
      return;
    }

    logger.info(`📊 Found ${affectedOrgs.length} affected organizations`);

    // Send notifications based on urgency level and user preferences
    for (const org of affectedOrgs) {
      try {
        const users = await getOrganizationUsers(org.id);
        
        for (const user of users) {
          // Critical and high urgency: Send immediate notifications
          if (regulatoryChange.urgency_level === 'critical' || regulatoryChange.urgency_level === 'high') {
            // WhatsApp notification (if enabled)
            if (user.whatsapp_enabled && user.phone_number) {
              await whatsappNotifier.sendAlert(user.phone_number, regulatoryChange, impactAnalysis);
            }
            
            // SMS notification (if enabled)
            if (user.sms_enabled && user.phone_number) {
              await smsNotifier.sendAlert(user.phone_number, regulatoryChange);
            }
          }
          
          // Email notification (always sent)
          if (user.email) {
            await emailNotifier.sendRegulatoryAlert(user.email, regulatoryChange, impactAnalysis);
          }
        }
        
        logger.info(`✅ Notifications sent to ${users.length} users in organization: ${org.name}`);
        
      } catch (error) {
        logger.error(`❌ Error sending notifications to organization ${org.id}:`, error);
      }
    }

  } catch (error) {
    logger.error(`❌ Notification orchestration error:`, error);
  }
}

/**
 * Get organizations affected by regulatory change
 */
async function getAffectedOrganizations(regulatoryChange) {
  const client = await pool.connect();
  try {
    // Get organizations whose sector matches the affected sectors
    const query = `
      SELECT DISTINCT o.* 
      FROM organizations o
      WHERE o.sector = ANY($1)
         OR $2 = ANY($1)
    `;
    
    const result = await client.query(query, [
      regulatoryChange.affected_sectors,
      'All Sectors'
    ]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get users who should receive notifications for an organization
 */
async function getOrganizationUsers(organizationId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT u.* 
      FROM users u
      WHERE u.organization_id = $1
        AND u.receive_regulatory_alerts = true
        AND u.is_active = true
      ORDER BY u.role
    `;
    
    const result = await client.query(query, [organizationId]);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Send daily digest of regulatory changes
 */
async function sendDailyDigest() {
  logger.info(`📧 Generating daily regulatory digest...`);
  
  try {
    // Get regulatory changes from last 24 hours
    const client = await pool.connect();
    try {
      const changesQuery = `
        SELECT * FROM regulatory_changes
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY urgency_level, created_at DESC
      `;
      
      const changesResult = await client.query(changesQuery);
      const changes = changesResult.rows;
      
      if (changes.length === 0) {
        logger.info(`ℹ️ No regulatory changes in last 24 hours`);
        return;
      }

      // Get all users who want daily digest
      const usersQuery = `
        SELECT u.* FROM users u
        WHERE u.receive_daily_digest = true
          AND u.is_active = true
      `;
      
      const usersResult = await client.query(usersQuery);
      const users = usersResult.rows;
      
      // Send digest to each user
      for (const user of users) {
        await emailNotifier.sendDailyDigest(user.email, changes);
      }
      
      logger.info(`✅ Daily digest sent to ${users.length} users`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error(`❌ Daily digest error:`, error);
  }
}

module.exports = {
  sendNotifications,
  sendDailyDigest
};

