const Department = require('../models/Department');
const Course = require('../models/Course');
const Section = require('../models/Section');
const User = require('../models/User');
const Unit = require('../models/Unit');
const Video = require('../models/Video');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');
const School = require('../models/School');

// Get courses for a specific department
exports.getDepartmentCourses = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    // Verify department exists and belongs to dean's school
    const dean = await User.findById(req.user.id).populate('school');
    if (!dean || !dean.school) {
      return res.status(404).json({ message: 'School not found' });
    }

    const department = await Department.findOne({
      _id: departmentId,
      school: dean.school._id
    });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find all courses in this department
    const courses = await Course.find({ department: departmentId })
      .select('code title')
      .sort({ code: 1 });

    res.json({ courses });
  } catch (error) {
    console.error('Error fetching department courses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get comprehensive course analytics
exports.getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { section: sectionFilter } = req.query;

    // Verify course exists
    const course = await Course.findById(courseId)
      .populate('department')
      .lean();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify course belongs to dean's school
    const dean = await User.findById(req.user.id).populate('school');
    const department = await Department.findById(course.department._id);
    
    if (!department || department.school.toString() !== dean.school._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all sections teaching this course
    let sectionsQuery = Section.find({ courses: courseId });
    if (sectionFilter && sectionFilter !== 'all') {
      sectionsQuery = sectionsQuery.where('_id').equals(sectionFilter);
    }
    
    const sections = await sectionsQuery
      .populate('students', 'name email watchHistory')
      .lean();

    // Get teacher assignments for this course
    const teacherAssignments = await SectionCourseTeacher.find({
      course: courseId
    })
      .populate('teacher', 'name email')
      .populate('section', 'name')
      .lean();

    // Group teachers by unique teacher ID with all their sections
    const teacherMap = new Map();
    
    teacherAssignments.forEach(assignment => {
      const teacherId = assignment.teacher?._id.toString();
      if (teacherId) {
        if (!teacherMap.has(teacherId)) {
          teacherMap.set(teacherId, {
            _id: teacherId,
            name: assignment.teacher?.name || 'Unknown',
            email: assignment.teacher?.email || 'N/A',
            sections: []
          });
        }
        teacherMap.get(teacherId).sections.push(assignment.section?.name || 'Unknown');
      }
    });

    // Convert map to array and format sections
    const teachers = Array.from(teacherMap.values()).map(teacher => ({
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      sectionName: teacher.sections.join(', '), // Join all sections
      sectionsCount: teacher.sections.length
    }));

    // Get all units for this course
    const units = await Unit.find({ course: courseId }).lean();

    // Get all videos and quizzes
    const videos = await Video.find({ 
      unit: { $in: units.map(u => u._id) }
    }).lean();

    const quizzes = await Quiz.find({
      unit: { $in: units.map(u => u._id) }
    }).lean();

    // Collect all students from sections
    const allStudents = [];
    const studentMap = new Map();

    for (const section of sections) {
      if (section.students && section.students.length > 0) {
        for (const student of section.students) {
          if (!studentMap.has(student._id.toString())) {
            studentMap.set(student._id.toString(), {
              ...student,
              sectionName: section.name,
              sectionId: section._id
            });
            allStudents.push({
              ...student,
              sectionName: section.name,
              sectionId: section._id
            });
          }
        }
      }
    }

    // Calculate student progress
    const studentProgress = [];
    const videoIds = videos.map(v => v._id.toString());
    const quizIds = quizzes.map(q => q._id);

    for (const student of allStudents) {
      // Calculate video progress
      const watchedVideos = student.watchHistory?.filter(wh => 
        videoIds.includes(wh.video.toString()) && wh.timeSpent > 0
      ) || [];
      const videoProgress = videos.length > 0 
        ? (watchedVideos.length / videos.length) * 100 
        : 0;

      // Calculate total watched hours (timeSpent is in seconds)
      const totalWatchedSeconds = watchedVideos.reduce((sum, wh) => sum + (wh.timeSpent || 0), 0);
      const watchedHours = (totalWatchedSeconds / 3600).toFixed(2); // Convert to hours

      // Calculate quiz marks
      const quizAttempts = await QuizAttempt.find({
        student: student._id,
        quiz: { $in: quizIds }
      }).lean();

      const quizMarks = quizAttempts.length > 0
        ? quizAttempts.reduce((sum, qa) => sum + (qa.percentage || 0), 0) / quizAttempts.length
        : 0;

      const overallProgress = (videoProgress + quizMarks) / 2;

      // Determine performance rating
      let performance = 'Poor';
      if (overallProgress >= 75 && quizMarks >= 75) performance = 'Excellent';
      else if (overallProgress >= 60 && quizMarks >= 60) performance = 'Good';
      else if (overallProgress >= 40 && quizMarks >= 40) performance = 'Average';

      studentProgress.push({
        _id: student._id,
        name: student.name,
        email: student.email,
        section: student.sectionName,
        sectionId: student.sectionId,
        videoProgress,
        quizMarks,
        overallProgress,
        watchedHours: parseFloat(watchedHours),
        performance
      });
    }

    // Calculate unit-wise performance
    const unitPerformance = [];
    
    for (const unit of units) {
      const unitVideos = videos.filter(v => v.unit.toString() === unit._id.toString());
      const unitQuizzes = quizzes.filter(q => q.unit.toString() === unit._id.toString());
      const unitVideoIds = unitVideos.map(v => v._id.toString());
      const unitQuizIds = unitQuizzes.map(q => q._id);

      // Calculate average progress for this unit
      let totalVideoProgress = 0;
      let totalQuizMarks = 0;
      const studentUnitProgress = [];

      for (const student of allStudents) {
        const watchedVideos = student.watchHistory?.filter(wh =>
          unitVideoIds.includes(wh.video.toString()) && wh.timeSpent > 0
        ) || [];
        
        const videoProgress = unitVideos.length > 0
          ? (watchedVideos.length / unitVideos.length) * 100
          : 0;

        const quizAttempts = await QuizAttempt.find({
          student: student._id,
          quiz: { $in: unitQuizIds }
        }).lean();

        const quizScore = quizAttempts.length > 0
          ? quizAttempts.reduce((sum, qa) => sum + (qa.percentage || 0), 0) / quizAttempts.length
          : 0;

        totalVideoProgress += videoProgress;
        totalQuizMarks += quizScore;

        studentUnitProgress.push({
          name: student.name,
          section: student.sectionName,
          videosWatched: watchedVideos.length,
          totalVideos: unitVideos.length,
          quizScore,
          progress: (videoProgress + quizScore) / 2
        });
      }

      const avgVideoProgress = allStudents.length > 0 
        ? totalVideoProgress / allStudents.length 
        : 0;
      const avgQuizMarks = allStudents.length > 0 
        ? totalQuizMarks / allStudents.length 
        : 0;

      unitPerformance.push({
        _id: unit._id,
        name: unit.name,
        videoCount: unitVideos.length,
        quizCount: unitQuizzes.length,
        videoProgress: avgVideoProgress,
        quizMarks: avgQuizMarks,
        avgProgress: (avgVideoProgress + avgQuizMarks) / 2,
        studentProgress: studentUnitProgress
      });
    }

    // Calculate section-wise performance
    const sectionPerformance = [];
    
    for (const section of sections) {
      const sectionStudents = studentProgress.filter(
        s => s.sectionId.toString() === section._id.toString()
      );

      if (sectionStudents.length > 0) {
        const avgProgress = sectionStudents.reduce((sum, s) => sum + s.videoProgress, 0) / sectionStudents.length;
        const avgMarks = sectionStudents.reduce((sum, s) => sum + s.quizMarks, 0) / sectionStudents.length;

        sectionPerformance.push({
          sectionName: section.name,
          studentCount: sectionStudents.length,
          avgProgress,
          avgMarks
        });
      }
    }

    // Calculate overall average
    const averageProgress = studentProgress.length > 0
      ? studentProgress.reduce((sum, s) => sum + s.overallProgress, 0) / studentProgress.length
      : 0;

    // Calculate performance ratings
    const studentsWithPerformance = studentProgress.map(student => {
      let performance = 'Poor';
      if (student.overallProgress >= 75 && student.quizMarks >= 75) {
        performance = 'Excellent';
      } else if (student.overallProgress >= 60 && student.quizMarks >= 60) {
        performance = 'Good';
      } else if (student.overallProgress >= 40 && student.quizMarks >= 40) {
        performance = 'Average';
      }

      return {
        studentId: student._id || student.email,
        name: student.name,
        email: student.email,
        sectionName: student.section,
        videoProgress: student.videoProgress,
        quizProgress: student.quizMarks,
        overallProgress: student.overallProgress,
        performance
      };
    });

    res.json({
      course: {
        courseCode: course.code,
        title: course.title,
        departmentName: course.department.name
      },
      statistics: {
        totalStudents: allStudents.length,
        totalSections: sections.length,
        totalTeachers: teachers.length,
        avgProgress: averageProgress,
        totalUnits: units.length,
        totalVideos: videos.length,
        totalQuizzes: quizzes.length
      },
      teachers: teachers.map(t => ({
        name: t.name,
        email: t.email,
        sectionName: t.section
      })),
      sections: sections.map(s => s.name),
      students: studentsWithPerformance.sort((a, b) => b.overallProgress - a.overallProgress),
      units: unitPerformance,
      sectionPerformance
    });

  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
