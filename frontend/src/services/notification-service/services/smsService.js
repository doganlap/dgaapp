const twilio = require('twilio');
const winston = require('winston');
require('dotenv').config();

class SMSService {
  constructor() {
    this.client = null;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/sms-service.log' }),
        new winston.transports.Console()
      ]
    });

    this.initializeTwilio();
  }

  initializeTwilio() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.fromNumber = process.env.TWILIO_FROM_NUMBER;
      this.logger.info('Twilio SMS service initialized');
    } else {
      this.logger.warn('Twilio credentials not found - SMS service disabled');
    }
  }

  /**
   * Send SMS to single or multiple recipients
   * @param {string|Array} recipients - Phone number(s)
   * @param {string} message - SMS message
   * @param {Object} options - SMS options
   */
  async sendSMS(recipients, message, options = {}) {
    if (!this.client) {
      throw new Error('SMS service not configured - missing Twilio credentials');
    }

    const phoneNumbers = Array.isArray(recipients) ? recipients : [recipients];
    const results = [];

    for (const phoneNumber of phoneNumbers) {
      try {
        const smsData = {
          body: message,
          from: options.from || this.fromNumber,
          to: this.formatPhoneNumber(phoneNumber)
        };

        // Add optional features
        if (options.statusCallback) {
          smsData.statusCallback = options.statusCallback;
        }

        if (options.mediaUrl) {
          smsData.mediaUrl = Array.isArray(options.mediaUrl) ? options.mediaUrl : [options.mediaUrl];
        }

        const result = await this.client.messages.create(smsData);

        results.push({
          success: true,
          phoneNumber: phoneNumber,
          messageId: result.sid,
          status: result.status,
          direction: result.direction,
          price: result.price,
          priceUnit: result.priceUnit
        });

        this.logger.info('SMS sent successfully', {
          phoneNumber: phoneNumber,
          messageId: result.sid,
          status: result.status
        });

      } catch (error) {
        results.push({
          success: false,
          phoneNumber: phoneNumber,
          error: error.message,
          code: error.code
        });

        this.logger.error('Failed to send SMS', {
          phoneNumber: phoneNumber,
          error: error.message,
          code: error.code
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      total: phoneNumbers.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Send templated SMS using predefined templates
   * @param {string|Array} recipients - Phone number(s)
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   * @param {Object} options - SMS options
   */
  async sendTemplatedSMS(recipients, templateName, data = {}, options = {}) {
    try {
      const templateService = require('./templateService');
      const message = templateService.renderSMSTemplate(templateName, data);

      return await this.sendSMS(recipients, message, options);
    } catch (error) {
      this.logger.error('Failed to send templated SMS', {
        error: error.message,
        template: templateName,
        recipients: Array.isArray(recipients) ? recipients.length : 1
      });
      throw error;
    }
  }

  /**
   * Send bulk SMS messages
   * @param {Array} smsBatch - Array of SMS configurations
   */
  async sendBulkSMS(smsBatch) {
    const results = [];
    const batchSize = 5; // Process in smaller batches for SMS

    for (let i = 0; i < smsBatch.length; i += batchSize) {
      const batch = smsBatch.slice(i, i + batchSize);

      const batchPromises = batch.map(async (smsConfig, index) => {
        try {
          const { recipients, message, template, data, options } = smsConfig;

          let result;
          if (template && data) {
            result = await this.sendTemplatedSMS(recipients, template, data, options);
          } else {
            result = await this.sendSMS(recipients, message, options);
          }

          return {
            index: i + index,
            success: true,
            result
          };
        } catch (error) {
          return {
            index: i + index,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value));

      // Delay between batches to respect rate limits
      if (i + batchSize < smsBatch.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.logger.info('Bulk SMS batch completed', {
      total: smsBatch.length,
      successful,
      failed
    });

    return {
      total: smsBatch.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get SMS delivery status
   * @param {string} messageId - Twilio message SID
   */
  async getDeliveryStatus(messageId) {
    if (!this.client) {
      throw new Error('SMS service not configured');
    }

    try {
      const message = await this.client.messages(messageId).fetch();

      return {
        messageId: message.sid,
        status: message.status,
        direction: message.direction,
        from: message.from,
        to: message.to,
        body: message.body,
        numSegments: message.numSegments,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent
      };
    } catch (error) {
      this.logger.error('Failed to get SMS delivery status', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get account balance and SMS pricing
   */
  async getAccountInfo() {
    if (!this.client) {
      throw new Error('SMS service not configured');
    }

    try {
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

      return {
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
        dateUpdated: account.dateUpdated
      };
    } catch (error) {
      this.logger.error('Failed to get account info', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   */
  async validatePhoneNumber(phoneNumber) {
    if (!this.client) {
      throw new Error('SMS service not configured');
    }

    try {
      const lookup = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();

      return {
        valid: true,
        phoneNumber: lookup.phoneNumber,
        nationalFormat: lookup.nationalFormat,
        countryCode: lookup.countryCode,
        carrier: lookup.carrier || null
      };
    } catch (error) {
      return {
        valid: false,
        phoneNumber: phoneNumber,
        error: error.message
      };
    }
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phoneNumber - Raw phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if missing (assuming US/CA)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }

    return phoneNumber;
  }

  /**
   * Get SMS service statistics
   */
  getStatistics() {
    return {
      isConfigured: !!this.client,
      provider: 'twilio',
      fromNumber: this.fromNumber,
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing'
    };
  }
}

module.exports = new SMSService();
