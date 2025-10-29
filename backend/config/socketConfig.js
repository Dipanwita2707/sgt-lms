// Socket.IO Configuration for 50,000+ Concurrent Users
const socketConfig = {
  // Core socket.io configuration
  transports: ['websocket', 'polling'],
  
  // Connection settings optimized for high load
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1e6, // 1MB max buffer
  
  // CORS configuration for production
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL]
      : ["http://localhost:3000", process.env.FRONTEND_URL],
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
    credentials: true
  },
  
  // Connection limits and pooling
  connectionStateRecovery: {
    // Enable connection state recovery
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  
  // Performance optimizations
  serveClient: false, // Don't serve socket.io client files
  allowEIO3: false, // Disable Engine.IO v3 compatibility
  
  // Scaling configuration for multiple servers
  adapter: process.env.NODE_ENV === 'production' ? {
    // Redis adapter configuration for horizontal scaling
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  } : undefined,
  
  // Rate limiting at socket level
  allowRequest: (req, callback) => {
    // Implement basic rate limiting here if needed
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Allow connection by default, but could add IP-based rate limiting
    callback(null, true);
  }
};

// Connection pool management
class ConnectionPoolManager {
  constructor() {
    this.activeConnections = new Map();
    this.connectionStats = {
      total: 0,
      byNamespace: {},
      byRoom: {},
      peakConcurrent: 0,
      averageConnectionTime: 0
    };
    
    // Monitor connection stats every 30 seconds
    setInterval(() => {
      this.updateStats();
      this.cleanupStaleConnections();
    }, 30000);
  }
  
  addConnection(socketId, namespace, user) {
    this.activeConnections.set(socketId, {
      namespace,
      user,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      rooms: new Set()
    });
    
    this.connectionStats.total++;
    this.connectionStats.byNamespace[namespace] = 
      (this.connectionStats.byNamespace[namespace] || 0) + 1;
      
    if (this.connectionStats.total > this.connectionStats.peakConcurrent) {
      this.connectionStats.peakConcurrent = this.connectionStats.total;
    }
  }
  
  removeConnection(socketId) {
    const connection = this.activeConnections.get(socketId);
    if (connection) {
      this.connectionStats.total--;
      this.connectionStats.byNamespace[connection.namespace]--;
      
      // Remove from room counts
      for (const room of connection.rooms) {
        this.connectionStats.byRoom[room]--;
        if (this.connectionStats.byRoom[room] <= 0) {
          delete this.connectionStats.byRoom[room];
        }
      }
      
      this.activeConnections.delete(socketId);
    }
  }
  
  updateUserActivity(socketId) {
    const connection = this.activeConnections.get(socketId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }
  
  addUserToRoom(socketId, room) {
    const connection = this.activeConnections.get(socketId);
    if (connection) {
      connection.rooms.add(room);
      this.connectionStats.byRoom[room] = 
        (this.connectionStats.byRoom[room] || 0) + 1;
    }
  }
  
  removeUserFromRoom(socketId, room) {
    const connection = this.activeConnections.get(socketId);
    if (connection) {
      connection.rooms.delete(room);
      this.connectionStats.byRoom[room]--;
      if (this.connectionStats.byRoom[room] <= 0) {
        delete this.connectionStats.byRoom[room];
      }
    }
  }
  
  updateStats() {
    const now = Date.now();
    let totalConnectionTime = 0;
    let activeConnections = 0;
    
    for (const [socketId, connection] of this.activeConnections) {
      totalConnectionTime += (now - connection.connectedAt);
      activeConnections++;
    }
    
    this.connectionStats.averageConnectionTime = 
      activeConnections > 0 ? totalConnectionTime / activeConnections : 0;
      
    // Log stats if in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Connection Stats:', {
        total: this.connectionStats.total,
        peak: this.connectionStats.peakConcurrent,
        avgConnectionTime: Math.round(this.connectionStats.averageConnectionTime / 1000) + 's',
        activeRooms: Object.keys(this.connectionStats.byRoom).length
      });
    }
  }
  
  cleanupStaleConnections() {
    const now = Date.now();
    const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes
    
    for (const [socketId, connection] of this.activeConnections) {
      if (now - connection.lastActivity > STALE_THRESHOLD) {
        console.log(`🧹 Cleaning up stale connection: ${socketId}`);
        this.removeConnection(socketId);
      }
    }
  }
  
  getStats() {
    return this.connectionStats;
  }
  
  getServerLoad() {
    const total = this.connectionStats.total;
    if (total < 1000) return 'low';
    if (total < 10000) return 'normal';
    if (total < 30000) return 'high';
    return 'overloaded';
  }
}

// Global connection pool manager instance
const connectionPoolManager = new ConnectionPoolManager();

module.exports = {
  socketConfig,
  connectionPoolManager
};