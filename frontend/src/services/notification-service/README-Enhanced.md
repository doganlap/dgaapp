# Enhanced GRC Notification Service v2.0

A comprehensive notification microservice with rich email templating, SMS integration, and queue-based processing for the GRC Assessment Platform.

## ✨ Features

### Email Notifications
- **MJML Templates**: Professional, responsive email layouts
- **Handlebars Integration**: Dynamic content with variables and conditionals
- **Multiple Providers**: SMTP, SendGrid, Azure Service Bus Email
- **Email Tracking**: Optional tracking with message IDs
- **Attachments Support**: File attachments for reports and documents
- **HTML/Text Versions**: Automatic plain text generation

### SMS Notifications
- **Twilio Integration**: Reliable SMS delivery worldwide
- **Template Support**: Dynamic SMS content with variables
- **Bulk SMS**: Efficient batch processing
- **Delivery Tracking**: Real-time delivery status updates
- **Phone Validation**: Number format validation and carrier lookup

### Queue Processing
- **Redis Bull Queues**: Async processing with retry logic
- **Priority Handling**: Urgent, high, normal, low priority levels
- **Job Management**: Status tracking, retry, and cancellation
- **Rate Limiting**: Configurable limits to respect provider limits
- **Dead Letter Handling**: Failed job management and alerting

### Advanced Features
- **Multi-tenant Support**: Tenant isolation and filtering
- **Comprehensive Logging**: Winston logging with multiple transports
- **Health Monitoring**: Service health checks and queue statistics
- **Template Management**: Runtime template updates and validation
- **Audit Logging**: Compliance tracking for all notifications
- **Performance Metrics**: Response time and throughput monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Redis (for queue processing)
- PostgreSQL (for audit logging)
- SMTP credentials or Twilio account

### Installation
```bash
cd apps/services/notification-service
npm install
```

### Environment Configuration
Create a `.env` file:
```bash
# Server Configuration
NODE_ENV=development
PORT=3004
SERVICE_TOKEN=your-secure-service-token

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/grc

# Redis Queue
REDIS_URL=redis://localhost:6379

# Email Configuration
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="GRC Platform <noreply@grc-platform.com>"
EMAIL_TRACKING=true

# SendGrid (Alternative)
# EMAIL_PROVIDER=sendgrid
# SENDGRID_API_KEY=your-sendgrid-api-key

# SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# Logging
LOG_LEVEL=info
```

### Start Service
```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Reference

### Base URL
```
http://localhost:3004/api
```

### Authentication
All requests require a service token in the header:
```bash
X-Service-Token: your-secure-service-token
```

### Send Single Notification
```http
POST /notifications/send
Content-Type: application/json
X-Tenant-ID: tenant-123

{
  "type": "email",
  "recipients": ["user@example.com"],
  "template": "assessment-assigned",
  "data": {
    "assigneeName": "John Doe",
    "assessmentTitle": "SOX Compliance Assessment",
    "dueDate": "2024-02-01",
    "priority": "high",
    "framework": "SOX",
    "assessmentUrl": "https://app.grc-platform.com/assessments/123"
  },
  "priority": "high"
}
```

### Send Bulk Notifications
```http
POST /notifications/bulk
Content-Type: application/json
X-Tenant-ID: tenant-123

{
  "notifications": [
    {
      "type": "email",
      "recipients": ["user1@example.com"],
      "template": "assessment-reminder",
      "data": { /* template data */ },
      "priority": "normal"
    },
    {
      "type": "sms",
      "recipients": ["+1234567890"],
      "template": "assessment-due",
      "data": { /* template data */ },
      "priority": "urgent"
    }
  ]
}
```

### Check Notification Status
```http
GET /notifications/status/{jobId}
```

### Get Queue Statistics
```http
GET /queue/status
```

### Render Template Preview
```http
POST /templates/render
Content-Type: application/json

{
  "template": "risk-alert",
  "type": "email",
  "data": {
    "riskTitle": "Unauthorized Access Detected",
    "riskLevel": "high",
    "recipientName": "Security Team"
  }
}
```

## 📧 Email Templates

### Available Templates
- `assessment-assigned` - New assessment assignment notification
- `assessment-reminder` - Assessment due date reminder
- `assessment-completed` - Assessment completion confirmation
- `collaboration-invite` - Real-time collaboration invitation
- `risk-alert` - Risk identification and escalation
- `simple` - Generic message template

### Template Variables
Common variables available in all templates:
- `{{tenantId}}` - Tenant identifier
- `{{timestamp}}` - Current timestamp
- `{{priority}}` - Notification priority level

### Custom Templates
Add custom MJML templates to `/templates/email/` directory:
```mjml
<mjml>
  <mj-head>
    <mj-title>{{subject}}</mj-title>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>{{message}}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

## 📱 SMS Templates

### Available Templates
- `assessment-assigned` - New assessment assignment alert
- `assessment-reminder` - Due date reminder
- `assessment-completed` - Completion confirmation
- `collaboration-invite` - Collaboration invitation
- `risk-alert` - Critical risk notification

### Custom SMS Templates
Add text templates to `/templates/sms/` directory:
```text
Alert: {{alertType}} detected in {{assessmentTitle}}.
Action required by {{dueDate}}.
View: {{shortUrl}}
```

## 🔧 Configuration

### Queue Configuration
```javascript
// Queue priority levels
{
  "urgent": 1,    // Critical alerts, security incidents
  "high": 2,      // Assessment deadlines, compliance issues
  "normal": 3,    // Regular notifications
  "low": 4        // Informational updates
}
```

### Email Provider Setup

#### SMTP Configuration
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
```

#### SendGrid Configuration
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-api-key
```

### SMS Provider Setup
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890
```

## 📊 Monitoring

### Health Check
```http
GET /health
```
Returns service status, queue statistics, and memory usage.

### Logging
- **Console**: Colored development logs
- **File**: Structured JSON logs with rotation
- **Audit**: Compliance tracking logs
- **Performance**: Response time and throughput metrics

### Metrics
- Queue processing rates
- Email delivery success/failure rates
- SMS delivery statistics
- Template rendering performance
- Error rates by type

## 🐳 Docker Support

### Development
```bash
docker-compose up notification-service-enhanced
```

### Production
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3004
CMD ["npm", "start"]
```

## 🔒 Security

### Service Token
- Required for all API endpoints
- Configurable via environment variables
- Should be rotated regularly

### Rate Limiting
- 1000 requests per 15 minutes per IP
- Configurable limits
- Bypass for internal services

### Data Protection
- No sensitive data in logs
- Email content encryption in transit
- Audit trail for compliance

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

### Test Templates
```javascript
// Test email template rendering
const result = await templateService.renderEmailTemplate('assessment-assigned', {
  assigneeName: 'Test User',
  assessmentTitle: 'Test Assessment'
});

expect(result.html).toContain('Test User');
expect(result.subject).toBe('Assessment Assigned - GRC Platform');
```

## 📈 Performance

### Benchmarks
- Email processing: ~500 emails/minute
- SMS processing: ~100 SMS/minute
- Template rendering: ~1000 renders/second
- Queue throughput: ~10,000 jobs/minute

### Optimization
- Connection pooling for SMTP
- Template caching
- Batch processing for bulk operations
- Redis clustering for high availability

## 🤝 Integration

### With GRC Services
```javascript
// From grc-api service
const response = await fetch('http://notification-service:3004/api/notifications/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Token': process.env.NOTIFICATION_SERVICE_TOKEN,
    'X-Tenant-ID': tenantId
  },
  body: JSON.stringify({
    type: 'email',
    recipients: ['user@example.com'],
    template: 'assessment-assigned',
    data: assessmentData
  })
});
```

### Webhook Integration
```javascript
// Receive delivery status webhooks
app.post('/webhooks/twilio/status', (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  // Update delivery status in database
});
```

## 🚀 Roadmap

### Version 2.1
- [ ] Push notification support (FCM, APNS)
- [ ] Slack/Teams integration
- [ ] Rich email analytics dashboard
- [ ] A/B testing for templates

### Version 2.2
- [ ] Multi-language template support
- [ ] Advanced scheduling (cron-based)
- [ ] Template marketplace
- [ ] AI-powered content optimization

## 📞 Support

For issues and questions:
- Create GitHub issue
- Email: support@grc-platform.com
- Slack: #grc-notifications

## 📄 License

MIT License - see LICENSE file for details.
