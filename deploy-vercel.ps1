# PowerShell Script to Deploy DGA App to Vercel
# Run this from the project root directory

Write-Host "🚀 Deploying DGA Oversight Platform to Vercel..." -ForegroundColor Green
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

# Deploy Backend
Write-Host "📦 Step 1: Deploying Backend..." -ForegroundColor Cyan
Set-Location backend
vercel --prod
$backendUrl = Read-Host "Enter your backend URL (e.g., https://dga-oversight-backend.vercel.app)"
Set-Location ..

# Deploy Frontend
Write-Host "🎨 Step 2: Deploying Frontend..." -ForegroundColor Cyan
Set-Location frontend

# Create .env.production if it doesn't exist
if (-not (Test-Path ".env.production")) {
    $envContent = "VITE_API_URL=$backendUrl/api"
    Set-Content -Path ".env.production" -Value $envContent
    Write-Host "✅ Created .env.production with API URL" -ForegroundColor Green
}

vercel --prod
Set-Location ..

Write-Host ""
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update CORS_ORIGIN in backend Vercel environment variables"
Write-Host "2. Test the deployed application"
Write-Host "3. Check Vercel dashboard for logs"
Write-Host ""

