const Section = require('../models/Section');
const User = require('../models/User');
const Course = require('../models/Course');
const Unit = require('../models/Unit');
const Video = require('../models/Video');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

/**
 * Get all sections for the dean's school
 */
exports.getDeanSections = async (req, res) => {
  try {
    const dean = await User.findById(req.user.id).populate('school');
    
    if (!dean || !dean.school) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dean school not found' 
      });
    }

    console.log(`[Section Analytics] Fetching sections for school: ${dean.school.name}`);

    // Get all sections in the dean's school with populated data
    const sections = await Section.find({ school: dean.school._id })
      .populate('department', 'name')
      .populate('courses', 'title courseCode')
      .sort({ name: 1 });

    console.log(`[Section Analytics] Found ${sections.length} sections`);

    // Format the response
    const sectionList = sections.map(section => ({
      sectionId: section._id,
      sectionName: section.name,
      department: section.department ? section.department.name : 'N/A',
      studentCount: section.students ? section.students.length : 0,
      courseCount: section.courses ? section.courses.length : 0,
      courses: section.courses.map(course => ({
        courseId: course._id,
        courseTitle: course.title,
        courseCode: course.courseCode
      }))
    }));

    res.json({
      success: true,
      sections: sectionList
    });

  } catch (error) {
    console.error('Error fetching dean sections:', error);
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
    const { sectionId } = req.query;

    if (!sectionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Section ID is required' 
      });
    }

    console.log(`[Section Analytics] Fetching analytics for section: ${sectionId}`);

    // Get section with all necessary data
    const section = await Section.findById(sectionId)
      .populate('department', 'name')
      .populate('school', 'name')
      .populate({
        path: 'courses',
        populate: [
          { path: 'department', select: 'name' },
          { path: 'teacher', select: 'name email' }
        ]
      })
      .populate('students', 'name email regNo uid watchHistory');

    if (!section) {
      return res.status(404).json({ 
        success: false, 
        message: 'Section not found' 
      });
    }

    console.log(`[Section Analytics] Section: ${section.name}, Students: ${section.students.length}, Courses: ${section.courses.length}`);

    // Get all courses for this section
    const courses = section.courses;

    // Prepare analytics for each student
    const studentAnalytics = [];

    for (const student of section.students) {
      const coursePerformance = [];

      for (const course of courses) {
        // Get all units for this course
        const units = await Unit.find({ course: course._id }).sort({ order: 1 });
        
        // Get all videos for this course
        const videos = await Video.find({ course: course._id });
        const totalVideos = videos.length;

        // Calculate watch time and videos watched
        let totalWatchTime = 0;
        let videosWatched = 0;

        if (student.watchHistory && student.watchHistory.length > 0) {
          videos.forEach(video => {
            const watchEntry = student.watchHistory.find(
              entry => entry.video && entry.video.toString() === video._id.toString()
            );
            
            if (watchEntry) {
              totalWatchTime += watchEntry.timeSpent || 0;
              if (watchEntry.timeSpent >= video.duration * 0.9) {
                videosWatched++;
              }
            }
          });
        }

        const videoProgress = totalVideos > 0 ? (videosWatched / totalVideos) * 100 : 0;

        // Get quiz attempts for all units
        const unitMarks = [];
        let totalQuizMarks = 0;
        let attemptedUnits = 0;

        for (const unit of units) {
          const quizzes = await Quiz.find({ unit: unit._id });
          
          if (quizzes.length === 0) {
            unitMarks.push({
              unitId: unit._id,
              unitTitle: unit.title,
              percentage: 0,
              attempted: false
            });
            continue;
          }

          const quizAttempts = await QuizAttempt.find({
            student: student._id,
            quiz: { $in: quizzes.map(q => q._id) }
          }).sort({ createdAt: -1 });

          if (quizAttempts.length > 0) {
            const bestScores = {};
            quizAttempts.forEach(attempt => {
              const quizId = attempt.quiz.toString();
              if (!bestScores[quizId] || attempt.percentage > bestScores[quizId]) {
                bestScores[quizId] = attempt.percentage;
              }
            });

            const scores = Object.values(bestScores);
            const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

            unitMarks.push({
              unitId: unit._id,
              unitTitle: unit.title,
              percentage: parseFloat(avgScore.toFixed(2)),
              attempted: true,
              quizzesTaken: scores.length,
              totalQuizzes: quizzes.length
            });

            totalQuizMarks += avgScore;
            attemptedUnits++;
          } else {
            unitMarks.push({
              unitId: unit._id,
              unitTitle: unit.title,
              percentage: 0,
              attempted: false
            });
          }
        }

        const quizProgress = units.length > 0 ? (attemptedUnits / units.length) * 100 : 0;
        // Fixed: Divide by attemptedUnits instead of total units to show actual average marks
        const courseMarks = attemptedUnits > 0 ? totalQuizMarks / attemptedUnits : 0;

        // Calculate overall progress (50% video + 50% quiz)
        const overallProgress = (videoProgress * 0.5) + (quizProgress * 0.5);

        // Determine color coding
        let progressColor = 'red';
        if (overallProgress >= 75) {
          progressColor = 'green';
        } else if (overallProgress >= 50) {
          progressColor = 'yellow';
        }

        let marksColor = 'red';
        if (courseMarks >= 75) {
          marksColor = 'green';
        } else if (courseMarks >= 50) {
          marksColor = 'yellow';
        }

        coursePerformance.push({
          courseId: course._id,
          courseTitle: course.title,
          courseCode: course.courseCode,
          teacherName: course.teacher ? course.teacher.name : 'Not Assigned',
          teacherEmail: course.teacher ? course.teacher.email : 'N/A',
          totalVideos,
          videosWatched,
          videoProgress: parseFloat(videoProgress.toFixed(2)),
          watchTime: totalWatchTime,
          watchTimeSeconds: totalWatchTime,
          watchTimeFormatted: formatDuration(totalWatchTime),
          totalUnits: units.length,
          unitsAttempted: attemptedUnits,
          quizProgress: parseFloat(quizProgress.toFixed(2)),
          overallProgress: parseFloat(overallProgress.toFixed(2)),
          progressColor,
          courseMarks: parseFloat(courseMarks.toFixed(2)),
          marksColor,
          unitMarks
        });
      }

      studentAnalytics.push({
        studentId: student._id,
        studentName: student.name,
        email: student.email,
        registrationNo: student.regNo || student.uid || `STU-${student._id.toString().slice(-8)}`,
        coursePerformance
      });
    }

    // Sort students by name
    studentAnalytics.sort((a, b) => a.studentName.localeCompare(b.studentName));

    res.json({
      success: true,
      section: {
        sectionId: section._id,
        sectionName: section.name,
        department: section.department ? section.department.name : 'N/A',
        school: section.school ? section.school.name : 'N/A',
        studentCount: section.students.length,
        courseCount: courses.length
      },
      courses: courses.map(course => ({
        courseId: course._id,
        courseTitle: course.title,
        courseCode: course.courseCode,
        teacherName: course.teacher ? course.teacher.name : 'Not Assigned'
      })),
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

// Helper function to format duration from seconds to readable format
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

module.exports = exports;
