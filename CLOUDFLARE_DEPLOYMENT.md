# Cloudflare Pages Deployment Guide

## 🚀 Quick Deploy to Cloudflare Pages

### Prerequisites
1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. Cloudflare API token with Pages permissions

### Method 1: Using Wrangler CLI

```bash
# Install Wrangler (if not installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Deploy to Cloudflare Pages
wrangler pages deploy frontend/dist --project-name=dga-oversight-platform
```

### Method 2: Using GitHub Actions (Automatic)

1. **Set up Cloudflare Secrets in GitHub:**
   - Go to GitHub Repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
     - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID
     - `VITE_API_URL`: Your backend API URL

2. **Push to main branch:**
   ```bash
   git push origin main
   ```
   - GitHub Actions will automatically deploy to Cloudflare Pages

### Method 3: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **Create a project**
3. Connect your GitHub repository
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`
5. Add environment variables:
   - `VITE_API_URL`: Your backend API URL
6. Click **Save and Deploy**

## 📋 Configuration Files

- `wrangler.toml` - Wrangler configuration
- `.cloudflare/pages.json` - Cloudflare Pages configuration
- `.github/workflows/cloudflare-pages.yml` - GitHub Actions workflow

## 🌐 Custom Domain Setup

1. In Cloudflare Pages dashboard, go to your project
2. Navigate to **Custom domains**
3. Add your custom domain (e.g., `dga-app.pages.dev`)
4. Follow DNS configuration instructions

## 🔧 Environment Variables

Set these in Cloudflare Pages dashboard:

- `VITE_API_URL`: Backend API URL (e.g., `https://api.yourdomain.com`)
- `NODE_ENV`: `production`

## 📝 Notes

- Frontend is deployed to Cloudflare Pages
- Backend should be deployed separately (Vercel, Railway, or your own server)
- Update `VITE_API_URL` to point to your backend API

## ✅ Deployment Status

After deployment, your app will be available at:
- **Cloudflare Pages URL**: `https://dga-oversight-platform.pages.dev`
- **Custom Domain** (if configured): Your custom domain

