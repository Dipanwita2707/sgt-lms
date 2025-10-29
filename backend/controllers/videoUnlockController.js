const VideoUnlockRequest = require('../models/VideoUnlockRequest');
const User = require('../models/User');
const Video = require('../models/Video');
const Unit = require('../models/Unit');
const Course = require('../models/Course');
const Section = require('../models/Section');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');

// ============ TEACHER UNLOCK REQUEST FUNCTIONS ============

// Create a new video unlock request
exports.createUnlockRequest = async (req, res) => {
  try {
    const { studentId, videoId, unitId, courseId, sectionId, reason, priority, unlockDuration, teacherComments } = req.body;
    const teacherId = req.user._id;

    console.log('🔓 Creating video unlock request:', { teacherId, studentId, videoId });

    // Validate required fields
    if (!studentId || !videoId || !unitId || !courseId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Student, video, unit, course, and reason are required'
      });
    }

    // Check if student exists and is actually a student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if unit exists
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if section exists (if provided)
    let section = null;
    if (sectionId) {
      section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }
    }

    // Check if there's already a pending or approved request for this student-video combination
    const existingRequest = await VideoUnlockRequest.findOne({
      student: studentId,
      video: videoId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(409).json({
          success: false,
          message: 'A pending unlock request already exists for this student and video'
        });
      } else if (existingRequest.status === 'approved' && existingRequest.isUnlockActive()) {
        return res.status(409).json({
          success: false,
          message: 'Video is already unlocked for this student',
          unlockExpiresAt: existingRequest.unlockExpiresAt
        });
      }
    }

    // Create the unlock request
    const unlockRequest = new VideoUnlockRequest({
      teacher: teacherId,
      student: studentId,
      video: videoId,
      unit: unitId,
      course: courseId,
      section: sectionId,
      reason: reason.trim(),
      priority: priority || 'medium',
      unlockDuration: unlockDuration || 72,
      teacherComments: teacherComments?.trim()
    });

    await unlockRequest.save();

    // Populate the response
    await unlockRequest.populate([
      { path: 'student', select: 'name email regNo' },
      { path: 'video', select: 'title duration' },
      { path: 'unit', select: 'title order' },
      { path: 'course', select: 'title courseCode' },
      { path: 'section', select: 'name' }
    ]);

    console.log('✅ Video unlock request created successfully');

    res.status(201).json({
      success: true,
      message: 'Video unlock request created successfully',
      request: unlockRequest
    });

  } catch (error) {
    console.error('❌ Error creating unlock request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create unlock request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get teacher's unlock requests
exports.getTeacherUnlockRequests = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { status, courseId, limit = 50, page = 1 } = req.query;

    console.log('📋 Getting teacher unlock requests:', { teacherId, status, courseId });

    // Build filter
    const filters = {};
    if (status) filters.status = status;
    if (courseId) filters.course = courseId;

    const requests = await VideoUnlockRequest.getTeacherRequests(teacherId, filters);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRequests = requests.slice(startIndex, endIndex);

    console.log(`✅ Found ${requests.length} requests for teacher`);

    res.json({
      success: true,
      requests: paginatedRequests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(requests.length / limit),
        count: paginatedRequests.length,
        totalRequests: requests.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting teacher unlock requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unlock requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get students for teacher (for unlock request dropdown)
exports.getTeacherStudents = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { courseId, sectionId } = req.query;

    console.log('👥 Getting students for teacher:', { teacherId, courseId, sectionId });

    let students = [];

    if (sectionId) {
      // Get students from specific section using assignedSections
      students = await User.find({
        role: 'student',
        assignedSections: sectionId
      }).select('name email regNo assignedSections');
      
      console.log(`   Found ${students.length} students in section ${sectionId}`);
    } else if (courseId) {
      // Get students from all sections that have this course
      const teacherAssignments = await SectionCourseTeacher.find({ 
        teacher: teacherId,
        course: courseId 
      }).populate('section');
      
      const sectionIds = teacherAssignments.map(assignment => assignment.section._id);
      
      students = await User.find({
        role: 'student',
        assignedSections: { $in: sectionIds }
      }).select('name email regNo assignedSections');
      
      console.log(`   Found ${students.length} students in sections for course ${courseId}`);
    } else {
      // Get all students from sections where this teacher teaches
      const teacherAssignments = await SectionCourseTeacher.find({ teacher: teacherId })
        .populate('section');
      
      if (teacherAssignments.length === 0) {
        console.log('   ⚠️ Teacher has no section assignments');
        return res.json({
          success: true,
          students: []
        });
      }
      
      const sectionIds = [...new Set(teacherAssignments.map(assignment => assignment.section._id))];
      console.log(`   Teacher assigned to ${sectionIds.length} sections`);
      
      // Get students from these sections using assignedSections field
      students = await User.find({
        role: 'student',
        assignedSections: { $in: sectionIds }
      }).select('name email regNo assignedSections');
      
      console.log(`   Found ${students.length} students across teacher's sections`);
    }

    console.log(`✅ Found ${students.length} students`);

    res.json({
      success: true,
      students: students.sort((a, b) => a.name.localeCompare(b.name))
    });

  } catch (error) {
    console.error('❌ Error getting teacher students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get students',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Cancel a pending unlock request
exports.cancelUnlockRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const teacherId = req.user._id;

    console.log('❌ Canceling unlock request:', { requestId, teacherId });

    const request = await VideoUnlockRequest.findOne({
      _id: requestId,
      teacher: teacherId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Pending unlock request not found'
      });
    }

    // Soft delete by marking as expired
    request.status = 'expired';
    await request.save();

    console.log('✅ Unlock request canceled successfully');

    res.json({
      success: true,
      message: 'Unlock request canceled successfully'
    });

  } catch (error) {
    console.error('❌ Error canceling unlock request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel unlock request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============ HOD APPROVAL FUNCTIONS ============

// Get pending requests for HOD approval
exports.getPendingRequestsForHOD = async (req, res) => {
  try {
    const hodId = req.user._id;
    const { priority, courseId, teacherId, departmentId, limit = 50, page = 1 } = req.query;

    console.log('📋 Getting pending requests for HOD:', { hodId, priority, courseId, departmentId });

    // Get HOD's departments
    const User = require('../models/User');
    const hodUser = await User.findById(hodId).populate('departments department');
    
    if (!hodUser) {
      return res.status(404).json({
        success: false,
        message: 'HOD user not found'
      });
    }

    // Get all departments the HOD manages
    let hodDepartments = [];
    if (hodUser.departments && Array.isArray(hodUser.departments)) {
      hodDepartments = hodUser.departments.map(dept => dept._id);
    } else if (hodUser.department) {
      hodDepartments = [hodUser.department._id];
    }

    console.log('🏢 HOD manages departments:', hodDepartments);

    // Build filter
    const filters = {};
    if (priority) filters.priority = priority;
    if (courseId) filters.course = courseId;
    if (teacherId) filters.teacher = teacherId;
    
    // Filter by department if specified, otherwise include all HOD's departments
    if (departmentId && departmentId !== 'all') {
      if (hodDepartments.includes(departmentId)) {
        filters.department = departmentId;
      } else {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this department'
        });
      }
    } else {
      filters.department = { $in: hodDepartments };
    }

    const requests = await VideoUnlockRequest.getPendingRequestsForHOD(hodId, filters);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRequests = requests.slice(startIndex, endIndex);

    console.log(`✅ Found ${requests.length} pending requests for HOD's departments`);

    res.json({
      success: true,
      requests: paginatedRequests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(requests.length / limit),
        count: paginatedRequests.length,
        totalRequests: requests.length
      },
      hodDepartments: hodUser.departments || (hodUser.department ? [hodUser.department] : [])
    });

  } catch (error) {
    console.error('❌ Error getting pending requests for HOD:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Approve unlock request (HOD action)
exports.approveUnlockRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { hodComments, unlockDuration } = req.body;
    const hodId = req.user._id;

    console.log('✅ Approving unlock request:', { requestId, hodId });

    const request = await VideoUnlockRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Unlock request not found'
      });
    }

    if (!request.canBeApproved()) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be approved (not pending or expired)'
      });
    }

    const approvedRequest = await VideoUnlockRequest.approveRequest(
      requestId,
      hodId,
      hodComments || '',
      unlockDuration || 72
    );

    console.log('✅ Unlock request approved successfully');

    res.json({
      success: true,
      message: 'Unlock request approved successfully',
      request: approvedRequest
    });

  } catch (error) {
    console.error('❌ Error approving unlock request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve unlock request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Reject unlock request (HOD action)
exports.rejectUnlockRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { hodComments } = req.body;
    const hodId = req.user._id;

    console.log('❌ Rejecting unlock request:', { requestId, hodId });

    const request = await VideoUnlockRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Unlock request not found'
      });
    }

    if (!request.canBeApproved()) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be rejected (not pending or expired)'
      });
    }

    const rejectedRequest = await VideoUnlockRequest.rejectRequest(
      requestId,
      hodId,
      hodComments || 'Request rejected by HOD'
    );

    console.log('✅ Unlock request rejected successfully');

    res.json({
      success: true,
      message: 'Unlock request rejected successfully',
      request: rejectedRequest
    });

  } catch (error) {
    console.error('❌ Error rejecting unlock request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject unlock request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============ STUDENT ACCESS FUNCTIONS ============

// Check if video is unlocked for student
exports.checkVideoUnlock = async (req, res) => {
  try {
    const { studentId, videoId } = req.params;

    console.log('🔍 Checking video unlock status:', { studentId, videoId });

    const isUnlocked = await VideoUnlockRequest.isVideoUnlockedForStudent(studentId, videoId);

    if (isUnlocked) {
      // Get the active unlock details
      const activeUnlock = await VideoUnlockRequest.findOne({
        student: studentId,
        video: videoId,
        status: 'approved',
        unlockedAt: { $lte: new Date() },
        unlockExpiresAt: { $gt: new Date() }
      })
      .populate('teacher', 'name email')
      .populate('reviewedBy', 'name email');

      res.json({
        success: true,
        isUnlocked: true,
        unlock: {
          unlockExpiresAt: activeUnlock.unlockExpiresAt,
          remainingHours: activeUnlock.getRemainingUnlockHours(),
          teacher: activeUnlock.teacher,
          approvedBy: activeUnlock.reviewedBy,
          reason: activeUnlock.reason
        }
      });
    } else {
      res.json({
        success: true,
        isUnlocked: false
      });
    }

  } catch (error) {
    console.error('❌ Error checking video unlock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check video unlock status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get active unlocks for a student
exports.getStudentActiveUnlocks = async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log('📋 Getting active unlocks for student:', { studentId });

    const activeUnlocks = await VideoUnlockRequest.getActiveUnlocksForStudent(studentId);

    console.log(`✅ Found ${activeUnlocks.length} active unlocks`);

    res.json({
      success: true,
      unlocks: activeUnlocks.map(unlock => ({
        id: unlock._id,
        video: unlock.video,
        unit: unlock.unit,
        course: unlock.course,
        teacher: unlock.teacher,
        unlockExpiresAt: unlock.unlockExpiresAt,
        remainingHours: unlock.getRemainingUnlockHours(),
        reason: unlock.reason
      }))
    });

  } catch (error) {
    console.error('❌ Error getting student active unlocks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active unlocks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============ UTILITY FUNCTIONS ============

// Get unlock statistics
exports.getUnlockStats = async (req, res) => {
  try {
    const { courseId, teacherId, dateFrom, dateTo } = req.query;

    console.log('📊 Getting unlock statistics');

    // Build filter
    const filters = {};
    if (courseId) filters.course = courseId;
    if (teacherId) filters.teacher = teacherId;
    if (dateFrom || dateTo) {
      filters.requestedAt = {};
      if (dateFrom) filters.requestedAt.$gte = new Date(dateFrom);
      if (dateTo) filters.requestedAt.$lte = new Date(dateTo);
    }

    const stats = await VideoUnlockRequest.getUnlockStats(filters);

    console.log('✅ Unlock statistics retrieved');

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting unlock statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unlock statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Cleanup expired requests (admin function)
exports.cleanupExpiredRequests = async (req, res) => {
  try {
    console.log('🧹 Cleaning up expired unlock requests');

    const result = await VideoUnlockRequest.cleanupExpired();

    console.log('✅ Cleanup completed:', result);

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      result
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get courses for a specific student that the teacher can access
exports.getStudentCourses = async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user._id;
    
    console.log('📚 Getting courses for student:', { studentId, teacherId });
    
    // Get student details
    const student = await User.findById(studentId).populate('sections');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get courses taught by this teacher in student's sections
    const sectionIds = student.sections.map(section => section._id);
    const teacherAssignments = await SectionCourseTeacher.find({
      teacher: teacherId,
      section: { $in: sectionIds }
    }).populate('course');
    
    const courses = teacherAssignments.map(assignment => assignment.course);
    
    console.log('✅ Found courses:', courses.length);
    
    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('❌ Error getting student courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get courses'
    });
  }
};

// Get units for a specific course
exports.getCourseUnits = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('📖 Getting units for course:', courseId);
    
    const units = await Unit.find({ course: courseId })
      .select('title description order course')
      .sort({ order: 1 });
    
    console.log('✅ Found units:', units.length);
    
    res.json({
      success: true,
      units
    });
  } catch (error) {
    console.error('❌ Error getting course units:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get units'
    });
  }
};

// Get videos for a specific unit
exports.getUnitVideos = async (req, res) => {
  try {
    const { unitId } = req.params;
    
    console.log('🎥 Getting videos for unit:', unitId);
    
    const videos = await Video.find({ unit: unitId })
      .select('title description duration order unit')
      .sort({ order: 1 });
    
    console.log('✅ Found videos:', videos.length);
    
    res.json({
      success: true,
      videos
    });
  } catch (error) {
    console.error('❌ Error getting unit videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get videos'
    });
  }
};