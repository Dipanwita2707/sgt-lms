module.exports = {
  apps: [
    {
      name: 'sgt-lms-backend',
      script: './server-production.js',
      cwd: '/var/www/sgt-lms/backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_file: '.env.production',
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/sgt-lms-backend-error.log',
      out_file: '/var/log/pm2/sgt-lms-backend-out.log',
      log_file: '/var/log/pm2/sgt-lms-backend-combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};