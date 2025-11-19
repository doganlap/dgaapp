# Quick Start Guide - DGA Platform with GRC

## 🚀 Running Development Environment

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or Prisma Cloud connection)
- npm 9+ installed

### Step 1: Start Backend Server

```bash
cd backend
npm install  # If not already installed
npm run dev
```

**Backend will run on:** http://localhost:5000

**Endpoints:**
- Health: http://localhost:5000/health
- API Base: http://localhost:5000/api
- API Docs: http://localhost:5000/api/docs
- GRC Dashboard: http://localhost:5000/api/grc/dashboard

### Step 2: Start Frontend Server

```bash
cd frontend
npm install  # If not already installed
npm run dev
```

**Frontend will run on:** http://localhost:5173

**Pages:**
- DGA Dashboard: http://localhost:5173/
- GRC Dashboard: http://localhost:5173/grc
- Risks: http://localhost:5173/grc/risks
- Compliance: http://localhost:5173/grc/compliance
- Insights: http://localhost:5173/grc/insights

## 📋 Platform Structure

### DGA Section (Existing)
- **Dashboard** - Main overview
- **Entities** - Government entities management
- **Programs** - Digital programs tracking
- **Budget** - Budget overview
- **Finance Control** - Financial management
- **Reports** - Reporting and analytics
- **Users** - User management

### GRC Section (NEW - Production)
- **GRC Dashboard** - Risk & compliance overview
- **Risks** - Risk management with analytics
- **Compliance** - Compliance tracking (PDPL, NCA ECC, ISO 27001)
- **Insights** - Advanced analytics & predictions

## 🔧 Configuration

### Backend Environment Variables
Create `backend/.env`:
```
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend Environment Variables
Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

## ✅ Testing

### Test Backend
1. Open browser: http://localhost:5000/health
2. Should see: `{"success":true,"message":"DGA Oversight API is running"}`

### Test Frontend
1. Open browser: http://localhost:5173
2. Navigate to GRC section in sidebar
3. Click on "GRC Dashboard"
4. Should see risk and compliance summaries

### Test GRC API
```bash
# Test GRC Dashboard
curl http://localhost:5000/api/grc/dashboard

# Test Risks
curl http://localhost:5000/api/grc/risks

# Test Compliance
curl http://localhost:5000/api/grc/compliance

# Test Insights
curl http://localhost:5000/api/grc/dashboard/insights
```

## 🐛 Troubleshooting

### Backend not starting
- Check if port 5000 is available
- Verify DATABASE_URL in .env
- Check database connection

### Frontend not starting
- Check if port 5173 is available
- Verify VITE_API_URL in .env
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### GRC pages not loading
- Check browser console for errors
- Verify backend is running
- Check API endpoints in Network tab

## 📊 Database Tables

### Required Tables
- `risks` - Risk management
- `compliance_records` - Compliance tracking
- `dga_entities` - Government entities
- `dga_programs` - Programs
- `users` - User accounts

### Run Migrations
```bash
cd backend
npm run migrate
```

### Seed Data (Optional)
```bash
cd backend
npm run seed
```

## 🎯 Quick Test Checklist

- [ ] Backend server starts on port 5000
- [ ] Frontend server starts on port 5173
- [ ] Health endpoint returns success
- [ ] GRC Dashboard API returns data
- [ ] Frontend loads without errors
- [ ] GRC section visible in sidebar
- [ ] GRC Dashboard page loads
- [ ] Risks page loads
- [ ] Compliance page loads
- [ ] Insights page loads

## 🚀 Production Deployment

### Vercel Deployment
Both frontend and backend are already configured for Vercel:
- Backend: `backend/vercel.json`
- Frontend: `frontend/vercel.json`

### Deploy Commands
```bash
# Backend
cd backend
vercel --prod

# Frontend
cd frontend
vercel --prod
```

---

**Status**: ✅ Ready for Development & Production

**Last Updated**: November 19, 2025

