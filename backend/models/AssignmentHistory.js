const mongoose = require('mongoose');

const AssignmentHistorySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  condition: { type: String }, // e.g., 'grade:10', 'year:2025'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AssignmentHistory', AssignmentHistorySchema);
