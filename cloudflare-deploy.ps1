# Cloudflare Pages Deployment Script (PowerShell)
# Deploys DGA Oversight Platform to Cloudflare Pages

Write-Host "🚀 Starting Cloudflare Pages Deployment..." -ForegroundColor Cyan

# Check if wrangler is installed
if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Wrangler CLI..." -ForegroundColor Yellow
    npm install -g wrangler
}

# Build frontend
Write-Host "🔨 Building frontend..." -ForegroundColor Cyan
Set-Location frontend
npm install
npm run build
Set-Location ..

# Deploy to Cloudflare Pages
Write-Host "☁️ Deploying to Cloudflare Pages..." -ForegroundColor Cyan
wrangler pages deploy frontend/dist --project-name=dga-oversight-platform

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your app is live at: https://dga-oversight-platform.pages.dev" -ForegroundColor Green

