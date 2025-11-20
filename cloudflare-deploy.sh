#!/bin/bash

# Cloudflare Pages Deployment Script
# Deploys DGA Oversight Platform to Cloudflare Pages

set -e

echo "🚀 Starting Cloudflare Pages Deployment..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Deploy to Cloudflare Pages
echo "☁️ Deploying to Cloudflare Pages..."
wrangler pages deploy frontend/dist --project-name=dga-oversight-platform

echo "✅ Deployment complete!"
echo "🌐 Your app is live at: https://dga-oversight-platform.pages.dev"

