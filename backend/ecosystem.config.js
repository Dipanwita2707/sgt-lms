module.exports = {
  apps: [
    {
      name: 'sgt-lms-backend',
      script: 'server.js',
      instances: 1,
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/pm2/sgt-lms-backend-error.log',
      out_file: '/var/log/pm2/sgt-lms-backend-out.log',
      log_file: '/var/log/pm2/sgt-lms-backend.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};