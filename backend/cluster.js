/**
 * Production Cluster Manager for SGT Live Class System
 * Implements load balancing with multiple worker processes
 * Optimized for handling 10,000+ concurrent users
 */

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const path = require('path');

// Configuration
const CLUSTER_WORKERS = parseInt(process.env.CLUSTER_WORKERS) || Math.min(numCPUs, 4);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

console.log('🚀 SGT Live Class System - Production Cluster Manager');
console.log(`💻 System: ${numCPUs} CPU cores detected`);
console.log(`👷 Workers: ${CLUSTER_WORKERS} processes will be spawned`);

if (cluster.isMaster && IS_PRODUCTION) {
  console.log(`🎯 Master process ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < CLUSTER_WORKERS; i++) {
    const worker = cluster.fork();
    console.log(`👷 Worker ${worker.process.pid} started`);
  }

  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`💀 Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    const newWorker = cluster.fork();
    console.log(`🔄 New worker ${newWorker.process.pid} started`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Master received SIGTERM, shutting down gracefully...');
    
    Object.values(cluster.workers).forEach(worker => {
      worker.kill('SIGTERM');
    });
    
    setTimeout(() => {
      console.log('💀 Force exit after timeout');
      process.exit(0);
    }, 10000);
  });

  // Cluster statistics
  let stats = {
    startTime: Date.now(),
    requestCount: 0,
    activeConnections: 0
  };

  setInterval(() => {
    const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
    console.log(`📊 Cluster Stats - Uptime: ${uptime}s, Workers: ${Object.keys(cluster.workers).length}`);
  }, 60000); // Log every minute

} else {
  // Worker process - load the main server
  console.log(`👷 Worker ${process.pid} starting server...`);
  require('./server.js');
}

// Handle uncaught exceptions in cluster
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  if (!cluster.isMaster) {
    process.exit(1); // Let cluster manager restart this worker
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  if (!cluster.isMaster) {
    process.exit(1); // Let cluster manager restart this worker
  }
});