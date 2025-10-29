const mongoose = require('mongoose');

// Represents a single question awaiting review/approval for inclusion in a quiz pool
// Workflow: pending -> approved | flagged -> (resolved by HOD: approved | rejected)
const questionReviewSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', index: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // reference to Quiz.questions._id
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Assigned course coordinator (optional, derived from course.coordinators)
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['pending', 'approved', 'flagged', 'rejected'], default: 'pending', index: true },
  note: { type: String }, // CC or HOD note on the review
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who approved/rejected finally
  resolvedAt: { type: Date },
  // Keep denormalized snapshot to avoid exposing uploader to CC accidentally from joined Quiz
  snapshot: {
    questionText: String,
    options: [String],
    correctOption: Number,
    points: Number
  }
}, { timestamps: true });

questionReviewSchema.index({ status: 1, course: 1, unit: 1 });

module.exports = mongoose.model('QuestionReview', questionReviewSchema);
