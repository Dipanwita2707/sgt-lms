const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Unit = require('../models/Unit');
const Video = require('../models/Video');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const School = require('../models/School');
const Department = require('../models/Department');

/**
 * Get student individual analytics
 * Accessible by: HOD, Dean, Teacher (within their school only)
 */
exports.getStudentAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { search } = req.query; // Can be regNo or email

    if (!search) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide student registration number or email' 
      });
    }

    // Get the requesting user's details
    const requestingUser = await User.findById(userId)
      .populate('school')
      .populate('department');

    if (!requestingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get the requesting user's school
    let schoolId;
    if (userRole === 'dean') {
      if (!requestingUser.school) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dean must be assigned to a school' 
        });
      }
      schoolId = requestingUser.school._id;
    } else if (userRole === 'hod') {
      if (!requestingUser.department || !requestingUser.department.school) {
        return res.status(400).json({ 
          success: false, 
          message: 'HOD must be assigned to a department with a school' 
        });
      }
      // Get school from department
      const department = await Department.findById(requestingUser.department._id).populate('school');
      schoolId = department.school._id;
    } else if (userRole === 'teacher') {
      if (!requestingUser.school) {
        return res.status(400).json({ 
          success: false, 
          message: 'Teacher must be assigned to a school' 
        });
      }
      schoolId = requestingUser.school._id;
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only HOD, Dean, and Teacher can view student analytics' 
      });
    }

    // Find the student by registration number or email
    const student = await User.findOne({
      role: 'student',
      $or: [
        { regNo: search },
        { uid: search },
        { email: search.toLowerCase() }
      ]
    })
    .select('+watchHistory')
    .populate('school')
    .populate('department');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found with the provided registration number or email' 
      });
    }

    console.log('📊 Student Watch History:', {
      studentId: student._id,
      studentName: student.name,
      hasWatchHistory: !!student.watchHistory,
      watchHistoryLength: student.watchHistory ? student.watchHistory.length : 0,
      sampleEntry: student.watchHistory && student.watchHistory[0] ? student.watchHistory[0] : null
    });

    // Verify student belongs to the same school
    if (!student.school || student.school._id.toString() !== schoolId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only view students from your school' 
      });
    }

    // Get all sections where this student is enrolled
    const sections = await Section.find({ 
      students: student._id 
    })
      .populate({
        path: 'courses',
        populate: {
          path: 'department',
          populate: { path: 'school' }
        }
      });

    // Process each section to get course analytics
    const courseAnalyticsMap = new Map();

    for (const section of sections) {
      if (!section.courses || section.courses.length === 0) continue;

      for (const course of section.courses) {
        if (!course) continue;

        // Use course ID as key to avoid duplicates
        const courseKey = course._id.toString();
        
        // Skip if we already processed this course
        if (courseAnalyticsMap.has(courseKey)) {
          // Just add this section to the existing course data
          const existing = courseAnalyticsMap.get(courseKey);
          if (!existing.sections.find(s => s.id === section._id.toString())) {
            existing.sections.push({
              id: section._id,
              name: section.name
            });
          }
          continue;
        }

        // Get all units for this course
        const units = await Unit.find({ course: course._id }).sort({ orderIndex: 1 });

        // Get all videos for this course
        const videos = await Video.find({ course: course._id });
        const totalVideos = videos.length;

        // Calculate watch time and videos watched
        let totalWatchTime = 0;
        let videosWatched = 0;

        console.log('🎥 Processing course:', {
          courseId: course._id,
          courseTitle: course.title,
          totalVideos: totalVideos,
          hasWatchHistory: !!student.watchHistory,
          watchHistoryIsArray: Array.isArray(student.watchHistory)
        });

        if (student.watchHistory && Array.isArray(student.watchHistory)) {
          const courseVideoIds = videos.map(v => v._id.toString());
          
          console.log('📹 Course video IDs:', courseVideoIds);
          
          student.watchHistory.forEach(entry => {
            const videoIdStr = entry.video.toString();
            const isCourseVideo = courseVideoIds.includes(videoIdStr);
            
            if (isCourseVideo) {
              console.log('✅ Found watch entry:', {
                videoId: videoIdStr,
                timeSpent: entry.timeSpent,
                lastWatched: entry.lastWatched
              });
              
              totalWatchTime += entry.timeSpent || 0;
              if (entry.timeSpent > 0) {
                videosWatched++;
              }
            }
          });
          
          console.log('⏱️ Total watch time for course:', {
            totalWatchTimeSeconds: totalWatchTime,
            totalWatchTimeMinutes: totalWatchTime / 60,
            videosWatched: videosWatched
          });
        }

        const watchTimeMinutes = totalWatchTime / 60;
        const videoProgress = totalVideos > 0 ? (videosWatched / totalVideos) * 100 : 0;

        // Get quiz attempts for all units in this course
        const unitMarks = await Promise.all(
          units.map(async (unit) => {
            const quizzes = await Quiz.find({ unit: unit._id });
            
            if (quizzes.length === 0) {
              return {
                unitId: unit._id,
                unitTitle: unit.unitTitle,
                percentage: 0,
                attempted: false
              };
            }

            // Get all quiz attempts for this student in this unit
            const quizAttempts = await QuizAttempt.find({
              student: student._id,
              quiz: { $in: quizzes.map(q => q._id) }
            });

            if (quizAttempts.length === 0) {
              return {
                unitId: unit._id,
                unitTitle: unit.unitTitle,
                percentage: 0,
                attempted: false
              };
            }

            // Calculate average marks for this unit
            const totalPercentage = quizAttempts.reduce((sum, attempt) => {
              return sum + (attempt.percentage || 0);
            }, 0);

            const averagePercentage = totalPercentage / quizAttempts.length;

            return {
              unitId: unit._id,
              unitTitle: unit.unitTitle,
              percentage: averagePercentage,
              attempted: true,
              attemptsCount: quizAttempts.length
            };
          })
        );

        // Calculate quiz progress
        const attemptedUnits = unitMarks.filter(u => u.attempted).length;
        const quizProgress = units.length > 0 ? (attemptedUnits / units.length) * 100 : 0;

        // Calculate overall progress (50% video + 50% quiz)
        const overallProgress = (videoProgress * 0.5) + (quizProgress * 0.5);

        // Calculate course marks (average of attempted unit marks only)
        const attemptedUnitMarks = unitMarks.filter(unit => unit.attempted);
        const totalMarks = attemptedUnitMarks.reduce((sum, unit) => sum + unit.percentage, 0);
        const courseMarks = attemptedUnitMarks.length > 0 ? totalMarks / attemptedUnitMarks.length : 0;

        // Determine progress color
        let progressColor = 'red';
        if (overallProgress >= 75) progressColor = 'green';
        else if (overallProgress >= 50) progressColor = 'yellow';

        // Store course analytics
        courseAnalyticsMap.set(courseKey, {
          courseId: course._id,
          courseCode: course.courseCode,
          courseTitle: course.title,
          department: course.department ? {
            id: course.department._id,
            name: course.department.name
          } : null,
          sections: [{
            id: section._id,
            name: section.name
          }],
          totalVideos,
          videosWatched,
          videoProgress: videoProgress.toFixed(2),
          watchTime: totalWatchTime,  // Store in seconds for calculation
          watchTimeMinutes: watchTimeMinutes.toFixed(2),
          watchTimeFormatted: formatDuration(totalWatchTime),
          totalUnits: units.length,
          unitsAttempted: attemptedUnits,
          quizProgress: quizProgress.toFixed(2),
          overallProgress: overallProgress.toFixed(2),
          courseMarks: courseMarks.toFixed(2),
          progressColor,
          unitMarks,
          lastActivity: section.updatedAt
        });
      }
    }

    // Convert map to array
    const validCourseAnalytics = Array.from(courseAnalyticsMap.values());

    // Calculate overall student statistics
    const totalCourses = validCourseAnalytics.length;
    const avgProgress = totalCourses > 0 
      ? validCourseAnalytics.reduce((sum, c) => sum + parseFloat(c.overallProgress), 0) / totalCourses
      : 0;
    const avgMarks = totalCourses > 0
      ? validCourseAnalytics.reduce((sum, c) => sum + parseFloat(c.courseMarks), 0) / totalCourses
      : 0;
    
    // Calculate total watch time in seconds
    const totalWatchTimeSeconds = validCourseAnalytics.reduce((sum, c) => sum + (c.watchTime || 0), 0);

    res.json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        regNo: student.regNo || student.uid || 'N/A',
        school: student.school ? {
          id: student.school._id,
          name: student.school.name
        } : null,
        department: student.department ? {
          id: student.department._id,
          name: student.department.name
        } : null,
        profilePicture: student.profilePicture,
        joinedDate: student.createdAt
      },
      statistics: {
        totalCourses,
        averageProgress: avgProgress.toFixed(2),
        averageMarks: avgMarks.toFixed(2),
        totalWatchTimeMinutes: (totalWatchTimeSeconds / 60).toFixed(2),
        totalWatchTimeHours: (totalWatchTimeSeconds / 3600).toFixed(2),
        totalWatchTimeFormatted: formatDuration(totalWatchTimeSeconds)
      },
      courses: validCourseAnalytics
    });

  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching student analytics',
      error: error.message 
    });
  }
};

/**
 * Search for students in the same school
 * Returns list of students matching the search query
 */
exports.searchStudents = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide at least 2 characters to search' 
      });
    }

    // Get the requesting user's details
    const requestingUser = await User.findById(userId)
      .populate('school')
      .populate('department');

    if (!requestingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get the requesting user's school
    let schoolId;
    if (userRole === 'dean') {
      if (!requestingUser.school) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dean must be assigned to a school' 
        });
      }
      schoolId = requestingUser.school._id;
    } else if (userRole === 'hod') {
      if (!requestingUser.department || !requestingUser.department.school) {
        return res.status(400).json({ 
          success: false, 
          message: 'HOD must be assigned to a department with a school' 
        });
      }
      const department = await Department.findById(requestingUser.department._id).populate('school');
      schoolId = department.school._id;
    } else if (userRole === 'teacher') {
      if (!requestingUser.school) {
        return res.status(400).json({ 
          success: false, 
          message: 'Teacher must be assigned to a school' 
        });
      }
      schoolId = requestingUser.school._id;
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Search for students in the same school
    const students = await User.find({
      role: 'student',
      school: schoolId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { regNo: { $regex: query, $options: 'i' } },
        { uid: { $regex: query, $options: 'i' } }
      ]
    })
      .select('name email regNo uid department profilePicture')
      .populate('department', 'name')
      .limit(20)
      .sort({ name: 1 });

    const studentList = students.map(student => ({
      id: student._id,
      name: student.name,
      email: student.email,
      regNo: student.regNo || student.uid || 'N/A',
      department: student.department ? student.department.name : 'N/A',
      profilePicture: student.profilePicture
    }));

    res.json({
      success: true,
      students: studentList
    });

  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while searching students',
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
