const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const QuizLock = require('../models/QuizLock');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const Course = require('../models/Course');
const Unit = require('../models/Unit');
const Section = require('../models/Section');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');
const StudentProgress = require('../models/StudentProgress');
const QuizAttempt = require('../models/QuizAttempt');
const { auth, authorizeRoles } = require('../middleware/auth');

// @route   GET /api/quiz-unlock/locked-students
// @desc    Get ALL locked students for teacher dashboard (including ones escalated to HOD/Dean for tracking)
// @access  Private (Teacher)
router.get('/locked-students', auth, authorizeRoles('teacher', 'coordinator'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Get ALL locked students in teacher's sections, regardless of authorization level
    const Section = require('../models/Section');
    
    const sections = await Section.find({
      $or: [
        { teacher: teacherId }, // Legacy single teacher field
        { teachers: teacherId } // New multiple teachers field
      ]
    });
    
    // Get course IDs and student IDs from teacher's sections
    const sectionCourseIds = [];
    const sectionStudentIds = [];
    
    for (const section of sections) {
      if (section.courses) {
        sectionCourseIds.push(...section.courses);
      }
      if (section.students) {
        sectionStudentIds.push(...section.students);
      }
    }
    
    // Find ALL locked students (any authorization level) in teacher's domain
    const lockedStudents = await QuizLock.find({
      isLocked: true,
      $or: [
        { courseId: { $in: sectionCourseIds } }, // Students in courses taught by teacher
        { studentId: { $in: sectionStudentIds } } // Students in teacher's sections
      ]
    });
    
    // Add additional context for each locked student
    const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
      // Fetch related information separately to avoid populate issues
      const student = await User.findById(lock.studentId).select('name email regno');
      const quiz = await Quiz.findById(lock.quizId).select('title');
      const course = await Course.findById(lock.courseId).select('name code title');
      
      return {
        lockId: lock._id,
        student: {
          id: lock.studentId,
          name: student?.name || 'Unknown Student',
          email: student?.email || 'N/A',
          regno: student?.regno || 'N/A'
        },
        quiz: {
          id: lock.quizId,
          title: quiz?.title || 'Unknown Quiz'
        },
        course: {
          id: lock.courseId,
          name: course?.name || course?.title || 'Unknown Course',
          code: course?.code || 'N/A'
        },
        lockInfo: {
          reason: lock.failureReason,
          lockTimestamp: lock.lockTimestamp,
          lastFailureScore: lock.lastFailureScore,
          passingScore: lock.passingScore,
          teacherUnlockCount: lock.teacherUnlockCount,
          hodUnlockCount: lock.hodUnlockCount || 0,
          deanUnlockCount: lock.deanUnlockCount || 0,
          remainingTeacherUnlocks: lock.remainingTeacherUnlocks,
          totalAttempts: lock.totalAttempts,
          canTeacherUnlock: lock.canTeacherUnlock,
          unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
          requiresHodUnlock: lock.requiresHodUnlock,
          requiresDeanUnlock: lock.requiresDeanUnlock,
          lastTeacherUnlock: lock.teacherUnlockHistory.length > 0 ? 
                              lock.teacherUnlockHistory[lock.teacherUnlockHistory.length - 1].unlockTimestamp : null,
          lastHodUnlock: lock.hodUnlockHistory && lock.hodUnlockHistory.length > 0 ? 
                         lock.hodUnlockHistory[lock.hodUnlockHistory.length - 1].unlockTimestamp : null,
          lastDeanUnlock: lock.deanUnlockHistory && lock.deanUnlockHistory.length > 0 ? 
                          lock.deanUnlockHistory[lock.deanUnlockHistory.length - 1].unlockTimestamp : null
        },
        unlockHistory: {
          teacher: lock.teacherUnlockHistory || [],
          hod: lock.hodUnlockHistory || [],
          dean: lock.deanUnlockHistory || [],
          admin: lock.adminUnlockHistory || []
        }
      };
    }));
    
    res.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length,
      breakdown: {
        teacherLevel: enrichedData.filter(item => item.lockInfo.unlockAuthorizationLevel === 'TEACHER').length,
        hodLevel: enrichedData.filter(item => item.lockInfo.unlockAuthorizationLevel === 'HOD').length,
        deanLevel: enrichedData.filter(item => item.lockInfo.unlockAuthorizationLevel === 'DEAN').length,
        adminLevel: enrichedData.filter(item => item.lockInfo.unlockAuthorizationLevel === 'ADMIN').length
      }
    });
  } catch (error) {
    console.error('Error fetching locked students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locked students',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/dean-locked-students
// @desc    Get locked students requiring dean authorization
// @access  Private (Dean/Admin)
router.get('/dean-locked-students', auth, authorizeRoles('admin', 'dean'), async (req, res) => {
  try {
    const lockedStudents = await QuizLock.getLockedStudentsForDean();
    
    const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
      // Fetch related information separately to avoid populate issues
      const student = await User.findById(lock.studentId).select('name email regno').lean();
      const quiz = await Quiz.findById(lock.quizId).select('title').lean();
      const course = await Course.findById(lock.courseId).select('name code title').lean();
      
      return {
        lockId: lock._id,
        student: student ? {
          id: student._id,
          name: student.name,
          email: student.email,
          regno: student.regno
        } : {
          id: lock.studentId,
          name: 'Unknown Student',
          email: 'N/A',
          regno: 'N/A'
        },
        quiz: quiz ? {
          id: quiz._id,
          title: quiz.title
        } : {
          id: lock.quizId,
          title: 'Unknown Quiz (Deleted)'
        },
        course: course ? {
          id: course._id,
          name: course.name || course.title,
          code: course.code
        } : {
          id: lock.courseId,
          name: 'Unknown Course',
          code: 'N/A'
        },
        lockInfo: {
          reason: lock.failureReason,
          lockTimestamp: lock.lockTimestamp,
          lastFailureScore: lock.lastFailureScore,
          passingScore: lock.passingScore,
          teacherUnlockCount: lock.teacherUnlockCount,
          deanUnlockCount: lock.deanUnlockCount,
          totalAttempts: lock.totalAttempts,
          requiresDeanUnlock: lock.requiresDeanUnlock
        },
        teacherUnlockHistory: lock.teacherUnlockHistory
      };
    }));
    
    res.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length
    });
  } catch (error) {
    console.error('Error fetching dean locked students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locked students for dean',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/hod-locked-students
// @desc    Get ALL locked students in HOD's department (including ones escalated to Dean for tracking)
// @access  Private (HOD/Admin)
router.get('/hod-locked-students', auth, authorizeRoles('admin', 'hod'), async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Find students in courses from HOD's department
    const User = require('../models/User');
    const Course = require('../models/Course');
    
    const hod = await User.findById(hodId).populate('department').populate('departments');
    
    // Support both single department and departments array for HOD
    let hodDepartments = [];
    if (hod.department) {
      hodDepartments.push(hod.department._id);
    }
    if (hod.departments && hod.departments.length > 0) {
      hodDepartments.push(...hod.departments.map(d => d._id));
    }
    
    if (!hod || hodDepartments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'HOD department not found or not assigned to any department',
        debug: {
          hodId: hodId,
          hasSingleDept: !!hod?.department,
          hasDepartmentsArray: hod?.departments?.length > 0,
          hodRole: hod?.role,
          hodRoles: hod?.roles
        }
      });
    }
    
    // Find courses in HOD's department(s)
    const departmentCourses = await Course.find({ 
      department: { $in: hodDepartments }
    }).select('_id');
    
    const courseIds = departmentCourses.map(course => course._id);
    
    // Get ALL locked students in department, regardless of authorization level
    const lockedStudents = await QuizLock.find({
      isLocked: true,
      courseId: { $in: courseIds }
    });
    
    const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
      // Fetch related information separately to avoid populate issues
      const student = await User.findById(lock.studentId).select('name email regno').lean();
      const quiz = await Quiz.findById(lock.quizId).select('title').lean();
      const course = await Course.findById(lock.courseId).select('name code title').lean();
      
      return {
        lockId: lock._id,
        student: student ? {
          id: student._id,
          name: student.name,
          email: student.email,
          regno: student.regno
        } : {
          id: lock.studentId,
          name: 'Unknown Student',
          email: 'N/A',
          regno: 'N/A'
        },
        quiz: quiz ? {
          id: quiz._id,
          title: quiz.title
        } : {
          id: lock.quizId,
          title: 'Unknown Quiz'
        },
        course: course ? {
          id: course._id,
          name: course.name || course.title,
          code: course.code
        } : {
          id: lock.courseId,
          name: 'Unknown Course',
          code: 'N/A'
        },
        lockInfo: {
          reason: lock.failureReason,
          lockTimestamp: lock.lockTimestamp,
          lastFailureScore: lock.lastFailureScore,
          passingScore: lock.passingScore,
          teacherUnlockCount: lock.teacherUnlockCount,
          hodUnlockCount: lock.hodUnlockCount || 0,
          deanUnlockCount: lock.deanUnlockCount || 0,
          totalAttempts: lock.totalAttempts,
          unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
          canHodUnlock: lock.canHodUnlock,
          requiresHodUnlock: lock.requiresHodUnlock,
          requiresDeanUnlock: lock.requiresDeanUnlock,
          remainingHodUnlocks: lock.remainingHodUnlocks,
          lastTeacherUnlock: lock.teacherUnlockHistory.length > 0 ? 
                              lock.teacherUnlockHistory[lock.teacherUnlockHistory.length - 1].unlockTimestamp : null,
          lastHodUnlock: lock.hodUnlockHistory && lock.hodUnlockHistory.length > 0 ? 
                         lock.hodUnlockHistory[lock.hodUnlockHistory.length - 1].unlockTimestamp : null,
          lastDeanUnlock: lock.deanUnlockHistory && lock.deanUnlockHistory.length > 0 ? 
                          lock.deanUnlockHistory[lock.deanUnlockHistory.length - 1].unlockTimestamp : null
        },
        unlockHistory: {
          teacher: lock.teacherUnlockHistory || [],
          hod: lock.hodUnlockHistory || [],
          dean: lock.deanUnlockHistory || [],
          admin: lock.adminUnlockHistory || []
        }
      };
    }));
    
    // Prepare department info for response
    const departmentInfo = {
      departmentIds: hodDepartments,
      departmentNames: []
    };
    
    if (hod.department) {
      departmentInfo.departmentNames.push(hod.department.name);
      // Keep backward compatibility
      departmentInfo.departmentName = hod.department.name;
      departmentInfo.departmentId = hod.department._id;
    }
    
    if (hod.departments && hod.departments.length > 0) {
      departmentInfo.departmentNames.push(...hod.departments.map(d => d.name));
      // If no single department, use first from array for backward compatibility
      if (!hod.department) {
        departmentInfo.departmentName = hod.departments[0].name;
        departmentInfo.departmentId = hod.departments[0]._id;
      }
    }

    res.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length,
      departmentInfo,
      breakdown: {
        teacherLevel: enrichedData.filter(item => item.lockInfo.unlockAuthorizationLevel === 'TEACHER').length,
        hodLevel: enrichedData.filter(item => item.lockInfo.unlockAuthorizationLevel === 'HOD').length,
        deanLevel: enrichedData.filter(item => item.lockInfo.unlockAuthorizationLevel === 'DEAN').length,
        adminLevel: enrichedData.filter(item => item.lockInfo.unlockAuthorizationLevel === 'ADMIN').length
      }
    });
  } catch (error) {
    console.error('Error fetching HOD locked students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locked students for HOD',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/teacher-unlock/:lockId
// @desc    Unlock a student quiz by teacher
// @access  Private (Teacher)
router.post('/teacher-unlock/:lockId', auth, authorizeRoles('teacher', 'coordinator'), async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason, notes } = req.body;
    const teacherId = req.user.id;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Unlock reason is required'
      });
    }
    
    const lock = await QuizLock.findById(lockId);
    
    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'Quiz lock not found'
      });
    }
    
    // Get the related data separately to avoid populate issues
    const student = await User.findById(lock.studentId).select('name email regno');
    const quiz = await Quiz.findById(lock.quizId).select('title');
    const course = await Course.findById(lock.courseId).select('name code title');
    
    // Verify teacher has access to this student through sections
    const Section = require('../models/Section');
    const sections = await Section.find({
      $or: [
        { teacher: teacherId },
        { teachers: teacherId }
      ],
      students: lock.studentId._id
    });
    
    if (sections.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to unlock this student'
      });
    }
    
    // Check if teacher can still unlock
    if (!lock.canTeacherUnlock) {
      return res.status(400).json({
        success: false,
        message: 'Teacher unlock limit exceeded. HOD authorization required.',
        requiresHodUnlock: true,
        nextAuthorizationLevel: 'HOD'
      });
    }
    
    // Perform the unlock
    await lock.unlockByTeacher(teacherId, reason, notes);
    
    // IMPORTANT: Also clear any security locks for this student-unit combination
    // Security violations should be clearable by teacher unlock as well
    try {
      const StudentProgress = require('../models/StudentProgress');
      const Unit = require('../models/Unit');
      
      // Find the unit that contains this quiz
      const unit = await Unit.findOne({
        $or: [
          { quizPool: lock.quizId },
          { quizzes: lock.quizId }
        ]
      });
      
      if (unit) {
        // Find and update the student's progress to clear security lock
        const progress = await StudentProgress.findOne({ student: lock.studentId });
        if (progress) {
          const unitProgress = progress.units.find(u => u.unitId.toString() === unit._id.toString());
          if (unitProgress && unitProgress.securityLock && unitProgress.securityLock.locked) {
            console.log(`🔓 Also clearing security lock for student ${student?.name} in unit ${unit.title}`);
            unitProgress.securityLock.locked = false;
            unitProgress.securityLock.reason = `Cleared by teacher unlock: ${reason}`;
            unitProgress.securityLock.violationCount = 0;
            unitProgress.securityLock.lockedAt = null;
            await progress.save();
          }
        }
      }
    } catch (securityError) {
      console.warn('Could not clear security lock during teacher unlock:', securityError.message);
      // Don't fail the unlock if security clearing fails
    }
    
    // Log the unlock action
    console.log(`🔓 Quiz unlocked by teacher - Student: ${student?.name}, Quiz: ${quiz?.title}, Teacher: ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Student quiz unlocked successfully',
      data: {
        student: lock.studentId.name,
        quiz: lock.quizId.title,
        course: lock.courseId.name,
        unlockCount: lock.teacherUnlockCount + 1,
        remainingUnlocks: Math.max(0, 2 - lock.teacherUnlockCount)
      }
    });
  } catch (error) {
    console.error('Error unlocking quiz by teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking quiz',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/hod-unlock/:lockId
// @desc    Unlock a student quiz by HOD
// @access  Private (HOD/Admin)
router.post('/hod-unlock/:lockId', auth, authorizeRoles('admin', 'hod'), async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason, notes } = req.body;
    const hodId = req.user.id;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Unlock reason is required'
      });
    }
    
    const lock = await QuizLock.findById(lockId);
    
    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'Quiz lock not found'
      });
    }
    
    // Get the related data separately to avoid populate issues
    const student = await User.findById(lock.studentId).select('name email regno');
    const quiz = await Quiz.findById(lock.quizId).select('title');
    const course = await Course.findById(lock.courseId).populate('department').select('name code title department');
    
    // Verify HOD has access to this student through department
    const hod = await User.findById(hodId).populate('department').populate('departments');
    
    // Support both single department and departments array for HOD
    let hodDepartments = [];
    if (hod.department) {
      hodDepartments.push(hod.department._id);
    }
    if (hod.departments && hod.departments.length > 0) {
      hodDepartments.push(...hod.departments.map(d => d._id));
    }
    
    if (!hod || hodDepartments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'HOD department not found or not assigned to any department'
      });
    }
    
    // Check if the course belongs to any of HOD's department(s)
    if (!course || !course.department || !hodDepartments.some(deptId => deptId.toString() === course.department._id.toString())) {
      const hodDeptNames = [];
      if (hod.department) hodDeptNames.push(hod.department.name);
      if (hod.departments) hodDeptNames.push(...hod.departments.map(d => d.name));
      
      return res.status(403).json({
        success: false,
        message: `You do not have access to unlock this student - course not in your department. Course dept: ${course?.department?.name || 'Unknown'}, Your dept(s): ${hodDeptNames.join(', ')}`
      });
    }
    
    if (!lock.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not currently locked'
      });
    }
    
    // Check if HOD authorization is required
    if (lock.unlockAuthorizationLevel !== 'HOD') {
      return res.status(400).json({
        success: false,
        message: `This quiz requires ${lock.unlockAuthorizationLevel.toLowerCase()} authorization`,
        authorizationLevel: lock.unlockAuthorizationLevel
      });
    }
    
    // Check if HOD has exceeded unlock limit
    if (lock.hodUnlockCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'HOD unlock limit exceeded (3/3). Dean authorization required.',
        requiresDeanUnlock: true,
        nextAuthorizationLevel: 'DEAN',
        hodUnlockCount: lock.hodUnlockCount,
        remainingHodUnlocks: 0
      });
    }
    
    // Perform the unlock
    await lock.unlockByHOD(hodId, reason, notes);
    
    // **NEW: Also clear any security locks for this student/unit combination**
    try {
      const StudentProgress = require('../models/StudentProgress');
      const Unit = require('../models/Unit');
      
      // Find the unit that contains this quiz
      const unit = await Unit.findOne({
        $or: [
          { quizPool: quiz._id },
          { quizzes: quiz._id }
        ]
      });
      
      if (unit) {
        // Clear security lock in StudentProgress
        await StudentProgress.updateOne(
          { 
            student: student._id,
            course: course._id,
            'units.unitId': unit._id
          },
          {
            $set: {
              'units.$.securityLock.locked': false,
              'units.$.securityLock.clearedBy': 'HOD',
              'units.$.securityLock.clearedAt': new Date(),
              'units.$.securityLock.clearedReason': `Security lock cleared by HOD unlock - ${reason}`
            }
          }
        );
        
        console.log(`🔓 Security lock also cleared by HOD for unit: ${unit.title}`);
      }
    } catch (securityError) {
      console.warn('Warning: Could not clear security lock:', securityError.message);
      // Don't fail the entire unlock operation if security lock clearing fails
    }
    
    // Log the unlock action
    console.log(`🔓 Quiz unlocked by HOD - Student: ${student?.name}, Quiz: ${quiz?.title}, HOD: ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Student quiz unlocked successfully by HOD',
      data: {
        student: student?.name,
        quiz: quiz?.title,
        course: course?.name || course?.title,
        hodUnlockCount: lock.hodUnlockCount,
        remainingHodUnlocks: Math.max(0, 3 - lock.hodUnlockCount),
        teacherUnlockCount: lock.teacherUnlockCount,
        nextAuthorizationLevel: lock.hodUnlockCount >= 3 ? 'DEAN' : 'HOD'
      }
    });
  } catch (error) {
    console.error('Error unlocking quiz by HOD:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking quiz',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/dean-unlock/:lockId
// @desc    Unlock a student quiz by dean
// @access  Private (Dean/Admin)
router.post('/dean-unlock/:lockId', auth, authorizeRoles('admin', 'dean'), async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason, notes } = req.body;
    const deanId = req.user.id;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Unlock reason is required'
      });
    }
    
    const lock = await QuizLock.findById(lockId);
    
    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'Quiz lock not found'
      });
    }
    
    // Get the related data separately to avoid populate issues
    const student = await User.findById(lock.studentId).select('name email regno');
    const quiz = await Quiz.findById(lock.quizId).select('title');
    const course = await Course.findById(lock.courseId).select('name code title');
    
    if (!lock.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not currently locked'
      });
    }
    
    // Perform the unlock
    await lock.unlockByDean(deanId, reason, notes);
    
    // **NEW: Also clear any security locks for this student/unit combination**
    try {
      const StudentProgress = require('../models/StudentProgress');
      const Unit = require('../models/Unit');
      
      // Find the unit that contains this quiz
      const unit = await Unit.findOne({
        $or: [
          { quizPool: quiz._id },
          { quizzes: quiz._id }
        ]
      });
      
      if (unit) {
        // Clear security lock in StudentProgress
        await StudentProgress.updateOne(
          { 
            student: student._id,
            course: course._id,
            'units.unitId': unit._id
          },
          {
            $set: {
              'units.$.securityLock.locked': false,
              'units.$.securityLock.clearedBy': 'DEAN',
              'units.$.securityLock.clearedAt': new Date(),
              'units.$.securityLock.clearedReason': `Security lock cleared by Dean unlock - ${reason}`
            }
          }
        );
        
        console.log(`🔓 Security lock also cleared by Dean for unit: ${unit.title}`);
      }
    } catch (securityError) {
      console.warn('Warning: Could not clear security lock:', securityError.message);
      // Don't fail the entire unlock operation if security lock clearing fails
    }
    
    // Log the unlock action
    console.log(`🔓 Quiz unlocked by dean - Student: ${student?.name}, Quiz: ${quiz?.title}, Dean: ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Student quiz unlocked successfully by dean',
      data: {
        student: student?.name,
        quiz: quiz?.title,
        course: course?.name || course?.title,
        deanUnlockCount: lock.deanUnlockCount,
        remainingDeanUnlocks: Math.max(0, 3 - lock.deanUnlockCount),
        teacherUnlockCount: lock.teacherUnlockCount,
        hodUnlockCount: lock.hodUnlockCount || 0,
        nextAuthorizationLevel: lock.deanUnlockCount >= 3 ? 'ADMIN' : 'DEAN',
        requiresAdminOverride: lock.deanUnlockCount >= 3
      }
    });
  } catch (error) {
    console.error('Error unlocking quiz by dean:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking quiz',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/lock-status/:studentId/:quizId
// @desc    Check quiz lock status for a student
// @access  Private
router.get('/lock-status/:studentId/:quizId', auth, async (req, res) => {
  try {
    const { studentId, quizId } = req.params;
    const currentUserId = req.user.id;
    const userRole = req.user.role;
    
    // Students can only check their own status
    if (userRole === 'student' && studentId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const lock = await QuizLock.findOne({ studentId, quizId })
      .populate('studentId', 'name email regno')
      .populate('quizId', 'title passingScore')
      .populate('courseId', 'name code');
    
    if (!lock) {
      return res.json({
        success: true,
        isLocked: false,
        data: null
      });
    }
    
    const response = {
      success: true,
      isLocked: lock.isLocked,
      data: {
        lockId: lock._id,
        reason: lock.failureReason,
        lockTimestamp: lock.lockTimestamp,
        lastFailureScore: lock.lastFailureScore,
        passingScore: lock.passingScore,
        totalAttempts: lock.totalAttempts,
        unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
        teacherUnlockCount: lock.teacherUnlockCount,
        remainingTeacherUnlocks: lock.remainingTeacherUnlocks,
        hodUnlockCount: lock.hodUnlockCount,
        deanUnlockCount: lock.deanUnlockCount,
        canTeacherUnlock: lock.canTeacherUnlock,
        requiresHodUnlock: lock.requiresHodUnlock,
        requiresDeanUnlock: lock.requiresDeanUnlock
      }
    };
    
    // Add additional details for teachers and admins
    if (['teacher', 'coordinator', 'admin', 'dean', 'hod'].includes(userRole)) {
      response.data.student = {
        id: lock.studentId._id,
        name: lock.studentId.name,
        email: lock.studentId.email,
        regno: lock.studentId.regno
      };
      response.data.unlockHistory = {
        teacher: lock.teacherUnlockHistory,
        hod: lock.hodUnlockHistory,
        dean: lock.deanUnlockHistory
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error checking lock status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking lock status',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/check-and-lock
// @desc    Check quiz score and lock if failed (called after quiz submission)
// @access  Private
router.post('/check-and-lock', auth, async (req, res) => {
  try {
    const { studentId, quizId, courseId, score, passingScore } = req.body;
    
    if (!studentId || !quizId || !courseId || score === undefined || passingScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Get or create lock record
    const lock = await QuizLock.getOrCreateLock(studentId, quizId, courseId, passingScore);
    
    // Record the attempt
    await lock.recordAttempt(score);
    
    // Check if student failed
    const failed = score < passingScore;
    
    if (failed) {
      // Lock the quiz
      await lock.lockQuiz('BELOW_PASSING_SCORE', score, passingScore);
      
      console.log(`🔒 Quiz locked for failing score - Student: ${studentId}, Quiz: ${quizId}, Score: ${score}/${passingScore}`);
      
      res.json({
        success: true,
        locked: true,
        message: 'Quiz locked due to failing score',
        data: {
          score,
          passingScore,
          unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
          teacherUnlockCount: lock.teacherUnlockCount,
          remainingTeacherUnlocks: lock.remainingTeacherUnlocks
        }
      });
    } else {
      // Student passed, ensure quiz is unlocked
      if (lock.isLocked) {
        lock.isLocked = false;
        await lock.save();
      }
      
      res.json({
        success: true,
        locked: false,
        message: 'Quiz completed successfully',
        data: {
          score,
          passingScore
        }
      });
    }
  } catch (error) {
    console.error('Error checking and locking quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing quiz result',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/teacher-unlock-history
// @desc    Get all unlock history for the current teacher with pagination and filters
// @access  Private (Teacher)
router.get('/teacher-unlock-history', auth, authorizeRoles('teacher', 'coordinator'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Extract pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Extract filter parameters
    const {
      courseId,
      unitId,
      sectionId,
      studentSearch, // regno or email
      startDate,
      endDate,
      actionType // 'teacher' or 'admin_override' or 'all'
    } = req.query;
    
    // Get teacher details
    const teacher = await User.findById(teacherId).select('name email');
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Build query to find QuizLock records for the specified course/unit with any unlock history
    let baseQuery = {
      // Must have unlock history
      $or: [
        { 'teacherUnlockHistory.0': { $exists: true } },
        { 'adminUnlockHistory.0': { $exists: true } },
        { 'hodUnlockHistory.0': { $exists: true } },
        { 'deanUnlockHistory.0': { $exists: true } }
      ]
    };

    // Add mandatory course filter (teachers can only see their assigned courses)
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course filter is required for teachers'
      });
    }
    baseQuery.courseId = courseId;

    // Add mandatory unit/quiz filter
    if (!unitId) {
      return res.status(400).json({
        success: false,
        message: 'Unit filter is required for teachers'
      });
    }
    
    // Get all quizzes in the selected unit
    console.log('🔍 Getting quizzes in unit:', unitId);
    const quizzesInUnit = await Quiz.find({ unit: unitId }).select('_id');
    const quizIds = quizzesInUnit.map(q => q._id);
    console.log(`📝 Found ${quizIds.length} quizzes in unit`);
    
    if (quizIds.length > 0) {
      baseQuery.quizId = { $in: quizIds };
    } else {
      // No quizzes in this unit, return empty result
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Add mandatory section filter (teachers can only see their assigned sections)
    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: 'Section filter is required for teachers'
      });
    }

    // Verify teacher has access to this course through section assignment
    const teacherAssignment = await SectionCourseTeacher.findOne({
      teacher: teacherId,
      course: courseId,
      section: sectionId,
      isActive: true
    });

    if (!teacherAssignment) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course/section combination'
      });
    }

    // Note: QuizLock doesn't have sectionId directly, we'll filter by student's section
    // First, get all students in the specified section
    console.log('🔍 Getting students in section:', sectionId);
    const studentsInSection = await User.find({
      assignedSections: sectionId,
      role: 'student'
    }).select('_id');
    
    console.log(`📊 Found ${studentsInSection.length} students in section`);
    const studentIds = studentsInSection.map(s => s._id);
    
    if (studentIds.length === 0) {
      console.log('⚠️ No students found in this section');
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }
    
    console.log('📝 Student IDs:', studentIds.map(id => id.toString()));
    
    // Add student filter to base query
    baseQuery.studentId = { $in: studentIds };
    
    console.log('🔎 Base query:', JSON.stringify(baseQuery, null, 2));

    // Get total count for pagination (before applying student search)
    console.log('📊 Counting documents with baseQuery...');
    const totalCount = await QuizLock.countDocuments(baseQuery);
    console.log(`📈 Total count: ${totalCount}`);

    // Build student search filter for aggregation
    let studentMatchStage = {};
    if (studentSearch) {
      const searchRegex = new RegExp(studentSearch, 'i');
      studentMatchStage = {
        $or: [
          { 'student.regno': searchRegex },
          { 'student.email': searchRegex },
          { 'student.name': searchRegex }
        ]
      };
    }

    // Use aggregation for better filtering and pagination
    const aggregationPipeline = [
      { $match: baseQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $lookup: {
          from: 'quizzes',  // Fixed: QuizLock.quizId refers to Quiz collection
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true } }
    ];

    // Add student search filter if provided
    if (Object.keys(studentMatchStage).length > 0) {
      aggregationPipeline.push({ $match: studentMatchStage });
    }

    // Add date filter if provided
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      aggregationPipeline.push({
        $match: {
          $or: [
            { 'teacherUnlockHistory.unlockTimestamp': dateFilter },
            { 'adminUnlockHistory.unlockTimestamp': dateFilter }
          ]
        }
      });
    }

    // Add sorting and pagination
    aggregationPipeline.push(
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    // Execute aggregation
    console.log('🚀 Executing query with populate...');
    const locks = await QuizLock.find(baseQuery)
      .populate('studentId', 'name regno email')
      .populate('courseId', 'name title code courseCode')
      .populate('quizId', 'title')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    console.log(`📦 Found ${locks.length} QuizLock records with unlock history`);
    
    // Extract ALL unlock history for students in teacher's assigned section
    const allUnlockHistory = [];
    
    locks.forEach(lock => {
      // Skip if required data is missing
      if (!lock.studentId || !lock.courseId || !lock.quizId) {
        console.warn('Skipping lock with missing data:', lock._id);
        return;
      }

      // Add ALL teacher unlocks (any teacher, not just current teacher)
      const allTeacherUnlocks = lock.teacherUnlockHistory || [];
      
      allTeacherUnlocks.forEach(unlock => {
        allUnlockHistory.push({
          type: 'TEACHER_UNLOCK',
          unlockedBy: {
            id: unlock.teacherId,
            name: typeof unlock.teacherId === 'object' ? unlock.teacherId.name : 'Teacher',
            role: 'Teacher'
          },
          student: {
            id: lock.studentId._id || lock.studentId,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id || lock.courseId,
            name: lock.courseId.name || lock.courseId.title || 'Unknown Course',
            code: lock.courseId.code || lock.courseId.courseCode || 'N/A'
          },
          quiz: {
            id: lock.quizId._id || lock.quizId,
            title: lock.quizId.title || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });

      // Add all admin overrides (visible to teachers for transparency)
      const adminOverrides = lock.adminUnlockHistory || [];

      adminOverrides.forEach(unlock => {
        // Get admin info - handle both populated and non-populated cases
        let adminInfo = { id: 'unknown', name: 'Admin', role: 'Admin' };
        if (unlock.adminId) {
          if (typeof unlock.adminId === 'object') {
            adminInfo = {
              id: unlock.adminId._id || unlock.adminId,
              name: unlock.adminId.name || 'Admin',
              role: 'Admin'
            };
          } else {
            adminInfo.id = unlock.adminId;
          }
        }

        allUnlockHistory.push({
          type: 'ADMIN_OVERRIDE',
          unlockedBy: adminInfo,
          student: {
            id: lock.studentId._id || lock.studentId,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id || lock.courseId,
            name: lock.courseId.name || lock.courseId.title || 'Unknown Course',
            code: lock.courseId.code || lock.courseId.courseCode || 'N/A'
          },
          quiz: {
            id: lock.quizId._id || lock.quizId,
            title: lock.quizId.title || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          overrideLevel: unlock.overrideLevel,
          lockReason: unlock.lockReason || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });

      // Add HOD unlocks (if any)
      const hodUnlocks = lock.hodUnlockHistory || [];
      hodUnlocks.forEach(unlock => {
        allUnlockHistory.push({
          type: 'HOD_UNLOCK',
          unlockedBy: {
            id: unlock.hodId,
            name: typeof unlock.hodId === 'object' ? unlock.hodId.name : 'HOD',
            role: 'HOD'
          },
          student: {
            id: lock.studentId._id || lock.studentId,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id || lock.courseId,
            name: lock.courseId.name || lock.courseId.title || 'Unknown Course',
            code: lock.courseId.code || lock.courseId.courseCode || 'N/A'
          },
          quiz: {
            id: lock.quizId._id || lock.quizId,
            title: lock.quizId.title || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });

      // Add Dean unlocks (if any)
      const deanUnlocks = lock.deanUnlockHistory || [];
      deanUnlocks.forEach(unlock => {
        allUnlockHistory.push({
          type: 'DEAN_UNLOCK',
          unlockedBy: {
            id: unlock.deanId,
            name: typeof unlock.deanId === 'object' ? unlock.deanId.name : 'Dean',
            role: 'Dean'
          },
          student: {
            id: lock.studentId._id || lock.studentId,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id || lock.courseId,
            name: lock.courseId.name || lock.courseId.title || 'Unknown Course',
            code: lock.courseId.code || lock.courseId.courseCode || 'N/A'
          },
          quiz: {
            id: lock.quizId._id || lock.quizId,
            title: lock.quizId.title || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });
    });
    
    // Apply action type filter if specified
    let filteredHistory = allUnlockHistory;
    if (actionType && actionType !== 'all') {
      if (actionType === 'TEACHER_UNLOCK') {
        filteredHistory = allUnlockHistory.filter(h => h.type === 'TEACHER_UNLOCK');
      } else if (actionType === 'ADMIN_OVERRIDE') {
        filteredHistory = allUnlockHistory.filter(h => h.type === 'ADMIN_OVERRIDE');
      } else if (actionType === 'HOD_UNLOCK') {
        filteredHistory = allUnlockHistory.filter(h => h.type === 'HOD_UNLOCK');
      } else if (actionType === 'DEAN_UNLOCK') {
        filteredHistory = allUnlockHistory.filter(h => h.type === 'DEAN_UNLOCK');
      }
    }

    // Sort by unlock timestamp descending (most recent first)
    filteredHistory.sort((a, b) => new Date(b.unlockTimestamp) - new Date(a.unlockTimestamp));
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.json({
      success: true,
      data: filteredHistory,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
        count: filteredHistory.length
      },
      filters: {
        courseId: courseId || null,
        unitId: unitId || null,
        sectionId: sectionId || null,
        studentSearch: studentSearch || null,
        startDate: startDate || null,
        endDate: endDate || null,
        actionType: actionType || 'all'
      },
      breakdown: {
        teacherUnlocks: filteredHistory.filter(h => h.type === 'TEACHER').length,
        adminOverrides: filteredHistory.filter(h => h.type === 'ADMIN_OVERRIDE').length
      }
    });
  } catch (error) {
    console.error('Error fetching teacher unlock history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unlock history',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/hod-unlock-history
// @desc    Get all unlock history for HOD's department with pagination and filters
// @access  Private (HOD)
router.get('/hod-unlock-history', auth, authorizeRoles('hod', 'admin'), async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Extract pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Extract filter parameters
    const {
      courseId,
      unitId,
      sectionId,
      studentSearch,
      startDate,
      endDate,
      actionType // 'teacher', 'hod', 'admin_override', or 'all'
    } = req.query;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department').populate('departments');
    
    // Support both single department and departments array for HOD
    let hodDepartments = [];
    if (hod.department) {
      hodDepartments.push(hod.department._id);
    }
    if (hod.departments && hod.departments.length > 0) {
      hodDepartments.push(...hod.departments.map(d => d._id));
    }
    
    if (!hod || hodDepartments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'HOD department not found or not assigned to any department'
      });
    }

    // Find all teachers in HOD's department(s) (including multi-role users)
    const departmentTeachers = await User.find({
      $or: [
        { department: { $in: hodDepartments } },
        { departments: { $in: hodDepartments } }
      ],
      $and: [{
        $or: [
          { role: 'teacher' },
          { roles: { $in: ['teacher'] } }
        ]
      }],
      isActive: { $ne: false }
    }).select('_id name');

    const teacherIds = departmentTeachers.map(t => t._id);

    // Add mandatory course filter (HOD can only see courses in their department)
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course filter is required for HOD'
      });
    }
    
    // Add mandatory section filter
    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: 'Section filter is required for HOD'
      });
    }
    
    // Get all quizzes in the unit if unitId is provided, otherwise all quizzes in the course
    console.log('🔍 HOD: Getting quizzes', unitId ? `in unit: ${unitId}` : `for course: ${courseId}`);
    const quizQuery = unitId ? { unit: unitId } : { course: courseId };
    const quizzesInUnit = await Quiz.find(quizQuery).select('_id');
    const quizIds = quizzesInUnit.map(q => q._id);
    console.log(`📝 HOD: Found ${quizIds.length} quizzes`);
    
    if (quizIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }
    
    // Get all students in the specified section
    console.log('🔍 HOD: Getting students in section:', sectionId);
    const studentsInSection = await User.find({
      assignedSections: sectionId,
      role: 'student'
    }).select('_id');
    
    console.log(`📊 HOD: Found ${studentsInSection.length} students in section`);
    const studentIds = studentsInSection.map(s => s._id);
    
    if (studentIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Build dynamic query based on filters
    let baseQuery = {
      // Find all QuizLocks that have ANY unlock history
      $or: [
        { 'teacherUnlockHistory.0': { $exists: true } },  // Any teacher unlocks
        { 'hodUnlockHistory.0': { $exists: true } },      // Any HOD unlocks
        { 'adminUnlockHistory.0': { $exists: true } },    // Any admin overrides
        { 'deanUnlockHistory.0': { $exists: true } }      // Any dean unlocks
      ],
      courseId: courseId,
      quizId: { $in: quizIds },
      studentId: { $in: studentIds }
    };

    console.log('🔎 HOD Base query:', JSON.stringify(baseQuery, null, 2));

    // Get total count for pagination
    console.log('📊 HOD: Counting documents with baseQuery...');
    const totalCount = await QuizLock.countDocuments(baseQuery);
    console.log(`📈 HOD: Total count: ${totalCount}`);
    
    if (totalCount === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Use populate instead of aggregation
    console.log('🚀 HOD: Executing query with populate...');
    const locks = await QuizLock.find(baseQuery)
      .populate('studentId', 'name email regno')
      .populate('courseId', 'title name courseCode code')
      .populate('quizId', 'title name')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`📦 HOD: Found ${locks.length} QuizLock records with unlock history`);
    
    // Extract ALL unlock history for HOD visibility
    const unlockHistory = [];
    
    locks.forEach(lock => {
      // Skip if required data is missing
      if (!lock.studentId || !lock.courseId || !lock.quizId) {
        console.warn('Skipping lock with missing data:', lock._id);
        return;
      }

      // Add Teacher unlocks (HOD sees all teacher unlocks)
      const teacherUnlocks = lock.teacherUnlockHistory || [];
      
      teacherUnlocks.forEach(unlock => {
        // Get teacher info
        let teacherInfo = { id: unlock.teacherId, name: 'Teacher', role: 'Teacher' };
        const teacher = departmentTeachers.find(t => t._id.toString() === unlock.teacherId?.toString());
        if (teacher) teacherInfo.name = teacher.name;

        unlockHistory.push({
          type: 'TEACHER_UNLOCK',
          unlockedBy: teacherInfo,
          student: {
            id: lock.studentId._id,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id,
            title: lock.courseId.title || lock.courseId.name || 'Unknown Course',
            courseCode: lock.courseId.courseCode || lock.courseId.code || 'N/A'
          },
          quiz: {
            id: lock.quizId._id,
            title: lock.quizId.title || lock.quizId.name || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason,
          notes: unlock.notes,
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });

      // Add HOD unlocks
      const hodUnlocks = lock.hodUnlockHistory || [];
      hodUnlocks.forEach(unlock => {
        unlockHistory.push({
          type: 'HOD_UNLOCK',
          unlockedBy: {
            id: unlock.hodId,
            name: typeof unlock.hodId === 'object' ? unlock.hodId.name : 'HOD',
            role: 'HOD'
          },
          student: {
            id: lock.studentId._id,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id,
            title: lock.courseId.title || lock.courseId.name || 'Unknown Course',
            courseCode: lock.courseId.courseCode || lock.courseId.code || 'N/A'
          },
          quiz: {
            id: lock.quizId._id,
            title: lock.quizId.title || lock.quizId.name || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });

      // Add Admin overrides (visible to all HODs for transparency)
      const adminOverrides = lock.adminUnlockHistory || [];
      adminOverrides.forEach(unlock => {
        // Get admin info
        let adminInfo = { id: unlock.adminId, name: 'Admin', role: 'Admin' };
        if (typeof unlock.adminId === 'object') {
          adminInfo.name = unlock.adminId.name || 'Admin';
        }

        unlockHistory.push({
          type: 'ADMIN_OVERRIDE',
          unlockedBy: adminInfo,
          student: {
            id: lock.studentId._id,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id,
            title: lock.courseId.title || lock.courseId.name || 'Unknown Course',
            courseCode: lock.courseId.courseCode || lock.courseId.code || 'N/A'
          },
          quiz: {
            id: lock.quizId._id,
            title: lock.quizId.title || lock.quizId.name || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          overrideLevel: unlock.overrideLevel,
          lockReason: unlock.lockReason || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });
    });
    
    // Apply action type filter if specified
    let filteredHistory = unlockHistory;
    if (actionType && actionType !== 'all') {
      if (actionType === 'teacher') {
        filteredHistory = unlockHistory.filter(h => h.type === 'TEACHER');
      } else if (actionType === 'hod') {
        filteredHistory = unlockHistory.filter(h => h.type === 'HOD');
      } else if (actionType === 'admin_override') {
        filteredHistory = unlockHistory.filter(h => h.type === 'ADMIN_OVERRIDE');
      }
    }

    // Sort by unlock timestamp descending (most recent first)
    filteredHistory.sort((a, b) => new Date(b.unlockTimestamp) - new Date(a.unlockTimestamp));
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.json({
      success: true,
      data: filteredHistory,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
        count: filteredHistory.length
      },
      filters: {
        courseId: courseId || null,
        unitId: unitId || null,
        sectionId: sectionId || null,
        studentSearch: studentSearch || null,
        startDate: startDate || null,
        endDate: endDate || null,
        actionType: actionType || 'all'
      },
      breakdown: {
        hodUnlocks: filteredHistory.filter(h => h.type === 'HOD').length,
        teacherUnlocks: filteredHistory.filter(h => h.type === 'TEACHER').length,
        adminOverrides: filteredHistory.filter(h => h.type === 'ADMIN_OVERRIDE').length
      }
    });
  } catch (error) {
    console.error('Error fetching HOD unlock history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unlock history',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/dean-unlock-history
// @desc    Get all unlock history (Dean's own + all HODs + all Teachers)
// @access  Private (Dean)
router.get('/dean-unlock-history', auth, authorizeRoles('dean', 'admin'), async (req, res) => {
  try {
    const deanId = req.user.id;
    const { 
      courseId, 
      departmentId,
      sectionId,
      page = 1, 
      limit = 20, // Increased default limit for better UX
      actionType = 'all'
    } = req.query;
    
    // Validate and sanitize pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(limit) || 20)); // Limit between 5-100 for performance
    const skip = (pageNum - 1) * pageSize;
    
    console.log(`📄 Dean pagination: page=${pageNum}, limit=${pageSize}, skip=${skip}`);
    
    // Get Dean's school information for school-based filtering
    const dean = await User.findById(deanId).populate('school');
    if (!dean || !dean.school) {
      return res.status(404).json({
        success: false,
        message: 'Dean school not found. Dean must be assigned to a school.'
      });
    }

    const deanSchoolId = dean.school._id;
    console.log(`🏫 Dean ${dean.name} filtering unlock history for school: ${dean.school.name}`);

    // Dean has institutional oversight within their school only
    // Lazy loading with efficient pagination
    
    // Find all courses in Dean's school to limit scope
    const schoolCourses = await Course.find({ school: deanSchoolId }).select('_id');
    const schoolCourseIds = schoolCourses.map(course => course._id);
    
    if (schoolCourseIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          count: 0
        },
        schoolInfo: {
          schoolName: dean.school.name,
          schoolId: dean.school._id,
          message: 'No courses found in your school'
        }
      });
    }
    
    // Build base query for QuizLock - Dean has institutional oversight within their school
    const baseQuery = {
      courseId: { $in: schoolCourseIds }, // CRITICAL: Limit to Dean's school courses only
      $or: [
        { 'teacherUnlockHistory.0': { $exists: true } },
        { 'hodUnlockHistory.0': { $exists: true } },
        { 'deanUnlockHistory.0': { $exists: true } },
        { 'adminUnlockHistory.0': { $exists: true } }
      ]
    };

    // Optional filters for targeted searches
    if (courseId) {
      baseQuery.courseId = courseId;
    }

    if (departmentId) {
      // Find courses in the specified department
      const departmentCourses = await Course.find({ 
        department: departmentId 
      }).select('_id');
      const courseIds = departmentCourses.map(course => course._id);
      
      if (courseIds.length > 0) {
        baseQuery.courseId = { $in: courseIds };
      }
    }

    if (sectionId && sectionId !== 'all') {
      // Get students in this section
      const studentsInSection = await User.find({ 
        assignedSections: sectionId,
        role: 'student'
      }).select('_id');
      const studentIds = studentsInSection.map(s => s._id);
      baseQuery.studentId = { $in: studentIds };
    }

    // PERFORMANCE OPTIMIZATION: Get total count efficiently
    console.log(`📊 Counting documents with baseQuery...`);
    const totalCount = await QuizLock.countDocuments(baseQuery);
    console.log(`📈 Total matching locks: ${totalCount}`);
    
    if (totalCount === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          count: 0
        },
        schoolInfo: {
          schoolName: dean.school.name,
          schoolId: dean.school._id,
          coursesInSchool: schoolCourses.length,
          message: 'No unlock history found in your school'
        }
      });
    }
    
    // LAZY LOADING: Fetch only the required page of data
    console.log(`🚀 Fetching page ${pageNum} (${pageSize} records, skip ${skip})`);
    const locks = await QuizLock.find(baseQuery)
      .populate('studentId', 'name email regno regNo')
      .populate('quizId', 'title name')
      .populate('courseId', 'title name courseCode code')
      .populate('teacherUnlockHistory.teacherId', 'name department')
      .populate('hodUnlockHistory.hodId', 'name department')
      .populate('deanUnlockHistory.deanId', 'name')
      .populate('adminUnlockHistory.adminId', 'name')
      .sort({ updatedAt: -1 }) // Most recent first
      .skip(skip)
      .limit(pageSize) // Use validated pageSize
      .lean(); // Use lean() for better performance
      
    console.log(`📦 Found ${locks.length} locks for this page`);
    
    const unlockHistory = [];
    
    locks.forEach(lock => {
      // Skip if required data is missing
      if (!lock.studentId || !lock.courseId || !lock.quizId) {
        console.warn('Skipping lock with missing data:', lock._id);
        return;
      }

      // Add Teacher unlocks (visible to Dean for institutional oversight)
      const teacherUnlocks = lock.teacherUnlockHistory || [];
      teacherUnlocks.forEach(unlock => {
        // Get teacher info
        let teacherInfo = { id: unlock.teacherId, name: 'Teacher', role: 'Teacher' };
        if (typeof unlock.teacherId === 'object') {
          teacherInfo = {
            id: unlock.teacherId._id,
            name: unlock.teacherId.name || 'Teacher',
            department: unlock.teacherId.department,
            role: 'Teacher'
          };
        }

        unlockHistory.push({
          type: 'TEACHER_UNLOCK',
          unlockedBy: teacherInfo,
          student: {
            id: lock.studentId._id,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id,
            title: lock.courseId.title || lock.courseId.name || 'Unknown Course',
            courseCode: lock.courseId.courseCode || lock.courseId.code || 'N/A'
          },
          quiz: {
            id: lock.quizId._id,
            title: lock.quizId.title || lock.quizId.name || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });

      // Add HOD unlocks (visible to Dean for institutional oversight)
      const hodUnlocks = lock.hodUnlockHistory || [];
      hodUnlocks.forEach(unlock => {
        // Get HOD info
        let hodInfo = { id: unlock.hodId, name: 'HOD', role: 'HOD' };
        if (typeof unlock.hodId === 'object') {
          hodInfo = {
            id: unlock.hodId._id,
            name: unlock.hodId.name || 'HOD',
            department: unlock.hodId.department,
            role: 'HOD'
          };
        }

        unlockHistory.push({
          type: 'HOD_UNLOCK',
          unlockedBy: hodInfo,
          student: {
            id: lock.studentId._id,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id,
            title: lock.courseId.title || lock.courseId.name || 'Unknown Course',
            courseCode: lock.courseId.courseCode || lock.courseId.code || 'N/A'
          },
          quiz: {
            id: lock.quizId._id,
            title: lock.quizId.title || lock.quizId.name || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });

      // Add Dean unlocks
      const deanUnlocks = lock.deanUnlockHistory || [];
      deanUnlocks.forEach(unlock => {
        // Get Dean info
        let deanInfo = { id: unlock.deanId, name: 'Dean', role: 'Dean' };
        if (typeof unlock.deanId === 'object') {
          deanInfo = {
            id: unlock.deanId._id,
            name: unlock.deanId.name || 'Dean',
            role: 'Dean'
          };
        }

        unlockHistory.push({
          type: 'DEAN_UNLOCK',
          unlockedBy: deanInfo,
          student: {
            id: lock.studentId._id,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id,
            title: lock.courseId.title || lock.courseId.name || 'Unknown Course',
            courseCode: lock.courseId.courseCode || lock.courseId.code || 'N/A'
          },
          quiz: {
            id: lock.quizId._id,
            title: lock.quizId.title || lock.quizId.name || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });

      // Add Admin overrides (visible to Dean for full institutional oversight)
      const adminOverrides = lock.adminUnlockHistory || [];
      adminOverrides.forEach(unlock => {
        // Get admin info
        let adminInfo = { id: unlock.adminId, name: 'Admin', role: 'Admin' };
        if (typeof unlock.adminId === 'object') {
          adminInfo.name = unlock.adminId.name || 'Admin';
        }

        unlockHistory.push({
          type: 'ADMIN_OVERRIDE',
          unlockedBy: adminInfo,
          student: {
            id: lock.studentId._id,
            name: lock.studentId.name || 'Unknown Student',
            regno: lock.studentId.regno || 'N/A',
            email: lock.studentId.email || 'N/A'
          },
          course: {
            id: lock.courseId._id,
            title: lock.courseId.title || lock.courseId.name || 'Unknown Course',
            courseCode: lock.courseId.courseCode || lock.courseId.code || 'N/A'
          },
          quiz: {
            id: lock.quizId._id,
            title: lock.quizId.title || lock.quizId.name || 'Unknown Quiz'
          },
          unlockTimestamp: unlock.unlockTimestamp,
          reason: unlock.reason || 'No reason provided',
          notes: unlock.notes || '',
          overrideLevel: unlock.overrideLevel,
          lockReason: unlock.lockReason || '',
          isCurrentlyLocked: lock.isLocked,
          currentAuthLevel: lock.unlockAuthorizationLevel
        });
      });
    });
    
    // Apply action type filter if specified
    let filteredHistory = unlockHistory;
    if (actionType && actionType !== 'all') {
      if (actionType === 'teacher') {
        filteredHistory = unlockHistory.filter(h => h.type === 'TEACHER_UNLOCK');
      } else if (actionType === 'hod') {
        filteredHistory = unlockHistory.filter(h => h.type === 'HOD_UNLOCK');
      } else if (actionType === 'dean') {
        filteredHistory = unlockHistory.filter(h => h.type === 'DEAN_UNLOCK');
      } else if (actionType === 'admin_override') {
        filteredHistory = unlockHistory.filter(h => h.type === 'ADMIN_OVERRIDE');
      }
    }

    // Sort by unlock timestamp descending (most recent first)
    filteredHistory.sort((a, b) => new Date(b.unlockTimestamp) - new Date(a.unlockTimestamp));
    
    // Calculate pagination metadata using validated variables
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    console.log(`📊 Pagination: ${pageNum}/${totalPages}, Next: ${hasNextPage}, Prev: ${hasPrevPage}`);
    
    res.json({
      success: true,
      data: filteredHistory,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
        count: filteredHistory.length,
        // Additional lazy loading metadata
        recordsPerPage: pageSize,
        currentPageRecords: locks.length,
        totalRecordsProcessed: skip + locks.length
      },
      filters: {
        departmentId: departmentId || null,
        courseId: courseId || null,
        sectionId: sectionId || null,
        actionType: actionType || 'all'
      },
      breakdown: {
        teacherUnlocks: unlockHistory.filter(h => h.type === 'TEACHER_UNLOCK').length,
        hodUnlocks: unlockHistory.filter(h => h.type === 'HOD_UNLOCK').length,
        deanUnlocks: unlockHistory.filter(h => h.type === 'DEAN_UNLOCK').length,
        adminOverrides: unlockHistory.filter(h => h.type === 'ADMIN_OVERRIDE').length
      },
      schoolInfo: {
        schoolName: dean.school.name,
        schoolId: dean.school._id,
        coursesInSchool: schoolCourses.length,
        message: `Showing unlock history for ${dean.school.name} only`
      }
    });
  } catch (error) {
    console.error('Error fetching Dean unlock history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unlock history',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/unlock-history/:studentId/:quizId
// @desc    Get unlock history for a specific student-quiz combination
// @access  Private (Teacher/Admin)
router.get('/unlock-history/:studentId/:quizId', auth, authorizeRoles('teacher', 'coordinator', 'admin', 'dean'), async (req, res) => {
  try {
    const { studentId, quizId } = req.params;
    
    const lock = await QuizLock.findOne({ studentId, quizId })
      .populate('teacherUnlockHistory.teacherId', 'name email')
      .populate('deanUnlockHistory.deanId', 'name email')
      .populate('studentId', 'name email regno')
      .populate('quizId', 'title');
    
    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'No lock record found'
      });
    }
    
    res.json({
      success: true,
      data: {
        student: lock.studentId,
        quiz: lock.quizId,
        lockInfo: {
          isLocked: lock.isLocked,
          reason: lock.failureReason,
          totalAttempts: lock.totalAttempts,
          teacherUnlockCount: lock.teacherUnlockCount,
          deanUnlockCount: lock.deanUnlockCount
        },
        unlockHistory: {
          teacher: lock.teacherUnlockHistory,
          hod: lock.hodUnlockHistory,
          dean: lock.deanUnlockHistory,
          admin: lock.adminUnlockHistory
        }
      }
    });
  } catch (error) {
    console.error('Error fetching unlock history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unlock history',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/admin-all-locked-students
// @desc    Get all locked students for admin dashboard (any type of lock)
// @access  Private (Admin only)
router.get('/admin-all-locked-students', auth, authorizeRoles('admin'), async (req, res) => {
  try {
    // Get all locked students regardless of authorization level
    const lockedStudents = await QuizLock.find({ isLocked: true })
      .select('studentId quizId courseId failureReason lockTimestamp lastFailureScore passingScore teacherUnlockCount hodUnlockCount deanUnlockCount adminUnlockCount unlockAuthorizationLevel totalAttempts')
      .sort({ lockTimestamp: -1 });

    // Enrich data with related information
    const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
      const student = await User.findById(lock.studentId).select('name email regno');
      const quiz = await Quiz.findById(lock.quizId).select('title');
      const course = await Course.findById(lock.courseId).select('name code title');

      return {
        lockId: lock._id,
        student: {
          id: lock.studentId,
          name: student?.name || 'Unknown Student',
          email: student?.email || 'N/A',
          regno: student?.regno || 'N/A'
        },
        quiz: {
          id: lock.quizId,
          title: quiz?.title || 'Unknown Quiz'
        },
        course: {
          id: lock.courseId,
          name: course?.name || course?.title || 'Unknown Course',
          code: course?.code || 'N/A'
        },
        lockInfo: {
          reason: lock.failureReason,
          lockTimestamp: lock.lockTimestamp,
          lastFailureScore: lock.lastFailureScore,
          passingScore: lock.passingScore,
          teacherUnlockCount: lock.teacherUnlockCount,
          hodUnlockCount: lock.hodUnlockCount,
          deanUnlockCount: lock.deanUnlockCount,
          adminUnlockCount: lock.adminUnlockCount,
          unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
          totalAttempts: lock.totalAttempts,
          isSecurityViolation: lock.failureReason === 'SECURITY_VIOLATION'
        }
      };
    }));

    res.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length
    });
  } catch (error) {
    console.error('Error fetching all locked students for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locked students for admin',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/admin-unlock/:lockId
// @desc    Admin override unlock (can unlock any quiz regardless of authorization level or violation type)
// @access  Private (Admin only)
router.post('/admin-unlock/:lockId', auth, authorizeRoles('admin'), async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason, notes } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Unlock reason is required'
      });
    }

    const lock = await QuizLock.findById(lockId);

    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'Quiz lock not found'
      });
    }

    if (!lock.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not currently locked'
      });
    }

    // Get related data for logging
    const student = await User.findById(lock.studentId).select('name email regno');
    const quiz = await Quiz.findById(lock.quizId).select('title');
    const course = await Course.findById(lock.courseId).select('name code title');

    // Admin can unlock anything - no authorization level restrictions
    await lock.unlockByAdmin(adminId, reason, notes);

    // **NEW: Also clear any security locks for this student/unit combination**
    try {
      const StudentProgress = require('../models/StudentProgress');
      const Unit = require('../models/Unit');
      
      // Find the unit that contains this quiz
      const unit = await Unit.findOne({
        $or: [
          { quizPool: quiz._id },
          { quizzes: quiz._id }
        ]
      });
      
      if (unit) {
        // Clear security lock in StudentProgress
        await StudentProgress.updateOne(
          { 
            student: student._id,
            course: course._id,
            'units.unitId': unit._id
          },
          {
            $set: {
              'units.$.securityLock.locked': false,
              'units.$.securityLock.clearedBy': 'ADMIN',
              'units.$.securityLock.clearedAt': new Date(),
              'units.$.securityLock.clearedReason': `Security lock cleared by Admin unlock - ${reason}`
            }
          }
        );
        
        console.log(`🔓 Security lock also cleared by Admin for unit: ${unit.title}`);
      }
    } catch (securityError) {
      console.warn('Warning: Could not clear security lock:', securityError.message);
      // Don't fail the entire unlock operation if security lock clearing fails
    }

    // Log the admin override unlock action
    console.log(`🔓 ADMIN OVERRIDE UNLOCK - Student: ${student?.name}, Quiz: ${quiz?.title}, Course: ${course?.name}, Admin: ${req.user.name}, Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Quiz unlocked successfully by admin override',
      data: {
        student: {
          name: student?.name,
          regno: student?.regno
        },
        quiz: { title: quiz?.title },
        course: { name: course?.name },
        overrideLevel: overriddenLevel,
        lockReason: lock.failureReason,
        adminUnlockCount: lock.adminUnlockCount || 1,
        updatedCounts: {
          teacherUnlockCount: lock.teacherUnlockCount,
          hodUnlockCount: lock.hodUnlockCount,
          deanUnlockCount: lock.deanUnlockCount
        },
        newAuthorizationLevel: lock.unlockAuthorizationLevel
      }
    });
  } catch (error) {
    console.error('Error with admin unlock:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking quiz',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/test
// @desc    Test endpoint
// @access  Private
router.get('/test', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Quiz unlock routes working',
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});

// @route   GET /api/quiz-unlock/filter-options
// @desc    Get filter options (courses, units, sections) for the current user
// @access  Private
router.get('/filter-options', auth, async (req, res) => {
  console.log('[FILTER-OPTIONS] Request started');
  
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`[FILTER-OPTIONS] User ID: ${userId}, Role: ${userRole}`);

    let courses = [];
    let units = [];
    let sections = [];

    if (userRole === 'teacher' || userRole === 'coordinator') {
      console.log('[FILTER-OPTIONS] Processing teacher/coordinator using SectionCourseTeacher model');
      
      // Use the SectionCourseTeacher model to get teacher's course assignments
      const SectionCourseTeacher = require('../models/SectionCourseTeacher');
      
      const teacherAssignments = await SectionCourseTeacher.find({ 
        teacher: userId,
        isActive: true 
      })
      .populate('course', 'title courseCode _id')
      .populate('section', 'name _id')
      .lean();
      
      console.log(`[FILTER-OPTIONS] Found ${teacherAssignments.length} assignments`);
      
      if (teacherAssignments.length > 0) {
        // Extract unique courses
        const courseMap = new Map();
        const sectionMap = new Map();
        
        teacherAssignments.forEach(assignment => {
          if (assignment.course) {
            courseMap.set(assignment.course._id.toString(), {
              _id: assignment.course._id,
              title: assignment.course.title,  // Frontend expects 'title' not 'name'
              courseCode: assignment.course.courseCode
            });
          }
          
          if (assignment.section && assignment.course) {
            sectionMap.set(assignment.section._id.toString(), {
              _id: assignment.section._id,
              name: assignment.section.name,
              courseId: assignment.course._id.toString()
            });
          }
        });
        
        courses = Array.from(courseMap.values());
        sections = Array.from(sectionMap.values());
        
        // Get units for the courses
        const courseIds = courses.map(c => c._id);
        if (courseIds.length > 0) {
          units = await Unit.find({ course: { $in: courseIds } })
            .select('title course _id')
            .lean();
          
          // Map courseId correctly
          units = units.map(u => ({
            _id: u._id,
            title: u.title,
            courseId: u.course
          }));
        }
      }
      
      console.log(`[FILTER-OPTIONS] Final: ${courses.length} courses, ${units.length} units, ${sections.length} sections`);

    } else if (userRole === 'hod') {
      console.log('[FILTER-OPTIONS] Processing HOD');
      
      // Get user's department
      const user = await User.findById(userId).select('department');
      if (user && user.department) {
        console.log(`[FILTER-OPTIONS] HOD Department: ${user.department}`);
        
        // Get all courses in the department
        courses = await Course.find({ department: user.department })
          .select('title courseCode _id')
          .lean();
        
        console.log(`[FILTER-OPTIONS] Found ${courses.length} courses in department`);
        
        // Map to consistent field names (title and courseCode)
        courses = courses.map(c => ({
          _id: c._id,
          title: c.title,  // Frontend expects 'title' not 'name'
          courseCode: c.courseCode  // Frontend expects 'courseCode' not 'code'
        }));
        
        const courseIds = courses.map(c => c._id);
        
        // Get units for department courses
        if (courseIds.length > 0) {
          units = await Unit.find({ course: { $in: courseIds } })
            .select('title course _id')
            .lean();
          
          units = units.map(u => ({
            _id: u._id,
            title: u.title,
            courseId: u.course
          }));
          
          console.log(`[FILTER-OPTIONS] Found ${units.length} units for courses`);
        }
        
        // Get sections that have courses assigned to them
        // We need to find sections where the course is in the courses array
        const sectionsWithCourses = await Section.find({ 
          department: user.department,
          courses: { $in: courseIds }
        })
        .select('name _id courses')
        .lean();
        
        console.log(`[FILTER-OPTIONS] Found ${sectionsWithCourses.length} sections with courses`);
        
        // Transform sections to include courseIds for filtering
        const sectionList = [];
        sectionsWithCourses.forEach(section => {
          if (section.courses && section.courses.length > 0) {
            // For each course in the section that's in our courseIds, create a section entry
            section.courses.forEach(courseId => {
              if (courseIds.some(id => id.toString() === courseId.toString())) {
                sectionList.push({
                  _id: section._id,
                  name: section.name,
                  courseId: courseId.toString()
                });
              }
            });
          }
        });
        
        sections = sectionList;
        console.log(`[FILTER-OPTIONS] Returning ${sections.length} section-course mappings`);
      }

    } else {
      console.log(`[FILTER-OPTIONS] Role ${userRole} - basic implementation`);
      // For admin/dean, get all data (limited for performance)
      courses = await Course.find({})
        .select('title courseCode _id')
        .limit(50)
        .lean();
      
      courses = courses.map(c => ({
        _id: c._id,
        name: c.title,
        code: c.courseCode
      }));
    }

    const responseData = {
      success: true,
      data: {
        courses,
        units,
        sections
      }
    };

    console.log('[FILTER-OPTIONS] Sending response with data counts:', {
      courses: courses.length,
      units: units.length, 
      sections: sections.length
    });
    
    res.json(responseData);

  } catch (error) {
    console.error('[FILTER-OPTIONS] ERROR:', error.message);
    console.error('[FILTER-OPTIONS] STACK:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
