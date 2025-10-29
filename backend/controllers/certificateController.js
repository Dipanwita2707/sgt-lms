const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const Section = require('../models/Section');
const User = require('../models/User');
const Department = require('../models/Department');
const School = require('../models/School');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProgress = require('../models/StudentProgress');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// HOD: Upload signature for department
exports.uploadSignature = async (req, res) => {
  try {
    const userId = req.user.id;
    const signatureType = req.body.signatureType || 'hod'; // 'hod' or 'registrar'
    
    console.log('[uploadSignature] User ID:', userId);
    console.log('[uploadSignature] Signature Type:', signatureType);
    console.log('[uploadSignature] File:', req.file);
    console.log('[uploadSignature] Body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No signature file uploaded' });
    }

    // Update user's signature URL based on type
    const signatureUrl = `/uploads/signatures/${req.file.filename}`;
    const updateField = signatureType === 'registrar' ? 'registrarSignatureUrl' : 'signatureUrl';
    
    console.log('[uploadSignature] Update Field:', updateField);
    console.log('[uploadSignature] Signature URL:', signatureUrl);
    
    const updateResult = await User.findByIdAndUpdate(
      userId, 
      { [updateField]: signatureUrl },
      { new: true }
    );
    
    console.log('[uploadSignature] Updated User:', updateResult?.email, updateResult?.signatureUrl, updateResult?.registrarSignatureUrl);

    const responseData = { 
      message: `${signatureType === 'registrar' ? 'Sub-Register (Exam)' : 'HOD'} signature uploaded successfully`
    };
    
    if (signatureType === 'registrar') {
      responseData.registrarSignatureUrl = signatureUrl;
      responseData.hasRegistrarSignature = true;
    } else {
      responseData.signatureUrl = signatureUrl;
      responseData.hasSignature = true;
    }

    console.log('[uploadSignature] Response Data:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Upload signature error:', error);
    res.status(500).json({ message: error.message });
  }
};

// HOD: Get signature status
exports.getSignatureStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('signatureUrl registrarSignatureUrl');
    
    res.json({ 
      hasSignature: !!user.signatureUrl,
      signatureUrl: user.signatureUrl,
      hasRegistrarSignature: !!user.registrarSignatureUrl,
      registrarSignatureUrl: user.registrarSignatureUrl
    });
  } catch (error) {
    console.error('Get signature status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// HOD: Activate certificates for a course-section
exports.activateCertificates = async (req, res) => {
  try {
    const { courseId, sectionId } = req.body;
    const hodId = req.user.id;

    // Verify HOD has permission for this course
    const course = await Course.findById(courseId)
      .populate('school')
      .populate('department');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const hod = await User.findById(hodId).populate('department');
    
    // Check if HOD belongs to the course's department
    if (course.department.toString() !== hod.department.toString()) {
      return res.status(403).json({ 
        message: 'You do not have permission to activate certificates for this course' 
      });
    }

    // Check if HOD has uploaded both signatures
    if (!hod.signatureUrl) {
      return res.status(400).json({ 
        message: 'Please upload your HOD digital signature before activating certificates' 
      });
    }

    if (!hod.registrarSignatureUrl) {
      return res.status(400).json({ 
        message: 'Please upload the Sub-Register (Exam) signature before activating certificates' 
      });
    }

    // Get section to verify it exists
    const section = await Section.findById(sectionId);
    
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Get students assigned to this section who are enrolled in this course
    const enrolledStudents = await User.find({
      role: 'student',
      assignedSections: sectionId
    }).select('_id name email').lean();

    console.log(`📋 Found ${enrolledStudents.length} students assigned to section ${sectionId}`);

    if (enrolledStudents.length === 0) {
      return res.status(400).json({ 
        message: 'No students assigned to this section' 
      });
    }

    // Get all student IDs - we'll activate certificates for all assigned students
    // even if they haven't started the course yet (they'll get 0% marks)
    const studentIds = enrolledStudents.map(s => s._id);

    console.log(`🎯 Activating certificates for ${studentIds.length} students`);
    enrolledStudents.forEach(student => {
      console.log(`  📄 ${student.name} (${student.email})`);
    });

    console.log(`\n🔍 Checking for Dean signature for school: ${course.school._id}...`);

    // Get Dean signature (from school)
    const dean = await User.findOne({ 
      role: 'dean',
      school: course.school._id 
    }).select('signatureUrl name email');

    console.log(`  Dean found: ${!!dean}`);
    if (dean) {
      console.log(`  Dean name: ${dean.name}, email: ${dean.email}`);
      console.log(`  Has signature: ${!!dean.signatureUrl}`);
    }

    if (!dean || !dean.signatureUrl) {
      console.log(`❌ Dean signature check failed - returning error to client`);
      return res.status(400).json({ 
        message: 'Dean signature not found. Please ensure the Dean has uploaded their signature.' 
      });
    }

    console.log(`✅ Dean signature verified`);

    // Use HOD's uploaded registrar signature
    const registrarSignature = hod.registrarSignatureUrl;

    console.log(`\n🚀 Starting certificate creation for ${studentIds.length} students...`);

    // Process each student in the section
    const results = {
      activated: 0,
      failed: 0,
      errors: []
    };

    for (const studentId of studentIds) {
      try {
        console.log(`\n🔄 Processing student: ${studentId}`);
        
        // Calculate marks from unit quizzes
        const quizzes = await Quiz.find({ 
          course: courseId,
          unit: { $exists: true }
        });

        console.log(`  📚 Found ${quizzes.length} total quizzes for course`);

        const attempts = await QuizAttempt.find({
          student: studentId,
          quiz: { $in: quizzes.map(q => q._id) },
          passed: true
        });

        console.log(`  ✅ Found ${attempts.length} passed quiz attempts for student`);

        const totalQuizzes = quizzes.length;
        const passedQuizzes = attempts.length;
        const marksPercentage = totalQuizzes > 0 
          ? ((passedQuizzes / totalQuizzes) * 100).toFixed(2) 
          : 0;

        console.log(`  📊 Marks calculation: ${passedQuizzes}/${totalQuizzes} = ${marksPercentage}%`);

        // Fetch student and course details for public verification
        const student = await User.findById(studentId).select('name');
        const courseDetails = await Course.findById(courseId).select('title');

        if (!student) {
          console.log(`  ❌ Student not found: ${studentId}`);
          throw new Error(`Student not found: ${studentId}`);
        }

        console.log(`  👤 Student: ${student.name}`);
        console.log(`  📖 Course: ${courseDetails.title}`);

        // Create or update certificate
        const certificateData = {
          student: studentId,
          course: courseId,
          section: sectionId,
          status: 'available',
          totalQuizzes,
          passedQuizzes,
          marksPercentage,
          activatedBy: hodId,
          activatedAt: new Date(),
          hodSignature: hod.signatureUrl,
          deanSignature: dean.signatureUrl,
          registrarSignature: registrarSignature,
          progressLocked: true,
          issueDate: new Date(),
          publicVerificationData: {
            studentName: student.name,
            courseName: courseDetails.title,
            issueDate: new Date(),
            marksPercentage
          }
        };

        console.log(`  💾 Creating/updating certificate...`);

        const certificate = await Certificate.findOneAndUpdate(
          { student: studentId, course: courseId, section: sectionId },
          certificateData,
          { upsert: true, new: true }
        );

        console.log(`  ✅ Certificate created/updated: ${certificate._id}`);

        // Ensure certificate number and verification hash are generated
        if (!certificate.certificateNumber || !certificate.verificationHash) {
          console.log(`  🔢 Generating certificate number and hash...`);
          // Trigger the pre-save hook by explicitly saving
          await certificate.save();
          console.log(`  ✅ Certificate number: ${certificate.certificateNumber}`);
        }

        // Generate QR code for verification
        if (certificate.verificationHash) {
          console.log(`  📱 Generating QR code...`);
          const qrCodeDataURL = await QRCode.toDataURL(certificate.verificationUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 200,
            margin: 2
          });
          
          certificate.qrCodeData = qrCodeDataURL;
          await certificate.save();
          console.log(`  ✅ QR code generated`);
        }

        results.activated++;
        console.log(`  ✅ Certificate activation complete for ${student.name}`);
      } catch (err) {
        console.error(`  ❌ Error activating certificate for student ${studentId}:`, err);
        results.failed++;
        results.errors.push({
          studentId,
          error: err.message
        });
      }
    }

    console.log(`\n📊 ACTIVATION SUMMARY:`);
    console.log(`  ✅ Activated: ${results.activated}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    if (results.errors.length > 0) {
      console.log(`  🔍 Errors:`);
      results.errors.forEach(err => {
        console.log(`    - Student ${err.studentId}: ${err.error}`);
      });
    }

    res.json({
      message: `Certificates activated for ${results.activated} students`,
      results
    });

  } catch (error) {
    console.error('Activate certificates error:', error);
    res.status(500).json({ message: error.message });
  }
};

// HOD: Get certificate activation status for courses
exports.getCertificateStatus = async (req, res) => {
  try {
    const { courseId, sectionId } = req.query;
    const hodId = req.user.id;

    // Get students assigned to this section (all students, regardless of progress)
    const enrolledStudents = await User.find({
      role: 'student',
      assignedSections: sectionId
    }).select('_id').lean();

    const totalStudents = enrolledStudents.length;

    // Get existing certificates
    const certificates = await Certificate.find({
      course: courseId,
      section: sectionId
    }).populate('student', 'name regNo uid');

    const activatedCount = certificates.filter(c => c.status !== 'locked').length;
    const downloadedCount = certificates.filter(c => c.status === 'downloaded').length;

    res.json({
      totalStudents,
      activatedCount,
      downloadedCount,
      isActivated: activatedCount > 0,
      certificates: certificates.map(c => ({
        student: c.student,
        status: c.status,
        marksPercentage: c.marksPercentage,
        activatedAt: c.activatedAt,
        downloadedAt: c.downloadedAt
      }))
    });

  } catch (error) {
    console.error('Get certificate status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Student: Get available certificates
exports.getStudentCertificates = async (req, res) => {
  try {
    const studentId = req.user.id;

    console.log('🔍 Fetching certificates for student:', studentId);

    // Debug: Check student details
    const student = await User.findById(studentId).select('name email assignedSections');
    console.log('Student details:', {
      name: student?.name,
      email: student?.email,
      assignedSections: student?.assignedSections
    });

    // Find all certificates for this student (any status)
    const allCertificates = await Certificate.find({
      student: studentId
    }).lean();
    console.log('All certificates for student:', allCertificates.length);

    // Find available/downloaded certificates
    const certificates = await Certificate.find({
      student: studentId,
      status: { $in: ['available', 'downloaded'] }
    })
    .populate('course', 'title courseCode')
    .populate('section', 'name');

    console.log('Available/downloaded certificates:', certificates.length);

    res.json({ certificates });

  } catch (error) {
    console.error('Get student certificates error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Student: Download certificate PDF
exports.downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const studentId = req.user.id;

    const certificate = await Certificate.findById(certificateId)
      .populate('student', 'name regNo uid')
      .populate('course', 'title courseCode')
      .populate('section', 'name')
      .populate({
        path: 'course',
        populate: {
          path: 'school department',
          select: 'name code'
        }
      });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (certificate.student._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (certificate.status === 'locked') {
      return res.status(400).json({ 
        message: 'Certificate not yet available. Please contact your HOD.' 
      });
    }

    // ✅ RECALCULATE CURRENT MARKS IN REAL-TIME
    console.log('🔄 Recalculating current marks for certificate download...');
    
    // Get all quizzes for this course
    const quizzes = await Quiz.find({ 
      course: certificate.course._id,
      status: 'active'
    });
    
    console.log(`📚 Found ${quizzes.length} active quizzes for course`);
    
    let currentMarksPercentage = 0;
    
    if (quizzes.length > 0) {
      // Get all quiz attempts for this student in this course
      const attempts = await QuizAttempt.find({
        student: studentId,
        quiz: { $in: quizzes.map(q => q._id) },
        status: 'completed'
      }).sort({ score: -1 }); // Sort by score descending
      
      console.log(`📝 Found ${attempts.length} quiz attempts`);
      
      // Get best attempt per quiz
      const bestAttempts = {};
      attempts.forEach(attempt => {
        const quizId = attempt.quiz.toString();
        if (!bestAttempts[quizId] || attempt.score > bestAttempts[quizId].score) {
          bestAttempts[quizId] = attempt;
        }
      });
      
      // Count passed quizzes (70% or higher)
      const passedQuizzes = Object.values(bestAttempts).filter(
        attempt => (attempt.score / attempt.totalQuestions) * 100 >= 70
      );
      
      // Calculate percentage
      currentMarksPercentage = ((passedQuizzes.length / quizzes.length) * 100).toFixed(2);
      
      console.log(`✅ Passed ${passedQuizzes.length}/${quizzes.length} quizzes = ${currentMarksPercentage}%`);
    }

    // Update certificate with current marks (permanent fix)
    certificate.marksPercentage = currentMarksPercentage;
    certificate.status = 'downloaded';
    certificate.downloadedAt = new Date();
    certificate.downloadCount += 1;
    await certificate.save();

    // Generate PDF - SINGLE PAGE DESIGN
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      bufferPages: true
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.certificateNumber}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Decorative Border
    doc.rect(25, 25, pageWidth - 50, pageHeight - 50)
       .lineWidth(2)
       .stroke('#1976d2');
    doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
       .lineWidth(0.5)
       .stroke('#1976d2');

    // Header
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('#1976d2')
       .text('SGT UNIVERSITY', 0, 60, { align: 'center' });

    doc.fontSize(20)
       .fillColor('#333333')
       .text('Certificate of Completion', 0, 100, { align: 'center' });

    // Certificate Number and Date in header
    doc.fontSize(9)
       .fillColor('#666666')
       .font('Helvetica')
       .text(`Certificate No: ${certificate.certificateNumber}`, 0, 130, { align: 'center' });

    const issueDate = new Date(certificate.issueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.fontSize(9)
       .text(`Issue Date: ${issueDate}`, 0, 145, { align: 'center' });

    // Main Content - Compact
    doc.fontSize(12)
       .fillColor('#000000')
       .text('This is to certify that', 0, 185, { align: 'center' });

    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#1976d2')
       .text(certificate.student.name.toUpperCase(), 0, 210, { align: 'center' });

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666666')
       .text(`Reg. No: ${certificate.student.regNo || certificate.student.uid}`, 0, 238, { align: 'center' });

    doc.fontSize(12)
       .fillColor('#000000')
       .text('has successfully completed the course', 0, 265, { align: 'center' });

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#333333')
       .text(`${certificate.course.title}`, 0, 290, { align: 'center', width: pageWidth });

    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#666666')
       .text(`(${certificate.course.courseCode})`, 0, 315, { align: 'center' });

    doc.fontSize(10)
       .text(`${certificate.course.school?.name || 'School'} - ${certificate.course.department?.name || 'Department'}`, 0, 335, { align: 'center' });

    doc.fontSize(12)
       .fillColor('#000000')
       .text(`with ${certificate.marksPercentage}% marks`, 0, 360, { align: 'center' });

    // Signatures - Compact layout
    const signatureY = 410;

    // Registrar
    if (certificate.registrarSignature) {
      const registrarPath = path.join(__dirname, '..', certificate.registrarSignature);
      if (fs.existsSync(registrarPath)) {
        doc.image(registrarPath, 60, signatureY, { width: 60, height: 30 });
      }
    }
    doc.fontSize(8)
       .fillColor('#000000')
       .font('Helvetica')
       .text('_______________', 50, signatureY + 35)
       .text('Registrar', 50, signatureY + 48, { width: 80, align: 'center' });

    // HOD
    if (certificate.hodSignature) {
      const hodPath = path.join(__dirname, '..', certificate.hodSignature);
      if (fs.existsSync(hodPath)) {
        doc.image(hodPath, pageWidth / 2 - 30, signatureY, { width: 60, height: 30 });
      }
    }
    doc.text('_______________', pageWidth / 2 - 40, signatureY + 35)
       .text('HOD', pageWidth / 2 - 40, signatureY + 48, { width: 80, align: 'center' });

    // Dean
    if (certificate.deanSignature) {
      const deanPath = path.join(__dirname, '..', certificate.deanSignature);
      if (fs.existsSync(deanPath)) {
        doc.image(deanPath, pageWidth - 120, signatureY, { width: 60, height: 30 });
      }
    }
    doc.text('_______________', pageWidth - 130, signatureY + 35)
       .text('Dean', pageWidth - 130, signatureY + 48, { width: 80, align: 'center' });

    // QR Code and Verification Section - Footer
    const footerY = 520;
    const qrSize = 80;
    
    // QR Code
    if (certificate.qrCodeData) {
      doc.image(certificate.qrCodeData, 45, footerY, { width: qrSize, height: qrSize });
    }
    
    // Verification details beside QR
    const verifyX = 140;
    doc.fontSize(8)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text('Verify Certificate Authenticity', verifyX, footerY + 5);
    
    doc.fontSize(7)
       .fillColor('#666666')
       .font('Helvetica')
       .text(`Certificate Number: ${certificate.certificateNumber}`, verifyX, footerY + 20)
       .text(`Verification Hash:`, verifyX, footerY + 32)
       .fontSize(6)
       .text(certificate.verificationHash?.substring(0, 45) || 'N/A', verifyX, footerY + 42)
       .text(certificate.verificationHash?.substring(45, 64) || '', verifyX, footerY + 50);
    
    // Verification URL
    doc.fontSize(7)
       .fillColor('#1976d2')
       .font('Helvetica-Bold')
       .text('Verify Online: ', verifyX, footerY + 62, { continued: true })
       .fillColor('#0066cc')
       .text(certificate.verificationUrl || 'N/A', {
         link: certificate.verificationUrl,
         underline: true
       });

    // Scan instruction
    doc.fontSize(7)
       .fillColor('#666666')
       .font('Helvetica')
       .text('← Scan QR to verify', 45, footerY + qrSize + 5, { width: qrSize, align: 'center' });

    // Bottom disclaimer
    doc.fontSize(6)
       .fillColor('#999999')
       .font('Helvetica')
       .text('This certificate is digitally signed and can be verified at the URL above or by scanning the QR code.', 40, pageHeight - 30, { 
         align: 'center',
         width: pageWidth - 80
       });

    // Finalize PDF - SINGLE PAGE ONLY
    doc.end();

  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Public certificate verification by hash (NO AUTH REQUIRED)
exports.verifyCertificate = async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!hash || hash.length !== 64) {
      return res.status(400).json({ 
        valid: false,
        message: 'Invalid verification hash format' 
      });
    }

    const certificate = await Certificate.findOne({ 
      verificationHash: hash,
      isRevoked: false 
    })
      .select('certificateNumber issueDate publicVerificationData blockNumber previousHash verificationHash isRevoked')
      .lean();

    if (!certificate) {
      return res.status(404).json({ 
        valid: false,
        message: 'Certificate not found or has been revoked' 
      });
    }

    // Verify integrity
    const certDoc = await Certificate.findOne({ verificationHash: hash });
    const integrityValid = certDoc.verifyIntegrity();

    res.json({
      valid: true,
      verified: integrityValid,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.publicVerificationData.studentName,
        courseName: certificate.publicVerificationData.courseName,
        marksPercentage: certificate.publicVerificationData.marksPercentage,
        issueDate: certificate.publicVerificationData.issueDate,
        blockNumber: certificate.blockNumber,
        verificationHash: certificate.verificationHash
      },
      message: integrityValid 
        ? 'Certificate is authentic and valid' 
        : 'Warning: Certificate data integrity check failed'
    });

  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Verification service error' 
    });
  }
};

// Public certificate verification by certificate number (NO AUTH REQUIRED)
exports.verifyCertificateByNumber = async (req, res) => {
  try {
    const { certificateNumber } = req.params;
    
    if (!certificateNumber) {
      return res.status(400).json({ 
        valid: false,
        message: 'Certificate number is required' 
      });
    }

    const certificate = await Certificate.findOne({ 
      certificateNumber,
      isRevoked: false 
    })
      .select('certificateNumber issueDate publicVerificationData blockNumber verificationHash verificationUrl isRevoked')
      .lean();

    if (!certificate) {
      return res.status(404).json({ 
        valid: false,
        message: 'Certificate not found or has been revoked' 
      });
    }

    // Verify integrity
    const certDoc = await Certificate.findOne({ certificateNumber });
    const integrityValid = certDoc.verifyIntegrity();

    res.json({
      valid: true,
      verified: integrityValid,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.publicVerificationData.studentName,
        courseName: certificate.publicVerificationData.courseName,
        marksPercentage: certificate.publicVerificationData.marksPercentage,
        issueDate: certificate.publicVerificationData.issueDate,
        blockNumber: certificate.blockNumber,
        verificationHash: certificate.verificationHash,
        verificationUrl: certificate.verificationUrl
      },
      message: integrityValid 
        ? 'Certificate is authentic and valid' 
        : 'Warning: Certificate data integrity check failed'
    });

  } catch (error) {
    console.error('Verify certificate by number error:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Verification service error' 
    });
  }
};

// Admin: Revoke a certificate
exports.revokeCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    const certificate = await Certificate.findById(certificateId);
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (certificate.isRevoked) {
      return res.status(400).json({ message: 'Certificate is already revoked' });
    }

    certificate.isRevoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedBy = adminId;
    certificate.revocationReason = reason || 'No reason provided';
    
    await certificate.save();

    res.json({
      message: 'Certificate revoked successfully',
      certificate: {
        certificateNumber: certificate.certificateNumber,
        revokedAt: certificate.revokedAt,
        revocationReason: certificate.revocationReason
      }
    });

  } catch (error) {
    console.error('Revoke certificate error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get certificate chain integrity status (for auditing)
exports.getCertificateChainStatus = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .sort({ blockNumber: 1 })
      .select('certificateNumber blockNumber verificationHash previousHash');

    let brokenChain = [];
    let validChain = true;

    for (let i = 1; i < certificates.length; i++) {
      const current = certificates[i];
      const previous = certificates[i - 1];
      
      if (current.previousHash !== previous.verificationHash) {
        validChain = false;
        brokenChain.push({
          blockNumber: current.blockNumber,
          certificateNumber: current.certificateNumber,
          expectedHash: previous.verificationHash,
          actualHash: current.previousHash
        });
      }
    }

    res.json({
      totalCertificates: certificates.length,
      chainValid: validChain,
      brokenLinks: brokenChain.length,
      brokenChain: brokenChain.length > 0 ? brokenChain : null,
      message: validChain 
        ? 'Certificate chain integrity verified' 
        : `Chain integrity compromised at ${brokenChain.length} point(s)`
    });

  } catch (error) {
    console.error('Get chain status error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = exports;
