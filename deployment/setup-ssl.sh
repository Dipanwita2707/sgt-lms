#!/bin/bash

# SSL Certificate Setup with Let's Encrypt
# Run this after the main deployment is complete

set -e

echo "🔐 Setting up SSL certificates with Let's Encrypt..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (use sudo)"
    exit 1
fi

print_info "Installing Certbot..."
apt-get update
apt-get install -y certbot python3-certbot-nginx

print_info "Obtaining SSL certificate..."
certbot --nginx \
    -d ec2-13-233-135-233.ap-south-1.compute.amazonaws.com \
    --non-interactive \
    --agree-tos \
    --email sourav11092002@gmail.com \
    --redirect

print_info "Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

print_status "SSL certificates configured with auto-renewal"

print_info "Testing SSL configuration..."
nginx -t && systemctl reload nginx

echo ""
echo "🔐 SSL Setup Complete!"
echo "Your site now has a valid SSL certificate from Let's Encrypt"
echo "Auto-renewal is set up to run daily at 12:00 PM"