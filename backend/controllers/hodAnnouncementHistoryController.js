const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Section = require('../models/Section');

// Get all announcements reviewed by HOD (approved/rejected), with optional status filter and date sorting
exports.getHODAnnouncementHistory = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { status, from, to } = req.query; // status: 'approved', 'rejected', or undefined for all

    // Get HOD's department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(404).json({ message: 'HOD department not found' });
    }
    const departmentId = hod.department._id;

    // Get all sections in HOD's department
    const departmentSections = await Section.find({ department: departmentId }).select('_id');
    const sectionIds = departmentSections.map(section => section._id);

    // Build query
    const query = {
      'targetAudience.targetSections': { $in: sectionIds },
      hodReviewRequired: false, // Already reviewed
      approvedBy: hodId,
      approvalStatus: { $in: ['approved', 'rejected'] }
    };
    if (status && ['approved', 'rejected'].includes(status)) {
      query.approvalStatus = status;
    }
    if (from || to) {
      query.lastEditedAt = {};
      if (from) query.lastEditedAt.$gte = new Date(from);
      if (to) query.lastEditedAt.$lte = new Date(to);
    }

    // Find announcements
    const announcements = await Announcement.find(query)
      .populate('sender', 'name email teacherId')
      .populate('targetAudience.targetSections', 'name department')
      .sort({ lastEditedAt: -1, createdAt: -1 });

    res.json({
      announcements: announcements.map(a => ({
        id: a._id,
        title: a.title,
        message: a.message,
        status: a.approvalStatus,
        reviewedAt: a.lastEditedAt || a.updatedAt || a.createdAt,
        teacher: a.sender,
        sections: a.targetAudience.targetSections.map(s => ({
          id: s._id,
          name: s.name
        })),
        approvalNote: a.approvalNote
      }))
    });
  } catch (error) {
    console.error('Error fetching HOD announcement history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
