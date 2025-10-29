const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const QuizPool = require('../models/QuizPool');
const Unit = require('../models/Unit');
const QuestionReview = require('../models/QuestionReview');
const AuditLog = require('../models/AuditLog');

// Check if user is currently a Course Coordinator
exports.getCCStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Admin and HOD always have CC access
    if (req.user.role === 'admin' || req.user.role === 'hod') {
      return res.json({ 
        isCC: true, 
        role: req.user.role,
        message: `${req.user.role.toUpperCase()} has full CC access`
      });
    }

    // Check if user is assigned as CC to any active course
    const coordinatedCourses = await Course.find({ 
      coordinators: { $in: [userId] },
      isActive: { $ne: false }
    }).select('_id title courseCode department').populate('department', 'name');

    const isCC = coordinatedCourses.length > 0;

    res.json({ 
      isCC,
      coordinatedCourses,
      coursesCount: coordinatedCourses.length,
      message: isCC 
        ? `User is CC for ${coordinatedCourses.length} course(s)`
        : 'User is not assigned as CC to any course'
    });
  } catch (error) {
    console.error('Error checking CC status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// List courses where current user is a coordinator (for 'Course Management' section)
exports.getAssignedCourses = async (req, res) => {
  try {
    // For any role, return only courses the user coordinates unless they are admin/HOD
    const userId = req.user._id;
    let filter = { coordinators: { $in: [userId] }, isActive: { $ne: false } };
    if (req.user.role === 'admin' || req.user.role === 'hod') {
      // Admin/HOD can see all active courses (optionally only those with coordinators)
      filter = { isActive: { $ne: false } };
    }
    const courses = await Course.find(filter).select('_id title courseCode department coordinators');
    res.json(courses);
  } catch (err) {
    console.error('Error fetching CC assigned courses:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// List pending reviews for courses coordinated by current CC; mask uploader info
exports.getPendingReviews = async (req, res) => {
  try {
    // Allow teachers who are coordinators, CC role, HOD, and admin, but restrict data to coordinated courses
    const ccId = req.user._id;
    const { courseId, unitId, page = 1, limit = 25 } = req.query;
    // Get courses this CC coordinates
    const courseQuery = { coordinators: { $in: [ccId] } };
    if (courseId) courseQuery._id = courseId;
    const ccCourses = await Course.find(courseQuery).select('_id');
    const ccCourseIds = ccCourses.map(c => c._id);

    // Fetch pending reviews assigned to this CC or unassigned but within CC courses
    const reviewFilter = {
      status: 'pending',
      course: { $in: ccCourseIds }
    };
    if (unitId) reviewFilter.unit = unitId;
    const total = await QuestionReview.countDocuments(reviewFilter);
    const reviews = await QuestionReview.find(reviewFilter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('course', 'title courseCode')
      .populate('unit', 'title')
      .populate('uploader', 'name');

    const items = reviews.map(r => ({
      _id: r._id,
      course: r.course,
      unit: r.unit,
      quiz: r.quiz,
      questionId: r.questionId,
      status: r.status,
      createdAt: r.createdAt,
      uploader: r.uploader ? { name: r.uploader.name } : null,
      snapshot: r.snapshot ? {
        question: r.snapshot.question || r.snapshot.questionText,
        questionText: r.snapshot.questionText || r.snapshot.question,
        options: r.snapshot.options,
        correctOption: r.snapshot.correctOption,
        type: r.snapshot.type,
        points: r.snapshot.points
      } : undefined
    }));

    res.json({ total, page: parseInt(page), limit: parseInt(limit), items });
  } catch (err) {
    console.error('Error fetching pending reviews:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// CC approves a question: mark approved and ensure it is in the unit's quiz pool
exports.approveQuestion = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { note } = req.body || {};
    const review = await QuestionReview.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    // Authorize: user must coordinate the course of the review and be the assigned reviewer (or admin/HOD)
    const isAdminOrHod = req.user.role === 'admin' || req.user.role === 'hod';
    if (!isAdminOrHod) {
      const coordinatesCourse = await Course.exists({ _id: review.course, coordinators: { $in: [req.user._id] } });
      if (!coordinatesCourse) {
        return res.status(403).json({ message: 'Access denied: not a coordinator for this course' });
      }
      if (review.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'This review is not assigned to you' });
      }
    }
    if (review.status !== 'pending' && review.status !== 'flagged') {
      return res.status(400).json({ message: 'Review is not pending or flagged' });
    }

    // Ensure a quiz pool exists for the unit; if not, create it
    let pool = await QuizPool.findOne({ course: review.course, unit: review.unit });
    if (!pool) {
      const unit = await Unit.findById(review.unit).select('title');
      pool = new QuizPool({
        title: `${unit?.title || 'Unit'} Quiz Pool`,
        description: `Quiz pool for ${unit?.title || 'unit'}`,
        course: review.course,
        unit: review.unit,
        questionsPerAttempt: 10,
        timeLimit: 30,
        passingScore: 70,
        unlockNextVideo: true,
        createdBy: req.user._id,
        contributors: [req.user._id]
      });
      await pool.save();
    }

    // Ensure the parent quiz is in the pool
    const quizId = review.quiz;
    const poolChanged = !pool.quizzes.map(q => q.toString()).includes(quizId.toString());
    if (poolChanged) {
      pool.quizzes.push(quizId);
      await pool.save();
    }

    // Update review status
    review.status = 'approved';
    review.note = note || review.note;
    review.resolvedBy = req.user._id;
    review.resolvedAt = new Date();
    await review.save();

    // Audit
    try {
      await AuditLog.create({
        action: 'cc_approve_question',
        performedBy: req.user._id,
        details: { reviewId: review._id, quizId, poolId: pool._id }
      });
    } catch (e) {}

    res.json({ message: 'Question approved and added to quiz pool', reviewId: review._id, poolId: pool._id });
  } catch (err) {
    console.error('Error approving question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// CC flags a question: mark as flagged and leave for HOD decision
exports.flagQuestion = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { note } = req.body || {};
    const review = await QuestionReview.findById(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    const isAdminOrHod = req.user.role === 'admin' || req.user.role === 'hod';
    if (!isAdminOrHod) {
      const coordinatesCourse = await Course.exists({ _id: review.course, coordinators: { $in: [req.user._id] } });
      if (!coordinatesCourse) {
        return res.status(403).json({ message: 'Access denied: not a coordinator for this course' });
      }
      if (review.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'This review is not assigned to you' });
      }
    }
    if (review.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending reviews can be flagged' });
    }
    review.status = 'flagged';
    review.note = note || review.note;
    await review.save();

    try {
      await AuditLog.create({ action: 'cc_flag_question', performedBy: req.user._id, details: { reviewId: review._id } });
    } catch (e) {}
    res.json({ message: 'Question flagged for HOD review', reviewId: review._id });
  } catch (err) {
    console.error('Error flagging question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Alternative endpoints that work with quizId and questionId instead of reviewId
exports.approveQuestionByQuizAndQuestion = async (req, res) => {
  try {
    const { quizId, questionId, note } = req.body;
    const review = await QuestionReview.findOne({ quiz: quizId, questionId: questionId, status: 'pending' });
    if (!review) return res.status(404).json({ message: 'Pending review not found for this question' });
    
    // Check if user coordinates the course
    const coordinatesCourse = await Course.exists({ _id: review.course, coordinators: { $in: [req.user._id] } });
    if (!coordinatesCourse && req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied: not a coordinator for this course' });
    }

    // Ensure a quiz pool exists for the unit
    let pool = await QuizPool.findOne({ course: review.course, unit: review.unit });
    if (!pool) {
      const unit = await Unit.findById(review.unit).select('title');
      pool = new QuizPool({
        title: `${unit?.title || 'Unit'} Quiz Pool`,
        description: `Quiz pool for ${unit?.title || 'unit'}`,
        course: review.course,
        unit: review.unit,
        questionsPerAttempt: 10,
        timeLimit: 30,
        passingScore: 70,
        unlockNextVideo: true,
        createdBy: req.user._id,
        contributors: [req.user._id]
      });
      await pool.save();
    }

    // Ensure the quiz is in the pool
    if (!pool.quizzes.map(q => q.toString()).includes(quizId.toString())) {
      pool.quizzes.push(quizId);
      await pool.save();
    }

    // Update review status
    review.status = 'approved';
    review.note = note || review.note;
    review.resolvedBy = req.user._id;
    review.resolvedAt = new Date();
    await review.save();

    // Audit
    try {
      await AuditLog.create({
        action: 'cc_approve_question',
        performedBy: req.user._id,
        details: { reviewId: review._id, quizId, questionId, poolId: pool._id }
      });
    } catch (e) {}

    res.json({ message: 'Question approved and added to quiz pool' });
  } catch (err) {
    console.error('Error approving question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.rejectQuestionByQuizAndQuestion = async (req, res) => {
  try {
    const { quizId, questionId, note } = req.body;
    const review = await QuestionReview.findOne({ quiz: quizId, questionId: questionId, status: 'pending' });
    if (!review) return res.status(404).json({ message: 'Pending review not found for this question' });
    
    // Check if user coordinates the course
    const coordinatesCourse = await Course.exists({ _id: review.course, coordinators: { $in: [req.user._id] } });
    if (!coordinatesCourse && req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied: not a coordinator for this course' });
    }

    // Update review status
    review.status = 'rejected';
    review.note = note || review.note || 'Rejected by course coordinator';
    review.resolvedBy = req.user._id;
    review.resolvedAt = new Date();
    await review.save();

    // Audit
    try {
      await AuditLog.create({
        action: 'cc_reject_question',
        performedBy: req.user._id,
        details: { reviewId: review._id, quizId, questionId }
      });
    } catch (e) {}

    res.json({ message: 'Question rejected successfully' });
  } catch (err) {
    console.error('Error rejecting question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.flagQuestionByQuizAndQuestion = async (req, res) => {
  try {
    const { quizId, questionId, note } = req.body;
    
    // First, try to find a pending review
    let review = await QuestionReview.findOne({ quiz: quizId, questionId: questionId, status: 'pending' });
    
    if (!review) {
      // If no pending review, check if this is an approved question that needs to be flagged
      // Get the quiz and question details
      const quiz = await Quiz.findById(quizId).populate('course unit');
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
      
      const question = quiz.questions.find(q => q._id.toString() === questionId);
      if (!question) return res.status(404).json({ message: 'Question not found in quiz' });
      
      // Check if user coordinates the course
      const coordinatesCourse = await Course.exists({ _id: quiz.course, coordinators: { $in: [req.user._id] } });
      if (!coordinatesCourse && req.user.role !== 'admin' && req.user.role !== 'hod') {
        return res.status(403).json({ message: 'Access denied: not a coordinator for this course' });
      }
      
      // Create a new review record for the flagged question
      review = new QuestionReview({
        quiz: quizId,
        questionId: questionId,
        course: quiz.course,
        unit: quiz.unit,
        uploader: quiz.createdBy,
        status: 'flagged',
        note: note || 'Flagged by course coordinator for HOD review',
        assignedTo: req.user._id,
        snapshot: {
          question: question.questionText,
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          type: question.type || 'multiple-choice',
          points: question.points
        }
      });
      await review.save();
    } else {
      // Check if user coordinates the course
      const coordinatesCourse = await Course.exists({ _id: review.course, coordinators: { $in: [req.user._id] } });
      if (!coordinatesCourse && req.user.role !== 'admin' && req.user.role !== 'hod') {
        return res.status(403).json({ message: 'Access denied: not a coordinator for this course' });
      }

      // Update existing review status
      review.status = 'flagged';
      review.note = note || review.note;
      await review.save();
    }

    // Audit
    try {
      await AuditLog.create({
        action: 'cc_flag_question',
        performedBy: req.user._id,
        details: { reviewId: review._id, quizId, questionId }
      });
    } catch (e) {}

    res.json({ message: 'Question flagged for HOD review' });
  } catch (err) {
    console.error('Error flagging question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
