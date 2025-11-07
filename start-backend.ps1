# SGT-LMS Backend Management Script
# This script helps start, stop, and monitor the backend server locally and on AWS

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "health", "deploy")]
    [string]$Action = "start",
    
    [Parameter()]
    [ValidateSet("local", "aws", "dev", "prod")]
    [string]$Environment = "local",
    
    [Parameter()]
    [switch]$Verbose
)

# Color output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️ $Message" -ForegroundColor Cyan }

function Show-Header {
    Write-Host ""
    Write-Host "🚀 SGT-LMS Backend Management Tool" -ForegroundColor Blue
    Write-Host "===================================" -ForegroundColor Blue
    Write-Host "Action: $Action | Environment: $Environment" -ForegroundColor Gray
    Write-Host ""
}

function Start-BackendLocal {
    Write-Info "Starting backend server locally..."
    
    # Check if already running
    $existingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" }
    if ($existingProcess) {
        Write-Warning "Node.js processes already running. Use 'restart' to force restart."
        Show-ProcessStatus
        return
    }
    
    # Navigate to backend directory
    if (Test-Path "backend") {
        Set-Location "backend"
    } elseif (Test-Path "../backend") {
        Set-Location "../backend"
    } else {
        Write-Error "Backend directory not found. Please run from project root or frontend directory."
        return
    }
    
    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        Write-Error "package.json not found in backend directory."
        return
    }
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing backend dependencies..."
        npm install
    }
    
    # Check environment file
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Backend may fail to start without proper configuration."
        Write-Info "Available environment files:"
        Get-ChildItem "*.env*" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  - $($_.Name)" }
    }
    
    Write-Info "Starting backend server..."
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    
    # Start the server based on environment
    switch ($Environment) {
        "dev" { npm run dev }
        "prod" { npm run start:production }
        default { npm start }
    }
}

function Stop-BackendLocal {
    Write-Info "Stopping backend server..."
    
    # Find and kill Node.js processes running server.js
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
    $serverProcesses = @()
    
    foreach ($process in $processes) {
        try {
            $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            if ($commandLine -and ($commandLine -like "*server.js*" -or $commandLine -like "*backend*")) {
                $serverProcesses += $process
            }
        } catch {
            # Ignore access errors
        }
    }
    
    if ($serverProcesses.Count -gt 0) {
        foreach ($process in $serverProcesses) {
            Write-Info "Stopping process $($process.Id)..."
            Stop-Process -Id $process.Id -Force
        }
        Write-Success "Backend processes stopped."
    } else {
        Write-Warning "No backend processes found."
    }
}

function Show-ProcessStatus {
    Write-Info "Backend Process Status:"
    
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
    $serverProcesses = @()
    
    foreach ($process in $processes) {
        try {
            $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            if ($commandLine -and ($commandLine -like "*server.js*" -or $commandLine -like "*backend*")) {
                $serverProcesses += [PSCustomObject]@{
                    PID = $process.Id
                    CPU = $process.CPU
                    Memory = [math]::Round($process.WorkingSet / 1MB, 2)
                    StartTime = $process.StartTime
                    Command = $commandLine
                }
            }
        } catch {
            # Ignore access errors
        }
    }
    
    if ($serverProcesses.Count -gt 0) {
        $serverProcesses | Format-Table PID, CPU, @{Name="Memory(MB)";Expression={$_.Memory}}, StartTime, @{Name="Command";Expression={$_.Command.Substring(0, [Math]::Min($_.Command.Length, 80)) + "..."}} -AutoSize
    } else {
        Write-Warning "No backend processes running."
    }
    
    # Check port 5000
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port 5000 -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Success "Port 5000 is open and accessible."
        } else {
            Write-Warning "Port 5000 is not accessible."
        }
    } catch {
        Write-Warning "Could not test port 5000 connectivity."
    }
}

function Test-BackendHealth {
    Write-Info "Testing backend health..."
    
    # Test local backend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000" -TimeoutSec 10 -ErrorAction Stop
        Write-Success "Local backend (port 5000) is responding."
        Write-Info "Response status: $($response.StatusCode)"
    } catch {
        Write-Error "Local backend health check failed: $($_.Exception.Message)"
    }
    
    # Test health endpoint if available
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 10 -ErrorAction Stop
        Write-Success "Health endpoint is responding."
        Write-Info "Health response: $($healthResponse.Content)"
    } catch {
        Write-Warning "Health endpoint not available or not responding."
    }
    
    if ($Environment -eq "aws") {
        Test-AWSHealth
    }
}

function Test-AWSHealth {
    Write-Info "Testing AWS deployment health..."
    
    $awsUrl = "https://ec2-13-233-135-233.ap-south-1.compute.amazonaws.com"
    
    try {
        # Test frontend
        $frontendResponse = Invoke-WebRequest -Uri $awsUrl -TimeoutSec 30 -SkipCertificateCheck -ErrorAction Stop
        Write-Success "AWS Frontend is responding."
    } catch {
        Write-Error "AWS Frontend health check failed: $($_.Exception.Message)"
    }
    
    try {
        # Test API
        $apiResponse = Invoke-WebRequest -Uri "$awsUrl/api/health" -TimeoutSec 30 -SkipCertificateCheck -ErrorAction Stop
        Write-Success "AWS API is responding."
        Write-Info "API response: $($apiResponse.Content)"
    } catch {
        Write-Error "AWS API health check failed: $($_.Exception.Message)"
    }
}

function Start-AWSDeployment {
    Write-Info "Triggering AWS deployment via GitHub Actions..."
    
    # Check if we're in a git repository
    if (-not (Test-Path ".git")) {
        Write-Error "Not in a git repository. Please run from project root."
        return
    }
    
    Write-Info "Pushing changes to trigger CI/CD pipeline..."
    
    try {
        # Add and commit any changes
        git add .
        git status
        
        $commitMessage = "Deploy: Backend management update - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $commitMessage -ErrorAction SilentlyContinue
        
        # Push to trigger pipeline
        git push origin production-main
        
        Write-Success "Changes pushed to production-main branch."
        Write-Info "GitHub Actions deployment should start automatically."
        Write-Info "Monitor progress at: https://github.com/Dipanwita2707/sgt-lms/actions"
        
        # Wait and test AWS health
        Write-Info "Waiting 2 minutes for deployment to complete..."
        Start-Sleep -Seconds 120
        Test-AWSHealth
        
    } catch {
        Write-Error "Deployment trigger failed: $($_.Exception.Message)"
    }
}

function Show-Usage {
    Write-Host ""
    Write-Host "Usage: .\start-backend.ps1 [Action] [Environment] [-Verbose]" -ForegroundColor Green
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  start    - Start the backend server"
    Write-Host "  stop     - Stop the backend server"
    Write-Host "  restart  - Restart the backend server"
    Write-Host "  status   - Show backend process status"
    Write-Host "  health   - Test backend health"
    Write-Host "  deploy   - Deploy to AWS via CI/CD"
    Write-Host "  logs     - Show recent logs (local only)"
    Write-Host ""
    Write-Host "Environments:" -ForegroundColor Yellow
    Write-Host "  local    - Local development (default)"
    Write-Host "  aws      - AWS/Production testing"
    Write-Host "  dev      - Local with nodemon"
    Write-Host "  prod     - Local production mode"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\start-backend.ps1 start dev     # Start with nodemon"
    Write-Host "  .\start-backend.ps1 health aws    # Test AWS health"
    Write-Host "  .\start-backend.ps1 deploy        # Deploy to AWS"
    Write-Host ""
}

# Main execution
Show-Header

switch ($Action) {
    "start" {
        if ($Environment -eq "aws") {
            Write-Error "Cannot start AWS environment locally. Use 'deploy' action."
        } else {
            Start-BackendLocal
        }
    }
    "stop" {
        Stop-BackendLocal
    }
    "restart" {
        Stop-BackendLocal
        Start-Sleep -Seconds 3
        Start-BackendLocal
    }
    "status" {
        Show-ProcessStatus
    }
    "health" {
        Test-BackendHealth
    }
    "deploy" {
        Start-AWSDeployment
    }
    "logs" {
        Write-Info "Checking for log files..."
        if (Test-Path "backend/logs") {
            Get-ChildItem "backend/logs" -Filter "*.log" | ForEach-Object {
                Write-Info "Recent entries from $($_.Name):"
                Get-Content $_.FullName -Tail 20 | ForEach-Object { Write-Host "  $_" }
                Write-Host ""
            }
        } else {
            Write-Warning "No log directory found. Logs might be in console output."
        }
    }
    default {
        Show-Usage
    }
}

Write-Host ""
Write-Info "Script completed at $(Get-Date -Format 'HH:mm:ss')"