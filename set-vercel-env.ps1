# PowerShell script to set Vercel environment variables
# Run this from backend directory

Write-Host "Setting Vercel Environment Variables..." -ForegroundColor Green

# Set DATABASE_URL
$dbUrl = "postgres://388b5bf2eef86139324844b64ef95cd45730c6417d6ce1481b524429c49e424e:sk_dD9CcduvK45dvrXac89r2@db.prisma.io:5432/postgres?sslmode=require"
echo $dbUrl | vercel env add DATABASE_URL production

# Set JWT_SECRET
$jwtSecret = "dga-2025-ultra-secure-jwt-secret-key-change-in-production"
echo $jwtSecret | vercel env add JWT_SECRET production

# Set NODE_ENV
echo "production" | vercel env add NODE_ENV production

# Set CORS_ORIGIN (will update after frontend deployment)
$corsOrigin = "https://frontend-kfyu2y08i-ahmet-68c9edef.vercel.app"
echo $corsOrigin | vercel env add CORS_ORIGIN production

Write-Host "✅ Environment variables set!" -ForegroundColor Green

