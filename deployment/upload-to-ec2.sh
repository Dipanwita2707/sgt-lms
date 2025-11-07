#!/bin/bash

# Upload deployment files to EC2 instance
# Run this script from your local Windows machine

set -e

# Configuration
EC2_HOST="ec2-13-233-135-233.ap-south-1.compute.amazonaws.com"
EC2_USER="ubuntu"
KEY_FILE="sgt-lmskey.pem"
REMOTE_DIR="/tmp/sgt-lms-deployment"

echo "📤 Uploading deployment files to EC2..."

# Create remote directory
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_HOST" "mkdir -p $REMOTE_DIR"

# Upload deployment scripts
echo "Uploading deployment scripts..."
scp -i "$KEY_FILE" -r deployment/ "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"

# Upload environment files
echo "Uploading environment files..."
scp -i "$KEY_FILE" backend/.env.production "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"
scp -i "$KEY_FILE" frontend/.env.production "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"

# Make scripts executable
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_HOST" "
    chmod +x $REMOTE_DIR/deployment/deploy.sh
    chmod +x $REMOTE_DIR/deployment/setup-ssl.sh
"

echo "✅ Files uploaded successfully!"
echo ""
echo "🚀 Next steps:"
echo "1. SSH to your server: ssh -i $KEY_FILE $EC2_USER@$EC2_HOST"
echo "2. Run deployment: sudo $REMOTE_DIR/deployment/deploy.sh"
echo "3. Setup SSL (optional): sudo $REMOTE_DIR/deployment/setup-ssl.sh"