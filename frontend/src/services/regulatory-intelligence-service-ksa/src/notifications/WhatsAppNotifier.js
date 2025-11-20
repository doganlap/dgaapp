/**
 * WhatsApp Notifier
 * Sends regulatory alerts via WhatsApp Business API
 */

const axios = require('axios');
const logger = require('../../utils/logger');

class WhatsAppNotifier {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  }

  async sendAlert(phoneNumber, regulatoryChange, impactAnalysis) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        logger.warn('⚠️ WhatsApp credentials not configured');
        return false;
      }

      const message = this.formatMessage(regulatoryChange, impactAnalysis);
      
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phoneNumber.replace(/\D/g, ''), // Remove non-digits
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`✅ WhatsApp alert sent to ${phoneNumber}`);
      return true;

    } catch (error) {
      logger.error(`❌ WhatsApp send error:`, error.message);
      return false;
    }
  }

  formatMessage(regulatoryChange, impactAnalysis) {
    const urgencyEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    const emoji = urgencyEmoji[regulatoryChange.urgency_level] || '🔵';

    return `${emoji} *تنبيه تنظيمي - Regulatory Alert*

*${regulatoryChange.regulator_name}*
${regulatoryChange.title}

*مستوى التأثير - Impact Score:* ${impactAnalysis.impactScore}/10

${impactAnalysis.requiredActions?.slice(0, 3).map((action, i) => `${i + 1}. ${action}`).join('\n') || ''}

*الموعد النهائي - Deadline:* ${regulatoryChange.deadline_date || 'لم يحدد - TBD'}

للمزيد من المعلومات، يرجى تسجيل الدخول إلى منصة GRC
For more details, please login to GRC Platform: www.shahin-ai.com`;
  }
}

module.exports = WhatsAppNotifier;

