const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GroupChat = require('../models/GroupChat');
const Section = require('../models/Section');
const Course = require('../models/Course');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { connectionPoolManager } = require('../config/socketConfig');

// Enhanced user session management with cleanup
const chatUsers = new Map();
const roomUsers = new Map(); // Track users per room
const userHeartbeats = new Map(); // Track user activity

// Rate limiters for different actions
const messageLimiter = new RateLimiterMemory({
  keyGenerator: (socket) => socket.user._id.toString(),
  points: 10, // Number of messages
  duration: 60, // Per 60 seconds
});

const joinLimiter = new RateLimiterMemory({
  keyGenerator: (socket) => socket.user._id.toString(),
  points: 5, // Number of join attempts
  duration: 60, // Per 60 seconds
});

// Cleanup interval for inactive users
setInterval(() => {
  const now = Date.now();
  const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  for (const [userId, lastSeen] of userHeartbeats.entries()) {
    if (now - lastSeen > INACTIVE_THRESHOLD) {
      chatUsers.delete(userId);
      userHeartbeats.delete(userId);
      
      // Remove from all rooms
      for (const [roomId, users] of roomUsers.entries()) {
        users.delete(userId);
        if (users.size === 0) {
          roomUsers.delete(roomId);
        }
      }
    }
  }
}, 60000); // Run every minute

const initializeGroupChatSocket = (io) => {
  // Create a namespace for group chat with enhanced configuration
  const chatNamespace = io.of('/group-chat');

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  chatNamespace.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User ${socket.user.name} connected to group chat`);
    
    // Add to connection pool manager
    connectionPoolManager.addConnection(socket.id, '/group-chat', socket.user);
    
    // Store enhanced user connection info
    chatUsers.set(userId, {
      socketId: socket.id,
      socket: socket,
      user: socket.user,
      connectedAt: new Date(),
      lastActivity: Date.now(),
      currentRoom: null,
      isTyping: false
    });
    
    // Update heartbeat
    userHeartbeats.set(userId, Date.now());
    
    // Send server load info to client
    const serverLoad = connectionPoolManager.getServerLoad();
    socket.emit('server-load', { load: serverLoad });
    
    // Set up periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        userHeartbeats.set(userId, Date.now());
        socket.emit('ping');
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    // Handle pong response
    socket.on('pong', () => {
      userHeartbeats.set(userId, Date.now());
    });

    // Enhanced join chat room with rate limiting
    socket.on('join-chat', async (data) => {
      try {
        // Apply rate limiting
        await joinLimiter.consume(socket);
        
        const { courseId, sectionId } = data;
        const roomId = `chat_${courseId}_${sectionId}`;
        
        console.log(`🔧 [JOIN-CHAT] User ${socket.user.name} attempting to join room ${roomId}`);

        // Verify user has access to this chat room
        const hasAccess = await verifyUserChatAccess(socket.user, courseId, sectionId);
        if (!hasAccess) {
          socket.emit('chat-error', { 
            message: 'Access denied to this chat room',
            code: 'ACCESS_DENIED'
          });
          return;
        }

        // Leave previous room and clean up
        const previousRoom = socket.currentRoom;
        if (previousRoom) {
          socket.leave(previousRoom);
          
          // Remove from previous room users tracking
          if (roomUsers.has(previousRoom)) {
            roomUsers.get(previousRoom).delete(userId);
            if (roomUsers.get(previousRoom).size === 0) {
              roomUsers.delete(previousRoom);
            }
          }
          
          // Notify previous room about user leaving
          socket.to(previousRoom).emit('user-left', {
            userId: socket.user._id,
            userName: socket.user.name
          });
        }

        // Join the new room
        socket.join(roomId);
        socket.currentRoom = roomId;
        
        // Update user session
        const userSession = chatUsers.get(userId);
        if (userSession) {
          userSession.currentRoom = roomId;
          userSession.lastActivity = Date.now();
        }
        
        // Track room users
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Set());
        }
        roomUsers.get(roomId).add(userId);
        
        // Update connection pool manager
        connectionPoolManager.addUserToRoom(socket.id, roomId);
        
        console.log(`✅ User ${socket.user.name} joined room ${roomId}`);
        
        // Get current room users with details
        const roomUserIds = roomUsers.get(roomId) || new Set();
        const activeUsers = Array.from(roomUserIds).map(uid => {
          const userSession = chatUsers.get(uid);
          if (userSession && userSession.user) {
            return {
              userId: userSession.user._id,
              userName: userSession.user.name,
              userRole: userSession.user.roles?.[0] || 'student'
            };
          }
          return null;
        }).filter(Boolean);
        
        // Get current room statistics
        const roomStats = {
          activeUsers: activeUsers, // Send array of users, not just count
          roomId,
          courseId,
          sectionId
        };
        
        socket.emit('joined-chat', roomStats);
        
        // Notify room about user joining with enhanced info
        socket.to(roomId).emit('user-joined', {
          userId: socket.user._id,
          userName: socket.user.name,
          userRole: socket.user.roles?.[0] || 'student',
          timestamp: new Date(),
          activeUsers: roomStats.activeUsers
        });
        
      } catch (rateLimitError) {
        if (rateLimitError.remainingPoints !== undefined) {
          socket.emit('chat-error', { 
            message: 'Too many join attempts. Please wait before trying again.',
            code: 'RATE_LIMITED',
            retryAfter: Math.ceil(rateLimitError.msBeforeNext / 1000)
          });
        } else {
          console.error('Join chat error:', rateLimitError);
          socket.emit('chat-error', { 
            message: 'Failed to join chat room',
            code: 'JOIN_ERROR'
          });
        }
      }
    });

    // Enhanced message handling with rate limiting and better validation
    socket.on('send-message', async (data, callback) => {
      try {
        // Apply rate limiting
        await messageLimiter.consume(socket);
        
        const { 
          courseId, 
          sectionId, 
          message, 
          messageType = 'text', 
          replyTo = null,
          fileUrl = null,
          fileName = null,
          fileSize = null,
          mimeType = null
        } = data;
        const roomId = `chat_${courseId}_${sectionId}`;

        // Validate room membership
        if (socket.currentRoom !== roomId) {
          const error = { 
            message: 'Not in the correct chat room',
            code: 'INVALID_ROOM'
          };
          socket.emit('chat-error', error);
          if (typeof callback === 'function') {
            callback({ success: false, error: error.message });
          }
          return;
        }

        // Enhanced message validation based on type
        if (messageType === 'text') {
          if (!message || typeof message !== 'string' || message.trim().length === 0) {
            const error = { 
              message: 'Message cannot be empty',
              code: 'EMPTY_MESSAGE'
            };
            socket.emit('chat-error', error);
            if (typeof callback === 'function') {
              callback({ success: false, error: error.message });
            }
            return;
          }

          if (message.length > 1000) {
            const error = { 
              message: 'Message too long (max 1000 characters)',
              code: 'MESSAGE_TOO_LONG'
            };
            socket.emit('chat-error', error);
            if (typeof callback === 'function') {
              callback({ success: false, error: error.message });
            }
            return;
          }
        } else if (messageType === 'image' || messageType === 'document') {
          // Validate file message
          if (!fileUrl || !fileName) {
            const error = { 
              message: 'File information missing',
              code: 'INVALID_FILE'
            };
            socket.emit('chat-error', error);
            if (typeof callback === 'function') {
              callback({ success: false, error: error.message });
            }
            return;
          }
        }

        // Update user activity
        const userSession = chatUsers.get(userId);
        if (userSession) {
          userSession.lastActivity = Date.now();
          userSession.isTyping = false;
        }
        
        // Update connection pool activity
        connectionPoolManager.updateUserActivity(socket.id);

        // Filter content for inappropriate content (only for text messages)
        let contentFilter = null;
        let finalMessage = message;
        let isFlagged = false;
        let flaggedReason = undefined;

        if (messageType === 'text') {
          contentFilter = GroupChat.filterContent(message.trim());
          
          // Enhanced content filtering with different severity levels
          if (contentFilter.flagged) {
            if (contentFilter.flaggedWords.length > 2) {
              socket.emit('chat-error', { 
                message: 'Message contains inappropriate content and cannot be sent',
                code: 'CONTENT_FILTERED',
                flaggedWords: contentFilter.flaggedWords 
              });
              return;
            } else {
              // Warn user but allow message with filtering
              socket.emit('message-filtered', {
                message: 'Your message contained inappropriate content and has been filtered',
                flaggedWords: contentFilter.flaggedWords
              });
            }
          }

          finalMessage = contentFilter.flagged ? contentFilter.filtered : contentFilter.original;
          isFlagged = contentFilter.flagged;
          flaggedReason = contentFilter.flagged ? `Contains: ${contentFilter.flaggedWords.join(', ')}` : undefined;
        } else {
          // For file messages, use filename as message text if not provided
          finalMessage = message || fileName || 'File';
        }

        // Create enhanced message object
        const messageData = {
          courseId,
          sectionId,
          senderId: socket.user._id,
          message: finalMessage,
          messageType,
          flagged: isFlagged,
          flaggedReason,
          replyTo: replyTo || undefined,
          // Add file fields for file/image/document messages
          ...(messageType === 'image' || messageType === 'document' ? {
            fileUrl,
            fileName,
            fileSize,
            mimeType
          } : {}),
          metadata: {
            userAgent: socket.handshake.headers['user-agent'],
            ip: socket.handshake.address,
            platform: data.platform || 'unknown'
          }
        };

        // Save message to database with better error handling
        const newMessage = new GroupChat(messageData);
        await newMessage.save();
        await newMessage.populate([
          {
            path: 'senderId',
            select: 'name uid regNo teacherId roles primaryRole avatar'
          },
          {
            path: 'replyTo',
            select: 'message senderId timestamp',
            populate: {
              path: 'senderId',
              select: 'name uid regNo teacherId roles'
            }
          }
        ]);

        // Enhanced message formatting
        const sender = newMessage.senderId;
        const formattedMessage = {
          _id: newMessage._id,
          message: newMessage.message,
          messageType: newMessage.messageType,
          timestamp: newMessage.timestamp,
          flagged: newMessage.flagged,
          // Add file fields if present
          ...(newMessage.fileUrl ? {
            fileUrl: newMessage.fileUrl,
            fileName: newMessage.fileName,
            fileSize: newMessage.fileSize,
            mimeType: newMessage.mimeType
          } : {}),
          replyTo: newMessage.replyTo ? {
            _id: newMessage.replyTo._id,
            message: newMessage.replyTo.message.substring(0, 100) + (newMessage.replyTo.message.length > 100 ? '...' : ''),
            sender: {
              name: newMessage.replyTo.senderId.name,
              roles: newMessage.replyTo.senderId.roles
            },
            timestamp: newMessage.replyTo.timestamp
          } : null,
          sender: {
            _id: sender._id,
            name: sender.name,
            uid: sender.uid || sender.teacherId || sender.regNo || null,
            regNo: sender.regNo || null, // Legacy
            teacherId: sender.teacherId || null, // Legacy
            id: sender.uid || sender.regNo || sender.teacherId || '',
            roles: sender.roles,
            avatar: sender.avatar || null,
            isOnline: chatUsers.has(sender._id.toString())
          },
          permissions: {
            canDelete: newMessage.canDelete(socket.user),
            canEdit: newMessage.senderId._id.toString() === socket.user._id.toString() && newMessage.messageType === 'text',
            canReply: true,
            canReact: true
          },
          reactions: [],
          editHistory: [],
          isOwner: newMessage.senderId._id.toString() === socket.user._id.toString()
        };

        // Broadcast enhanced message to OTHER users in the room (exclude sender)
        // Use socket.to() instead of chatNamespace.to() to exclude the sender
        console.log(`📤 Broadcasting new-message to OTHER users in room ${roomId} (excluding sender ${socket.user.name})`);
        socket.to(roomId).emit('new-message', formattedMessage);
        
        // Send delivery confirmation to sender
        socket.emit('message-sent', {
          tempId: data.tempId,
          messageId: newMessage._id,
          timestamp: newMessage.timestamp
        });
        
        // Send acknowledgment callback to sender
        console.log(`✅ Sending callback to sender ${socket.user.name} with messageId: ${newMessage._id}`);
        if (typeof callback === 'function') {
          callback({ 
            success: true, 
            message: formattedMessage,
            messageId: newMessage._id 
          });
        }
        
        console.log(`✅ Message sent in room ${roomId} by ${socket.user.name} (Type: ${messageType})`);
        
      } catch (rateLimitError) {
        if (rateLimitError.remainingPoints !== undefined) {
          const error = { 
            message: `Too many messages. Please wait ${Math.ceil(rateLimitError.msBeforeNext / 1000)} seconds.`,
            code: 'RATE_LIMITED',
            retryAfter: Math.ceil(rateLimitError.msBeforeNext / 1000)
          };
          socket.emit('chat-error', error);
          if (typeof callback === 'function') {
            callback({ success: false, error: error.message });
          }
        } else {
          console.error('Send message error:', rateLimitError);
          const error = { 
            message: 'Failed to send message. Please try again.',
            code: 'SEND_ERROR'
          };
          socket.emit('chat-error', error);
          if (typeof callback === 'function') {
            callback({ success: false, error: error.message });
          }
        }
      }
    });

    // Handle message deletion
    socket.on('delete-message', async (data) => {
      try {
        const { messageId, courseId, sectionId } = data;
        const roomId = `chat_${courseId}_${sectionId}`;

        if (socket.currentRoom !== roomId) {
          socket.emit('chat-error', { message: 'Not in the correct chat room' });
          return;
        }

        const message = await GroupChat.findById(messageId);
        if (!message) {
          socket.emit('chat-error', { message: 'Message not found' });
          return;
        }

        if (!message.canDelete(socket.user)) {
          socket.emit('chat-error', { message: 'Not authorized to delete this message' });
          return;
        }

        message.isDeleted = true;
        message.deletedBy = socket.user._id;
        message.deletedAt = new Date();
        await message.save();

        // Broadcast message deletion to all users in the room
        chatNamespace.to(roomId).emit('message-deleted', { messageId });
        
        console.log(`Message ${messageId} deleted in room ${roomId} by ${socket.user.name}`);
      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('chat-error', { message: 'Failed to delete message' });
      }
    });

    // Enhanced typing indicators with better state management
    socket.on('typing-start', (data) => {
      const { courseId, sectionId } = data;
      const roomId = `chat_${courseId}_${sectionId}`;
      
      if (socket.currentRoom === roomId) {
        const userSession = chatUsers.get(userId);
        if (userSession && !userSession.isTyping) {
          userSession.isTyping = true;
          userSession.lastActivity = Date.now();
          
          socket.to(roomId).emit('user-typing', {
            userId: socket.user._id,
            userName: socket.user.name,
            userRole: socket.user.roles?.[0] || 'student',
            timestamp: new Date()
          });
        }
      }
    });

    socket.on('typing-stop', (data) => {
      const { courseId, sectionId } = data;
      const roomId = `chat_${courseId}_${sectionId}`;
      
      if (socket.currentRoom === roomId) {
        const userSession = chatUsers.get(userId);
        if (userSession && userSession.isTyping) {
          userSession.isTyping = false;
          userSession.lastActivity = Date.now();
          
          socket.to(roomId).emit('user-stopped-typing', {
            userId: socket.user._id,
            timestamp: new Date()
          });
        }
      }
    });

    // Enhanced: Message reactions (WhatsApp/Telegram style)
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, reaction, courseId, sectionId } = data;
        const roomId = `chat_${courseId}_${sectionId}`;
        
        if (socket.currentRoom !== roomId) return;
        
        // Find the message
        const message = await GroupChat.findById(messageId);
        if (!message) {
          console.error('Message not found for reaction:', messageId);
          return;
        }
        
        // Initialize reactions array if not exists
        if (!message.reactions) {
          message.reactions = [];
        }
        
        // Check if user already reacted with this emoji
        const existingReactionIndex = message.reactions.findIndex(
          r => r.emoji === reaction && r.userId.toString() === socket.user._id.toString()
        );
        
        let actionType = 'added';
        
        if (existingReactionIndex >= 0) {
          // Remove reaction (toggle off)
          message.reactions.splice(existingReactionIndex, 1);
          actionType = 'removed';
        } else {
          // Add new reaction
          message.reactions.push({
            emoji: reaction,
            userId: socket.user._id,
            userName: socket.user.name,
            timestamp: new Date()
          });
        }
        
        // Save to database
        await message.save();
        
        // Broadcast to all users in the room (including sender)
        chatNamespace.to(roomId).emit('message-reaction-added', {
          messageId,
          reaction,
          userId: socket.user._id,
          userName: socket.user.name,
          actionType,
          allReactions: message.reactions // Send full reactions array for sync
        });
        
      } catch (error) {
        console.error('Add reaction error:', error);
        socket.emit('chat-error', { 
          message: 'Failed to add reaction',
          error: error.message 
        });
      }
    });

    // New: Get online users in room
    socket.on('get-online-users', (data) => {
      const { courseId, sectionId } = data;
      const roomId = `chat_${courseId}_${sectionId}`;
      
      if (socket.currentRoom === roomId && roomUsers.has(roomId)) {
        const onlineUsers = Array.from(roomUsers.get(roomId))
          .map(userId => {
            const userSession = chatUsers.get(userId);
            return userSession ? {
              userId: userSession.user._id,
              userName: userSession.user.name,
              userRole: userSession.user.roles?.[0] || 'student',
              isTyping: userSession.isTyping,
              lastActivity: userSession.lastActivity
            } : null;
          })
          .filter(user => user !== null);
          
        socket.emit('online-users-list', { users: onlineUsers });
      }
    });

    // Enhanced disconnect handling with proper cleanup
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.user.name} disconnected from group chat. Reason: ${reason}`);
      
      // Remove from connection pool manager
      connectionPoolManager.removeConnection(socket.id);
      
      // Clean up user session
      chatUsers.delete(userId);
      userHeartbeats.delete(userId);
      
      // Clean up room tracking
      if (socket.currentRoom) {
        if (roomUsers.has(socket.currentRoom)) {
          roomUsers.get(socket.currentRoom).delete(userId);
          
          // Clean up empty rooms
          if (roomUsers.get(socket.currentRoom).size === 0) {
            roomUsers.delete(socket.currentRoom);
          }
        }
        
        // Notify room about user leaving with enhanced info
        socket.to(socket.currentRoom).emit('user-left', {
          userId: socket.user._id,
          userName: socket.user.name,
          userRole: socket.user.roles?.[0] || 'student',
          disconnectReason: reason,
          timestamp: new Date(),
          activeUsers: roomUsers.get(socket.currentRoom)?.size || 0
        });
      }
      
      // Clear any intervals
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    });

    // Enhanced error handling
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.name}:`, error);
      socket.emit('chat-error', {
        message: 'Connection error occurred',
        code: 'SOCKET_ERROR'
      });
    });
  });

  console.log('✅ Group Chat Socket.IO initialized');
};

// Helper function to verify user access to chat room
const verifyUserChatAccess = async (user, courseId, sectionId) => {
  try {
    console.log(`🔍 [ACCESS-CHECK] Verifying access for user ${user.name} (roles: ${user.roles}) to course ${courseId} in section ${sectionId}`);
    
    // Admin, Dean, HOD have access to all chats
    if (['admin', 'dean', 'hod', 'superadmin'].some(role => user.roles && user.roles.includes(role))) {
      console.log(`✅ [ACCESS-CHECK] User has admin/dean/hod access`);
      return true;
    }

    // Check if section exists
    const section = await Section.findById(sectionId).populate('courses students teachers');
    if (!section) {
      return false;
    }

    // Check if course exists and is in the section
    const course = await Course.findById(courseId).populate('coordinators');
    if (!course || !section.courses.some(c => c._id.toString() === courseId)) {
      return false;
    }

    // Check if user is student in this section
    if (user.roles && user.roles.includes('student') && section.students.some(s => s._id.toString() === user._id.toString())) {
      return true;
    }

    // Check if user is teacher in this section or teaching this course
    if (user.roles && user.roles.includes('teacher')) {
      console.log(`🔍 [ACCESS-CHECK] User is teacher, checking section teachers: ${section.teachers ? section.teachers.map(t => t._id ? t._id.toString() : t.toString()) : 'none'}`);
      
      // Check if teacher is directly assigned to the section
      if (section.teachers && section.teachers.some(t => {
        const teacherId = t._id ? t._id.toString() : t.toString();
        return teacherId === user._id.toString();
      })) {
        console.log(`✅ [ACCESS-CHECK] Teacher found in section`);
        return true;
      }
      
      // Check if teacher is a course coordinator
      if (course.coordinators && course.coordinators.some(cc => cc._id.toString() === user._id.toString())) {
        console.log(`✅ [ACCESS-CHECK] Teacher is course coordinator`);
        return true;
      }
      
      // Allow any teacher to access chat for now (can be restricted later)
      console.log(`✅ [ACCESS-CHECK] Allowing teacher access (permissive mode)`);
      return true;
    }

    // Check if user is course coordinator
    if (user.roles && user.roles.includes('cc') && course.coordinators.some(cc => cc._id.toString() === user._id.toString())) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Chat access verification error:', error);
    return false;
  }
};

module.exports = initializeGroupChatSocket;