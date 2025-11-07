# SGT-LMS Build and Upload Script for Windows
# Run this script from PowerShell

param(
    [switch]$SkipBuild,
    [switch]$UploadOnly
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 SGT-LMS Deployment Preparation" -ForegroundColor Green

# Configuration
$EC2_HOST = "ec2-13-233-135-233.ap-south-1.compute.amazonaws.com"
$EC2_USER = "ubuntu"
$KEY_FILE = "sgt-lmskey.pem"

function Write-Status {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

if (-not $UploadOnly) {
    Write-Info "Step 1: Building React application..."
    Set-Location "frontend"
    npm run build
    Set-Location ".."
    Write-Status "React application built"

    Write-Info "Step 2: Copying production environment files..."
    Copy-Item "backend\.env.production" "deployment\env\" -Force
    Copy-Item "frontend\.env.production" "deployment\env\" -Force
    Write-Status "Environment files prepared"
}

Write-Info "Step 3: Creating deployment package..."
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "sgt-lms-deploy-$timestamp.zip"

# Create zip package
Compress-Archive -Path @(
    "backend\*",
    "frontend\build\*",
    "deployment\*"
) -DestinationPath $packageName -Force

Write-Status "Deployment package created: $packageName"

Write-Info "Step 4: Uploading to EC2..."

# Upload via SCP
Write-Host "Uploading deployment package..." -ForegroundColor Yellow
& scp -i $KEY_FILE $packageName "$($EC2_USER)@$($EC2_HOST):/tmp/"

# SSH and extract
Write-Host "Extracting on server..." -ForegroundColor Yellow
& ssh -i $KEY_FILE "$($EC2_USER)@$($EC2_HOST)" @"
    cd /tmp
    sudo mkdir -p /var/www/sgt-lms
    sudo unzip -o $packageName -d /var/www/sgt-lms/
    sudo chown -R ubuntu:ubuntu /var/www/sgt-lms/
    chmod +x /var/www/sgt-lms/deployment/deploy.sh
    chmod +x /var/www/sgt-lms/deployment/setup-ssl.sh
"@

Write-Status "Upload completed successfully!"

Write-Host ""
Write-Host "🎉 Deployment package ready on server!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH to server: ssh -i $KEY_FILE $EC2_USER@$EC2_HOST"
Write-Host "2. Run deployment: sudo /var/www/sgt-lms/deployment/deploy.sh"
Write-Host "3. Setup SSL (optional): sudo /var/www/sgt-lms/deployment/setup-ssl.sh"

# Cleanup
Remove-Item $packageName -Force
Write-Info "Local package cleaned up"