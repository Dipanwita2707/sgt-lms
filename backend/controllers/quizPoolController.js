const QuizPool = require('../models/QuizPool');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const Course = require('../models/Course');
const Video = require('../models/Video');
const Unit = require('../models/Unit');
const StudentProgress = require('../models/StudentProgress');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// Helper function to shuffle an array
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Create a new quiz pool
exports.createQuizPool = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      courseId, 
      unitId, 
      videoId, 
      afterVideoId, 
      questionsPerAttempt, 
      timeLimit, 
      passingScore, 
      unlockNextVideo 
    } = req.body;
    
    // Validate required fields
    if (!title || !courseId) {
      return res.status(400).json({ message: 'Title and course ID are required' });
    }
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if teacher is assigned to this course
    if (req.user.role === 'teacher') {
      const teacher = await User.findById(req.user._id);
      if (!teacher.coursesAssigned.includes(courseId)) {
        return res.status(403).json({ message: 'You are not assigned to this course' });
      }
    }
    
    // Create the quiz pool
    const quizPool = new QuizPool({
      title,
      description,
      course: courseId,
      unit: unitId || undefined,
      video: videoId || undefined,
      afterVideo: afterVideoId || undefined,
      questionsPerAttempt: parseInt(questionsPerAttempt) || 10,
      timeLimit: parseInt(timeLimit) || 30,
      passingScore: parseInt(passingScore) || 70,
      unlockNextVideo: unlockNextVideo !== 'false',
      createdBy: req.user._id,
      contributors: [req.user._id]
    });
    
    await quizPool.save();
    
    // If this quiz pool is after a specific video, update that video
    if (afterVideoId) {
      await Video.findByIdAndUpdate(afterVideoId, {
        $set: { hasQuizAfter: true }
      });
    }
    
    // Update unit if specified
    if (unitId) {
      await Unit.findByIdAndUpdate(unitId, {
        $set: { quizPool: quizPool._id }
      });
    }
    
    // Log the action
    await AuditLog.create({
      action: 'create_quiz_pool',
      performedBy: req.user._id,
      details: { 
        quizPoolId: quizPool._id, 
        title, 
        courseId, 
        unitId,
        videoId, 
        afterVideoId
      }
    });
    
    res.status(201).json({
      message: 'Quiz pool created successfully',
      quizPool: {
        _id: quizPool._id,
        title: quizPool.title,
        description: quizPool.description
      }
    });
    
  } catch (error) {
    console.error('Error creating quiz pool:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add a quiz to a pool
exports.addQuizToPool = async (req, res) => {
  try {
    const { quizPoolId } = req.params;
    const { quizId } = req.body;
    
    // Validate input
    if (!quizId) {
      return res.status(400).json({ message: 'Quiz ID is required' });
    }
    
    // Check if quiz pool exists
    const quizPool = await QuizPool.findById(quizPoolId);
    if (!quizPool) {
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    // Check if quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // Check if teacher is authorized
    if (req.user.role === 'teacher') {
      const teacher = await User.findById(req.user._id);
      if (!teacher.coursesAssigned.includes(quizPool.course.toString())) {
        return res.status(403).json({ message: 'You are not assigned to this course' });
      }
    }
    
    // Check if quiz is already in the pool
    if (quizPool.quizzes.includes(quizId)) {
      return res.status(400).json({ message: 'Quiz is already in this pool' });
    }
    
    // Add quiz to pool
    quizPool.quizzes.push(quizId);
    
    // Add teacher to contributors if not already there
    if (!quizPool.contributors.includes(req.user._id)) {
      quizPool.contributors.push(req.user._id);
    }
    
    await quizPool.save();
    
    // Log the action
    await AuditLog.create({
      action: 'add_quiz_to_pool',
      performedBy: req.user._id,
      details: { 
        quizPoolId, 
        quizId,
        quizTitle: quiz.title
      }
    });
    
    res.json({
      message: 'Quiz added to pool successfully',
      quizPool: {
        _id: quizPool._id,
        title: quizPool.title,
        quizzesCount: quizPool.quizzes.length
      }
    });
    
  } catch (error) {
    console.error('Error adding quiz to pool:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove a quiz from a pool
exports.removeQuizFromPool = async (req, res) => {
  try {
    const { quizPoolId, quizId } = req.params;
    
    // Check if quiz pool exists
    const quizPool = await QuizPool.findById(quizPoolId);
    if (!quizPool) {
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    // Check if teacher is authorized
    if (req.user.role === 'teacher') {
      // Only the creator or a teacher who added the quiz can remove it
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }
      
      if (quiz.createdBy.toString() !== req.user._id.toString() && 
          quizPool.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only remove quizzes you created or if you created the pool' });
      }
    }
    
    // Check if quiz is in the pool
    if (!quizPool.quizzes.includes(quizId)) {
      return res.status(400).json({ message: 'Quiz is not in this pool' });
    }
    
    // Remove quiz from pool
    quizPool.quizzes = quizPool.quizzes.filter(id => id.toString() !== quizId);
    await quizPool.save();
    
    // Log the action
    await AuditLog.create({
      action: 'remove_quiz_from_pool',
      performedBy: req.user._id,
      details: { 
        quizPoolId, 
        quizId
      }
    });
    
    res.json({
      message: 'Quiz removed from pool successfully',
      quizPool: {
        _id: quizPool._id,
        title: quizPool.title,
        quizzesCount: quizPool.quizzes.length
      }
    });
    
  } catch (error) {
    console.error('Error removing quiz from pool:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all quiz pools for a course
exports.getCourseQuizPools = async (req, res) => {
  try {
    const { courseId } = req.params;
    // Authorize: teacher must be assigned via sections OR be a coordinator; CC must be a coordinator
    if (req.user.role === 'teacher') {
      const Section = require('../models/Section');
      const hasSection = await Section.exists({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: courseId });
      if (!hasSection) {
        const isCoordinator = await Course.exists({ _id: courseId, coordinators: { $in: [req.user._id] } });
        if (!isCoordinator) return res.status(403).json({ message: 'Not authorized to access this course' });
      }
    }

    const quizPools = await QuizPool.find({ course: courseId, isActive: true })
      .select('_id title description quizzes questionsPerAttempt createdBy contributors createdAt')
      .populate('createdBy', 'name')
      .populate('contributors', 'name')
      .populate('unit', 'title')
      .populate('video', 'title')
      .populate('afterVideo', 'title');
      
    res.json(quizPools);
  } catch (error) {
    console.error('Error getting course quiz pools:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quiz pool details
exports.getQuizPoolDetails = async (req, res) => {
  try {
    const { quizPoolId } = req.params;
    
    const quizPool = await QuizPool.findById(quizPoolId)
      .populate('quizzes', 'title description questions.length createdBy')
      .populate('createdBy', 'name')
      .populate('contributors', 'name')
      .populate('unit', 'title')
      .populate('video', 'title')
      .populate('afterVideo', 'title');
      
    if (!quizPool) {
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    // Check if user is authorized to see details
    if (req.user.role === 'teacher') {
      const Section = require('../models/Section');
      const hasSection = await Section.exists({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: quizPool.course });
      if (!hasSection) {
        const isCoordinator = await Course.exists({ _id: quizPool.course, coordinators: { $in: [req.user._id] } });
        if (!isCoordinator) {
          return res.status(403).json({ message: 'You are not assigned to this course' });
        }
      }
    }
    
    // Get the total number of questions across all quizzes
    let totalQuestions = 0;
    if (quizPool.quizzes && quizPool.quizzes.length > 0) {
      const quizIds = quizPool.quizzes.map(q => q._id);
      const quizzes = await Quiz.find({ _id: { $in: quizIds } });
      totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
    }
    
    // Get attempts count
    const attemptsCount = await QuizAttempt.countDocuments({ quizPool: quizPoolId });
    
    res.json({
      ...quizPool.toObject(),
      totalQuestions,
      attemptsCount
    });
  } catch (error) {
    console.error('Error getting quiz pool details:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quiz pool for student
exports.getQuizPoolForStudent = async (req, res) => {
  try {
    const { quizPoolId } = req.params;
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can take quizzes' });
    }
    
    // Get quiz pool details
    const quizPool = await QuizPool.findById(quizPoolId)
      .select('_id title description course unit video questionsPerAttempt timeLimit passingScore')
      .populate('video', 'title');
      
    if (!quizPool) {
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    // Check if student is assigned to the course
    const student = await User.findById(req.user._id).select('coursesAssigned');
    if (!student.coursesAssigned.includes(quizPool.course)) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }
    
    // Check if the student has already attempted this quiz pool
    const existingAttempt = await QuizAttempt.findOne({
      quizPool: quizPoolId,
      student: req.user._id
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
        alreadyAttempted: true
      });
    }
    
    // Get all quizzes in the pool
    const quizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } });
    
    // Collect all questions from all quizzes
    const allQuestions = [];
    quizzes.forEach(quiz => {
      quiz.questions.forEach(question => {
        allQuestions.push({
          _id: question._id,
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          points: question.points,
          originalQuizId: quiz._id
        });
      });
    });
    
    // Shuffle and select questionsPerAttempt questions
    const selectedQuestions = shuffleArray([...allQuestions])
      .slice(0, quizPool.questionsPerAttempt);
    
    // Prepare quiz for student (remove correct answers)
    const quizForStudent = {
      _id: quizPool._id,
      title: quizPool.title,
      description: quizPool.description,
      timeLimit: quizPool.timeLimit,
      questionsCount: selectedQuestions.length,
      questions: selectedQuestions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        points: q.points
      }))
    };
    
    res.json({
      quizPool: quizForStudent,
      alreadyAttempted: false
    });
  } catch (error) {
    console.error('Error getting quiz pool for student:', error);
    res.status(500).json({ message: error.message });
  }
};

// Submit quiz pool attempt
exports.submitQuizPoolAttempt = async (req, res) => {
  try {
    const { quizPoolId } = req.params;
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit quizzes' });
    }
    
    // Get quiz pool details
    const quizPool = await QuizPool.findById(quizPoolId);
    if (!quizPool) {
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    // Check if student is assigned to the course
    const student = await User.findById(req.user._id).select('coursesAssigned');
    if (!student.coursesAssigned.includes(quizPool.course)) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }
    
    // Check previous attempts for this quiz pool by this student
    const previousAttempts = await QuizAttempt.find({
      quizPool: quizPoolId,
      student: req.user._id
    }).sort({ completedAt: -1 });

    if (previousAttempts && previousAttempts.length > 0) {
      const lastAttempt = previousAttempts[0];
      if (lastAttempt.passed) {
        // Already passed, block further attempts
        return res.status(400).json({ message: 'You have already passed this quiz and can proceed to the next unit.' });
      } else {
        // Not passed, check 8 hour cooldown
        const now = new Date();
        const lastCompleted = new Date(lastAttempt.completedAt);
        const hoursSinceLast = (now - lastCompleted) / (1000 * 60 * 60);
        if (hoursSinceLast < 8) {
          const waitHours = Math.ceil(8 - hoursSinceLast);
          return res.status(400).json({ message: `You can reattempt this quiz after ${waitHours} hour(s).` });
        }
      }
    }
    
    // Validate answers and questions
    if (!answers || !Array.isArray(answers) || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Invalid answers or questions format' });
    }
    
    // Get all quizzes in the pool to find original questions
    const quizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } });
    
    // Create a map of all questions from all quizzes for faster lookup
    const allQuestionsMap = {};
    quizzes.forEach(quiz => {
      quiz.questions.forEach(question => {
        allQuestionsMap[question._id.toString()] = {
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          points: question.points,
          originalQuizId: quiz._id
        };
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
    
    // Create quiz attempt record (mark as submitted & complete so student results always include it)
    const attempt = new QuizAttempt({
      quizPool: quizPoolId,
      student: req.user._id,
      course: quizPool.course,
      unit: quizPool.unit,
      video: quizPool.video,
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
    
    // Update student progress in unit if applicable
    if (quizPool.unit) {
      await StudentProgress.findOneAndUpdate(
        { 
          student: req.user._id, 
          course: quizPool.course,
          'units.unitId': quizPool.unit
        },
        { 
          $push: {
            'units.$.quizAttempts': {
              quizId: quizPool._id,
              attemptId: attempt._id,
              score: percentage,
              passed,
              completedAt: new Date()
            }
          },
          $set: { lastActivity: new Date() }
        }
      );
    }
    
    // --- Unlock next video if passed ---
    if (passed && quizPool.unlockNextVideo) {
      let nextVideoToUnlock = null;
      
      // If there's a specific after video relationship
      if (quizPool.afterVideo) {
        // Find videos in the same unit or course
        const query = quizPool.unit 
          ? { unit: quizPool.unit }
          : { course: quizPool.course, unit: { $exists: false } };
        
        // Find all videos in the unit/course, sorted by sequence
        const videos = await Video.find(query).sort({ sequence: 1 });
        
        // Find the index of the "after" video
        const afterVideoIndex = videos.findIndex(v => v._id.toString() === quizPool.afterVideo.toString());
        
        // If found and there's a next video, unlock it
        if (afterVideoIndex !== -1 && afterVideoIndex + 1 < videos.length) {
          nextVideoToUnlock = videos[afterVideoIndex + 1]._id;
        }
      } 
      // Otherwise follow the regular video sequence
      else if (quizPool.video) {
        // Determine if we're working with units or just course videos
        if (quizPool.unit) {
          // Find all videos in this unit, sorted by sequence
          const unitVideos = await Video.find({ unit: quizPool.unit }).sort({ sequence: 1 });
          
          // Find the index of the current video
          const currentIndex = unitVideos.findIndex(v => v._id.toString() === quizPool.video.toString());
          
          // If found and there's a next video, unlock it
          if (currentIndex !== -1 && currentIndex + 1 < unitVideos.length) {
            nextVideoToUnlock = unitVideos[currentIndex + 1]._id;
          }
        } else {
          // Find all videos for this course, sorted by creation order
          const allVideos = await Video.find({ course: quizPool.course }).sort({ createdAt: 1 });
          
          // Find the index of the current video
          const currentIndex = allVideos.findIndex(v => v._id.toString() === quizPool.video.toString());
          
          // If found and there's a next video, unlock it
          if (currentIndex !== -1 && currentIndex + 1 < allVideos.length) {
            nextVideoToUnlock = allVideos[currentIndex + 1]._id;
          }
        }
      }
      
      // If we found a next video to unlock, add it to student progress
      if (nextVideoToUnlock) {
        // Upsert student progress to unlock the next video
        await StudentProgress.findOneAndUpdate(
          { student: req.user._id, course: quizPool.course },
          { $addToSet: { unlockedVideos: nextVideoToUnlock } },
          { upsert: true }
        );
      }
    }

    res.json({
      message: 'Quiz submitted successfully',
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

// Get quiz pool questions with answers (for teachers/cc/admin)
exports.getQuizPoolQuestions = async (req, res) => {
  try {
    const { quizPoolId } = req.params;
    console.log(`Fetching questions for quiz pool: ${quizPoolId}`);

    // Check if user is authorized (teacher, cc, or admin)
    if (!['teacher', 'admin'].includes(req.user.role)) {
      console.log('Unauthorized user role:', req.user.role);
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get quiz pool details
    const quizPool = await QuizPool.findById(quizPoolId);
    if (!quizPool) {
      console.log(`Quiz pool not found: ${quizPoolId}`);
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    console.log(`Found quiz pool: ${quizPool.title} with ${quizPool.quizzes ? quizPool.quizzes.length : 0} quizzes`);
    
    // If user is a teacher, check if they are assigned to the course via sections OR they coordinate the course
    if (req.user.role === 'teacher') {
      const Section = require('../models/Section');
      const hasSectionAccess = await Section.exists({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: quizPool.course });
      if (!hasSectionAccess) {
        const isCoordinator = await Course.exists({ _id: quizPool.course, coordinators: { $in: [req.user._id] } });
        if (!isCoordinator) {
          console.log(`Teacher ${req.user._id} not assigned to course ${quizPool.course}`);
          return res.status(403).json({ message: 'You are not assigned to this course' });
        }
      }
    }
    
    // Check if quiz pool has any quizzes
    if (!quizPool.quizzes || quizPool.quizzes.length === 0) {
      console.log('Quiz pool has no quizzes');
      return res.json([]);
    }
    
    // Get all quizzes in the pool with creator details
    const quizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } })
      .populate('createdBy', 'name email teacherId');
      
    console.log(`Found ${quizzes.length} quizzes for the pool`);
    
    // Collect all questions from all quizzes with answers
    const allQuestions = [];
    quizzes.forEach(quiz => {
      console.log(`Processing quiz: ${quiz.title} with ${quiz.questions ? quiz.questions.length : 0} questions`);
      
      if (quiz.questions && quiz.questions.length > 0) {
        quiz.questions.forEach(question => {
          allQuestions.push({
            _id: question._id,
            text: question.questionText,
            options: question.options.map((opt, idx) => ({
              text: opt,
              isCorrect: idx === question.correctOption
            })),
            explanation: question.explanation || '',
            points: question.points,
            originalQuizId: quiz._id,
            originalQuizTitle: quiz.title,
            uploader: quiz.createdBy ? {
              id: quiz.createdBy._id,
              name: quiz.createdBy.name,
              email: quiz.createdBy.email || null,
              teacherId: quiz.createdBy.teacherId || null
            } : null
          });
        });
      }
    });
    
    console.log(`Returning ${allQuestions.length} questions from quiz pool`);
    console.log('Sample question structure:', allQuestions[0]);
    res.json({ questions: allQuestions });
  } catch (error) {
    console.error('Error getting quiz pool questions:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all quiz pools for a teacher
exports.getTeacherQuizPools = async (req, res) => {
  try {
    // Get teacher ID
    const teacherId = req.user._id;
    
    // Determine courses via sections and coordination
      const Section = require('../models/Section');
      const Course = require('../models/Course');
      const teacherSections = await Section.find({
        $or: [{ teacher: teacherId }, { teachers: teacherId }]
      }).select('courses');
      const sectionCourseIds = [
        ...new Set(teacherSections.flatMap(s => (s.courses || []).map(id => id.toString())))
      ];
      const coordinatorCourseDocs = await Course.find({ coordinators: { $in: [teacherId] } }).select('_id');
      const coordinatorCourseIds = coordinatorCourseDocs.map(c => c._id.toString());
      const courseIds = [...new Set([...sectionCourseIds, ...coordinatorCourseIds])];
    
      // Get all quiz pools for these courses
      const quizPools = await QuizPool.find({ 
        course: { $in: courseIds },
        isActive: true 
      })
      .select('_id title description quizzes questionsPerAttempt course createdBy contributors createdAt')
      .populate('createdBy', 'name')
      .populate('contributors', 'name')
      .populate('course', 'title')
      .populate('unit', 'title')
      .populate('video', 'title');
      
    res.json(quizPools);
  } catch (error) {
    console.error('Error getting teacher quiz pools:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quiz pool analytics for teachers
exports.getQuizPoolAnalytics = async (req, res) => {
  try {
    const { quizPoolId } = req.params;
    
    // Check if user is authorized (teacher or admin)
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get quiz pool details
    const quizPool = await QuizPool.findById(quizPoolId)
      .populate('course', 'title')
      .populate('unit', 'title')
      .populate('createdBy', 'name')
      .populate('contributors', 'name');
      
    if (!quizPool) {
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    // If user is a teacher, check if they are assigned to the course via sections or coordinate it
    if (req.user.role === 'teacher') {
      const Section = require('../models/Section');
      const hasSection = await Section.exists({ $or: [{ teacher: req.user._id }, { teachers: req.user._id }], courses: quizPool.course });
      if (!hasSection) {
        const isCoordinator = await Course.exists({ _id: quizPool.course, coordinators: { $in: [req.user._id] } });
        if (!isCoordinator) {
          return res.status(403).json({ message: 'You are not assigned to this course' });
        }
      }
    }
    
    // Get all attempts for this quiz pool
    const attempts = await QuizAttempt.find({ quizPool: quizPoolId })
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
    
    attempts.forEach(attempt => {
      attempt.questions.forEach(question => {
        const qId = question.questionId.toString();
        
        if (!questionAnalytics[qId]) {
          questionAnalytics[qId] = {
            questionText: question.questionText,
            correctCount: 0,
            incorrectCount: 0,
            accuracy: 0,
            timesUsed: 0
          };
        }
        
        // Find corresponding answer
        const answer = attempt.answers.find(a => a.questionId.toString() === qId);
        if (answer) {
          questionAnalytics[qId].timesUsed++;
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
    
    // Get quiz contributions info
    const quizContributions = {};
    if (quizPool.quizzes && quizPool.quizzes.length > 0) {
      const quizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } })
        .populate('createdBy', 'name');
      
      quizzes.forEach(quiz => {
        const teacherId = quiz.createdBy._id.toString();
        const teacherName = quiz.createdBy.name;
        
        if (!quizContributions[teacherId]) {
          quizContributions[teacherId] = {
            teacherId,
            teacherName,
            quizCount: 0,
            questionCount: 0
          };
        }
        
        quizContributions[teacherId].quizCount++;
        quizContributions[teacherId].questionCount += quiz.questions.length;
      });
    }
    
    res.json({
      quizPool: {
        _id: quizPool._id,
        title: quizPool.title,
        description: quizPool.description,
        course: quizPool.course,
        unit: quizPool.unit,
        createdBy: quizPool.createdBy,
        contributors: quizPool.contributors,
        quizzesCount: quizPool.quizzes.length,
        questionsPerAttempt: quizPool.questionsPerAttempt,
        passingScore: quizPool.passingScore,
        createdAt: quizPool.createdAt
      },
      analytics: {
        totalAttempts,
        passedAttempts,
        failedAttempts: totalAttempts - passedAttempts,
        passRate,
        averageScore,
        questionAnalytics: Object.values(questionAnalytics),
        contributions: Object.values(quizContributions)
      },
      attempts: attempts.map(a => ({
        _id: a._id,
        student: a.student,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        timeSpent: a.timeSpent,
        questionCount: a.questions.length,
        completedAt: a.completedAt
      }))
    });
  } catch (error) {
    console.error('Error getting quiz pool analytics:', error);
    res.status(500).json({ message: error.message });
  }
};
