const Course = require('../models/Course');
const Section = require('../models/Section');
const User = require('../models/User');
const Video = require('../models/Video');
const Unit = require('../models/Unit');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

// Get course-wise student analytics
exports.getCourseAnalytics = async (req, res) => {
  try {
    const { courseId, sectionId } = req.query;
    const teacherId = req.user.id;

    // Validate inputs
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    // Get course details
    const course = await Course.findById(courseId)
      .populate('school', 'name')
      .populate('department', 'name');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get sections for this course
    let sectionsQuery = { courses: courseId };
    
    // If sectionId provided, filter by it
    if (sectionId) {
      sectionsQuery._id = sectionId;
    }

    const sections = await Section.find(sectionsQuery)
      .populate('students', 'name regNo uid email')
      .populate('teachers', 'name');

    if (!sections || sections.length === 0) {
      return res.status(404).json({ message: 'No sections found for this course' });
    }

    // Get all units and videos for this course
    const units = await Unit.find({ course: courseId }).populate('videos');
    const directVideos = await Video.find({ course: courseId, unit: null });

    // Collect all videos (from units + direct)
    let allVideos = [...directVideos];
    units.forEach(unit => {
      if (unit.videos && unit.videos.length > 0) {
        allVideos = allVideos.concat(unit.videos);
      }
    });

    const totalVideos = allVideos.length;
    const totalVideoDuration = allVideos.reduce((sum, video) => sum + (video.duration || 0), 0);

    // Get all quizzes for this course (unit quizzes)
    const quizzes = await Quiz.find({ 
      course: courseId,
      unit: { $exists: true }
    }).populate('unit', 'title');

    // Group quizzes by unit
    const quizzesByUnit = {};
    quizzes.forEach(quiz => {
      const unitId = quiz.unit?._id?.toString();
      if (unitId) {
        if (!quizzesByUnit[unitId]) {
          quizzesByUnit[unitId] = {
            unitName: quiz.unit.title,
            quizzes: []
          };
        }
        quizzesByUnit[unitId].quizzes.push(quiz);
      }
    });

    // Process each section's students
    const analyticsData = [];

    for (const section of sections) {
      if (!section.students || section.students.length === 0) continue;

      for (const student of section.students) {
        // Get full student data with watch history
        const studentId = student._id || student;
        const studentUser = await User.findById(studentId).select('name regNo uid email watchHistory');
        
        if (!studentUser) {
          console.log(`[Analytics] Student not found: ${studentId}`);
          continue; // Skip if student not found
        }
        
        // Debug: Check what fields the student actually has
        console.log(`[Analytics] Student Data:`, {
          id: studentUser._id,
          name: studentUser.name,
          regNo: studentUser.regNo,
          uid: studentUser.uid,
          email: studentUser.email,
          watchHistoryLength: studentUser.watchHistory?.length || 0
        });
        
        let totalWatchTime = 0;
        let videosWatched = 0;

        console.log(`[Analytics] Processing Student: ${studentUser.name}`);
        console.log(`[Analytics] - Total Videos in Course: ${allVideos.length}`);
        console.log(`[Analytics] - Watch History Entries: ${studentUser.watchHistory?.length || 0}`);

        if (studentUser.watchHistory && studentUser.watchHistory.length > 0) {
          studentUser.watchHistory.forEach((watch, index) => {
            const videoId = watch.video?.toString();
            const matchesVideo = videoId && allVideos.some(v => v._id.toString() === videoId);
            
            console.log(`[Analytics]   Entry ${index + 1}:`, {
              videoId: videoId,
              matchesVideo: matchesVideo,
              timeSpent: watch.timeSpent || 0
            });
            
            if (matchesVideo) {
              const timeSpent = watch.timeSpent || 0;
              totalWatchTime += timeSpent;
              
              console.log(`[Analytics]   ✓ Video matched: ${videoId}, Time: ${timeSpent}s`);
              
              if (timeSpent > 0) {
                videosWatched++;
              }
            }
          });
        }

        console.log(`[Analytics] ${studentUser.name} - Total Watch Time: ${totalWatchTime}s (${Math.floor(totalWatchTime / 60)} min)`);

        // Calculate progress percentage
        const progressPercentage = totalVideos > 0 
          ? ((videosWatched / totalVideos) * 100).toFixed(2) 
          : 0;

        // Get quiz attempts for this student
        const quizAttempts = await QuizAttempt.find({
          student: studentId,
          quiz: { $in: quizzes.map(q => q._id) }
        }).populate('quiz', 'unit totalMarks');

        // Process unit-wise quiz marks
        const unitWiseMarks = {};
        let totalQuizMarks = 0;
        let totalQuizzesTaken = 0;

        units.forEach(unit => {
          const unitId = unit._id.toString();
          unitWiseMarks[unitId] = {
            unitName: unit.title,
            quizzes: [],
            averageMarks: 0,
            totalMarks: 0,
            quizzesTaken: 0
          };
        });

        quizAttempts.forEach(attempt => {
          const unitId = attempt.quiz?.unit?.toString();
          if (unitId && unitWiseMarks[unitId]) {
            const marks = attempt.score || 0;
            const totalMarks = attempt.maxScore || attempt.quiz?.totalMarks || 100;
            // Use the stored percentage directly instead of recalculating
            const percentage = parseFloat(attempt.percentage || 0);

            unitWiseMarks[unitId].quizzes.push({
              marks: marks,
              totalMarks: totalMarks,
              percentage: percentage.toFixed(2),
              passed: attempt.passed,
              attemptedAt: attempt.createdAt
            });

            unitWiseMarks[unitId].totalMarks += percentage;
            unitWiseMarks[unitId].quizzesTaken++;
            
            totalQuizMarks += percentage;
            totalQuizzesTaken++;
          }
        });

        // Calculate unit averages
        Object.keys(unitWiseMarks).forEach(unitId => {
          const unitData = unitWiseMarks[unitId];
          if (unitData.quizzesTaken > 0) {
            unitData.averageMarks = (unitData.totalMarks / unitData.quizzesTaken).toFixed(2);
          }
        });

        // Calculate overall course marks (average of all quiz percentages)
        const courseMarks = totalQuizzesTaken > 0 
          ? (totalQuizMarks / totalQuizzesTaken).toFixed(2) 
          : 0;

        // Determine progress color
        let progressColor = 'red';
        if (progressPercentage > 75) {
          progressColor = 'green';
        } else if (progressPercentage >= 50) {
          progressColor = 'yellow';
        }

        analyticsData.push({
          studentId: studentUser._id,
          studentName: studentUser.name,
          registrationNo: studentUser.regNo || studentUser.uid || `STU-${studentUser._id.toString().slice(-8)}`,
          email: studentUser.email,
          sectionId: section._id,
          sectionName: section.name,
          watchTime: totalWatchTime, // in seconds
          watchTimeFormatted: formatDuration(totalWatchTime),
          videosWatched: videosWatched,
          totalVideos: totalVideos,
          progress: parseFloat(progressPercentage),
          progressColor: progressColor,
          unitWiseMarks: unitWiseMarks,
          courseMarks: parseFloat(courseMarks),
          totalQuizzesTaken: totalQuizzesTaken,
          totalQuizzes: quizzes.length
        });
      }
    }

    // Sort by student name
    analyticsData.sort((a, b) => a.studentName.localeCompare(b.studentName));

    res.json({
      course: {
        id: course._id,
        title: course.title,
        code: course.courseCode,
        school: course.school?.name,
        department: course.department?.name
      },
      sections: sections.map(s => ({
        id: s._id,
        name: s.name,
        studentCount: s.students?.length || 0
      })),
      units: units.map(u => ({
        id: u._id,
        title: u.title
      })),
      totalStudents: analyticsData.length,
      analytics: analyticsData
    });

  } catch (error) {
    console.error('Get course analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get teacher's courses for analytics
exports.getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    console.log('[getTeacherCourses] Fetching courses for teacher:', teacherId);

    // Get sections where teacher is assigned
    const sections = await Section.find({
      $or: [
        { teacher: teacherId },
        { teachers: teacherId }
      ]
    }).populate('courses', 'title courseCode');

    console.log('[getTeacherCourses] Found sections:', sections.length);

    // Extract unique courses
    const coursesMap = new Map();
    sections.forEach(section => {
      console.log('[getTeacherCourses] Section:', section._id, 'has', section.courses?.length || 0, 'courses');
      if (section.courses && section.courses.length > 0) {
        section.courses.forEach(course => {
          if (!coursesMap.has(course._id.toString())) {
            coursesMap.set(course._id.toString(), {
              id: course._id,
              title: course.title,
              code: course.courseCode,
              sectionsCount: 1
            });
          } else {
            const existing = coursesMap.get(course._id.toString());
            existing.sectionsCount++;
          }
        });
      }
    });

    const courses = Array.from(coursesMap.values());
    console.log('[getTeacherCourses] Returning', courses.length, 'unique courses');

    res.json({ courses });

  } catch (error) {
    console.error('[getTeacherCourses] Error:', error);
    res.status(500).json({ message: error.message });
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

// Export student analytics data as CSV
exports.exportAnalytics = async (req, res) => {
  try {
    const { courseId, sectionId } = req.query;
    
    // Get analytics data (reuse the same logic)
    const analyticsResponse = await exports.getCourseAnalytics(req, res);
    
    // This would generate CSV - for now just return JSON
    // You can implement CSV generation using a library like 'json2csv'
    
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = exports;
