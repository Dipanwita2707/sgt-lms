const User = require('../models/User');
const Video = require('../models/Video');
const Course = require('../models/Course');
const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const { setCache, getCache } = require('../utils/cache');

// Per-student activity heatmap
exports.studentHeatmap = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    // Assume student.watchHistory: [{ video, watchedAt }]
    const pipeline = [
      { $match: { _id: student._id } },
      { $unwind: '$watchHistory' },
      { $project: {
        hour: { $hour: '$watchHistory.watchedAt' },
        day: { $dayOfWeek: '$watchHistory.watchedAt' },
      } },
      { $group: {
        _id: { hour: '$hour', day: '$day' },
        count: { $sum: 1 },
      } },
      { $sort: { '_id.day': 1, '_id.hour': 1 } },
    ];
    const data = await User.aggregate(pipeline);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Teacher performance metrics
exports.teacherPerformance = async (req, res) => {
  try {
    const { teacherId } = req.params;
    // Number of videos
    const videoCount = await Video.countDocuments({ teacher: teacherId });
    // Number of students completed (assume Course.studentsCompleted)
    const courses = await Course.find({ teacher: teacherId });
    let studentsCompleted = 0;
    for (const c of courses) {
      studentsCompleted += Array.isArray(c.studentsCompleted) ? c.studentsCompleted.length : 0;
    }
    // Average feedback rating (assume Course.feedback: [{ rating }])
    let feedbacks = [];
    for (const c of courses) {
      if (Array.isArray(c.feedback)) feedbacks = feedbacks.concat(c.feedback.map(f => f.rating));
    }
    const avgRating = feedbacks.length ? (feedbacks.reduce((a, b) => a + b, 0) / feedbacks.length).toFixed(2) : null;
    res.json({ videoCount, studentsCompleted, avgRating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export analytics as CSV (students or teachers)
exports.exportAnalyticsCSV = async (req, res) => {
  try {
    const { type } = req.query; // 'students' or 'teachers'
    let data = [];
    if (type === 'students') {
      data = await User.find({ role: 'student' }).lean();
    } else if (type === 'teachers') {
      data = await User.find({ role: 'teacher' }).lean();
    }
    const parser = new Parser();
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`${type}-analytics.csv`);
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Overview: total counts, active users, top courses (with in-memory cache)
exports.getOverview = async (req, res) => {
  try {
    // Try cache first (cache for 30 seconds)
    const cached = getCache('dashboard_overview');
    if (cached) return res.json(cached);
    
    const [totalStudents, totalTeachers, totalCourses, totalVideos] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Course.countDocuments(),
      Video.countDocuments(),
    ]);
    
    // Active students in last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const activeStudents = await User.countDocuments({ role: 'student', lastActive: { $gte: tenMinAgo } });
    
    // Top 5 courses by students enrolled
    const topCourses = await Course.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'coursesAssigned',
          as: 'students'
        }
      },
      {
        $project: {
          _id: 1,
          name: '$title', // Use title as name
          enrollments: { $size: '$students' }
        }
      },
      { $sort: { enrollments: -1 } },
      { $limit: 5 }
    ]);
    
    const overview = {
      totalStudents,
      totalTeachers,
      totalCourses,
      totalVideos,
      activeStudents,
      topCourses,
    };
    
    setCache('dashboard_overview', overview, 30 * 1000); // 30 seconds
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Enrollment trend per week/month
exports.getEnrollmentTrends = async (req, res) => {
  try {
    const { range = 'month' } = req.query; // 'week' or 'month'
    const groupFormat = range === 'week' ? { $isoWeek: '$createdAt' } : { $month: '$createdAt' };
    const pipeline = [
      { $match: { role: 'student' } },
      { $group: {
        _id: {
          year: { $year: '$createdAt' },
          period: groupFormat,
        },
        count: { $sum: 1 },
      } },
      { $sort: { '_id.year': 1, '_id.period': 1 } },
    ];
    const data = await User.aggregate(pipeline);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Heatmap: student activity by hour/day
exports.getActivityHeatmap = async (req, res) => {
  try {
    // Assume User.lastActive is updated on every action
    const pipeline = [
      { $match: { role: 'student', lastActive: { $exists: true } } },
      { $project: {
        hour: { $hour: '$lastActive' },
        day: { $dayOfWeek: '$lastActive' },
      } },
      { $group: {
        _id: { hour: '$hour', day: '$day' },
        count: { $sum: 1 },
      } },
      { $sort: { '_id.day': 1, '_id.hour': 1 } },
    ];
    
    const data = await User.aggregate(pipeline);
    
    // Convert day numbers to day names for readability
    const dayMap = {
      1: 'Sunday',
      2: 'Monday',
      3: 'Tuesday',
      4: 'Wednesday',
      5: 'Thursday',
      6: 'Friday',
      7: 'Saturday'
    };
    
    const formattedData = data.map(item => ({
      _id: {
        hour: item._id.hour,
        day: dayMap[item._id.day] || `Day ${item._id.day}`
      },
      count: item.count
    }));
    
    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get detailed analytics overview (for other parts of admin dashboard)
exports.getDetailedOverview = async (req, res) => {
  try {
    const studentsCount = await User.countDocuments({ role: 'student' });
    const teachersCount = await User.countDocuments({ role: 'teacher' });
    const coursesCount = await Course.countDocuments();
    const videosCount = await Video.countDocuments();
    
    // Get active students in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeStudents = await User.countDocuments({
      role: 'student',
      'watchHistory.lastWatched': { $gte: sevenDaysAgo }
    });
    
    res.json({
      studentsCount,
      teachersCount,
      coursesCount,
      videosCount,
      activeStudents,
      activeStudentsPercentage: studentsCount > 0 ? (activeStudents / studentsCount) * 100 : 0
    });
  } catch (err) {
    console.error('Error getting detailed overview:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get detailed enrollment trend over time (different format)
exports.getDetailedEnrollmentTrends = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const result = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: period === 'monthly' ? { $month: '$createdAt' } : null,
            week: period === 'weekly' ? { $week: '$createdAt' } : null,
            day: period === 'daily' ? { $dayOfMonth: '$createdAt' } : null
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } }
    ]);

    // Format the result
    const trends = result.map(item => {
      let label;
      if (period === 'monthly') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        label = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      } else if (period === 'weekly') {
        label = `Week ${item._id.week}, ${item._id.year}`;
      } else {
        label = `${item._id.day}/${item._id.month}/${item._id.year}`;
      }
      
      return { 
        label, 
        count: item.count 
      };
    });
    
    res.json(trends);
  } catch (err) {
    console.error('Error getting detailed enrollment trends:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get top courses by enrollment
exports.getTopCourses = async (req, res) => {
  try {
    const courses = await Course.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'coursesAssigned',
          as: 'students'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          name: '$title', // Use title as name for compatibility with dashboard component
          courseCode: 1,
          description: 1,
          studentsCount: { $size: '$students' },
          enrollments: { $size: '$students' } // Additional field for dashboard component
        }
      },
      { $sort: { studentsCount: -1 } },
      { $limit: 5 }
    ]);
    
    res.json(courses);
  } catch (err) {
    console.error('Error getting top courses:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get detailed activity heatmap data
exports.getDetailedActivityHeatmap = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const result = await User.aggregate([
      { 
        $match: { 
          role: 'student',
          'watchHistory.lastWatched': { $gte: startDate }
        }
      },
      { $unwind: '$watchHistory' },
      { 
        $match: { 
          'watchHistory.lastWatched': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$watchHistory.lastWatched' },
            month: { $month: '$watchHistory.lastWatched' },
            day: { $dayOfMonth: '$watchHistory.lastWatched' },
            hour: { $hour: '$watchHistory.lastWatched' }
          },
          count: { $sum: 1 },
          totalTimeSpent: { $sum: '$watchHistory.timeSpent' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);
    
    // Format the result
    const heatmap = result.map(item => {
      const date = new Date(
        item._id.year, 
        item._id.month - 1, 
        item._id.day, 
        item._id.hour
      );
      
      return {
        date: date.toISOString(),
        day: date.getDay(),
        hour: date.getHours(),
        value: item.count,
        timeSpent: item.totalTimeSpent
      };
    });
    
    res.json(heatmap);
  } catch (err) {
    console.error('Error getting detailed activity heatmap:', err);
    res.status(500).json({ message: err.message });
  }
};

// Enhanced course analytics with student count, total watch time and more details
exports.getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Find the course with populated teachers
    const course = await Course.findById(courseId)
      .populate('teachers', 'name teacherId email')
      .populate('videos');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get all students assigned to this course
    const students = await User.find({ 
      coursesAssigned: courseId,
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
        uniqueDaysActive: uniqueDays.size,
        videosWatched: Object.keys(videoCompletions).length
      });
    }
    
    // Calculate average watch time per student
    const avgWatchTime = students.length > 0 
      ? studentAnalytics.reduce((sum, student) => sum + student.totalWatchTime, 0) / students.length 
      : 0;
    
    // Calculate watch time per video
    const videoAnalytics = [];
    
    for (const video of course.videos) {
      let totalWatchTime = 0;
      let studentsWatched = 0;
      
      for (const student of students) {
        const watchRecord = student.watchHistory.find(
          item => item.video && item.video.toString() === video._id.toString()
        );
        
        if (watchRecord && watchRecord.timeSpent > 0) {
          totalWatchTime += watchRecord.timeSpent;
          studentsWatched++;
        }
      }
      
      videoAnalytics.push({
        _id: video._id,
        title: video.title,
        totalWatchTime,
        totalWatchTimeFormatted: formatTime(totalWatchTime),
        studentsWatched,
        avgWatchTimePerStudent: studentsWatched > 0 ? totalWatchTime / studentsWatched : 0,
        avgWatchTimeFormatted: studentsWatched > 0 ? formatTime(totalWatchTime / studentsWatched) : '0s',
        watchPercentage: students.length > 0 ? (studentsWatched / students.length) * 100 : 0
      });
    }
    
    // Calculate teacher activity and contribution
    const teacherAnalytics = course.teachers.map(teacher => {
      // Count videos uploaded by this teacher
      const teacherVideos = course.videos.filter(
        video => video.teacher && video.teacher.toString() === teacher._id.toString()
      );
      
      return {
        _id: teacher._id,
        name: teacher.name,
        teacherId: teacher.teacherId,
        email: teacher.email,
        videosUploaded: teacherVideos.length,
        contributionPercentage: course.videos.length > 0 
          ? (teacherVideos.length / course.videos.length) * 100 
          : 0
      };
    });
    
    // Return comprehensive analytics
    res.json({
      course: {
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode,
        description: course.description
      },
      summary: {
        totalStudents: students.length,
        totalVideos: course.videos.length,
        totalTeachers: course.teachers.length,
        avgWatchTime,
        avgWatchTimeFormatted: formatTime(avgWatchTime)
      },
      studentAnalytics: studentAnalytics.sort((a, b) => b.totalWatchTime - a.totalWatchTime),
      videoAnalytics: videoAnalytics.sort((a, b) => b.totalWatchTime - a.totalWatchTime),
      teacherAnalytics
    });
  } catch (err) {
    console.error('Error getting course analytics:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get student analytics across all courses
exports.getStudentDetailedAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Find student with populated courses and watch history
    const student = await User.findById(studentId)
      .populate('coursesAssigned')
      .populate('watchHistory.video');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
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
        lastWatched: item.lastWatched,
        playbackRate: item.playbackRate || 1
      };
      
      // Update last activity
      if (item.lastWatched && (!courseWatchHistory[courseId].lastActivity || 
          item.lastWatched > courseWatchHistory[courseId].lastActivity)) {
        courseWatchHistory[courseId].lastActivity = item.lastWatched;
      }
    }
    
    // Build detailed course analytics
    const courseAnalytics = [];
    
    for (const course of student.coursesAssigned) {
      const courseId = course._id.toString();
      const watchData = courseWatchHistory[courseId] || { totalTime: 0, videos: {}, lastActivity: null };
      
      // Calculate watch metrics for this course
      const videosWatched = Object.keys(watchData.videos).length;
      
      // Get course videos to calculate completion percentage
      const courseWithVideos = await Course.findById(courseId).populate('videos');
      const totalVideos = courseWithVideos?.videos?.length || 0;
      
      // Time-based analytics
      const watchTimesByDay = {};
      const watchTimesByHour = {};
      
      // Process watch times by day and hour
      Object.values(watchData.videos).forEach(videoData => {
        if (videoData.lastWatched) {
          const day = videoData.lastWatched.toLocaleDateString('en-US', { weekday: 'long' });
          const hour = videoData.lastWatched.getHours();
          
          watchTimesByDay[day] = (watchTimesByDay[day] || 0) + videoData.timeSpent;
          watchTimesByHour[hour] = (watchTimesByHour[hour] || 0) + videoData.timeSpent;
        }
      });
      
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
          lastWatched: data.lastWatched,
          playbackRate: data.playbackRate || 1
        })),
        watchTimesByDay,
        watchTimesByHour
      });
    }
    
    // Calculate activity heatmap data
    const activityHeatmap = generateActivityHeatmap(student.watchHistory);
    
    // Calculate engagement metrics
    const engagementMetrics = calculateEngagementMetrics(student.watchHistory);
    
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
        totalCourses: student.coursesAssigned.length,
        totalVideosWatched: Object.keys(videoDetails).length,
        averageWatchTimePerVideo: Object.keys(videoDetails).length > 0 
          ? totalWatchTime / Object.keys(videoDetails).length 
          : 0,
        averageWatchTimeFormatted: Object.keys(videoDetails).length > 0 
          ? formatTime(totalWatchTime / Object.keys(videoDetails).length) 
          : '0s'
      },
      courseAnalytics: courseAnalytics.sort((a, b) => b.totalWatchTime - a.totalWatchTime),
      activityHeatmap,
      engagementMetrics
    });
  } catch (err) {
    console.error('Error getting student analytics:', err);
    res.status(500).json({ message: err.message });
  }
};

// Search student by registration number
exports.searchStudent = async (req, res) => {
  try {
    const { regNo } = req.query;
    
    if (!regNo) {
      return res.status(400).json({ message: 'Registration number is required' });
    }
    
    const student = await User.findOne({ 
      regNo, 
      role: 'student' 
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Return student ID to redirect to detailed analytics
    res.json({ 
      _id: student._id,
      name: student.name,
      regNo: student.regNo,
      email: student.email
    });
  } catch (err) {
    console.error('Error searching student:', err);
    res.status(500).json({ message: err.message });
  }
};

// Teacher activity and performance analytics
exports.getTeacherAnalytics = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Find teacher with populated courses
    const teacher = await User.findById(teacherId)
      .populate('coursesAssigned');
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get all videos by this teacher
    const videos = await Video.find({ teacher: teacherId });
    
    // Calculate course-specific analytics
    const courseAnalytics = [];
    
    for (const course of teacher.coursesAssigned) {
      // Videos uploaded to this course by this teacher
      const courseVideos = videos.filter(
        video => video.course && video.course.toString() === course._id.toString()
      );
      
      // Get all students for this course
      const students = await User.find({ 
        coursesAssigned: course._id,
        role: 'student'
      }).select('watchHistory');
      
      // Calculate total watch time across all students for this teacher's videos
      let totalWatchTime = 0;
      let studentsEngaged = 0;
      
      for (const student of students) {
        let hasWatchedTeacherVideo = false;
        
        for (const watchRecord of student.watchHistory) {
          const videoMatch = courseVideos.find(v => 
            v._id.toString() === (watchRecord.video ? watchRecord.video.toString() : '')
          );
          
          if (videoMatch && watchRecord.timeSpent > 0) {
            totalWatchTime += watchRecord.timeSpent;
            hasWatchedTeacherVideo = true;
          }
        }
        
        if (hasWatchedTeacherVideo) {
          studentsEngaged++;
        }
      }
      
      courseAnalytics.push({
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode,
        videosUploaded: courseVideos.length,
        totalStudents: students.length,
        studentsEngaged,
        engagementRate: students.length > 0 ? (studentsEngaged / students.length) * 100 : 0,
        totalWatchTime,
        totalWatchTimeFormatted: formatTime(totalWatchTime),
        avgWatchTimePerStudent: studentsEngaged > 0 ? totalWatchTime / studentsEngaged : 0,
        avgWatchTimeFormatted: studentsEngaged > 0 ? formatTime(totalWatchTime / studentsEngaged) : '0s'
      });
    }
    
    // Return comprehensive teacher analytics
    res.json({
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        teacherId: teacher.teacherId,
        email: teacher.email
      },
      summary: {
        totalCourses: teacher.coursesAssigned.length,
        totalVideos: videos.length,
        totalStudentsReached: courseAnalytics.reduce((sum, course) => sum + course.totalStudents, 0),
        totalStudentsEngaged: courseAnalytics.reduce((sum, course) => sum + course.studentsEngaged, 0),
        totalWatchTime: courseAnalytics.reduce((sum, course) => sum + course.totalWatchTime, 0),
        totalWatchTimeFormatted: formatTime(
          courseAnalytics.reduce((sum, course) => sum + course.totalWatchTime, 0)
        )
      },
      courseAnalytics: courseAnalytics.sort((a, b) => b.totalWatchTime - a.totalWatchTime)
    });
  } catch (err) {
    console.error('Error getting teacher analytics:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get student's per-video analytics (just for backward compatibility)
exports.studentAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId).populate('watchHistory.video');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student.watchHistory);
  } catch (err) {
    res.status(400).json({ message: err.message });
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

// Helper function to generate activity heatmap
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

// Helper function to calculate engagement metrics
function calculateEngagementMetrics(watchHistory) {
  // Sort watch history by lastWatched
  const sortedHistory = [...watchHistory]
    .filter(item => item.lastWatched)
    .sort((a, b) => new Date(a.lastWatched) - new Date(b.lastWatched));
  
  if (sortedHistory.length === 0) {
    return {
      firstActivity: null,
      lastActivity: null,
      totalDaysActive: 0,
      averageSessionLength: 0,
      averageSessionLengthFormatted: '0s',
      longestStreak: 0,
      currentStreak: 0
    };
  }
  
  // Calculate first and last activity dates
  const firstActivity = new Date(sortedHistory[0].lastWatched);
  const lastActivity = new Date(sortedHistory[sortedHistory.length - 1].lastWatched);
  
  // Calculate unique active days
  const uniqueDays = new Set(
    sortedHistory.map(item => 
      new Date(item.lastWatched).toISOString().split('T')[0]
    )
  );
  
  // Calculate streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let currentDate = new Date();
  
  // Convert uniqueDays to array and sort
  const activeDays = Array.from(uniqueDays).sort();
  
  // Calculate current streak (consecutive days including today)
  const today = new Date().toISOString().split('T')[0];
  
  for (let i = activeDays.length - 1; i >= 0; i--) {
    const dayDiff = Math.floor(
      (currentDate - new Date(activeDays[i])) / (1000 * 60 * 60 * 24)
    );
    
    if (dayDiff <= 1) {
      currentStreak++;
      currentDate = new Date(activeDays[i]);
    } else {
      break;
    }
  }
  
  // Reset if today is not included
  if (activeDays.length > 0 && activeDays[activeDays.length - 1] !== today) {
    currentStreak = 0;
  }
  
  // Calculate longest streak
  let tempStreak = 1;
  for (let i = 1; i < activeDays.length; i++) {
    const dayDiff = Math.floor(
      (new Date(activeDays[i]) - new Date(activeDays[i - 1])) / (1000 * 60 * 60 * 24)
    );
    
    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  // Calculate average session length (group activities within 30min as one session)
  const sessions = [];
  let currentSession = {
    start: new Date(sortedHistory[0].lastWatched),
    end: new Date(sortedHistory[0].lastWatched),
    timeSpent: sortedHistory[0].timeSpent || 0
  };
  
  for (let i = 1; i < sortedHistory.length; i++) {
    const currentTime = new Date(sortedHistory[i].lastWatched);
    const timeDiff = (currentTime - currentSession.end) / (1000 * 60); // in minutes
    
    if (timeDiff <= 30) {
      // Continue current session
      currentSession.end = currentTime;
      currentSession.timeSpent += sortedHistory[i].timeSpent || 0;
    } else {
      // End current session and start a new one
      sessions.push(currentSession);
      currentSession = {
        start: currentTime,
        end: currentTime,
        timeSpent: sortedHistory[i].timeSpent || 0
      };
    }
  }
  
  // Add the last session
  sessions.push(currentSession);
  
  // Calculate average session length
  const totalSessionTime = sessions.reduce((sum, session) => sum + session.timeSpent, 0);
  const averageSessionLength = sessions.length > 0 ? totalSessionTime / sessions.length : 0;
  
  return {
    firstActivity,
    lastActivity,
    totalDaysActive: uniqueDays.size,
    averageSessionLength,
    averageSessionLengthFormatted: formatTime(averageSessionLength),
    longestStreak,
    currentStreak,
    totalSessions: sessions.length
  };
}


// Per-video analytics (which students watched + duration + completion %), with filters
exports.videoAnalytics = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { courseId, teacherId, date } = req.query;
    let query = { _id: videoId };
    if (courseId) query.course = courseId;
    if (teacherId) query.teacher = teacherId;
    // Optionally filter by upload date if needed
    const video = await Video.findOne(query).populate('watchRecords.student');
    if (!video) return res.status(404).json({ message: 'Video not found' });
    const duration = video.duration || 1; // Assume duration is stored, else 1 to avoid div by 0
    const records = video.watchRecords.map(r => ({
      student: r.student,
      watchtime: r.timeSpent,
      completion: Math.min(100, Math.round((r.timeSpent / duration) * 100))
    }));
    res.json({
      video: { title: video.title, _id: video._id },
      records
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
