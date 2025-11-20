# Regulatory Intelligence Service - KSA Deployment Guide

## Stage 1 Deployment Checklist

### Prerequisites
- [ ] PostgreSQL database running with `grc_assessment` database
- [ ] Redis server running (optional but recommended)
- [ ] Node.js 18+ installed
- [ ] OpenAI API key obtained
- [ ] SMTP credentials configured (for email notifications)

### Step 1: Install Dependencies

```bash
cd D:\Projects\GRC-Master\Assessmant-GRC\apps\services\regulatory-intelligence-service-ksa
npm install
```

### Step 2: Configure Environment

Create `.env` file:
```env
PORT=3008
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grc_assessment
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
OPENAI_API_KEY=your_openai_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@shahin-ai.com
```

### Step 3: Initialize Database

The service will automatically create required tables on first start:
- `regulatory_changes`
- `regulatory_impacts`
- `regulatory_calendar`

### Step 4: Start Service

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### Step 5: Verify Service

```bash
# Health check
curl http://localhost:3008/healthz

# Readiness check
curl http://localhost:3008/readyz

# Get regulators list
curl http://localhost:3008/api/regulatory/regulators

# Run manual scrape test
curl -X POST http://localhost:3008/api/regulatory/scrape/SAMA
```

### Step 6: Update Main BFF

Add routing in `apps/bff/index.js`:

```javascript
// Add Regulatory Intelligence Service routing
app.use('/api/regulatory', (req, res, next) => {
  const targetUrl = 'http://localhost:3008' + req.url;
  axios({
    method: req.method,
    url: targetUrl,
    data: req.body,
    headers: req.headers
  })
  .then(response => res.json(response.data))
  .catch(error => {
    console.error('Regulatory service error:', error.message);
    res.status(500).json({ error: 'Regulatory service unavailable' });
  });
});
```

### Step 7: Test End-to-End

```bash
# Through BFF
curl http://localhost:3000/api/regulatory/regulators

# Get recent changes
curl http://localhost:3000/api/regulatory/changes

# Get statistics
curl http://localhost:3000/api/regulatory/stats
```

## Production Deployment

### Docker Compose

Add to `infra/docker/docker-compose.ecosystem.yml`:

```yaml
services:
  regulatory-intelligence-ksa:
    build:
      context: ./apps/services/regulatory-intelligence-service-ksa
      dockerfile: Dockerfile
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_NAME=grc_assessment
      - REDIS_HOST=redis
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3008/healthz')"]
      interval: 30s
      timeout: 3s
      retries: 3
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: regulatory-intelligence-ksa
spec:
  replicas: 2
  selector:
    matchLabels:
      app: regulatory-intelligence-ksa
  template:
    metadata:
      labels:
        app: regulatory-intelligence-ksa
    spec:
      containers:
      - name: regulatory-intelligence
        image: your-registry/regulatory-intelligence-ksa:latest
        ports:
        - containerPort: 3008
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: grc-secrets
              key: db-host
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: grc-secrets
              key: openai-api-key
        livenessProbe:
          httpGet:
            path: /healthz
            port: 3008
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: 3008
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: regulatory-intelligence-ksa
spec:
  selector:
    app: regulatory-intelligence-ksa
  ports:
  - port: 3008
    targetPort: 3008
```

## Monitoring

### Logs
```bash
# View service logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log

# Docker logs
docker logs -f regulatory-intelligence-ksa
```

### Metrics to Monitor
- API response times
- Scraping success rate
- Notification delivery rate
- Database connection pool status
- OpenAI API usage and costs

## Troubleshooting

### Service Won't Start
1. Check database connection
2. Verify environment variables
3. Check port 3008 availability
4. Review logs in `logs/error.log`

### Scraping Failures
1. Website accessibility
2. CSS selectors may have changed
3. Rate limiting from regulatory websites
4. Network connectivity issues

### No Notifications Sent
1. Verify SMTP/WhatsApp/Twilio credentials
2. Check user preferences in database
3. Verify affected organizations/sectors match
4. Review notification logs

## Performance Tuning

### Database Optimization
```sql
-- Add indexes for better query performance
CREATE INDEX idx_regulatory_changes_created_at ON regulatory_changes(created_at);
CREATE INDEX idx_regulatory_changes_urgency_regulator ON regulatory_changes(urgency_level, regulator_id);
```

### Redis Caching
- Regulatory data cached for 1 hour
- Adjust TTL based on regulator update frequency
- Monitor cache hit rate

### Scraping Schedule
- Adjust cron schedules based on regulator activity
- More frequent for critical regulators (NCA, SAMA)
- Less frequent for slower-moving regulators

## Security Considerations

- [ ] API key rotation for OpenAI
- [ ] Secure credential storage in secrets manager
- [ ] Rate limiting on API endpoints
- [ ] Input validation for all user inputs
- [ ] HTTPS only in production
- [ ] Regular dependency updates

## Scaling

### Horizontal Scaling
- Service is stateless and can be scaled horizontally
- Use load balancer to distribute requests
- Scraping orchestration prevents duplicate scrapes

### Vertical Scaling
- Increase memory for OpenAI API processing
- More CPU for concurrent scraping
- Database connection pooling

## Success Metrics

After deployment, monitor:
- [ ] 100+ regulatory changes captured per month
- [ ] <5 second response time for API calls
- [ ] >95% uptime
- [ ] >90% notification delivery success
- [ ] User satisfaction with regulatory alerts

---

**Ready for Production:** ✅ Stage 1 Complete
**Next Step:** Deploy Stage 2 - Government Integration Service

