const TeacherRequest = require('../models/TeacherRequest');
const User = require('../models/User');

// Teacher creates a request to super admin
exports.createRequest = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create requests' });
    }
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }
    const request = await TeacherRequest.create({
      teacher: req.user._id,
      message
    });
    res.status(201).json({ message: 'Request sent to super admin', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Super admin views all requests
exports.getAllRequests = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only super admin can view requests' });
    }
    const requests = await TeacherRequest.find().populate('teacher', 'name email');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Super admin responds to a request
exports.respondToRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only super admin can respond' });
    }
    const { requestId } = req.params;
    const { status, response } = req.body;
    const validStatus = ['resolved', 'rejected'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const request = await TeacherRequest.findByIdAndUpdate(
      requestId,
      { status, response, resolvedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json({ message: 'Request updated', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
