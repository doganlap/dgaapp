# 🌐 Cloudflare .ai Domain Setup for DGA App

## ✅ Cloudflare Now Supports .ai Domains!

You can now use a `.ai` domain with Cloudflare for your DGA Oversight Platform.

---

## 🎯 Benefits of Using Cloudflare

1. **Free SSL/TLS** - Automatic HTTPS
2. **CDN Performance** - Global content delivery
3. **DDoS Protection** - Built-in security
4. **DNS Management** - Easy domain configuration
5. **Page Rules** - Advanced routing options
6. **Analytics** - Traffic insights

---

## 📋 Setup Steps

### Step 1: Purchase .ai Domain

1. Go to a domain registrar that supports .ai domains
2. Purchase your domain (e.g., `dga-oversight.ai` or `dga-platform.ai`)
3. Note: .ai domains are typically more expensive than .com

### Step 2: Add Domain to Cloudflare

1. Sign up/Login to Cloudflare: https://dash.cloudflare.com
2. Click **"Add a Site"**
3. Enter your `.ai` domain
4. Select plan (Free plan works for most use cases)
5. Cloudflare will scan your DNS records

### Step 3: Update Nameservers

1. Cloudflare will provide nameservers (e.g., `ns1.cloudflare.com`)
2. Go to your domain registrar
3. Update nameservers to Cloudflare's nameservers
4. Wait for DNS propagation (usually 24-48 hours, can be faster)

### Step 4: Configure DNS Records

In Cloudflare Dashboard → DNS → Records, add:

#### For Vercel Deployment:

**Backend API:**
```
Type: CNAME
Name: api
Target: cname.vercel-dns.com
Proxy: ✅ (Orange cloud - enabled)
```

**Frontend:**
```
Type: CNAME
Name: @ (or www)
Target: cname.vercel-dns.com
Proxy: ✅ (Orange cloud - enabled)
```

**Or use A Records:**
```
Type: A
Name: @
Target: 76.76.21.21 (Vercel IP - check current)
Proxy: ✅
```

### Step 5: Configure in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain: `dga-oversight.ai`
3. Add subdomain: `api.dga-oversight.ai` (for backend)
4. Vercel will provide DNS records to add

### Step 6: SSL/TLS Settings

In Cloudflare:
1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode: **Full (strict)**
3. SSL certificate will be automatically provisioned

---

## 🔧 Configuration Examples

### Example 1: Single Domain Setup

**Domain:** `dga-oversight.ai`

**DNS Records:**
```
@    CNAME   cname.vercel-dns.com   (Frontend)
api  CNAME   cname.vercel-dns.com   (Backend)
```

**Access:**
- Frontend: `https://dga-oversight.ai`
- Backend: `https://api.dga-oversight.ai`

### Example 2: Subdomain Setup

**Domain:** `dga-oversight.ai`

**DNS Records:**
```
@      CNAME   cname.vercel-dns.com   (Frontend)
www    CNAME   cname.vercel-dns.com   (Frontend)
api    CNAME   cname.vercel-dns.com   (Backend)
```

**Access:**
- Frontend: `https://dga-oversight.ai` or `https://www.dga-oversight.ai`
- Backend: `https://api.dga-oversight.ai`

---

## ⚙️ Update Application Configuration

### Backend CORS Update

Update `backend/src/server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://dga-oversight.ai',
  'https://www.dga-oversight.ai',
  'https://api.dga-oversight.ai'
];
```

### Frontend API URL

Update `frontend/.env.production`:
```env
VITE_API_URL=https://api.dga-oversight.ai/api
```

---

## 🚀 Deployment with Custom Domain

### Option 1: Deploy to Vercel + Cloudflare DNS

1. Deploy to Vercel (as we're doing)
2. Add custom domain in Vercel
3. Configure DNS in Cloudflare
4. SSL automatically handled

### Option 2: Deploy to Cloudflare Pages

1. Connect GitHub repo to Cloudflare Pages
2. Build settings:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
3. Environment variables in Cloudflare
4. Custom domain automatically configured

---

## 📊 Cloudflare vs Vercel

| Feature | Cloudflare | Vercel |
|---------|-----------|--------|
| **.ai Domain Support** | ✅ Yes | ✅ Yes (via DNS) |
| **Free SSL** | ✅ Yes | ✅ Yes |
| **CDN** | ✅ Global | ✅ Global |
| **Serverless Functions** | ⚠️ Workers | ✅ Functions |
| **Git Integration** | ✅ Pages | ✅ Automatic |
| **Analytics** | ✅ Free | ⚠️ Paid |
| **DDoS Protection** | ✅ Built-in | ✅ Built-in |

---

## 🔒 Security Best Practices

1. **Enable Cloudflare WAF** (Web Application Firewall)
2. **Set up Rate Limiting** in Cloudflare
3. **Enable Bot Fight Mode** (free tier)
4. **Configure Page Rules** for security headers
5. **Use Cloudflare Access** for admin areas (optional)

---

## 💰 Cost Considerations

### Cloudflare:
- **Free Plan:** Includes most features
- **Pro Plan:** $20/month (advanced features)
- **.ai Domain:** ~$70-100/year (varies by registrar)

### Vercel:
- **Hobby:** Free (with limitations)
- **Pro:** $20/month per user
- **Custom Domain:** Free (SSL included)

---

## 🎯 Recommended Setup

**For DGA Platform:**

1. **Use Vercel for hosting** (already deploying)
2. **Use Cloudflare for DNS** (better DNS management)
3. **Point .ai domain to Vercel** via CNAME
4. **Get free SSL from both** (Cloudflare + Vercel)

**Best of both worlds!** 🚀

---

## 📝 Quick Setup Commands

### Add Domain to Vercel:
```bash
# In backend directory
vercel domains add api.dga-oversight.ai

# In frontend directory  
vercel domains add dga-oversight.ai
```

### Verify DNS:
```bash
# Check DNS propagation
nslookup dga-oversight.ai
dig dga-oversight.ai
```

---

## 🔗 Useful Links

- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Vercel Domains:** https://vercel.com/dashboard/domains
- **.ai Domain Registrars:** Namecheap, GoDaddy, Google Domains

---

**Ready to set up your .ai domain?** Follow the steps above! 🌐

