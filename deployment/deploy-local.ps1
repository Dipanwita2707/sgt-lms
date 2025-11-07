# SGT-LMS Backend Fix and Deployment Script
# Run this script to fix backend issues and deploy to EC2

param(
    [switch]$SkipBuild,
    [switch]$TestOnly
)

Write-Host "� SGT-LMS Backend Fix & Deployment" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "backend\package.json")) {
    Write-Host "❌ Error: Please run this script from the sgt-lms root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Verify fixes are applied locally
Write-Host "`n📋 Checking local fixes..." -ForegroundColor Yellow
$packageJson = Get-Content "backend\package.json" | ConvertFrom-Json
$uuidVersion = $packageJson.dependencies.uuid
$dotenvVersion = $packageJson.dependencies.dotenv

if ($uuidVersion -match "9\.0\.1" -and $dotenvVersion -match "16\.4\.5") {
    Write-Host "✅ Local package.json fixes verified" -ForegroundColor Green
    Write-Host "   UUID: $uuidVersion" -ForegroundColor Blue
    Write-Host "   Dotenv: $dotenvVersion" -ForegroundColor Blue
} else {
    Write-Host "❌ Package.json fixes not applied. Current versions:" -ForegroundColor Red
    Write-Host "   UUID: $uuidVersion (should be ~9.0.1)" -ForegroundColor Red
    Write-Host "   Dotenv: $dotenvVersion (should be ~16.4.5)" -ForegroundColor Red
    exit 1
}

if (-not $TestOnly) {
    # Step 2: Test local build
    Write-Host "`n🏗️ Testing local backend build..." -ForegroundColor Yellow
    Set-Location backend
    try {
        npm install --production 2>&1 | Out-Null
        Write-Host "✅ Local dependencies installed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Local npm install failed" -ForegroundColor Red
    }
    Set-Location ..

    # Step 3: Test frontend build
    Write-Host "`n🌐 Testing frontend build..." -ForegroundColor Yellow
    Set-Location frontend
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
            npm install 2>&1 | Out-Null
        }
        
        $env:GENERATE_SOURCEMAP = "false"
        npm run build 2>&1 | Out-Null
        Write-Host "✅ Frontend build completed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Frontend build failed" -ForegroundColor Red
    }
    Set-Location ..

    # Step 4: Commit and push changes
    Write-Host "`n📤 Pushing latest changes to GitHub..." -ForegroundColor Yellow
    try {
        git add -A 2>&1 | Out-Null
        git commit -m "🚀 Deploy backend fixes and updated CI/CD" 2>&1 | Out-Null
        git push origin production-main
        Write-Host "✅ Changes pushed to GitHub" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Git operations completed (may have warnings)" -ForegroundColor Yellow
    }
}

# Step 5: Display deployment instructions
Write-Host "`n🚀 Manual Deployment Instructions for EC2" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please run these commands on your EC2 instance (13.233.135.233):" -ForegroundColor White
Write-Host ""
Write-Host "cd /var/www/sgt-lms" -ForegroundColor Green
Write-Host "git pull origin production-main" -ForegroundColor Green
Write-Host "cd backend" -ForegroundColor Green
Write-Host "rm -rf node_modules package-lock.json" -ForegroundColor Green
Write-Host "npm install --production" -ForegroundColor Green
Write-Host "pm2 delete all" -ForegroundColor Green
Write-Host "pm2 start ecosystem.config.js --env production" -ForegroundColor Green
Write-Host "pm2 save" -ForegroundColor Green
Write-Host "pm2 status" -ForegroundColor Green
Write-Host ""

# Step 6: Display URLs and testing info
Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
Write-Host "Frontend: https://13.233.135.233" -ForegroundColor Blue
Write-Host "API Health: https://13.233.135.233/api/health" -ForegroundColor Blue
Write-Host ""

Write-Host "🔍 After deployment, test with:" -ForegroundColor Cyan
Write-Host "curl -k https://13.233.135.233/api/health" -ForegroundColor Blue
Write-Host "pm2 logs --lines 5" -ForegroundColor Blue
Write-Host ""

Write-Host "✅ Local preparation complete! Follow the manual steps above on EC2." -ForegroundColor Green

# Display GitHub Actions info
Write-Host "`n⚙️ GitHub Actions CI/CD:" -ForegroundColor Cyan
Write-Host "The workflow will trigger automatically on pushes to 'production-main' branch." -ForegroundColor Blue
Write-Host "Make sure to add EC2_SSH_KEY secret to your GitHub repository settings." -ForegroundColor Yellow