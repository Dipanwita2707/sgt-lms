const Video = require('../models/Video');
const Course = require('../models/Course');
const User = require('../models/User');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const mongoose = require('mongoose');
const execPromise = util.promisify(exec);

// Get video duration using ffprobe
const getVideoDuration = async (filePath) => {
  try {
    // Check if ffprobe is available
    const { stdout, stderr } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );

    if (stderr) {
      // Only log actual errors, not just missing ffprobe
      if (!stderr.includes('is not recognized') && !stderr.includes('command not found')) {
        console.error('Error getting video duration:', stderr);
      }
      return null;
    }

    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? null : Math.round(duration);
  } catch (error) {
    // Don't log errors for missing ffprobe, just return null
    if (!error.message.includes('is not recognized') && !error.message.includes('command not found')) {
      console.error('Failed to get video duration:', error.message);
    }
    return null;
  }
};

// Upload video
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, courseId, unitId } = req.body;
    if (!title || !courseId || !req.file) {
      return res.status(400).json({ message: 'Title, course ID, and video file are required' });
    }
    
    // Find the course to validate it exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if course has units and unitId is required
    const Unit = require('../models/Unit');
    const unitCount = await Unit.countDocuments({ course: courseId });
    
    if (unitCount > 0 && (!unitId || !mongoose.Types.ObjectId.isValid(unitId))) {
      return res.status(400).json({ message: 'Unit selection is required for this course' });
    }
    
    // Get the first teacher from the course if available
    let teacherId = null;
    if (course.teachers && course.teachers.length > 0) {
      teacherId = course.teachers[0];
    }
    
    // Store only the relative path (not the full system path)
    // Convert Windows path separators to forward slashes
    const fullPath = req.file.path.replace(/\\/g, '/');
    
    // Extract just the filename from uploads directory
    const videoUrl = 'uploads/' + req.file.filename;
    
    // Try to get video duration using ffprobe first (use full path for ffprobe)
    let duration = null;
    try {
      duration = await getVideoDuration(fullPath);
    } catch (err) {
      console.error('Error getting video duration:', err);
      // Continue without duration
    }
    
    // If ffprobe failed but frontend provided duration, use that
    if (!duration && req.body.duration) {
      duration = parseInt(req.body.duration, 10);
      console.log('Using duration from frontend:', duration, 'seconds');
    }
    
    // Create video document
    const videoData = { 
      title, 
      description, 
      course: courseId, 
      teacher: teacherId, 
      videoUrl,
      duration
    };
    
    // If unitId is provided, associate the video with that unit
    if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
      // Check if the unit exists and belongs to this course
      const Unit = require('../models/Unit');
      const unit = await Unit.findOne({ _id: unitId, course: courseId });
      
      if (unit) {
        videoData.unit = unitId;
        videoData.sequence = unit.videos ? unit.videos.length + 1 : 1;
      }
    }
    
    const video = new Video(videoData);
    await video.save();
    
    // Add video to course
    await Course.findByIdAndUpdate(courseId, { $push: { videos: video._id } });
    
    // If video is associated with a unit, add it to that unit as well
    let unit = null;
    if (video.unit) {
      const Unit = require('../models/Unit');
      unit = await Unit.findByIdAndUpdate(video.unit, 
        { $push: { videos: video._id } },
        { new: true }
      );
      
      // If this is the first video, also set the hasUnits flag on the course
      await Course.findByIdAndUpdate(courseId, { $set: { hasUnits: true } });
    }

    // Unlock this video for all students assigned to this course
    const User = require('../models/User');
    const StudentProgress = require('../models/StudentProgress');
    
    // Find all students assigned to this course
    const students = await User.find({
      coursesAssigned: courseId,
      role: 'student'
    }).select('_id');
    
    // Unlock the video for each student and update unit progress
    for (const student of students) {
      try {
        // Create or update progress record for this student
        let progress = await StudentProgress.findOne({ 
          student: student._id, 
          course: courseId 
        });
        
        if (!progress) {
          // Initialize new progress record
          progress = new StudentProgress({
            student: student._id,
            course: courseId,
            unlockedVideos: [video._id],
            units: []
          });
        } else {
          // Add video to unlocked videos if not already there
          if (!progress.unlockedVideos.includes(video._id)) {
            progress.unlockedVideos.push(video._id);
          }
        }
        
        // If video is part of a unit, update unit progress
        if (video.unit && unit) {
          // Check if unit exists in progress
          const unitIndex = progress.units.findIndex(
            u => u.unitId && u.unitId.toString() === video.unit.toString()
          );
          
          if (unitIndex === -1) {
            // If this is the first unit (order 0), mark it as unlocked
            const isFirstUnit = unit.order === 0;
            
            // Add unit to progress
            progress.units.push({
              unitId: video.unit,
              status: isFirstUnit ? 'in-progress' : 'locked',
              unlocked: isFirstUnit,
              unlockedAt: isFirstUnit ? new Date() : null,
              videosWatched: []
            });
          }
        }
        
        await progress.save();
        console.log(`Updated progress for student ${student._id} for course ${courseId}`);
      } catch (err) {
        console.error(`Error updating progress for student ${student._id}:`, err);
        // Continue with next student even if there's an error
      }
    }
    
    res.status(201).json(video);
  } catch (err) {
    console.error('Error uploading video:', err);
    res.status(400).json({ message: err.message });
  }
};

// Remove video
exports.removeVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    fs.unlinkSync(video.videoUrl);
    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Video removed' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Warn video (flag for review)
exports.warnVideo = async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $set: { warned: true } });
    res.json({ message: 'Video flagged for review' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get video analytics
exports.getVideoAnalytics = async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Find video
    const video = await Video.findById(videoId)
      .populate('course', 'title courseCode')
      .populate('teacher', 'name email');
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Find all students who are assigned to the course containing this video
    const students = await User.find({
      coursesAssigned: video.course,
      role: 'student'
    }).select('_id name email regNo watchHistory');
    
    // Calculate analytics
    let totalViews = 0;
    let totalWatchTime = 0;
    let completedViews = 0;
    const studentData = [];
    
    for (const student of students) {
      const watchRecord = student.watchHistory.find(item => 
        item.video && item.video.toString() === videoId.toString()
      );
      
      if (watchRecord && watchRecord.timeSpent > 0) {
        totalViews++;
        totalWatchTime += watchRecord.timeSpent;
        
        // Count as completed if watched more than 90% of the video
        if (video.duration && watchRecord.timeSpent >= video.duration * 0.9) {
          completedViews++;
        }
        
        // Calculate progress percentage
        const progress = video.duration 
          ? Math.min(100, Math.round((watchRecord.timeSpent / video.duration) * 100)) 
          : 0;
        
        studentData.push({
          studentId: student._id,
          name: student.name,
          regNo: student.regNo,
          email: student.email,
          watchTime: watchRecord.timeSpent,
          currentPosition: watchRecord.currentPosition || 0,
          progress,
          lastWatched: watchRecord.lastWatched || null
        });
      }
    }
    
    // Fetch analytics data from audit logs
    const AuditLog = require('../models/AuditLog');
    const watchEvents = await AuditLog.find({
      action: 'video_watch',
      'details.videoId': videoId
    }).sort({ createdAt: -1 }).limit(500);
    
    // Process watch events for engagement metrics
    const watchSessions = {};
    for (const event of watchEvents) {
      const studentId = event.performedBy.toString();
      if (!watchSessions[studentId]) {
        watchSessions[studentId] = {
          sessionCount: 0,
          watchEvents: [],
          averageSessionLength: 0,
          totalEvents: 0
        };
      }
      
      watchSessions[studentId].watchEvents.push(event);
      watchSessions[studentId].totalEvents++;
    }
    
    // Calculate metrics for each student's sessions
    Object.keys(watchSessions).forEach(studentId => {
      const sessions = watchSessions[studentId];
      const events = sessions.watchEvents;
      
      // Group events into sessions (events more than 30 minutes apart are considered different sessions)
      const sessionBreakpoint = 30 * 60 * 1000; // 30 minutes in milliseconds
      let sessionStartTime = null;
      let currentSessionLength = 0;
      let totalSessionLength = 0;
      let sessionCount = 0;
      
      events.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const eventTime = new Date(event.createdAt);
        
        if (!sessionStartTime) {
          sessionStartTime = eventTime;
          sessionCount++;
        } else {
          const timeDiff = eventTime - sessionStartTime;
          if (timeDiff > sessionBreakpoint) {
            // Start a new session
            totalSessionLength += currentSessionLength;
            currentSessionLength = 0;
            sessionStartTime = eventTime;
            sessionCount++;
          }
        }
        
        // Add this event's time to the current session
        if (event.details && event.details.timeSpent) {
          currentSessionLength += event.details.timeSpent;
        }
      }
      
      // Add the last session
      if (currentSessionLength > 0) {
        totalSessionLength += currentSessionLength;
      }
      
      sessions.sessionCount = sessionCount;
      sessions.averageSessionLength = sessionCount > 0 ? totalSessionLength / sessionCount : 0;
    });
    
    // Augment student data with session information
    for (const student of studentData) {
      const sessionInfo = watchSessions[student.studentId];
      if (sessionInfo) {
        student.sessionCount = sessionInfo.sessionCount;
        student.averageSessionLength = sessionInfo.averageSessionLength;
        student.totalEvents = sessionInfo.totalEvents;
      } else {
        student.sessionCount = 0;
        student.averageSessionLength = 0;
        student.totalEvents = 0;
      }
    }
    
    // Calculate averages
    const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
    const completionRate = students.length > 0 
      ? Math.round((completedViews / students.length) * 100) 
      : 0;
    
    const response = {
      videoId: video._id,
      videoTitle: video.title,
      videoUrl: video.videoUrl,
      thumbnail: video.thumbnail,
      courseTitle: video.course ? video.course.title : null,
      courseCode: video.course ? video.course.courseCode : null,
      teacherName: video.teacher ? video.teacher.name : null,
      duration: video.duration,
      totalViews,
      averageWatchTime,
      completionRate,
      totalWatchTime: totalWatchTime,
      studentCount: students.length,
      engagementScore: students.length > 0 ? Math.round((totalViews / students.length) * 100) : 0,
      studentData: studentData.sort((a, b) => b.watchTime - a.watchTime) // Sort by watch time
    };
    
    // Update video analytics data
    video.analytics = {
      totalViews,
      totalWatchTime,
      completionRate,
      lastUpdated: new Date()
    };
    
    await video.save();
    
    res.json(response);
  } catch (err) {
    console.error('Error getting video analytics:', err);
    res.status(500).json({ message: err.message });
  }
};
