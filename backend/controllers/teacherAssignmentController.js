/**
 * Enhanced Teacher Assignment Controller
 * Handles both section-level and course-specific teacher assignments
 */

const Section = require('../models/Section');
const Course = require('../models/Course');
const User = require('../models/User');
const Department = require('../models/Department');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');
const { hasRole, hasAnyRole, createRoleQuery } = require('../utils/roleUtils');

/**
 * Get comprehensive teacher assignments for a teacher
 * Combines both legacy section assignments and new course-specific assignments
 */
exports.getTeacherAssignments = async (req, res) => {
  try {
    const { teacherId } = req.params;
    console.log(`[getTeacherAssignments] Fetching assignments for teacher: ${teacherId}`);

    // Validate teacher
    const teacher = await User.findById(teacherId);
    if (!teacher || !hasRole(teacher, 'teacher')) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found. Only users with teacher role can be accessed.' 
      });
    }

    // Check authorization
    if (!hasAnyRole(req.user, ['admin', 'hod', 'dean']) && req.user._id.toString() !== teacherId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access' 
      });
    }

    // Method 1: Get sections where teacher is directly assigned (legacy system)
    const directSections = await Section.find({ teacher: teacherId })
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('courses', 'title courseCode')
      .populate('students', 'name email regNo');

    // Method 2: Get course-specific assignments (new system)
    const courseAssignments = await SectionCourseTeacher.find({ 
      teacher: teacherId, 
      isActive: true 
    })
    .populate({
      path: 'section',
      populate: [
        { path: 'school', select: 'name code' },
        { path: 'department', select: 'name code' },
        { path: 'students', select: 'name email regNo' }
      ]
    })
    .populate('course', 'title courseCode department')
    .populate('assignedBy', 'name email');

    // Combine and deduplicate sections
    const sectionMap = new Map();
    
    // Add directly assigned sections
    directSections.forEach(section => {
      sectionMap.set(section._id.toString(), {
        ...section.toObject(),
        assignmentType: 'section_direct',
        allCourses: section.courses,
        teacherCourses: section.courses, // All courses for direct assignment
        isDirectAssignment: true
      });
    });

    // Add course-specific assignments
    courseAssignments.forEach(assignment => {
      if (!assignment.section) return;
      
      const sectionId = assignment.section._id.toString();
      
      if (sectionMap.has(sectionId)) {
        // Section already exists, add course to teacher's specific courses
        const existing = sectionMap.get(sectionId);
        if (!existing.specificCourses) {
          existing.specificCourses = [];
        }
        existing.specificCourses.push({
          ...assignment.course.toObject(),
          assignmentId: assignment._id,
          assignedBy: assignment.assignedBy,
          assignedAt: assignment.assignedAt
        });
      } else {
        // New section from course assignment
        sectionMap.set(sectionId, {
          ...assignment.section.toObject(),
          assignmentType: 'course_specific',
          teacherCourses: [{
            ...assignment.course.toObject(),
            assignmentId: assignment._id,
            assignedBy: assignment.assignedBy,
            assignedAt: assignment.assignedAt
          }],
          isDirectAssignment: false
        });
      }
    });

    // Convert to array and add computed fields
    const combinedSections = Array.from(sectionMap.values()).map(section => {
      const teacherCourseCount = section.isDirectAssignment 
        ? (section.courses?.length || 0)
        : (section.teacherCourses?.length || 0);
      
      const studentCount = section.students?.length || 0;
      
      return {
        ...section,
        teacherCourseCount,
        studentCount,
        assignmentSummary: `${teacherCourseCount} course${teacherCourseCount !== 1 ? 's' : ''}, ${studentCount} student${studentCount !== 1 ? 's' : ''}`
      };
    });

    // Sort by section name
    combinedSections.sort((a, b) => a.name.localeCompare(b.name));

    const summary = {
      totalSections: combinedSections.length,
      totalCourses: combinedSections.reduce((sum, s) => sum + s.teacherCourseCount, 0),
      totalStudents: combinedSections.reduce((sum, s) => sum + s.studentCount, 0),
      directAssignments: combinedSections.filter(s => s.isDirectAssignment).length,
      courseSpecificAssignments: combinedSections.filter(s => !s.isDirectAssignment).length
    };

    console.log(`[getTeacherAssignments] Found ${combinedSections.length} sections for teacher ${teacherId}`);
    
    res.json({
      success: true,
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department
      },
      summary,
      sections: combinedSections
    });

  } catch (error) {
    console.error('[getTeacherAssignments] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Assign teacher to specific courses in a section with department validation
 */
exports.assignTeacherToCourses = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { teacherId, courseIds } = req.body;
    const assignedBy = req.user._id;

    console.log(`[assignTeacherToCourses] Assigning teacher ${teacherId} to courses ${courseIds} in section ${sectionId}`);

    // Validate inputs
    if (!teacherId || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID and Course IDs array are required'
      });
    }

    // Validate section
    const section = await Section.findById(sectionId)
      .populate('school', 'name')
      .populate('department', 'name');
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    // Validate teacher
    const teacher = await User.findById(teacherId).populate('department', 'name');
    if (!teacher || !hasRole(teacher, 'teacher')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher selected. Only users with teacher role can be assigned.'
      });
    }

    // Validate courses and check if they belong to section
    const courses = await Course.find({ _id: { $in: courseIds } })
      .populate('department', 'name');
    
    if (courses.length !== courseIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more courses not found'
      });
    }

    // Check if all courses are assigned to the section
    const sectionCourseIds = section.courses.map(id => id.toString());
    const invalidCourses = courses.filter(course => 
      !sectionCourseIds.includes(course._id.toString())
    );

    if (invalidCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some courses are not assigned to this section',
        invalidCourses: invalidCourses.map(c => c.title)
      });
    }

    // DEPARTMENT VALIDATION
    const departmentMismatches = [];
    for (const course of courses) {
      if (teacher.department && course.department) {
        if (teacher.department._id.toString() !== course.department._id.toString()) {
          departmentMismatches.push({
            courseTitle: course.title,
            courseDepartment: course.department.name,
            teacherDepartment: teacher.department.name
          });
        }
      }
    }

    if (departmentMismatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Department mismatch detected',
        details: 'Teachers can only be assigned to courses from their own department',
        mismatches: departmentMismatches
      });
    }

    // Process assignments
    const results = [];
    const errors = [];

    for (const courseId of courseIds) {
      try {
        // Check if assignment already exists
        const existing = await SectionCourseTeacher.findOne({
          section: sectionId,
          course: courseId
        });

        if (existing) {
          if (existing.isActive && existing.teacher.toString() === teacherId) {
            results.push({
              courseId,
              status: 'already_assigned',
              message: 'Teacher already assigned to this course'
            });
            continue;
          } else if (existing.isActive) {
            // Different teacher assigned
            errors.push({
              courseId,
              message: 'Course already has a different teacher assigned'
            });
            continue;
          } else {
            // Reactivate existing assignment with new teacher
            existing.teacher = teacherId;
            existing.assignedBy = assignedBy;
            existing.isActive = true;
            existing.assignedAt = new Date();
            await existing.save();
            results.push({
              courseId,
              status: 'updated',
              assignmentId: existing._id
            });
            continue;
          }
        }

        // Create new assignment
        const assignment = new SectionCourseTeacher({
          section: sectionId,
          course: courseId,
          teacher: teacherId,
          assignedBy,
          academicYear: section.academicYear,
          semester: section.semester
        });

        await assignment.save();
        results.push({
          courseId,
          status: 'created',
          assignmentId: assignment._id
        });

      } catch (assignmentError) {
        console.error(`Error assigning course ${courseId}:`, assignmentError);
        errors.push({
          courseId,
          message: assignmentError.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'created' || r.status === 'updated').length;

    res.json({
      success: true,
      message: `Successfully processed ${successCount} course assignments`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: courseIds.length,
        successful: successCount,
        skipped: results.filter(r => r.status === 'already_assigned').length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('[assignTeacherToCourses] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign teacher to courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get available teachers for course assignment with department filtering
 */
exports.getAvailableTeachersForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { sectionId } = req.query;

    console.log(`[getAvailableTeachersForCourse] Getting teachers for course ${courseId}`);

    // Get course details
    const course = await Course.findById(courseId).populate('department', 'name');
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get teachers from the same department
    const departmentQuery = course.department 
      ? { department: course.department._id }
      : {};

    const teachers = await User.find({
      ...createRoleQuery('teacher'),
      ...departmentQuery,
      isActive: { $ne: false }
    })
    .populate('department', 'name')
    .select('name email teacherId department roles role')
    .sort({ name: 1 });

    // If sectionId provided, exclude teachers already assigned to this course in this section
    let availableTeachers = teachers;
    if (sectionId) {
      const existingAssignment = await SectionCourseTeacher.findOne({
        section: sectionId,
        course: courseId,
        isActive: true
      });

      if (existingAssignment) {
        availableTeachers = teachers.filter(t => 
          t._id.toString() !== existingAssignment.teacher.toString()
        );
      }
    }

    res.json({
      success: true,
      course: {
        _id: course._id,
        title: course.title,
        department: course.department
      },
      teachers: availableTeachers.map(teacher => ({
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        teacherId: teacher.teacherId,
        department: teacher.department,
        roles: teacher.roles || [teacher.role]
      }))
    });

  } catch (error) {
    console.error('[getAvailableTeachersForCourse] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available teachers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Validate and fix teacher assignments
 */
exports.validateTeacherAssignments = async (req, res) => {
  try {
    console.log('[validateTeacherAssignments] Starting validation...');

    const issues = [];
    const fixes = [];

    // Check for department mismatches
    const assignments = await SectionCourseTeacher.find({ isActive: true })
      .populate('teacher', 'name department')
      .populate('course', 'title department')
      .populate('section', 'name');

    for (const assignment of assignments) {
      if (!assignment.teacher || !assignment.course) continue;

      if (assignment.teacher.department && assignment.course.department) {
        if (assignment.teacher.department.toString() !== assignment.course.department.toString()) {
          issues.push({
            type: 'department_mismatch',
            assignmentId: assignment._id,
            sectionName: assignment.section?.name,
            teacherName: assignment.teacher.name,
            courseTitle: assignment.course.title,
            teacherDepartment: assignment.teacher.department,
            courseDepartment: assignment.course.department
          });
        }
      }
    }

    // Check for orphaned assignments
    const orphanedAssignments = await SectionCourseTeacher.find({
      isActive: true,
      $or: [
        { section: { $exists: false } },
        { course: { $exists: false } },
        { teacher: { $exists: false } }
      ]
    });

    orphanedAssignments.forEach(assignment => {
      issues.push({
        type: 'orphaned_assignment',
        assignmentId: assignment._id,
        issue: 'Missing section, course, or teacher reference'
      });
    });

    res.json({
      success: true,
      validation: {
        totalAssignments: assignments.length,
        issues: issues.length,
        departmentMismatches: issues.filter(i => i.type === 'department_mismatch').length,
        orphanedAssignments: issues.filter(i => i.type === 'orphaned_assignment').length
      },
      issues,
      recommendations: issues.length > 0 ? [
        'Review department assignments',
        'Remove or fix orphaned assignments',
        'Ensure teachers are assigned to courses in their department'
      ] : ['All assignments are valid']
    });

  } catch (error) {
    console.error('[validateTeacherAssignments] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get available teachers (with role and department validation)
 */
exports.getAvailableTeachers = async (req, res) => {
  try {
    const { departmentId } = req.query;
    console.log(`[getAvailableTeachers] Fetching teachers for department: ${departmentId}`);

    let query = createRoleQuery('teacher');
    query.isActive = { $ne: false };

    if (departmentId) {
      query.department = departmentId;
    }

    const teachers = await User.find(query)
      .populate('department', 'name code')
      .select('name email teacherId department roles role')
      .sort({ name: 1 });

    console.log(`[getAvailableTeachers] Found ${teachers.length} teachers`);

    res.json({
      success: true,
      teachers,
      count: teachers.length
    });
  } catch (error) {
    console.error('[getAvailableTeachers] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available teachers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get section assignments (teachers assigned to courses in a section)
 */
exports.getSectionAssignments = async (req, res) => {
  try {
    const { sectionId } = req.params;
    console.log(`[getSectionAssignments] Fetching assignments for section: ${sectionId}`);

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    // Get course-teacher assignments for this section
    const assignments = await SectionCourseTeacher.find({ 
      section: sectionId, 
      isActive: true 
    })
    .populate('course', 'title courseCode department')
    .populate('teacher', 'name email teacherId department')
    .populate('assignedBy', 'name email')
    .sort({ createdAt: -1 });

    console.log(`[getSectionAssignments] Found ${assignments.length} assignments`);

    res.json({
      success: true,
      assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('[getSectionAssignments] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch section assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Remove assignment
 */
exports.removeAssignment = async (req, res) => {
  try {
    const { teacherId, sectionId, courseId } = req.body;
    console.log(`[removeAssignment] Removing assignment: teacher=${teacherId}, section=${sectionId}, course=${courseId}`);

    if (!teacherId || !sectionId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID, Section ID, and Course ID are required'
      });
    }

    // Find and deactivate the assignment
    const assignment = await SectionCourseTeacher.findOne({
      teacher: teacherId,
      section: sectionId,
      course: courseId,
      isActive: true
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Soft delete - set isActive to false
    assignment.isActive = false;
    assignment.removedAt = new Date();
    assignment.removedBy = req.user._id;
    await assignment.save();

    console.log(`[removeAssignment] Assignment removed successfully`);

    res.json({
      success: true,
      message: 'Assignment removed successfully',
      removedAssignment: assignment
    });
  } catch (error) {
    console.error('[removeAssignment] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};