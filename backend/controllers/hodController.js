const User = require('../models/User');
const Department = require('../models/Department');
const Section = require('../models/Section');
const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const Video = require('../models/Video');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProgress = require('../models/StudentProgress');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');
const mongoose = require('mongoose');
const QuestionReview = require('../models/QuestionReview');

// Get HOD dashboard overview
const getHODDashboard = async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;

    // Get department statistics with multi-role support
    const [teacherCount, studentCount, sectionCount, courseCount, coursesWithCCs] = await Promise.all([
      // Count users who can teach (including multi-role users)
      User.countDocuments({ 
        department: departmentId, 
        $or: [
          { role: 'teacher' },
          { roles: { $in: ['teacher'] } }
        ],
        isActive: { $ne: false }
      }),
      // Count students in sections that have courses from this department
      User.aggregate([
        {
          $match: {
            $or: [
              { role: 'student' },
              { roles: { $in: ['student'] } }
            ],
            isActive: { $ne: false },
            assignedSections: { $exists: true, $ne: [] }
          }
        },
        {
          $lookup: {
            from: 'sectioncourseteachers',
            let: { userSections: '$assignedSections' },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ['$section', '$$userSections'] }
                }
              },
              {
                $lookup: {
                  from: 'courses',
                  localField: 'course',
                  foreignField: '_id',
                  as: 'courseData'
                }
              },
              {
                $match: {
                  'courseData.department': departmentId
                }
              }
            ],
            as: 'departmentCourses'
          }
        },
        {
          $match: {
            departmentCourses: { $ne: [] }
          }
        },
        { $count: 'total' }
      ]).then(result => result.length > 0 ? result[0].total : 0),
      // Count sections in the same school that contain courses from this department
      SectionCourseTeacher.aggregate([
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            as: 'courseData'
          }
        },
        {
          $match: {
            'courseData.department': departmentId
          }
        },
        {
          $lookup: {
            from: 'sections',
            localField: 'section',
            foreignField: '_id',
            as: 'sectionData'
          }
        },
        {
          $match: {
            'sectionData.school': hod.department.school
          }
        },
        {
          $group: {
            _id: '$section'
          }
        },
        { $count: 'total' }
      ]).then(result => result.length > 0 ? result[0].total : 0),
      Course.countDocuments({ department: departmentId }),
      Course.find({ department: departmentId })
        .populate('coordinators', 'name email teacherId')
        .select('title courseCode coordinators')
    ]);
    
    console.log(`📊 HOD Dashboard stats for department ${hod.department.name}:`, {
      teachers: teacherCount,
      students: studentCount,
      sections: sectionCount,
      courses: courseCount
    });

    // Get pending announcements count
    const pendingAnnouncementsCount = await Announcement.countDocuments({
      'targetAudience.targetSections': { $in: await Section.find({ department: departmentId }).select('_id') },
      approvalStatus: 'pending',
      hodReviewRequired: true
    });

    // Build CC assignment summary: [{ courseId, title, courseCode, coordinators: [{_id, name, email, teacherId}] }]
    const ccAssignments = coursesWithCCs.map(c => ({
      _id: c._id,
      title: c.title,
      courseCode: c.courseCode,
      coordinators: (c.coordinators || []).map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        teacherId: u.teacherId
      }))
    }));

    res.json({
      department: hod.department,
      statistics: {
        teachers: teacherCount,
        students: studentCount,
        sections: sectionCount,
        courses: courseCount,
        pendingApprovals: pendingAnnouncementsCount
      },
      courseCoordinators: ccAssignments
    });
  } catch (error) {
    console.error('Error fetching HOD dashboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get pending teacher announcements for approval
const getPendingAnnouncements = async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;

    // Get all sections in HOD's department
    const departmentSections = await Section.find({ department: departmentId }).select('_id');
    const sectionIds = departmentSections.map(section => section._id);

    // Get pending announcements from teachers in this department
    const pendingAnnouncements = await Announcement.find({
      'targetAudience.targetSections': { $in: sectionIds },
      approvalStatus: 'pending',
      hodReviewRequired: true,
      role: 'teacher'
    })
    .populate('sender', 'name email teacherId')
    .populate('targetAudience.targetSections', 'name department')
    .sort({ createdAt: -1 });

    res.json(pendingAnnouncements);
  } catch (error) {
    console.error('Error fetching pending announcements:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Approve or reject teacher announcement
const reviewAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { action, note } = req.body; // action: 'approve' or 'reject'
    const hodId = req.user.id;

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
    }

    // Get the announcement
    const announcement = await Announcement.findById(announcementId)
      .populate('sender', 'name email')
      .populate('targetAudience.targetSections', 'name department');
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Verify HOD has authority over this announcement's sections
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;
    const departmentSections = await Section.find({ department: departmentId }).select('_id');
    const sectionIds = departmentSections.map(section => section._id.toString());
    
    const announcementSectionIds = announcement.targetAudience.targetSections.map(section => section._id.toString());
    const hasAuthority = announcementSectionIds.some(sectionId => sectionIds.includes(sectionId));

    if (!hasAuthority) {
      return res.status(403).json({ message: 'You do not have authority to review this announcement' });
    }

    // Check if announcement is pending
    if (announcement.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'Announcement is not pending approval' });
    }

    // Update announcement status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    await Announcement.findByIdAndUpdate(announcementId, {
      approvalStatus: newStatus,
      approvedBy: hodId,
      approvalNote: note || '',
      hodReviewRequired: false
    });

    // Create notification for teacher
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: announcement.sender._id,
      sender: hodId,
      type: 'announcement_review',
      title: `Announcement ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your announcement "${announcement.title}" has been ${action === 'approve' ? 'approved' : 'rejected'} by HOD.${note ? ` Note: ${note}` : ''}`,
      data: {
        announcementId: announcementId,
        action: action,
        note: note
      }
    });

    res.json({ 
      message: `Announcement ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      announcement: {
        id: announcementId,
        title: announcement.title,
        status: newStatus,
        approvedBy: hod.name,
        note: note
      }
    });
  } catch (error) {
    console.error('Error reviewing announcement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get HOD's department teachers
const getDepartmentTeachers = async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;

    // Get all teachers in the department (including multi-role users)
    const teachers = await User.find({ 
      department: departmentId, 
      $or: [
        { role: 'teacher' },
        { roles: { $in: ['teacher'] } }
      ],
      isActive: { $ne: false }
    })
    .select('name email teacherId')
    .sort({ name: 1 });

    // For each teacher, get their actual assignments from SectionCourseTeacher model
    
    const teachersWithAssignments = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await SectionCourseTeacher.getTeacherAssignments(teacher._id);
      
      // Extract unique sections and courses
      const assignedSections = assignments.map(a => ({
        _id: a.section._id,
        name: a.section.name
      }));
      
      const coursesFromSections = assignments.map(a => ({
        _id: a.course._id,
        title: a.course.title,
        courseCode: a.course.courseCode,
        section: a.section.name
      }));

      // Create section-course assignments for the frontend
      const sectionCourseAssignments = assignments.map(a => ({
        sectionId: a.section._id,
        sectionName: a.section.name,
        courseId: a.course._id,
        courseCode: a.course.courseCode,
        courseTitle: a.course.title
      }));

      return {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        teacherId: teacher.teacherId,
        assignedSections: assignedSections,
        coursesFromSections: coursesFromSections, // Changed from coursesAssigned
        sectionCourseAssignments: sectionCourseAssignments,
        totalAssignments: assignments.length
      };
    }));

    res.json(teachersWithAssignments);
  } catch (error) {
    console.error('Error fetching department teachers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// HOD can modify teacher assignments in sections for their department courses
const assignTeacherToSectionCourse = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { teacherId, sectionId, courseId } = req.body;

    // Validate inputs
    if (!teacherId || !sectionId || !courseId) {
      return res.status(400).json({ message: 'teacherId, sectionId, and courseId are required' });
    }

    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    // Verify teacher exists and is in same department
    const teacher = await User.findById(teacherId);
    const hasTeacherRole = teacher && (
      teacher.role === 'teacher' || 
      (teacher.roles && teacher.roles.includes('teacher'))
    );
    if (!teacher || !hasTeacherRole || teacher.department?.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Teacher must be in your department with teacher role' });
    }

    // Verify course exists and is in same department
    const course = await Course.findById(courseId);
    if (!course || course.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Course must be in your department' });
    }

    // Verify section exists and contains this course
    const section = await Section.findById(sectionId).populate('courses');
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    const courseInSection = section.courses.some(c => c._id.toString() === courseId);
    if (!courseInSection) {
      return res.status(400).json({ message: 'Course is not assigned to this section' });
    }

    // Check for existing assignment
    const existingAssignment = await SectionCourseTeacher.findOne({
      section: sectionId,
      course: courseId,
      isActive: true
    });

    let assignment;
    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.teacher = teacherId;
      existingAssignment.assignedBy = hodId;
      existingAssignment.assignedAt = new Date();
      assignment = await existingAssignment.save();
    } else {
      // Create new assignment
      assignment = new SectionCourseTeacher({
        section: sectionId,
        course: courseId,
        teacher: teacherId,
        assignedBy: hodId,
        academicYear: section.academicYear,
        semester: section.semester
      });
      await assignment.save();
    }

    // Populate for response
    const populatedAssignment = await SectionCourseTeacher.findById(assignment._id)
      .populate('teacher', 'name email teacherId')
      .populate('course', 'title courseCode')
      .populate('section', 'name');

    res.json({ 
      message: 'Teacher assigned to section course successfully', 
      assignment: populatedAssignment
    });
  } catch (error) {
    console.error('Error in HOD teacher assignment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// HOD can remove teacher assignments from section courses in their department
const removeTeacherFromSectionCourse = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { sectionId, courseId } = req.body;

    if (!sectionId || !courseId) {
      return res.status(400).json({ message: 'sectionId and courseId are required' });
    }

    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    // Verify course is in HOD's department
    const course = await Course.findById(courseId);
    if (!course || course.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Course must be in your department' });
    }

    // Find and deactivate the assignment
    const assignment = await SectionCourseTeacher.findOne({
      section: sectionId,
      course: courseId,
      isActive: true
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Soft delete
    assignment.isActive = false;
    assignment.removedAt = new Date();
    assignment.removedBy = hodId;
    await assignment.save();

    res.json({ message: 'Teacher assignment removed successfully' });
  } catch (error) {
    console.error('Error in HOD teacher removal:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Change a teacher's section within department
// Body: { toSectionId }
const changeTeacherSection = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { teacherId } = req.params;
    const { toSectionId } = req.body;

    if (!teacherId || !toSectionId) {
      return res.status(400).json({ message: 'teacherId (param) and toSectionId (body) are required' });
    }

    const hod = await User.findById(hodId).populate({
      path: 'department',
      populate: { path: 'school' }
    });
    if (!hod || !hod.department || !hod.department.school) {
      return res.status(404).json({ message: 'HOD department or school not found' });
    }

    const teacher = await User.findById(teacherId);
    const hasTeacherRole = teacher && (
      teacher.role === 'teacher' || 
      (teacher.roles && teacher.roles.includes('teacher'))
    );
    if (!teacher || !hasTeacherRole || teacher.department?.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Teacher must be in your department' });
    }

    const targetSection = await Section.findById(toSectionId);
    if (!targetSection || targetSection.school?.toString() !== hod.department.school._id.toString()) {
      return res.status(403).json({ message: 'Target section must be in your school' });
    }

    // Find any current sections where this teacher is assigned and clear them (one-teacher-one-section rule assumed)
    const currentSections = await Section.find({ teacher: teacherId });
    for (const sec of currentSections) {
      sec.teacher = null;
      await sec.save();
    }

    // Assign teacher to target section
    targetSection.teacher = teacherId;
    await targetSection.save();

    // Maintain teacher.assignedSections to reflect current assignment set
    const sectionIds = (await Section.find({ teacher: teacherId }).select('_id')).map(s => s._id);
    await User.findByIdAndUpdate(teacherId, { assignedSections: sectionIds });

    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'hod_change_teacher_section',
        performedBy: hodId,
        targetUser: teacherId,
        details: { toSectionId }
      });
    } catch (e) {
      console.warn('Audit log failed for changeTeacherSection:', e.message);
    }

    const updated = await User.findById(teacherId)
      .select('name email teacherId assignedSections')
      .populate('assignedSections', 'name');

    return res.json({ message: 'Teacher section updated', teacher: updated });
  } catch (error) {
    console.error('Error changing teacher section:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get HOD's department sections
const getDepartmentSections = async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Get HOD's department and school
    const hod = await User.findById(hodId).populate({
      path: 'department',
      populate: { path: 'school' }
    });
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }
    if (!hod.department.school) {
      return res.status(404).json({ message: 'Department school not found' });
    }

    const departmentId = hod.department._id;
    const schoolId = hod.department.school._id;

    console.log(`🔍 HOD ${hod.name} looking for sections in school ${hod.department.school.name} that contain courses from department ${hod.department.name}`);

    // Find sections that have courses from HOD's department using SectionCourseTeacher
    const sectionCourseTeachers = await SectionCourseTeacher.find({})
      .populate({
        path: 'course',
        match: { department: departmentId },
        select: '_id title courseCode'
      })
      .populate('section', '_id school name');

    // Filter valid sections (those in the same school with department courses)
    const validSectionCourses = sectionCourseTeachers.filter(sct => 
      sct.course && sct.section && sct.section.school.toString() === schoolId.toString()
    );

    // Group by section and collect unique sections
    const sectionMap = {};
    validSectionCourses.forEach(sct => {
      const sectionId = sct.section._id.toString();
      if (!sectionMap[sectionId]) {
        sectionMap[sectionId] = {
          section: sct.section,
          courseCount: 0
        };
      }
      sectionMap[sectionId].courseCount++;
    });

    // For each section, get detailed data including students and courses
    const sectionsResult = [];
    
    for (const [sectionId, data] of Object.entries(sectionMap)) {
      const { section, courseCount } = data;
      
      // Get full section data with code
      const fullSection = await Section.findById(section._id).lean();
      
      // Get students assigned to this section
      const students = await User.find({
        $or: [{ role: 'student' }, { roles: 'student' }],
        isActive: { $ne: false },
        assignedSections: section._id
      }).select('_id name email studentId').lean();

      // Get courses assigned to this section from HOD's department
      const sectionCourses = await SectionCourseTeacher.find({
        section: section._id
      })
      .populate({
        path: 'course',
        match: { department: departmentId },
        select: '_id title courseCode department'
      })
      .lean();

      // Filter and get unique courses
      const courses = [];
      const courseIds = new Set();
      
      sectionCourses.forEach(sct => {
        if (sct.course && !courseIds.has(sct.course._id.toString())) {
          courseIds.add(sct.course._id.toString());
          courses.push({
            _id: sct.course._id,
            title: sct.course.title,
            courseCode: sct.course.courseCode,
            department: sct.course.department
          });
        }
      });

      sectionsResult.push({
        _id: section._id,
        name: section.name,
        code: fullSection?.code || `SEC${section.name}`, // Add code field
        school: section.school,
        students: students, // Full students array
        courses: courses, // Full courses array
        studentCount: students.length, // Keep backward compatibility
        courseCount: courses.length, // Keep backward compatibility
        createdAt: section.createdAt
      });
    }

    // Sort sections by name
    sectionsResult.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Found ${sectionsResult.length} sections for HOD ${hod.name}`);
    
    res.json({ sections: sectionsResult });
  } catch (error) {
    console.error('Error fetching department sections:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get HOD's department courses
const getDepartmentCourses = async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;

    // Get all courses in the department
    const departmentCourses = await Course.find({ 
      department: departmentId, 
      isActive: { $ne: false } 
    }).lean();

    // Get teacher assignments using SectionCourseTeacher model
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const coursesWithDetails = await Promise.all(departmentCourses.map(async (course) => {
      try {
        // Get teacher assignments for this course
        const assignments = await SectionCourseTeacher.find({ course: course._id })
          .populate('teacher', 'name email teacherId')
          .populate('section', 'name code')
          .lean();

        // Get video count
        const Video = require('../models/Video');
        const videoCount = await Video.countDocuments({ course: course._id });

        // Get enrolled students count from sections containing this course
        const Section = require('../models/Section');
        const sectionsWithCourse = await Section.find({ 
          courses: course._id 
        }).populate('students', '_id');
        
        const totalStudents = sectionsWithCourse.reduce((total, section) => {
          return total + (section.students ? section.students.length : 0);
        }, 0);

        // Extract unique teachers and their sections
        const assignedTeachers = assignments.map(assignment => ({
          _id: assignment.teacher._id,
          name: assignment.teacher.name,
          email: assignment.teacher.email,
          teacherId: assignment.teacher.teacherId,
          section: assignment.section ? {
            _id: assignment.section._id,
            name: assignment.section.name,
            code: assignment.section.code
          } : null
        }));

        return {
          ...course,
          assignedTeachers,
          teacherCount: assignedTeachers.length,
          studentCount: totalStudents,
          videoCount
        };
      } catch (error) {
        console.error(`Error processing course ${course.title}:`, error);
        return {
          ...course,
          assignedTeachers: [],
          teacherCount: 0,
          studentCount: 0,
          videoCount: 0
        };
      }
    }));

    res.json({
      department: hod.department,
      courses: coursesWithDetails.sort((a, b) => a.title.localeCompare(b.title))
    });
  } catch (error) {
    console.error('Error fetching department courses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Request teacher assignment to section (requires dean approval)
const requestTeacherAssignment = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { teacherId, sectionId, reason } = req.body;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    // Verify teacher is in HOD's department
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Teacher must be in your department' });
    }

    // Verify section is in HOD's department
    const section = await Section.findById(sectionId);
    if (!section || section.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Section must be in your department' });
    }

    // Create assignment request
    const AssignmentRequest = require('../models/AssignmentRequest');
    const request = new AssignmentRequest({
      requestedBy: hodId,
      requestType: 'teacher_to_section',
      teacher: teacherId,
      section: sectionId,
      reason: reason,
      status: 'pending',
      department: hod.department._id
    });

    await request.save();

    // Notify dean (you can implement notification system)
    
    res.json({ 
      message: 'Teacher assignment request sent to Dean for approval',
      requestId: request._id 
    });
  } catch (error) {
    console.error('Error requesting teacher assignment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Request course assignment to section (requires dean approval)
const requestCourseAssignment = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { courseId, sectionId, reason } = req.body;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    // Verify course is in HOD's department
    const course = await Course.findById(courseId);
    if (!course || course.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Course must be in your department' });
    }

    // Verify section is in HOD's department
    const section = await Section.findById(sectionId);
    if (!section || section.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Section must be in your department' });
    }

    // Create assignment request
    const AssignmentRequest = require('../models/AssignmentRequest');
    const request = new AssignmentRequest({
      requestedBy: hodId,
      requestType: 'course_to_section',
      course: courseId,
      section: sectionId,
      reason: reason,
      status: 'pending',
      department: hod.department._id
    });

    await request.save();

    res.json({ 
      message: 'Course assignment request sent to Dean for approval',
      requestId: request._id 
    });
  } catch (error) {
    console.error('Error requesting course assignment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get HOD's assignment requests
const getAssignmentRequests = async (req, res) => {
  try {
    const hodId = req.user.id;
    
    const AssignmentRequest = require('../models/AssignmentRequest');
    const requests = await AssignmentRequest.find({ requestedBy: hodId })
      .populate('teacher', 'name email')
      .populate('course', 'title courseCode')
      .populate('section', 'name')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching assignment requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get comprehensive department analytics
const getDepartmentAnalytics = async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;

    // Get basic department stats
    const [teachers, students, courses, sections] = await Promise.all([
      User.find({ 
        department: departmentId, 
        $or: [
          { role: 'teacher' },
          { roles: { $in: ['teacher'] } }
        ],
        isActive: { $ne: false } 
      })
        .select('name email teacherId createdAt')
        .sort({ name: 1 }),
      User.find({ 
        department: departmentId, 
        $or: [
          { role: 'student' },
          { roles: { $in: ['student'] } }
        ],
        isActive: { $ne: false } 
      })
        .select('name email regNo createdAt')
        .sort({ name: 1 }),
      Course.find({ department: departmentId })
        .select('title courseCode semester year createdAt')
        .sort({ title: 1 }),
      Section.find({ department: departmentId })
        .select('name createdAt')
        .sort({ name: 1 })
    ]);

    // Get total video watch time and completion stats
    const videoStats = await Video.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      {
        $match: {
          'courseData.department': departmentId
        }
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalWatchTime: { $sum: '$analytics.totalWatchTime' },
          totalViews: { $sum: '$analytics.totalViews' },
          avgCompletionRate: { $avg: '$analytics.completionRate' }
        }
      }
    ]);

    // Get quiz performance stats
    const quizStats = await QuizAttempt.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      {
        $match: {
          'courseData.department': departmentId,
          isComplete: true
        }
      },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: '$percentage' },
          totalPassed: { $sum: { $cond: ['$passed', 1, 0] } },
          avgTimeSpent: { $avg: '$timeSpent' }
        }
      }
    ]);

    // Get monthly enrollment trends
    const monthlyEnrollment = await User.aggregate([
      {
        $match: {
          department: departmentId,
          role: 'student',
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } // This year
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get grade distribution
    const gradeDistribution = await QuizAttempt.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseData'
        }
      },
      {
        $match: {
          'courseData.department': departmentId,
          isComplete: true
        }
      },
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 60, 70, 80, 90, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$percentage' }
          }
        }
      }
    ]);

    // Calculate overall department performance
    const departmentStats = {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalCourses: courses.length,
      totalSections: sections.length,
      videoMetrics: videoStats[0] || {
        totalVideos: 0,
        totalWatchTime: 0,
        totalViews: 0,
        avgCompletionRate: 0
      },
      quizMetrics: quizStats[0] || {
        totalAttempts: 0,
        avgScore: 0,
        totalPassed: 0,
        avgTimeSpent: 0
      },
      passRate: quizStats[0] ? ((quizStats[0].totalPassed / quizStats[0].totalAttempts) * 100) : 0
    };

    res.json({
      department: hod.department,
      statistics: departmentStats,
      monthlyEnrollment,
      gradeDistribution,
      teacherList: teachers,
      recentStudents: students.slice(0, 10) // Last 10 students
    });
  } catch (error) {
    console.error('Error fetching department analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get course-wise analytics for HOD department
const getCourseAnalytics = async (req, res) => {
  try {
    const hodId = req.user.id;
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }
    const departmentId = hod.department._id;

    const courses = await Course.find({ department: departmentId, isActive: { $ne: false } })
      .select('_id title courseCode')
      .sort({ title: 1 });

    // Preload videos count per course
    const videosByCourse = await Video.aggregate([
      { $match: { course: { $in: courses.map(c => c._id) } } },
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ]);
    const videoCountMap = new Map(videosByCourse.map(v => [v._id.toString(), v.count]));

    // Preload enrollment via sections
    const sections = await Section.find({ department: departmentId, courses: { $in: courses.map(c => c._id) } })
      .select('_id courses students');
    const courseStudentsMap = new Map(); // courseId -> Set(studentIds)
    for (const sec of sections) {
      for (const cid of (sec.courses || [])) {
        const key = cid.toString();
        if (!courseStudentsMap.has(key)) courseStudentsMap.set(key, new Set());
        (sec.students || []).forEach(sid => courseStudentsMap.get(key).add(sid.toString()));
      }
    }

    // Quiz metrics per course
    const quizAgg = await QuizAttempt.aggregate([
      { $match: { course: { $in: courses.map(c => c._id) }, isComplete: true } },
      { $group: {
        _id: '$course',
        totalAttempts: { $sum: 1 },
        avgScore: { $avg: '$percentage' },
        totalPassed: { $sum: { $cond: ['$passed', 1, 0] } }
      }}
    ]);
    const quizMap = new Map(quizAgg.map(q => [q._id.toString(), q]));

    // Total watch time per course (approx via StudentProgress units.videosWatched.timeSpent)
    const spAgg = await StudentProgress.aggregate([
      { $match: { course: { $in: courses.map(c => c._id) } } },
      { $unwind: { path: '$units', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$units.videosWatched', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$course', totalWatchTime: { $sum: { $ifNull: ['$units.videosWatched.timeSpent', 0] } } } }
    ]);
    const watchMap = new Map(spAgg.map(s => [s._id.toString(), s.totalWatchTime]));

    const result = courses.map(c => {
      const key = c._id.toString();
      const vc = videoCountMap.get(key) || 0;
      const studentsSet = courseStudentsMap.get(key) || new Set();
      const q = quizMap.get(key);
      const totalAttempts = q ? q.totalAttempts : 0;
      const quizPassRate = totalAttempts ? (q.totalPassed / totalAttempts) * 100 : 0;
      const avgQuizScore = q ? q.avgScore : 0;
      const totalWatchTime = watchMap.get(key) || 0;
      return {
        _id: c._id,
        title: c.title,
        courseCode: c.courseCode,
        enrollmentCount: studentsSet.size,
        videoCount: vc,
        totalWatchTime,
        avgQuizScore,
        quizPassRate,
        avgOverallProgress: null // can be added later if needed
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get course relations: teachers and students with their sections for this course
const getCourseRelations = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { courseId } = req.params;
    const { page = 1, limit = 25 } = req.query;

    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const course = await Course.findOne({ _id: courseId, department: hod.department._id });
    if (!course) return res.status(404).json({ message: 'Course not found in your department' });

    const courseSections = await Section.find({ department: hod.department._id, courses: { $in: [course._id] } })
      .populate('teacher', 'name email teacherId')
      .select('_id name teacher students');

    // Teachers from sections and SectionCourseTeacher assignments only
    const sectionTeachers = courseSections.map(s => s.teacher).filter(Boolean);
    
    // Get teachers from SectionCourseTeacher assignments
    const courseAssignments = await SectionCourseTeacher.find({
      course: courseId,
      isActive: true
    }).populate('teacher', 'name email teacherId');
    
    const assignedTeachers = courseAssignments.map(a => a.teacher).filter(Boolean);
    
    const teacherMap = new Map();
    [...sectionTeachers, ...assignedTeachers].forEach(t => { if (t) teacherMap.set(t._id.toString(), t); });
    const teachers = Array.from(teacherMap.values());

    // Students from sections
    const studentIdSet = new Set();
    courseSections.forEach(s => (s.students || []).forEach(sid => studentIdSet.add(sid.toString())));
    const allStudentIds = Array.from(studentIdSet);
    const totalStudents = allStudentIds.length;

    // paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const sliceIds = allStudentIds.slice(start, start + parseInt(limit));
    const students = await User.find({ _id: { $in: sliceIds }, role: 'student', isActive: { $ne: false } })
      .select('_id name email regNo assignedSections');

    // Map section names for each student but only for sections containing this course
    const sectionNameById = new Map(courseSections.map(s => [s._id.toString(), s.name]));
    const studentRows = students.map(st => {
      const secNames = (st.assignedSections || [])
        .map(sid => sid.toString())
        .filter(id => sectionNameById.has(id))
        .map(id => sectionNameById.get(id));
      return {
        _id: st._id,
        name: st.name,
        email: st.email,
        regNo: st.regNo,
        sections: secNames
      };
    });

    return res.json({
      course: { _id: course._id, title: course.title, courseCode: course.courseCode },
      teachers,
      students: studentRows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalStudents,
        totalPages: Math.max(Math.ceil(totalStudents / parseInt(limit)), 1)
      }
    });
  } catch (error) {
    console.error('Error fetching course relations (HOD):', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get sections for a given course (HOD scope)
const getCourseSections = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { courseId } = req.params;
    const { page = 1, limit = 25 } = req.query;

    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const course = await Course.findOne({ _id: courseId, department: hod.department._id }).select('_id title courseCode');
    if (!course) return res.status(404).json({ message: 'Course not found in your department' });

    const filter = { department: hod.department._id, courses: { $in: [course._id] }, isActive: { $ne: false } };
    const total = await Section.countDocuments(filter);
    const sections = await Section.find(filter)
      .populate('teacher', 'name email teacherId')
      .populate('students', '_id name regNo')
      .select('name teacher students')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const data = sections.map(s => ({
      _id: s._id,
      name: s.name,
      teacher: s.teacher ? { _id: s.teacher._id, name: s.teacher.name, email: s.teacher.email, teacherId: s.teacher.teacherId } : null,
      students: s.students || [], // Return full students array
      studentsCount: Array.isArray(s.students) ? s.students.length : 0
    }));

    return res.json({
      course: { _id: course._id, title: course.title, courseCode: course.courseCode },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.max(Math.ceil(total / parseInt(limit)), 1) },
      sections: data
    });
  } catch (error) {
    console.error('Error fetching course sections (HOD):', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get student-wise analytics
const getStudentAnalytics = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    console.log('HOD Student Analytics Request:', { hodId, page, limit, search, sortBy, sortOrder });
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;
    console.log('HOD Department:', hod.department.name, departmentId);

    // Build search filter
    let matchConditions = {
      department: departmentId,
      role: 'student',
      isActive: { $ne: false }
    };

    if (search && search.trim() !== '') {
      matchConditions.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { regNo: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    console.log('Match conditions:', JSON.stringify(matchConditions, null, 2));

    // Get students with detailed analytics
    const studentAnalytics = await User.aggregate([
      {
        $match: matchConditions
      },
      {
        $lookup: {
          from: 'studentprogresses',
          localField: '_id',
          foreignField: 'student',
          as: 'progress'
        }
      },
      {
        $lookup: {
          from: 'quizattempts',
          localField: '_id',
          foreignField: 'student',
          as: 'quizAttempts'
        }
      },
      {
        $lookup: {
          from: 'videos',
          let: { studentId: '$_id' },
          pipeline: [
            {
              $match: {
                'watchRecords.student': { $exists: true }
              }
            },
            {
              $unwind: '$watchRecords'
            },
            {
              $match: {
                $expr: { $eq: ['$watchRecords.student', '$$studentId'] }
              }
            }
          ],
          as: 'videoProgress'
        }
      },
      {
        $addFields: {
          totalCourses: { $size: '$progress' },
          avgProgress: { $avg: '$progress.overallProgress' },
          totalQuizAttempts: { $size: '$quizAttempts' },
          avgQuizScore: { $avg: '$quizAttempts.percentage' },
          quizPassRate: {
            $cond: [
              { $gt: [{ $size: '$quizAttempts' }, 0] },
              {
                $multiply: [
                  { $divide: [{ $size: { $filter: { input: '$quizAttempts', cond: { $eq: ['$$this.passed', true] } } } }, { $size: '$quizAttempts' }] },
                  100
                ]
              },
              0
            ]
          },
          totalWatchTime: { $sum: '$videoProgress.watchRecords.timeSpent' },
          videosWatched: { $size: '$videoProgress' },
          lastActivity: { $max: '$progress.lastActivity' }
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          regNo: 1,
          totalCourses: 1,
          avgProgress: 1,
          totalQuizAttempts: 1,
          avgQuizScore: 1,
          quizPassRate: 1,
          totalWatchTime: 1,
          videosWatched: 1,
          lastActivity: 1,
          createdAt: 1
        }
      },
      {
        $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
      },
      {
        $skip: (page - 1) * parseInt(limit)
      },
      {
        $limit: parseInt(limit)
      }
    ]);
    
    console.log('Student analytics aggregation completed, results:', studentAnalytics.length);

    // Get total count for pagination
    const totalCount = await User.countDocuments(matchConditions);
    
    console.log('Found students:', studentAnalytics.length, 'Total count:', totalCount);

    res.json({
      students: studentAnalytics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get section-wise analytics (students from assignedSections, courses from section.courses)
const getSectionAnalytics = async (req, res) => {
  try {
    const hodId = req.user.id;
    
    // Get HOD's department with school
    const hod = await User.findById(hodId).populate({
      path: 'department',
      populate: { path: 'school' }
    });
    if (!hod || !hod.department || !hod.department.school) {
      return res.status(404).json({ message: 'HOD department or school not found' });
    }

    const departmentId = hod.department._id;
    const schoolId = hod.department.school._id;

    // Find sections that belong to HOD's school and have courses from HOD's department
    const sectionCourseTeachers = await SectionCourseTeacher.find({})
      .populate({
        path: 'course',
        match: { department: departmentId },
        select: '_id'
      })
      .populate('section', '_id school name');

    // Filter and group by section
    const validSectionCourses = sectionCourseTeachers.filter(sct => 
      sct.course && sct.section && sct.section.school.toString() === schoolId.toString()
    );

    const sectionMap = {};
    validSectionCourses.forEach(sct => {
      const sectionId = sct.section._id.toString();
      if (!sectionMap[sectionId]) {
        sectionMap[sectionId] = {
          section: sct.section,
          courseIds: []
        };
      }
      sectionMap[sectionId].courseIds.push(sct.course._id);
    });

    const sectionAnalytics = [];

    for (const [sectionId, data] of Object.entries(sectionMap)) {
      const { section, courseIds } = data;

      // Get students assigned to this section
      const students = await User.find({
        role: 'student',
        isActive: { $ne: false },
        assignedSections: section._id
      }).select('_id');

      const studentIds = students.map(s => s._id);

      // Get progress for these students in department courses
      const progress = await StudentProgress.find({
        student: { $in: studentIds },
        course: { $in: courseIds }
      });

      // Get quiz attempts for these students in department courses
      const quizAttempts = await QuizAttempt.find({
        student: { $in: studentIds },
        course: { $in: courseIds },
        isComplete: true
      });

      // Calculate statistics
      const avgProgress = progress.length > 0 
        ? progress.reduce((sum, p) => sum + (p.overallProgress || 0), 0) / progress.length 
        : 0;

      const avgQuizScore = quizAttempts.length > 0 
        ? quizAttempts.reduce((sum, q) => sum + (q.percentage || 0), 0) / quizAttempts.length 
        : 0;

      const passedQuizzes = quizAttempts.filter(q => q.passed).length;
      const quizPassRate = quizAttempts.length > 0 ? (passedQuizzes / quizAttempts.length) * 100 : 0;

      const recentActivity = progress.filter(p => 
        p.lastActivity && p.lastActivity >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      sectionAnalytics.push({
        _id: section._id,
        name: section.name,
        studentCount: studentIds.length,
        courseCount: courseIds.length,
        avgProgress: Math.round(avgProgress * 100) / 100,
        totalQuizAttempts: quizAttempts.length,
        avgQuizScore: Math.round(avgQuizScore * 100) / 100,
        quizPassRate: Math.round(quizPassRate * 100) / 100,
        activeStudents: recentActivity.length,
        createdAt: section.createdAt
      });
    }

    // Sort sections by name
    sectionAnalytics.sort((a, b) => a.name.localeCompare(b.name));

    res.json(sectionAnalytics);
  } catch (error) {
    console.error('Error fetching section analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get detailed analytics for a specific section
const getSpecificSectionAnalytics = async (req, res) => {
  try {
    const hodId = req.user.id;
    const sectionId = req.params.sectionId;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;

    // Verify section exists and belongs to HOD's school (sections belong to school, not department)
    const section = await Section.findById(sectionId).populate('school');
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Check if HOD's department school matches section's school
    const hodDepartment = await Department.findById(departmentId).populate('school');
    if (section.school._id.toString() !== hodDepartment.school._id.toString()) {
      return res.status(403).json({ message: 'Access denied to this section' });
    }

    // Get students assigned to this section
    const sectionStudents = await User.find({
      role: 'student',
      isActive: { $ne: false },
      assignedSections: sectionId
    }).select('name email rollNumber');

    // Get courses assigned to this section with teacher details using SectionCourseTeacher
    const sectionCourseTeachers = await SectionCourseTeacher.find({ section: sectionId })
      .populate({
        path: 'course',
        select: 'name code credits description',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .populate('teacher', 'name email')
      .populate('section', 'name');

    // Get detailed progress for each student in each course
    const studentProgress = await StudentProgress.find({
      student: { $in: sectionStudents.map(s => s._id) },
      course: { $in: sectionCourseTeachers.map(sct => sct.course._id) }
    }).populate('student', 'name email rollNumber')
      .populate('course', 'title courseCode');

    // Get quiz attempts for section students in section courses
    const quizAttempts = await QuizAttempt.find({
      student: { $in: sectionStudents.map(s => s._id) },
      course: { $in: sectionCourseTeachers.map(sct => sct.course._id) },
      isComplete: true
    }).populate('student', 'name email rollNumber')
      .populate('course', 'title courseCode');

    // Calculate course-wise statistics
    const courseStats = sectionCourseTeachers.map(sct => {
      const courseProgress = studentProgress.filter(sp => sp.course._id.toString() === sct.course._id.toString());
      const courseQuizzes = quizAttempts.filter(qa => qa.course._id.toString() === sct.course._id.toString());
      
      const avgProgress = courseProgress.length > 0 
        ? courseProgress.reduce((sum, cp) => sum + (cp.overallProgress || 0), 0) / courseProgress.length 
        : 0;
      
      const avgQuizScore = courseQuizzes.length > 0 
        ? courseQuizzes.reduce((sum, cq) => sum + (cq.percentage || 0), 0) / courseQuizzes.length 
        : 0;
      
      const passedQuizzes = courseQuizzes.filter(cq => cq.passed).length;
      const passRate = courseQuizzes.length > 0 ? (passedQuizzes / courseQuizzes.length) * 100 : 0;

      return {
        course: sct.course,
        teacher: sct.teacher,
        enrolledStudents: courseProgress.length,
        averageProgress: Math.round(avgProgress * 100) / 100,
        averageQuizScore: Math.round(avgQuizScore * 100) / 100,
        quizPassRate: Math.round(passRate * 100) / 100,
        totalQuizAttempts: courseQuizzes.length,
        activeStudents: courseProgress.filter(cp => 
          cp.lastActivity && cp.lastActivity >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      };
    });

    // Calculate student-wise statistics
    const studentStats = sectionStudents.map(student => {
      const studentCourseProgress = studentProgress.filter(sp => sp.student._id.toString() === student._id.toString());
      const studentQuizzes = quizAttempts.filter(qa => qa.student._id.toString() === student._id.toString());
      
      const avgProgress = studentCourseProgress.length > 0 
        ? studentCourseProgress.reduce((sum, scp) => sum + (scp.overallProgress || 0), 0) / studentCourseProgress.length 
        : 0;
      
      const avgQuizScore = studentQuizzes.length > 0 
        ? studentQuizzes.reduce((sum, sq) => sum + (sq.percentage || 0), 0) / studentQuizzes.length 
        : 0;
      
      const passedQuizzes = studentQuizzes.filter(sq => sq.passed).length;
      const passRate = studentQuizzes.length > 0 ? (passedQuizzes / studentQuizzes.length) * 100 : 0;

      const lastActivity = studentCourseProgress.reduce((latest, scp) => {
        return scp.lastActivity && (!latest || scp.lastActivity > latest) ? scp.lastActivity : latest;
      }, null);

      return {
        student: student,
        enrolledCourses: studentCourseProgress.length,
        averageProgress: Math.round(avgProgress * 100) / 100,
        averageQuizScore: Math.round(avgQuizScore * 100) / 100,
        quizPassRate: Math.round(passRate * 100) / 100,
        totalQuizAttempts: studentQuizzes.length,
        lastActivity: lastActivity,
        isActive: lastActivity && lastActivity >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      };
    });

    // Calculate overall section statistics
    const sectionStats = {
      totalStudents: sectionStudents.length,
      totalCourses: sectionCourseTeachers.length,
      averageProgress: studentStats.length > 0 
        ? studentStats.reduce((sum, ss) => sum + ss.averageProgress, 0) / studentStats.length 
        : 0,
      averageQuizScore: studentStats.length > 0 
        ? studentStats.reduce((sum, ss) => sum + ss.averageQuizScore, 0) / studentStats.length 
        : 0,
      totalQuizAttempts: quizAttempts.length,
      activeStudents: studentStats.filter(ss => ss.isActive).length,
      quizPassRate: quizAttempts.length > 0 
        ? (quizAttempts.filter(qa => qa.passed).length / quizAttempts.length) * 100 
        : 0
    };

    res.json({
      section: {
        _id: section._id,
        name: section.name,
        school: section.school
      },
      statistics: {
        ...sectionStats,
        averageProgress: Math.round(sectionStats.averageProgress * 100) / 100,
        averageQuizScore: Math.round(sectionStats.averageQuizScore * 100) / 100,
        quizPassRate: Math.round(sectionStats.quizPassRate * 100) / 100
      },
      courseBreakdown: courseStats,
      studentPerformance: studentStats,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching specific section analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get detailed analytics for a specific student
const getStudentDetailedAnalytics = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { studentId } = req.params;
    
    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }

    const departmentId = hod.department._id;

    // Verify student is in HOD's department
    const student = await User.findById(studentId);
    if (!student || student.department.toString() !== departmentId.toString()) {
      return res.status(403).json({ message: 'Student not in your department' });
    }

    // Get comprehensive student data
    const [studentProgress, quizAttempts, videoWatchData] = await Promise.all([
      StudentProgress.find({ student: studentId })
        .populate('course', 'title courseCode')
        .sort({ updatedAt: -1 }),
      QuizAttempt.find({ student: studentId, isComplete: true })
        .populate('course', 'title courseCode')
        .populate('quiz', 'title')
        .sort({ completedAt: -1 }),
      Video.find({
        'watchRecords.student': studentId
      })
      .populate('course', 'title courseCode')
      .select('title course duration watchRecords')
    ]);

    // Calculate video watch statistics
    const videoStats = videoWatchData.map(video => {
      const watchRecord = video.watchRecords.find(record => 
        record.student.toString() === studentId
      );
      return {
        videoTitle: video.title,
        course: video.course,
        duration: video.duration,
        timeSpent: watchRecord?.timeSpent || 0,
        completed: watchRecord?.completed || false,
        lastWatched: watchRecord?.lastWatched,
        completionPercentage: video.duration ? ((watchRecord?.timeSpent || 0) / video.duration * 100) : 0
      };
    });

    // Calculate summary statistics
    const summary = {
      totalCourses: studentProgress.length,
      avgProgress: studentProgress.length > 0 ? 
        studentProgress.reduce((sum, p) => sum + p.overallProgress, 0) / studentProgress.length : 0,
      totalQuizAttempts: quizAttempts.length,
      avgQuizScore: quizAttempts.length > 0 ?
        quizAttempts.reduce((sum, q) => sum + q.percentage, 0) / quizAttempts.length : 0,
      quizPassRate: quizAttempts.length > 0 ?
        (quizAttempts.filter(q => q.passed).length / quizAttempts.length * 100) : 0,
      totalWatchTime: videoStats.reduce((sum, v) => sum + v.timeSpent, 0),
      videosWatched: videoStats.filter(v => v.completed).length,
      totalVideos: videoStats.length
    };

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        regNo: student.regNo
      },
      summary,
      courseProgress: studentProgress,
      quizHistory: quizAttempts.slice(0, 20), // Last 20 attempts
      videoWatchData: videoStats.slice(0, 50) // Last 50 videos
    });
  } catch (error) {
    console.error('Error fetching student detailed analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get available sections for a teacher-course assignment (smart section selection)
const getAvailableSectionsForTeacherCourse = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { teacherId, courseId } = req.params;

    // Get HOD's department and school
    const hod = await User.findById(hodId).populate({
      path: 'department',
      populate: { path: 'school' }
    });
    if (!hod || !hod.department || !hod.department.school) {
      return res.status(404).json({ message: 'HOD department or school not found' });
    }

    // Verify teacher belongs to HOD's department
    const teacher = await User.findById(teacherId);
    const hasTeacherRole = teacher && (
      teacher.role === 'teacher' || 
      (teacher.roles && teacher.roles.includes('teacher'))
    );
    if (!teacher || !hasTeacherRole || teacher.department?.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Teacher must be in your department' });
    }

    // Verify course belongs to HOD's department
    const course = await Course.findById(courseId);
    if (!course || course.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Course must be in your department' });
    }

    // Find sections in the same school that contain this specific course
    const availableSections = await Section.find({
      school: hod.department.school._id,
      courses: courseId,
      isActive: { $ne: false }
    })
    .select('name code courses school')
    .populate('school', 'name')
    .sort({ name: 1 });

    res.json({
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email
      },
      course: {
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode
      },
      availableSections: availableSections,
      message: `Found ${availableSections.length} sections where ${course.title} is taught`
    });
  } catch (error) {
    console.error('Error getting available sections for teacher-course:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/hod/announcements/history
function getHODAnnouncementHistory(req, res) {
  return (async () => {
    try {
      const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
      const pageNum = Math.max(parseInt(page), 1);
      const limitNum = Math.max(parseInt(limit), 1);
      const skip = (pageNum - 1) * limitNum;

      // Build filter
      const filter = { 
        sender: req.user._id,
        role: 'hod'
      };

      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        filter.approvalStatus = status;
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }

      // Get announcements with populated data
      const announcements = await Announcement.find(filter)
        .populate('targetAudience.specificUsers', 'name email role regNo teacherId')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Announcement.countDocuments(filter);

      // Format response data
      const formattedAnnouncements = announcements.map(announcement => {
        // Count participants by role
        const participants = announcement.targetAudience?.specificUsers || [];
        const participantStats = participants.reduce((acc, user) => {
          if (!user) return acc;
          const userRole = user.role;
          acc[userRole] = (acc[userRole] || 0) + 1;
          acc.total = (acc.total || 0) + 1;
          return acc;
        }, {});

        // Format participant details
        const participantDetails = participants.map(user => {
          if (!user) return null;
          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            uid: user.regNo || user.teacherId || user._id
          };
        }).filter(Boolean);

        return {
          _id: announcement._id,
          title: announcement.title,
          message: announcement.message,
          createdAt: announcement.createdAt,
          updatedAt: announcement.updatedAt,
          approvalStatus: announcement.approvalStatus,
          requiresApproval: announcement.requiresApproval,
          targetRoles: announcement.targetAudience?.targetRoles || [],
          participantStats,
          participantDetails,
          approvedBy: announcement.approvedBy ? {
            _id: announcement.approvedBy._id,
            name: announcement.approvedBy.name,
            email: announcement.approvedBy.email
          } : null,
          approvalNote: announcement.approvalNote,
          approvalComments: announcement.approvalComments
        };
      });

      res.json({
        announcements: formattedAnnouncements,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPreviousPage: pageNum > 1
        }
      });

    } catch (err) {
      console.error('Error fetching HOD announcement history:', err);
      res.status(500).json({ message: err.message });
    }
  })();
}

// GET /api/hod/approvals/history - Announcements that HOD approved for teachers
function getHODApprovalHistory(req, res) {
  return (async () => {
    try {
      const { page = 1, limit = 10, dateFrom, dateTo } = req.query;
      const pageNum = Math.max(parseInt(page), 1);
      const limitNum = Math.max(parseInt(limit), 1);
      const skip = (pageNum - 1) * limitNum;

      // Build filter - find announcements approved BY this HOD
      const filter = { 
        approvedBy: req.user._id,
        approvalStatus: 'approved',
        role: 'teacher' // Only teacher announcements that this HOD approved
      };

      if (dateFrom || dateTo) {
        filter.approvedAt = {};
        if (dateFrom) filter.approvedAt.$gte = new Date(dateFrom);
        if (dateTo) filter.approvedAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }

      // Get approved announcements with sender details
      const announcements = await Announcement.find(filter)
        .populate('sender', 'name email role teacherId')
        .populate('targetAudience.specificUsers', 'name email role regNo teacherId')
        .sort({ approvedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Announcement.countDocuments(filter);

      // Format response data
      const formattedAnnouncements = announcements.map(announcement => {
        // Count participants by role
        const participants = announcement.targetAudience?.specificUsers || [];
        const participantStats = participants.reduce((acc, user) => {
          if (!user) return acc;
          const userRole = user.role;
          acc[userRole] = (acc[userRole] || 0) + 1;
          acc.total = (acc.total || 0) + 1;
          return acc;
        }, {});

        // Format participant details
        const participantDetails = participants.map(user => {
          if (!user) return null;
          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            uid: user.regNo || user.teacherId || user._id
          };
        }).filter(Boolean);

        return {
          _id: announcement._id,
          title: announcement.title,
          message: announcement.message,
          createdAt: announcement.createdAt,
          approvedAt: announcement.approvedAt,
          approvalComments: announcement.approvalComments,
          sender: announcement.sender ? {
            _id: announcement.sender._id,
            name: announcement.sender.name,
            email: announcement.sender.email,
            role: announcement.sender.role,
            uid: announcement.sender.teacherId || announcement.sender._id
          } : null,
          targetRoles: announcement.targetAudience?.targetRoles || [],
          participantStats,
          participantDetails
        };
      });

      res.json({
        approvals: formattedAnnouncements,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPreviousPage: pageNum > 1
        }
      });

    } catch (err) {
      console.error('Error fetching HOD approval history:', err);
      res.status(500).json({ message: err.message });
    }
  })();
}

// Get section-courses for HOD's department
const getSectionCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const hodUser = await User.findById(userId).populate('department');
    
    if (!hodUser || hodUser.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied. HOD role required.' });
    }
    
    // Find all sections in HOD's department
    const sections = await Section.find({ department: hodUser.department._id })
      .populate({
        path: 'courses.course',
        populate: {
          path: 'department',
          select: 'name'
        }
      });
    
    // Extract section-course combinations
    const sectionCourses = [];
    sections.forEach(section => {
      if (section.courses && section.courses.length > 0) {
        section.courses.forEach(courseData => {
          if (courseData.course && courseData.course.department._id.toString() === hodUser.department._id.toString()) {
            sectionCourses.push({
              _id: `${section._id}_${courseData.course._id}`,
              section: {
                _id: section._id,
                name: section.name,
                code: section.code
              },
              course: {
                _id: courseData.course._id,
                title: courseData.course.title,
                courseCode: courseData.course.courseCode,
                department: courseData.course.department
              }
            });
          }
        });
      }
    });
    
    res.json({ sectionCourses });
  } catch (error) {
    console.error('Get section courses error:', error);
    res.status(500).json({ 
      message: 'Failed to get section courses',
      error: error.message 
    });
  }
};

// Get available teachers for a course in HOD's department
const getAvailableTeachersForCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;
    
    const hodUser = await User.findById(userId).populate('department');
    
    if (!hodUser || hodUser.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied. HOD role required.' });
    }
    
    // Verify course belongs to HOD's department
    const course = await Course.findById(courseId);
    if (!course || course.department.toString() !== hodUser.department._id.toString()) {
      return res.status(403).json({ message: 'Course not found in your department' });
    }
    
    // Get teachers in the same department as the course
    const teachers = await User.find({
      department: course.department,
      $or: [
        { role: 'teacher' },
        { roles: { $in: ['teacher'] } }
      ],
      isActive: { $ne: false }
    }).select('name email teacherId');
    
    res.json({ teachers });
  } catch (error) {
    console.error('Get available teachers error:', error);
    res.status(500).json({ 
      message: 'Failed to get available teachers',
      error: error.message 
    });
  }
};

module.exports = {
  getHODDashboard,
  getPendingAnnouncements,
  reviewAnnouncement,
  getDepartmentTeachers,
  getDepartmentSections,
  getDepartmentCourses,
  requestTeacherAssignment,
  requestCourseAssignment,
  getAssignmentRequests,
  getDepartmentAnalytics,
  getCourseAnalytics,
  getStudentAnalytics,
  getSectionAnalytics,
  getSpecificSectionAnalytics,
  getStudentDetailedAnalytics,
  getCourseRelations,
  getCourseSections,
  assignTeacherToSectionCourse,
  removeTeacherFromSectionCourse,
  changeTeacherSection,
  getAvailableSectionsForTeacherCourse,
  assignTeacherToSectionCourse,
  removeTeacherFromSectionCourse,
  // CC related (defined below)
  assignCourseCoordinator,
  removeCourseCoordinator,
  getCourseCoordinators,
  getFlaggedReviews,
  hodResolveFlaggedReview,
  // Questions management (HOD)
  getApprovedQuestions,
  updateQuizQuestion,
  deleteQuizQuestion,
  createQuizQuestion,
  getSectionCourses,
  getAvailableTeachersForCourse,
  getHODAnnouncementHistory,
  getHODApprovalHistory
};

// Assign a Course Coordinator (CC) to a course (HOD only)
// BUSINESS RULE: One course can have only ONE CC, and one teacher can be CC for only ONE course
async function assignCourseCoordinator(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });
    const { courseId, userId } = req.body;
    
    // Validate course exists and belongs to HOD's department
    const course = await Course.findOne({ _id: courseId, department: hod.department._id });
    if (!course) return res.status(404).json({ message: 'Course not found in your department' });
    
    // Validate user exists and belongs to HOD's department
    const user = await User.findById(userId);
    if (!user || user.department?.toString() !== hod.department._id.toString()) {
      return res.status(400).json({ message: 'User must belong to your department' });
    }
    
    // Ensure user is a teacher (support multi-role users)
    const hasTeacherRole = user.role === 'teacher' || (user.roles && user.roles.includes('teacher'));
    if (!hasTeacherRole) return res.status(400).json({ message: 'User is not a teacher' });
    
    // RULE 1: Remove this teacher from ALL other courses' coordinators in the department
    // (One teacher can be CC for only one course)
    await Course.updateMany(
      { department: hod.department._id, coordinators: userId, _id: { $ne: courseId } },
      { $pull: { coordinators: userId } }
    );
    
    // RULE 2: Remove ALL existing coordinators from this course
    // (One course can have only one CC)
    await Course.findByIdAndUpdate(courseId, { coordinators: [] });
    
    // RULE 3: Assign the new teacher as the ONLY CC for this course
    await Course.findByIdAndUpdate(courseId, { coordinators: [userId] });
    
    return res.json({ 
      message: 'Coordinator assigned successfully. Previous coordinators removed (one course = one CC rule).',
      teacherName: user.name,
      courseName: course.title
    });
  } catch (e) {
    console.error('assignCourseCoordinator error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Remove CC from course
async function removeCourseCoordinator(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });
    const { courseId, userId } = req.body;
    const course = await Course.findOne({ _id: courseId, department: hod.department._id });
    if (!course) return res.status(404).json({ message: 'Course not found in your department' });
    await Course.findByIdAndUpdate(courseId, { $pull: { coordinators: userId } });
    return res.json({ message: 'Coordinator removed from course' });
  } catch (e) {
    console.error('removeCourseCoordinator error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// List course coordinators for a course
async function getCourseCoordinators(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });
    const { courseId } = req.params;
    const course = await Course.findOne({ _id: courseId, department: hod.department._id }).populate('coordinators', 'name email');
    if (!course) return res.status(404).json({ message: 'Course not found in your department' });
    res.json(course.coordinators || []);
  } catch (e) {
    console.error('getCourseCoordinators error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// HOD: Get flagged reviews for courses in their department (HOD can see uploader identity)
async function getFlaggedReviews(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });
    const { courseId, unitId, page = 1, limit = 25 } = req.query;
    // Filter flagged reviews for courses within the department
    const deptCourseIds = (await Course.find({ department: hod.department._id }).select('_id')).map(c => c._id);
    const filter = { status: 'flagged', course: { $in: deptCourseIds } };
    if (courseId) filter.course = courseId;
    if (unitId) filter.unit = unitId;
    const total = await QuestionReview.countDocuments(filter);
    const items = await QuestionReview.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('course', 'title courseCode')
      .populate('unit', 'title')
      .populate('uploader', 'name email teacherId')
      .populate('assignedTo', 'name email teacherId');
    res.json({ total, page: parseInt(page), limit: parseInt(limit), items });
  } catch (e) {
    console.error('getFlaggedReviews error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// HOD resolve flagged: approve (add to pool) or reject
async function hodResolveFlaggedReview(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });
    const { reviewId } = req.params;
    const { action, note } = req.body; // 'approve' | 'reject'
    const review = await QuestionReview.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    // ensure course within department
    const course = await Course.findById(review.course);
    if (!course || course.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }
    if (review.status !== 'flagged') return res.status(400).json({ message: 'Review is not flagged' });

    if (action === 'approve') {
      // ensure pool contains the quiz
      const QuizPool = require('../models/QuizPool');
      const Unit = require('../models/Unit');
      let pool = await QuizPool.findOne({ course: review.course, unit: review.unit });
      if (!pool) {
        const unit = await Unit.findById(review.unit).select('title');
        pool = new QuizPool({
          title: `${unit?.title || 'Unit'} Quiz Pool`,
          description: `Quiz pool for ${unit?.title || 'unit'}`,
          course: review.course,
          unit: review.unit,
          questionsPerAttempt: 10,
          timeLimit: 30,
          passingScore: 70,
          unlockNextVideo: true,
          createdBy: req.user._id,
          contributors: [req.user._id]
        });
        await pool.save();
      }
      if (!pool.quizzes.map(id => id.toString()).includes(review.quiz.toString())) {
        pool.quizzes.push(review.quiz);
        await pool.save();
      }
      review.status = 'approved';
    } else if (action === 'reject') {
      review.status = 'rejected';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
    review.note = note || review.note;
    review.resolvedBy = req.user._id;
    review.resolvedAt = new Date();
    await review.save();
    return res.json({ message: `Review ${action}ed successfully` });
  } catch (e) {
    console.error('hodResolveFlaggedReview error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// HOD: List approved questions for a given course and unit
// Returns flattened questions with uploader and timestamps
async function getApprovedQuestions(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });
    const { courseId, unitId } = req.query;

    if (!courseId || !unitId) {
      return res.status(400).json({ message: 'courseId and unitId are required' });
    }

    // Ensure course is in HOD department
    const course = await Course.findOne({ _id: courseId, department: hod.department._id })
      .select('_id title courseCode department');
    if (!course) return res.status(404).json({ message: 'Course not found in your department' });

    // Get approved reviews which represent approved questions
    const reviews = await QuestionReview.find({ status: 'approved', course: courseId, unit: unitId })
      .populate('uploader', 'name email teacherId')
      .populate('unit', 'title')
      .populate('course', 'title courseCode')
      .sort({ updatedAt: -1 });

    // Discover all quizzes linked to this unit's quiz pools
    const QuizPool = require('../models/QuizPool');
    const pools = await QuizPool.find({ course: courseId, unit: unitId, isActive: true }).select('_id quizzes');
    const poolQuizIds = pools.flatMap(p => p.quizzes || []).map(id => id.toString());

    // Load quizzes in batch to get latest question data and creators
    const quizIds = Array.from(new Set([
      ...reviews.map(r => r.quiz.toString()),
      ...poolQuizIds
    ]));
    const Quiz = require('../models/Quiz');
    const quizzes = await Quiz.find({ _id: { $in: quizIds } })
      .select('_id title questions createdAt')
      .populate('createdBy', 'name email teacherId');
    const quizMap = new Map(quizzes.map(q => [q._id.toString(), q]));

    // Build initial items from reviews
    const seen = new Set(); // key: `${quizId}:${questionId}`
    const items = reviews.map(r => {
      const quiz = quizMap.get(r.quiz.toString());
      let liveQ = null;
      if (quiz) {
        liveQ = quiz.questions.id(r.questionId);
      }
      const question = liveQ ? {
        questionText: liveQ.questionText,
        options: liveQ.options,
        correctOption: liveQ.correctOption,
        points: liveQ.points
      } : {
        // Fallback to snapshot if live not found
        questionText: r.snapshot?.questionText,
        options: r.snapshot?.options || [],
        correctOption: r.snapshot?.correctOption,
        points: r.snapshot?.points || 1
      };

      const key = `${r.quiz.toString()}:${r.questionId.toString()}`;
      seen.add(key);

      return {
        _id: r._id,
        quizId: r.quiz,
        questionId: r.questionId,
        course: r.course,
        unit: r.unit,
        uploader: r.uploader ? { _id: r.uploader._id, name: r.uploader.name, email: r.uploader.email, teacherId: r.uploader.teacherId } : (quiz?.createdBy ? { _id: quiz.createdBy._id, name: quiz.createdBy.name, email: quiz.createdBy.email, teacherId: quiz.createdBy.teacherId } : null),
        question,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    });

    // Add remaining questions from quizzes in pools (considered "approved" if present in pool)
    quizzes.forEach(qz => {
      (qz.questions || []).forEach(sub => {
        const key = `${qz._id.toString()}:${sub._id.toString()}`;
        if (seen.has(key)) return; // already included via review
        items.push({
          _id: null,
          quizId: qz._id,
          questionId: sub._id,
          course: course._id,
          unit: unitId,
          uploader: qz.createdBy ? { _id: qz.createdBy._id, name: qz.createdBy.name, email: qz.createdBy.email, teacherId: qz.createdBy.teacherId } : null,
          question: {
            questionText: sub.questionText,
            options: sub.options,
            correctOption: sub.correctOption,
            points: sub.points
          },
          createdAt: qz.createdAt,
          updatedAt: qz.createdAt
        });
      });
    });

    return res.json({ items, total: items.length });
  } catch (e) {
    console.error('getApprovedQuestions error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// HOD: Update a question text/options/correctOption/points inside a quiz
async function updateQuizQuestion(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });
    const { quizId, questionId } = req.params;
    const { questionText, options, correctOption, points } = req.body;

    const Quiz = require('../models/Quiz');
    const quiz = await Quiz.findById(quizId).populate('course', 'department');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    // Authorization: quiz.course.department must match HOD department
    const quizCourse = await Course.findById(quiz.course);
    if (!quizCourse || quizCourse.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }

    const q = quiz.questions.id(questionId);
    if (!q) return res.status(404).json({ message: 'Question not found in quiz' });

    if (typeof questionText === 'string') q.questionText = questionText;
    if (Array.isArray(options) && options.length >= 2) q.options = options;
    if (Number.isInteger(correctOption)) q.correctOption = correctOption;
    if (Number.isFinite(points)) q.points = points;

    await quiz.save();

    return res.json({ message: 'Question updated', question: {
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctOption,
      points: q.points
    }});
  } catch (e) {
    console.error('updateQuizQuestion error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// HOD: Delete a question from a quiz
async function deleteQuizQuestion(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });
    const { quizId, questionId } = req.params;
    const Quiz = require('../models/Quiz');

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const quizCourse = await Course.findById(quiz.course);
    if (!quizCourse || quizCourse.department.toString() !== hod.department._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }

    const q = quiz.questions.id(questionId);
    if (!q) return res.status(404).json({ message: 'Question not found in quiz' });

    q.remove();
    await quiz.save();

    return res.json({ message: 'Question deleted' });
  } catch (e) {
    console.error('deleteQuizQuestion error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// HOD: Create a new quiz question directly under a unit
// Body: { courseId, unitId, questionText, options: [..], correctOption, points }
async function createQuizQuestion(req, res) {
  try {
    const hod = await User.findById(req.user.id).populate('department');
    if (!hod || !hod.department) return res.status(404).json({ message: 'HOD department not found' });

    const { courseId, unitId, questionText, options, correctOption, points } = req.body;
    if (!courseId || !unitId || !questionText || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'courseId, unitId, questionText and at least 2 options are required' });
    }

    // Validate course belongs to HOD department
    const course = await Course.findOne({ _id: courseId, department: hod.department._id });
    if (!course) return res.status(404).json({ message: 'Course not found in your department' });

    const Unit = require('../models/Unit');
    const Quiz = require('../models/Quiz');
    const QuizPool = require('../models/QuizPool');

    const unit = await Unit.findOne({ _id: unitId, course: courseId });
    if (!unit) return res.status(404).json({ message: 'Unit not found for this course' });

    // Find a quiz for this unit created for pool aggregation or create one
    let quiz = await Quiz.findOne({ course: courseId, unit: unitId, createdBy: req.user._id });
    if (!quiz) {
      quiz = new Quiz({
        title: `${unit.title} — HOD Questions`,
        description: `Questions curated by HOD for ${unit.title}`,
        course: courseId,
        unit: unitId,
        questions: [],
        createdBy: req.user._id
      });
    }

    quiz.questions.push({
      questionText,
      options,
      correctOption: Number.isInteger(correctOption) ? correctOption : 0,
      points: Number.isFinite(points) ? points : 1
    });
    await quiz.save();

    // Ensure Unit.quizzes references this quiz
    if (!unit.quizzes?.some(qid => qid.toString() === quiz._id.toString())) {
      unit.quizzes = unit.quizzes || [];
      unit.quizzes.push(quiz._id);
      await unit.save();
    }

    // Ensure a quiz pool exists for this unit and includes this quiz
    let pool = await QuizPool.findOne({ course: courseId, unit: unitId, isActive: true });
    if (!pool) {
      pool = new QuizPool({
        title: `${unit.title} Quiz Pool`,
        description: `Pool for ${unit.title}`,
        course: courseId,
        unit: unitId,
        questionsPerAttempt: 10,
        timeLimit: 30,
        passingScore: 70,
        unlockNextVideo: true,
        createdBy: req.user._id,
        contributors: [req.user._id],
        quizzes: []
      });
    }
    if (!pool.quizzes.some(qid => qid.toString() === quiz._id.toString())) {
      pool.quizzes.push(quiz._id);
      await pool.save();
    }

    return res.status(201).json({
      message: 'Question created successfully',
      quizId: quiz._id,
      question: quiz.questions[quiz.questions.length - 1]
    });
  } catch (e) {
    console.error('createQuizQuestion error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}



