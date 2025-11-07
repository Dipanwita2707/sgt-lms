#!/bin/bash

# Enhanced Backend Monitoring and Error Handling Script
# This script provides comprehensive backend monitoring, restart capabilities, and detailed error reporting

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_critical() { echo -e "${PURPLE}[CRITICAL]${NC} $1"; }

# Enhanced Backend Health Check with Error Recovery
enhanced_backend_health_check() {
    local max_retries=5
    local retry_delay=10
    local health_check_timeout=30
    
    log_info "🔍 Enhanced Backend Health Check Starting..."
    
    for attempt in $(seq 1 $max_retries); do
        log_info "Attempt $attempt/$max_retries..."
        
        # Check PM2 process status
        if ! pm2 status | grep -q "sgt-lms-backend.*online"; then
            log_error "PM2 process not running - attempting restart..."
            
            # Kill any existing processes
            pm2 delete sgt-lms-backend > /dev/null 2>&1 || true
            pkill -f "node server.js" > /dev/null 2>&1 || true
            
            # Start fresh process
            cd /var/www/sgt-lms/backend
            NODE_ENV=production PORT=5000 pm2 start server.js --name sgt-lms-backend
            
            log_info "Waiting ${retry_delay}s for backend to start..."
            sleep $retry_delay
            continue
        fi
        
        # Test direct backend connection
        log_info "Testing backend on port 5000..."
        if timeout $health_check_timeout curl -f -s http://localhost:5000 > /dev/null 2>&1; then
            log_success "✅ Backend responding on port 5000"
            
            # Test API health endpoint
            log_info "Testing API health endpoint..."
            if timeout $health_check_timeout curl -f -s -k https://localhost/api/health > /dev/null 2>&1; then
                log_success "✅ API health endpoint responding"
                
                # Test MongoDB connection via API
                log_info "Testing database connectivity..."
                local db_response=$(curl -s -k https://localhost/api/health 2>/dev/null || echo "error")
                if [[ "$db_response" != "error" ]] && [[ "$db_response" != *"error"* ]]; then
                    log_success "✅ Database connectivity confirmed"
                    log_success "🎉 Backend is fully operational!"
                    return 0
                else
                    log_warning "⚠️ Database connectivity issues detected"
                fi
            else
                log_warning "⚠️ API health endpoint not responding"
            fi
        else
            log_warning "⚠️ Backend not responding on port 5000"
        fi
        
        if [ $attempt -lt $max_retries ]; then
            log_info "Retrying in ${retry_delay}s..."
            sleep $retry_delay
        fi
    done
    
    log_critical "❌ Backend health check failed after $max_retries attempts"
    return 1
}

# Detailed Error Diagnostics
run_error_diagnostics() {
    log_info "🔧 Running comprehensive error diagnostics..."
    echo "=================================================="
    
    # PM2 Status and Logs
    echo "📊 PM2 Process Status:"
    pm2 status || echo "PM2 status failed"
    echo ""
    
    echo "📋 Recent PM2 Logs (Backend):"
    pm2 logs sgt-lms-backend --lines 20 --nostream 2>/dev/null || echo "No PM2 logs available"
    echo ""
    
    # Process Information
    echo "🔍 Process Information:"
    echo "Node.js processes:"
    ps aux | grep node | grep -v grep || echo "No Node.js processes found"
    echo ""
    echo "Port 5000 usage:"
    lsof -i :5000 || netstat -tulpn | grep :5000 || echo "Port 5000 not in use"
    echo ""
    
    # System Resources
    echo "💻 System Resources:"
    echo "Memory: $(free -h | grep '^Mem:' | awk '{print $3}')/$(free -h | grep '^Mem:' | awk '{print $2}') ($(free -m | grep '^Mem:' | awk '{printf "%.1f%%", $3/$2 * 100.0}'))"
    echo "Disk: $(df -h / | tail -1 | awk '{print $3}')/$(df -h / | tail -1 | awk '{print $2}') ($(df -h / | tail -1 | awk '{print $5}'))"
    echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo ""
    
    # Network Connectivity
    echo "🌐 Network Connectivity:"
    echo "Localhost connectivity:"
    curl -I -s --max-time 5 http://localhost:5000 2>/dev/null | head -1 || echo "❌ Backend not responding"
    curl -I -s --max-time 5 -k https://localhost 2>/dev/null | head -1 || echo "❌ Frontend not responding"
    echo ""
    
    # Nginx Status
    echo "🔧 Nginx Status:"
    sudo systemctl is-active nginx || echo "Nginx not active"
    sudo nginx -t 2>&1 | tail -3 || echo "Nginx config test failed"
    echo ""
    
    # MongoDB Connection Test
    echo "🗄️ Database Connectivity:"
    if [ -f "/var/www/sgt-lms/backend/.env" ]; then
        log_info "Environment file found, testing MongoDB connection..."
        cd /var/www/sgt-lms/backend
        timeout 15s node -e "
            require('dotenv').config();
            const mongoose = require('mongoose');
            mongoose.connect(process.env.MONGODB_URI || process.env.DB_CONNECTION_STRING)
            .then(() => { console.log('✅ MongoDB connection successful'); process.exit(0); })
            .catch(err => { console.log('❌ MongoDB connection failed:', err.message); process.exit(1); });
        " 2>/dev/null || echo "❌ MongoDB connection test failed"
    else
        echo "❌ Environment file not found"
    fi
    echo ""
    
    # Log Files
    echo "📜 Recent System Logs:"
    echo "Recent Nginx errors:"
    sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No Nginx error logs"
    echo ""
    echo "Recent system errors:"
    sudo tail -5 /var/log/syslog | grep -i error 2>/dev/null || echo "No recent system errors"
    
    echo "=================================================="
}

# Force Backend Restart with Recovery
force_backend_restart() {
    log_info "🔄 Performing force backend restart..."
    
    # Stop all Node.js processes
    log_info "Stopping all Node.js processes..."
    pm2 delete all > /dev/null 2>&1 || true
    pkill -f "node server.js" > /dev/null 2>&1 || true
    sleep 3
    
    # Clear PM2 logs
    pm2 flush || true
    
    # Navigate to backend directory
    cd /var/www/sgt-lms/backend
    
    # Verify dependencies
    log_info "Verifying backend dependencies..."
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        log_warning "Dependencies missing, reinstalling..."
        rm -rf node_modules package-lock.json
        npm install --omit=dev --no-audit
    fi
    
    # Check environment file
    if [ ! -f ".env" ]; then
        log_error "❌ .env file missing - this may cause startup failures"
        log_info "Available environment files:"
        ls -la *.env* 2>/dev/null || echo "No .env files found"
    fi
    
    # Start with enhanced monitoring
    log_info "Starting backend with enhanced monitoring..."
    NODE_ENV=production PORT=5000 pm2 start server.js --name sgt-lms-backend \
        --log-date-format="YYYY-MM-DD HH:mm:ss Z" \
        --merge-logs \
        --log="logs/backend.log" \
        --error="logs/backend-error.log"
    
    # Enable auto-restart
    pm2 save
    
    log_success "Backend restart completed"
    
    # Wait and verify
    sleep 10
    enhanced_backend_health_check
}

# Main execution
main() {
    echo "🚀 SGT-LMS Backend Health Monitor & Recovery Tool"
    echo "=================================================="
    echo "Started at: $(date)"
    echo ""
    
    case "${1:-health}" in
        "health")
            enhanced_backend_health_check
            ;;
        "restart")
            force_backend_restart
            ;;
        "diagnose")
            run_error_diagnostics
            ;;
        "full")
            log_info "Running full health check with diagnostics..."
            if ! enhanced_backend_health_check; then
                log_warning "Health check failed, running diagnostics..."
                run_error_diagnostics
                log_info "Attempting automatic recovery..."
                force_backend_restart
            fi
            ;;
        *)
            echo "Usage: $0 {health|restart|diagnose|full}"
            echo ""
            echo "Commands:"
            echo "  health   - Run enhanced health checks"
            echo "  restart  - Force backend restart with recovery"
            echo "  diagnose - Run comprehensive error diagnostics"
            echo "  full     - Full health check with auto-recovery"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"