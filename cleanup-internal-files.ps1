# Cleanup Internal Unused Files Script
# Moves unused utility scripts, test files, and duplicates to archive

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveFolder = ".\__archived_unused_files_$timestamp\internal_cleanup"

Write-Host "Creating internal cleanup archive..." -ForegroundColor Cyan

# Create archive structure
New-Item -ItemType Directory -Path "$archiveFolder\backend_utilities" -Force | Out-Null
New-Item -ItemType Directory -Path "$archiveFolder\backend_duplicates" -Force | Out-Null
New-Item -ItemType Directory -Path "$archiveFolder\backend_csv_files" -Force | Out-Null
New-Item -ItemType Directory -Path "$archiveFolder\backend_ssl" -Force | Out-Null
New-Item -ItemType Directory -Path "$archiveFolder\frontend_utilities" -Force | Out-Null
New-Item -ItemType Directory -Path "$archiveFolder\frontend_ssl" -Force | Out-Null

# Function to move file safely
function Move-ToArchive {
    param($source, $dest)
    if (Test-Path $source) {
        try {
            Move-Item -Path $source -Destination $dest -Force
            Write-Host "[OK] Moved: $source" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "[ERROR] Failed: $source" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "[SKIP] Not found: $source" -ForegroundColor Yellow
        return $false
    }
}

# ========================================
# BACKEND CLEANUP
# ========================================

Write-Host "`nCleaning Backend Directory..." -ForegroundColor Cyan

# Assignment/Migration Scripts
Write-Host "`n[1/6] Moving assignment/migration scripts..." -ForegroundColor Yellow
$backendAssignScripts = @(
    ".\backend\assign-cc-as-teacher.js",
    ".\backend\assign-cosmo-students.js",
    ".\backend\assign-cosmo2.js",
    ".\backend\assign-missing-course.js",
    ".\backend\assign-section-to-teacher.js",
    ".\backend\assign-sections-to-department.js",
    ".\backend\assign-students-to-sections.js",
    ".\backend\assign-teacher-to-section.js",
    ".\backend\migrate-hod-departments.js",
    ".\backend\migrate-multi-role.js",
    ".\backend\remove-invalid-assignments.js"
)
foreach ($file in $backendAssignScripts) {
    Move-ToArchive $file "$archiveFolder\backend_utilities\"
}

# Fix Scripts
Write-Host "`n[2/6] Moving fix scripts..." -ForegroundColor Yellow
$backendFixScripts = @(
    ".\backend\fix-admin-assignments.js",
    ".\backend\fix-all-broken-quiz-pool-links.js",
    ".\backend\fix-all-remaining-broken-attempts.js",
    ".\backend\fix-assignment.js",
    ".\backend\fix-astrophysics-section.js",
    ".\backend\fix-cc-violations.js",
    ".\backend\fix-course-data.js",
    ".\backend\fix-duplicate-regnos.js",
    ".\backend\fix-existing-assignments.js",
    ".\backend\fix-file-messages.js",
    ".\backend\fix-fullscreen-penalties.js",
    ".\backend\fix-hod-primary-role.js",
    ".\backend\fix-inflated-watch-times.js",
    ".\backend\fix-neurology-duration.js",
    ".\backend\fix-problematic-students.js",
    ".\backend\fix-quiz-csv.js",
    ".\backend\fix-quiz-pool-links.js",
    ".\backend\fix-section-courses.js",
    ".\backend\fix-section-department.js",
    ".\backend\fix-section-students.js",
    ".\backend\fix-student-assignment.js",
    ".\backend\fix-student-data-integrity.js",
    ".\backend\fix-student-video-access.js",
    ".\backend\fix-teacher-student-relationship.js",
    ".\backend\fix-unit-quizpool-bidirectional-links.js",
    ".\backend\fix-unit-system.js",
    ".\backend\fix-user-active-status.js",
    ".\backend\fix-video-durations.js",
    ".\backend\fix-watch-history.js",
    ".\backend\quick-fix-duration.js",
    ".\backend\manual-fix-duplicates.js"
)
foreach ($file in $backendFixScripts) {
    Move-ToArchive $file "$archiveFolder\backend_utilities\"
}

# Debug/Diagnose/Find Scripts
Write-Host "`n[3/6] Moving debug/diagnose/find scripts..." -ForegroundColor Yellow
$backendDebugScripts = @(
    ".\backend\debugTeacherAssignment.js",
    ".\backend\diagnose-permanent-issue.js",
    ".\backend\diagnose-teaching-data.js",
    ".\backend\find-admin-creds.js",
    ".\backend\find-astrochemistry.js",
    ".\backend\find-c000008-attempts-fixed.js",
    ".\backend\find-c000008-attempts.js",
    ".\backend\find-megha.js",
    ".\backend\find-munmun-sections.js",
    ".\backend\find-quiz-pools-with-attempts.js",
    ".\backend\find-similar-courses.js",
    ".\backend\investigate-student-video-access.js"
)
foreach ($file in $backendDebugScripts) {
    Move-ToArchive $file "$archiveFolder\backend_utilities\"
}

# Enable/Generate/Test Scripts
Write-Host "`n[4/6] Moving enable/generate/test scripts..." -ForegroundColor Yellow
$backendMiscScripts = @(
    ".\backend\enable-megha-announcement.js",
    ".\backend\enable-teacher-announcement.js",
    ".\backend\enable-teacher-direct.js",
    ".\backend\generate-ssl-ip.js",
    ".\backend\generate-ssl-simple.js",
    ".\backend\generate-student-token.js",
    ".\backend\generate-token.js",
    ".\backend\get-teacher-sections.js",
    ".\backend\list-admin-overrides.js",
    ".\backend\list-recent-messages.js",
    ".\backend\quick-check-sections.js",
    ".\backend\quick-check.js",
    ".\backend\restart-mediasoup.js",
    ".\backend\simple-video-unlock-test.js",
    ".\backend\simulate-student-api-call.js",
    ".\backend\update-playback-rates.js",
    ".\backend\add-deadline-to-astrophysics.js",
    ".\backend\cleandb.js"
)
foreach ($file in $backendMiscScripts) {
    Move-ToArchive $file "$archiveFolder\backend_utilities\"
}

# Test/Announcement Files
Write-Host "`n[5/6] Moving test files..." -ForegroundColor Yellow
$backendTestFiles = @(
    ".\backend\announcement-test-instructions.js",
    ".\backend\announcement-tester.html",
    ".\backend\announcement.test.js",
    ".\backend\final-verification-test.js",
    ".\backend\test-announcements.ps1",
    ".\backend\test-quiz-api.ps1",
    ".\backend\test-quiz-endpoints.http",
    ".\backend\test-quiz-pool-questions.http",
    ".\backend\test-unit-quiz.http"
)
foreach ($file in $backendTestFiles) {
    Move-ToArchive $file "$archiveFolder\backend_utilities\"
}

# CSV Files
Write-Host "`n[6/6] Moving CSV and other files..." -ForegroundColor Yellow
$backendCSVFiles = @(
    ".\backend\fixed_india_quiz.csv",
    ".\backend\fixed_output.csv",
    ".\backend\fixed_quiz_template.csv",
    ".\backend\quiz_template.csv",
    ".\backend\sample_quiz.csv"
)
foreach ($file in $backendCSVFiles) {
    Move-ToArchive $file "$archiveFolder\backend_csv_files\"
}

# SSL Certificates and Installers
Write-Host "`nMoving SSL certificates and installers..." -ForegroundColor Yellow
$backendSSLFiles = @(
    ".\backend\localhost+3-key.pem",
    ".\backend\localhost+3.pem",
    ".\backend\Redis-x64-3.0.504.msi"
)
foreach ($file in $backendSSLFiles) {
    Move-ToArchive $file "$archiveFolder\backend_ssl\"
}

# Duplicate/Backup Controllers
Write-Host "`nMoving duplicate controller files..." -ForegroundColor Yellow
$backendDuplicates = @(
    ".\backend\controllers\adminController_new.js",
    ".\backend\controllers\readingMaterialController_fixed.js",
    ".\backend\controllers\sectionController.js.backup",
    ".\backend\controllers\teacherController.js.bak",
    ".\backend\controllers\teacherController.js.new"
)
foreach ($file in $backendDuplicates) {
    Move-ToArchive $file "$archiveFolder\backend_duplicates\"
}

# ========================================
# FRONTEND CLEANUP
# ========================================

Write-Host "`n`nCleaning Frontend Directory..." -ForegroundColor Cyan

# Debug/Generate Scripts
Write-Host "`nMoving frontend utility files..." -ForegroundColor Yellow
$frontendUtilFiles = @(
    ".\frontend\debug-quiz-pool-fix.js",
    ".\frontend\debug-routing.html",
    ".\frontend\debug-teacher-profile.html",
    ".\frontend\generate-ssl-node.js",
    ".\frontend\generate-ssl.js"
)
foreach ($file in $frontendUtilFiles) {
    Move-ToArchive $file "$archiveFolder\frontend_utilities\"
}

# SSL Certificates and mkcert
Write-Host "`nMoving frontend SSL files..." -ForegroundColor Yellow
$frontendSSLFiles = @(
    ".\frontend\localhost+2-key.pem",
    ".\frontend\localhost+2.pem",
    ".\frontend\localhost+3-key.pem",
    ".\frontend\localhost+3.pem",
    ".\frontend\mkcert.exe"
)
foreach ($file in $frontendSSLFiles) {
    Move-ToArchive $file "$archiveFolder\frontend_ssl\"
}

# Create summary
Write-Host "`n`nCreating cleanup summary..." -ForegroundColor Cyan

$summary = @"
# Internal Cleanup Summary
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Archive: $archiveFolder

## Files Archived

### Backend Utilities (~70 files)
- Assignment scripts (assign-*.js, migrate-*.js)
- Fix scripts (fix-*.js)
- Debug scripts (debug-*.js, diagnose-*.js, find-*.js)
- Test files (test-*.js, *.test.js, *.http)
- Generation scripts (generate-*.js)
- Utility scripts (list-*.js, check-*.js, etc.)

### Backend Duplicates
- adminController_new.js
- readingMaterialController_fixed.js
- sectionController.js.backup
- teacherController.js.bak
- teacherController.js.new

### Backend CSV Files
- fixed_india_quiz.csv
- fixed_output.csv
- fixed_quiz_template.csv
- quiz_template.csv
- sample_quiz.csv

### Backend SSL/Installers
- SSL certificates (*.pem)
- Redis installer (.msi)

### Frontend Utilities
- debug-*.js, debug-*.html
- generate-ssl-*.js

### Frontend SSL
- SSL certificates (*.pem)
- mkcert.exe

## Active Production Files (Kept)

### Backend
- server.js, server-https.js, cluster.js
- All controllers/ (active only)
- All routes/
- All models/
- All middleware/
- All utils/
- package.json, .env
- socket/, config/, services/

### Frontend
- src/ (all active components)
- public/
- package.json
- .env files

## Restoration

To restore any file:
Copy-Item "$archiveFolder\folder\filename" ".\original\location\"

## Notes
- All archived files were utilities used during development
- None of these files are needed for production
- Can be safely deleted after verification
"@

$summary | Out-File -FilePath "$archiveFolder\CLEANUP_SUMMARY.md" -Encoding UTF8

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Internal Cleanup Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archive Location: " -NoNewline
Write-Host $archiveFolder -ForegroundColor Yellow
Write-Host ""
Write-Host "Summary: " -NoNewline
Write-Host "$archiveFolder\CLEANUP_SUMMARY.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test your application thoroughly"
Write-Host "  2. If everything works, delete the archive folder"
Write-Host "  3. Your codebase is now much cleaner!"
Write-Host ""
