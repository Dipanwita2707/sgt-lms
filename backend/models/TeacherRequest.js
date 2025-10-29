const mongoose = require('mongoose');

const teacherRequestSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  response: { type: String }
});

module.exports = mongoose.model('TeacherRequest', teacherRequestSchema);
