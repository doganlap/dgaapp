# Production Deployment Script for PowerShell
param(
    [switch]$SkipMigrations
)

Write-Host "🚀 Starting Production Deployment..." -ForegroundColor Cyan

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production file not found!" -ForegroundColor Red
    Write-Host "📝 Please copy .env.production.example to .env.production and configure it" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content .env.production | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Validate required variables
if (-not $env:DATABASE_URL) {
    Write-Host "❌ Error: DATABASE_URL is not set in .env.production" -ForegroundColor Red
    exit 1
}

if (-not $env:JWT_SECRET) {
    Write-Host "❌ Error: JWT_SECRET is not set in .env.production" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables loaded" -ForegroundColor Green

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down

# Build images
Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache

# Run database migrations
if (-not $SkipMigrations) {
    Write-Host "📊 Running database migrations..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate
}

# Start services
Write-Host "🚀 Starting production services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check health
Write-Host "❤️  Checking service health..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "✅ Production deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:$($env:FRONTEND_PORT)" -ForegroundColor Cyan
Write-Host "🔧 Backend:  http://localhost:$($env:BACKEND_PORT)" -ForegroundColor Cyan
Write-Host "❤️  Health:  http://localhost:$($env:BACKEND_PORT)/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml restart" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
