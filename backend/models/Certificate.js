const mongoose = require('mongoose');
const crypto = require('crypto');

const certificateSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    index: true 
  },
  section: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Section', 
    required: true,
    index: true 
  },
  
  // Certificate status
  status: { 
    type: String, 
    enum: ['locked', 'available', 'downloaded'], 
    default: 'locked' 
  },
  
  // Marks calculation (percentage from all passed unit quizzes)
  totalQuizzes: { type: Number, default: 0 },
  passedQuizzes: { type: Number, default: 0 },
  marksPercentage: { type: Number, default: 0 }, // Stored at activation time
  
  // Activation details
  activatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // HOD who activated
  },
  activatedAt: { type: Date },
  
  // Download tracking
  downloadedAt: { type: Date },
  downloadCount: { type: Number, default: 0 },
  
  // Signatures (references)
  hodSignature: { type: String }, // URL to HOD signature (verified by)
  deanSignature: { type: String }, // URL to Dean signature (approved by)
  registrarSignature: { type: String }, // URL to AAST Registrar signature (prepared by)
  
  // Certificate metadata
  certificateNumber: { type: String, unique: true, sparse: true },
  issueDate: { type: Date },
  
  // Lock progress after activation
  progressLocked: { type: Boolean, default: false },
  
  // Verification & Authenticity
  verificationHash: { type: String, unique: true, sparse: true }, // SHA-256 hash for verification
  qrCodeData: { type: String }, // QR code data URL
  verificationUrl: { type: String }, // Public verification URL
  isRevoked: { type: Boolean, default: false }, // For revoked certificates
  revokedAt: { type: Date },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revocationReason: { type: String },
  
  // Blockchain-style integrity
  previousHash: { type: String }, // Hash of previous certificate for chain integrity
  blockNumber: { type: Number }, // Sequential block number
  
  // Public verification data (anonymized for public display)
  publicVerificationData: {
    studentName: { type: String },
    courseName: { type: String },
    issueDate: { type: Date },
    certificateNumber: { type: String },
    marksPercentage: { type: Number }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
certificateSchema.index({ student: 1, course: 1, section: 1 }, { unique: true });
certificateSchema.index({ status: 1 });
certificateSchema.index({ course: 1, section: 1 });

// Generate unique certificate number before saving
certificateSchema.pre('save', async function(next) {
  if (this.isNew && !this.certificateNumber) {
    // Format: SGTLMS-YYYY-XXXXXX (e.g., SGTLMS-2025-000001)
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    const blockNumber = count + 1;
    this.certificateNumber = `SGTLMS-${year}-${String(blockNumber).padStart(6, '0')}`;
    this.blockNumber = blockNumber;
    
    // Generate verification hash
    const hashData = {
      certificateNumber: this.certificateNumber,
      student: this.student.toString(),
      course: this.course.toString(),
      issueDate: this.issueDate || new Date(),
      marksPercentage: this.marksPercentage,
      blockNumber: this.blockNumber
    };
    
    // Get previous certificate's hash for chain integrity
    const previousCert = await this.constructor.findOne()
      .sort({ blockNumber: -1 })
      .select('verificationHash');
    
    if (previousCert) {
      this.previousHash = previousCert.verificationHash;
      hashData.previousHash = this.previousHash;
    }
    
    // Create SHA-256 hash
    const hashString = JSON.stringify(hashData);
    this.verificationHash = crypto
      .createHash('sha256')
      .update(hashString)
      .digest('hex');
    
    // Create verification URL
    this.verificationUrl = `${process.env.FRONTEND_URL}/verify-certificate/${this.verificationHash}`;
  }
  next();
});

// Method to verify certificate integrity
certificateSchema.methods.verifyIntegrity = function() {
  const hashData = {
    certificateNumber: this.certificateNumber,
    student: this.student.toString(),
    course: this.course.toString(),
    issueDate: this.issueDate,
    marksPercentage: this.marksPercentage,
    blockNumber: this.blockNumber
  };
  
  if (this.previousHash) {
    hashData.previousHash = this.previousHash;
  }
  
  const hashString = JSON.stringify(hashData);
  const computedHash = crypto
    .createHash('sha256')
    .update(hashString)
    .digest('hex');
  
  return computedHash === this.verificationHash;
};

module.exports = mongoose.model('Certificate', certificateSchema);
