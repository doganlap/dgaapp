#!/bin/bash

# Bash Script to Deploy DGA App to Vercel
# Run this from the project root directory

echo "🚀 Deploying DGA Oversight Platform to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy Backend
echo "📦 Step 1: Deploying Backend..."
cd backend
vercel --prod
echo ""
read -p "Enter your backend URL (e.g., https://dga-oversight-backend.vercel.app): " backend_url
cd ..

# Deploy Frontend
echo "🎨 Step 2: Deploying Frontend..."
cd frontend

# Create .env.production if it doesn't exist
if [ ! -f .env.production ]; then
    echo "VITE_API_URL=$backend_url/api" > .env.production
    echo "✅ Created .env.production with API URL"
fi

vercel --prod
cd ..

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update CORS_ORIGIN in backend Vercel environment variables"
echo "2. Test the deployed application"
echo "3. Check Vercel dashboard for logs"
echo ""
