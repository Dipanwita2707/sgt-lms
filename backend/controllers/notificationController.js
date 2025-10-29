const Notification = require('../models/Notification');
const User = require('../models/User');

// Fetch notifications for current user (any role)
exports.getNotifications = async (req, res) => {
  try {
    // Debug: trace incoming user
    if (!req.user) {
      console.warn('getNotifications: req.user missing');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { page = 1, limit = 50 } = req.query; // Increased default from 5 to 50
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { recipient: req.user._id };
    const [items, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(query)
    ]);
    // Debug counts
    console.log(`📬 Notifications fetched for user ${req.user?._id} (${req.user?.name}): ${items.length}/${total} total`);
    if (items.length > 0) {
      console.log(`   - Latest notification: "${items[0].message}" (${items[0].read ? 'read' : 'UNREAD'})`);
    }
    res.json({ notifications: items, total, page: parseInt(page) });
  } catch (err) {
    console.error('getNotifications error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Unread count for badge/blink
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
  console.log(`Unread count for user ${req.user?._id}: ${count}`);
    res.json({ unread: count });
  } catch (err) {
  console.error('getUnreadCount error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { read: true });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
  console.log(`Notification ${req.params.id} marked read by user ${req.user?._id}`);
    res.json({ message: 'Marked as read', id: req.params.id });
  } catch (err) {
  console.error('markAsRead error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Mark all notifications for current user as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
  console.log(`All notifications marked read for user ${req.user?._id}`);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
  console.error('markAllRead error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Create notification (utility)
exports.createNotification = async ({ type, recipient, message, data, announcement, replyId }) => {
  try {
    const notification = await Notification.create({ type, recipient, message, data, announcement, replyId });
    console.log(`✉️ Notification created: ID=${notification._id}, Recipient=${recipient}, Type=${type}, Message="${message}"`);
    return notification;
  } catch (err) {
    console.error(`❌ Failed to create notification for recipient ${recipient}:`, err.message);
    throw err;
  }
};

// Generate inactivity notifications (to be run as a scheduled job)
exports.generateInactivityAlerts = async (days = 7) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const inactiveStudents = await User.find({ role: 'student', lastActive: { $lt: cutoff } });
  const admins = await User.find({ role: 'admin' });
  for (const student of inactiveStudents) {
    for (const admin of admins) {
      await Notification.create({
        type: 'inactivity',
        recipient: admin._id,
        message: `Student ${student.name} inactive for ${days} days`,
        data: { studentId: student._id },
      });
    }
  }
};

// Call this utility in relevant places for flagged videos, new registrations, deadlines, etc.
