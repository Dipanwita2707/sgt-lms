const Discussion = require('../models/Discussion');
const Course = require('../models/Course');
const User = require('../models/User');

// Get all forums with pagination and filters for admin
exports.getAdminForums = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Extract filters
    const courseFilter = req.query.course !== 'all' ? req.query.course : null;
    const statusFilter = req.query.status !== 'all' ? req.query.status : null;
    const searchTerm = req.query.search || '';
    const sortBy = req.query.sort || 'newest';

    // Build query
    let query = {};
    
    // Add course filter if specified
    if (courseFilter) {
      query.course = courseFilter;
    }
    
    // Add status filter if specified
    if (statusFilter === 'resolved') {
      query.isResolved = true;
    } else if (statusFilter === 'open') {
      query.isResolved = false;
    }
    
    // Add search term if specified
    if (searchTerm) {
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Determine sort order
    let sortOptions = {};
    switch (sortBy) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'mostActive':
        sortOptions = { repliesCount: -1 };
        break;
      case 'leastActive':
        sortOptions = { repliesCount: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
    }

    // For testing, return mock data if database is empty
    const totalForums = await Discussion.countDocuments(query);
    
    if (totalForums === 0) {
      // Return mock data
      const mockForums = [
        {
          _id: '1',
          title: 'Help with Assignment 2',
          courseTitle: 'Introduction to Programming',
          courseCode: 'CS101',
          createdBy: {
            name: 'John Smith',
            role: 'student'
          },
          createdAt: new Date(),
          isResolved: false,
          repliesCount: 3
        },
        {
          _id: '2',
          title: 'Question about the midterm exam',
          courseTitle: 'Data Structures',
          courseCode: 'CS202',
          createdBy: {
            name: 'Emily Johnson',
            role: 'student'
          },
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          isResolved: true,
          repliesCount: 2
        }
      ];
      
      return res.json({
        forums: mockForums,
        totalPages: 1,
        currentPage: 1,
        totalForums: mockForums.length
      });
    }

    const totalPages = Math.ceil(totalForums / limit);

    // Get forums with pagination and sorting
    const forums = await Discussion.find(query)
      .populate('course', 'title courseCode')
      .populate('user as createdBy', 'name role')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Format the response
    const formattedForums = forums.map(forum => ({
      _id: forum._id,
      title: forum.title,
      courseTitle: forum.course ? forum.course.title : 'Unknown Course',
      courseCode: forum.course ? forum.course.courseCode : null,
      createdBy: forum.user ? {
        name: forum.user.name,
        role: forum.user.role
      } : null,
      createdAt: forum.createdAt || forum.timestamp,
      isResolved: forum.isResolved || false,
      repliesCount: forum.replies ? forum.replies.length : 0
    }));

    res.json({
      forums: formattedForums,
      totalPages,
      currentPage: page,
      totalForums
    });
  } catch (err) {
    console.error('Error getting admin forums:', err);
    res.status(500).json({ message: 'Error fetching forums' });
  }
};

// Get flagged forum content
exports.getFlaggedContent = async (req, res) => {
  try {
    // This is a placeholder. In a real implementation, you would have a field to track flagged content
    // For now, we'll return an empty array
    res.json([]);
  } catch (err) {
    console.error('Error getting flagged content:', err);
    res.status(500).json({ message: 'Error fetching flagged content' });
  }
};

// Get forum categories
exports.getForumCategories = async (req, res) => {
  try {
    // This is a placeholder. In a real implementation, you would have a Forum Category model
    // For now, we'll return a default set of categories
    const defaultCategories = [
      {
        _id: '1',
        name: 'General Discussion',
        description: 'General topics related to courses',
        forumsCount: 0,
        createdAt: new Date()
      },
      {
        _id: '2',
        name: 'Technical Help',
        description: 'Technical questions and troubleshooting',
        forumsCount: 0,
        createdAt: new Date()
      },
      {
        _id: '3',
        name: 'Course Materials',
        description: 'Discussions about course materials and resources',
        forumsCount: 0,
        createdAt: new Date()
      }
    ];
    
    res.json(defaultCategories);
  } catch (err) {
    console.error('Error getting forum categories:', err);
    res.status(500).json({ message: 'Error fetching forum categories' });
  }
};

// Get forum statistics
exports.getForumStatistics = async (req, res) => {
  try {
    // This is a placeholder. In a real implementation, you would calculate real statistics
    const statistics = {
      totalForums: 0,
      activeForums: 0,
      resolvedForums: 0,
      flaggedContent: 0,
      topCategories: [],
      activityTrend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [4, 6, 8, 10, 7, 5]
      }
    };
    
    // Try to get real counts if possible
    try {
      statistics.totalForums = await Discussion.countDocuments();
      statistics.resolvedForums = await Discussion.countDocuments({ isResolved: true });
      statistics.activeForums = statistics.totalForums - statistics.resolvedForums;
    } catch (countErr) {
      console.error('Error counting forums:', countErr);
    }
    
    res.json(statistics);
  } catch (err) {
    console.error('Error getting forum statistics:', err);
    res.status(500).json({ message: 'Error fetching forum statistics' });
  }
};

// Get recent forum activity for admin dashboard
exports.getRecentActivity = async (req, res) => {
  try {
    // Get the 5 most recent discussions
    const recentDiscussions = await Discussion.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name role')
      .populate('course', 'title');
      
    const formattedActivity = recentDiscussions.map(discussion => ({
      _id: discussion._id,
      type: 'new_discussion',
      title: discussion.title,
      user: discussion.user ? {
        name: discussion.user.name,
        role: discussion.user.role
      } : null,
      course: discussion.course ? {
        title: discussion.course.title
      } : null,
      timestamp: discussion.createdAt
    }));
    
    res.json(formattedActivity);
  } catch (err) {
    console.error('Error getting recent forum activity:', err);
    res.status(500).json({ message: 'Error fetching recent forum activity' });
  }
};

// Get a specific forum with its replies
exports.getForumWithReplies = async (req, res) => {
  try {
    const { forumId } = req.params;
    
    // If this is a mock ID, return mock data
    if (forumId === '1' || forumId === '2') {
      const mockForum = {
        _id: forumId,
        title: forumId === '1' ? 'Help with Assignment 2' : 'Question about the midterm exam',
        description: forumId === '1' 
          ? 'I am struggling with the second part of the assignment. Can someone help me understand how to implement the binary search algorithm?' 
          : 'When will the midterm exam cover up to? Will it include the recent topics we covered in class?',
        courseTitle: forumId === '1' ? 'Introduction to Programming' : 'Data Structures',
        createdBy: {
          name: forumId === '1' ? 'John Smith' : 'Emily Johnson',
          role: 'student'
        },
        createdAt: forumId === '1' ? new Date() : new Date(Date.now() - 86400000),
        isResolved: forumId === '2' // Only the second one is resolved
      };
      
      const mockReplies = forumId === '1' 
        ? [
            {
              _id: '101',
              content: 'Have you checked the lecture notes from week 3? There\'s a good explanation of binary search there.',
              createdBy: {
                name: 'Professor Williams',
                role: 'teacher'
              },
              createdAt: new Date(Date.now() - 3600000) // 1 hour ago
            },
            {
              _id: '102',
              content: 'I can help you with this. Let\'s meet during office hours tomorrow.',
              createdBy: {
                name: 'Teaching Assistant Brown',
                role: 'teacher'
              },
              createdAt: new Date(Date.now() - 1800000) // 30 minutes ago
            },
            {
              _id: '103',
              content: 'Thanks! I\'ll review the notes and come to office hours.',
              createdBy: {
                name: 'John Smith',
                role: 'student'
              },
              createdAt: new Date(Date.now() - 900000) // 15 minutes ago
            }
          ]
        : [
            {
              _id: '201',
              content: 'The midterm will cover all material up to and including week 6. It will not include the topic we started this week.',
              createdBy: {
                name: 'Professor Davis',
                role: 'teacher'
              },
              createdAt: new Date(Date.now() - 72000000) // 20 hours ago
            },
            {
              _id: '202',
              content: 'Thank you for the clarification!',
              createdBy: {
                name: 'Emily Johnson',
                role: 'student'
              },
              createdAt: new Date(Date.now() - 68400000) // 19 hours ago
            }
          ];
      
      return res.json({
        forum: mockForum,
        replies: mockReplies
      });
    }
    
    const discussion = await Discussion.findById(forumId)
      .populate('user', 'name role')
      .populate('replies.user', 'name role')
      .populate('course', 'title');
    
    if (!discussion) {
      return res.status(404).json({ message: 'Forum not found' });
    }

    // Format the response
    const forum = {
      _id: discussion._id,
      title: discussion.title,
      description: discussion.content,
      courseTitle: discussion.course ? discussion.course.title : 'Unknown Course',
      createdBy: discussion.user ? {
        name: discussion.user.name,
        role: discussion.user.role
      } : null,
      createdAt: discussion.timestamp || discussion.createdAt,
      isResolved: discussion.isResolved || false
    };

    // Format replies
    const replies = discussion.replies ? discussion.replies.map(reply => ({
      _id: reply._id,
      content: reply.content,
      createdBy: reply.user ? {
        name: reply.user.name,
        role: reply.user.role
      } : null,
      createdAt: reply.timestamp
    })) : [];

    res.json({
      forum,
      replies
    });
  } catch (err) {
    console.error('Error getting forum details:', err);
    res.status(500).json({ message: 'Error fetching forum details' });
  }
};

// Update forum status (resolved/unresolved)
exports.updateForumStatus = async (req, res) => {
  try {
    const { forumId } = req.params;
    const { isResolved } = req.body;
    
    const discussion = await Discussion.findById(forumId);
    if (!discussion) {
      return res.status(404).json({ message: 'Forum not found' });
    }
    
    discussion.isResolved = isResolved;
    await discussion.save();
    
    res.json({
      message: `Forum marked as ${isResolved ? 'resolved' : 'unresolved'}`,
      forum: {
        _id: discussion._id,
        isResolved: discussion.isResolved
      }
    });
  } catch (err) {
    console.error('Error updating forum status:', err);
    res.status(500).json({ message: 'Error updating forum status' });
  }
};

// Post a reply to a forum
exports.postForumReply = async (req, res) => {
  try {
    const { forumId } = req.params;
    const { content } = req.body;
    
    const discussion = await Discussion.findById(forumId);
    if (!discussion) {
      return res.status(404).json({ message: 'Forum not found' });
    }
    
    // Add reply
    const newReply = {
      user: req.user._id,
      content,
      timestamp: new Date()
    };
    
    discussion.replies.push(newReply);
    await discussion.save();
    
    // Get the newly added reply with user info
    const updatedDiscussion = await Discussion.findById(forumId)
      .populate({
        path: 'replies.user',
        select: 'name role'
      });
    
    const reply = updatedDiscussion.replies[updatedDiscussion.replies.length - 1];
    
    res.status(201).json({
      _id: reply._id,
      content: reply.content,
      createdBy: {
        name: reply.user.name,
        role: reply.user.role
      },
      createdAt: reply.timestamp,
      forumId
    });
  } catch (err) {
    console.error('Error posting forum reply:', err);
    res.status(500).json({ message: 'Error posting reply' });
  }
};

// Delete a forum
exports.deleteForum = async (req, res) => {
  try {
    const { forumId } = req.params;
    
    const discussion = await Discussion.findById(forumId);
    if (!discussion) {
      return res.status(404).json({ message: 'Forum not found' });
    }
    
    await Discussion.findByIdAndDelete(forumId);
    
    res.json({
      message: 'Forum deleted successfully',
      forumId
    });
  } catch (err) {
    console.error('Error deleting forum:', err);
    res.status(500).json({ message: 'Error deleting forum' });
  }
};

// Delete a forum reply
exports.deleteForumReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    
    // Find the discussion that contains this reply
    const discussion = await Discussion.findOne({ 'replies._id': replyId });
    if (!discussion) {
      return res.status(404).json({ message: 'Reply not found' });
    }
    
    // Remove the reply
    discussion.replies.pull({ _id: replyId });
    await discussion.save();
    
    res.json({
      message: 'Reply deleted successfully',
      replyId
    });
  } catch (err) {
    console.error('Error deleting forum reply:', err);
    res.status(500).json({ message: 'Error deleting reply' });
  }
};
