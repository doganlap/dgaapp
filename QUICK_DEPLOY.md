# ⚡ Quick Deploy to Vercel - Personal Account

## ✅ Completed
- [x] Code pushed to GitHub: https://github.com/doganlap/dgaapp.git

## 🔐 Next: Login to Vercel

Run this command in your terminal:
```bash
vercel login
```

**Choose:** Email → Enter: `doganlap@gmail.com` → Complete in browser

## 📦 Then Deploy Backend

```bash
cd backend
vercel --prod
```

**Answer prompts:**
- Set up? → **Y**
- Scope? → **Personal account (doganlap)**
- Link existing? → **N**
- Project name? → **dga-oversight-backend** (or Enter)

## 🎨 Then Deploy Frontend

```bash
cd frontend
vercel --prod
```

**Answer prompts:**
- Set up? → **Y**
- Scope? → **Personal account (doganlap)**
- Link existing? → **N**
- Project name? → **dga-oversight-frontend** (or Enter)
- Framework? → **Vite**
- Build Command? → **npm run build**
- Output Directory? → **dist**

## ⚙️ Set Environment Variables

**In Vercel Dashboard** (after deployment):

### Backend:
```
DATABASE_URL = postgres://388b5bf2eef86139324844b64ef95cd45730c6417d6ce1481b524429c49e424e:sk_dD9CcduvK45dvrXac89r2@db.prisma.io:5432/postgres?sslmode=require
JWT_SECRET = dga-2025-ultra-secure-jwt-secret-key-change-in-production
CORS_ORIGIN = https://dga-oversight-frontend.vercel.app
NODE_ENV = production
```

### Frontend:
```
VITE_API_URL = https://dga-oversight-backend.vercel.app/api
```

---

**Full guide:** See `VERCEL_DEPLOYMENT_STEPS.md`

