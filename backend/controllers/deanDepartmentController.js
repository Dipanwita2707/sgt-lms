const Department = require('../models/Department');
const User = require('../models/User');
const Section = require('../models/Section');
const Course = require('../models/Course');
const Unit = require('../models/Unit');
const Video = require('../models/Video');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');

/**
 * Get list of all departments for dean's school
 */
exports.getDepartments = async (req, res) => {
  try {
    const dean = await User.findById(req.user.id).populate('school');
    
    if (!dean || !dean.school) {
      return res.status(404).json({
        success: false,
        message: 'Dean school information not found'
      });
    }

    const departments = await Department.find({ school: dean.school._id })
      .select('name code')
      .sort({ name: 1 });

    res.json({
      success: true,
      departments
    });

  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching departments',
      error: error.message
    });
  }
};

/**
 * Get comprehensive analytics for a specific department
 */
exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const dean = await User.findById(req.user.id).populate('school');
    
    if (!dean || !dean.school) {
      return res.status(404).json({
        success: false,
        message: 'Dean school information not found'
      });
    }

    // Get department details
    const department = await Department.findOne({
      _id: departmentId,
      school: dean.school._id
    }).populate('school', 'name');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Get HOD
    const hod = await User.findOne({
      department: department._id,
      role: 'hod'
    }).select('name email');

    // Get all teachers in department
    const teachers = await User.find({
      department: department._id,
      role: 'teacher'
    }).select('name email');

    // Get teacher assignments with courses
    const teacherData = await Promise.all(teachers.map(async (teacher) => {
      const assignments = await SectionCourseTeacher.find({ teacher: teacher._id })
        .populate('course', 'title courseCode')
        .populate('section', 'name');
      
      // Get unique courses with both code and name
      const uniqueCourses = {};
      assignments.forEach(a => {
        if (a.course) {
          uniqueCourses[a.course._id.toString()] = {
            courseId: a.course._id,
            courseCode: a.course.courseCode,
            courseName: a.course.title
          };
        }
      });
      
      const courses = Object.values(uniqueCourses);
      
      return {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        sectionsCount: assignments.length,
        courses
      };
    }));

    // Get all sections in department
    const sections = await Section.find({ department: department._id })
      .populate('courses', 'title courseCode')
      .select('name students courses');

    const totalSections = sections.length;
    const totalStudents = sections.reduce((sum, s) => sum + (s.students?.length || 0), 0);

    // Get all courses in department
    const courses = await Course.find({ department: department._id })
      .select('title courseCode');

    // Calculate course-wise analytics
    const courseAnalytics = await Promise.all(courses.map(async (course) => {
      const courseSections = sections.filter(s => 
        s.courses.some(c => c._id.toString() === course._id.toString())
      );

      const sectionsCount = courseSections.length;
      const courseStudents = courseSections.reduce((sum, s) => sum + (s.students?.length || 0), 0);

      // Get all units and videos for this course
      const units = await Unit.find({ course: course._id });
      const videos = await Video.find({ unit: { $in: units.map(u => u._id) } });
      const quizzes = await Quiz.find({ unit: { $in: units.map(u => u._id) } });

      // Get all student IDs from sections
      const allStudentIds = [];
      courseSections.forEach(section => {
        if (section.students) {
          allStudentIds.push(...section.students);
        }
      });

      // Calculate overall progress
      let totalProgress = 0;
      let totalQuizMarks = 0;
      let studentCount = 0;

      for (const studentId of allStudentIds) {
        const student = await User.findById(studentId);
        if (!student) continue;

        studentCount++;

        // Calculate video progress
        const videoIds = videos.map(v => v._id.toString());
        const watchedVideos = student.watchHistory?.filter(wh => 
          videoIds.includes(wh.video.toString()) && wh.timeSpent > 0
        ) || [];
        
        const videoProgress = videos.length > 0 ? (watchedVideos.length / videos.length) * 100 : 0;

        // Calculate quiz marks
        const quizAttempts = await QuizAttempt.find({
          student: studentId,
          quiz: { $in: quizzes.map(q => q._id) }
        });

        const quizProgress = quizzes.length > 0 
          ? quizAttempts.reduce((sum, qa) => sum + (qa.percentage || 0), 0) / quizzes.length
          : 0;

        const overallProgress = (videoProgress + quizProgress) / 2;
        totalProgress += overallProgress;
        totalQuizMarks += quizProgress;
      }

      const avgProgress = studentCount > 0 ? totalProgress / studentCount : 0;
      const avgQuizMarks = studentCount > 0 ? totalQuizMarks / studentCount : 0;

      return {
        courseId: course._id,
        courseCode: course.courseCode,
        courseTitle: course.title,
        sectionsCount,
        totalStudents: courseStudents,
        videoCount: videos.length,
        overallProgress: avgProgress,
        overallQuizMarks: avgQuizMarks
      };
    }));

    // Get section-wise course teaching details
    const sectionCourses = await Promise.all(sections.map(async (section) => {
      const sectionCoursesData = await Promise.all(section.courses.map(async (course) => {
        const assignment = await SectionCourseTeacher.findOne({
          section: section._id,
          course: course._id
        }).populate('teacher', 'name email');

        const units = await Unit.find({ course: course._id });

        return {
          courseId: course._id,
          courseCode: course.courseCode,
          courseName: course.title,
          teacher: assignment?.teacher ? {
            name: assignment.teacher.name,
            email: assignment.teacher.email
          } : null,
          unitCount: units.length
        };
      }));

      return {
        sectionId: section._id,
        sectionName: section.name,
        studentCount: section.students?.length || 0,
        courses: sectionCoursesData
      };
    }));

    // Calculate section performance
    const sectionPerformance = [];
    
    for (const section of sections) {
      for (const course of section.courses) {
        const students = section.students || [];
        if (students.length === 0) continue;

        const units = await Unit.find({ course: course._id });
        const videos = await Video.find({ unit: { $in: units.map(u => u._id) } });
        const quizzes = await Quiz.find({ unit: { $in: units.map(u => u._id) } });

        let totalProgress = 0;
        let totalMarks = 0;

        for (const studentId of students) {
          const student = await User.findById(studentId);
          if (!student) continue;

          // Video progress
          const videoIds = videos.map(v => v._id.toString());
          const watchedVideos = student.watchHistory?.filter(wh => 
            videoIds.includes(wh.video.toString()) && wh.timeSpent > 0
          ) || [];
          const videoProgress = videos.length > 0 ? (watchedVideos.length / videos.length) * 100 : 0;

          // Quiz marks
          const quizAttempts = await QuizAttempt.find({
            student: studentId,
            quiz: { $in: quizzes.map(q => q._id) }
          });
          const quizMarks = quizzes.length > 0
            ? quizAttempts.reduce((sum, qa) => sum + (qa.percentage || 0), 0) / quizzes.length
            : 0;

          totalProgress += (videoProgress + quizMarks) / 2;
          totalMarks += quizMarks;
        }

        const avgProgress = students.length > 0 ? totalProgress / students.length : 0;
        const avgMarks = students.length > 0 ? totalMarks / students.length : 0;

        let performance = 'Poor';
        if (avgProgress >= 75 && avgMarks >= 75) performance = 'Excellent';
        else if (avgProgress >= 60 && avgMarks >= 60) performance = 'Good';
        else if (avgProgress >= 40 && avgMarks >= 40) performance = 'Average';

        sectionPerformance.push({
          sectionId: section._id,
          sectionName: section.name,
          courseId: course._id,
          courseName: course.title,
          studentCount: students.length,
          avgProgress,
          avgMarks,
          performance
        });
      }
    }

    // Sort to get best and worst performing sections
    const sortedPerformance = [...sectionPerformance].sort((a, b) => 
      (b.avgProgress + b.avgMarks) - (a.avgProgress + a.avgMarks)
    );

    const bestSections = sortedPerformance.slice(0, 3);
    const worstSections = sortedPerformance.slice(-3).reverse();

    res.json({
      success: true,
      department: {
        code: department.code,
        name: department.name,
        schoolName: department.school?.name || 'N/A'
      },
      hod: hod ? {
        name: hod.name,
        email: hod.email
      } : null,
      statistics: {
        totalTeachers: teachers.length,
        totalCourses: courses.length,
        totalSections,
        totalStudents
      },
      teachers: teacherData,
      sectionCourses,
      courses: courseAnalytics,
      sectionPerformance,
      bestSections,
      worstSections
    });

  } catch (error) {
    console.error('Error fetching department analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching department analytics',
      error: error.message
    });
  }
};
