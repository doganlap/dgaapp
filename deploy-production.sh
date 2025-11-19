#!/bin/bash

echo "========================================"
echo "DGA Oversight Platform - Vercel Deployment"
echo "========================================"
echo ""

# Stop any running processes
echo "Step 1: Stopping running processes..."
pkill -f "npm run dev" || true
pkill -f "node src/server.js" || true

# Deploy Backend First
echo ""
echo "Step 2: Deploying Backend to Vercel..."
cd backend

# Create vercel.json for backend
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "src/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "DATABASE_URL": "@dga-database-url",
    "JWT_SECRET": "@dga-jwt-secret",
    "CORS_ORIGIN": "https://dga-oversight-frontend.vercel.app"
  }
}
EOF

# Deploy backend
echo "Deploying backend..."
vercel --prod --yes

# Get backend URL
BACKEND_URL=$(vercel ls | grep -o 'https://[^[:space:]]*.vercel.app' | head -1)
echo "Backend deployed to: $BACKEND_URL"

cd ..

# Deploy Frontend
echo ""
echo "Step 3: Deploying Frontend to Vercel..."
cd frontend

# Create vercel.json for frontend
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "VITE_API_URL": "https://dga-oversight-backend.vercel.app/api"
  }
}
EOF

# Build frontend
echo "Building frontend..."
npm run build

# Deploy frontend
echo "Deploying frontend..."
vercel --prod --yes

# Get frontend URL
FRONTEND_URL=$(vercel ls | grep -o 'https://[^[:space:]]*.vercel.app' | head -1)
echo "Frontend deployed to: $FRONTEND_URL"

cd ..

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""
echo "Next Steps:"
echo "1. Set up environment variables in Vercel dashboard"
echo "2. Configure database connection"
echo "3. Test the deployed application"
echo "4. Monitor performance and logs"
echo ""
echo "For production deployment, update the environment variables:"
echo "- DATABASE_URL: Your production PostgreSQL database"
echo "- JWT_SECRET: A secure random string"
echo "- CORS_ORIGIN: Your frontend URL"
echo "========================================"