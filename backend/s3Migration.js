const mongoose = require('mongoose');
const S3Utils = require('./utils/s3Utils');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import models
const Video = require('./models/Video');
const ReadingMaterial = require('./models/ReadingMaterial');
const GroupChat = require('./models/GroupChat');

class S3Migration {
  constructor() {
    this.s3Utils = new S3Utils();
    this.migrationLog = [];
  }

  // Connect to MongoDB
  async connectDB() {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  // Log migration results
  log(message) {
    console.log(message);
    this.migrationLog.push(`${new Date().toISOString()} - ${message}`);
  }

  // Migrate video files
  async migrateVideos() {
    this.log('🎥 Starting video migration...');
    
    try {
      const videos = await Video.find({ 
        videoUrl: { $exists: true, $ne: null },
        $or: [
          { videoUrl: { $regex: '^uploads/' } },
          { videoUrl: { $regex: '^/uploads/' } }
        ]
      });

      this.log(`Found ${videos.length} videos to migrate`);

      for (const video of videos) {
        try {
          const localPath = path.join(__dirname, video.videoUrl.replace(/^\//, ''));
          
          if (fs.existsSync(localPath)) {
            const s3Url = await this.s3Utils.migrateLocalFileToS3(localPath, 'videos');
            
            if (s3Url) {
              await Video.findByIdAndUpdate(video._id, { videoUrl: s3Url });
              this.log(`✅ Migrated video: ${video.title} -> ${s3Url}`);
              
              // Clean up local file after successful migration
              this.s3Utils.cleanupLocalFile(localPath);
            } else {
              this.log(`❌ Failed to migrate video: ${video.title}`);
            }
          } else {
            this.log(`⚠️ Local file not found for video: ${video.title} (${localPath})`);
          }
        } catch (error) {
          this.log(`❌ Error migrating video ${video.title}: ${error.message}`);
        }
      }
    } catch (error) {
      this.log(`❌ Video migration failed: ${error.message}`);
    }
  }

  // Migrate reading material files
  async migrateReadingMaterials() {
    this.log('📚 Starting reading material migration...');
    
    try {
      const materials = await ReadingMaterial.find({ 
        fileUrl: { $exists: true, $ne: null },
        $or: [
          { fileUrl: { $regex: '^uploads/' } },
          { fileUrl: { $regex: '^/uploads/' } }
        ]
      });

      this.log(`Found ${materials.length} reading materials to migrate`);

      for (const material of materials) {
        try {
          const localPath = path.join(__dirname, material.fileUrl.replace(/^\//, ''));
          
          if (fs.existsSync(localPath)) {
            const s3Url = await this.s3Utils.migrateLocalFileToS3(localPath, 'materials');
            
            if (s3Url) {
              await ReadingMaterial.findByIdAndUpdate(material._id, { fileUrl: s3Url });
              this.log(`✅ Migrated material: ${material.title} -> ${s3Url}`);
              
              // Clean up local file after successful migration
              this.s3Utils.cleanupLocalFile(localPath);
            } else {
              this.log(`❌ Failed to migrate material: ${material.title}`);
            }
          } else {
            this.log(`⚠️ Local file not found for material: ${material.title} (${localPath})`);
          }
        } catch (error) {
          this.log(`❌ Error migrating material ${material.title}: ${error.message}`);
        }
      }
    } catch (error) {
      this.log(`❌ Reading material migration failed: ${error.message}`);
    }
  }

  // Migrate chat files
  async migrateChatFiles() {
    this.log('💬 Starting chat file migration...');
    
    try {
      const chatMessages = await GroupChat.find({ 
        fileUrl: { $exists: true, $ne: null },
        $or: [
          { fileUrl: { $regex: '^uploads/' } },
          { fileUrl: { $regex: '^/uploads/' } }
        ]
      });

      this.log(`Found ${chatMessages.length} chat files to migrate`);

      for (const message of chatMessages) {
        try {
          const localPath = path.join(__dirname, message.fileUrl.replace(/^\//, ''));
          
          if (fs.existsSync(localPath)) {
            const s3Url = await this.s3Utils.migrateLocalFileToS3(localPath, 'chat-files');
            
            if (s3Url) {
              await GroupChat.findByIdAndUpdate(message._id, { fileUrl: s3Url });
              this.log(`✅ Migrated chat file: ${message.fileName} -> ${s3Url}`);
              
              // Clean up local file after successful migration
              this.s3Utils.cleanupLocalFile(localPath);
            } else {
              this.log(`❌ Failed to migrate chat file: ${message.fileName}`);
            }
          } else {
            this.log(`⚠️ Local file not found for chat message: ${message.fileName} (${localPath})`);
          }
        } catch (error) {
          this.log(`❌ Error migrating chat file ${message.fileName}: ${error.message}`);
        }
      }
    } catch (error) {
      this.log(`❌ Chat file migration failed: ${error.message}`);
    }
  }

  // Bulk migrate upload directories
  async bulkMigrateDirectories() {
    this.log('📁 Starting bulk directory migration...');
    
    const directories = [
      { local: path.join(__dirname, 'uploads', 'materials'), s3: 'materials' },
      { local: path.join(__dirname, 'uploads', 'discussions'), s3: 'discussions' },
      { local: path.join(__dirname, 'uploads', 'signatures'), s3: 'signatures' },
      { local: path.join(__dirname, 'uploads', 'chat-files'), s3: 'chat-files' },
      { local: path.join(__dirname, 'public', 'uploads', 'discussions'), s3: 'discussions' }
    ];

    for (const dir of directories) {
      if (fs.existsSync(dir.local)) {
        this.log(`📂 Migrating directory: ${dir.local} -> S3/${dir.s3}`);
        const results = await this.s3Utils.bulkMigrateDirectory(dir.local, dir.s3);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        this.log(`✅ Migrated ${successful} files, ❌ Failed ${failed} files from ${dir.local}`);
      } else {
        this.log(`⚠️ Directory not found: ${dir.local}`);
      }
    }
  }

  // Save migration log
  async saveMigrationLog() {
    const logContent = this.migrationLog.join('\n');
    const logFile = path.join(__dirname, `s3-migration-log-${Date.now()}.txt`);
    
    fs.writeFileSync(logFile, logContent);
    this.log(`📝 Migration log saved to: ${logFile}`);
  }

  // Run complete migration
  async runMigration() {
    try {
      await this.connectDB();
      
      this.log('🚀 Starting S3 migration process...');
      this.log(`📦 Target S3 bucket: ${process.env.AWS_BUCKET}`);
      
      // Migrate database records
      await this.migrateVideos();
      await this.migrateReadingMaterials();
      await this.migrateChatFiles();
      
      // Bulk migrate remaining files
      await this.bulkMigrateDirectories();
      
      this.log('✅ S3 migration completed successfully!');
      
      await this.saveMigrationLog();
      
    } catch (error) {
      this.log(`❌ Migration failed: ${error.message}`);
    } finally {
      await mongoose.connection.close();
      this.log('🔌 Database connection closed');
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const migration = new S3Migration();
  migration.runMigration().then(() => {
    console.log('Migration process completed. Check the log file for details.');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = S3Migration;