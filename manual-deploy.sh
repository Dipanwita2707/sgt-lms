#!/bin/bash
# SGT-LMS Manual Deployment Script for EC2
# Run this on your EC2 instance after GitHub Actions build completes

set -e
echo "🚀 Starting SGT-LMS deployment..."

# Navigate to app directory
cd /var/www/sgt-lms

# Backup current deployment
echo "📦 Creating backup..."
sudo cp -r . /tmp/backup-$(date +%s) || true

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin production-main

# Update backend dependencies and fix ESM issues
echo "📦 Installing backend dependencies..."
cd backend
rm -rf node_modules package-lock.json
npm install --only=production

# Build frontend
echo "🏗️ Building frontend..."
cd ../frontend
rm -rf node_modules package-lock.json build
npm install
GENERATE_SOURCEMAP=false npm run build

# Fix permissions
echo "🔒 Setting permissions..."
sudo chown -R www-data:www-data build/
sudo chmod -R 755 build/

# Restart backend services with proper configuration
echo "🔄 Restarting backend services..."
cd ../backend

# Stop existing PM2 processes
pm2 delete sgt-lms-backend || true
pm2 delete all || true

# Start with production environment
NODE_ENV=production pm2 start server.js --name sgt-lms-backend
pm2 save

# Reload nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

# Health checks
echo "🧪 Running health checks..."
sleep 5

echo "📊 PM2 Status:"
pm2 status

echo "🌐 Testing API endpoint:"
curl -k https://localhost/api/health || echo "API endpoint test failed"

echo "✅ Deployment completed successfully!"
echo ""
echo "🔍 Verification commands:"
echo "  pm2 logs --lines 20"
echo "  curl -k https://13.233.135.233"
echo "  sudo nginx -t"