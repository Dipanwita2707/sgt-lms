const Discussion = require('../models/Discussion');
const Course = require('../models/Course');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const Notification = require('../models/Notification');
const { hasRole, hasAnyRole } = require('../utils/roleUtils');
const { hasAccessToCourse, getUserAccessibleCourses } = require('../utils/courseAccess');

// Get all discussions for admin
exports.getAllDiscussions = async (req, res) => {
  try {
    // Only allow admins to access this endpoint
    if (!hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get filter parameters
    const courseId = req.query.course !== 'all' ? req.query.course : null;
    const status = req.query.status;
    const sortBy = req.query.sort || 'newest';
    
    // Build query
    const query = {};
    
    if (courseId) {
      query.course = courseId;
    }
    
    if (status === 'resolved') {
      query.isResolved = true;
    } else if (status === 'unresolved') {
      query.isResolved = false;
    }
    
    // Determine sort order
    let sortOptions = {};
    switch (sortBy) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }
    
    // Count total discussions for pagination
    const total = await Discussion.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    
    // Get discussions with pagination
    const discussions = await Discussion.find(query)
      .populate('user', 'name role')
      .populate('course', 'title courseCode')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    res.json({
      discussions,
      pagination: {
        total,
        page,
        totalPages
      }
    });
  } catch (err) {
    console.error('Error getting all discussions:', err);
    res.status(500).json({ message: 'Error fetching discussions' });
  }
};

// Get unanswered discussions for students
exports.getUnansweredDiscussions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    // Build query for unanswered discussions
    const query = {
      isResolved: false,
      $or: [
        { replies: { $size: 0 } }, // No replies
        { replies: { $not: { $elemMatch: { isAnswer: true } } } } // No answer marked
      ]
    };
    
    // Filter by user's accessible courses (through sections only)
    if (!hasRole(req.user, 'admin')) {
      const accessibleCourses = await getUserAccessibleCourses(req.user);
      query.course = { $in: accessibleCourses };
    }
    
    // Count total unanswered discussions
    const total = await Discussion.countDocuments(query);
    
    // Get unanswered discussions
    const discussions = await Discussion.find(query)
      .populate('user', 'name role')
      .populate('course', 'title courseCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      discussions,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error getting unanswered discussions:', err);
    res.status(500).json({ message: 'Error fetching unanswered discussions' });
  }
};

// Create a new discussion forum
exports.createDiscussion = async (req, res) => {
  try {
    const { courseId, title, content } = req.body;
    let imageUrl = null;

    // Handle image upload if present
    if (req.file) {
      imageUrl = `/uploads/discussions/${req.file.filename}`;
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if user has access to this course
    const user = req.user;
    let hasAccess = false;
    
    if (user.role === 'admin') {
      hasAccess = true;
    } else if (user.role === 'teacher') {
      hasAccess = course.teachers && course.teachers.some(teacherId => 
        teacherId.toString() === user._id.toString()
      );
    } else if (user.role === 'student') {
      hasAccess = user.coursesAssigned && user.coursesAssigned.some(assignedCourse => 
        assignedCourse.toString() === courseId.toString()
      );
    }
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this course' });
    }

    // Create the discussion
    const discussion = new Discussion({
      course: courseId,
      user: user._id,
      title,
      content,
      replies: [],
      isResolved: false
    });
    
    await discussion.save();
    
    // Populate user data before sending response
    const populatedDiscussion = await Discussion.findById(discussion._id)
      .populate('user', 'name role')
      .populate('course', 'title courseCode');

    // Notify course participants (students assigned to course + course teachers + admins) excluding author
    try {
      const courseParticipants = new Set();
      // Teachers
      if (course.teachers) course.teachers.forEach(t => courseParticipants.add(t.toString()));
      // Students assigned (find users whose coursesAssigned includes courseId)
      const students = await User.find({ role: 'student', coursesAssigned: courseId }, '_id');
      students.forEach(s => courseParticipants.add(s._id.toString()));
      // Admins
      const admins = await User.find({ role: 'admin' }, '_id');
      admins.forEach(a => courseParticipants.add(a._id.toString()));
      courseParticipants.delete(req.user._id.toString());
      const bulk = [];
      for (const uid of courseParticipants) {
        bulk.push({
          updateOne: {
            filter: { recipient: uid, discussion: discussion._id, type: 'discussion_new' },
            update: {
              $setOnInsert: {
                type: 'discussion_new',
                recipient: uid,
                message: `New discussion: ${title}`,
                discussion: discussion._id,
                data: { discussionId: discussion._id, courseId },
                read: false,
                createdAt: new Date()
              }
            },
            upsert: true
          }
        });
      }
      if (bulk.length) await Notification.bulkWrite(bulk);
    } catch (notifyErr) {
      console.error('Notification error (createDiscussion):', notifyErr.message);
    }
    
    res.status(201).json({
      message: 'Discussion created successfully',
      discussion: populatedDiscussion
    });
  } catch (err) {
    console.error('Error creating discussion:', err);
    res.status(500).json({ message: 'Error creating discussion' });
  }
};

// Get all discussions for a course
exports.getCourseDiscussions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if user has access to this course
    const user = req.user;
    let hasAccess = false;
    
    if (user.role === 'admin') {
      hasAccess = true;
    } else if (user.role === 'teacher') {
      hasAccess = course.teachers && course.teachers.some(teacherId => 
        teacherId.toString() === user._id.toString()
      );
    } else if (user.role === 'student') {
      hasAccess = user.coursesAssigned && user.coursesAssigned.some(assignedCourse => 
        assignedCourse.toString() === courseId.toString()
      );
    }
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this course' });
    }
    
    // Count total discussions for pagination
    const total = await Discussion.countDocuments({ course: courseId });
    const totalPages = Math.ceil(total / limit);
    
    // Get discussions with pagination
    const discussions = await Discussion.find({ course: courseId })
      .populate('user', 'name role')
      .populate('course', 'title courseCode')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      discussions,
      pagination: {
        total,
        page,
        totalPages
      }
    });
  } catch (err) {
    console.error('Error getting discussions by course:', err);
    res.status(500).json({ message: 'Error fetching discussions' });
  }
};

// Get a specific discussion with replies
exports.getDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    const discussion = await Discussion.findById(discussionId)
      .populate('user', 'name role')
      .populate('course', 'title courseCode teachers')
      .populate('replies.user', 'name role');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    
    // Check if user has access to this course
    const user = req.user;
    let hasAccess = false;
    
    if (user.role === 'admin') {
      hasAccess = true;
    } else if (user.role === 'teacher') {
      hasAccess = discussion.course.teachers && discussion.course.teachers.some(teacherId => 
        teacherId.toString() === user._id.toString()
      );
    } else if (user.role === 'student') {
      hasAccess = user.coursesAssigned && user.coursesAssigned.some(assignedCourse => 
        assignedCourse.toString() === discussion.course._id.toString()
      );
    }
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this discussion' });
    }
    
    res.json(discussion);
  } catch (err) {
    console.error('Error getting discussion:', err);
    res.status(500).json({ message: 'Error fetching discussion' });
  }
};

// Add a reply to a discussion
exports.addReply = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { content, isAnswer } = req.body;
    let imageUrl = null;

    // Handle image upload if present
    if (req.file) {
      imageUrl = `/uploads/discussions/${req.file.filename}`;
    }

    const discussion = await Discussion.findById(discussionId)
      .populate('course', 'title courseCode teachers');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    
    // Check if user has access to this course
    const user = req.user;
    let hasAccess = false;
    
    if (user.role === 'admin') {
      hasAccess = true;
    } else if (user.role === 'teacher') {
      hasAccess = discussion.course.teachers && discussion.course.teachers.some(teacherId => 
        teacherId.toString() === user._id.toString()
      );
    } else if (user.role === 'student') {
      hasAccess = user.coursesAssigned && user.coursesAssigned.some(assignedCourse => 
        assignedCourse.toString() === discussion.course._id.toString()
      );
    }
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this discussion' });
    }
    
    // If it's marked as an answer, ensure the user is a teacher or admin
    const canMarkAsAnswer = user.role === 'admin' || user.role === 'teacher';
    const isReplyAnswer = isAnswer && canMarkAsAnswer;
    
    // Add the reply
    const reply = {
      user: user._id,
      content,
      imageUrl,
      timestamp: new Date(),
      isAnswer: isReplyAnswer
    };
    
    discussion.replies.push(reply);
    
    // If teacher or admin marked as answer, also mark discussion as resolved
    if (isReplyAnswer) {
      discussion.isResolved = true;
    }
    
    // Update the updatedAt field
    discussion.updatedAt = new Date();
    
    await discussion.save();
    
    // Get the updated discussion with populated data
    const updatedDiscussion = await Discussion.findById(discussionId)
      .populate('user', 'name role')
      .populate('course', 'title courseCode')
      .populate('replies.user', 'name role');
    
    // Get the newly added reply
    const newReply = updatedDiscussion.replies[updatedDiscussion.replies.length - 1];

    // Notify original poster (and teachers/admins) about new reply (exclude replier)
    try {
      const recipients = new Set();
      // Original poster
      recipients.add(updatedDiscussion.user._id.toString());
      // Course teachers
      if (updatedDiscussion.course && updatedDiscussion.course.teachers) {
        updatedDiscussion.course.teachers.forEach(t => recipients.add(t.toString()));
      }
      // Admins
      const admins = await User.find({ role: 'admin' }, '_id');
      admins.forEach(a => recipients.add(a._id.toString()));
      recipients.delete(req.user._id.toString());
      const bulk = [];
      for (const uid of recipients) {
        bulk.push({
          insertOne: {
            document: {
              type: 'discussion_reply',
              recipient: uid,
              message: `New reply in: ${updatedDiscussion.title || 'discussion'}`,
              discussion: updatedDiscussion._id,
              replyId: newReply._id,
              data: { discussionId: updatedDiscussion._id, replyId: newReply._id, courseId: updatedDiscussion.course?._id },
              read: false,
              createdAt: new Date()
            }
          }
        });
      }
      if (bulk.length) await Notification.bulkWrite(bulk);
    } catch (notifyErr) {
      console.error('Notification error (addReply):', notifyErr.message);
    }
    
    res.status(201).json({
      message: 'Reply added successfully',
      reply: newReply,
      isResolved: updatedDiscussion.isResolved
    });
  } catch (err) {
    console.error('Error adding reply:', err);
    res.status(500).json({ message: 'Error adding reply' });
  }
};

// Mark a discussion as resolved or unresolved
exports.toggleResolved = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { isResolved } = req.body;

    const discussion = await Discussion.findById(discussionId)
      .populate('course', 'title courseCode teachers');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    
    // Check if user has permission to mark as resolved (only teacher of the course or admin)
    const user = req.user;
    let hasPermission = false;
    
    if (user.role === 'admin') {
      hasPermission = true;
    } else if (user.role === 'teacher') {
      hasPermission = discussion.course.teachers && discussion.course.teachers.some(teacherId => 
        teacherId.toString() === user._id.toString()
      );
    } else if (user.role === 'student') {
      // If the student is the original poster, they can mark their own questions as resolved
      hasPermission = discussion.user.toString() === user._id.toString();
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to change the resolved status' });
    }
    
    // Update resolved status
    discussion.isResolved = isResolved;
    discussion.updatedAt = new Date();
    
    await discussion.save();
    
    res.status(200).json({
      message: `Discussion marked as ${isResolved ? 'resolved' : 'unresolved'}`,
      discussion: {
        _id: discussion._id,
        isResolved: discussion.isResolved
      }
    });
  } catch (err) {
    console.error('Error toggling resolved status:', err);
    res.status(500).json({ message: 'Error updating discussion status' });
  }
};

// Toggle pin status of a discussion (admin only)
exports.togglePin = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { isPinned } = req.body;

    // Only allow admins and teachers to pin discussions
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'You do not have permission to pin/unpin discussions' });
    }
    
    const discussion = await Discussion.findById(discussionId)
      .populate('course', 'title courseCode teachers');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    
    // If teacher, verify they teach this course
    if (req.user.role === 'teacher') {
      const isTeachingCourse = discussion.course.teachers && discussion.course.teachers.some(teacherId => 
        teacherId.toString() === req.user._id.toString()
      );
      
      if (!isTeachingCourse) {
        return res.status(403).json({ message: 'You are not a teacher for this course' });
      }
    }
    
    // Update pin status
    discussion.isPinned = isPinned;
    discussion.updatedAt = new Date();
    
    await discussion.save();
    
    res.status(200).json({
      message: `Discussion ${isPinned ? 'pinned' : 'unpinned'} successfully`,
      discussion: {
        _id: discussion._id,
        isPinned: discussion.isPinned
      }
    });
  } catch (err) {
    console.error('Error toggling pin status:', err);
    res.status(500).json({ message: 'Error updating discussion pin status' });
  }
};

// Mark reply as answer
exports.markReplyAsAnswer = async (req, res) => {
  try {
    const { discussionId, replyId } = req.params;
    const { isAnswer } = req.body;
    
    // Only allow teachers and admins to mark answers
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers and admins can mark replies as answers' });
    }
    
    const discussion = await Discussion.findById(discussionId)
      .populate('course', 'title courseCode teachers');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    
    // If teacher, verify they teach this course
    if (req.user.role === 'teacher') {
      const isTeachingCourse = discussion.course.teachers && discussion.course.teachers.some(teacherId => 
        teacherId.toString() === req.user._id.toString()
      );
      
      if (!isTeachingCourse) {
        return res.status(403).json({ message: 'You are not a teacher for this course' });
      }
    }
    
    // Find the reply
    const reply = discussion.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }
    
    // If marking as answer, first unmark any other answers
    if (isAnswer) {
      discussion.replies.forEach(r => {
        if (r._id.toString() !== replyId) {
          r.isAnswer = false;
        }
      });
    }
    
    // Update reply's answer status
    reply.isAnswer = isAnswer;
    
    // Also update resolved status based on answer status
    if (isAnswer) {
      discussion.isResolved = true;
    } else {
      // Check if any other replies are marked as answer
      const hasAnswer = discussion.replies.some(r => r.isAnswer && r._id.toString() !== replyId);
      discussion.isResolved = hasAnswer;
    }
    
    discussion.updatedAt = new Date();
    await discussion.save();
    
    res.status(200).json({
      message: `Reply ${isAnswer ? 'marked as answer' : 'unmarked as answer'} successfully`,
      isResolved: discussion.isResolved,
      reply: {
        _id: reply._id,
        isAnswer: reply.isAnswer
      }
    });
  } catch (err) {
    console.error('Error marking reply as answer:', err);
    res.status(500).json({ message: 'Error updating reply status' });
  }
};

// Delete a discussion
exports.removeDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    
    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    
    // Check permissions - only admin, original poster, or course teacher can delete
    const user = req.user;
    let hasPermission = false;
    
    if (user.role === 'admin') {
      hasPermission = true;
    } else if (user._id.toString() === discussion.user.toString()) {
      // User is the original poster
      hasPermission = true;
    } else if (user.role === 'teacher') {
      // Populate course to check if user is a teacher for this course
      await discussion.populate('course');
      hasPermission = discussion.course.teachers && 
                      discussion.course.teachers.some(teacherId => 
                        teacherId.toString() === user._id.toString()
                      );
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to delete this discussion' });
    }
    
    // If there's an image attached to the discussion, delete it
    if (discussion.imageUrl) {
      const imagePath = path.join(__dirname, '..', 'public', discussion.imageUrl);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error('Error deleting discussion image:', err);
      }
    }
    
    // Delete images from replies
    if (discussion.replies && discussion.replies.length > 0) {
      discussion.replies.forEach(reply => {
        if (reply.imageUrl) {
          const replyImagePath = path.join(__dirname, '..', 'public', reply.imageUrl);
          try {
            if (fs.existsSync(replyImagePath)) {
              fs.unlinkSync(replyImagePath);
            }
          } catch (err) {
            console.error('Error deleting reply image:', err);
          }
        }
      });
    }
    
    // Delete the discussion
    await Discussion.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Discussion deleted successfully',
      discussionId: id
    });
  } catch (err) {
    console.error('Error deleting discussion:', err);
    res.status(500).json({ message: 'Error deleting discussion' });
  }
};

// Delete a reply from a discussion
exports.deleteReply = async (req, res) => {
  try {
    const { discussionId, replyId } = req.params;
    
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }
    
    // Find the reply
    const reply = discussion.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }
    
    // Check permissions - only admin, reply author, or course teacher can delete
    const user = req.user;
    let hasPermission = false;
    
    if (user.role === 'admin') {
      hasPermission = true;
    } else if (reply.user.toString() === user._id.toString()) {
      // User is the reply author
      hasPermission = true;
    } else if (user.role === 'teacher') {
      // Populate course to check if user is a teacher for this course
      await discussion.populate('course');
      hasPermission = discussion.course.teachers && 
                      discussion.course.teachers.some(teacherId => 
                        teacherId.toString() === user._id.toString()
                      );
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to delete this reply' });
    }
    
    // If there's an image attached to the reply, delete it
    if (reply.imageUrl) {
      const imagePath = path.join(__dirname, '..', 'public', reply.imageUrl);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error('Error deleting reply image:', err);
      }
    }
    
    // Check if this reply was marked as an answer
    const wasAnswer = reply.isAnswer;
    
    // Remove the reply
    discussion.replies.pull({ _id: replyId });
    
    // If this reply was an answer, update the discussion's resolved status
    if (wasAnswer) {
      // Check if any other replies are marked as answer
      const hasAnotherAnswer = discussion.replies.some(r => r.isAnswer);
      discussion.isResolved = hasAnotherAnswer;
    }
    
    discussion.updatedAt = new Date();
    await discussion.save();
    
    res.status(200).json({
      message: 'Reply deleted successfully',
      discussionId,
      replyId,
      isResolved: discussion.isResolved
    });
  } catch (err) {
    console.error('Error deleting reply:', err);
    res.status(500).json({ message: 'Error deleting reply' });
  }
};
