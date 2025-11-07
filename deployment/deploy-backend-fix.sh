#!/bin/bash

# Manual deployment script for fixing backend and login issues
echo "🚀 SGT-LMS Backend & Login Fix Deployment"
echo "======================================="

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root or with sudo"
   exit 1
fi

# Navigate to app directory
echo "📁 Navigating to application directory..."
cd /var/www/sgt-lms || { echo "❌ Application directory not found"; exit 1; }

# Update source code
echo "📥 Pulling latest changes from GitHub..."
sudo -u ubuntu git pull origin production-main

# Fix backend dependencies
echo "🔧 Fixing backend dependencies..."
cd backend
sudo -u ubuntu rm -rf node_modules package-lock.json
sudo -u ubuntu npm install --production

# Stop existing PM2 processes
echo "🛑 Stopping existing backend processes..."
sudo -u ubuntu pm2 delete all || true

# Copy ecosystem config if needed
if [ ! -f "ecosystem.config.js" ]; then
    echo "📝 Creating PM2 ecosystem configuration..."
    sudo -u ubuntu tee ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [
    {
      name: 'sgt-lms-backend',
      script: 'server.js',
      instances: 1,
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/pm2/sgt-lms-backend-error.log',
      out_file: '/var/log/pm2/sgt-lms-backend-out.log',
      log_file: '/var/log/pm2/sgt-lms-backend.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
fi

# Start backend with PM2
echo "🚀 Starting backend with PM2..."
sudo -u ubuntu pm2 start ecosystem.config.js --env production
sudo -u ubuntu pm2 save

# Update Nginx configuration
echo "🌐 Updating Nginx configuration..."
cp ../deployment/nginx/sgt-lms.conf /etc/nginx/sites-available/sgt-lms
ln -sf /etc/nginx/sites-available/sgt-lms /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "✅ Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

# Build and deploy frontend
echo "🏗️ Building and deploying frontend..."
cd ../frontend
sudo -u ubuntu npm install
sudo -u ubuntu REACT_APP_API_URL=https://ec2-13-233-135-233.ap-south-1.compute.amazonaws.com/api \
    REACT_APP_BACKEND_URL=https://ec2-13-233-135-233.ap-south-1.compute.amazonaws.com \
    REACT_APP_SOCKET_URL=https://ec2-13-233-135-233.ap-south-1.compute.amazonaws.com \
    GENERATE_SOURCEMAP=false \
    npm run build

# Fix frontend permissions
echo "🔑 Setting frontend permissions..."
chown -R www-data:www-data build/
chmod -R 755 build/

# Display status
echo ""
echo "📊 Deployment Status"
echo "==================="
echo "🔧 Backend Status:"
sudo -u ubuntu pm2 status

echo ""
echo "🌐 Nginx Status:"
systemctl status nginx --no-pager -l

echo ""
echo "🧪 Testing API endpoints:"
echo "Health Check:"
curl -s -k https://localhost/api/health || echo "❌ Health check failed"

echo ""
echo "Auth endpoint test:"
curl -s -k -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}' | head -c 100

echo ""
echo "📋 Recent PM2 logs:"
sudo -u ubuntu pm2 logs --lines 5

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Frontend: https://13.233.135.233"
echo "🔧 API: https://13.233.135.233/api"
echo "🔑 Login: https://13.233.135.233/api/auth/login"

echo ""
echo "🔍 Debug Information:"
echo "- Check PM2 logs: sudo -u ubuntu pm2 logs"
echo "- Check Nginx logs: tail -f /var/log/nginx/error.log"
echo "- Test API health: curl -k https://localhost/api/health"