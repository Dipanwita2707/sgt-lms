const mongoose = require('mongoose');

const quizSecurityAuditSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  quizAttempt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizAttempt',
    required: true
  },
  violationType: {
    type: String,
    enum: [
      'TAB_SWITCH',
      'FULLSCREEN_EXIT',
      'KEYBOARD_SHORTCUT',
      'CONTEXT_MENU',
      'COPY_PASTE_ATTEMPT',
      'DEVELOPER_TOOLS',
      'RIGHT_CLICK',
      'SUSPICIOUS_ACTIVITY',
      'TIME_MANIPULATION',
      'MULTIPLE_WINDOWS'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  description: {
    type: String,
    required: true
  },
  details: {
    timestamp: {
      type: Date,
      default: Date.now
    },
    userAgent: String,
    ipAddress: String,
    screenResolution: {
      width: Number,
      height: Number
    },
    additionalData: mongoose.Schema.Types.Mixed
  },
  penaltyApplied: {
    type: Number,
    default: 0 // Percentage penalty
  },
  action: {
    type: String,
    enum: ['WARNING', 'PENALTY', 'AUTO_SUBMIT', 'DISQUALIFICATION'],
    default: 'WARNING'
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient querying
quizSecurityAuditSchema.index({ student: 1, createdAt: -1 });
quizSecurityAuditSchema.index({ course: 1, createdAt: -1 });
quizSecurityAuditSchema.index({ quizAttempt: 1 });
quizSecurityAuditSchema.index({ violationType: 1, severity: 1 });
quizSecurityAuditSchema.index({ isResolved: 1 });

// Virtual for getting violation count per student
quizSecurityAuditSchema.virtual('studentViolationCount', {
  ref: 'QuizSecurityAudit',
  localField: 'student',
  foreignField: 'student',
  count: true
});

// Method to calculate risk score for a student
quizSecurityAuditSchema.statics.calculateStudentRiskScore = async function(studentId) {
  const violations = await this.find({ student: studentId });
  
  let riskScore = 0;
  const weights = {
    'LOW': 1,
    'MEDIUM': 3,
    'HIGH': 7,
    'CRITICAL': 15
  };
  
  violations.forEach(violation => {
    riskScore += weights[violation.severity] || 1;
  });
  
  return {
    totalViolations: violations.length,
    riskScore,
    riskLevel: riskScore >= 50 ? 'HIGH' : riskScore >= 20 ? 'MEDIUM' : 'LOW'
  };
};

// Method to get violation summary for a quiz attempt
quizSecurityAuditSchema.statics.getQuizAttemptSummary = async function(attemptId) {
  const violations = await this.find({ quizAttempt: attemptId });
  
  const summary = {
    totalViolations: violations.length,
    byType: {},
    bySeverity: {},
    totalPenalty: 0,
    highestAction: 'WARNING'
  };
  
  const actionLevels = ['WARNING', 'PENALTY', 'AUTO_SUBMIT', 'DISQUALIFICATION'];
  let highestActionIndex = 0;
  
  violations.forEach(violation => {
    // Count by type
    summary.byType[violation.violationType] = (summary.byType[violation.violationType] || 0) + 1;
    
    // Count by severity
    summary.bySeverity[violation.severity] = (summary.bySeverity[violation.severity] || 0) + 1;
    
    // Sum penalties
    summary.totalPenalty += violation.penaltyApplied || 0;
    
    // Track highest action
    const actionIndex = actionLevels.indexOf(violation.action);
    if (actionIndex > highestActionIndex) {
      highestActionIndex = actionIndex;
      summary.highestAction = violation.action;
    }
  });
  
  return summary;
};

const QuizSecurityAudit = mongoose.model('QuizSecurityAudit', quizSecurityAuditSchema);

module.exports = QuizSecurityAudit;
