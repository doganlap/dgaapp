#!/bin/bash

# Production Deployment Script
set -e

echo "🚀 Starting Production Deployment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "📝 Please copy .env.production.example to .env.production and configure it"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set in .env.production"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET is not set in .env.production"
    exit 1
fi

echo "✅ Environment variables loaded"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# Start services
echo "🚀 Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo "❤️  Checking service health..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Production deployment complete!"
echo ""
echo "🌐 Frontend: http://localhost:${FRONTEND_PORT:-80}"
echo "🔧 Backend:  http://localhost:${BACKEND_PORT:-5000}"
echo "❤️  Health:  http://localhost:${BACKEND_PORT:-5000}/health"
echo ""
echo "📋 Useful commands:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo "  docker-compose -f docker-compose.prod.yml restart"
echo "  docker-compose -f docker-compose.prod.yml down"
