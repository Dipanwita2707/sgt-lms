const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
require('dotenv').config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const bucketName = process.env.AWS_BUCKET;

// S3 Service Class
class S3Service {
  constructor() {
    this.s3 = s3;
    this.bucket = bucketName;
  }

  // Upload file directly to S3
  async uploadFile(file, folder = 'uploads') {
    const key = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
      // Removed ACL since bucket doesn't support ACLs
    };

    try {
      const result = await this.s3.upload(params).promise();
      return {
        success: true,
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket
      };
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  // Delete file from S3
  async deleteFile(key) {
    const params = {
      Bucket: this.bucket,
      Key: key
    };

    try {
      await this.s3.deleteObject(params).promise();
      return { success: true };
    } catch (error) {
      console.error('S3 Delete Error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  // Get signed URL for private files
  getSignedUrl(key, expires = 3600) {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: expires
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  // Create multer middleware for direct S3 uploads
  createUploadMiddleware(folder = 'uploads', fileFilter = null) {
    const upload = multer({
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucket,
        key: function (req, file, cb) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = path.extname(file.originalname);
          cb(null, `${folder}/${file.fieldname}-${uniqueSuffix}${ext}`);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE
        // Removed ACL since bucket doesn't support ACLs
      }),
      fileFilter: fileFilter,
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
      }
    });

    return upload;
  }

  // Create specific upload middlewares for different file types
  
  // For videos
  createVideoUploadMiddleware(folder = 'videos') {
    const videoFilter = (req, file, cb) => {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed!'), false);
      }
    };
    return this.createUploadMiddleware(folder, videoFilter);
  }

  // For images
  createImageUploadMiddleware(folder = 'images') {
    const imageFilter = (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    };
    return this.createUploadMiddleware(folder, imageFilter);
  }

  // For documents and files in group chat
  createChatFileUploadMiddleware(folder = 'chat-files') {
    const chatFileFilter = (req, file, cb) => {
      const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const allowedDocs = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv'
      ];
      
      if (allowedImages.includes(file.mimetype) || allowedDocs.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
      }
    };
    return this.createUploadMiddleware(folder, chatFileFilter);
  }

  // For reading materials
  createMaterialUploadMiddleware(folder = 'materials') {
    return this.createUploadMiddleware(folder);
  }

  // For discussions
  createDiscussionUploadMiddleware(folder = 'discussions') {
    const imageFilter = (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    };
    return this.createUploadMiddleware(folder, imageFilter);
  }

  // For signatures
  createSignatureUploadMiddleware(folder = 'signatures') {
    const signatureFilter = (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, JPEG, and PNG files are allowed for signatures!'), false);
      }
    };
    return this.createUploadMiddleware(folder, signatureFilter);
  }
}

module.exports = S3Service;