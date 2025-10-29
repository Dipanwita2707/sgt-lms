const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const QuizPool = require('../models/QuizPool');
const QuizLock = require('../models/QuizLock');
const User = require('../models/User');
const Course = require('../models/Course');
const Video = require('../models/Video');
const Unit = require('../models/Unit');
const Section = require('../models/Section');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { checkUnitDeadline, checkActivityDeadlineCompliance } = require('../utils/deadlineUtils');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const StudentProgress = require('../models/StudentProgress');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id);
};

// Helper function to shuffle an array
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Helper function to check if student has access to a course via sections
const studentHasAccessToCourse = async (studentId, courseId) => {
  try {
    const section = await Section.findOne({
      students: studentId,
      courses: courseId
    });
    return !!section;
  } catch (error) {
    console.error('Error checking student course access:', error);
    return false;
  }
};

// Helper function to check if teacher has access to a student via shared sections
const teacherHasAccessToStudent = async (teacherId, studentId) => {
  try {
    // Find any section where the teacher is assigned and the student is also assigned
    const sharedSection = await Section.findOne({
      teacher: teacherId,
      students: studentId
    });
    return !!sharedSection;
  } catch (error) {
    console.error('Error checking teacher-student access:', error);
    return false;
  }
};

// Create quiz template file
exports.createQuizTemplate = (req, res) => {
  // Create CSV template for quiz questions
  const template = [
    'questionText,option1,option2,option3,option4,correctOption,points',
    'What is the capital of France?,London,Paris,Berlin,Madrid,2,1',
    'Which planet is known as the Red Planet?,Earth,Venus,Mars,Jupiter,3,1',
    'Add your questions following this format. The correctOption number is 1-based (1,2,3,4).,,,,,,'
  ].join('\n');
  
  // Set headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=quiz_template.csv');
  
  // Send the template file
  res.send(template);
};

// Upload quiz via CSV
exports.uploadQuiz = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { title, description, courseId, videoId, afterVideoId, unitId, timeLimit, passingScore } = req.body;
    
    // Validate required fields
    if (!title || !courseId) {
      return res.status(400).json({ message: 'Title and course ID are required' });
    }
    
    // Either videoId or unitId must be provided
    if (!videoId && !unitId) {
      return res.status(400).json({ message: 'Either video ID or unit ID is required' });
    }
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // If videoId is provided, validate it
    if (videoId) {
      // Check if video exists and belongs to the course
      const video = await Video.findById(videoId);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      if (video.course.toString() !== courseId) {
        return res.status(400).json({ message: 'Video does not belong to the specified course' });
      }
    }
    
    // If unitId is provided, validate it
    let unit = null;
    if (unitId) {
      unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }
      
      if (unit.course.toString() !== courseId) {
        return res.status(400).json({ message: 'Unit does not belong to the specified course' });
      }
    }
    
    // Parse CSV file
    const questions = [];
    let rowCount = 0;
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Skip empty rows and example rows
          if (!row.questionText || row.questionText.includes('Add your questions')) {
            return;
          }
          
          rowCount++;
          
          // Validate row data
          const options = [row.option1, row.option2, row.option3, row.option4];
          const correctOption = parseInt(row.correctOption) - 1; // Convert to 0-based index
          const points = parseInt(row.points) || 1;
          
          // Validate options
          if (options.some(opt => !opt || opt.trim() === '')) {
            reject(new Error(`Row ${rowCount}: All four options must be provided`));
            return;
          }
          
          // Validate correct option
          if (isNaN(correctOption) || correctOption < 0 || correctOption > 3) {
            reject(new Error(`Row ${rowCount}: Correct option must be a number between 1 and 4`));
            return;
          }
          
          questions.push({
            questionText: row.questionText,
            options,
            correctOption,
            points
          });
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
    
    // Validate minimum number of questions
    if (questions.length < 3) {
      return res.status(400).json({ message: 'Quiz must have at least 3 questions' });
    }
    
    // Create new quiz
    const quiz = new Quiz({
      title,
      description,
      course: courseId,
      unit: unitId || undefined,
      video: videoId || undefined,
      afterVideo: afterVideoId || undefined,
      questions,
      timeLimit: parseInt(timeLimit) || 30,
      passingScore: 70, // Fixed at 70% as per requirements
      unlockNextVideo: true,
      createdBy: req.user._id
    });
    
    await quiz.save();
    
    // If this quiz is after a specific video, update that video
    if (afterVideoId) {
      await Video.findByIdAndUpdate(afterVideoId, {
        $set: { hasQuizAfter: true, quiz: quiz._id }
      });
    }
    
    // Instead of auto-adding to pool, create QuestionReview entries for CC workflow
    try {
      const QuestionReview = require('../models/QuestionReview');
      const CourseModel = require('../models/Course');
      const courseDoc = await CourseModel.findById(courseId).select('coordinators');
      const assignedCc = (courseDoc && Array.isArray(courseDoc.coordinators) && courseDoc.coordinators.length > 0) ? courseDoc.coordinators[0] : undefined;

      const reviewDocs = quiz.questions.map(q => ({
        course: courseId,
        unit: unitId || undefined,
        quiz: quiz._id,
        questionId: q._id,
        uploader: req.user._id,
        assignedTo: assignedCc,
        status: 'pending',
        snapshot: {
          questionText: q.questionText,
          options: q.options,
          correctOption: q.correctOption,
          points: q.points
        }
      }));
      if (reviewDocs.length) {
        await QuestionReview.insertMany(reviewDocs);
      }
      // Also link quiz to unit for backward compatibility (UI listings)
      if (unitId) {
        await Unit.findByIdAndUpdate(unitId, { $addToSet: { quizzes: quiz._id } });
      }
    } catch (e) {
      console.warn('QuestionReview creation failed:', e.message);
    }
    
    // Log the action
    await AuditLog.create({
      action: 'create_quiz',
      performedBy: req.user._id,
      details: { 
        quizId: quiz._id, 
        title, 
        courseId, 
        videoId, 
        afterVideoId,
        unitId,
        questionCount: questions.length 
      }
    });
    
    // Clean up - remove the uploaded file
    fs.unlinkSync(req.file.path);
    
    res.status(201).json({
      message: 'Quiz created successfully; sent for CC review',
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.questions.length,
        totalPoints: quiz.totalPoints
      }
    });
    
  } catch (error) {
    console.error('Error uploading quiz:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ message: error.message });
  }
};

// Get quizzes for a course
exports.getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Check if user has access to this course based on their role
    if (req.user.role === 'student') {
      // Students need section-based access
      const hasAccess = await studentHasAccessToCourse(req.user._id, courseId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'You are not enrolled in this course' });
      }
    } else if (req.user.role === 'teacher') {
      // Teachers need to be assigned to a section containing this course
      const section = await Section.findOne({
        teacher: req.user._id,
        courses: courseId
      });
      if (!section) {
        return res.status(403).json({ message: 'You are not assigned to teach this course' });
      }
    }
    // Admins have full access (no additional check needed)
    
    // Get all quizzes for this course
    const quizzes = await Quiz.find({ course: courseId, isActive: true })
      .select('_id title description video unit totalPoints timeLimit createdAt createdBy questions')
      .populate('video', 'title thumbnail')
      .populate('unit', 'title')
      .populate('createdBy', 'name');
    
    // Get quiz pools for this course
    const quizPools = await QuizPool.find({ 
      course: courseId, 
      isActive: true,
      unit: { $exists: true, $ne: null }  // Only get quiz pools with valid units
    })
      .select('_id title description unit quizzes createdAt')
      .populate('unit', 'title');
    
    // Add question counts for all quiz pools
    const enhancedQuizPools = await Promise.all(quizPools.map(async (pool) => {
      // Get all quizzes in this pool
      const poolQuizzes = await Quiz.find({ _id: { $in: pool.quizzes } });
      
      // Count total questions across all quizzes
      let questionCount = 0;
      poolQuizzes.forEach(quiz => {
        questionCount += quiz.questions ? quiz.questions.length : 0;
      });
      
      const poolObj = pool.toObject();
      poolObj.questionCount = questionCount;
      return poolObj;
    }));
    
    // Process quizzes to include question count and exclude the actual questions
    const processedQuizzes = quizzes.map(quiz => {
      const quizObj = quiz.toObject();
      quizObj.questionCount = quiz.questions.length;
      delete quizObj.questions; // Remove the questions array to reduce payload size
      return quizObj;
    });
    
    // Combine both for a complete view
    const response = {
      quizzes: processedQuizzes,
      quizPools: enhancedQuizPools
    };
      
    res.json(response);
  } catch (error) {
    console.error('Error getting course quizzes:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get full quiz details with questions & student attempts (admin/teacher)
exports.getQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!isValidObjectId(quizId)) {
      return res.status(400).json({ message: 'Invalid quiz ID format' });
    }

    // Authorization: only teacher or admin
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const quiz = await Quiz.findById(quizId)
      .populate('course', 'title courseCode')
      .populate('unit', 'title')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // If teacher, ensure assigned to course
    if (req.user.role === 'teacher') {
      const teacher = await User.findById(req.user._id).select('coursesAssigned');
      if (!teacher.coursesAssigned.includes(quiz.course._id.toString())) {
        return res.status(403).json({ message: 'You are not assigned to this course' });
      }
    }

    // Fetch attempts that directly reference this quiz (rare if using quiz pools)
    const attempts = await QuizAttempt.find({ quiz: quizId })
      .populate('student', 'name regNo email')
      .sort({ completedAt: -1 });

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        course: quiz.course,
        unit: quiz.unit,
        createdBy: quiz.createdBy,
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        questionCount: quiz.questions.length,
        totalPoints: quiz.totalPoints,
        createdAt: quiz.createdAt
      },
      questions: quiz.questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        points: q.points
      })),
      attempts: attempts.map(a => ({
        _id: a._id,
        student: a.student,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        completedAt: a.completedAt
      }))
    });
  } catch (error) {
    console.error('Error getting quiz details:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get unit quiz pool for students
exports.getUnitQuizForStudent = async (req, res) => {
  try {
    const { unitId } = req.params;
    
    // Validate unitId
    if (!isValidObjectId(unitId)) {
      return res.status(400).json({ message: 'Invalid unit ID format' });
    }
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can take quizzes' });
    }
    
    // Get the unit
    const Unit = require('../models/Unit');
    const unit = await Unit.findById(unitId)
      .populate('course', 'title')
      .populate('videos');
    
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    
    // Check if student has access to this course via sections
    const hasAccess = await studentHasAccessToCourse(req.user._id, unit.course._id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }
    
    // Check if the student has watched all videos in the unit
    const studentProgress = await StudentProgress.findOne({
      student: req.user._id,
      course: unit.course._id,
      'units.unitId': unitId
    });
    
    let canTakeQuiz = false;
    if (studentProgress) {
      const unitProgress = studentProgress.units.find(u => u.unitId.toString() === unitId);
      if (unitProgress) {
        // Check if all videos are watched
        const watchedVideos = unitProgress.videosWatched || [];
        const unitVideos = unit.videos || [];
        
        if (unitVideos.length === 0 || watchedVideos.length >= unitVideos.length) {
          canTakeQuiz = true;
        }
      }
    }
    
    if (!canTakeQuiz) {
      return res.status(403).json({ 
        message: 'You need to watch all videos in this unit before taking the quiz',
        videosRequired: true
      });
    }
    
    // Get the quiz pool for this unit
    const quizPool = await QuizPool.findOne({ unit: unitId, isActive: true })
      .select('_id title description questionsPerAttempt timeLimit passingScore');
    
    if (!quizPool) {
      return res.status(404).json({ message: 'No quiz available for this unit' });
    }
    
    // Check if student has already attempted and passed the quiz
    const existingAttempt = await QuizAttempt.findOne({
      quizPool: quizPool._id,
      student: req.user._id,
      passed: true
    });
    
    if (existingAttempt) {
      return res.json({
        quizPool: {
          _id: quizPool._id,
          title: quizPool.title,
          description: quizPool.description,
          timeLimit: quizPool.timeLimit
        },
        attempt: {
          _id: existingAttempt._id,
          score: existingAttempt.score,
          percentage: existingAttempt.percentage,
          passed: existingAttempt.passed,
          completedAt: existingAttempt.completedAt
        },
        alreadyPassed: true
      });
    }
    
    // Check for recent failed attempts (8-hour cooldown)
    const lastFailedAttempt = await QuizAttempt.findOne({
      quizPool: quizPool._id,
      student: req.user._id,
      passed: false
    }).sort({ completedAt: -1 });
    
    if (lastFailedAttempt) {
      const now = new Date();
      const lastAttemptTime = new Date(lastFailedAttempt.completedAt);
      const hoursSinceLastAttempt = (now - lastAttemptTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastAttempt < 8) {
        const hoursRemaining = Math.ceil(8 - hoursSinceLastAttempt);
        
        return res.status(403).json({
          message: `You can retry this quiz in ${hoursRemaining} hour(s)`,
          cooldownRemaining: hoursRemaining,
          lastAttempt: {
            _id: lastFailedAttempt._id,
            score: lastFailedAttempt.score,
            percentage: lastFailedAttempt.percentage,
            completedAt: lastFailedAttempt.completedAt
          }
        });
      }
    }
    
    // Get all quizzes in the pool
    const quizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } });
    if (quizzes.length === 0) {
      return res.status(404).json({ message: 'No questions available in the quiz pool' });
    }
    // Only include approved questions from QuestionReview
    const QuestionReview = require('../models/QuestionReview');
    const approved = await QuestionReview.find({
      status: 'approved',
      course: quizPool.course,
      unit: quizPool.unit,
      quiz: { $in: quizzes.map(q => q._id) }
    }).select('questionId');
    // Legacy fallback: if no review docs exist at all for this course/unit, allow all questions
    const approvedSet = new Set(approved.map(r => r.questionId.toString()));
    const legacyMode = approved.length === 0;
    // Collect all approved questions from all quizzes
    const allQuestions = [];
    quizzes.forEach(quiz => {
      quiz.questions.forEach(question => {
        if (legacyMode || approvedSet.has(question._id.toString())) {
          allQuestions.push({
            _id: question._id,
            questionText: question.questionText,
            options: question.options,
            correctOption: question.correctOption,
            points: question.points,
            originalQuizId: quiz._id
          });
        }
      });
    });
    if (allQuestions.length === 0) {
      return res.status(404).json({ message: 'No approved questions available in the quiz pool' });
    }
    
    // Shuffle and select questionsPerAttempt questions (default 10)
    const questionsToSelect = Math.min(quizPool.questionsPerAttempt, allQuestions.length);
    const selectedQuestions = shuffleArray([...allQuestions])
      .slice(0, questionsToSelect);
    
    // Prepare quiz for student (remove correct answers)
    const quizForStudent = {
      _id: quizPool._id,
      title: quizPool.title || `${unit.title} Quiz`,
      description: quizPool.description || `Complete this quiz to progress in the course`,
      timeLimit: quizPool.timeLimit || 30,
      questionsCount: selectedQuestions.length,
      passingScore: quizPool.passingScore || 70,
      questions: selectedQuestions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        points: q.points
      }))
    };
    
    res.json({
      quizPool: quizForStudent,
      unitTitle: unit.title,
      courseTitle: unit.course.title,
      alreadyPassed: false
    });
  } catch (error) {
    console.error('Error getting unit quiz for student:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create quiz attempt (for QuizLauncher)
exports.createQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log('Creating quiz attempt for quizId:', quizId);
    console.log('User:', req.user._id, req.user.role);
    
    // Validate quizId
    if (!isValidObjectId(quizId)) {
      console.log('Invalid quiz ID format:', quizId);
      return res.status(400).json({ message: 'Invalid quiz ID format' });
    }
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('User is not a student:', req.user.role);
      return res.status(403).json({ message: 'Only students can attempt quizzes' });
    }
    
    // Get the quiz details
    console.log('Fetching quiz details for ID:', quizId);
    const quiz = await Quiz.findById(quizId)
      .populate('course', 'title')
      .populate('unit', 'title');
    
    if (!quiz) {
      console.log('Quiz not found for ID:', quizId);
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    console.log('Quiz found:', quiz.title, 'Course:', quiz.course?.title);
    
    // Check if student has access to this course via sections
    const hasAccess = await studentHasAccessToCourse(req.user._id, quiz.course._id);
    if (!hasAccess) {
      console.log('Student not enrolled in course');
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }
    
    // Check unit deadline if quiz is part of a unit
    if (quiz.unit) {
      const deadlineInfo = await checkUnitDeadline(quiz.unit._id);
      if (deadlineInfo.hasDeadline && deadlineInfo.isExpired && deadlineInfo.strictDeadline) {
        console.log('Quiz access denied - unit deadline passed:', deadlineInfo);
        return res.status(403).json({ 
          message: 'This quiz is no longer accessible. The unit deadline has passed.',
          deadlineInfo: {
            deadline: deadlineInfo.deadline,
            daysLeft: deadlineInfo.daysLeft,
            deadlineDescription: deadlineInfo.deadlineDescription
          }
        });
      }
    }
    
    // Check if student has already attempted and passed this quiz
    const existingPassedAttempt = await QuizAttempt.findOne({
      quiz: quizId,
      student: req.user._id,
      passed: true,
      isSubmitted: true
    });
    
    if (existingPassedAttempt) {
      return res.status(400).json({ 
        message: 'You have already passed this quiz',
        existingAttempt: {
          _id: existingPassedAttempt._id,
          score: existingPassedAttempt.score,
          percentage: existingPassedAttempt.percentage,
          completedAt: existingPassedAttempt.completedAt
        }
      });
    }
    
    // Check for incomplete attempts
    const incompleteAttempt = await QuizAttempt.findOne({
      quiz: quizId,
      student: req.user._id,
      isSubmitted: false
    });
    
    if (incompleteAttempt) {
      // Return the existing incomplete attempt
      return res.json({
        message: 'Resuming existing quiz attempt',
        attemptId: incompleteAttempt._id,
        isResuming: true
      });
    }
    
    // Check cooldown for failed attempts (if any)
    const lastFailedAttempt = await QuizAttempt.findOne({
      quiz: quizId,
      student: req.user._id,
      passed: false,
      isSubmitted: true
    }).sort({ completedAt: -1 });
    
    if (lastFailedAttempt) {
      const now = new Date();
      const lastAttemptTime = new Date(lastFailedAttempt.completedAt);
      const hoursSinceLastAttempt = (now - lastAttemptTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastAttempt < 8) {
        const hoursRemaining = Math.ceil(8 - hoursSinceLastAttempt);
        return res.status(403).json({
          message: `You can retry this quiz in ${hoursRemaining} hour(s)`,
          cooldownRemaining: hoursRemaining,
          lastAttempt: {
            score: lastFailedAttempt.score,
            percentage: lastFailedAttempt.percentage,
            completedAt: lastFailedAttempt.completedAt
          }
        });
      }
    }
    
    // Shuffle questions for this attempt
    const shuffledQuestions = shuffleArray([...quiz.questions]);
    
    // Create new quiz attempt
    const attempt = new QuizAttempt({
      quiz: quizId,
      student: req.user._id,
      course: quiz.course._id,
      unit: quiz.unit?._id,
      questions: shuffledQuestions.map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        points: q.points
      })),
      secureMode: true,
      passingScore: quiz.passingScore || 70,
      startedAt: new Date(),
      isSubmitted: false,
      securitySettings: {
        fullscreenRequired: true,
        tabSwitchesAllowed: 3,
        tabSwitchDuration: 15,
        autoSubmitOnViolation: true,
        securityChecks: ['fullscreen', 'tabSwitch', 'rightClick', 'keyboard']
      }
    });
    
    await attempt.save();
    
    // Log the action
    await AuditLog.create({
      action: 'create_quiz_attempt',
      performedBy: req.user._id,
      details: { quizId, attemptId: attempt._id }
    });
    
    res.json({
      message: 'Quiz attempt created successfully',
      attemptId: attempt._id
    });
  } catch (error) {
    console.error('Error creating quiz attempt:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quiz attempt for student (for SecureQuizPage)
exports.getQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    // Validate attemptId
    if (!isValidObjectId(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID format' });
    }
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can access quiz attempts' });
    }
    
    // Find the quiz attempt
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('quiz', 'title timeLimit passingScore')
      .populate('quizPool', 'title timeLimit passingScore')
      .populate('course', 'title')
      .populate('unit', 'title');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }
    
    // Verify the attempt belongs to the current student
    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This attempt does not belong to you' });
    }
    
    // If already submitted, return the results
    if (attempt.isSubmitted) {
      return res.json({
        attempt: {
          _id: attempt._id,
          quiz: attempt.quiz,
          quizPool: attempt.quizPool,
          course: attempt.course,
          unit: attempt.unit,
          isSubmitted: true,
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          passed: attempt.passed,
          completedAt: attempt.completedAt,
          securityViolations: attempt.securityViolations
        },
        questions: [], // Don't send questions for completed attempts
        isCompleted: true
      });
    }
    
    // Get quiz questions (either from quiz or stored in attempt)
    let questions = [];
    let quizTitle = 'Quiz';
    let timeLimit = 30;
    let passingScore = 70;
    
    if (attempt.questions && attempt.questions.length > 0) {
      // Questions are stored in the attempt (quiz pool case)
      questions = attempt.questions.map(q => ({
        _id: q.questionId || q._id,
        questionText: q.questionText,
        options: q.options,
        points: q.points || 1
      }));
    } else if (attempt.quiz) {
      // Get questions from the original quiz
      const quiz = await Quiz.findById(attempt.quiz);
      if (quiz) {
        questions = quiz.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          points: q.points || 1
        }));
        quizTitle = quiz.title;
        timeLimit = quiz.timeLimit;
        passingScore = quiz.passingScore;
      }
    }
    
    // Use quiz/quizPool data if available
    if (attempt.quiz) {
      quizTitle = attempt.quiz.title || quizTitle;
      timeLimit = attempt.quiz.timeLimit || timeLimit;
      passingScore = attempt.quiz.passingScore || passingScore;
    } else if (attempt.quizPool) {
      quizTitle = attempt.quizPool.title || quizTitle;
      timeLimit = attempt.quizPool.timeLimit || timeLimit;
      passingScore = attempt.quizPool.passingScore || passingScore;
    }
    
    res.json({
      attempt: {
        _id: attempt._id,
        quiz: attempt.quiz,
        quizPool: attempt.quizPool,
        course: attempt.course,
        unit: attempt.unit,
        isSubmitted: false,
        startedAt: attempt.startedAt,
        secureMode: attempt.secureMode
      },
      quiz: {
        _id: attempt.quiz?._id || attempt.quizPool?._id,
        title: quizTitle,
        timeLimit,
        passingScore,
        questionsCount: questions.length
      },
      questions,
      isCompleted: false
    });
  } catch (error) {
    console.error('Error getting quiz attempt:', error);
    res.status(500).json({ message: error.message });
  }
};

// Submit individual quiz attempt (for SecureQuizPage)
exports.submitQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, timeSpent, securityViolations, tabSwitchCount, isAutoSubmit } = req.body;
    
    // Validate attemptId
    if (!isValidObjectId(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID format' });
    }
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit quiz attempts' });
    }
    
    // Find the quiz attempt
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }
    
    // Verify the attempt belongs to the current student
    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This attempt does not belong to you' });
    }
    
    // Check if already submitted
    if (attempt.isSubmitted) {
      return res.status(400).json({ message: 'This attempt has already been submitted' });
    }
    
    // Validate answers
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid answers format' });
    }
    
    // Get quiz details to validate answers
    let quiz;
    if (attempt.quiz) {
      quiz = await Quiz.findById(attempt.quiz);
    } else if (attempt.quizPool) {
      // For quiz pool attempts, we need to reconstruct the quiz from the stored questions
      quiz = {
        questions: attempt.questions || []
      };
    }
    
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({ message: 'Quiz questions not found' });
    }
    
    // Process answers and calculate score
    let score = 0;
    let maxScore = 0;
    const processedAnswers = [];
    
    // Create a map of questions for faster lookup
    const questionsMap = {};
    quiz.questions.forEach(question => {
      const qId = question._id ? question._id.toString() : question.questionId.toString();
      questionsMap[qId] = question;
    });
    
    // Process each answer
    answers.forEach(answer => {
      const questionId = answer.questionId;
      const question = questionsMap[questionId];
      
      if (!question) {
        return; // Skip if question not found
      }
      
      const isCorrect = answer.selectedOption === question.correctOption;
      const points = isCorrect ? (question.points || 1) : 0;
      score += points;
      maxScore += (question.points || 1);
      
      processedAnswers.push({
        questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        points
      });
    });
    
    // Calculate percentage and pass status
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const passingScore = attempt.passingScore || 70;
    const passed = percentage >= passingScore;
    
    // Debug logging for percentage calculation
    console.log(`[QUIZ DEBUG] Score calculation:`, {
      score,
      maxScore,
      percentage: percentage.toFixed(2),
      passingScore,
      passed,
      questionCount: quiz.questions.length,
      answersCount: answers.length
    });
    
    // Update the attempt with results
    attempt.answers = processedAnswers;
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.timeSpent = timeSpent || 0;
    attempt.securityViolations = (securityViolations && securityViolations.length) || 0;
    attempt.autoSubmitted = isAutoSubmit || false;
    attempt.isSubmitted = true;
    attempt.isComplete = true;
    attempt.completedAt = new Date();
    
    // Update security data
    if (securityViolations || tabSwitchCount) {
      attempt.securityData = attempt.securityData || {};
      attempt.securityData.violations = securityViolations || [];
      attempt.securityData.tabSwitchCount = tabSwitchCount || 0;
      attempt.securityData.isAutoSubmit = isAutoSubmit || false;
    }
    
    await attempt.save();
    
    // Log the action
    await AuditLog.create({
      action: 'submit_quiz_attempt',
      performedBy: req.user._id,
      details: { 
        attemptId, 
        score, 
        percentage, 
        passed,
        securityViolations: (securityViolations && securityViolations.length) || 0,
        autoSubmitted: isAutoSubmit || false
      }
    });

    // Create or update QuizLock if student failed or has security violations
    if (!passed || (securityViolations && securityViolations.length > 0)) {
      try {
        // Find existing lock for this student-quiz combination
        let quizLock = await QuizLock.findOne({
          studentId: req.user._id,
          quizId: attempt.quiz || attempt.quizPool,
          courseId: attempt.course
        });

        if (!quizLock) {
          // Create new quiz lock
          quizLock = new QuizLock({
            studentId: req.user._id,
            quizId: attempt.quiz || attempt.quizPool,
            courseId: attempt.course,
            passingScore: passingScore
          });
        }

        // Determine lock reason
        let lockReason;
        if (securityViolations && securityViolations.length > 0) {
          lockReason = 'SECURITY_VIOLATION';
        } else if (!passed) {
          lockReason = 'BELOW_PASSING_SCORE';
        }

        // Lock the quiz with the failure details
        await quizLock.lockQuiz(lockReason, percentage, passingScore);

        console.log(`🔒 Quiz locked for student ${req.user.name} - Reason: ${lockReason}, Score: ${percentage}%`);
      } catch (lockError) {
        console.error('Error creating quiz lock:', lockError);
        // Don't fail the entire submission if lock creation fails
      }
    }
    
    // Update student progress if this was a passing attempt
    if (passed && attempt.unit) {
      // Check deadline compliance for this quiz submission
      let deadlineCompliance = { shouldCount: true, completedAfterDeadline: false };
      try {
        deadlineCompliance = await checkActivityDeadlineCompliance(attempt.unit, new Date());
        console.log(`📅 Quiz deadline check for unit ${attempt.unit}:`, deadlineCompliance);
      } catch (deadlineError) {
        console.error('Error checking quiz deadline compliance:', deadlineError);
        // Default to allowing the activity if there's an error
      }
      
      let progress = await StudentProgress.findOne({
        student: req.user._id,
        course: attempt.course
      });
      
      if (!progress) {
        // Create new progress record
        progress = new StudentProgress({
          student: req.user._id,
          course: attempt.course,
          units: [{
            unitId: attempt.unit,
            status: deadlineCompliance.shouldCount ? 'completed' : 'in-progress',
            quizAttempts: [{
              quizId: attempt.quiz || attempt.quizPool,
              attemptId: attempt._id,
              score: percentage,
              passed: true,
              completedAt: new Date(),
              completedAfterDeadline: deadlineCompliance.completedAfterDeadline
            }],
            completedAfterDeadline: deadlineCompliance.completedAfterDeadline
          }],
          lastActivity: new Date()
        });
      } else {
        // Find the unit in the progress
        const unitIndex = progress.units.findIndex(u => 
          u.unitId.toString() === attempt.unit.toString()
        );
        
        if (unitIndex >= 0) {
          // Update existing unit progress
          const unitProgress = progress.units[unitIndex];
          
          // Add quiz attempt with deadline information
          unitProgress.quizAttempts.push({
            quizId: attempt.quiz || attempt.quizPool,
            attemptId: attempt._id,
            score: percentage,
            passed: true,
            completedAt: new Date(),
            completedAfterDeadline: deadlineCompliance.completedAfterDeadline
          });
          
          // Update unit status based on deadline compliance
          if (deadlineCompliance.shouldCount) {
            unitProgress.status = 'completed';
            unitProgress.completedAt = new Date();
          }
          
          // Track if unit was completed after deadline
          if (deadlineCompliance.completedAfterDeadline) {
            unitProgress.completedAfterDeadline = true;
          }
          
          progress.units[unitIndex] = unitProgress;
        } else {
          // Add new unit progress
          progress.units.push({
            unitId: attempt.unit,
            status: deadlineCompliance.shouldCount ? 'completed' : 'in-progress',
            quizAttempts: [{
              quizId: attempt.quiz || attempt.quizPool,
              attemptId: attempt._id,
              score: percentage,
              passed: true,
              completedAt: new Date(),
              completedAfterDeadline: deadlineCompliance.completedAfterDeadline
            }],
            completedAt: deadlineCompliance.shouldCount ? new Date() : null,
            completedAfterDeadline: deadlineCompliance.completedAfterDeadline
          });
        }
        
        progress.lastActivity = new Date();
      }
      
      await progress.save();
      
      // Log deadline compliance information
      if (!deadlineCompliance.shouldCount) {
        console.log(`⚠️ Quiz for unit ${attempt.unit} completed after strict deadline - progress not fully counted`);
      }
    }
    
    res.json({
      message: passed ? 'Congratulations! You passed the quiz.' : 'Quiz submitted successfully.',
      result: {
        attemptId: attempt._id,
        score,
        maxScore,
        percentage,
        passed,
        securityViolations: (securityViolations && securityViolations.length) || 0,
        autoSubmitted: isAutoSubmit || false,
        answers: processedAnswers
      }
    });
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    res.status(500).json({ message: error.message });
  }
};

// Submit quiz pool attempt
exports.submitQuizPoolAttempt = async (req, res) => {
  try {
    const { quizPoolId } = req.params;
    const { answers, timeSpent } = req.body;
    
    // Validate quizPoolId
    if (!isValidObjectId(quizPoolId)) {
      return res.status(400).json({ message: 'Invalid quiz pool ID format' });
    }
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit quizzes' });
    }
    
    // Get quiz pool details
    const quizPool = await QuizPool.findById(quizPoolId);
    if (!quizPool) {
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    // Check if student has access to this course via sections
    const hasAccess = await studentHasAccessToCourse(req.user._id, quizPool.course);
    if (!hasAccess) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }
    
    // Validate answers
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid answers format' });
    }
    
    // Get all quizzes in the pool to find original questions
    const quizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } });
    // Only allow approved questions
    const QuestionReview = require('../models/QuestionReview');
    const approved = await QuestionReview.find({
      status: 'approved',
      course: quizPool.course,
      unit: quizPool.unit,
      quiz: { $in: quizzes.map(q => q._id) }
    }).select('questionId');
    const approvedSet = new Set(approved.map(r => r.questionId.toString()));
    const legacyMode = approved.length === 0;
    // Create a map of approved questions from all quizzes for faster lookup
    const allQuestionsMap = {};
    quizzes.forEach(quiz => {
      quiz.questions.forEach(question => {
        const key = question._id.toString();
        if (legacyMode || approvedSet.has(key)) {
          allQuestionsMap[key] = {
            questionText: question.questionText,
            options: question.options,
            correctOption: question.correctOption,
            points: question.points,
            originalQuizId: quiz._id
          };
        }
      });
    });
    
    // Process answers and calculate score
    let score = 0;
    let maxScore = 0;
    const processedAnswers = [];
    const attemptQuestions = [];
    
    // Process each answer
    answers.forEach(answer => {
      const questionId = answer.questionId;
      const question = allQuestionsMap[questionId];
      
      if (!question) {
        return; // Skip if question not found
      }
      
      const isCorrect = answer.selectedOption === question.correctOption;
      const points = isCorrect ? question.points : 0;
      score += points;
      maxScore += question.points;
      
      processedAnswers.push({
        questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        points
      });
      
      // Store question in the attempt
      attemptQuestions.push({
        questionId,
        questionText: question.questionText,
        options: question.options,
        correctOption: question.correctOption,
        points: question.points,
        originalQuizId: question.originalQuizId
      });
    });
    
    // Calculate percentage and pass status
    const percentage = (score / maxScore) * 100;
    const passed = percentage >= quizPool.passingScore;
    
    // Create quiz attempt record (mark as submitted & complete so results persist)
    const attempt = new QuizAttempt({
      quizPool: quizPoolId,
      student: req.user._id,
      course: quizPool.course,
      unit: quizPool.unit,
      questions: attemptQuestions,
      answers: processedAnswers,
      score,
      maxScore,
      percentage,
      passed,
      timeSpent: timeSpent || 0,
      completedAt: new Date(),
      isSubmitted: true,
      isComplete: true
    });
    
    await attempt.save();
    
    // Log the action
    await AuditLog.create({
      action: 'submit_quiz_pool',
      performedBy: req.user._id,
      details: { quizPoolId, score, percentage, passed }
    });

    // Create or update QuizLock if student failed 
    if (!passed) {
      try {
        // Find existing lock for this student-quiz combination
        let quizLock = await QuizLock.findOne({
          studentId: req.user._id,
          quizId: quizPoolId,
          courseId: quizPool.course
        });

        if (!quizLock) {
          // Create new quiz lock
          quizLock = new QuizLock({
            studentId: req.user._id,
            quizId: quizPoolId,
            courseId: quizPool.course,
            passingScore: quizPool.passingScore
          });
        }

        // Lock the quiz with failure details
        await quizLock.lockQuiz('BELOW_PASSING_SCORE', percentage, quizPool.passingScore);

        console.log(`🔒 Quiz pool locked for student ${req.user.name} - Score: ${percentage}%`);
      } catch (lockError) {
        console.error('Error creating quiz pool lock:', lockError);
        // Don't fail the entire submission if lock creation fails
      }
    }
    
    // Update student progress
    if (quizPool.unit) {
      // Find or create progress record
      let progress = await StudentProgress.findOne({
        student: req.user._id,
        course: quizPool.course
      });
      
      if (!progress) {
        // Create new progress record
        progress = new StudentProgress({
          student: req.user._id,
          course: quizPool.course,
          units: [{
            unitId: quizPool.unit,
            status: passed ? 'completed' : 'in-progress',
            quizAttempts: [{
              quizId: quizPoolId,
              attemptId: attempt._id,
              score: percentage,
              passed,
              completedAt: new Date()
            }]
          }],
          lastActivity: new Date()
        });
      } else {
        // Find the unit in the progress
        const unitIndex = progress.units.findIndex(u => 
          u.unitId.toString() === quizPool.unit.toString()
        );
        
        if (unitIndex >= 0) {
          // Update existing unit progress
          const unitProgress = progress.units[unitIndex];
          
          // Add quiz attempt
          unitProgress.quizAttempts.push({
            quizId: quizPoolId,
            attemptId: attempt._id,
            score: percentage,
            passed,
            completedAt: new Date()
          });
          
          // Update unit status if passed
          if (passed) {
            unitProgress.status = 'completed';
            unitProgress.completedAt = new Date();
          }
          
          progress.units[unitIndex] = unitProgress;
        } else {
          // Add new unit progress
          progress.units.push({
            unitId: quizPool.unit,
            status: passed ? 'completed' : 'in-progress',
            quizAttempts: [{
              quizId: quizPoolId,
              attemptId: attempt._id,
              score: percentage,
              passed,
              completedAt: new Date()
            }]
          });
        }
        
        progress.lastActivity = new Date();
      }
      
      await progress.save();
      
      // If passed, unlock next unit
      if (passed) {
        // Get the current unit's order
        const Unit = require('../models/Unit');
        const currentUnit = await Unit.findById(quizPool.unit);
        
        if (currentUnit) {
          // Find the next unit in sequence
          const nextUnit = await Unit.findOne({
            course: quizPool.course,
            order: { $gt: currentUnit.order }
          }).sort({ order: 1 });
          
          if (nextUnit) {
            // Check if the student already has this unit in progress
            const hasNextUnit = progress.units.some(u => 
              u.unitId.toString() === nextUnit._id.toString()
            );
            
            if (!hasNextUnit) {
              // Add the next unit as unlocked
              progress.units.push({
                unitId: nextUnit._id,
                status: 'in-progress',
                unlocked: true,
                unlockedAt: new Date()
              });
              
              await progress.save();
            }
          }
        }
      }
    }

    res.json({
      message: passed ? 'Congratulations! You passed the quiz.' : 'Quiz submitted successfully.',
      result: {
        score,
        maxScore,
        percentage,
        passed,
        answers: processedAnswers
      }
    });
  } catch (error) {
    console.error('Error submitting quiz pool attempt:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quiz analytics for teachers
exports.getQuizAnalytics = async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // Validate quizId
    if (!isValidObjectId(quizId)) {
      return res.status(400).json({ message: 'Invalid quiz ID format' });
    }
    
    // Check if user is authorized (teacher or admin)
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get quiz details
    const quiz = await Quiz.findById(quizId)
      .populate('course', 'title')
      .populate('video', 'title')
      .populate('createdBy', 'name');
      
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // If user is a teacher, check if they are assigned to the course
    if (req.user.role === 'teacher') {
      const teacher = await User.findById(req.user._id).select('coursesAssigned');
      if (!teacher.coursesAssigned.includes(quiz.course._id)) {
        return res.status(403).json({ message: 'You are not assigned to this course' });
      }
    }
    
    // Get all attempts for this quiz
    const attempts = await QuizAttempt.find({ quiz: quizId })
      .populate('student', 'name regNo');
    
    // Calculate analytics
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(a => a.passed).length;
    const passRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;
    const averageScore = totalAttempts > 0 
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts 
      : 0;
    
    // Calculate per-question analytics
    const questionAnalytics = {};
    quiz.questions.forEach(q => {
      questionAnalytics[q._id] = {
        questionText: q.questionText,
        correctCount: 0,
        incorrectCount: 0,
        accuracy: 0
      };
    });
    
    attempts.forEach(attempt => {
      attempt.answers.forEach(answer => {
        const qId = answer.questionId.toString();
        if (questionAnalytics[qId]) {
          if (answer.isCorrect) {
            questionAnalytics[qId].correctCount++;
          } else {
            questionAnalytics[qId].incorrectCount++;
          }
        }
      });
    });
    
    // Calculate accuracy for each question
    Object.keys(questionAnalytics).forEach(qId => {
      const q = questionAnalytics[qId];
      const total = q.correctCount + q.incorrectCount;
      q.accuracy = total > 0 ? (q.correctCount / total) * 100 : 0;
    });
    
    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        course: quiz.course,
        video: quiz.video,
        createdBy: quiz.createdBy,
        questionCount: quiz.questions.length,
        totalPoints: quiz.totalPoints,
        passingScore: quiz.passingScore,
        createdAt: quiz.createdAt
      },
      analytics: {
        totalAttempts,
        passedAttempts,
        failedAttempts: totalAttempts - passedAttempts,
        passRate,
        averageScore,
        questionAnalytics: Object.values(questionAnalytics)
      },
      attempts: attempts.map(a => ({
        _id: a._id,
        student: a.student,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        timeSpent: a.timeSpent,
        completedAt: a.completedAt
      }))
    });
  } catch (error) {
    console.error('Error getting quiz analytics:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all quiz pools for teacher
exports.getTeacherQuizPools = async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access quiz pools' });
    }
    
    // Get all quiz pools for courses assigned to this teacher
    const teacher = await User.findById(req.user._id).select('coursesAssigned');
    
    const quizPools = await QuizPool.find({
      course: { $in: teacher.coursesAssigned },
      isActive: true
    })
    .populate('course', 'title courseCode')
    .populate('unit', 'title')
    .populate('contributors', 'name');
    
    // Get statistics for each quiz pool
    const poolsWithStats = await Promise.all(quizPools.map(async (pool) => {
      // Count quizzes contributed by this teacher
      const teacherQuizzes = await Quiz.countDocuments({
        _id: { $in: pool.quizzes },
        createdBy: req.user._id
      });
      
      // Count total questions in the pool
      let totalQuestions = 0;
      const quizzes = await Quiz.find({ _id: { $in: pool.quizzes } });
      quizzes.forEach(quiz => {
        totalQuestions += quiz.questions.length;
      });
      
      // Count student attempts
      const attempts = await QuizAttempt.countDocuments({ quizPool: pool._id });
      const passedAttempts = await QuizAttempt.countDocuments({ 
        quizPool: pool._id,
        passed: true
      });
      
      return {
        _id: pool._id,
        title: pool.title,
        course: pool.course,
        unit: pool.unit,
        quizzesCount: pool.quizzes.length,
        teacherContributions: teacherQuizzes,
        totalQuestions,
        attempts,
        passedAttempts,
        contributors: pool.contributors
      };
    }));
    
    res.json(poolsWithStats);
  } catch (error) {
    console.error('Error getting teacher quiz pools:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get student quiz results
exports.getStudentQuizResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Ensure the user has permission to view these results
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (req.user.role === 'teacher') {
      // Teachers can only view results for students in their sections
      const hasAccess = await teacherHasAccessToStudent(req.user._id, studentId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'You can only view results for students in your sections' });
      }
    }
    
    // Get all quiz attempts for this student
    const attempts = await QuizAttempt.find({ student: studentId })
      .populate({
        path: 'quiz',
        select: 'title'
      })
      .populate({
        path: 'quizPool',
        select: 'title'
      })
      .populate('course', 'title courseCode')
      .populate('unit', 'title')
      .sort({ completedAt: -1 });
    
    // Calculate overall statistics
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(a => a.passed).length;
    const averageScore = totalAttempts > 0 
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts 
      : 0;
    
    res.json({
      statistics: {
        totalAttempts,
        passedAttempts,
        failedAttempts: totalAttempts - passedAttempts,
        passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
        averageScore
      },
      attempts: attempts.map(a => ({
        _id: a._id,
        quiz: a.quiz,
        quizPool: a.quizPool,
        course: a.course,
        unit: a.unit,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        completedAt: a.completedAt
      }))
    });
  } catch (error) {
    console.error('Error getting student quiz results:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get teacher's uploaded questions
exports.getTeacherUploadedQuestions = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { courseId } = req.params;

    // Find all quizzes created by this teacher for this course
    const quizzes = await Quiz.find({
      createdBy: teacherId,
      course: courseId
    })
      .populate('unit', 'title')
      .populate('course', 'title courseCode')
      .sort({ createdAt: -1 });

    // Extract all questions with metadata
    const uploadedQuestions = [];
    
    quizzes.forEach(quiz => {
      if (quiz.questions && quiz.questions.length > 0) {
        quiz.questions.forEach(question => {
          uploadedQuestions.push({
            questionText: question.questionText,
            questionType: 'MCQ', // Default type
            options: question.options,
            correctOption: question.correctOption,
            points: question.points,
            unitTitle: quiz.unit?.title || 'N/A',
            courseTitle: quiz.course?.title || 'N/A',
            quizTitle: quiz.title,
            status: quiz.isActive ? 'Added to Pool' : 'Inactive',
            createdAt: quiz.createdAt,
            quizId: quiz._id
          });
        });
      }
    });

    res.json(uploadedQuestions);
  } catch (error) {
    console.error('Error getting teacher uploaded questions:', error);
    res.status(500).json({ message: error.message });
  }
};
