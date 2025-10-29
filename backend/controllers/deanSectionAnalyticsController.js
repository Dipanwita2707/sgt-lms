const Section = require('../models/Section');
const User = require('../models/User');
const Course = require('../models/Course');
const Unit = require('../models/Unit');
const Video = require('../models/Video');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');

/**
 * Get all sections for dean's school
 */
exports.getSections = async (req, res) => {
  try {
    const dean = await User.findById(req.user.id).populate('school');
    
    if (!dean || !dean.school) {
      return res.status(404).json({
        success: false,
        message: 'Dean school information not found'
      });
    }

    console.log('[Section Analytics] Fetching sections for school:', dean.school.name);

    // Get all sections in dean's school
    const sections = await Section.find({ school: dean.school._id })
      .populate('department')
      .populate('teacher', 'name email')
      .populate('teachers', 'name email')
      .populate('courses', 'courseCode title')
      .sort({ name: 1 });

    console.log('[Section Analytics] Found', sections.length, 'sections');

    res.json({
      success: true,
      sections: sections.map(section => ({
        sectionId: section._id,
        sectionName: section.name,
        department: section.department ? section.department.name : 'N/A',
        teacherCount: section.teachers ? section.teachers.length : (section.teacher ? 1 : 0),
        studentCount: section.students ? section.students.length : 0,
        courseCount: section.courses ? section.courses.length : 0,
        courses: section.courses ? section.courses.map(course => ({
          courseId: course._id,
          courseCode: course.courseCode,
          courseTitle: course.title
        })) : []
      }))
    });

  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sections',
      error: error.message
    });
  }
};

/**
 * Get detailed analytics for a specific section
 */
exports.getSectionAnalytics = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const dean = await User.findById(req.user.id).populate('school');

    if (!dean || !dean.school) {
      return res.status(404).json({
        success: false,
        message: 'Dean school information not found'
      });
    }

    console.log('[Section Analytics] Fetching analytics for section:', sectionId);

    // Get section with all related data
    const section = await Section.findById(sectionId)
      .populate('department')
      .populate('school')
      .populate('teacher', 'name email')
      .populate('teachers', 'name email')
      .populate({
        path: 'courses',
        populate: {
          path: 'department'
        }
      })
      .populate('students', 'name email regNo uid');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    // Verify section belongs to dean's school
    if (section.school._id.toString() !== dean.school._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this section'
      });
    }

    // Get course-teacher mapping using SectionCourseTeacher model
    const courseTeacherAssignments = await SectionCourseTeacher.find({
      section: sectionId,
      isActive: true
    }).populate('teacher', 'name email teacherId');
    
    console.log('[Section Analytics] Found', courseTeacherAssignments.length, 'course-teacher assignments');
    
    // Create a map of courseId -> teacher
    const courseTeachers = {};
    for (const assignment of courseTeacherAssignments) {
      courseTeachers[assignment.course.toString()] = assignment.teacher;
      console.log(`[Section Analytics] Course ${assignment.course} -> Teacher ${assignment.teacher?.name}`);
    }

    // Calculate analytics for each student
    const studentAnalytics = await Promise.all(
      section.students.map(async (student) => {
        // Fetch full student data with watch history
        const fullStudent = await User.findById(student._id).select('+watchHistory');
        
        const coursePerformance = await Promise.all(
          section.courses.map(async (course) => {
            // Get all units for this course
            const units = await Unit.find({ course: course._id }).sort({ order: 1 });
            const videos = await Video.find({ 
              unit: { $in: units.map(u => u._id) } 
            });
            const quizzes = await Quiz.find({ 
              unit: { $in: units.map(u => u._id) } 
            });

            // Calculate watch time
            let totalWatchTime = 0;
            let videosWatched = 0;
            const totalVideos = videos.length;

            if (fullStudent.watchHistory && fullStudent.watchHistory.length > 0) {
              videos.forEach(video => {
                const watchEntry = fullStudent.watchHistory.find(
                  entry => entry.video && entry.video.toString() === video._id.toString()
                );
                if (watchEntry) {
                  totalWatchTime += watchEntry.timeSpent || 0;
                  if (watchEntry.timeSpent >= video.duration * 0.8) {
                    videosWatched++;
                  }
                }
              });
            }

            // Calculate unit-wise marks
            const unitMarks = await Promise.all(
              units.map(async (unit) => {
                const unitQuizzes = await Quiz.find({ unit: unit._id });
                
                if (unitQuizzes.length === 0) {
                  return {
                    unitId: unit._id,
                    unitTitle: unit.title,
                    percentage: 0,
                    attempted: false,
                    quizzesTaken: 0,
                    totalQuizzes: 0
                  };
                }

                const attempts = await QuizAttempt.find({
                  student: student._id,
                  quiz: { $in: unitQuizzes.map(q => q._id) }
                }).sort({ createdAt: -1 });

                const quizScores = new Map();
                attempts.forEach(attempt => {
                  const quizId = attempt.quiz.toString();
                  if (!quizScores.has(quizId) || attempt.percentage > quizScores.get(quizId)) {
                    quizScores.set(quizId, attempt.percentage || 0);
                  }
                });

                const averageMarks = quizScores.size > 0
                  ? Array.from(quizScores.values()).reduce((sum, score) => sum + score, 0) / quizScores.size
                  : 0;

                return {
                  unitId: unit._id,
                  unitTitle: unit.title,
                  percentage: parseFloat(averageMarks.toFixed(2)),
                  attempted: attempts.length > 0,
                  quizzesTaken: quizScores.size,
                  totalQuizzes: unitQuizzes.length
                };
              })
            );

            // Calculate overall course marks
            const attemptedUnits = unitMarks.filter(u => u.attempted).length;
            // Fixed: Only sum and divide by attempted units to show actual average marks
            const attemptedUnitMarks = unitMarks.filter(u => u.attempted);
            const courseMarks = attemptedUnits > 0
              ? attemptedUnitMarks.reduce((sum, u) => sum + u.percentage, 0) / attemptedUnits
              : 0;

            // Calculate progress
            const videoProgress = totalVideos > 0 ? (videosWatched / totalVideos) * 100 : 0;
            const quizProgress = units.length > 0 ? (attemptedUnits / units.length) * 100 : 0;
            const overallProgress = (videoProgress * 0.5) + (quizProgress * 0.5);
            
            console.log(`[Section Analytics] Course ${course.courseCode} - Videos: ${videosWatched}/${totalVideos}, Progress: ${overallProgress.toFixed(2)}%`);

            // Determine progress color
            let progressColor = 'error';
            if (overallProgress >= 75) {
              progressColor = 'success';
            } else if (overallProgress >= 50) {
              progressColor = 'warning';
            }

            // Determine marks color
            let marksColor = 'error';
            if (courseMarks >= 75) {
              marksColor = 'success';
            } else if (courseMarks >= 50) {
              marksColor = 'warning';
            }

            // Teacher for this course from SectionCourseTeacher mapping
            const teacher = courseTeachers[course._id.toString()];
            const teacherName = teacher ? teacher.name : 'N/A';
            const teacherEmail = teacher ? teacher.email : 'N/A';

            return {
              courseId: course._id,
              courseCode: course.courseCode,
              courseTitle: course.title,
              teacherName: teacherName,
              teacherEmail: teacherEmail,
              watchTime: totalWatchTime,
              watchTimeSeconds: totalWatchTime,
              watchTimeFormatted: formatDuration(totalWatchTime),
              videosWatched,
              totalVideos,
              progress: parseFloat(overallProgress.toFixed(2)),
              progressColor,
              courseMarks: parseFloat(courseMarks.toFixed(2)),
              marksColor,
              unitMarks
            };
          })
        );

        return {
          studentId: student._id,
          studentName: student.name,
          registrationNo: student.regNo || student.uid || 'N/A',
          email: student.email,
          coursePerformance: coursePerformance
        };
      })
    );

    // Prepare courses list with teacher info
    const coursesInfo = section.courses.map(course => {
      const teacher = courseTeachers[course._id.toString()];
      const teacherName = teacher ? teacher.name : 'N/A';
      const teacherEmail = teacher ? teacher.email : 'N/A';
      
      return {
        courseId: course._id,
        courseCode: course.courseCode,
        courseTitle: course.title,
        teacherName: teacherName,
        teacherEmail: teacherEmail
      };
    });

    res.json({
      success: true,
      section: {
        sectionId: section._id,
        sectionName: section.name,
        department: section.department ? section.department.name : 'N/A',
        school: section.school.name,
        studentCount: section.students.length,
        courseCount: section.courses.length,
        teachers: section.teachers && section.teachers.length > 0
          ? section.teachers.map(t => ({ id: t._id, name: t.name, email: t.email }))
          : (section.teacher ? [{ id: section.teacher._id, name: section.teacher.name, email: section.teacher.email }] : [])
      },
      courses: coursesInfo,
      students: studentAnalytics
    });

  } catch (error) {
    console.error('Error fetching section analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching section analytics',
      error: error.message
    });
  }
};

// Helper function to format duration
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
