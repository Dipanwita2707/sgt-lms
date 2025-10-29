#!/bin/bash

# 🚀 Automated Deployment Script for Scalable Live Classroom
# Handles 10,000+ concurrent users with CodeTantra-like interface

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="scalable-classroom"
NAMESPACE="live-classroom"
DOMAIN=""
EXTERNAL_IP=""
DEPLOYMENT_TYPE="docker"  # docker or kubernetes
SSL_EMAIL=""

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                  🎓 SCALABLE LIVE CLASSROOM                    ║
║                     Deployment Script                         ║
║                                                               ║
║  🚀 Supports 10,000+ concurrent students                      ║
║  📺 CodeTantra-style interface                                ║
║  🔧 WebRTC + Mediasoup SFU + Redis Clustering                ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running as root (not recommended)
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root is not recommended for security reasons"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "openssl")
    
    if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
        required_commands+=("kubectl" "helm")
    fi
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is not installed or not in PATH"
            case "$cmd" in
                "docker")
                    log_info "Install Docker: curl -fsSL https://get.docker.com | sh"
                    ;;
                "docker-compose")
                    log_info "Install Docker Compose: https://docs.docker.com/compose/install/"
                    ;;
                "kubectl")
                    log_info "Install kubectl: https://kubernetes.io/docs/tasks/tools/install-kubectl/"
                    ;;
                "helm")
                    log_info "Install Helm: https://helm.sh/docs/intro/install/"
                    ;;
            esac
            exit 1
        fi
    done
    
    # Check Docker service
    if ! systemctl is-active --quiet docker; then
        log_error "Docker service is not running"
        log_info "Start Docker: sudo systemctl start docker"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

get_configuration() {
    log_info "Gathering configuration..."
    
    # Get domain
    while [[ -z "$DOMAIN" ]]; do
        read -p "Enter your domain (e.g., classroom.yourdomain.com): " DOMAIN
        if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
            log_error "Invalid domain format"
            DOMAIN=""
        fi
    done
    
    # Get external IP
    if [[ -z "$EXTERNAL_IP" ]]; then
        log_info "Detecting external IP..."
        EXTERNAL_IP=$(curl -s ipinfo.io/ip || curl -s icanhazip.com || echo "")
        if [[ -z "$EXTERNAL_IP" ]]; then
            read -p "Could not detect external IP. Please enter manually: " EXTERNAL_IP
        else
            log_info "Detected external IP: $EXTERNAL_IP"
            read -p "Is this correct? (Y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                read -p "Enter correct external IP: " EXTERNAL_IP
            fi
        fi
    fi
    
    # Get SSL email for Let's Encrypt
    if [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]] && [[ -z "$SSL_EMAIL" ]]; then
        read -p "Enter email for SSL certificate (Let's Encrypt): " SSL_EMAIL
    fi
    
    # Get deployment type
    echo "Choose deployment type:"
    echo "1) Docker Compose (recommended for development/small production)"
    echo "2) Kubernetes (recommended for enterprise/large scale)"
    read -p "Enter choice (1-2): " choice
    
    case $choice in
        1) DEPLOYMENT_TYPE="docker" ;;
        2) DEPLOYMENT_TYPE="kubernetes" ;;
        *) log_error "Invalid choice"; exit 1 ;;
    esac
    
    log_success "Configuration gathered successfully"
}

setup_ssl_certificates() {
    log_info "Setting up SSL certificates..."
    
    local ssl_dir="$SCRIPT_DIR/ssl"
    mkdir -p "$ssl_dir"
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        # Check if certificates already exist
        if [[ -f "$ssl_dir/cert.pem" && -f "$ssl_dir/key.pem" ]]; then
            log_info "SSL certificates already exist"
            read -p "Do you want to regenerate them? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                return
            fi
        fi
        
        # Try Let's Encrypt first (requires domain to be pointing to server)
        if command -v certbot &> /dev/null; then
            log_info "Attempting Let's Encrypt certificate..."
            if certbot certonly --standalone --agree-tos --no-eff-email \
                --email "${SSL_EMAIL:-admin@${DOMAIN}}" -d "$DOMAIN" --non-interactive; then
                cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$ssl_dir/cert.pem"
                cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$ssl_dir/key.pem"
                log_success "Let's Encrypt certificate obtained"
                return
            else
                log_warning "Let's Encrypt failed, falling back to self-signed certificate"
            fi
        fi
        
        # Generate self-signed certificate
        log_info "Generating self-signed SSL certificate..."
        openssl req -x509 -newkey rsa:4096 -keyout "$ssl_dir/key.pem" \
            -out "$ssl_dir/cert.pem" -days 365 -nodes -subj "/CN=$DOMAIN"
        
        log_success "Self-signed SSL certificate generated"
        log_warning "Self-signed certificates will show security warnings in browsers"
    fi
}

create_environment_file() {
    log_info "Creating environment configuration..."
    
    local env_file="$SCRIPT_DIR/.env"
    
    cat > "$env_file" << EOF
# 🚀 Scalable Live Classroom Configuration
# Generated on $(date)

# Domain Configuration
DOMAIN=$DOMAIN
EXTERNAL_IP=$EXTERNAL_IP

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=liveclass_db
DB_USER=liveclass_user
DB_PASS=$(openssl rand -base64 32)

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=$(openssl rand -base64 32)

# Mediasoup Configuration
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100
MEDIASOUP_ANNOUNCED_IP=$EXTERNAL_IP

# Application Configuration
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 64)
API_KEY=$(openssl rand -base64 32)

# Scaling Configuration
WORKER_INSTANCES=5
MAX_CONCURRENT_USERS=10000
REDIS_CLUSTER_NODES=3

# SSL Configuration
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem

# Monitoring
ENABLE_PROMETHEUS=true
ENABLE_GRAFANA=true
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 16)

# Security
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=900000

# Build Configuration
BUILD_VERSION=$(date +%Y%m%d-%H%M%S)
EOF

    log_success "Environment file created: $env_file"
}

setup_database_init() {
    log_info "Setting up database initialization..."
    
    local db_init_dir="$SCRIPT_DIR/database/init"
    mkdir -p "$db_init_dir"
    
    cat > "$db_init_dir/01-init.sql" << 'EOF'
-- 📊 Scalable Live Classroom Database Schema
-- Optimized for 10,000+ concurrent users

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live classes table
CREATE TABLE IF NOT EXISTS live_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL REFERENCES users(id),
    subject VARCHAR(100),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    max_participants INTEGER DEFAULT 10000,
    room_settings JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'scheduled',
    recording_enabled BOOLEAN DEFAULT false,
    recording_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class participants
CREATE TABLE IF NOT EXISTS class_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    participation_duration INTEGER DEFAULT 0,
    is_present BOOLEAN DEFAULT false,
    connection_quality JSONB DEFAULT '{}',
    UNIQUE(class_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    message_text TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    recipient_id UUID REFERENCES users(id),
    is_private BOOLEAN DEFAULT false,
    reactions JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Polls and quizzes
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    poll_type VARCHAR(50) DEFAULT 'multiple_choice',
    is_active BOOLEAN DEFAULT true,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ
);

-- Poll responses
CREATE TABLE IF NOT EXISTS poll_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    selected_options JSONB NOT NULL,
    response_time_ms INTEGER,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, user_id)
);

-- Class analytics
CREATE TABLE IF NOT EXISTS class_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- System metrics for monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    instance_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_live_classes_teacher ON live_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled ON live_classes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON live_classes(status);
CREATE INDEX IF NOT EXISTS idx_class_participants_class ON class_participants(class_id);
CREATE INDEX IF NOT EXISTS idx_class_participants_user ON class_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_class ON chat_messages(class_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_polls_class ON polls(class_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll ON poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_class_analytics_class ON class_analytics(class_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON system_metrics(recorded_at);

-- Create views for common queries
CREATE OR REPLACE VIEW active_classes AS
SELECT 
    lc.*,
    u.full_name as teacher_name,
    COUNT(cp.user_id) as current_participants
FROM live_classes lc
JOIN users u ON lc.teacher_id = u.id
LEFT JOIN class_participants cp ON lc.id = cp.class_id AND cp.is_present = true
WHERE lc.status = 'active'
GROUP BY lc.id, u.full_name;

CREATE OR REPLACE VIEW class_summary AS
SELECT 
    lc.id,
    lc.title,
    lc.scheduled_at,
    lc.status,
    u.full_name as teacher_name,
    COUNT(DISTINCT cp.user_id) as total_participants,
    COUNT(DISTINCT CASE WHEN cp.is_present THEN cp.user_id END) as active_participants,
    AVG(cp.participation_duration) as avg_participation_duration
FROM live_classes lc
JOIN users u ON lc.teacher_id = u.id
LEFT JOIN class_participants cp ON lc.id = cp.class_id
GROUP BY lc.id, lc.title, lc.scheduled_at, lc.status, u.full_name;

-- Insert default admin user (password: Admin123!)
INSERT INTO users (username, email, password_hash, role, full_name) 
VALUES (
    'admin', 
    'admin@classroom.local', 
    '$2b$10$8K1p/a0dW.0fqM3wdoD6k.n6L0n8X.Pv8e4K2.U9X0.c1M2P3a4b5', 
    'admin', 
    'System Administrator'
) ON CONFLICT (email) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_classes_updated_at ON live_classes;
CREATE TRIGGER update_live_classes_updated_at 
    BEFORE UPDATE ON live_classes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO liveclass_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO liveclass_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO liveclass_user;

-- Set up connection pooling settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 500;
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Restart required for some settings
SELECT pg_reload_conf();
EOF

    log_success "Database initialization script created"
}

deploy_docker() {
    log_info "Deploying with Docker Compose..."
    
    cd "$SCRIPT_DIR"
    
    # Build and start services
    log_info "Building and starting services..."
    docker-compose down --volumes --remove-orphans 2>/dev/null || true
    docker-compose up -d --build --remove-orphans
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    local services=("postgres" "redis" "mediasoup-service" "frontend" "nginx")
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log_success "$service is running"
        else
            log_error "$service failed to start"
            docker-compose logs "$service"
            exit 1
        fi
    done
    
    # Initialize database
    log_info "Initializing database..."
    docker-compose exec -T postgres psql -U liveclass_user -d liveclass_db < database/init/01-init.sql
    
    # Display connection info
    echo
    log_success "🎉 Deployment completed successfully!"
    echo
    echo "Access your scalable classroom at:"
    echo "  🌐 https://$DOMAIN"
    echo "  📊 Grafana: http://$DOMAIN:3001 (admin/$(grep GRAFANA_ADMIN_PASSWORD .env | cut -d'=' -f2))"
    echo "  📈 Prometheus: http://$DOMAIN:9090"
    echo
    echo "Services status:"
    docker-compose ps
}

deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    # Check if kubectl is configured
    if ! kubectl cluster-info &>/dev/null; then
        log_error "kubectl is not configured or cluster is not accessible"
        exit 1
    fi
    
    cd "$SCRIPT_DIR"
    
    # Create namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Create secrets
    log_info "Creating secrets..."
    kubectl create secret generic postgres-secret \
        --from-literal=username=liveclass_user \
        --from-literal=password="$(grep DB_PASS .env | cut -d'=' -f2)" \
        -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Update deployment manifest with actual values
    sed -i "s/classroom.yourdomain.com/$DOMAIN/g" k8s/deployment.yaml
    sed -i "s/your-registry/$(docker info --format '{{.IndexServerAddress}}')/g" k8s/deployment.yaml
    
    # Apply manifests
    log_info "Applying Kubernetes manifests..."
    kubectl apply -f k8s/deployment.yaml
    
    # Wait for rollout
    log_info "Waiting for deployments to be ready..."
    kubectl rollout status deployment/mediasoup-sfu -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=300s
    
    # Install ingress controller if not exists
    if ! kubectl get ingressclass nginx &>/dev/null; then
        log_info "Installing NGINX Ingress Controller..."
        helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
        helm repo update
        helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
            --namespace ingress-nginx --create-namespace \
            --set controller.service.type=LoadBalancer
    fi
    
    # Install cert-manager if not exists
    if ! kubectl get namespace cert-manager &>/dev/null; then
        log_info "Installing cert-manager..."
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
        
        # Wait for cert-manager to be ready
        kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
        
        # Create ClusterIssuer
        cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: $SSL_EMAIL
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    fi
    
    # Get external IP
    log_info "Waiting for external IP..."
    local external_ip=""
    local retries=0
    while [[ -z "$external_ip" && $retries -lt 30 ]]; do
        external_ip=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        if [[ -z "$external_ip" ]]; then
            sleep 10
            ((retries++))
        fi
    done
    
    if [[ -n "$external_ip" ]]; then
        log_success "External IP: $external_ip"
        log_info "Please update your DNS to point $DOMAIN to $external_ip"
    else
        log_warning "Could not determine external IP. Check your LoadBalancer service."
    fi
    
    # Display status
    echo
    log_success "🎉 Kubernetes deployment completed!"
    echo
    echo "Cluster status:"
    kubectl get pods -n "$NAMESPACE"
    echo
    echo "Access your classroom at: https://$DOMAIN (once DNS is configured)"
}

run_health_check() {
    log_info "Running health checks..."
    
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        # Check Docker services
        local unhealthy_services=()
        while IFS= read -r line; do
            if [[ "$line" =~ "unhealthy" ]] || [[ "$line" =~ "Exit" ]]; then
                unhealthy_services+=("$line")
            fi
        done < <(docker-compose ps --format "table {{.Name}}\t{{.Status}}")
        
        if [[ ${#unhealthy_services[@]} -gt 0 ]]; then
            log_warning "Some services are unhealthy:"
            printf '%s\n' "${unhealthy_services[@]}"
        else
            log_success "All Docker services are healthy"
        fi
        
        # Test endpoint
        if curl -k -s "https://localhost/health" &>/dev/null; then
            log_success "Application is responding to health checks"
        else
            log_warning "Application health check failed"
        fi
        
    elif [[ "$DEPLOYMENT_TYPE" == "kubernetes" ]]; then
        # Check Kubernetes pods
        local failed_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
        if [[ "$failed_pods" -eq 0 ]]; then
            log_success "All Kubernetes pods are running"
        else
            log_warning "$failed_pods pods are not in Running state"
            kubectl get pods -n "$NAMESPACE"
        fi
    fi
}

cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup logic if needed
}

show_next_steps() {
    echo
    log_info "🚀 Next Steps:"
    echo
    echo "1. 📋 Configure your application settings:"
    echo "   - Update admin credentials"
    echo "   - Configure SMTP for notifications"
    echo "   - Set up backup strategies"
    echo
    echo "2. 🧪 Test the system:"
    echo "   - Create a test class"
    echo "   - Verify video/audio functionality"
    echo "   - Test with multiple users"
    echo
    echo "3. 📊 Set up monitoring:"
    echo "   - Configure alerts in Grafana"
    echo "   - Set up log aggregation"
    echo "   - Monitor system metrics"
    echo
    echo "4. 🔐 Security hardening:"
    echo "   - Change default passwords"
    echo "   - Configure firewall rules"
    echo "   - Enable audit logging"
    echo
    echo "5. 📚 Documentation:"
    echo "   - Read the full deployment guide: DEPLOYMENT_GUIDE.md"
    echo "   - Check troubleshooting section for common issues"
    echo
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
        echo "🔧 Useful commands:"
        echo "   - View logs: docker-compose logs -f [service]"
        echo "   - Restart service: docker-compose restart [service]"
        echo "   - Scale service: docker-compose up -d --scale mediasoup-service=5"
        echo "   - Stop all: docker-compose down"
    else
        echo "🔧 Useful commands:"
        echo "   - View logs: kubectl logs -f deployment/mediasoup-sfu -n $NAMESPACE"
        echo "   - Scale service: kubectl scale deployment/mediasoup-sfu --replicas=10 -n $NAMESPACE"
        echo "   - Get status: kubectl get pods -n $NAMESPACE"
        echo "   - Delete deployment: kubectl delete namespace $NAMESPACE"
    fi
}

# Trap to cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    print_banner
    
    check_prerequisites
    get_configuration
    setup_ssl_certificates
    create_environment_file
    setup_database_init
    
    case "$DEPLOYMENT_TYPE" in
        "docker")
            deploy_docker
            ;;
        "kubernetes")
            deploy_kubernetes
            ;;
    esac
    
    run_health_check
    show_next_steps
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -i|--ip)
            EXTERNAL_IP="$2"
            shift 2
            ;;
        -t|--type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        -e|--email)
            SSL_EMAIL="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -d, --domain DOMAIN    Set domain name"
            echo "  -i, --ip IP           Set external IP address"
            echo "  -t, --type TYPE       Deployment type (docker|kubernetes)"
            echo "  -e, --email EMAIL     Email for SSL certificate"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main