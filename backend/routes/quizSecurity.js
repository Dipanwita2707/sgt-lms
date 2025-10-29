const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const QuizSecurityAudit = require('../models/QuizSecurityAudit');
const User = require('../models/User');
const Course = require('../models/Course');
const QuizAttempt = require('../models/QuizAttempt');

// Get security violations overview (admin only)
router.get('/security/violations/overview', auth, authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const { startDate, endDate, severity, course } = req.query;
    
    let filter = {};
    
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (severity) {
      filter.severity = severity;
    }
    
    if (course) {
      filter.course = course;
    }

    // For teachers, only show their courses
    if (req.user.role === 'teacher') {
      const teacherCourses = await Course.find({ teacher: req.user._id }).select('_id');
      const courseIds = teacherCourses.map(c => c._id);
      filter.course = { $in: courseIds };
    }

    const violations = await QuizSecurityAudit.find(filter)
      .populate('student', 'name email regNo')
      .populate('course', 'title courseCode')
      .populate('unit', 'title')
      .sort({ createdAt: -1 })
      .limit(100);

    // Get violation statistics
    const stats = await QuizSecurityAudit.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalViolations: { $sum: 1 },
          bySeverity: {
            $push: '$severity'
          },
          byType: {
            $push: '$violationType'
          }
        }
      }
    ]);

    // Process statistics
    let processedStats = {
      totalViolations: 0,
      bySeverity: {},
      byType: {}
    };

    if (stats.length > 0) {
      processedStats.totalViolations = stats[0].totalViolations;
      
      // Count by severity
      stats[0].bySeverity.forEach(severity => {
        processedStats.bySeverity[severity] = (processedStats.bySeverity[severity] || 0) + 1;
      });
      
      // Count by type
      stats[0].byType.forEach(type => {
        processedStats.byType[type] = (processedStats.byType[type] || 0) + 1;
      });
    }

    res.json({
      violations,
      statistics: processedStats
    });
  } catch (error) {
    console.error('Error fetching security violations:', error);
    res.status(500).json({ message: 'Failed to fetch security violations' });
  }
});

// Get student risk assessment
router.get('/security/student/:studentId/risk', auth, authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await User.findById(studentId).select('name email regNo');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const riskAssessment = await QuizSecurityAudit.calculateStudentRiskScore(studentId);
    
    // Get recent violations
    const recentViolations = await QuizSecurityAudit.find({ student: studentId })
      .populate('course', 'title courseCode')
      .populate('unit', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      student,
      riskAssessment,
      recentViolations
    });
  } catch (error) {
    console.error('Error calculating student risk:', error);
    res.status(500).json({ message: 'Failed to calculate student risk' });
  }
});

// Get quiz attempt security summary
router.get('/security/quiz-attempt/:attemptId', auth, authorizeRoles('admin', 'teacher'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('student', 'name email regNo')
      .populate('course', 'title courseCode')
      .populate('unit', 'title');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    const securitySummary = await QuizSecurityAudit.getQuizAttemptSummary(attemptId);
    
    const violations = await QuizSecurityAudit.find({ quizAttempt: attemptId })
      .sort({ createdAt: 1 });

    res.json({
      attempt: {
        _id: attempt._id,
        student: attempt.student,
        course: attempt.course,
        unit: attempt.unit,
        score: attempt.score,
        percentage: attempt.percentage,
        passed: attempt.passed,
        completedAt: attempt.completedAt,
        securityData: attempt.securityData
      },
      securitySummary,
      violations
    });
  } catch (error) {
    console.error('Error fetching quiz attempt security:', error);
    res.status(500).json({ message: 'Failed to fetch quiz attempt security data' });
  }
});

// Mark violation as resolved (admin only)
router.patch('/security/violations/:violationId/resolve', auth, authorizeRoles('admin'), async (req, res) => {
  try {
    const { violationId } = req.params;
    const { notes } = req.body;
    
    const violation = await QuizSecurityAudit.findByIdAndUpdate(
      violationId,
      {
        isResolved: true,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        notes
      },
      { new: true }
    );

    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    res.json({ message: 'Violation marked as resolved', violation });
  } catch (error) {
    console.error('Error resolving violation:', error);
    res.status(500).json({ message: 'Failed to resolve violation' });
  }
});

// Get courses with high security violations
router.get('/security/courses/high-risk', auth, authorizeRoles('admin'), async (req, res) => {
  try {
    const highRiskCourses = await QuizSecurityAudit.aggregate([
      {
        $group: {
          _id: '$course',
          violationCount: { $sum: 1 },
          highSeverityCount: {
            $sum: {
              $cond: [{ $in: ['$severity', ['HIGH', 'CRITICAL']] }, 1, 0]
            }
          },
          uniqueStudents: { $addToSet: '$student' }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $unwind: '$course'
      },
      {
        $addFields: {
          uniqueStudentCount: { $size: '$uniqueStudents' },
          riskScore: {
            $add: [
              '$violationCount',
              { $multiply: ['$highSeverityCount', 3] }
            ]
          }
        }
      },
      {
        $match: {
          riskScore: { $gte: 5 }
        }
      },
      {
        $sort: { riskScore: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json(highRiskCourses);
  } catch (error) {
    console.error('Error fetching high-risk courses:', error);
    res.status(500).json({ message: 'Failed to fetch high-risk courses' });
  }
});

module.exports = router;
