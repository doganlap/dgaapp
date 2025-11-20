# Regulatory Intelligence Service - KSA

Real-time monitoring and analysis of Saudi Arabian regulatory changes.

## Overview

This microservice monitors 6 key Saudi regulatory authorities 24/7 and provides:

- **Real-time regulatory alerts** when new regulations are published
- **AI-powered impact analysis** using OpenAI GPT-4
- **Multi-channel notifications** (WhatsApp, SMS, Email)
- **Compliance calendar** with Hijri date integration
- **Sector-based filtering** to show only relevant changes

## Monitored Regulators

1. **SAMA** - Saudi Central Bank (البنك المركزي السعودي)
2. **NCA** - National Cybersecurity Authority (الهيئة الوطنية للأمن السيبراني)
3. **MOH** - Ministry of Health (وزارة الصحة)
4. **ZATCA** - Zakat, Tax and Customs Authority (هيئة الزكاة والضريبة والجمارك)
5. **SDAIA** - Saudi Data & AI Authority (الهيئة السعودية للبيانات والذكاء الاصطناعي)
6. **CMA** - Capital Market Authority (هيئة السوق المالية)

## Features

### 1. Automated Scraping
- Scheduled scraping of regulatory websites
- Intelligent change detection
- Automatic categorization by urgency level

### 2. AI Impact Analysis
- GPT-4 powered analysis of regulatory changes
- Impact scoring (1-10)
- Required actions identification
- Cost estimation

### 3. Smart Notifications
- **Critical/High urgency**: Immediate WhatsApp + SMS + Email
- **Medium urgency**: Email notification
- **Daily digest**: Consolidated email of all changes

### 4. Compliance Calendar
- Automatic deadline tracking
- Hijri calendar integration
- 7-day advance reminders
- Integration with Outlook/Google Calendar

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure environment variables
nano .env

# Run database migrations (handled by main service)
# Tables: regulatory_changes, regulatory_impacts, regulatory_calendar

# Start service
npm start

# Or development mode
npm run dev
```

## API Endpoints

### Get Recent Changes
```http
GET /api/regulatory/changes?regulator=SAMA&limit=50
```

### Get Change Details with Impact Analysis
```http
GET /api/regulatory/changes/:id
```

### Trigger Manual Scrape
```http
POST /api/regulatory/scrape/:regulator
```

### Get Monitored Regulators
```http
GET /api/regulatory/regulators
```

### Add to Compliance Calendar
```http
POST /api/regulatory/calendar/add
Body: { "regulatoryChangeId": 123, "organizationId": 456 }
```

### Get Upcoming Deadlines
```http
GET /api/regulatory/calendar/:organizationId?days=30
```

### Mark Deadline Complete
```http
PUT /api/regulatory/calendar/:id/complete
```

### Get Statistics
```http
GET /api/regulatory/stats
```

## Architecture

```
regulatory-intelligence-service-ksa/
├── src/
│   ├── scrapers/           # Regulatory website scrapers
│   │   ├── SAMARegulatoryScraper.js
│   │   ├── NCARegulatoryScraper.js
│   │   ├── MOHRegulatoryScraper.js
│   │   ├── ZATCARegulatoryScraper.js
│   │   ├── SDAIARegulatoryScraper.js
│   │   ├── CMARegulatoryScraper.js
│   │   └── scrapeOrchestrator.js
│   ├── analyzers/          # AI analysis engines
│   │   ├── ImpactAnalysisEngine.js
│   │   ├── SectorMappingEngine.js
│   │   └── UrgencyClassifier.js
│   ├── notifications/      # Multi-channel notifications
│   │   ├── NotificationOrchestrator.js
│   │   ├── WhatsAppNotifier.js
│   │   ├── SMSNotifier.js
│   │   └── EmailDigestGenerator.js
│   └── calendar/           # Calendar integration
│       ├── HijriCalendarIntegration.js
│       └── ComplianceDeadlineTracker.js
├── config/
│   ├── database.js         # PostgreSQL configuration
│   └── redis.js            # Redis caching
├── routes/
│   └── regulatory.js       # API routes
└── server.js               # Express server

## Docker Deployment

```bash
# Build image
docker build -t regulatory-intelligence-ksa:latest .

# Run container
docker run -d \
  --name regulatory-intelligence-ksa \
  -p 3008:3008 \
  --env-file .env \
  regulatory-intelligence-ksa:latest
```

## Production Deployment

### Health Check Endpoints
- `/healthz` - Basic health check
- `/readyz` - Readiness check (includes DB and Redis)

### Monitoring
- Structured JSON logging
- Winston logger with rotation
- Performance metrics via endpoints

### Scheduled Jobs
- **Every 4-6 hours**: Automatic regulatory scraping
- **Daily 9:00 AM**: Daily digest emails
- **Hourly**: Deadline reminder checks

## Environment Variables

See `.env.example` for all configuration options.

### Required
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection
- `OPENAI_API_KEY` - For AI impact analysis

### Optional
- `WHATSAPP_*` - WhatsApp Business API credentials
- `TWILIO_*` - SMS notifications via Twilio
- `SMTP_*` - Email notifications

## Integration with Main Platform

This service is called by the main BFF (`apps/bff/index.js`):

```javascript
app.use('/api/regulatory', 
  proxy('http://regulatory-intelligence-ksa:3008/api/regulatory')
);
```

## Testing

```bash
# Run manual scrape test
curl -X POST http://localhost:3008/api/regulatory/scrape/SAMA

# Check recent changes
curl http://localhost:3008/api/regulatory/changes

# Get stats
curl http://localhost:3008/api/regulatory/stats
```

## Troubleshooting

### Scraping Issues
- Check website accessibility
- Verify CSS selectors (websites may change structure)
- Review logs in `logs/combined.log`

### Notification Issues
- Verify API credentials in environment
- Check rate limits for WhatsApp/Twilio
- Test SMTP connection

### Database Issues
- Ensure tables are created
- Check PostgreSQL connection
- Verify row-level security policies

## Future Enhancements

- [ ] Machine learning for regulatory trend prediction
- [ ] Automated compliance gap analysis
- [ ] Integration with more regulators
- [ ] Mobile app push notifications
- [ ] Arabic NLP for better analysis

## Support

For issues or questions:
- Check logs: `tail -f logs/combined.log`
- Review API documentation above
- Contact: support@doganconsult.com

---

**Built with ❤️ for Saudi regulatory compliance**

