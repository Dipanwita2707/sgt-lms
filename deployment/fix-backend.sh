#!/bin/bash

# Remote deployment script for fixing backend issues
set -e

echo "🔧 Fixing Backend Dependencies and Restarting Services..."

# Navigate to app directory
cd /var/www/sgt-lms

# Update code
git pull origin main

# Fix backend dependencies
cd backend
echo "📦 Updating backend dependencies..."
npm install --production
npm cache clean --force

# Stop existing PM2 processes
echo "🛑 Stopping existing backend processes..."
pm2 delete all || true

# Start backend with ecosystem config
echo "🚀 Starting backend with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save

# Check backend status
pm2 status

# Build and update frontend
cd ../frontend
echo "🏗️ Building frontend..."
npm install
npm run build

# Fix permissions
echo "🔑 Fixing permissions..."
sudo chown -R www-data:www-data build/
sudo chmod -R 755 build/

# Reload nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://13.233.135.233"
echo "🔧 Backend API: https://13.233.135.233/api"

# Test API endpoint
echo "🧪 Testing API connectivity..."
curl -k https://13.233.135.233/api/health || echo "⚠️ API health check failed"

echo "📋 PM2 Status:"
pm2 status

echo "📋 Recent PM2 Logs:"
pm2 logs --lines 5