const nodemailer = require('nodemailer');

/**
 * SMTP Configuration
 */
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  };

  // If no SMTP credentials, use test account (for development)
  if (!config.auth.user || !config.auth.pass) {
    console.warn('[Notification Service] No SMTP credentials found, using test account');
    return nodemailer.createTestAccount();
  }

  return nodemailer.createTransport(config);
};

const transporter = createTransporter();

/**
 * Verify SMTP connection
 */
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('[Notification Service] SMTP connection verified');
    return true;
  } catch (error) {
    console.error('[Notification Service] SMTP connection failed:', error.message);
    return false;
  }
};

module.exports = {
  transporter,
  verifyConnection
};

