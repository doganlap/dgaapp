/**
 * Email Digest Generator
 * Sends regulatory alerts and daily digests via email
 */

const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

class EmailDigestGenerator {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  async sendRegulatoryAlert(email, regulatoryChange, impactAnalysis) {
    try {
      const html = this.generateAlertEmail(regulatoryChange, impactAnalysis);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@shahin-ai.com',
        to: email,
        subject: `🔔 تنبيه تنظيمي - ${regulatoryChange.regulator_name}`,
        html
      });

      logger.info(`✅ Email alert sent to ${email}`);
      return true;

    } catch (error) {
      logger.error(`❌ Email send error:`, error.message);
      return false;
    }
  }

  async sendDailyDigest(email, changes) {
    try {
      const html = this.generateDigestEmail(changes);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@shahin-ai.com',
        to: email,
        subject: `📊 ملخص التغييرات التنظيمية اليومي - Daily Regulatory Digest`,
        html
      });

      logger.info(`✅ Daily digest sent to ${email}`);
      return true;

    } catch (error) {
      logger.error(`❌ Digest send error:`, error.message);
      return false;
    }
  }

  generateAlertEmail(regulatoryChange, impactAnalysis) {
    const urgencyColor = {
      critical: '#DC2626',
      high: '#EA580C',
      medium: '#CA8A04',
      low: '#16A34A'
    };

    const color = urgencyColor[regulatoryChange.urgency_level] || '#6366F1';

    return `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: ${color}; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .section { background: white; margin: 15px 0; padding: 15px; border-radius: 8px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>تنبيه تنظيمي - Regulatory Alert</h1>
      <p>${regulatoryChange.regulator_name}</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>${regulatoryChange.title}</h2>
        <p>${regulatoryChange.description || ''}</p>
      </div>
      <div class="section">
        <h3>تقييم التأثير - Impact Assessment</h3>
        <p><strong>درجة التأثير:</strong> ${impactAnalysis.impactScore}/10</p>
        <p><strong>الأقسام المتأثرة:</strong> ${regulatoryChange.affected_sectors?.join(', ')}</p>
        <p><strong>القسم المسؤول:</strong> ${impactAnalysis.responsibleDepartment}</p>
      </div>
      <div class="section">
        <h3>الإجراءات المطلوبة - Required Actions</h3>
        <ul>
          ${impactAnalysis.requiredActions?.map(action => `<li>${action}</li>`).join('') || ''}
        </ul>
      </div>
      <div class="section">
        <a href="https://www.shahin-ai.com/regulatory/changes/${regulatoryChange.id}" 
           style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          عرض التفاصيل الكاملة - View Full Details
        </a>
      </div>
    </div>
    <div class="footer">
      <p>Shahin GRC Platform | منصة شاهين للحوكمة والمخاطر والامتثال</p>
      <p>www.shahin-ai.com</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  generateDigestEmail(changes) {
    return `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #6366F1; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .change-item { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #6366F1; }
    .footer { text-align: center; padding: 20px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ملخص التغييرات التنظيمية اليومي</h1>
      <p>Daily Regulatory Digest</p>
    </div>
    <div class="content">
      <p><strong>${changes.length}</strong> تغيير تنظيمي جديد في آخر 24 ساعة</p>
      ${changes.map(change => `
        <div class="change-item">
          <h3>${change.title}</h3>
          <p><strong>${change.regulator_name}</strong> | ${change.urgency_level}</p>
        </div>
      `).join('')}
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://www.shahin-ai.com/regulatory" 
           style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          عرض جميع التغييرات - View All Changes
        </a>
      </div>
    </div>
    <div class="footer">
      <p>Shahin GRC Platform | منصة شاهين للحوكمة والمخاطر والامتثال</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = EmailDigestGenerator;

