# Script to clean Git history and push only required files
# WARNING: This will rewrite git history - make sure you have a backup!

Write-Host "🧹 Git History Cleaner" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Confirm action
Write-Host "⚠️  WARNING: This will:" -ForegroundColor Yellow
Write-Host "   1. Remove all commit history" -ForegroundColor Yellow
Write-Host "   2. Create a fresh initial commit" -ForegroundColor Yellow
Write-Host "   3. Force push to remote repository" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Operation cancelled" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "📋 Step 1: Updating .gitignore..." -ForegroundColor Green

# The .gitignore has already been updated

Write-Host "✅ .gitignore updated" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 2: Removing all files from git tracking..." -ForegroundColor Green
git rm -r --cached .
Write-Host "✅ All files removed from tracking" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 3: Re-adding files based on .gitignore..." -ForegroundColor Green
git add .
Write-Host "✅ Files re-added" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 4: Checking what will be committed..." -ForegroundColor Green
Write-Host "Files to be committed:" -ForegroundColor Cyan
git status --short
Write-Host ""

$fileCount = (git status --short | Measure-Object -Line).Lines
Write-Host "📊 Total files to commit: $fileCount" -ForegroundColor Cyan
Write-Host ""

$confirmCommit = Read-Host "Proceed with commit? (yes/no)"
if ($confirmCommit -ne "yes") {
    Write-Host "❌ Operation cancelled" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "📋 Step 5: Creating backup of current branch..." -ForegroundColor Green
$currentBranch = git branch --show-current
git branch backup-before-clean-$(Get-Date -Format 'yyyyMMdd-HHmmss')
Write-Host "✅ Backup branch created" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 6: Creating clean commit..." -ForegroundColor Green
git commit -m "Clean initial commit - SGT LMS System

- Backend: Node.js/Express REST API
- Frontend: React application
- Database: MongoDB
- Features: Role-based access, Analytics, Quiz system, Certificates, Group Chat
- Removed: HTTPS support, MediaSoup live class, Redis clustering
- Archive: Moved unused files to __archived_unused_files folder"

Write-Host "✅ Clean commit created" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 7: Checking remote repository..." -ForegroundColor Green
$remoteUrl = git remote get-url origin
Write-Host "Remote: $remoteUrl" -ForegroundColor Cyan
Write-Host ""

$confirmPush = Read-Host "Force push to remote? This will OVERWRITE remote history! (yes/no)"
if ($confirmPush -ne "yes") {
    Write-Host "❌ Push cancelled. Your local changes are committed but not pushed." -ForegroundColor Yellow
    Write-Host "💡 You can manually push later with: git push -u origin main --force" -ForegroundColor Cyan
    exit
}

Write-Host ""
Write-Host "📋 Step 8: Force pushing to remote..." -ForegroundColor Green
git push -u origin $currentBranch --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed clean repository!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Git history has been cleaned!" -ForegroundColor Cyan
    Write-Host "📊 Repository now contains only essential files" -ForegroundColor Cyan
} else {
    Write-Host "❌ Push failed. Check your network connection and credentials." -ForegroundColor Red
    Write-Host "💡 You can try again with: git push -u origin $currentBranch --force" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📝 Note: Archived files are in __archived_unused_files folder (not in git)" -ForegroundColor Yellow
