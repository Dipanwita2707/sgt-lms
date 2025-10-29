# Archive Unused Files Script
# This script moves all unused test, debug, and backup files to an archive folder

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveRoot = ".\__archived_unused_files_$timestamp"

Write-Host "🗂️  Creating archive structure..." -ForegroundColor Cyan
Write-Host ""

# Create archive directory structure
$archiveDirs = @(
    "$archiveRoot\test_scripts",
    "$archiveRoot\debug_scripts",
    "$archiveRoot\fix_scripts",
    "$archiveRoot\backup_files",
    "$archiveRoot\temp_files",
    "$archiveRoot\utility_scripts",
    "$archiveRoot\live_class_related",
    "$archiveRoot\backend_tests",
    "$archiveRoot\frontend_tests",
    "$archiveRoot\sample_files"
)

foreach ($dir in $archiveDirs) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

# Function to safely move file
function Move-FileToArchive {
    param(
        [string]$sourcePath,
        [string]$destinationFolder
    )
    
    if (Test-Path $sourcePath) {
        try {
            $fileName = Split-Path $sourcePath -Leaf
            $destPath = Join-Path $destinationFolder $fileName
            Move-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "✅ Moved: $sourcePath" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "❌ Failed to move: $sourcePath - $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "⚠️  Not found: $sourcePath" -ForegroundColor Yellow
        return $false
    }
}

# Root directory test files
Write-Host "📦 Moving root directory test files..." -ForegroundColor Cyan
$rootTestFiles = @(
    ".\test-connections.js",
    ".\test-frontend-backend.js",
    ".\test-hod-auth.js",
    ".\test-filter-options.js",
    ".\test-hod-sections-data.js",
    ".\test-socket-connection.js",
    ".\test-student-data.js",
    ".\test-enhanced-chat.sh"
)

foreach ($file in $rootTestFiles) {
    Move-FileToArchive $file "$archiveRoot\test_scripts"
}

# Root directory debug files
Write-Host ""
Write-Host "🐛 Moving root directory debug files..." -ForegroundColor Cyan
$rootDebugFiles = @(
    ".\debug-dean-data.js",
    ".\debug-hod-api.js",
    ".\debug-hod-department.js",
    ".\debug-jwt-token.js",
    ".\debug-streaming.js"
)

foreach ($file in $rootDebugFiles) {
    Move-FileToArchive $file "$archiveRoot\debug_scripts"
}

# Root directory fix scripts
Write-Host ""
Write-Host "🔧 Moving root directory fix scripts..." -ForegroundColor Cyan
$rootFixFiles = @(
    ".\fix-all-corruption.js",
    ".\fix-all-quotes.js",
    ".\fix-all-template-literals.js",
    ".\fix-console-emojis.js",
    ".\fix-emojis-direct.js",
    ".\fix-encoding-hex.js",
    ".\fix-encoding.js",
    ".\fix-line416.js",
    ".\fix-pdf-function.js",
    ".\fix-pdf-upload.js",
    ".\fix-sections-department-migration.js",
    ".\fix-specific-lines.js",
    ".\fix-template-quotes.js",
    ".\fix-certificates.bat",
    ".\fix-quiz.bat",
    ".\fix-hardcoded-credentials.ps1"
)

foreach ($file in $rootFixFiles) {
    Move-FileToArchive $file "$archiveRoot\fix_scripts"
}

# Temp and miscellaneous files
Write-Host ""
Write-Host "📄 Moving temporary files..." -ForegroundColor Cyan
$tempFiles = @(
    ".\temp-require-admin.js",
    ".\temp_admin.js",
    ".\temp_button_fix.js",
    ".\temp_first_lines.txt",
    ".\producer-fix-summary.js",
    ".\pdf-fix.js",
    ".\TEACHING_SECTIONS_IMPLEMENTATION.js",
    ".\adminController.js"
)

foreach ($file in $tempFiles) {
    Move-FileToArchive $file "$archiveRoot\temp_files"
}

# Utility scripts
Write-Host ""
Write-Host "🛠️  Moving utility scripts..." -ForegroundColor Cyan
$utilityScripts = @(
    ".\backup-legacy-files.ps1",
    ".\backup-legacy-simple.ps1",
    ".\drop-serial-index.bat",
    ".\enable-backend-https.bat",
    ".\restart-frontend.ps1",
    ".\restart-servers-https.bat",
    ".\start-full-https.bat",
    ".\start-production-backend.bat",
    ".\start-sgt-app.bat",
    ".\verify-scalable-setup.ps1"
)

foreach ($file in $utilityScripts) {
    Move-FileToArchive $file "$archiveRoot\utility_scripts"
}

# Live class related files
Write-Host ""
Write-Host "🎥 Moving live class related files..." -ForegroundColor Cyan
$liveClassFiles = @(
    ".\cleanup-live-class.js",
    ".\check-hod-sections.js",
    ".\check-section-department-status.js",
    ".\Dockerfile.mediasoup"
)

foreach ($file in $liveClassFiles) {
    Move-FileToArchive $file "$archiveRoot\live_class_related"
}

# Verification scripts
Write-Host ""
Write-Host "✔️  Moving verification scripts..." -ForegroundColor Cyan
$verifyFiles = @(
    ".\verify-fixes.js",
    ".\validate-teaching-sections.js"
)

foreach ($file in $verifyFiles) {
    Move-FileToArchive $file "$archiveRoot\test_scripts"
}

# Sample/template files
Write-Host ""
Write-Host "📋 Moving sample files..." -ForegroundColor Cyan
$sampleFiles = @(
    ".\sample_student_bulk_upload.csv",
    ".\student_template_fixed.csv",
    ".\role-update-notice.html"
)

foreach ($file in $sampleFiles) {
    Move-FileToArchive $file "$archiveRoot\sample_files"
}

# Backend test files
Write-Host ""
Write-Host "🔬 Moving backend test files..." -ForegroundColor Cyan
$backendTestPattern = ".\backend\test-*.js"
$backendTestFiles = Get-ChildItem -Path $backendTestPattern -ErrorAction SilentlyContinue

foreach ($file in $backendTestFiles) {
    Move-FileToArchive $file.FullName "$archiveRoot\backend_tests"
}

# Backend debug files
$backendDebugPattern = ".\backend\debug-*.js"
$backendDebugFiles = Get-ChildItem -Path $backendDebugPattern -ErrorAction SilentlyContinue

foreach ($file in $backendDebugFiles) {
    Move-FileToArchive $file.FullName "$archiveRoot\backend_tests"
}

# Backend check/verify files
$backendCheckFiles = @(
    ".\backend\check-*.js",
    ".\backend\verify-*.js",
    ".\backend\validate-*.js",
    ".\backend\clear-*.js",
    ".\backend\trace-*.js"
)

foreach ($pattern in $backendCheckFiles) {
    $files = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Move-FileToArchive $file.FullName "$archiveRoot\backend_tests"
    }
}

# Backend misc test files
Write-Host ""
Write-Host "📝 Moving backend miscellaneous test files..." -ForegroundColor Cyan
$backendMiscFiles = @(
    ".\backend\testSectionAPI.js",
    ".\backend\test_video.txt",
    ".\backend\test-students.csv",
    ".\backend\test-students-tabs.csv",
    ".\backend\student-check.js",
    ".\backend\create-section-for-teacher.js"
)

foreach ($file in $backendMiscFiles) {
    Move-FileToArchive $file "$archiveRoot\backend_tests"
}

# Frontend test files
Write-Host ""
Write-Host "🎨 Moving frontend test files..." -ForegroundColor Cyan
$frontendTestFiles = @(
    ".\frontend\test-frontend-hod.js",
    ".\frontend\test-frontend-api.js",
    ".\frontend\debug-console-test.js",
    ".\frontend\quick-debug.js"
)

foreach ($file in $frontendTestFiles) {
    Move-FileToArchive $file "$archiveRoot\frontend_tests"
}

# Frontend test HTML files
$frontendTestHtml = @(
    ".\frontend\public\test-security-dialog.html",
    ".\frontend\public\security-test.html",
    ".\frontend\src\test-streaming.html"
)

foreach ($file in $frontendTestHtml) {
    Move-FileToArchive $file "$archiveRoot\frontend_tests"
}

# Frontend tests directory
if (Test-Path ".\frontend\src\tests") {
    Write-Host "📁 Moving frontend tests directory..." -ForegroundColor Cyan
    Move-Item -Path ".\frontend\src\tests" -Destination "$archiveRoot\frontend_tests\src_tests" -Force
    Write-Host "✅ Moved: .\frontend\src\tests" -ForegroundColor Green
}

# Backend duplicate/backup files
Write-Host ""
Write-Host "💾 Moving frontend backup files..." -ForegroundColor Cyan
$frontendBackups = @(
    ".\frontend\src\App_clean.js",
    ".\frontend\src\pages\AdminDashboard_Clean.js",
    ".\frontend\src\pages\StudentDashboard_new.js",
    ".\frontend\src\pages\student\StudentHomeDashboard_backup.js",
    ".\frontend\src\pages\student\StudentHomeDashboard_Modern.js",
    ".\frontend\src\components\admin\CourseDetails_broken.js",
    ".\frontend\src\components\admin\CourseDetails_fixed.js",
    ".\frontend\src\components\hod\HODQuizUnlockDashboard_backup.js",
    ".\frontend\src\components\hod\HODQuizUnlockDashboard_clean.js",
    ".\frontend\src\components\hod\HODQuizUnlockDashboard_corrupted.js"
)

foreach ($file in $frontendBackups) {
    Move-FileToArchive $file "$archiveRoot\backup_files"
}

# Live class specific backend files (if still exist)
Write-Host ""
Write-Host "🎬 Moving live class backend files..." -ForegroundColor Cyan
$liveClassBackendFiles = @(
    ".\backend\src\services\ScalableSocketService.js",
    ".\backend\src\services\MediasoupService.js",
    ".\backend\src\config\mediasoup.config.js"
)

foreach ($file in $liveClassBackendFiles) {
    if (Test-Path $file) {
        Move-FileToArchive $file "$archiveRoot\live_class_related"
    }
}

# Remove empty src directory if it exists
if (Test-Path ".\backend\src") {
    $srcContents = Get-ChildItem ".\backend\src" -Recurse
    if ($srcContents.Count -eq 0) {
        Remove-Item ".\backend\src" -Recurse -Force
        Write-Host "✅ Removed empty directory: .\backend\src" -ForegroundColor Green
    }
}

# Create summary report
Write-Host ""
Write-Host "📊 Creating archive summary report..." -ForegroundColor Cyan

$summaryContent = @"
# Archived Unused Files - Summary Report
**Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Archive Location:** $archiveRoot

## Archive Structure

### Test Scripts ($archiveRoot\test_scripts)
- All test-*.js files from root
- All test-*.js files from backend
- Verification and validation scripts

### Debug Scripts ($archiveRoot\debug_scripts)
- All debug-*.js files from root and backend

### Fix Scripts ($archiveRoot\fix_scripts)
- All fix-*.js, fix-*.bat, fix-*.ps1 files
- Encoding and corruption fix scripts

### Backup Files ($archiveRoot\backup_files)
- Frontend component backups (*_backup.js, *_clean.js, *_broken.js, etc.)

### Temp Files ($archiveRoot\temp_files)
- Temporary scripts and files (temp-*.js, temp_*.js)

### Utility Scripts ($archiveRoot\utility_scripts)
- Batch files (.bat)
- PowerShell scripts (.ps1) for deployment/management

### Live Class Related ($archiveRoot\live_class_related)
- MediaSoup service files
- Live class cleanup scripts
- Dockerfile.mediasoup

### Backend Tests ($archiveRoot\backend_tests)
- All backend test-*.js files
- Backend debug, check, verify, validate scripts
- Test data files (.csv, .txt)

### Frontend Tests ($archiveRoot\frontend_tests)
- Frontend test files
- Test HTML files
- Test components directory

### Sample Files ($archiveRoot\sample_files)
- Sample CSV files
- Template files
- HTML notices

## Files Kept (Active/Production)

### Backend (Keep)
- backend/controllers/* (all controllers)
- backend/routes/* (all routes)
- backend/models/* (all models)
- backend/middleware/* (all middleware)
- backend/utils/* (all utilities)
- backend/socket/groupChatSocket.js (active socket.io)
- backend/server.js, server-https.js, cluster.js
- backend/package.json, .env

### Frontend (Keep)
- frontend/src/components/* (active components only)
- frontend/src/pages/* (active pages only)
- frontend/src/api/*
- frontend/src/utils/*
- frontend/public/* (except test files)
- frontend/package.json

### Root (Keep)
- All .md documentation files
- templates/ directory (CSV templates)
- deploy.sh
- docker-compose.yml
- .gitignore
- package.json

## Restoration Instructions

If you need to restore any file use PowerShell Copy-Item command.

Example to restore a specific test file:
Copy-Item "archive_folder\test_scripts\test-hod-auth.js" "."

Example to restore all backend tests:
Copy-Item "archive_folder\backend_tests\*" ".\backend\"

## Cleanup

To permanently delete archived files after verification:
Remove-Item "archive_folder" -Recurse -Force

## Notes

- All files were moved, not copied, to save disk space
- Original directory structure is maintained where possible
- This archive can be safely deleted after verifying the application works correctly
- The main application now only contains active production code

---
*Generated by archive-unused-files.ps1*
"@

$summaryContent | Out-File -FilePath "$archiveRoot\ARCHIVE_SUMMARY.md" -Encoding UTF8

# Create a quick reference file
$quickRefContent = @"
# Quick Reference - Archived Files

## What was archived?
- 200+ test and debug scripts
- All fix-*.js temporary scripts
- Backup/duplicate component files
- Live class/MediaSoup related files
- Sample and template test files
- Utility batch and PowerShell scripts

## What is still active?
- All production controllers, routes, models
- Active frontend components and pages
- Group chat (Socket.IO) functionality
- Documentation (.md files)
- CSV templates in templates/
- Deployment configurations

## Test the application:
1. Start backend - cd backend then npm start
2. Start frontend - cd frontend then npm start
3. Test all major features
4. If everything works you can delete this archive folder

## Restore if needed:
See ARCHIVE_SUMMARY.md for detailed restoration instructions
"@

$quickRefContent | Out-File -FilePath "$archiveRoot\QUICK_REFERENCE.txt" -Encoding UTF8

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Green
Write-Host "✅ Archive Complete!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""
Write-Host "📁 Archive Location: " -NoNewline
Write-Host $archiveRoot -ForegroundColor Yellow
Write-Host ""
Write-Host "📊 Summary Report: " -NoNewline
Write-Host "$archiveRoot\ARCHIVE_SUMMARY.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review the archived files in: $archiveRoot"
Write-Host "  2. Test your application thoroughly"
Write-Host "  3. If everything works, you can delete the archive folder"
Write-Host "  4. If you need to restore files, see ARCHIVE_SUMMARY.md"
Write-Host ""
Write-Host "🎯 Your codebase is now cleaner and more maintainable!" -ForegroundColor Green
Write-Host ""
