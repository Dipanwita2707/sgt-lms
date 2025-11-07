#!/bin/bash

# SGT-LMS Deployment Script
# This script deploys both frontend and backend on EC2 with Nginx

set -e  # Exit on any error

echo "🚀 Starting SGT-LMS Deployment..."

# Configuration
APP_DIR="/var/www/sgt-lms"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

print_info "Step 1: Updating system packages..."
apt-get update && apt-get upgrade -y
print_status "System packages updated"

print_info "Step 2: Installing required packages..."
apt-get install -y nginx curl software-properties-common git unzip

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

print_status "Required packages installed"

print_info "Step 3: Creating application directories..."
mkdir -p $APP_DIR
mkdir -p /var/log/pm2
chown -R $USER:$USER $APP_DIR
chown -R $USER:$USER /var/log/pm2
print_status "Directories created"

print_info "Step 4: Cloning/updating application code..."
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git pull origin production-main
else
    cd /var/www
    git clone https://github.com/Dipanwita2707/sgt-lms.git
    cd sgt-lms
    git checkout production-main
fi
print_status "Application code ready"

print_info "Step 5: Installing backend dependencies..."
cd $BACKEND_DIR
npm ci --only=production
print_status "Backend dependencies installed"

print_info "Step 6: Installing frontend dependencies..."
cd $FRONTEND_DIR
npm ci
print_status "Frontend dependencies installed"

print_info "Step 7: Building React application..."
cd $FRONTEND_DIR
npm run build
print_status "React application built"

print_info "Step 8: Setting up environment files..."
if [ ! -f "$BACKEND_DIR/.env.production" ]; then
    print_warning ".env.production not found in backend directory"
    print_info "Please ensure your .env.production file is uploaded to $BACKEND_DIR/"
fi

print_info "Step 9: Configuring Nginx..."
# Copy nginx configuration
cp $APP_DIR/deployment/nginx/sgt-lms.conf $NGINX_SITES_DIR/
ln -sf $NGINX_SITES_DIR/sgt-lms.conf $NGINX_ENABLED_DIR/

# Remove default nginx site
if [ -f "$NGINX_ENABLED_DIR/default" ]; then
    rm $NGINX_ENABLED_DIR/default
fi

# Test nginx configuration
nginx -t
print_status "Nginx configured"

print_info "Step 10: Setting up SSL certificates..."
# Create self-signed certificates (replace with Let's Encrypt in production)
mkdir -p /etc/ssl/private
mkdir -p /etc/ssl/certs

if [ ! -f "/etc/ssl/certs/sgt-lms.crt" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/sgt-lms.key \
        -out /etc/ssl/certs/sgt-lms.crt \
        -subj "/C=IN/ST=WestBengal/L=Kolkata/O=SGT/OU=LMS/CN=ec2-13-233-135-233.ap-south-1.compute.amazonaws.com"
fi

chmod 600 /etc/ssl/private/sgt-lms.key
chmod 644 /etc/ssl/certs/sgt-lms.crt
print_status "SSL certificates configured"

print_info "Step 11: Setting up PM2 for backend..."
cd $BACKEND_DIR
cp $APP_DIR/deployment/pm2/ecosystem.config.js .

# Stop existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start backend with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_status "Backend started with PM2"

print_info "Step 12: Starting services..."
systemctl enable nginx
systemctl restart nginx

print_status "All services started"

print_info "Step 13: Setting up firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
print_status "Firewall configured"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
echo "- Nginx: $(systemctl is-active nginx)"
echo "- Backend PM2: $(pm2 list | grep -c online || echo 0) processes online"
echo ""
echo "🌐 Access your application:"
echo "- HTTP:  http://ec2-13-233-135-233.ap-south-1.compute.amazonaws.com"
echo "- HTTPS: https://ec2-13-233-135-233.ap-south-1.compute.amazonaws.com"
echo ""
echo "📝 Useful commands:"
echo "- Check backend logs: pm2 logs sgt-lms-backend"
echo "- Check nginx logs: tail -f /var/log/nginx/error.log"
echo "- Restart backend: pm2 restart sgt-lms-backend"
echo "- Restart nginx: systemctl restart nginx"
echo ""
print_warning "Note: Using self-signed SSL certificates. Replace with Let's Encrypt for production!"
print_info "Run: certbot --nginx -d ec2-13-233-135-233.ap-south-1.compute.amazonaws.com"