/**
 * SMS Notifier
 * Sends regulatory alerts via SMS using Twilio
 */

const twilio = require('twilio');
const logger = require('../../utils/logger');

class SMSNotifier {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    }
  }

  async sendAlert(phoneNumber, regulatoryChange) {
    try {
      if (!this.client) {
        logger.warn('⚠️ SMS credentials not configured');
        return false;
      }

      const message = this.formatMessage(regulatoryChange);
      
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      });

      logger.info(`✅ SMS alert sent to ${phoneNumber}`);
      return true;

    } catch (error) {
      logger.error(`❌ SMS send error:`, error.message);
      return false;
    }
  }

  formatMessage(regulatoryChange) {
    return `[تنبيه تنظيمي]
${regulatoryChange.regulator_name}: ${regulatoryChange.title.substring(0, 100)}...

المستوى: ${regulatoryChange.urgency_level}
التفاصيل: www.shahin-ai.com`;
  }
}

module.exports = SMSNotifier;

