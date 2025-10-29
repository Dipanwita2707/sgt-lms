const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
const app = express();
require('dotenv').config();

// Enhanced CORS configuration for HTTPS frontend
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://10.20.49.165:3000',
    'https://10.20.49.165:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Security headers (lightweight defaults)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Gzip compression for JSON/text responses
app.use(compression());

app.use(express.json({ limit: '1mb' }));

// Serve static files from the public directory with cache headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // Do not cache HTML to avoid stale shells
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

const PORT = process.env.PORT || 5000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'SGT Backend API is running!' });
});

// Import all routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const announcementRoutes = require('./routes/announcements');
const assignmentRoutes = require('./routes/assignments');
const quizRoutes = require('./routes/quizzes');
const analyticsRoutes = require('./routes/analytics');
const submissionRoutes = require('./routes/submissions');
const teacherRoutes = require('./routes/teachers');
const sectionRoutes = require('./routes/sections');
const liveClassRoutes = require('./routes/liveClass');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/liveclass', liveClassRoutes);

// Admin creation
const createAdmin = async () => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    const adminExists = await User.findOne({ role: 'superadmin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const admin = new User({
        name: 'Administrator',
        email: 'admin@sgt.com',
        password: hashedPassword,
        role: 'superadmin',
        department: 'Administration'
      });
      await admin.save();
      console.log('✅ Super Admin created: admin@sgt.com / admin123');
    }
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  }
};

// Global error handler
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  // For any other errors
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// SSL certificate options
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost+3-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost+3.pem'))
};

// Initialize Socket.IO for live classes BEFORE starting the server
const server = https.createServer(sslOptions, app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ["https://localhost:3000", "https://192.168.1.100:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize Scalable Services
try {
  const ScalableSocketService = require('./services/ScalableSocketService');
  const MediasoupService = require('./services/MediasoupService');
  
  // Initialize services globally
  global.mediasoupService = new MediasoupService();
  global.scalableSocketService = new ScalableSocketService(io);
  
  console.log('✅ Scalable Live Class services initialized (HTTPS)');
} catch (error) {
  console.warn('⚠️ Scalable services not available:', error.message);
}

server.listen(PORT, '0.0.0.0', async () => {
  await createAdmin();
  // Run migrations
  const generateTeacherIds = require('./migrations/generateTeacherIds');
  await generateTeacherIds();
  
  console.log(`🔐 HTTPS Server running on port ${PORT}`);
  console.log(`   Access via: https://10.20.49.165:${PORT}`);
});