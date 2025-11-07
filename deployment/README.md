# 🚀 SGT-LMS Production Deployment Guide

## 📋 **Prerequisites**
- EC2 instance running Ubuntu 20.04/22.04
- SSH access with key file `sgt-lmskey.pem`
- Domain/subdomain pointing to EC2 public IP (optional)

---

## 🎯 **Quick Deployment (3 Commands)**

### **Option A: From Windows (Recommended)**

```powershell
# 1. Build and upload from local machine
.\deployment\deploy-local.ps1

# 2. SSH to server
ssh -i "sgt-lmskey.pem" ubuntu@ec2-13-233-135-233.ap-south-1.compute.amazonaws.com

# 3. Deploy on server
sudo /var/www/sgt-lms/deployment/deploy.sh
```

### **Option B: Direct Clone on Server**

```bash
# 1. SSH to server
ssh -i "sgt-lmskey.pem" ubuntu@ec2-13-233-135-233.ap-south-1.compute.amazonaws.com

# 2. Clone and deploy
git clone https://github.com/Dipanwita2707/sgt-lms.git /tmp/sgt-lms
sudo cp -r /tmp/sgt-lms /var/www/
sudo /var/www/sgt-lms/deployment/deploy.sh
```

---

## 🔐 **SSL Setup (Optional but Recommended)**

```bash
# After main deployment, run:
sudo /var/www/sgt-lms/deployment/setup-ssl.sh
```

---

## 🌐 **Access URLs**

- **HTTP**: http://ec2-13-233-135-233.ap-south-1.compute.amazonaws.com
- **HTTPS**: https://ec2-13-233-135-233.ap-south-1.compute.amazonaws.com

---

## 📊 **Service Management**

### **Backend (PM2)**
```bash
pm2 status                    # Check status
pm2 logs sgt-lms-backend      # View logs
pm2 restart sgt-lms-backend   # Restart
pm2 stop sgt-lms-backend      # Stop
```

### **Nginx**
```bash
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart
sudo nginx -t                 # Test configuration
```

### **System Logs**
```bash
# Backend logs
tail -f /var/log/pm2/sgt-lms-backend-out.log

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

---

## 🔧 **Common Issues & Solutions**

### **Issue**: "502 Bad Gateway"
**Solution**: Backend not running
```bash
pm2 restart sgt-lms-backend
pm2 logs sgt-lms-backend
```

### **Issue**: "SSL Certificate Error"
**Solution**: Run SSL setup
```bash
sudo /var/www/sgt-lms/deployment/setup-ssl.sh
```

### **Issue**: "File Upload Issues"
**Solution**: Check permissions and S3 config
```bash
cd /var/www/sgt-lms/backend
node testS3.js
```

---

## 📈 **Performance Monitoring**

### **System Resources**
```bash
htop                  # CPU/Memory usage
df -h                 # Disk usage
free -h               # Memory usage
```

### **Application Metrics**
```bash
pm2 monit             # PM2 monitoring dashboard
```

---

## 🔄 **Update Deployment**

```bash
# Pull latest changes
cd /var/www/sgt-lms
git pull origin production-main

# Rebuild frontend
cd frontend
npm run build

# Restart backend
pm2 restart sgt-lms-backend

# Reload nginx
sudo systemctl reload nginx
```

---

## 🎯 **Architecture Overview**

```
Internet
    ↓
Nginx (Port 80/443)
    ↓
├── Static Files (React Build) → /var/www/sgt-lms/frontend/build
└── API Requests (/api/*) → Node.js Backend (PM2, Port 5000)
    └── Socket.IO (/socket.io/*) → WebSocket connections
```

---

## 📝 **Configuration Files**

- **Nginx**: `/etc/nginx/sites-available/sgt-lms.conf`
- **PM2**: `/var/www/sgt-lms/backend/ecosystem.config.js`
- **Backend Env**: `/var/www/sgt-lms/backend/.env.production`
- **SSL Certs**: `/etc/ssl/certs/sgt-lms.crt`

---

## ✅ **Post-Deployment Checklist**

- [ ] Application accessible via HTTPS
- [ ] File uploads working (test with S3)
- [ ] WebSocket connections working (real-time features)
- [ ] Database connections established
- [ ] SSL certificate valid
- [ ] PM2 processes running
- [ ] Nginx serving static files
- [ ] Logs collecting properly