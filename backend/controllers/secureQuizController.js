const QuizAttempt = require('../models/QuizAttempt');
const QuizSecurityAudit = require('../models/QuizSecurityAudit');
const Quiz = require('../models/Quiz');
const QuizPool = require('../models/QuizPool');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id);
};

// Create a new quiz attempt for secure quiz
exports.createSecureQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // Validate quizId
    if (!isValidObjectId(quizId)) {
      return res.status(400).json({ message: 'Invalid quiz ID format' });
    }
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can take quizzes' });
    }
    
    // Check if it's a direct quiz or a quiz pool
    let quiz = null;
    let quizPool = null;
    let isPoolQuiz = false;
    
    // First, try to find a direct quiz
    quiz = await Quiz.findById(quizId);
    
    // If not found, try to find a quiz pool
    if (!quiz) {
      quizPool = await QuizPool.findById(quizId);
      if (!quizPool) {
        return res.status(404).json({ message: 'Quiz not found' });
      }
      isPoolQuiz = true;
    }
    
    // Get the course ID
    const courseId = isPoolQuiz ? quizPool.course : quiz.course;
    const unitId = isPoolQuiz ? quizPool.unit : quiz.unit;
    
    // Check if student is assigned to the course
    const student = await User.findById(req.user._id).select('coursesAssigned');
    if (!student.coursesAssigned.includes(courseId.toString())) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }
    
    // Handle pool quiz
    if (isPoolQuiz) {
      // Check if student has already attempted and passed this quiz pool
      const existingPassedAttempt = await QuizAttempt.findOne({
        quizPool: quizPool._id,
        student: req.user._id,
        passed: true
      });
      
      if (existingPassedAttempt) {
        return res.status(400).json({
          message: 'You have already passed this quiz',
          attemptId: existingPassedAttempt._id
        });
      }
      
      // Check for recent failed attempts (8-hour cooldown)
      const lastFailedAttempt = await QuizAttempt.findOne({
        quizPool: quizPool._id,
        student: req.user._id,
        passed: false,
        isComplete: true
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
      const poolQuizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } });
      
      if (poolQuizzes.length === 0) {
        return res.status(404).json({ message: 'No questions available in the quiz pool' });
      }
      
      // Collect all questions from all quizzes
      const allQuestions = [];
      poolQuizzes.forEach(poolQuiz => {
        poolQuiz.questions.forEach(question => {
          allQuestions.push({
            _id: question._id,
            questionText: question.questionText,
            options: question.options,
            correctOption: question.correctOption,
            points: question.points,
            originalQuizId: poolQuiz._id
          });
        });
      });
      
      // Shuffle and select questionsPerAttempt questions (default 10)
      const questionsToSelect = Math.min(quizPool.questionsPerAttempt, allQuestions.length);
      const selectedQuestions = shuffleArray([...allQuestions]).slice(0, questionsToSelect);
      
      // Create a new quiz attempt
      const attempt = new QuizAttempt({
        quizPool: quizPool._id,
        student: req.user._id,
        course: courseId,
        unit: unitId,
        questions: selectedQuestions,
        secureMode: true,
        startedAt: new Date(),
        securitySettings: {
          fullscreenRequired: true,
          tabSwitchesAllowed: 3,
          tabSwitchDuration: 15, // seconds
          autoSubmitOnViolation: true,
          securityChecks: ['fullscreen', 'tabSwitch', 'keyboardShortcuts']
        }
      });
      
      await attempt.save();
      
      // Log the action
      await AuditLog.create({
        action: 'create_secure_quiz_attempt',
        performedBy: req.user._id,
        details: { 
          quizPoolId: quizPool._id,
          attemptId: attempt._id,
          questionCount: selectedQuestions.length
        }
      });
      
      // Return the attempt ID to the client
      return res.status(201).json({
        message: 'Secure quiz attempt created successfully',
        attemptId: attempt._id,
        unitTitle: quizPool.unit ? (await getUnitTitle(unitId)) : null,
        courseTitle: await getCourseTitle(courseId),
        questionCount: selectedQuestions.length,
        timeLimit: quizPool.timeLimit || 30
      });
    } 
    // Handle direct quiz
    else {
      // Check if student has already attempted and passed this quiz
      const existingPassedAttempt = await QuizAttempt.findOne({
        quiz: quiz._id,
        student: req.user._id,
        passed: true
      });
      
      if (existingPassedAttempt) {
        return res.status(400).json({
          message: 'You have already passed this quiz',
          attemptId: existingPassedAttempt._id
        });
      }
      
      // Create a new quiz attempt
      const attempt = new QuizAttempt({
        quiz: quiz._id,
        student: req.user._id,
        course: courseId,
        unit: unitId,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          correctOption: q.correctOption,
          points: q.points
        })),
        secureMode: true,
        startedAt: new Date(),
        securitySettings: {
          fullscreenRequired: true,
          tabSwitchesAllowed: 3,
          tabSwitchDuration: 15, // seconds
          autoSubmitOnViolation: true,
          securityChecks: ['fullscreen', 'tabSwitch', 'keyboardShortcuts']
        }
      });
      
      await attempt.save();
      
      // Log the action
      await AuditLog.create({
        action: 'create_secure_quiz_attempt',
        performedBy: req.user._id,
        details: { 
          quizId: quiz._id,
          attemptId: attempt._id,
          questionCount: quiz.questions.length
        }
      });
      
      // Return the attempt ID to the client
      return res.status(201).json({
        message: 'Secure quiz attempt created successfully',
        attemptId: attempt._id,
        unitTitle: quiz.unit ? (await getUnitTitle(unitId)) : null,
        courseTitle: await getCourseTitle(courseId),
        questionCount: quiz.questions.length,
        timeLimit: quiz.timeLimit || 30
      });
    }
  } catch (error) {
    console.error('Error creating secure quiz attempt:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quiz attempt details for secure quiz
exports.getSecureQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    // Validate attemptId
    if (!isValidObjectId(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID format' });
    }
    
    // Get the attempt
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }
    
    // Check if user is the student who created the attempt
    if (req.user.role === 'student' && attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // If user is teacher, check if they are assigned to the course
    if (req.user.role === 'teacher') {
      const teacher = await User.findById(req.user._id).select('coursesAssigned');
      if (!teacher.coursesAssigned.includes(attempt.course.toString())) {
        return res.status(403).json({ message: 'You are not assigned to this course' });
      }
    }
    
    // Get additional info
    let quizTitle = '';
    let courseTitle = '';
    let unitTitle = '';
    
    if (attempt.quiz) {
      const quiz = await Quiz.findById(attempt.quiz).select('title');
      quizTitle = quiz ? quiz.title : 'Quiz';
    } else if (attempt.quizPool) {
      const quizPool = await QuizPool.findById(attempt.quizPool).select('title');
      quizTitle = quizPool ? quizPool.title : 'Quiz Pool';
    }
    
    if (attempt.course) {
      const course = await getCourseTitle(attempt.course);
      courseTitle = course;
    }
    
    if (attempt.unit) {
      const unit = await getUnitTitle(attempt.unit);
      unitTitle = unit;
    }
    
  // Compute time limit and remaining time
  const timeLimitMinutes = attempt.quiz ? 
    (await Quiz.findById(attempt.quiz).select('timeLimit')).timeLimit : 
    (await QuizPool.findById(attempt.quizPool).select('timeLimit')).timeLimit;
  const startedAt = attempt.startedAt || new Date();
  const endsAt = new Date(new Date(startedAt).getTime() + (timeLimitMinutes || 30) * 60 * 1000);
  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.ceil((endsAt.getTime() - now) / 1000));

  // Prepare quiz for student (remove correct answers)
  const quizForStudent = {
      _id: attempt._id,
      title: quizTitle,
      unitTitle,
      courseTitle,
    timeLimit: timeLimitMinutes,
    startedAt,
    endsAt,
    remainingSeconds,
      questionsCount: attempt.questions.length,
      questions: attempt.questions.map(q => ({
        _id: q._id,
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        points: q.points
      })),
      courseId: attempt.course,
      unitId: attempt.unit,
      securitySettings: attempt.securitySettings
    };
    
    res.json(quizForStudent);
  } catch (error) {
    console.error('Error getting secure quiz attempt:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.submitSecureQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, security } = req.body;
    
    // Extract security data
    const { 
      violations = [], 
      tabSwitchCount = 0, 
      autoSubmitted = false, 
      fullscreenExits = 0, 
      blockedShortcutCount = 0,
      windowMinimizeCount = 0
    } = security || {};
    
    // Validate attemptId
    if (!isValidObjectId(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt ID format' });
    }
    
    // Get the attempt
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }
    
    // Check if user is the student who created the attempt
    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Check if attempt has already been completed
    if (attempt.isComplete) {
      return res.status(400).json({ message: 'This quiz attempt has already been submitted' });
    }
    
    // Record detailed security violations in QuizSecurityAudit
    if (violations && violations.length > 0) {
      for (const violation of violations) {
        let violationType;
        let severity = 'MEDIUM';
        
        switch (violation.type) {
          case 'tab-switch':
            violationType = 'TAB_SWITCH';
            severity = tabSwitchCount >= 3 ? 'HIGH' : 'MEDIUM';
            break;
          case 'fullscreen-exit':
            violationType = 'FULLSCREEN_EXIT';
            severity = fullscreenExits >= 2 ? 'HIGH' : 'MEDIUM';
            break;
          case 'window-minimize':
            violationType = 'WINDOW_MINIMIZE';
            severity = 'HIGH';
            break;
          case 'keyboard-shortcut':
            violationType = 'KEYBOARD_SHORTCUT';
            severity = blockedShortcutCount >= 5 ? 'HIGH' : 'LOW';
            break;
          case 'context-menu':
            violationType = 'CONTEXT_MENU';
            severity = 'LOW';
            break;
          case 'clipboard':
            violationType = 'CLIPBOARD_ACCESS';
            severity = 'MEDIUM';
            break;
          case 'devtools-open-heuristic':
            violationType = 'DEVTOOLS_DETECTED';
            severity = 'HIGH';
            break;
          case 'suspicious-timing':
            violationType = 'SUSPICIOUS_TIMING';
            severity = 'MEDIUM';
            break;
          case 'auto-submit':
            violationType = 'AUTO_SUBMIT';
            severity = 'CRITICAL';
            break;
          default:
            violationType = 'OTHER';
            severity = 'LOW';
        }
        
        await QuizSecurityAudit.create({
          student: req.user._id,
          course: attempt.course,
          unit: attempt.unit,
          quizAttempt: attempt._id,
          violationType,
          severity,
          description: violation.details?.message || violation.type || 'Security violation detected',
          details: {
            timestamp: new Date(violation.at || Date.now()),
            violationData: violation.details,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
          },
          action: autoSubmitted ? 'AUTO_SUBMIT' : 'WARNING',
          penaltyApplied: autoSubmitted ? 10 : 0
        });
      }
    }
    
    // Calculate risk-based penalty
    let securityPenalty = 0;
    if (autoSubmitted) securityPenalty += 15; // Auto-submit penalty
    if (tabSwitchCount >= 3) securityPenalty += 10; // Tab switching penalty
    if (fullscreenExits >= 2) securityPenalty += 10; // Fullscreen exit penalty
    if (blockedShortcutCount >= 5) securityPenalty += 5; // Shortcut abuse penalty
    if (windowMinimizeCount >= 1) securityPenalty += 8; // Window minimize penalty
    
    // Process answers and calculate score
    let score = 0;
    let maxScore = 0;
    const processedAnswers = [];
    
    // Calculate the max possible score
    attempt.questions.forEach(question => {
      maxScore += question.points || 1;
    });
    
    // Process each answer
    if (answers && answers.length > 0) {
      for (const answer of answers) {
        const questionId = answer.questionId;
        const selectedOption = answer.selectedOption;
        
        // Find the question in the attempt
        const question = attempt.questions.find(q => q._id.toString() === questionId);
        
        if (question) {
          const isCorrect = selectedOption === question.correctOption;
          const points = isCorrect ? (question.points || 1) : 0;
          score += points;
          
          processedAnswers.push({
            questionId,
            selectedOption,
            isCorrect,
            points
          });
        }
      }
    }
    
    // Calculate percentage and apply security penalties
    let percentage = (score / maxScore) * 100;
    percentage = Math.max(0, percentage - securityPenalty);
    
    const passingScore = attempt.quiz ?
      (await Quiz.findById(attempt.quiz).select('passingScore')).passingScore :
      (await QuizPool.findById(attempt.quizPool).select('passingScore')).passingScore;
    
    const passed = percentage >= (passingScore || 70);
    
    // Update the attempt with security data
    attempt.answers = processedAnswers;
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.isComplete = true;
    attempt.completedAt = new Date();
    attempt.autoSubmitted = autoSubmitted;
    attempt.securityViolations = violations.length;
    attempt.securityData = {
      tabSwitchCount,
      fullscreenExits,
      blockedShortcutCount,
      windowMinimizeCount,
      totalViolations: violations.length,
      securityPenalty,
      autoSubmitted
    };
    
    await attempt.save();
    
    // Log the action
    await AuditLog.create({
      action: 'submit_secure_quiz_attempt',
      performedBy: req.user._id,
      details: { 
        attemptId: attempt._id,
        score,
        percentage,
        passed,
        securityViolations: violations.length,
        autoSubmitted,
        securityPenalty
      }
    });
    
    // Return result
    res.json({
      message: passed ? 'Congratulations! You passed the quiz.' : 'Quiz submitted.',
      score,
      maxScore,
      percentage: Math.round(percentage * 10) / 10,
      passed,
      autoSubmitted,
      securityPenalty,
      violationsDetected: violations.length
    });
  } catch (error) {
    console.error('Error submitting secure quiz attempt:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get security violations for a student
exports.getStudentSecurityViolations = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Validate studentId
    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }
    
    // Check authorization
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (req.user.role === 'teacher') {
      // Check if teacher is assigned to student's courses
      const teacher = await User.findById(req.user._id).select('coursesAssigned');
      const student = await User.findById(studentId).select('coursesAssigned');
      
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      const hasSharedCourse = teacher.coursesAssigned.some(courseId => 
        student.coursesAssigned.includes(courseId.toString())
      );
      
      if (!hasSharedCourse) {
        return res.status(403).json({ message: 'You are not assigned to any of this student\'s courses' });
      }
    }
    
    // Get the risk score
    const riskScore = await QuizSecurityAudit.calculateStudentRiskScore(studentId);
    
    // Get the violations
    const violations = await QuizSecurityAudit.find({ student: studentId })
      .sort({ createdAt: -1 })
      .populate('course', 'title')
      .populate('quizAttempt', 'score percentage passed');
    
    res.json({
      riskScore,
      violations: violations.map(v => ({
        _id: v._id,
        course: v.course,
        violationType: v.violationType,
        severity: v.severity,
        description: v.description,
        timestamp: v.createdAt,
        action: v.action,
        penaltyApplied: v.penaltyApplied
      }))
    });
  } catch (error) {
    console.error('Error getting student security violations:', error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper function to get course title
async function getCourseTitle(courseId) {
  const Course = require('../models/Course');
  const course = await Course.findById(courseId).select('title');
  return course ? course.title : 'Course';
}

// Helper function to get unit title
async function getUnitTitle(unitId) {
  const Unit = require('../models/Unit');
  const unit = await Unit.findById(unitId).select('title');
  return unit ? unit.title : 'Unit';
}
