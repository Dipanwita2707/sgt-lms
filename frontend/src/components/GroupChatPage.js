import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip,
  Fade,
  Snackbar,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Fab,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  MoreVert as MoreVertIcon,
  Emoji as EmojiIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import axios from 'axios';

const GroupChatPage = () => {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [courseInfo, setCourseInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, messageId: null });
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectionAttemptsRef = useRef(0);
  const inputRef = useRef(null);

  // Enhanced color scheme with gradients and improved contrast
  const colors = {
    primary: '#2c5282', // Deeper blue for better contrast
    secondary: '#3182ce', // Brighter blue
    tertiary: '#4299e1', // Light blue
    accent: '#38b2ac', // Teal accent
    background: '#f7fafc', // Slightly blue-tinted white
    cardBackground: '#ffffff',
    text: '#2d3748', // Much darker for better readability
    textSecondary: '#718096',
    success: '#48bb78',
    warning: '#ed8936',
    error: '#e53e3e',
    gradientPrimary: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
    gradientSecondary: 'linear-gradient(135deg, #4299e1 0%, #38b2ac 100%)'
  };

  // Utility functions
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    }
  }, []);

  const attemptReconnection = useCallback(() => {
    if (!socket || socket.connected) return;
    
    connectionAttemptsRef.current += 1;
    const maxAttempts = 5;
    const delay = Math.min(1000 * Math.pow(2, connectionAttemptsRef.current), 30000);

    if (connectionAttemptsRef.current <= maxAttempts) {
      setReconnecting(true);
      console.log(`🔄 Reconnection attempt ${connectionAttemptsRef.current}/${maxAttempts} in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        socket.connect();
      }, delay);
    } else {
      setReconnecting(false);
      showSnackbar('Connection failed. Please refresh the page.', 'error');
    }
  }, [socket, showSnackbar]);

  // Auto-scroll when new messages arrive, but only if user is near bottom
  useEffect(() => {
    if (messages.length > 0) {
      const isNearBottom = messagesContainerRef.current ? 
        messagesContainerRef.current.scrollHeight - messagesContainerRef.current.scrollTop - messagesContainerRef.current.clientHeight < 100 : true;
      
      if (isNearBottom) {
        setTimeout(scrollToBottom, 100);
      }
    }
  }, [messages, scrollToBottom]);

  // Enhanced socket connection with better error handling and reconnection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Load current user info
    loadCurrentUser();

    // Initialize socket connection with better configuration
    const newSocket = io(process.env.REACT_APP_BACKEND_URL + '/group-chat', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 10,
      forceNew: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔗 Connected to group chat');
      setConnected(true);
      setReconnecting(false);
      connectionAttemptsRef.current = 0;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Join the specific chat room
      newSocket.emit('join-chat', { courseId, sectionId });
      showSnackbar('Connected to chat', 'success');
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from group chat. Reason: ${reason}`);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected the client, need to reconnect manually
        showSnackbar('Disconnected from server. Reconnecting...', 'warning');
        attemptReconnection();
      } else {
        showSnackbar('Connection lost. Reconnecting...', 'warning');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setReconnecting(false);
      showSnackbar('Reconnected successfully', 'success');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('🚫 Reconnection error:', error);
      setReconnecting(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 Connection error:', error);
      setConnected(false);
      showSnackbar('Failed to connect to chat server', 'error');
      attemptReconnection();
    });

    // Chat events
    newSocket.on('joined-chat', (data) => {
      console.log('✅ Joined chat room:', data);
      loadMessages();
      showSnackbar('Joined chat room', 'success');
    });

    newSocket.on('new-message', (message) => {
      console.log('📨 New message received:', message);
      setMessages(prev => [...prev, message]);
      
      // Play notification sound for other users' messages
      if (message.sender._id !== currentUser?._id) {
        playNotificationSound();
      }
    });

    newSocket.on('message-deleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      showSnackbar('Message deleted', 'info');
    });

    newSocket.on('user-typing', (data) => {
      setTypingUsers(prev => {
        if (!prev.find(u => u.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    newSocket.on('user-stopped-typing', (data) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    newSocket.on('user-joined', (data) => {
      setOnlineUsers(prev => {
        if (!prev.find(u => u.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
      showSnackbar(`${data.userName} joined the chat`, 'info');
    });

    newSocket.on('user-left', (data) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
      showSnackbar(`${data.userName} left the chat`, 'info');
    });

    newSocket.on('chat-error', (data) => {
      console.error('🚨 Chat error:', data);
      showSnackbar(data.message || 'Chat error occurred', 'error');
    });

    setSocket(newSocket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.disconnect();
    };
  }, [courseId, sectionId, navigate, attemptReconnection, showSnackbar, currentUser]);

  // Notification sound function
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore if audio fails to play (e.g., no user interaction yet)
      });
    } catch (error) {
      // Ignore audio errors
    }
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/group-chat/messages/${courseId}/${sectionId}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 } // Load recent 100 messages
        }
      );
      setMessages(response.data.messages || []);
      
      // Set course and section info if available
      if (response.data.course) setCourseInfo(response.data.course);
      if (response.data.section) setSectionInfo(response.data.section);
      
    } catch (error) {
      console.error('Error loading messages:', error);
      showSnackbar('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseAndSectionInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      // Only load course info - we don't need section details for the chat UI
      const courseResponse = await axios.get(`/api/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
      setCourseInfo(courseResponse.data);
      // Set basic section info with just the ID
      setSectionInfo({ _id: sectionId, name: 'Loading...' });
    } catch (error) {
      console.error('Error loading course info:', error);
      // Set fallback info
      setCourseInfo({ title: 'Unknown Course', courseCode: 'N/A' });
      setSectionInfo({ _id: sectionId, name: 'Unknown Section' });
    }
  };

  useEffect(() => {
    loadCourseAndSectionInfo();
  }, [courseId, sectionId]);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleSendMessage = async () => {
    const message = newMessage.trim();
    if (!message || sending || !connected || !socket) return;

    // Validate message length
    if (message.length > 1000) {
      showSnackbar('Message too long (max 200 words)', 'warning');
      return;
    }

    // Prevent empty messages
    if (message.length === 0) {
      showSnackbar('Cannot send empty message', 'warning');
      return;
    }

    setSending(true);

    try {
      // Clear input immediately for better UX
      setNewMessage('');
      
      // Stop typing indicator
      socket.emit('typing-stop', { courseId, sectionId });
      
      // Send message
      socket.emit('send-message', {
        courseId,
        sectionId,
        message: message
      });
      
      // Focus back to input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      showSnackbar('Failed to send message', 'error');
      // Restore message if sending failed
      setNewMessage(message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      socket.emit('delete-message', {
        messageId,
        courseId,
        sectionId
      });
      setDeleteDialog({ open: false, messageId: null });
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
    }
  };

  const handleTyping = useCallback(() => {
    if (socket && connected) {
      socket.emit('typing-start', { courseId, sectionId });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { courseId, sectionId });
      }, 1500);
    }
  }, [socket, connected, courseId, sectionId]);

  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleRefreshMessages = useCallback(() => {
    loadMessages();
    showSnackbar('Messages refreshed', 'success');
  }, [loadMessages, showSnackbar]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvatarColor = (roles) => {
    if (roles?.includes('admin')) return '#f44336';
    if (roles?.includes('teacher')) return '#2196f3';
    if (roles?.includes('hod')) return '#ff9800';
    if (roles?.includes('dean')) return '#9c27b0';
    return '#4caf50'; // student
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        mt: isMobile ? 1 : 2, 
        mb: isMobile ? 1 : 2, 
        height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 100px)',
        px: isMobile ? 1 : 3
      }}
    >
      <Paper 
        elevation={8} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: colors.cardBackground,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.1)'
        }}
      >
        {/* Enhanced Header */}
        <Box 
          sx={{ 
            background: colors.gradientPrimary,
            color: 'white',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: colors.gradientSecondary
            }
          }}
        >
          {/* Connection status bar */}
          {(reconnecting || !connected) && (
            <LinearProgress 
              sx={{ 
                '& .MuiLinearProgress-bar': { 
                  backgroundColor: colors.warning 
                }
              }} 
            />
          )}
          
          <Box sx={{ p: isMobile ? 1.5 : 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton 
              onClick={() => navigate(-1)} 
              sx={{ 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                sx={{ 
                  fontWeight: 600,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                {courseInfo ? `${courseInfo.courseCode} - ${courseInfo.title}` : 'Loading...'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Section: {sectionInfo?.name || 'Loading...'}
                </Typography>
                {onlineUsers.length > 0 && (
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    • {onlineUsers.length} online
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Refresh button */}
              <Tooltip title="Refresh messages">
                <IconButton 
                  onClick={handleRefreshMessages}
                  sx={{ 
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              {/* Connection status */}
              <Tooltip title={connected ? 'Connected' : reconnecting ? 'Reconnecting...' : 'Disconnected'}>
                <Chip 
                  icon={connected ? <WifiIcon /> : <WifiOffIcon />}
                  label={
                    connected ? 'Connected' : 
                    reconnecting ? 'Reconnecting...' : 
                    'Disconnected'
                  }
                  size="small"
                  sx={{ 
                    bgcolor: connected ? colors.success : reconnecting ? colors.warning : colors.error,
                    color: 'white',
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                />
              </Tooltip>

              {/* Menu button */}
              <IconButton
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{ 
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Messages Container */}
        <Box 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{ 
            flex: 1, 
            overflow: 'auto', 
            bgcolor: colors.background,
            position: 'relative',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: colors.textSecondary,
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: colors.primary,
              },
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={40} sx={{ color: colors.primary }} />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              p: 4,
              textAlign: 'center'
            }}>
              <ChatIcon sx={{ fontSize: 60, color: colors.textSecondary, mb: 2 }} />
              <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1 }}>
                No messages yet
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                Start the conversation by sending the first message!
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 1, pb: 0 }}>
              {messages.map((message, index) => {
                const isConsecutive = index > 0 && 
                  messages[index - 1].sender._id === message.sender._id &&
                  (new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime()) < 60000; // 1 minute
                
                const isOwn = message.sender._id === currentUser?._id;
                
                return (
                  <Fade in key={message._id} timeout={300}>
                    <ListItem
                      sx={{
                        alignItems: 'flex-start',
                        mb: isConsecutive ? 0.5 : 1.5,
                        px: 1,
                        flexDirection: isOwn ? 'row-reverse' : 'row'
                      }}
                    >
                      {!isConsecutive && (
                        <Avatar 
                          sx={{ 
                            bgcolor: getAvatarColor(message.sender.roles),
                            width: 36,
                            height: 36,
                            mx: 1,
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}
                        >
                          {message.sender.name.substring(0, 2).toUpperCase()}
                        </Avatar>
                      )}
                      
                      {isConsecutive && (
                        <Box sx={{ width: 36, mx: 1 }} /> // Spacer for consecutive messages
                      )}
                      
                      <Box 
                        sx={{ 
                          maxWidth: '75%',
                          minWidth: '20%',
                          position: 'relative'
                        }}
                      >
                        {/* Message header (only for non-consecutive messages or different day) */}
                        {!isConsecutive && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mb: 0.5,
                            flexDirection: isOwn ? 'row-reverse' : 'row'
                          }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600, 
                                color: getAvatarColor(message.sender.roles),
                                mr: isOwn ? 0 : 1,
                                ml: isOwn ? 1 : 0
                              }}
                            >
                              {message.sender.name}
                            </Typography>
                            {message.sender.id && (
                              <Typography variant="caption" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.7rem'
                              }}>
                                ({message.sender.id})
                              </Typography>
                            )}
                          </Box>
                        )}
                        
                        {/* Message bubble */}
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            bgcolor: isOwn ? colors.primary : colors.cardBackground,
                            color: isOwn ? 'white' : colors.text,
                            borderRadius: 2,
                            borderTopLeftRadius: isOwn ? 2 : (isConsecutive ? 2 : 0.5),
                            borderTopRightRadius: isOwn ? (isConsecutive ? 2 : 0.5) : 2,
                            position: 'relative',
                            wordBreak: 'break-word',
                            boxShadow: isOwn ? 
                              '0 2px 8px rgba(44, 82, 130, 0.2)' : 
                              '0 1px 3px rgba(0,0,0,0.1)',
                            '&:hover': {
                              boxShadow: isOwn ? 
                                '0 4px 12px rgba(44, 82, 130, 0.3)' : 
                                '0 2px 6px rgba(0,0,0,0.15)'
                            }
                          }}
                        >
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontStyle: message.flagged ? 'italic' : 'normal',
                              lineHeight: 1.4
                            }}
                          >
                            {message.message}
                            {message.flagged && (
                              <Chip 
                                label="Filtered" 
                                size="small" 
                                sx={{ 
                                  ml: 1, 
                                  fontSize: '0.6rem', 
                                  height: '18px',
                                  bgcolor: colors.warning,
                                  color: 'white'
                                }}
                              />
                            )}
                          </Typography>
                          
                          {/* Message time */}
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'block',
                              textAlign: isOwn ? 'left' : 'right',
                              mt: 0.5,
                              opacity: 0.7,
                              fontSize: '0.7rem'
                            }}
                          >
                            {formatTime(message.timestamp)}
                          </Typography>

                          {/* Delete button */}
                          {(message.canDelete || message.canShowDelete) && (
                            <IconButton
                              size="small"
                              onClick={() => setDeleteDialog({ open: true, messageId: message._id })}
                              sx={{ 
                                position: 'absolute',
                                top: -10,
                                right: isOwn ? -10 : 'auto',
                                left: isOwn ? 'auto' : -10,
                                bgcolor: colors.error,
                                color: 'white',
                                width: 24,
                                height: 24,
                                opacity: 0,
                                transition: 'all 0.2s',
                                '&:hover': { 
                                  bgcolor: colors.error,
                                  transform: 'scale(1.1)'
                                },
                                '.MuiListItem-root:hover &': {
                                  opacity: message.canDelete ? 1 : 0.5
                                }
                              }}
                              disabled={!message.canDelete}
                              title={message.canDelete ? 'Delete message' : 'Cannot delete this message'}
                            >
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                        </Paper>
                      </Box>
                    </ListItem>
                  </Fade>
                );
              })}
            </List>
          )}

          {/* Enhanced Typing indicator */}
          {typingUsers.length > 0 && (
            <Fade in timeout={300}>
              <Box sx={{ px: 2, py: 1 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  bgcolor: colors.cardBackground,
                  borderRadius: 2,
                  border: `1px solid ${colors.tertiary}`,
                  maxWidth: 'fit-content'
                }}>
                  <Box sx={{
                    display: 'flex',
                    gap: '2px',
                    '& div': {
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: colors.primary,
                      animation: 'typing 1.4s infinite ease-in-out'
                    },
                    '& div:nth-of-type(1)': { animationDelay: '-0.32s' },
                    '& div:nth-of-type(2)': { animationDelay: '-0.16s' },
                    '@keyframes typing': {
                      '0%, 80%, 100%': { transform: 'scale(0)' },
                      '40%': { transform: 'scale(1)' }
                    }
                  }}>
                    <div />
                    <div />
                    <div />
                  </Box>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                    {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </Typography>
                </Box>
              </Box>
            </Fade>
          )}
          
          <div ref={messagesEndRef} />
        </Box>

        {/* Scroll to bottom FAB */}
        {showScrollToBottom && (
          <Fade in timeout={300}>
            <Fab
              size="small"
              onClick={scrollToBottom}
              sx={{
                position: 'absolute',
                bottom: 100,
                right: 20,
                bgcolor: colors.primary,
                color: 'white',
                '&:hover': { bgcolor: colors.secondary },
                zIndex: 1000
              }}
            >
              <KeyboardArrowDownIcon />
            </Fab>
          </Fade>
        )}

        {/* Enhanced Message Input */}
        <Paper 
          elevation={3}
          sx={{ 
            p: 2,
            bgcolor: colors.cardBackground,
            borderTop: `2px solid ${colors.tertiary}`,
            position: 'relative'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <TextField
                fullWidth
                multiline
                maxRows={isMobile ? 3 : 4}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={connected ? "Type your message..." : "Connecting..."}
                variant="outlined"
                disabled={!connected}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'white',
                    pr: 8, // Space for character count
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 2px ${colors.primary}20`,
                      borderColor: colors.primary
                    }
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: isMobile ? '16px' : '14px', // Prevent zoom on mobile
                    lineHeight: 1.4
                  }
                }}
              />
              
              {/* Character count */}
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 12,
                  color: newMessage.length > 500 ? colors.error : colors.textSecondary,
                  fontSize: '0.7rem',
                  bgcolor: 'white',
                  px: 0.5,
                  borderRadius: 0.5
                }}
              >
                {newMessage.length}/1000
              </Typography>
            </Box>

            {/* Send Button */}
            <Tooltip title={!connected ? "Connecting..." : !newMessage.trim() ? "Type a message" : "Send message"}>
              <span>
                <IconButton
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !connected || sending}
                  sx={{
                    bgcolor: colors.primary,
                    color: 'white',
                    width: 48,
                    height: 48,
                    transition: 'all 0.2s',
                    '&:hover': { 
                      bgcolor: colors.secondary,
                      transform: 'scale(1.05)'
                    },
                    '&:disabled': { 
                      bgcolor: colors.tertiary, 
                      color: colors.textSecondary,
                      transform: 'none'
                    },
                    '&:active': {
                      transform: 'scale(0.95)'
                    }
                  }}
                >
                  {sending ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SendIcon sx={{ 
                      transform: 'rotate(-45deg)',
                      fontSize: 20
                    }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* Connection Status */}
          {!connected && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1,
              p: 1,
              bgcolor: colors.error + '10',
              borderRadius: 1,
              border: `1px solid ${colors.error}30`
            }}>
              <CircularProgress size={16} sx={{ color: colors.error, mr: 1 }} />
              <Typography variant="caption" sx={{ color: colors.error, fontWeight: 500 }}>
                Disconnected - attempting to reconnect... ({Math.max(0, maxReconnectAttempts - reconnectAttempts)} attempts left)
              </Typography>
            </Box>
          )}

          {/* Online Users Indicator */}
          {connected && onlineUsers.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1,
              gap: 1
            }}>
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: colors.success,
                animation: 'pulse 2s infinite'
              }} />
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                {onlineUsers.length} {onlineUsers.length === 1 ? 'user' : 'users'} online
              </Typography>
            </Box>
          )}
        </Paper>
      </Paper>

      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, messageId: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: colors.cardBackground
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: colors.error + '10',
          color: colors.error,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontWeight: 600
        }}>
          <DeleteIcon />
          Delete Message
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: colors.error + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DeleteIcon sx={{ color: colors.error, fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                Are you sure?
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                This message will be permanently deleted and cannot be recovered. This action cannot be undone.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button 
            onClick={() => setDeleteDialog({ open: false, messageId: null })}
            variant="outlined"
            sx={{ 
              borderColor: colors.tertiary,
              color: colors.text,
              '&:hover': {
                borderColor: colors.primary,
                bgcolor: colors.primary + '10'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteMessage(deleteDialog.messageId)}
            variant="contained"
            sx={{
              bgcolor: colors.error,
              '&:hover': { bgcolor: colors.error + 'dd' },
              fontWeight: 600
            }}
            startIcon={<DeleteIcon />}
          >
            Delete Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            borderRadius: 2,
            '& .MuiAlert-icon': {
              fontSize: 20
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GroupChatPage;