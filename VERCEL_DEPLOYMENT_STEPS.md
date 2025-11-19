# 🚀 Vercel Deployment Steps - Personal Account

## ✅ Step 1: Code Pushed to GitHub
**Repository:** https://github.com/doganlap/dgaapp.git  
**Status:** ✅ **PUSHED**

---

## 🔐 Step 2: Login to Vercel (Personal Account)

Run this command and follow the prompts:
```bash
vercel login
```

**When prompted:**
- Choose: **Email** (not GitHub)
- Enter: `doganlap@gmail.com`
- Complete authentication in browser

---

## 📦 Step 3: Deploy Backend

```bash
cd backend
vercel --prod
```

**During deployment prompts:**
- **Set up and deploy?** → `Y` (Yes)
- **Which scope?** → Select your **personal account** (doganlap)
- **Link to existing project?** → `N` (No - first time)
- **Project name?** → `dga-oversight-backend` (or press Enter for default)
- **Directory?** → `.` (current directory)

**After deployment, save the backend URL** (e.g., `https://dga-oversight-backend.vercel.app`)

---

## ⚙️ Step 4: Set Backend Environment Variables

Go to: **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add these variables:

```
DATABASE_URL = postgres://388b5bf2eef86139324844b64ef95cd45730c6417d6ce1481b524429c49e424e:sk_dD9CcduvK45dvrXac89r2@db.prisma.io:5432/postgres?sslmode=require

POSTGRES_URL = postgres://388b5bf2eef86139324844b64ef95cd45730c6417d6ce1481b524429c49e424e:sk_dD9CcduvK45dvrXac89r2@db.prisma.io:5432/postgres?sslmode=require

JWT_SECRET = dga-2025-ultra-secure-jwt-secret-key-change-in-production

NODE_ENV = production

CORS_ORIGIN = https://dga-oversight-frontend.vercel.app
```

**Note:** Update `CORS_ORIGIN` after frontend is deployed.

---

## 🎨 Step 5: Deploy Frontend

### 5.1 Create Production Environment File

Create `frontend/.env.production`:
```env
VITE_API_URL=https://dga-oversight-backend.vercel.app/api
```

(Replace with your actual backend URL from Step 3)

### 5.2 Deploy Frontend

```bash
cd frontend
vercel --prod
```

**During deployment prompts:**
- **Set up and deploy?** → `Y` (Yes)
- **Which scope?** → Select your **personal account** (doganlap)
- **Link to existing project?** → `N` (No - first time)
- **Project name?** → `dga-oversight-frontend` (or press Enter)
- **Directory?** → `.` (current directory)
- **Framework?** → `Vite` (or Other)
- **Build Command?** → `npm run build`
- **Output Directory?** → `dist`

**Save the frontend URL** (e.g., `https://dga-oversight-frontend.vercel.app`)

---

## ⚙️ Step 6: Set Frontend Environment Variables

Go to: **Vercel Dashboard** → Frontend Project → **Settings** → **Environment Variables**

Add:
```
VITE_API_URL = https://dga-oversight-backend.vercel.app/api
```

(Replace with your actual backend URL)

---

## 🔄 Step 7: Update Backend CORS

1. Go to **Backend Project** → **Settings** → **Environment Variables**
2. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN = https://dga-oversight-frontend.vercel.app
   ```
3. **Redeploy backend:**
   ```bash
   cd backend
   vercel --prod
   ```

---

## ✅ Step 8: Test Production Deployment

### Test Backend:
```bash
# Health check
curl https://dga-oversight-backend.vercel.app/health

# API info
curl https://dga-oversight-backend.vercel.app/api
```

### Test Frontend:
1. Visit: `https://dga-oversight-frontend.vercel.app`
2. Test login
3. Check dashboard

---

## 📋 Quick Command Reference

```bash
# 1. Login to Vercel
vercel login

# 2. Deploy Backend
cd backend
vercel --prod

# 3. Deploy Frontend
cd frontend
vercel --prod

# 4. Check deployment status
vercel ls

# 5. View logs
vercel logs
```

---

## 🎯 Production URLs (After Deployment)

- **Backend API:** `https://dga-oversight-backend.vercel.app`
- **Frontend UI:** `https://dga-oversight-frontend.vercel.app`
- **Health Check:** `https://dga-oversight-backend.vercel.app/health`
- **API Docs:** `https://dga-oversight-backend.vercel.app/api/docs`

---

## 🔒 Security Checklist

- [ ] Environment variables set in Vercel (not in code)
- [ ] CORS_ORIGIN updated with frontend URL
- [ ] Database credentials secure
- [ ] JWT_SECRET is strong
- [ ] .env files not committed (already in .gitignore)

---

## 🚨 Troubleshooting

### Issue: "Account suspended"
**Solution:** You're now using personal account - should work

### Issue: CORS Error
**Solution:** Update `CORS_ORIGIN` in backend environment variables

### Issue: Database Connection Failed
**Solution:** Verify `DATABASE_URL` in Vercel environment variables

### Issue: Build Failed
**Solution:** Check build logs in Vercel dashboard

---

**Ready to deploy!** Follow steps 2-8 above. ✅

