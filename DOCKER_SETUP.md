# 🐳 Docker Setup & Deployment Guide

## ✅ Docker Images Built Successfully

Both frontend and backend Docker images have been built and are ready to run.

---

## 📦 Images Created

1. **dga-backend** - Backend API server (Node.js/Express)
2. **dga-frontend** - Frontend application (React/Vite + Nginx)

---

## 🚀 Running the Application

### Start Containers
```bash
docker-compose up -d
```

### Stop Containers
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
docker-compose restart
```

---

## 🌐 Access Points

- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health
- **API Documentation**: http://localhost:5000/api/docs

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost
NODE_ENV=production
```

### Docker Compose Services

- **backend**: Runs on port 5000
- **frontend**: Runs on port 80 (Nginx)

---

## 📋 Docker Commands

### Build Images
```bash
docker-compose build
```

### Build and Run
```bash
docker-compose up --build
```

### View Running Containers
```bash
docker ps
```

### Execute Commands in Container
```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh
```

### Run Database Migrations
```bash
docker-compose exec backend npm run migrate
```

### Run Database Seeds
```bash
docker-compose exec backend npm run seed:all
```

---

## 🏗️ Architecture

### Backend Container
- **Base Image**: node:20-alpine
- **Port**: 5000
- **Health Check**: `/health` endpoint
- **Dependencies**: All npm packages installed

### Frontend Container
- **Build Stage**: node:20-alpine (builds React app)
- **Production Stage**: nginx:alpine (serves static files)
- **Port**: 80
- **Health Check**: `/health` endpoint
- **Features**: 
  - SPA routing support
  - Gzip compression
  - Static asset caching
  - Security headers

---

## 🔍 Troubleshooting

### Check Container Status
```bash
docker-compose ps
```

### View Container Logs
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Restart a Specific Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Rebuild After Code Changes
```bash
docker-compose up --build -d
```

### Remove All Containers and Volumes
```bash
docker-compose down -v
```

---

## ✅ Health Checks

Both containers include health checks:

- **Backend**: Checks `/health` endpoint every 30 seconds
- **Frontend**: Checks `/health` endpoint every 30 seconds

View health status:
```bash
docker ps
```

---

## 📝 Notes

- Frontend is served via Nginx for optimal performance
- Backend runs Node.js in production mode
- Both containers are on the same Docker network (`dga-network`)
- Environment variables can be set in `.env` file or `docker-compose.yml`

---

**Status**: ✅ **Docker setup complete and ready to use!**

