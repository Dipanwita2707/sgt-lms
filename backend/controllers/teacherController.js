const User = require('../models/User');
const Course = require('../models/Course');
const Video = require('../models/Video');
const Unit = require('../models/Unit');
const Section = require('../models/Section');
const mongoose = require('mongoose');

// Get all courses assigned to the teacher
exports.getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.user._id;
    console.log('🔍 Getting courses for teacher:', teacherId);

    // Get teacher's course assignments using the new SectionCourseTeacher model
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const teacherAssignments = await SectionCourseTeacher.find({ 
      teacher: teacherId,
      isActive: true 
    })
      .populate({
        path: 'course',
        select: 'courseCode name title description department school coordinators',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'school', select: 'name code' },
          { path: 'coordinators', select: 'name email teacherId' }
        ]
      })
      .populate('section', 'name code students')
      .populate('assignedBy', 'name email');
      
    console.log(`📚 Found ${teacherAssignments.length} course assignments for teacher`);
    
    if (teacherAssignments.length === 0) {
      console.log('⚠️ Teacher has no course assignments');
      return res.json([]);
    }
    
    // Extract unique courses and calculate statistics
    const coursesMap = new Map();
    let totalStudents = 0;
    
    for (const assignment of teacherAssignments) {
      if (assignment.course && assignment.section) {
        const courseId = assignment.course._id.toString();
        const sectionId = assignment.section._id.toString();
        
        // Count students in this section
        const User = require('../models/User');
        const sectionStudents = await User.countDocuments({
          role: 'student',
          assignedSections: assignment.section._id
        });
        
        if (!coursesMap.has(courseId)) {
          coursesMap.set(courseId, {
            _id: assignment.course._id,
            courseCode: assignment.course.courseCode,
            name: assignment.course.name,
            title: assignment.course.title || assignment.course.name,
            description: assignment.course.description,
            department: assignment.course.department,
            school: assignment.course.school,
            coordinators: assignment.course.coordinators || [],
            studentsCount: 0,
            sectionsCount: 0,
            sections: [],
            assignments: []
          });
        }
        
        const courseData = coursesMap.get(courseId);
        courseData.studentsCount += sectionStudents;
        
        // Add section info if not already added
        if (!courseData.sections.find(s => s._id.toString() === sectionId)) {
          courseData.sectionsCount += 1;
          courseData.sections.push({
            _id: assignment.section._id,
            name: assignment.section.name,
            code: assignment.section.code,
            studentsCount: sectionStudents
          });
        }
        
        // Add assignment info
        courseData.assignments.push({
          _id: assignment._id,
          section: assignment.section,
          assignedAt: assignment.assignedAt,
          assignedBy: assignment.assignedBy
        });
        
        totalStudents += sectionStudents;
      }
    }
    
    const courses = Array.from(coursesMap.values());
    
    console.log(`✅ Returning ${courses.length} unique courses for teacher`);
    console.log(`📊 Total students across all courses: ${totalStudents}`);
    
    res.json(courses);
    
  } catch (error) {
    console.error('❌ Error getting teacher courses:', error);
    res.status(500).json({ 
      message: 'Failed to get teacher courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get teacher profile with additional information

// Get teacher profile with complete information
exports.getTeacherProfile = async (req, res) => {
  try {
    console.log('Getting profile for teacher:', req.user._id);
    
    // Get teacher with department and school information
    const teacher = await User.findById(req.user._id)
      .populate({
        path: 'department',
        populate: [
          { path: 'hod', select: 'name email uid teacherId' },
          { path: 'school', populate: { path: 'dean', select: 'name email uid' } }
        ]
      })
      .select('name email uid teacherId canAnnounce department createdAt');
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get teacher's sections using the new SectionCourseTeacher model
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const teacherAssignments = await SectionCourseTeacher.find({ 
      teacher: req.user._id,
      isActive: true 
    })
    .populate({
      path: 'section',
      select: 'name department students courses'
    })
    .populate('course', 'title courseCode description');

    console.log(`📚 Found ${teacherAssignments.length} course assignments for profile`);

    // Group assignments by section to get unique sections
    const sectionsMap = new Map();
    const allCourses = new Set();
    
    for (const assignment of teacherAssignments) {
      if (assignment.section && assignment.course) {
        const sectionId = assignment.section._id.toString();
        allCourses.add(assignment.course._id.toString());
        
        if (!sectionsMap.has(sectionId)) {
          // Get section details with safe population
          let sectionData;
          try {
            sectionData = await Section.findById(assignment.section._id)
              .populate('department', 'name')
              .populate('students', 'name email regNo')
              .populate('courses', 'title courseCode description');
          } catch (populateError) {
            console.log(`⚠️ Error populating section ${assignment.section.name}:`, populateError.message);
            sectionData = assignment.section;
          }
          
          sectionsMap.set(sectionId, {
            _id: assignment.section._id,
            name: assignment.section.name,
            department: sectionData?.department || null,
            students: sectionData?.students || [],
            allCourses: sectionData?.courses || [],
            teacherCourses: []
          });
        }
        
        // Add this course to the teacher's courses in this section
        sectionsMap.get(sectionId).teacherCourses.push(assignment.course);
      }
    }
    
    const sections = Array.from(sectionsMap.values());
    console.log(`✅ Processed ${sections.length} unique sections for teacher profile`);

    // Get courses where this teacher is a coordinator (CC) - for display only, not statistics
    const coordinatedCoursesRaw = await Course.find({ coordinators: req.user._id })
      .select('title courseCode description department school')
      .populate('department', 'name code')
      .populate('school', 'name code')
      .lean();

    // Calculate statistics from new SectionCourseTeacher assignments
    const totalSections = sections.length;
    const totalStudents = sections.reduce((total, section) => total + (section.students?.length || 0), 0);
    const totalCourses = allCourses.size;

    // Format profile data
    const profileData = {
      personalInfo: {
        name: teacher.name,
        email: teacher.email,
        uid: teacher.uid,
        teacherId: teacher.teacherId, // Legacy field - DEPRECATED
        canAnnounce: true, // Enable announcements for all teachers
        joinDate: teacher.createdAt
      },
      department: {
        name: teacher.department?.name || 'Not Assigned',
        _id: teacher.department?._id || null
      },
      hod: teacher.department?.hod ? {
        name: teacher.department.hod.name,
        email: teacher.department.hod.email,
        uid: teacher.department.hod.uid,
        teacherId: teacher.department.hod.teacherId // Legacy field - DEPRECATED
      } : null,
      dean: teacher.department?.school?.dean ? {
        name: teacher.department.school.dean.name,
        email: teacher.department.school.dean.email,
        uid: teacher.department.school.dean.uid
      } : null,
      school: {
        name: teacher.department?.school?.name || 'Not Assigned',
        _id: teacher.department?.school?._id || null
      },
      assignedSections: sections.map(section => ({
        _id: section._id,
        name: section.name,
        department: section.department?.name || 'Unknown',
        studentCount: section.students?.length || 0,
        courseCount: section.teacherCourses?.length || 0,
        courses: section.teacherCourses?.map(course => ({
          _id: course._id,
          title: course.title,
          courseCode: course.courseCode
        })) || []
      })),
      // CC courses shown for display/information only - not affecting statistics
      coordinatedCourses: coordinatedCoursesRaw.map(course => ({
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode,
        description: course.description,
        department: course.department,
        school: course.school
      })),
      statistics: {
        totalSections: totalSections,
        totalStudents: totalStudents,
        totalCourses: totalCourses,
        directStudents: totalStudents, // All students are direct (no CC student counting)
        coordinatedStudents: 0, // Always 0 - CC role doesn't add to statistics
        coordinatedCoursesCount: coordinatedCoursesRaw.length // For display only
      }
    };
    
    console.log(`Profile stats for ${teacher.name}:`, {
      sections: totalSections,
      students: totalStudents,
      courses: totalCourses.size,
      ccCourses: coordinatedCoursesRaw.length
    });
    
    res.json(profileData);
  } catch (err) {
    console.error('Error getting teacher profile:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get teacher sections with course and student information
exports.getTeacherSections = async (req, res) => {
  try {
    console.log('Getting sections for teacher:', req.user._id);
    
    // Get teacher's section assignments using new SectionCourseTeacher model
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const assignments = await SectionCourseTeacher.find({ 
      teacher: req.user._id, 
      isActive: true 
    })
    .populate({
      path: 'section',
      populate: [
        { path: 'students', select: 'name email regNo' },
        { path: 'department', select: 'name' }
      ]
    })
    .populate('course', 'title courseCode description');

    console.log('Found assignments:', assignments.length);
    
    // Group assignments by section to avoid duplicates
    const sectionMap = new Map();
    
    assignments.forEach(assignment => {
      if (!assignment.section) return;
      
      const sectionId = assignment.section._id.toString();
      
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, {
          _id: assignment.section._id,
          name: assignment.section.name,
          department: assignment.section.department?.name || 'Unknown',
          studentCount: assignment.section.students?.length || 0,
          students: assignment.section.students?.map(student => ({
            _id: student._id,
            name: student.name,
            email: student.email,
            regNo: student.regNo
          })) || [],
          courses: []
        });
      }
      
      // Add course to this section if it's not already there
      if (assignment.course) {
        const section = sectionMap.get(sectionId);
        const courseExists = section.courses.some(c => c._id.toString() === assignment.course._id.toString());
        
        if (!courseExists) {
          section.courses.push({
            _id: assignment.course._id,
            title: assignment.course.title,
            courseCode: assignment.course.courseCode,
            description: assignment.course.description
          });
        }
      }
    });
    
    // Convert map to array and sort by section name
    const formattedSections = Array.from(sectionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('Formatted sections:', formattedSections.length);
    console.log('Section details:', formattedSections.map(s => ({ name: s.name, courses: s.courses.length, students: s.studentCount })));
    
    res.json(formattedSections);
  } catch (err) {
    console.error('Error getting teacher sections:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get details of a specific course
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log(`[getCourseDetails] Starting - courseId: ${courseId}, teacher: ${req.user._id}`);
    
    // Validate courseId
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      console.log('[getCourseDetails] Invalid course ID');
      return res.status(400).json({ message: 'Invalid course ID' });
    }

    // For admin users, just find the course without teacher restriction
    if (req.user.role === 'admin') {
      console.log('[getCourseDetails] Admin user detected');
      const course = await Course.findById(courseId)
        .populate('students')
        .populate('videos')
        .select('-__v');
      
      if (!course) {
        console.log('[getCourseDetails] Course not found for admin');
        return res.status(404).json({ message: 'Course not found' });
      }
      
      console.log('[getCourseDetails] Returning course for admin');
      return res.json(course);
    }
    
    console.log('[getCourseDetails] Teacher user - checking course assignments and coordination');
    
    // Use new SectionCourseTeacher model to find teacher's assignments for this course
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const assignments = await SectionCourseTeacher.find({ 
      teacher: req.user._id, 
      course: courseId,
      isActive: true 
    }).populate('section', '_id name');
    
    // Also check if teacher is a coordinator for this course
    const isCoordinator = await Course.exists({ _id: courseId, coordinators: req.user._id });
    
    console.log(`[getCourseDetails] Found ${assignments.length} course assignments for teacher, isCoordinator: ${isCoordinator}`);
    
    if (assignments.length === 0 && !isCoordinator) {
      console.log('[getCourseDetails] No course assignments found for teacher and not a coordinator');
      return res.status(404).json({ message: 'Course not found or not authorized' });
    }
    
    console.log('[getCourseDetails] Getting course details');
    // Get the course details
    const course = await Course.findById(courseId)
      .populate('videos')
      .select('-__v');
    
    if (!course) {
      console.log('[getCourseDetails] Course not found in database');
      return res.status(404).json({ message: 'Course not found' });
    }
    
    console.log(`[getCourseDetails] Course found: ${course.title}`);
    
    // Get students from sections where this teacher teaches this course OR all sections if coordinator
    const studentsInSections = [];
    let sectionsToProcess = [];
    
    if (isCoordinator) {
      // If teacher is coordinator, get all sections that contain this course
      sectionsToProcess = await Section.find({ courses: courseId });
      console.log(`[getCourseDetails] Teacher is coordinator, processing ${sectionsToProcess.length} total sections`);
    } else {
      // Get sections from teacher's assignments
      sectionsToProcess = assignments.map(assignment => assignment.section).filter(Boolean);
      console.log(`[getCourseDetails] Processing ${sectionsToProcess.length} assigned sections`);
    }
    
    for (const section of sectionsToProcess) {
      console.log(`[getCourseDetails] Processing section: ${section._id || section.id}`);
      const sectionWithStudents = await Section.findById(section._id || section.id)
        .populate('students', 'name email regNo');
      if (sectionWithStudents && sectionWithStudents.students) {
        console.log(`[getCourseDetails] Found ${sectionWithStudents.students.length} students in section ${sectionWithStudents.name}`);
        studentsInSections.push(...sectionWithStudents.students);
      }
    }
    
    // Remove duplicates
    const uniqueStudents = studentsInSections.filter((student, index, self) => 
      index === self.findIndex(s => s._id.toString() === student._id.toString())
    );
    
    console.log(`[getCourseDetails] Total unique students: ${uniqueStudents.length}`);
    
    // Add students to course object for compatibility
    const courseWithStudents = {
      ...course.toObject(),
      students: uniqueStudents,
      sections: sectionsToProcess
    };
    
    console.log('[getCourseDetails] Returning course with students');
    res.json(courseWithStudents);
  } catch (err) {
    console.error('[getCourseDetails] Error getting course details:', err);
    console.error('[getCourseDetails] Stack trace:', err.stack);
    res.status(500).json({ message: 'Error fetching course details', error: err.message });
  }
};;

// Get students enrolled in a specific course
exports.getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // For admin users, get all students in sections that have this course
    if (req.user.role === 'admin') {
      const sections = await Section.find({ courses: courseId })
        .populate('students', 'name email regNo')
        .populate('school', 'name code')
        .populate('department', 'name code');
      
      // Extract unique students from all sections
      const studentsMap = new Map();
      sections.forEach(section => {
        section.students?.forEach(student => {
          if (student && student._id) {
            studentsMap.set(student._id.toString(), {
              ...student.toObject(),
              section: {
                _id: section._id,
                name: section.name,
                school: section.school,
                department: section.department
              }
            });
          }
        });
      });
      
      return res.json(Array.from(studentsMap.values()));
    }
    
    // For teachers, use new SectionCourseTeacher model to find assignments
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const assignments = await SectionCourseTeacher.find({ 
      teacher: req.user._id, 
      course: courseId,
      isActive: true 
    }).populate('section', '_id name school department');
    
    // Also check if teacher is a coordinator for this course
    const isCoordinator = await Course.exists({ _id: courseId, coordinators: req.user._id });
    
    let sectionsToQuery = [];
    
    if (isCoordinator) {
      // If teacher is a coordinator, get all sections for this course
      sectionsToQuery = await Section.find({ courses: courseId })
        .populate('students', 'name email regNo')
        .populate('school', 'name code')
        .populate('department', 'name code');
    } else if (assignments.length > 0) {
      // Get sections from teacher's assignments and populate students
      const sectionIds = assignments.map(assignment => assignment.section._id);
      sectionsToQuery = await Section.find({ _id: { $in: sectionIds } })
        .populate('students', 'name email regNo')
        .populate('school', 'name code')
        .populate('department', 'name code');
    }
    
    if (!sectionsToQuery || sectionsToQuery.length === 0) {
      console.log(`No sections found for teacher ${req.user._id} and course ${courseId}`);
      return res.json([]); // Return empty array instead of 403 error
    }
    
    // Extract unique students from teacher's sections or all sections if coordinator
    const studentsMap = new Map();
    sectionsToQuery.forEach(section => {
      section.students?.forEach(student => {
        if (student && student._id) {
          studentsMap.set(student._id.toString(), {
            ...student.toObject(),
            section: {
              _id: section._id,
              name: section.name,
              school: section.school,
              department: section.department
            }
          });
        }
      });
    });
    
    console.log(`Found ${studentsMap.size} students for course ${courseId} and teacher ${req.user._id}`);
    res.json(Array.from(studentsMap.values()));
  } catch (err) {
    console.error('Error getting course students:', err);
    res.status(500).json({ message: 'Error fetching students' });
  }
};

// Get videos for a specific course
exports.getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // For admin users, skip teacher verification
    if (req.user.role === 'admin') {
      // Find all videos for this course
      const videos = await Video.find({ course: courseId })
        .select('title description videoUrl duration teacher');
      
      return res.json(videos);
    }
    
    // For teachers, verify they are assigned to a section that contains this course OR are a coordinator
    const teacherHasCourse = await Section.exists({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: courseId });
    const isCoordinator = await Course.exists({ _id: courseId, coordinators: req.user._id });
    
    if (!teacherHasCourse && !isCoordinator) {
      return res.status(403).json({ message: 'Not authorized to access this course' });
    }
    
    // Find all videos for this course
    const videos = await Video.find({ course: courseId })
      .select('title description videoUrl duration teacher');
    
    res.json(videos);
  } catch (err) {
    console.error('Error getting course videos:', err);
    res.status(500).json({ message: 'Error fetching videos' });
  }
};

// Upload a video for a course
exports.uploadCourseVideo = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, unitId } = req.body;
    
    // Verify teacher is assigned to a section that contains this course OR is a coordinator
    const teacherHasCourse = await Section.exists({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: courseId });
    const isCoordinator = await Course.exists({ _id: courseId, coordinators: req.user._id });
    
    if (!teacherHasCourse && !isCoordinator) {
      return res.status(403).json({ message: 'Not authorized to upload to this course' });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }
    
    // Check if units exist for this course
    const unitCount = await Unit.countDocuments({ course: courseId });
    
    if (unitCount > 0 && (!unitId || !mongoose.Types.ObjectId.isValid(unitId))) {
      return res.status(400).json({ message: 'Unit selection is required for this course' });
    }
    
    // Get duration from frontend if provided, otherwise default to 0
    const duration = req.body.duration ? parseInt(req.body.duration, 10) : 0;
    
    // Create video entry in database
    const video = new Video({
      title,
      description,
      course: courseId,
      teacher: req.user._id,
      videoUrl: `/uploads/${req.file.filename}`,
      duration: duration
    });
    
    // If unitId is provided, associate the video with that unit
    if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
      // Check if the unit exists and belongs to this course
      const unit = await Unit.findOne({ _id: unitId, course: courseId });
      if (unit) {
        video.unit = unitId;
        // Add video to unit
        unit.videos.push(video._id);
        await unit.save();
      }
    }
    
    await video.save();
    
    // Add video to course
    course.videos.push(video._id);
    await course.save();
    
    res.status(201).json({ message: 'Video uploaded successfully', video });
  } catch (err) {
    console.error('Error uploading video:', err);
    res.status(500).json({ message: 'Error uploading video' });
  }
};

  // Teacher: Create announcement for specific sections (requires HOD approval)
  const Announcement = require('../models/Announcement');
  exports.createSectionAnnouncement = async (req, res) => {
    try {
      // Remove canAnnounce permission check - all teachers can create announcements
      
      const { title, message, targetSections } = req.body;
      
      if (!title || !message || !targetSections || !Array.isArray(targetSections) || targetSections.length === 0) {
        return res.status(400).json({ message: 'Title, message, and target sections are required.' });
      }
      
      // Verify teacher is assigned to all specified sections using SectionCourseTeacher model
      const SectionCourseTeacher = require('../models/SectionCourseTeacher');
      const teacherAssignments = await SectionCourseTeacher.find({ 
        teacher: req.user._id,
        section: { $in: targetSections },
        isActive: true
      }).populate('section', 'name');
      
      // Get unique sections from assignments
      const authorizedSections = [...new Set(teacherAssignments.map(assignment => assignment.section._id.toString()))];
      
      if (authorizedSections.length !== targetSections.length) {
        return res.status(403).json({ message: 'Not authorized for some of the selected sections.' });
      }
      
      // Get the teacher's department and HOD for approval
      const User = require('../models/User');
      const teacher = await User.findById(req.user._id).populate({
        path: 'department',
        select: 'name hod school',
        populate: [
          {
            path: 'hod',
            select: 'name email _id'
          },
          {
            path: 'school',
            select: 'name dean',
            populate: {
              path: 'dean',
              select: 'name email _id'
            }
          }
        ]
      });
      
      console.log('Teacher Department:', teacher.department);
      console.log('Department HOD:', teacher.department?.hod);
      console.log('School Dean:', teacher.department?.school?.dean);
      console.log('Current user ID:', req.user._id);
      
      if (!teacher.department) {
        return res.status(400).json({ message: 'Teacher is not assigned to any department.' });
      }
      
      if (!teacher.department.hod) {
        return res.status(400).json({ message: 'No HOD assigned to teacher\'s department.' });
      }
      
      // Check if the current user is the HOD of their own department
      const isUserHOD = teacher.department.hod._id.toString() === req.user._id.toString();
      
      // Check if the current user is the Dean of their school
      const isUserDean = teacher.department.school?.dean?._id.toString() === req.user._id.toString();
      
      // Auto-approve if user is either HOD or Dean
      const canAutoApprove = isUserHOD || isUserDean;
      
      const announcement = new Announcement({
        sender: req.user._id,
        role: 'teacher',
        title,
        message,
        targetAudience: {
          targetSections: targetSections,
          targetRoles: ['student']
        },
        requiresApproval: !canAutoApprove, // If user is HOD or Dean, no approval needed
        approvalStatus: canAutoApprove ? 'approved' : 'pending',
        hodReviewRequired: !canAutoApprove,
        ...(canAutoApprove && {
          approvedBy: req.user._id,
          approvedAt: new Date(),
          approvalComments: isUserHOD 
            ? 'Auto-approved (sender is HOD)' 
            : 'Auto-approved (sender is Dean)'
        })
      });
      
      await announcement.save();
      
      // Send notification to HOD for approval (only if user is not HOD or Dean)
      if (!canAutoApprove) {
        const NotificationController = require('./notificationController');
        await NotificationController.createNotification({
          type: 'announcement_approval',
          recipient: teacher.department.hod._id,
          message: `New announcement from ${req.user.name} requires your approval: "${title}"`,
          data: { 
            announcementId: announcement._id, 
            senderName: req.user.name,
            sectionsCount: targetSections.length 
          }
        });
      }
      
      res.json({ 
        message: canAutoApprove 
          ? `Announcement created and auto-approved successfully (${isUserHOD ? 'as HOD' : 'as Dean'}).`
          : 'Announcement submitted for HOD approval successfully.',
        announcementId: announcement._id,
        status: canAutoApprove ? 'approved' : 'pending_approval'
      });
    } catch (err) {
      console.error('Error creating section announcement:', err);
      res.status(500).json({ message: err.message });
    }
  };

// Get teacher announcement permission status
exports.getAnnouncementPermission = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Verify the requesting user is the same teacher or has admin privileges
    if (req.user._id.toString() !== teacherId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const teacher = await User.findById(teacherId).select('canAnnounce');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Always allow announcements for teachers
    res.json({ canAnnounce: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Request video removal
exports.requestVideoRemoval = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Find the video and verify teacher has access
    const video = await Video.findById(videoId).populate('course');
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    // Authorize by sections: teacher must teach a section that includes this course
  const teacherHasCourse = await Section.exists({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: video.course._id || video.course });
    if (!teacherHasCourse) {
      return res.status(403).json({ message: 'Not authorized to remove this video' });
    }
    
    // In a real application, this would create a removal request that an admin would approve
    // For now, we'll simulate success
    res.json({ message: 'Video removal request submitted successfully' });
  } catch (err) {
    console.error('Error requesting video removal:', err);
    res.status(500).json({ message: 'Error processing removal request' });
  }
};

// Get all video removal requests
exports.getVideoRemovalRequests = async (req, res) => {
  try {
    // This would fetch actual removal requests in a real implementation
    // For now, return an empty array
    res.json([]);
  } catch (err) {
    console.error('Error getting video removal requests:', err);
    res.status(500).json({ message: 'Error fetching removal requests' });
  }
};





// Get analytics overview
exports.getTeacherAnalyticsOverview = async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    // Get teacher's course assignments using new SectionCourseTeacher model
    const SectionCourseTeacher = require('../models/SectionCourseTeacher');
    const assignments = await SectionCourseTeacher.find({ 
      teacher: teacherId, 
      isActive: true 
    })
    .populate('section', 'students')
    .populate('course', '_id title');

    const courseIdSet = new Set();
    const studentIdSet = new Set();
    const sectionIdSet = new Set();

    assignments.forEach(assignment => {
      if (assignment.course) {
        courseIdSet.add(assignment.course._id.toString());
      }
      if (assignment.section) {
        sectionIdSet.add(assignment.section._id.toString());
        assignment.section.students?.forEach(st => st && studentIdSet.add(st._id.toString()));
      }
    });

    // Also include courses where this teacher is a coordinator (CC)
    const coordinatorCourses = await Course.find({ coordinators: teacherId }).select('_id');
    coordinatorCourses.forEach(course => {
      courseIdSet.add(course._id.toString());
    });

    // For coordinator courses, get all students from all sections of those courses
    if (coordinatorCourses.length > 0) {
      const coordinatorCourseIds = coordinatorCourses.map(c => c._id);
      console.log('Coordinator course IDs:', coordinatorCourseIds);
      
      const allSectionsForCoordinatorCourses = await Section.find({ 
        courses: { $in: coordinatorCourseIds } 
      }).populate('students', '_id');
      
      console.log('Sections found for coordinator courses:', allSectionsForCoordinatorCourses.length);
      allSectionsForCoordinatorCourses.forEach(section => {
        console.log(`Section ${section.name} has ${section.students?.length || 0} students`);
        section.students?.forEach(st => st && studentIdSet.add(st._id.toString()));
      });
    }

    const courseIds = Array.from(courseIdSet);
    const videos = await Video.find({ course: { $in: courseIds } });
    
    // Mock average watch time (would be calculated from actual data in a real implementation)
    const averageWatchTime = 25; // minutes
    
    console.log('Analytics Overview - Teacher:', teacherId);
    console.log('Total sections:', sectionIdSet.size);
    console.log('Total courses:', courseIds.length);
    console.log('Total students:', studentIdSet.size);
    console.log('Total videos:', videos.length);
    
    res.json({
      totalStudents: studentIdSet.size,
      totalCourses: courseIds.length,
      totalVideos: videos.length,
      averageWatchTime,
      courseCount: courseIds.length,
      studentCount: studentIdSet.size,
      videoCount: videos.length,
      averageWatchTime
    });
  } catch (err) {
    console.error('Error getting analytics overview:', err);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
};

// Get enrollment trends
exports.getTeacherEnrollmentTrends = async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    // Get students from teacher's sections
  const sections = await Section.find({ $or: [{ teacher: teacherId }, { teachers: teacherId }] }).populate('students', 'createdAt _id');
    const studentMap = new Map();
    sections.forEach(s => s.students?.forEach(st => st && studentMap.set(st._id.toString(), st)));
    const allStudents = Array.from(studentMap.values());
    
    // Group students by month
    const monthlyEnrollments = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize the last 6 months with zero counts
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now);
      month.setMonth(now.getMonth() - i);
      const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
      monthlyEnrollments[monthKey] = 0;
    }
    
    // Count enrollments by month
    allStudents.forEach(student => {
      if (student.createdAt) {
        const date = new Date(student.createdAt);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (monthlyEnrollments[monthKey] !== undefined) {
          monthlyEnrollments[monthKey]++;
        }
      }
    });
    
    // Extract data for chart
    const months = [];
    const enrollments = [];
    const watchTime = []; // We'll calculate this from watch history
    
    // Get last 6 months in order
    const last6Months = Object.keys(monthlyEnrollments).sort();
    
    for (const monthKey of last6Months) {
      const [year, month] = monthKey.split('-');
      months.push(monthNames[parseInt(month)]);
      enrollments.push(monthlyEnrollments[monthKey]);
      
      // Generate randomized but realistic watch time data
      // In a real app, this would be calculated from actual watch history
      const averageWatchTimePerStudent = 15; // 15 minutes per student on average
      const variability = 0.3; // +/- 30% random variation
      const randomFactor = 1 + (Math.random() * variability * 2 - variability);
      const totalStudents = monthlyEnrollments[monthKey];
      
      // Calculate watch time in hours with some randomness for realistic variation
      const calculatedWatchTime = Math.round((totalStudents * averageWatchTimePerStudent * randomFactor) / 60);
      watchTime.push(calculatedWatchTime);
    }
    
    res.json({
      months,
      enrollments,
      watchTime
    });
  } catch (err) {
    console.error('Error getting enrollment trends:', err);
    res.status(500).json({ message: 'Error fetching enrollment trends' });
  }
};

// Get analytics for a specific course (section-based)
exports.getTeacherCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify teacher is assigned to a section that contains this course
  const teacherSections = await Section.find({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: courseId });
    
    if (teacherSections.length === 0) {
      return res.status(403).json({ message: 'Not authorized to access this course' });
    }
    
    // Get the course details
    const course = await Course.findById(courseId)
      .populate('videos');
    
    if (!course) {
      return res.status(403).json({ message: 'Not authorized to access this course' });
    }
    
    // Get all students for this teacher and course via sections
    const sectionsWithStudents = await Section.find({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: courseId })
      .populate('students', '_id');
    const studentIdSet = new Set();
    sectionsWithStudents.forEach(s => s.students?.forEach(st => st && studentIdSet.add(st._id.toString())));
    const students = await User.find({ 
      _id: { $in: Array.from(studentIdSet) },
      role: 'student'
    }).select('name regNo email watchHistory');
    
    // Calculate total watch time per student for this course
    const studentAnalytics = [];
    
    // Get all video IDs for this course
    const courseVideoIds = course.videos.map(video => video._id);
    
    for (const student of students) {
      // Filter watch history for videos in this course
      const courseWatchHistory = student.watchHistory.filter(
        item => item.video && courseVideoIds.some(id => id.toString() === item.video.toString())
      );
      
      // Calculate total watch time for this course
      const totalWatchTime = courseWatchHistory.reduce(
        (total, item) => total + (item.timeSpent || 0), 0
      );
      
      // Calculate video completion metrics
      const videoCompletions = {};
      courseWatchHistory.forEach(item => {
        if (item.video) {
          videoCompletions[item.video.toString()] = item.timeSpent || 0;
        }
      });
      
      // Calculate activity metrics - days active, average session length
      const uniqueDays = new Set();
      courseWatchHistory.forEach(item => {
        if (item.lastWatched) {
          uniqueDays.add(item.lastWatched.toISOString().split('T')[0]);
        }
      });
      
      studentAnalytics.push({
        _id: student._id,
        name: student.name,
        regNo: student.regNo,
        email: student.email,
        totalWatchTime,
        totalWatchTimeFormatted: formatTime(totalWatchTime),
        videoCompletions,
        videosWatched: Object.keys(videoCompletions).length,
        uniqueDaysActive: uniqueDays.size
      });
    }
    
    // Sort students by watch time (descending)
    studentAnalytics.sort((a, b) => b.totalWatchTime - a.totalWatchTime);
    
    // Calculate video analytics
    const videoAnalytics = [];
    
    for (const video of course.videos) {
      // Count students who watched this video
      const studentsWatched = students.filter(student => 
        student.watchHistory.some(item => 
          item.video && item.video.toString() === video._id.toString() && item.timeSpent > 0
        )
      ).length;
      
      // Calculate total watch time for this video
      const totalWatchTime = students.reduce((total, student) => {
        const watchItem = student.watchHistory.find(item => 
          item.video && item.video.toString() === video._id.toString()
        );
        return total + (watchItem ? (watchItem.timeSpent || 0) : 0);
      }, 0);
      
      // Calculate average watch time
      const avgWatchTime = studentsWatched > 0 ? totalWatchTime / studentsWatched : 0;
      
      // Calculate watch percentage (what percentage of students watched this video)
      const watchPercentage = students.length > 0 ? (studentsWatched / students.length) * 100 : 0;
      
      // Calculate completion rate
      const completionRate = calculateCompletionRate(video, students);
      
      videoAnalytics.push({
        _id: video._id,
        title: video.title,
        studentsWatched,
        totalWatchTime,
        totalWatchTimeFormatted: formatTime(totalWatchTime),
        avgWatchTime,
        avgWatchTimeFormatted: formatTime(avgWatchTime),
        watchPercentage,
        completionRate
      });
    }
    
    // Sort videos by total watch time (descending)
    videoAnalytics.sort((a, b) => b.totalWatchTime - a.totalWatchTime);
    
    // Calculate summary metrics
    const totalStudents = students.length;
    const totalVideos = course.videos.length;
  // In section-based model, total teachers for this course isn't tracked here; set to 1 for this teacher's view
  const totalTeachers = 1;
    
    // Calculate average watch time across all students and videos
    const totalWatchTimeAllStudents = studentAnalytics.reduce((total, student) => total + student.totalWatchTime, 0);
    const avgWatchTime = totalStudents > 0 ? totalWatchTimeAllStudents / totalStudents : 0;
    
    // Calculate how many students were active in the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const activeStudentsCount = students.filter(student => 
      student.watchHistory.some(item => 
        item.lastWatched && item.lastWatched >= sevenDaysAgo && 
        courseVideoIds.some(id => id.toString() === (item.video ? item.video.toString() : ''))
      )
    ).length;
    
    const response = {
      course: {
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode,
        description: course.description
      },
      summary: {
        totalStudents,
        totalVideos,
        totalTeachers,
        avgWatchTime,
        avgWatchTimeFormatted: formatTime(avgWatchTime),
        activeStudents: activeStudentsCount
      },
      videoAnalytics,
      studentAnalytics
    };
    
    res.json(response);
  } catch (err) {
    console.error('Error getting course analytics:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ message: 'Error fetching course analytics' });
  }
};

// Find a student by registration number
exports.getStudentByRegNo = async (req, res) => {
  try {
    const { regNo } = req.query;
    
    if (!regNo) {
      return res.status(400).json({ message: 'Registration number is required' });
    }
    
    const student = await User.findOne({ 
      role: 'student',
      regNo
    }).select('_id name email regNo');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json(student);
  } catch (err) {
    console.error('Error finding student:', err);
    res.status(500).json({ message: 'Error searching for student' });
  }
};

// Get detailed analytics for a specific student (section-based auth)
exports.getStudentDetailedAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Find student with watch history
    const student = await User.findById(studentId)
      .populate('watchHistory.video');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Authorize: student must be in at least one section taught by this teacher
  const teacherSection = await Section.exists({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], students: studentId });
    if (!teacherSection) {
      return res.status(403).json({ message: 'Not authorized to view this student\'s analytics' });
    }
    // Collect courses taught by this teacher via sections
  const sections = await Section.find({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }] }).populate('courses', '_id title');
    const teacherCourseIds = new Set();
    sections.forEach(s => s.courses?.forEach(c => c && teacherCourseIds.add(c._id.toString())));
    
    // Group watch history by course
    const courseWatchHistory = {};
    const videoDetails = {};
    let totalWatchTime = 0;
    
    // Process each watch history item
    for (const item of student.watchHistory) {
      if (!item.video) continue;
      
      totalWatchTime += item.timeSpent || 0;
      
      // Store video details for reference
      videoDetails[item.video._id] = {
        title: item.video.title,
        courseId: item.video.course
      };
      
      // Group by course
      const courseId = item.video.course ? item.video.course.toString() : 'unknown';
      
      if (!courseWatchHistory[courseId]) {
        courseWatchHistory[courseId] = {
          totalTime: 0,
          videos: {},
          lastActivity: null
        };
      }
      
      courseWatchHistory[courseId].totalTime += item.timeSpent || 0;
      courseWatchHistory[courseId].videos[item.video._id] = {
        timeSpent: item.timeSpent || 0,
        lastWatched: item.lastWatched
      };
      
      // Update last activity
      if (item.lastWatched && (!courseWatchHistory[courseId].lastActivity || 
          item.lastWatched > courseWatchHistory[courseId].lastActivity)) {
        courseWatchHistory[courseId].lastActivity = item.lastWatched;
      }
    }
    
    // Build detailed course analytics
    const courseAnalytics = [];
    
    // Build analytics for each teacher's course (based on student's watch history)
    for (const courseIdStr of teacherCourseIds) {
      const course = await Course.findById(courseIdStr).populate('videos');
      if (!course) continue;
      
      const courseId = course._id.toString();
      const watchData = courseWatchHistory[courseId] || { totalTime: 0, videos: {}, lastActivity: null };
      
      // Calculate watch metrics for this course
      const videosWatched = Object.keys(watchData.videos).length;
      
      // Get course videos to calculate completion percentage
  const courseWithVideos = course;
      const totalVideos = courseWithVideos?.videos?.length || 0;
      
      courseAnalytics.push({
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode,
        totalWatchTime: watchData.totalTime,
        totalWatchTimeFormatted: formatTime(watchData.totalTime),
        videosWatched,
        totalVideos,
        completionPercentage: totalVideos > 0 ? (videosWatched / totalVideos) * 100 : 0,
        lastActivity: watchData.lastActivity,
        videoDetails: Object.entries(watchData.videos).map(([videoId, data]) => ({
          videoId,
          title: videoDetails[videoId]?.title || 'Unknown Video',
          timeSpent: data.timeSpent,
          timeSpentFormatted: formatTime(data.timeSpent),
          lastWatched: data.lastWatched
        }))
      });
    }
    
    // Calculate activity heatmap data
    const activityHeatmap = generateActivityHeatmap(student.watchHistory);
    
    // Return comprehensive student analytics
    res.json({
      student: {
        _id: student._id,
        name: student.name,
        regNo: student.regNo,
        email: student.email
      },
      summary: {
        totalWatchTime,
        totalWatchTimeFormatted: formatTime(totalWatchTime),
        totalCourses: courseAnalytics.length,
        totalVideosWatched: Object.keys(videoDetails).length,
        averageWatchTimePerVideo: Object.keys(videoDetails).length > 0 
          ? totalWatchTime / Object.keys(videoDetails).length 
          : 0,
        averageWatchTimeFormatted: Object.keys(videoDetails).length > 0 
          ? formatTime(totalWatchTime / Object.keys(videoDetails).length) 
          : '0s'
      },
      courseAnalytics: courseAnalytics.sort((a, b) => b.totalWatchTime - a.totalWatchTime),
      activityHeatmap
    });
  } catch (err) {
    console.error('Error getting student analytics:', err);
    res.status(500).json({ message: 'Error fetching student analytics' });
  }
};

// Helper function to format time in human-readable format
function formatTime(seconds) {
  if (seconds === undefined || seconds === null) return '0s';
  
  // Convert to number if it's a string
  const secondsNum = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  
  // Handle very small values (less than 1 second)
  if (secondsNum < 1 && secondsNum > 0) {
    // Display one decimal place for values less than 1 second
    return `${secondsNum.toFixed(1)}s`;
  }
  
  // Handle zero case
  if (secondsNum === 0) return '0s';
  
  const hours = Math.floor(secondsNum / 3600);
  const minutes = Math.floor((secondsNum % 3600) / 60);
  const remainingSeconds = Math.floor(secondsNum % 60);
  
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  if (remainingSeconds > 0 || result === '') result += `${remainingSeconds}s`;
  
  return result.trim();
}

// Helper function to calculate video completion rate
function calculateCompletionRate(video, students) {
  // If no video duration available, we can't calculate
  if (!video.duration) return 0;
  
  // Get total watch time across all students
  let watchTimeSum = 0;
  let studentsWatched = 0;
  
  students.forEach(student => {
    const watchItem = student.watchHistory.find(item => 
      item.video && item.video.toString() === video._id.toString()
    );
    
    if (watchItem && watchItem.timeSpent) {
      watchTimeSum += watchItem.timeSpent;
      studentsWatched++;
    }
  });
  
  // Calculate average watch time as percentage of video duration
  if (studentsWatched === 0) return 0;
  
  const avgWatchTime = watchTimeSum / studentsWatched;
  const completionRate = Math.min(100, (avgWatchTime / (video.duration * 60)) * 100);
  
  return Math.round(completionRate);
}

// Helper function to generate activity heatmap data
function generateActivityHeatmap(watchHistory) {
  const heatmap = {
    byDay: {},
    byHour: {},
    byDayHour: {}
  };
  
  // Initialize days
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  days.forEach(day => {
    heatmap.byDay[day] = 0;
  });
  
  // Initialize hours
  for (let i = 0; i < 24; i++) {
    heatmap.byHour[i] = 0;
  }
  
  // Initialize day-hour combinations
  days.forEach(day => {
    heatmap.byDayHour[day] = {};
    for (let i = 0; i < 24; i++) {
      heatmap.byDayHour[day][i] = 0;
    }
  });
  
  // Process watch history
  watchHistory.forEach(item => {
    if (item.lastWatched && item.timeSpent) {
      const date = new Date(item.lastWatched);
      const day = days[date.getDay()];
      const hour = date.getHours();
      
      heatmap.byDay[day] += item.timeSpent;
      heatmap.byHour[hour] += item.timeSpent;
      heatmap.byDayHour[day][hour] += item.timeSpent;
    }
  });
  
  return heatmap;
}

// Get teacher's announcement history with approval status
exports.getAnnouncementHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = { 
      sender: req.user._id,
      role: 'teacher'
    };

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.approvalStatus = status;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    // Get all announcements created by this teacher
    const announcements = await Announcement.find(filter)
      .populate('approvedBy', 'name email role')
      .populate('targetAudience.specificUsers', 'name email role regNo teacherId')
      .populate('targetAudience.targetSections', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Announcement.countDocuments(filter);

    // Format the response
    const history = announcements.map(announcement => {
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
        targetSections: announcement.targetAudience?.targetSections?.map(section => section.name) || [],
        targetRoles: announcement.targetAudience?.targetRoles || [],
        participantStats,
        participantDetails,
        approvalStatus: announcement.approvalStatus,
        requiresApproval: announcement.requiresApproval,
        submittedAt: announcement.createdAt,
        approvedBy: announcement.approvedBy ? {
          _id: announcement.approvedBy._id,
          name: announcement.approvedBy.name,
          email: announcement.approvedBy.email,
          role: announcement.approvedBy.role
        } : null,
        approvalNote: announcement.approvalNote,
        approvalComments: announcement.approvalComments,
        isVisible: announcement.approvalStatus === 'approved' && announcement.isActive
      };
    });

    res.json({
      announcements: history,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1
      },
      summary: {
        totalCount: total,
        pendingCount: await Announcement.countDocuments({ sender: req.user._id, role: 'teacher', approvalStatus: 'pending' }),
        approvedCount: await Announcement.countDocuments({ sender: req.user._id, role: 'teacher', approvalStatus: 'approved' }),
        rejectedCount: await Announcement.countDocuments({ sender: req.user._id, role: 'teacher', approvalStatus: 'rejected' })
      }
    });
  } catch (error) {
    console.error('Error fetching teacher announcement history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
