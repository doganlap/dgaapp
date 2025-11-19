# 🚀 Deploy DGA App to Vercel - Quick Guide

## ✅ Pre-Deployment Checklist

- [x] Database credentials updated
- [x] Backend vercel.json configured
- [x] Frontend vercel.json configured
- [ ] Vercel CLI installed
- [ ] Vercel account logged in

---

## 📦 Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

---

## 🔐 Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

---

## ⚙️ Step 3: Deploy Backend (API)

```bash
cd backend
vercel --prod
```

**During deployment, Vercel will ask:**
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No (first time) or Yes (if updating)
- **Project name?** → `dga-oversight-backend` (or your choice)
- **Directory?** → `./backend` (or just `.` if already in backend folder)

**After deployment, set environment variables in Vercel Dashboard:**

Go to: https://vercel.com/your-project/settings/environment-variables

Add these variables:
```
DATABASE_URL = postgres://388b5bf2eef86139324844b64ef95cd45730c6417d6ce1481b524429c49e424e:sk_dD9CcduvK45dvrXac89r2@db.prisma.io:5432/postgres?sslmode=require

POSTGRES_URL = postgres://388b5bf2eef86139324844b64ef95cd45730c6417d6ce1481b524429c49e424e:sk_dD9CcduvK45dvrXac89r2@db.prisma.io:5432/postgres?sslmode=require

JWT_SECRET = dga-2025-ultra-secure-jwt-secret-key-change-in-production

CORS_ORIGIN = https://dga-oversight-frontend.vercel.app

NODE_ENV = production
```

**Note:** Save the backend URL (e.g., `https://dga-oversight-backend.vercel.app`)

---

## 🎨 Step 4: Deploy Frontend

### 4.1 Update Frontend API URL

Create `frontend/.env.production`:
```env
VITE_API_URL=https://dga-oversight-backend.vercel.app/api
```

(Replace with your actual backend URL from Step 3)

### 4.2 Deploy Frontend

```bash
cd frontend
vercel --prod
```

**During deployment:**
- **Project name?** → `dga-oversight-frontend`
- **Directory?** → `./frontend` (or just `.` if already in frontend folder)

**Set environment variable in Vercel Dashboard:**
```
VITE_API_URL = https://dga-oversight-backend.vercel.app/api
```

---

## 🔄 Step 5: Update Backend CORS

After frontend is deployed, update backend CORS to include frontend URL:

1. Go to Vercel Dashboard → Backend Project → Settings → Environment Variables
2. Update `CORS_ORIGIN` to your frontend URL:
   ```
   CORS_ORIGIN = https://dga-oversight-frontend.vercel.app
   ```
3. Redeploy backend:
   ```bash
   cd backend
   vercel --prod
   ```

---

## ✅ Step 6: Test Deployment

### Test Backend:
```bash
# Health check
curl https://dga-oversight-backend.vercel.app/health

# API info
curl https://dga-oversight-backend.vercel.app/api
```

### Test Frontend:
1. Visit: `https://dga-oversight-frontend.vercel.app`
2. Try logging in
3. Check dashboard loads

---

## 🎯 Quick Deploy Script

Create `deploy.sh` in root:

```bash
#!/bin/bash

echo "🚀 Deploying DGA Oversight Platform to Vercel..."

# Deploy Backend
echo "📦 Deploying Backend..."
cd backend
vercel --prod
cd ..

# Get backend URL (you'll need to update this manually)
echo "✅ Backend deployed! Update frontend .env.production with backend URL"

# Deploy Frontend
echo "🎨 Deploying Frontend..."
cd frontend
vercel --prod
cd ..

echo "✅ Deployment complete!"
echo "Backend: https://dga-oversight-backend.vercel.app"
echo "Frontend: https://dga-oversight-frontend.vercel.app"
```

---

## 📋 Environment Variables Summary

### Backend (Vercel Dashboard):
```
DATABASE_URL = postgres://388b5bf2eef86139324844b64ef95cd45730c6417d6ce1481b524429c49e424e:sk_dD9CcduvK45dvrXac89r2@db.prisma.io:5432/postgres?sslmode=require
POSTGRES_URL = postgres://388b5bf2eef86139324844b64ef95cd45730c6417d6ce1481b524429c49e424e:sk_dD9CcduvK45dvrXac89r2@db.prisma.io:5432/postgres?sslmode=require
JWT_SECRET = dga-2025-ultra-secure-jwt-secret-key-change-in-production
CORS_ORIGIN = https://dga-oversight-frontend.vercel.app
NODE_ENV = production
```

### Frontend (Vercel Dashboard):
```
VITE_API_URL = https://dga-oversight-backend.vercel.app/api
```

---

## 🔍 Troubleshooting

### Issue: CORS Error
**Solution:** Update `CORS_ORIGIN` in backend environment variables to match frontend URL

### Issue: Database Connection Failed
**Solution:** Verify `DATABASE_URL` is correctly set in Vercel environment variables

### Issue: API 404
**Solution:** Check `vercel.json` routes configuration

### Issue: Build Failed
**Solution:** Check build logs in Vercel dashboard, verify all dependencies

---

## 📊 Post-Deployment URLs

After successful deployment:

- **Backend API:** `https://dga-oversight-backend.vercel.app`
- **Frontend UI:** `https://dga-oversight-frontend.vercel.app`
- **Health Check:** `https://dga-oversight-backend.vercel.app/health`
- **API Docs:** `https://dga-oversight-backend.vercel.app/api/docs`

---

## 🎉 Deployment Complete!

Your DGA Oversight Platform is now live on Vercel! 🚀

**Next Steps:**
1. Test all endpoints
2. Monitor logs in Vercel dashboard
3. Set up custom domain (optional)
4. Configure monitoring and alerts

---

**Ready to deploy?** Run the commands above! ✅

