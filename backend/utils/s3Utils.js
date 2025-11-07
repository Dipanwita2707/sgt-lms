const S3Service = require('./s3Service');
const fs = require('fs');
const path = require('path');

class S3Utils {
  constructor() {
    this.s3Service = new S3Service();
  }

  // Helper function to extract S3 key from URL
  extractS3Key(s3Url) {
    if (!s3Url) return null;
    
    // Extract key from S3 URL
    const urlParts = s3Url.split('/');
    const bucketName = process.env.AWS_BUCKET;
    const bucketIndex = urlParts.findIndex(part => part === bucketName);
    
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      return urlParts.slice(bucketIndex + 1).join('/');
    }
    
    return null;
  }

  // Helper function to check if URL is S3 URL
  isS3Url(url) {
    if (!url) return false;
    const bucketName = process.env.AWS_BUCKET;
    return url.includes(bucketName) && url.includes('amazonaws.com');
  }

  // Migration helper: Upload existing local file to S3 and return new URL
  async migrateLocalFileToS3(localFilePath, s3Folder = 'migrated') {
    try {
      if (!fs.existsSync(localFilePath)) {
        console.log(`Local file not found: ${localFilePath}`);
        return null;
      }

      const fileBuffer = fs.readFileSync(localFilePath);
      const fileName = path.basename(localFilePath);
      const mimeType = this.getMimeType(localFilePath);

      const mockFile = {
        buffer: fileBuffer,
        originalname: fileName,
        mimetype: mimeType
      };

      const result = await this.s3Service.uploadFile(mockFile, s3Folder);
      
      if (result.success) {
        console.log(`Migrated: ${localFilePath} -> ${result.url}`);
        return result.url;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to migrate file ${localFilePath}:`, error);
      return null;
    }
  }

  // Get MIME type based on file extension
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Bulk migrate all files in a directory
  async bulkMigrateDirectory(localDir, s3Folder = 'migrated') {
    try {
      if (!fs.existsSync(localDir)) {
        console.log(`Directory not found: ${localDir}`);
        return [];
      }

      const files = fs.readdirSync(localDir);
      const migrations = [];

      for (const file of files) {
        const filePath = path.join(localDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          const s3Url = await this.migrateLocalFileToS3(filePath, s3Folder);
          migrations.push({
            localPath: filePath,
            s3Url: s3Url,
            success: s3Url !== null
          });
        }
      }

      return migrations;
    } catch (error) {
      console.error(`Failed to bulk migrate directory ${localDir}:`, error);
      return [];
    }
  }

  // Create a file upload response in the format expected by frontend
  formatUploadResponse(s3Result, originalName, fileSize, mimeType) {
    return {
      success: true,
      message: 'File uploaded successfully to S3',
      fileUrl: s3Result.url,
      fileName: originalName,
      fileSize: fileSize,
      mimeType: mimeType,
      s3Key: s3Result.key,
      bucket: s3Result.bucket
    };
  }

  // Clean up old local files after successful S3 upload
  cleanupLocalFile(localPath) {
    try {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`Cleaned up local file: ${localPath}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup local file ${localPath}:`, error);
    }
  }
}

module.exports = S3Utils;