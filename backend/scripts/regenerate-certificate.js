require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

// Import models
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const UnitQuizAttempt = require('../models/UnitQuizAttempt');
const Unit = require('../models/Unit');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI not found in environment variables');
    }
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// Generate verification hash
const crypto = require('crypto');
const generateVerificationHash = (certificateData) => {
  const dataString = JSON.stringify({
    student: certificateData.student,
    course: certificateData.course,
    section: certificateData.section,
    marks: certificateData.marks,
    issueDate: certificateData.issueDate,
    certificateNumber: certificateData.certificateNumber,
    previousHash: certificateData.previousHash || '0'
  });
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

// Generate QR code
const QRCode = require('qrcode');
const generateQRCode = async (verificationUrl) => {
  try {
    return await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Main function
async function regenerateCertificate(studentEmail, courseCode, sectionName) {
  try {
    await connectDB();

    console.log('\n🔍 Searching for student, course, and section...\n');

    // Find student
    const student = await User.findOne({ email: studentEmail, role: 'student' });
    if (!student) {
      throw new Error(`Student not found: ${studentEmail}`);
    }
    console.log(`✓ Found student: ${student.name} (${student.email})`);

    // Find course
    const course = await Course.findOne({ courseCode: courseCode });
    if (!course) {
      throw new Error(`Course not found: ${courseCode}`);
    }
    console.log(`✓ Found course: ${course.name} (${course.courseCode})`);

    // Find section
    const section = await Section.findOne({ name: sectionName, course: course._id });
    if (!section) {
      throw new Error(`Section not found: ${sectionName}`);
    }
    console.log(`✓ Found section: ${section.name}`);

    // Calculate current marks
    console.log('\n📊 Calculating quiz performance...\n');
    
    const units = await Unit.find({ course: course._id });
    const unitIds = units.map(u => u._id);
    
    const attempts = await UnitQuizAttempt.find({
      student: student._id,
      unit: { $in: unitIds }
    }).sort({ createdAt: -1 });

    const passedQuizzes = new Set();
    attempts.forEach(attempt => {
      if (attempt.passed && !passedQuizzes.has(attempt.unit.toString())) {
        passedQuizzes.add(attempt.unit.toString());
      }
    });

    const totalQuizzes = unitIds.length;
    const passedCount = passedQuizzes.size;
    const marks = totalQuizzes > 0 ? ((passedCount / totalQuizzes) * 100).toFixed(2) : 0;

    console.log(`   Total quizzes: ${totalQuizzes}`);
    console.log(`   Passed quizzes: ${passedCount}`);
    console.log(`   Marks: ${marks}%`);

    // Delete existing certificate
    console.log('\n🗑️  Deleting old certificate...\n');
    const deleteResult = await Certificate.deleteOne({
      student: student._id,
      course: course._id,
      section: section._id
    });
    console.log(`   Deleted ${deleteResult.deletedCount} certificate(s)`);

    // Get previous certificate for blockchain
    const previousCert = await Certificate.findOne()
      .sort({ blockNumber: -1 })
      .select('verificationHash blockNumber');

    const blockNumber = previousCert ? previousCert.blockNumber + 1 : 1;
    const previousHash = previousCert ? previousCert.verificationHash : '0';

    // Generate certificate number
    const year = new Date().getFullYear();
    const sequenceNumber = String(blockNumber).padStart(6, '0');
    const certificateNumber = `SGTLMS-${year}-${sequenceNumber}`;

    // Create new certificate data
    const certificateData = {
      student: student._id,
      course: course._id,
      section: section._id,
      marks: parseFloat(marks),
      issueDate: new Date(),
      certificateNumber: certificateNumber,
      blockNumber: blockNumber,
      previousHash: previousHash,
      status: 'issued'
    };

    // Generate verification hash
    const verificationHash = generateVerificationHash(certificateData);
    certificateData.verificationHash = verificationHash;

    // Generate verification URL
    const baseUrl = process.env.FRONTEND_URL;
    const verificationUrl = `${baseUrl}/verify-certificate/${verificationHash}`;
    certificateData.verificationUrl = verificationUrl;

    // Generate QR code
    const qrCodeData = await generateQRCode(verificationUrl);
    certificateData.qrCodeData = qrCodeData;

    // Set public verification data
    certificateData.publicVerificationData = {
      studentName: student.name,
      studentRegNo: student.regNo,
      courseName: course.name,
      courseCode: course.courseCode,
      marks: parseFloat(marks),
      issueDate: certificateData.issueDate
    };

    // Create new certificate
    console.log('\n✨ Creating new certificate...\n');
    const newCertificate = await Certificate.create(certificateData);

    console.log('✅ Certificate regenerated successfully!\n');
    console.log('📋 Certificate Details:');
    console.log(`   Certificate Number: ${newCertificate.certificateNumber}`);
    console.log(`   Verification Hash: ${newCertificate.verificationHash.substring(0, 20)}...`);
    console.log(`   Block Number: ${newCertificate.blockNumber}`);
    console.log(`   Marks: ${newCertificate.marks}%`);
    console.log(`   Issue Date: ${newCertificate.issueDate.toISOString()}`);
    console.log(`   Verification URL: ${newCertificate.verificationUrl}`);
    console.log(`   QR Code: Generated ✓`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
const studentEmail = process.argv[2] || 'pawan@gmail.com';
const courseCode = process.argv[3] || 'C000001';
const sectionName = process.argv[4] || 'k22yg';

console.log('🔄 Regenerating Certificate');
console.log('============================');
console.log(`Student: ${studentEmail}`);
console.log(`Course: ${courseCode}`);
console.log(`Section: ${sectionName}`);

regenerateCertificate(studentEmail, courseCode, sectionName);
