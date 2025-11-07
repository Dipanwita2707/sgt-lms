#!/bin/bash

# Deploy and configure SGT-LMS properly
set -e

echo "🚀 Starting SGT-LMS deployment..."

# Create deployment directories
sudo mkdir -p /var/www/sgt-lms/{frontend,backend}
sudo chown -R ubuntu:ubuntu /var/www/sgt-lms

# Clone or copy application (assuming files are uploaded)
cd /home/ubuntu
if [ ! -d "sgt-lms" ]; then
    echo "Creating sgt-lms directory..."
    mkdir -p sgt-lms
fi

# Move to deployment directory
sudo cp -r /home/ubuntu/sgt-lms/* /var/www/sgt-lms/ 2>/dev/null || echo "Files will be uploaded separately"

# Install dependencies for backend
cd /var/www/sgt-lms/backend
echo "📦 Installing backend dependencies..."
npm install

# Build frontend
cd /var/www/sgt-lms/frontend
echo "📦 Installing frontend dependencies..."
npm install
echo "🏗️ Building frontend..."
npm run build

# Copy frontend build to web directory
sudo cp -r build/* /var/www/html/

# Create Nginx configuration
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/sgt-lms > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # Frontend - serve static files
    location / {
        root /var/www/html;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Handle socket.io connections
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# HTTPS Configuration (if SSL is available)
server {
    listen 443 ssl http2;
    server_name _;

    # SSL certificate paths (update these if you have proper certificates)
    ssl_certificate /var/www/sgt-lms/ssl/server.crt;
    ssl_certificate_key /var/www/sgt-lms/ssl/server.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;

    # Frontend - serve static files
    location / {
        root /var/www/html;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Handle socket.io connections
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/sgt-lms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Start backend with PM2
cd /var/www/sgt-lms/backend
echo "🚀 Starting backend server..."
sudo pm2 stop all 2>/dev/null || echo "No PM2 processes to stop"
sudo pm2 start server.js --name sgt-lms-backend

# Save PM2 configuration
sudo pm2 save
sudo pm2 startup

echo "✅ Deployment completed!"
echo "🌐 Frontend: http://13.233.135.233/"
echo "🔗 Backend API: http://13.233.135.233/api"
echo "📊 PM2 Status:"
sudo pm2 status