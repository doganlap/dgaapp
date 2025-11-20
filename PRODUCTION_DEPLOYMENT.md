# 🚀 Production Deployment Guide

## ✅ Production-Ready Docker Setup

Complete production deployment configuration with Docker Compose.

---

## 📋 Prerequisites

1. **Docker** and **Docker Compose** installed
2. **Database URL** (PostgreSQL connection string)
3. **JWT Secret** (minimum 32 characters)
4. **Domain/Server** configured

---

## 🔧 Setup Steps

### 1. Create Production Environment File

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and fill in your values:

```env
DATABASE_URL=postgres://user:password@host:5432/database?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
BACKEND_PORT=5000
FRONTEND_PORT=80
```

### 2. Deploy to Production

#### Linux/Mac:
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

#### Windows (PowerShell):
```powershell
.\deploy-production.ps1
```

#### Manual Deployment:
```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# Seed database (optional)
docker-compose -f docker-compose.prod.yml run --rm backend npm run seed:all
```

---

## 🌐 Access Points

- **Frontend**: http://your-server:80 (or configured port)
- **Backend API**: http://your-server:5000
- **Health Check**: http://your-server:5000/health
- **API Docs**: http://your-server:5000/api/docs (if enabled)

---

## 🔒 Security Features

### Production Dockerfile
- ✅ Multi-stage build for smaller images
- ✅ Production-only dependencies
- ✅ Non-root user (if configured)
- ✅ Health checks enabled
- ✅ Logging configured

### Environment Variables
- ✅ Secrets in `.env.production` (not in code)
- ✅ CORS restricted to specific origins
- ✅ JWT secret required
- ✅ Database SSL required

### Network Security
- ✅ Services on isolated Docker network
- ✅ Only necessary ports exposed
- ✅ Internal service communication

---

## 📊 Monitoring & Logs

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Check Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# Frontend health
curl http://localhost/health
```

---

## 🔄 Updates & Maintenance

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations if needed
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Stop and Remove Volumes
```bash
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🗄️ Database Management

### Run Migrations
```bash
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate
```

### Rollback Migrations
```bash
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate:rollback
```

### Seed Database
```bash
docker-compose -f docker-compose.prod.yml run --rm backend npm run seed:all
```

---

## 📈 Production Optimizations

### Frontend
- ✅ Nginx with gzip compression
- ✅ Static asset caching (1 year)
- ✅ Security headers
- ✅ SPA routing support
- ✅ Optimized build size

### Backend
- ✅ Production dependencies only
- ✅ Health checks
- ✅ Logging with rotation
- ✅ Rate limiting
- ✅ CORS protection

---

## 🚨 Troubleshooting

### Backend Not Starting
1. Check DATABASE_URL is correct
2. Verify database is accessible
3. Check logs: `docker-compose -f docker-compose.prod.yml logs backend`

### Frontend Not Loading
1. Check backend is healthy
2. Verify CORS_ORIGIN includes frontend URL
3. Check logs: `docker-compose -f docker-compose.prod.yml logs frontend`

### Database Connection Issues
1. Verify DATABASE_URL format
2. Check SSL requirements
3. Test connection from host machine

### Port Conflicts
1. Change ports in `.env.production`
2. Update `docker-compose.prod.yml` if needed

---

## 🔐 Security Checklist

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] DATABASE_URL uses SSL (sslmode=require)
- [ ] CORS_ORIGIN set to production domain
- [ ] NODE_ENV=production
- [ ] Firewall configured
- [ ] Regular security updates
- [ ] Logs monitored
- [ ] Backups configured

---

## 📝 Files Created

1. `docker-compose.prod.yml` - Production orchestration
2. `.env.production.example` - Environment template
3. `deploy-production.sh` - Linux/Mac deployment script
4. `deploy-production.ps1` - Windows deployment script
5. `PRODUCTION_DEPLOYMENT.md` - This guide

---

## ✅ Production Ready!

Your application is now configured for production deployment with Docker.

**Next Steps:**
1. Configure your production server
2. Set up reverse proxy (Nginx/Traefik) if needed
3. Configure SSL certificates
4. Set up monitoring and alerts
5. Configure backups

---

**Status**: ✅ **Production deployment ready!**
