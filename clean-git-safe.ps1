# Safer alternative: Clean up files without destroying history
# This keeps your commit history intact

Write-Host "🧹 Git Repository Cleanup (Safe Mode)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Step 1: Removing cached files based on .gitignore..." -ForegroundColor Green
git rm -r --cached .

Write-Host "✅ Cached files removed" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 2: Re-adding only necessary files..." -ForegroundColor Green
git add .

Write-Host "✅ Files re-added" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 3: Showing files that will be committed..." -ForegroundColor Green
Write-Host ""
git status --short
Write-Host ""

$fileCount = (git status --short | Measure-Object -Line).Lines
Write-Host "📊 Total files changed: $fileCount" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "Proceed with commit? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Operation cancelled" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "📋 Step 4: Committing cleanup..." -ForegroundColor Green
git commit -m "chore: Clean repository - remove unnecessary files

- Updated .gitignore to exclude test/debug scripts
- Removed archived documentation files
- Excluded environment files and SSL certificates
- Cleaned up temporary and backup files
- Repository now contains only production code"

Write-Host "✅ Cleanup committed" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 5: Pushing to remote..." -ForegroundColor Green
$currentBranch = git branch --show-current
git push origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed cleanup!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Repository cleaned!" -ForegroundColor Cyan
} else {
    Write-Host "❌ Push failed. You may need to pull first or use --force" -ForegroundColor Red
    Write-Host "💡 Try: git pull --rebase origin $currentBranch" -ForegroundColor Cyan
}
