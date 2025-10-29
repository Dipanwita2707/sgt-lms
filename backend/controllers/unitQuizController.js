const Quiz = require('../models/Quiz');
const QuizPool = require('../models/QuizPool');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProgress = require('../models/StudentProgress');
const Unit = require('../models/Unit');
const Course = require('../models/Course');
const User = require('../models/User');
const QuizSecurityAudit = require('../models/QuizSecurityAudit');
const QuizConfiguration = require('../models/QuizConfiguration');

// Helper function to determine violation severity
function getSeverityLevel(violationType, tabSwitchCount = 0) {
  switch (violationType) {
    case 'TAB_SWITCH':
      return tabSwitchCount > 5 ? 'HIGH' : tabSwitchCount > 3 ? 'MEDIUM' : 'LOW';
    case 'FULLSCREEN_EXIT':
      return 'MEDIUM';
    case 'KEYBOARD_SHORTCUT':
      return 'MEDIUM';
    case 'DEVELOPER_TOOLS':
      return 'HIGH';
    case 'COPY_PASTE_ATTEMPT':
      return 'HIGH';
    case 'CONTEXT_MENU':
      return 'LOW';
    case 'RIGHT_CLICK':
      return 'LOW';
    case 'TIME_MANIPULATION':
      return 'CRITICAL';
    default:
      return 'MEDIUM';
  }
}

// Check if unit quiz is available for student
exports.checkUnitQuizAvailability = async (req, res) => {
  try {
    const { unitId } = req.params;
    const studentId = req.user._id;

    // Get unit and course info
    const unit = await Unit.findById(unitId).populate('course').populate('quizPool');
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    // Check unit deadline
    const { checkUnitDeadline } = require('../utils/deadlineUtils');
    const deadlineInfo = await checkUnitDeadline(unitId);
    if (deadlineInfo.hasDeadline && deadlineInfo.isExpired && deadlineInfo.strictDeadline) {
      return res.status(403).json({ 
        message: 'This unit quiz is no longer accessible. The unit deadline has passed.',
        deadlineInfo: {
          deadline: deadlineInfo.deadline,
          daysLeft: deadlineInfo.daysLeft,
          deadlineDescription: deadlineInfo.deadlineDescription
        }
      });
    }

    // Check student progress for this unit
    const progress = await StudentProgress.findOne({ 
      student: studentId, 
      course: unit.course._id 
    });

    if (!progress) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    const unitProgress = progress.units.find(u => u.unitId.toString() === unitId);
    if (!unitProgress) {
      return res.status(403).json({ message: 'Unit not accessible' });
    }

    // Check if all videos in unit are watched - use multiple methods for reliability
    const totalVideos = unit.videos.length;
    let allVideosWatched = false;
    
    if (totalVideos === 0) {
      allVideosWatched = true; // No videos to watch
    } else {
      // Method 1: Check via videosWatched array
      const watchedViaArray = unitProgress.videosWatched.filter(v => v.completed).length;
      
      // Method 2: Check videosCompleted counter
      const watchedViaCounter = unitProgress.videosCompleted || 0;
      
      // Method 3: Check individual video progress entries
      const videoProgressEntries = progress.videoProgress || [];
      const watchedViaEntries = unit.videos.filter(video => {
        const videoProgress = videoProgressEntries.find(vp => vp.videoId.toString() === video._id.toString());
        return videoProgress && videoProgress.completed;
      }).length;
      
      // Method 4: Check global completedVideos array for this unit's videos
      const completedVideosGlobal = progress.completedVideos || [];
      const watchedViaGlobal = unit.videos.filter(video => 
        completedVideosGlobal.includes(video._id.toString())
      ).length;
      
      // Use the highest count as the most reliable indicator
      const maxWatchedCount = Math.max(watchedViaArray, watchedViaCounter, watchedViaEntries, watchedViaGlobal);
      allVideosWatched = maxWatchedCount >= totalVideos;
      
      console.log('Quiz availability check:', {
        unitId,
        totalVideos,
        watchedViaArray,
        watchedViaCounter, 
        watchedViaEntries,
        watchedViaGlobal,
        maxWatchedCount,
        allVideosWatched
      });
    }

    // Check if quiz already completed and passed
    const quizCompleted = unitProgress.unitQuizCompleted;
    const quizPassed = unitProgress.unitQuizPassed;

    // Check if there's a quiz pool for this unit
    const hasQuiz = unit.quizPool || unit.quizzes.length > 0;

    // Count completed attempts (treat completedAt or isComplete as completion)
    const attemptsTaken = await QuizAttempt.countDocuments({
      student: studentId,
      unit: unitId,
      $or: [
        { completedAt: { $ne: null } },
        { isComplete: true }
      ]
    });

  // Fetch quiz configuration to get maxAttempts
  let configuredMaxAttempts = 3; // Default if no config found
  try {
    const student = await User.findById(studentId).select('assignedSections');
    const courseId = unit.course._id;
    const Section = require('../models/Section');
    const studentSection = await Section.findOne({
      _id: { $in: student.assignedSections },
      courses: courseId
    });
    
    if (studentSection) {
      const customConfig = await QuizConfiguration.findOne({
        course: courseId,
        section: studentSection._id,
        unit: unitId,
        isActive: true
      });
      
      if (customConfig && customConfig.maxAttempts) {
        configuredMaxAttempts = customConfig.maxAttempts;
        console.log(`Using configured maxAttempts: ${configuredMaxAttempts}`);
      }
    }
  } catch (configError) {
    console.error('Error fetching max attempts from config:', configError);
  }

  const baseAttemptLimit = configuredMaxAttempts; // Use configured value instead of hardcoded 1
  const extraAttempts = unitProgress.extraAttempts || 0;
  const attemptLimit = baseAttemptLimit + extraAttempts;
  const remainingAttempts = quizPassed ? 0 : Math.max(0, attemptLimit - attemptsTaken);
  
  // Check for security lock (tab switching, etc.)
  const securityLocked = !!(unitProgress.securityLock && unitProgress.securityLock.locked);
  
  // **NEW: Check for quiz failure lock and teacher unlocks**
  let quizFailureLocked = false;
  let quizLockInfo = null;
  let teacherUnlockAttempts = 0; // Additional attempts granted by teacher unlocks
  let existingLock = null; // Store for later use
  
  try {
    const QuizLock = require('../models/QuizLock');
    const quizId = unit.quizPool?._id || (unit.quizzes && unit.quizzes[0]?._id);
    
    if (quizId) {
      existingLock = await QuizLock.findOne({ 
        studentId, 
        quizId
      });
      
      if (existingLock) {
        // Check if currently locked
        if (existingLock.isLocked) {
          quizFailureLocked = true;
          quizLockInfo = {
            reason: existingLock.failureReason,
            lockTimestamp: existingLock.lockTimestamp,
            unlockAuthorizationLevel: existingLock.unlockAuthorizationLevel,
            teacherUnlockCount: existingLock.teacherUnlockCount,
            remainingTeacherUnlocks: existingLock.remainingTeacherUnlocks,
            requiresDeanUnlock: existingLock.requiresDeanUnlock
          };
        }
        
        // Grant additional attempts for ALL types of unlocks (teacher, HOD, dean, admin)
        teacherUnlockAttempts = (existingLock.teacherUnlockCount || 0) + 
                               (existingLock.hodUnlockCount || 0) + 
                               (existingLock.deanUnlockCount || 0) + 
                               (existingLock.adminUnlockCount || 0);
      }
    }
  } catch (lockError) {
    console.error('Error checking quiz lock:', lockError);
    // Continue without failing the availability check
  }
  
  const isLocked = securityLocked || quizFailureLocked;
  
  // Adjust attempt limit to include teacher-granted attempts
  const adjustedAttemptLimit = attemptLimit + teacherUnlockAttempts;
  const adjustedRemainingAttempts = quizPassed ? 0 : Math.max(0, adjustedAttemptLimit - attemptsTaken);
  
  const available = hasQuiz && allVideosWatched && !quizPassed && !isLocked && attemptsTaken < adjustedAttemptLimit;

    res.json({
      available,
      unitId,
      unitTitle: unit.title,
      courseTitle: unit.course.title,
      allVideosWatched,
      quizAvailable: available,
      quizCompleted,
      quizPassed,
      canTakeQuiz: hasQuiz && allVideosWatched && !quizPassed && !isLocked && attemptsTaken < adjustedAttemptLimit,
      isLocked,
      lockInfo: isLocked ? (quizLockInfo || {
        reason: unitProgress.securityLock?.reason || 'Locked due to security violations',
        lockedAt: unitProgress.securityLock?.lockedAt,
        violationCount: unitProgress.securityLock?.violationCount || 0
      }) : null,
      attemptsTaken,
      remainingAttempts: adjustedRemainingAttempts,
      attemptLimit: adjustedAttemptLimit,
      teacherUnlocks: teacherUnlockAttempts, // For debugging - includes all unlock types
      teacherUnlockCount: existingLock?.teacherUnlockCount || 0,
      hodUnlockCount: existingLock?.hodUnlockCount || 0,
      deanUnlockCount: existingLock?.deanUnlockCount || 0,
      adminUnlockCount: existingLock?.adminUnlockCount || 0,
      totalVideos,
      watchedVideos: Math.max(
        unitProgress.videosWatched.filter(v => v.completed).length,
        unitProgress.videosCompleted || 0
      ),
      message: available ? 'Quiz is available' : 
        !hasQuiz ? 'No quiz configured for this unit' :
        !allVideosWatched ? 'Complete all videos before taking the quiz' : 
        'Quiz not available'
    });
  } catch (err) {
    console.error('Error checking unit quiz availability:', err);
    res.status(500).json({ message: err.message });
  }
};

// Generate random quiz for unit
exports.generateUnitQuiz = async (req, res) => {
  try {
    const { unitId } = req.params;
    const studentId = req.user._id;

    // Get unit with quiz pool
    const unit = await Unit.findById(unitId).populate('course').populate('quizPool');
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    // Check unit deadline
    const { checkUnitDeadline } = require('../utils/deadlineUtils');
    const deadlineInfo = await checkUnitDeadline(unitId);
    if (deadlineInfo.hasDeadline && deadlineInfo.isExpired && deadlineInfo.strictDeadline) {
      return res.status(403).json({ 
        message: 'This unit quiz is no longer accessible. The unit deadline has passed.',
        deadlineInfo: {
          deadline: deadlineInfo.deadline,
          daysLeft: deadlineInfo.daysLeft,
          deadlineDescription: deadlineInfo.deadlineDescription
        }
      });
    }

    console.log('Unit structure:', {
      id: unit._id,
      title: unit.title,
      hasQuizPool: !!unit.quizPool,
      quizPoolId: unit.quizPool?._id,
      hasQuizzes: !!unit.quizzes,
      quizzesLength: unit.quizzes?.length || 0,
      videosLength: unit.videos?.length || 0
    });

    // Check if student can take quiz
    const progress = await StudentProgress.findOne({ 
      student: studentId, 
      course: unit.course._id 
    });

    const unitProgress = progress.units.find(u => u.unitId.toString() === unitId);
    if (!unitProgress) {
      return res.status(403).json({ message: 'Unit not accessible' });
    }

    // Check if all videos are watched - use multiple methods for reliability
    const totalVideos = unit.videos.length;
    let allVideosWatched = false;
    
    if (totalVideos === 0) {
      allVideosWatched = true; // No videos to watch
    } else {
      // Method 1: Check via videosWatched array
      const watchedViaArray = unitProgress.videosWatched.filter(v => v.completed).length;
      
      // Method 2: Check videosCompleted counter
      const watchedViaCounter = unitProgress.videosCompleted || 0;
      
      // Method 3: Check individual video progress entries
      const videoProgressEntries = progress.videoProgress || [];
      const watchedViaEntries = unit.videos.filter(video => {
        const videoProgress = videoProgressEntries.find(vp => vp.videoId.toString() === video._id.toString());
        return videoProgress && videoProgress.completed;
      }).length;
      
      // Use the highest count as the most reliable indicator
      const maxWatchedCount = Math.max(watchedViaArray, watchedViaCounter, watchedViaEntries);
      allVideosWatched = maxWatchedCount >= totalVideos;
      
      console.log('Quiz generation check:', {
        unitId,
        totalVideos,
        watchedViaArray,
        watchedViaCounter, 
        watchedViaEntries,
        maxWatchedCount,
        allVideosWatched
      });
    }

    if (!allVideosWatched) {
      return res.status(403).json({ message: 'Complete all videos before taking the quiz' });
    }

    // **NEW: Check if quiz is locked due to previous failure**
    try {
      const QuizLock = require('../models/QuizLock');
      
      // Check for existing quiz lock - use unit.quizPool._id or first quiz ID as quiz identifier
      const quizId = unit.quizPool?._id || (unit.quizzes && unit.quizzes[0]?._id);
      
      if (quizId) {
        const existingLock = await QuizLock.findOne({ 
          studentId, 
          quizId,
          isLocked: true 
        });
        
        if (existingLock) {
          console.log(`🔒 Quiz access blocked - student ${studentId} has locked quiz ${quizId}`);
          return res.status(403).json({ 
            message: 'Quiz is locked due to previous failure. Contact your teacher for unlock.',
            isLocked: true,
            lockInfo: {
              reason: existingLock.failureReason,
              lockTimestamp: existingLock.lockTimestamp,
              unlockAuthorizationLevel: existingLock.unlockAuthorizationLevel,
              teacherUnlockCount: existingLock.teacherUnlockCount,
              remainingTeacherUnlocks: existingLock.remainingTeacherUnlocks,
              requiresDeanUnlock: existingLock.requiresDeanUnlock
            }
          });
        }
      }
    } catch (lockError) {
      console.error('Error checking quiz lock:', lockError);
      // Continue with quiz generation if lock check fails
    }

    // Check if already passed
    if (unitProgress.unitQuizPassed) {
      return res.status(403).json({ message: 'Quiz already passed for this unit' });
    }

    // Enforce attempt limit using configured maxAttempts
    const attemptsTaken = await QuizAttempt.countDocuments({
      student: studentId,
      unit: unitId,
      $or: [
        { completedAt: { $ne: null } },
        { isComplete: true }
      ]
    });
    
    // Fetch quiz configuration to get maxAttempts
    let configuredMaxAttempts = 3; // Default if no config found
    try {
      const student = await User.findById(studentId).select('assignedSections');
      const courseId = unit.course._id;
      const Section = require('../models/Section');
      const studentSection = await Section.findOne({
        _id: { $in: student.assignedSections },
        courses: courseId
      });
      
      if (studentSection) {
        const customConfig = await QuizConfiguration.findOne({
          course: courseId,
          section: studentSection._id,
          unit: unitId,
          isActive: true
        });
        
        if (customConfig && customConfig.maxAttempts) {
          configuredMaxAttempts = customConfig.maxAttempts;
          console.log(`Using configured maxAttempts: ${configuredMaxAttempts}`);
        }
      }
    } catch (configError) {
      console.error('Error fetching max attempts from config:', configError);
    }

    const baseAttemptLimit = configuredMaxAttempts; // Use configured value
    const extraAttempts = unitProgress.extraAttempts || 0;
    let attemptLimit = baseAttemptLimit + extraAttempts;
    
    // **NEW: Add teacher unlock attempts**
    try {
      const QuizLock = require('../models/QuizLock');
      const quizId = unit.quizPool?._id || (unit.quizzes && unit.quizzes[0]?._id);
      
      if (quizId) {
        const existingLock = await QuizLock.findOne({ 
          studentId, 
          quizId
        });
        
        if (existingLock) {
          // Grant additional attempts for ALL types of unlocks (1 attempt per unlock)
          const totalUnlocks = (existingLock.teacherUnlockCount || 0) + 
                               (existingLock.hodUnlockCount || 0) + 
                               (existingLock.deanUnlockCount || 0) + 
                               (existingLock.adminUnlockCount || 0);
          
          if (totalUnlocks > 0) {
            attemptLimit += totalUnlocks;
            console.log(`🔓 Total unlocks (${totalUnlocks}) granted additional attempts. New limit: ${attemptLimit}`);
            console.log(`  - Teacher: ${existingLock.teacherUnlockCount || 0}`);
            console.log(`  - HOD: ${existingLock.hodUnlockCount || 0}`);
            console.log(`  - Dean: ${existingLock.deanUnlockCount || 0}`);
            console.log(`  - Admin: ${existingLock.adminUnlockCount || 0}`);
          }
        }
      }
    } catch (lockError) {
      console.error('Error checking teacher unlocks for attempt limit:', lockError);
    }
    
    if (attemptsTaken >= attemptLimit) {
      return res.status(403).json({ 
        message: `Attempt limit reached (${attemptLimit}). Please contact your instructor.`,
        attemptsTaken,
        attemptLimit,
        remainingAttempts: 0
      });
    }

    let selectedQuestions = [];
    let quizSource = null;
    
    // **NEW: Fetch quiz configuration for this unit/section**
    let quizConfig = {
      timeLimit: 30,
      numberOfQuestions: 10,
      shuffleQuestions: true
    };
    
    try {
      // Get student's section for this course
      const student = await User.findById(studentId).select('assignedSections');
      const courseId = unit.course._id;
      
      // Find the section where student is enrolled for this course
      const Section = require('../models/Section');
      const studentSection = await Section.findOne({
        _id: { $in: student.assignedSections },
        courses: courseId
      });
      
      if (studentSection) {
        // Try to get custom configuration
        const customConfig = await QuizConfiguration.findOne({
          course: courseId,
          section: studentSection._id,
          unit: unitId,
          isActive: true
        });
        
        if (customConfig) {
          quizConfig = {
            timeLimit: customConfig.timeLimit,
            numberOfQuestions: customConfig.numberOfQuestions,
            shuffleQuestions: customConfig.shuffleQuestions
          };
          console.log('Using custom quiz configuration:', quizConfig);
        } else {
          console.log('Using default quiz configuration:', quizConfig);
        }
      } else {
        console.log('Student section not found, using defaults');
      }
    } catch (configError) {
      console.error('Error fetching quiz configuration, using defaults:', configError);
    }

    // Check if unit has a quiz pool
    if (unit.quizPool) {
      console.log('Unit has quiz pool:', unit.quizPool._id);
      const quizPool = await QuizPool.findById(unit.quizPool._id).populate('quizzes');
      if (!quizPool) {
        console.log('Quiz pool not found');
        return res.status(400).json({ message: 'Quiz pool not found' });
      }
      
      // Collect all questions from all quizzes in the pool
      let allQuestions = [];
      if (quizPool.quizzes && quizPool.quizzes.length > 0) {
        for (const quiz of quizPool.quizzes) {
          if (quiz.questions && quiz.questions.length > 0) {
            allQuestions.push(...quiz.questions.map(q => ({
              ...q.toObject(),
              quizId: quiz._id
            })));
          }
        }
      }
      
      console.log('Total questions found in quiz pool:', allQuestions.length);
      
      if (allQuestions.length < quizConfig.numberOfQuestions) {
        console.log('Insufficient questions in quiz pool:', allQuestions.length);
        return res.status(400).json({ message: `Insufficient questions in quiz pool. Found ${allQuestions.length} questions, need at least ${quizConfig.numberOfQuestions}.` });
      }

      // Randomly select configured number of questions
      const shuffled = quizConfig.shuffleQuestions 
        ? [...allQuestions].sort(() => 0.5 - Math.random())
        : allQuestions;
      selectedQuestions = shuffled.slice(0, quizConfig.numberOfQuestions).map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        points: q.points || 1,
        quizId: q.quizId
      }));
      quizSource = { quizPool: unit.quizPool._id };
    } else if (unit.quizzes && unit.quizzes.length > 0) {
      console.log('Unit has quizzes:', unit.quizzes.length);
      // Use questions from unit quizzes
      const quiz = await Quiz.findById(unit.quizzes[0]);
      if (!quiz) {
        console.log('Quiz not found');
        return res.status(400).json({ message: 'Quiz not found' });
      }
      if (!quiz.questions || quiz.questions.length < quizConfig.numberOfQuestions) {
        console.log('Insufficient questions in quiz:', quiz.questions?.length || 0);
        return res.status(400).json({ message: 'Insufficient questions in quiz' });
      }

      const shuffled = quizConfig.shuffleQuestions
        ? [...quiz.questions].sort(() => 0.5 - Math.random())
        : quiz.questions;
      selectedQuestions = shuffled.slice(0, quizConfig.numberOfQuestions).map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        points: q.points || 1
      }));
      quizSource = { quiz: quiz._id };
    } else {
      return res.status(400).json({ message: 'No quiz available for this unit' });
    }

    // Check for existing quiz attempts for this unit
    let existingAttempt;
    if (unit.quizPool) {
      // For quiz pool, check by student, unit, and quizPool
      existingAttempt = await QuizAttempt.findOne({
        student: studentId,
        unit: unitId,
        quizPool: unit.quizPool._id,
        completedAt: { $exists: false } // Only check for incomplete attempts
      });
    } else {
      // For regular quiz, check by student and quiz
      existingAttempt = await QuizAttempt.findOne({
        student: studentId,
        quiz: unit.quizzes[0],
        completedAt: { $exists: false } // Only check for incomplete attempts
      });
    }

    // If there's an existing incomplete attempt, check if destroyIncomplete param is set
    if (existingAttempt) {
      if (req.query.destroyIncomplete === 'true') {
        // Delete the incomplete attempt and proceed to create a new one
        await existingAttempt.deleteOne();
        console.log('Destroyed existing incomplete quiz attempt:', existingAttempt._id);
      } else {
        console.log('Found existing incomplete quiz attempt:', existingAttempt._id);
        const quizForStudent = {
          attemptId: existingAttempt._id,
          unitTitle: unit.title,
          courseTitle: unit.course.title,
          timeLimit: quizConfig.timeLimit,
          questions: existingAttempt.questions.map((q, index) => ({
            questionNumber: index + 1,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            points: q.points
          }))
        };
        return res.json({ ...quizForStudent, incomplete: true });
      }
    }

    // Create quiz attempt
    const quizAttempt = new QuizAttempt({
      ...quizSource,
      student: studentId,
      course: unit.course._id,
      unit: unitId,
      questions: selectedQuestions,
      answers: [],
      score: 0,
      maxScore: selectedQuestions.reduce((sum, q) => sum + q.points, 0),
      percentage: 0,
      passed: false,
      startedAt: new Date()
    });

    console.log('Creating new quiz attempt with data:', {
      student: studentId,
      course: unit.course._id,
      unit: unitId,
      quizPool: quizSource.quizPool || null,
      quiz: quizSource.quiz || null,
      questionsCount: selectedQuestions.length
    });

    await quizAttempt.save();

    // Return quiz questions without correct answers
    const quizForStudent = {
      attemptId: quizAttempt._id,
      unitTitle: unit.title,
      courseTitle: unit.course.title,
      timeLimit: quizConfig.timeLimit,
      questions: selectedQuestions.map((q, index) => ({
        questionNumber: index + 1,
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        points: q.points
      }))
    };

    res.json(quizForStudent);
  } catch (err) {
    console.error('Error generating unit quiz:', err);
    res.status(500).json({ message: err.message });
  }
};

// Submit quiz answers
exports.submitUnitQuiz = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { 
      answers, 
      securityViolations = [], 
      tabSwitchCount = 0, 
      isAutoSubmit = false, 
      timeSpent = 0 
    } = req.body; // Array of {questionId, selectedOption} plus security data
    const studentId = req.user._id;

    console.log('Quiz submission received:', {
      attemptId,
      studentId,
      answersCount: answers?.length || 0,
      securityViolations: securityViolations.length,
      tabSwitchCount,
      isAutoSubmit,
      timeSpent
    });

    console.log('🔍 Backend securityViolations type:', typeof securityViolations);
    console.log('🔍 Backend securityViolations Array.isArray:', Array.isArray(securityViolations));
    console.log('🔍 Backend securityViolations:', securityViolations);

    // Get quiz attempt
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Not your quiz attempt' });
    }

    if (attempt.completedAt) {
      return res.status(400).json({ 
        message: 'Quiz already submitted',
        attempt: {
          score: attempt.score,
          percentage: attempt.percentage,
          passed: attempt.passed,
          completedAt: attempt.completedAt
        },
        completed: true
      });
    }

  // Log security violations if any
  if (securityViolations.length > 0 || tabSwitchCount > 0) {
      console.warn('Security violations detected:', {
        studentId,
        attemptId,
        violations: securityViolations,
        tabSwitchCount,
        isAutoSubmit
      });
      
      // You might want to store these violations in a separate collection
      // for analysis and potential disciplinary actions
    }

    // Grade the quiz
    let score = 0;
    const gradedAnswers = [];

    // If no answers provided (auto-submit due to violations), mark all as incorrect
    const answersToProcess = answers || [];

    for (const question of attempt.questions) {
      const answer = answersToProcess.find(a => a.questionId === question.questionId.toString());
      
      if (answer && answer.selectedOption !== undefined && answer.selectedOption !== null) {
        const isCorrect = question.correctOption === answer.selectedOption;
        const points = isCorrect ? question.points : 0;
        score += points;

        gradedAnswers.push({
          questionId: question.questionId,
          selectedOption: answer.selectedOption,
          isCorrect,
          points
        });
      } else {
        // No answer provided - mark as incorrect
        gradedAnswers.push({
          questionId: question.questionId,
          selectedOption: null,
          isCorrect: false,
          points: 0
        });
      }
    }

    const percentage = Math.round((score / attempt.maxScore) * 100);
    const passed = percentage >= 70;

    // Apply security penalties if violations occurred
    let finalScore = score;
    let finalPercentage = percentage;
    let securityPenalty = 0;
    
    // Filter out technical violations (browser/permission issues)
    const actualViolations = securityViolations.filter(violation => {
      // Don't penalize technical browser issues
      if (violation.includes('fullscreen-error') && violation.includes('Permissions check failed')) {
        return false;
      }
      if (violation.includes('browser compatibility')) {
        return false;
      }
      return true;
    });
    
    if (actualViolations.length > 0 || tabSwitchCount > 3) {
      // Apply penalty for actual security violations (not technical issues)
      securityPenalty = Math.min(20, actualViolations.length * 5 + (tabSwitchCount > 3 ? 10 : 0));
      finalPercentage = Math.max(0, percentage - securityPenalty);
      finalScore = Math.round((finalPercentage / 100) * attempt.maxScore);
    }

  // Update quiz attempt with security data
    attempt.answers = gradedAnswers;
    attempt.score = finalScore;
    attempt.percentage = finalPercentage;
    attempt.passed = finalPercentage >= 70;
    attempt.completedAt = new Date();
    attempt.timeSpent = timeSpent > 0 ? timeSpent : Math.round((Date.now() - attempt.startedAt) / 1000);
    
    // Store security information
    console.log('🔍 About to set securityData with violations:', JSON.stringify(securityViolations, null, 2));
    
    attempt.securityData = {
      violations: securityViolations,
      tabSwitchCount,
      isAutoSubmit,
      securityPenalty,
      originalScore: score,
      originalPercentage: percentage
    };

    console.log('🔍 After setting securityData:', JSON.stringify(attempt.securityData, null, 2));

    // Mark attempt as submitted/complete for consistency with other flows
    attempt.isSubmitted = true;
    attempt.isComplete = true;
    await attempt.save();

    // Log security violations for audit
    if (securityViolations.length > 0 || tabSwitchCount > 0) {
      console.log('Quiz completed with security concerns:', {
        studentId,
        attemptId,
        originalScore: score,
        finalScore,
        securityPenalty,
        violations: securityViolations.length,
        tabSwitches: tabSwitchCount,
        autoSubmitted: isAutoSubmit
      });

      // Create security audit records
      try {
        for (const violation of securityViolations) {
          await QuizSecurityAudit.create({
            student: studentId,
            course: attempt.course,
            unit: attempt.unit,
            quizAttempt: attempt._id,
            violationType: violation.type || 'SUSPICIOUS_ACTIVITY',
            severity: getSeverityLevel(violation.type, tabSwitchCount),
            description: violation.message || 'Security violation detected',
            details: {
              timestamp: violation.timestamp || new Date(),
              userAgent: req.headers['user-agent'],
              ipAddress: req.ip || req.connection.remoteAddress,
              additionalData: violation
            },
            penaltyApplied: securityPenalty,
            action: isAutoSubmit ? 'AUTO_SUBMIT' : 'PENALTY'
          });
        }

        // Log tab switching as separate violation if significant
        if (tabSwitchCount > 3) {
          await QuizSecurityAudit.create({
            student: studentId,
            course: attempt.course,
            unit: attempt.unit,
            quizAttempt: attempt._id,
            violationType: 'TAB_SWITCH',
            severity: tabSwitchCount > 5 ? 'HIGH' : 'MEDIUM',
            description: `Excessive tab switching detected: ${tabSwitchCount} times`,
            details: {
              timestamp: new Date(),
              userAgent: req.headers['user-agent'],
              ipAddress: req.ip || req.connection.remoteAddress,
              additionalData: { tabSwitchCount, maxAllowed: 3 }
            },
            penaltyApplied: securityPenalty,
            action: isAutoSubmit ? 'AUTO_SUBMIT' : 'PENALTY'
          });
        }
      } catch (auditError) {
        console.error('Failed to create security audit records:', auditError);
        // Don't fail the quiz submission due to audit logging issues
      }
    }

    // Update student progress
    const progress = await StudentProgress.findOne({ 
      student: studentId, 
      course: attempt.course 
    });

    if (progress) {
      const unitProgress = progress.units.find(u => u.unitId.toString() === attempt.unit.toString());
      if (unitProgress) {
        // Add quiz attempt to unit progress
        unitProgress.quizAttempts.push({
          quizId: attempt.quiz,
          quizPoolId: attempt.quizPool,
          attemptId: attempt._id,
          score: finalScore,
          maxScore: attempt.maxScore,
          percentage: finalPercentage,
          passed: attempt.passed,
          completedAt: attempt.completedAt
        });

        unitProgress.unitQuizCompleted = true;
        unitProgress.unitQuizPassed = attempt.passed;

        if (attempt.passed) {
          unitProgress.status = 'completed';
          unitProgress.completedAt = new Date();

          // Unlock next unit
          await unlockNextUnit(progress, attempt.course, attempt.unit);
        }

        // Detect condition for auto-submission and locking
        // Auto submit should already be reflected in isAutoSubmit; ensure lock when threshold hit
        // Criteria: explicit isAutoSubmit OR (tabSwitchCount >= 3) OR (FULLSCREEN_EXIT violations >= 3)
        const fsExitCount = (securityViolations || []).filter(v => (v.type || v.violationType) === 'FULLSCREEN_EXIT').length;
        const autoSubmitTriggered = isAutoSubmit || tabSwitchCount >= 3 || fsExitCount >= 3;
        if (autoSubmitTriggered && !(unitProgress.securityLock && unitProgress.securityLock.locked)) {
          unitProgress.securityLock = unitProgress.securityLock || {};
          unitProgress.securityLock.locked = true;
          unitProgress.securityLock.reason = tabSwitchCount >= 3
            ? 'Auto-submitted due to excessive tab changes'
            : fsExitCount >= 3
              ? 'Auto-submitted due to repeated fullscreen exit'
              : 'Auto-submitted due to security violations';
          unitProgress.securityLock.lockedAt = new Date();
          unitProgress.securityLock.violationCount = (unitProgress.securityLock.violationCount || 0) + 1;
          unitProgress.securityLock.autoSubmittedAttempt = attempt._id;
        }

        await progress.save();
      }
    }

    // **AUTOMATIC CERTIFICATE REGENERATION: Update certificate if it exists**
    try {
      const Certificate = require('../models/Certificate');
      const Section = require('../models/Section');
      
      // Find student's section for this course
      const student = await User.findById(studentId);
      const section = await Section.findOne({
        course: attempt.course,
        _id: { $in: student.assignedSections }
      });
      
      if (section) {
        // Check if certificate exists for this student/course/section
        const existingCertificate = await Certificate.findOne({
          student: studentId,
          course: attempt.course,
          section: section._id,
          status: 'active'
        });
        
        if (existingCertificate) {
          console.log(`📜 Updating certificate for student ${studentId} with new marks: ${finalPercentage}%`);
          
          // Recalculate marks based on ALL quiz attempts
          const allQuizzes = await Unit.find({ course: attempt.course }).select('quizzes quizPool');
          const totalQuizzes = allQuizzes.filter(u => u.quizzes?.length > 0 || u.quizPool).length;
          
          const passedAttempts = await QuizAttempt.find({
            student: studentId,
            course: attempt.course,
            passed: true,
            completedAt: { $exists: true }
          }).select('unit');
          
          const uniquePassedUnits = [...new Set(passedAttempts.map(a => a.unit.toString()))];
          const newMarks = totalQuizzes > 0 
            ? Math.round((uniquePassedUnits.length / totalQuizzes) * 100) 
            : 0;
          
          // Update certificate marks and regenerate verification data
          const crypto = require('crypto');
          const QRCode = require('qrcode');
          
          existingCertificate.marks = newMarks;
          
          // Regenerate verification hash with updated marks
          const hashData = [
            existingCertificate.certificateNumber,
            studentId.toString(),
            attempt.course.toString(),
            newMarks.toString(),
            existingCertificate.issueDate.toISOString()
          ].join('|');
          
          existingCertificate.verificationHash = crypto
            .createHash('sha256')
            .update(hashData)
            .digest('hex');
          
          // Regenerate verification URL
          existingCertificate.verificationUrl = `${process.env.FRONTEND_URL}/verify-certificate/${existingCertificate.verificationHash}`;
          
          // Regenerate QR code
          try {
            existingCertificate.qrCodeData = await QRCode.toDataURL(existingCertificate.verificationUrl);
          } catch (qrError) {
            console.error('QR code regeneration error:', qrError);
          }
          
          await existingCertificate.save();
          console.log(`✅ Certificate updated successfully with ${newMarks}% marks`);
        }
      }
    } catch (certError) {
      console.error('Error updating certificate:', certError);
      // Don't fail the quiz submission due to certificate update errors
    }

    // **NEW: Check and lock quiz if student failed (regardless of security violations)**
    try {
      if (!attempt.passed && finalPercentage < 70) {
        console.log(`🔒 Student failed quiz (${finalPercentage}% < 70%). Checking quiz lock...`);
        
        const QuizLock = require('../models/QuizLock');
        
        // Get or create quiz lock record
        const lock = await QuizLock.getOrCreateLock(
          studentId, 
          attempt.quiz || attempt.quizPool, 
          attempt.course, 
          70 // passing score
        );
        
        // Record the attempt
        await lock.recordAttempt(finalPercentage);
        
        // Lock the quiz due to failure
        await lock.lockQuiz('BELOW_PASSING_SCORE', finalPercentage, 70);
        
        console.log(`✅ Quiz locked for student ${studentId} due to failing score: ${finalPercentage}%`);
      }
    } catch (lockError) {
      console.error('Error checking/locking quiz:', lockError);
      // Don't fail the submission due to lock errors
    }

    // Return results with security information
    res.json({
      attemptId: attempt._id,
      score: finalScore,
      maxScore: attempt.maxScore,
      percentage: finalPercentage,
      passed: attempt.passed,
      passingScore: 70,
      originalScore: score,
      originalPercentage: percentage,
      securityPenalty,
      securityViolations: securityViolations.length,
      tabSwitchCount,
      isAutoSubmit,
      message: attempt.passed 
        ? 'Congratulations! You passed the quiz.' 
        : securityPenalty > 0 
          ? `Quiz failed. Security violations detected resulting in ${securityPenalty}% penalty.`
          : 'You need 70% to pass. Please review the content and try again.',
      nextUnitUnlocked: attempt.passed,
      timeSpent: attempt.timeSpent
    });
  } catch (err) {
    console.error('Error submitting unit quiz:', err);
    res.status(500).json({ message: err.message });
  }
};

// Helper function to unlock next unit
async function unlockNextUnit(progress, courseId, currentUnitId) {
  try {
    // Get current unit to find its order
    const currentUnit = await Unit.findById(currentUnitId);
    if (!currentUnit) return;

    // Find next unit by order
    const nextUnit = await Unit.findOne({
      course: courseId,
      order: currentUnit.order + 1
    });

    if (nextUnit) {
      // Check if next unit exists in progress
      let nextUnitProgress = progress.units.find(u => u.unitId.toString() === nextUnit._id.toString());
      
      if (!nextUnitProgress) {
        // Add next unit to progress
        progress.units.push({
          unitId: nextUnit._id,
          status: 'in-progress',
          unlocked: true,
          unlockedAt: new Date(),
          videosWatched: [],
          quizAttempts: [],
          unitQuizCompleted: false,
          unitQuizPassed: false,
          allVideosWatched: false
        });
      } else {
        // Unlock existing unit
        nextUnitProgress.unlocked = true;
        nextUnitProgress.status = 'in-progress';
        nextUnitProgress.unlockedAt = new Date();
      }

      // Unlock only the first video in the next unit
      const nextUnitWithVideos = await Unit.findById(nextUnit._id).populate('videos');
      if (nextUnitWithVideos && nextUnitWithVideos.videos.length > 0) {
        // Sort videos by sequence and unlock only the first one
        const sortedVideos = nextUnitWithVideos.videos.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        const firstVideoId = sortedVideos[0]._id;
        
        if (!progress.unlockedVideos.includes(firstVideoId)) {
          progress.unlockedVideos.push(firstVideoId);
          console.log('Unlocked first video of next unit:', firstVideoId);
        }
      }
    }
  } catch (err) {
    console.error('Error unlocking next unit:', err);
  }
}

// Get quiz results
exports.getQuizResults = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;

    const attempt = await QuizAttempt.findById(attemptId)
      .populate('unit', 'title')
      .populate('course', 'title');

    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Not your quiz attempt' });
    }

    // Return detailed results
    const results = {
      attemptId: attempt._id,
      unitTitle: attempt.unit.title,
      courseTitle: attempt.course.title,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timeSpent: attempt.timeSpent,
      completedAt: attempt.completedAt,
      questions: attempt.questions.map((question, index) => {
        const answer = attempt.answers.find(a => a.questionId.toString() === question.questionId.toString());
        return {
          questionNumber: index + 1,
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          selectedOption: answer ? answer.selectedOption : null,
          isCorrect: answer ? answer.isCorrect : false,
          points: question.points,
          earnedPoints: answer ? answer.points : 0
        };
      })
    };

    res.json(results);
  } catch (err) {
    console.error('Error getting quiz results:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get quiz attempt details for student quiz page
exports.getQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;

    // Get quiz attempt
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('unit', 'title')
      .populate('course', 'title');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    // Verify this attempt belongs to the current student
    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If already completed, return error
    if (attempt.completedAt) {
      return res.status(400).json({ 
        message: 'Quiz already completed',
        completed: true,
        attempt: {
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          passed: attempt.passed
        }
      });
    }

    // **NEW: Fetch quiz configuration**
    let timeLimit = 30; // default
    try {
      const student = await User.findById(studentId).select('assignedSections');
      const Section = require('../models/Section');
      const studentSection = await Section.findOne({
        _id: { $in: student.assignedSections },
        courses: attempt.course._id
      });
      
      if (studentSection) {
        const customConfig = await QuizConfiguration.findOne({
          course: attempt.course._id,
          section: studentSection._id,
          unit: attempt.unit._id,
          isActive: true
        });
        
        if (customConfig) {
          timeLimit = customConfig.timeLimit;
        }
      }
    } catch (configError) {
      console.error('Error fetching quiz configuration:', configError);
    }

    // Return quiz data for student (without correct answers)
    const quizData = {
      attemptId: attempt._id,
      unitTitle: attempt.unit.title,
      courseTitle: attempt.course.title,
      timeLimit: timeLimit,
      questions: attempt.questions.map((q, index) => ({
        questionNumber: index + 1,
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        points: q.points
      })),
      startedAt: attempt.startedAt
    };

    res.json(quizData);
  } catch (err) {
    console.error('Error getting quiz attempt:', err);
    res.status(500).json({ message: err.message });
  }
};
