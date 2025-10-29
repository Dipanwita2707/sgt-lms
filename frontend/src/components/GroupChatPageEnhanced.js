import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Fab,
  Card,
  CardContent,
  Skeleton,
  Collapse,
  ButtonGroup,
  InputAdornment,
  Divider
} from '@mui/material';
import { io } from 'socket.io-client';
import axios from 'axios';
import { styled, keyframes } from '@mui/material/styles';

// Professional SVG-style icons to avoid chunk loading issues
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

const ArrowBackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const PersonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const KeyboardArrowDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
  </svg>
);

const EmojiIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM8.5 8C9.33 8 10 8.67 10 9.5S9.33 11 8.5 11 7 10.33 7 9.5 7.67 8 8.5 8zm3.5 6c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5zm4.5-3c-.83 0-1.5-.67-1.5-1.5S15.17 8 16 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
);

const AttachFileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
  </svg>
);

const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const GroupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.998 2.998 0 0 0 16.93 6c-.93 0-1.78.54-2.17 1.37L12.22 13H16v9h4zm-12.5-11c.83 0 1.5-.67 1.5-1.5S8.33 8 7.5 8 6 8.67 6 9.5 6.67 11 7.5 11zm2 2.5L7.91 20H4l2.59-6.5H4.5C3.67 13.5 3 12.83 3 12s.67-1.5 1.5-1.5h4c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const FullscreenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
  </svg>
);

const FullscreenExitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

const AddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);

const VolumeUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>
);

const VolumeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
  </svg>
);

const NotificationsActiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.58 4.08L6.15 2.65C3.75 4.48 2.17 7.3 2.03 10.5h2c.15-2.65 1.51-4.97 3.55-6.42zm12.39 6.42h2c-.15-3.2-1.73-6.02-4.12-7.85l-1.42 1.43c2.02 1.45 3.39 3.77 3.54 6.42zM18 11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2v-5zm-6 11c.14 0 .27-.01.4-.04.65-.14 1.18-.58 1.44-1.18.1-.24.15-.5.15-.78h-4c.01 1.1.9 2 2.01 2z"/>
  </svg>
);

const NotificationsOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 18.69L7.84 6.14 5.27 3.49 4 4.76l2.8 2.8v.01c-.52.99-.8 2.16-.8 3.42v5l-2 2v1h13.73l2 2L21 19.72l-1-1.03zM12 22c1.11 0 2-.89 2-2h-4c0 1.11.89 2 2 2zm6-7.32V11c0-3.08-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68c-.15.03-.29.08-.42.12-.1.03-.2.07-.3.11h-.01c-.01 0-.01 0-.02.01-.23.09-.46.2-.68.31 0 0-.01 0-.01.01L18 14.68z"/>
  </svg>
);

// Enhanced animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const typing = keyframes`
  0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(65, 105, 225, 0.5); }
  50% { box-shadow: 0 0 20px rgba(65, 105, 225, 0.8); }
  100% { box-shadow: 0 0 5px rgba(65, 105, 225, 0.5); }
`;

// Styled components with enhanced design
const StyledPaper = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
  backdropFilter: 'blur(20px)',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
    zIndex: 1
  }
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => !['isOwn', 'messageType'].includes(prop),
})(({ theme, isOwn, messageType }) => ({
  maxWidth: '85%',
  padding: theme.spacing(1.5, 2.5),
  borderRadius: isOwn ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
  position: 'relative',
  wordBreak: 'break-word',
  animation: `${fadeIn} 0.4s cubic-bezier(0.4, 0, 0.2, 1)`,
  background: isOwn 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  color: 'white',
  marginBottom: theme.spacing(0.5),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.15)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.2)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    borderRadius: '20px 20px 0 0'
  }
}));

const TypingIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.grey[100],
  borderRadius: '20px',
  margin: theme.spacing(1, 0),
  animation: `${slideIn} 0.3s ease-out`,
  '& .dots': {
    display: 'flex',
    gap: '4px',
    '& div': {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: theme.palette.primary.main,
      animation: `${typing} 1.4s infinite ease-in-out`,
      '&:nth-of-type(1)': { animationDelay: '-0.32s' },
      '&:nth-of-type(2)': { animationDelay: '-0.16s' },
    },
  },
}));

const FloatingInput = styled(Box)(({ theme }) => ({
  position: 'sticky',
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(1.5, 2),
  background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.95) 10%, rgba(255,255,255,0.98) 100%)',
  backdropFilter: 'blur(20px)',
  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
  zIndex: 100,
  boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.08)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1, 1),
    boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
  }
}));

// Custom icons are now defined below as simple span elements

// Additional icons (using text-based approach for consistency)
const RefreshIcon = () => <span style={{ fontSize: '16px' }}>🔄</span>;
const WifiOffIcon = () => <span style={{ fontSize: '16px' }}>📡</span>;
const WifiIcon = () => <span style={{ fontSize: '16px' }}>📶</span>;
const FilterIcon = () => <span style={{ fontSize: '16px' }}>⚡</span>;
const SettingsIcon = () => <span style={{ fontSize: '16px' }}>⚙️</span>;
const EditIcon = () => <span style={{ fontSize: '16px' }}>✏️</span>;
const CheckIcon = () => <span style={{ fontSize: '16px' }}>✅</span>;
const ThumbUpIcon = () => <span style={{ fontSize: '16px' }}>👍</span>;
const FavoriteIcon = () => <span style={{ fontSize: '16px' }}>❤️</span>;
const SentimentSatisfiedIcon = () => <span style={{ fontSize: '16px' }}>😊</span>;

// Lightweight custom Badge component to avoid chunk loading issues
const CustomBadge = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-block',
  '& .badge-dot': {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid white',
    zIndex: 1,
  },
  '& .badge-count': {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    backgroundColor: theme.palette.error.main,
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    zIndex: 1,
  }
}));

const OnlineIndicator = ({ children, isOnline, showCount, count }) => (
  <CustomBadge>
    {children}
    {showCount && count > 0 ? (
      <Box className="badge-count">{count}</Box>
    ) : (
      <Box 
        className="badge-dot" 
        sx={{ 
          backgroundColor: isOnline ? '#44b700' : '#gray'
        }} 
      />
    )}
  </CustomBadge>
);

const GroupChatPageEnhanced = () => {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Enhanced state management with message queuing
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false); // Start with false to prevent continuous loading
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false); // Track if we've given up connecting
  const [messageQueue, setMessageQueue] = useState([]); // Queue for offline messages
  const [serverLoad, setServerLoad] = useState('normal'); // Track server load
  const [courseInfo, setCourseInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messageFilter, setMessageFilter] = useState('all');
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [messageReactions, setMessageReactions] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState(null);
  const emojiPickerRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Notification system state
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageId, setLastReadMessageId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  // Enhanced refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectionAttemptsRef = useRef(0);
  const audioRef = useRef(null);
  const isConnectedRef = useRef(false); // Track actual connection state
  const lastNotificationTime = useRef(0); // For throttling notifications
  const notificationSoundRef = useRef(null);

  // Enhanced color scheme with modern glassmorphism
  const colors = useMemo(() => ({
    primary: {
      main: '#667eea',
      light: '#a5b4fc',
      dark: '#4c63d2',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    secondary: {
      main: '#f093fb',
      light: '#fecfef',
      dark: '#c471ed',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    accent: {
      main: '#4facfe',
      light: '#9be5ff',
      dark: '#00d4ff'
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717'
    },
    status: {
      online: '#22c55e',
      away: '#f59e0b',
      busy: '#ef4444',
      offline: '#94a3b8'
    }
  }), []);

  // Enhanced utility functions
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }, []);

  // Emoji picker data
  const commonEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🙌', '👏', '😍', '🤔', '😎', '🚀', '💪', '🎯', '✅', '❌', '⭐', '💡'];
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '✨'];

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
        setEmojiPickerMessageId(null);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Check if user can upload files (teachers, HODs, deans only)
  const canUploadFiles = useMemo(() => {
    const userRoles = currentUser?.roles || [];
    const hasPermission = userRoles.some(role => ['teacher', 'hod', 'dean', 'admin'].includes(role));
    console.log('🔐 File upload permission check:', {
      userRoles,
      canUpload: hasPermission,
      currentUser: currentUser?.name || 'Unknown'
    });
    return hasPermission;
  }, [currentUser]);

  // File validation
  const validateFile = useCallback((file) => {
    const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocs = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain', // .txt
      'text/csv' // .csv
    ];
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedImages.includes(file.type) && !allowedDocs.includes(file.type)) {
      return { 
        valid: false, 
        error: 'File type not allowed. Only images (JPG, PNG, GIF, WEBP) and documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV) are supported.' 
      };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 10MB.' };
    }
    
    return { valid: true };
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((event) => {
    console.log('📁 File input changed', { filesCount: event.target.files?.length });
    const file = event.target.files?.[0];
    if (!file) {
      console.log('⚠️ No file was selected');
      return;
    }
    
    console.log('📄 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      canUploadFiles
    });
    
    // Check permissions
    if (!canUploadFiles) {
      console.error('❌ Permission denied - user cannot upload files');
      showSnackbar('Only teachers, HODs, and deans can upload files', 'error');
      event.target.value = ''; // Reset input
      return;
    }
    
    // Validate file
    const validation = validateFile(file);
    console.log('✔️ File validation result:', validation);
    
    if (!validation.valid) {
      console.error('❌ File validation failed:', validation.error);
      showSnackbar(validation.error, 'error');
      event.target.value = ''; // Reset input
      return;
    }
    
    console.log('✅ File accepted, setting selectedFile state');
    setSelectedFile(file);
    showSnackbar(`File selected: ${file.name}`, 'success');
  }, [canUploadFiles, validateFile, showSnackbar]);

  // Handle file upload
  const handleFileUpload = useCallback(async () => {
    console.log('📎 handleFileUpload called', { selectedFile: selectedFile?.name, canUploadFiles });
    
    if (!selectedFile) {
      console.log('📂 No file selected, opening file picker...');
      fileInputRef.current?.click();
      return;
    }

    if (!canUploadFiles) {
      console.error('❌ User not authorized to upload files');
      showSnackbar('Only teachers, HODs, and deans can upload files', 'error');
      return;
    }

    try {
      console.log('⬆️ Starting file upload:', selectedFile.name);
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('courseId', courseId);
      formData.append('sectionId', sectionId);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/group-chat/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      );

      if (response.data.success) {
        const { fileUrl, fileName, fileSize, mimeType } = response.data;
        
        // Determine message type
        const messageType = mimeType.startsWith('image/') ? 'image' : 'document';
        
        // Create optimistic file message
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
          _id: tempId,
          tempId: tempId,
          message: fileName,
          sender: currentUser || {
            _id: 'demo-user-1',
            name: 'Demo User',
            roles: ['teacher']
          },
          timestamp: new Date().toISOString(),
          messageType: messageType,
          fileUrl: fileUrl,
          fileName: fileName,
          fileSize: fileSize,
          mimeType: mimeType,
          replyTo: replyTo,
          isOptimistic: true,
          status: 'sent'
        };
        
        // Add message to UI immediately
        setMessages(prev => [...prev, optimisticMessage]);
        scrollToBottom();
        
        // Send file message through socket
        const messageData = {
          courseId,
          sectionId,
          message: fileName, // Use filename as message text
          messageType,
          fileUrl,
          fileName,
          fileSize,
          mimeType,
          replyTo: replyTo?._id,
          tempId: tempId,
          timestamp: new Date().toISOString()
        };

        socket?.emit('send-message', messageData, (ack) => {
          if (ack && ack.success) {
            console.log('✅ File message sent successfully:', ack);
            showSnackbar('File uploaded successfully!', 'success');
            
            // Update optimistic message with real _id
            setMessages(prev => prev.map(msg => 
              msg.tempId === tempId 
                ? { ...msg, _id: ack.message._id, isOptimistic: false }
                : msg
            ));
            
            setSelectedFile(null);
            setUploadProgress(0);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } else {
            console.error('❌ File message send error:', ack?.error);
            showSnackbar(ack?.error || 'Failed to send file message', 'error');
            
            // Update message status to failed
            setMessages(prev => prev.map(msg => 
              msg.tempId === tempId 
                ? { ...msg, status: 'failed', isOptimistic: false }
                : msg
            ));
          }
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      showSnackbar(error.response?.data?.message || 'Failed to upload file', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, canUploadFiles, courseId, sectionId, socket, replyTo, showSnackbar, setMessages, scrollToBottom, currentUser]);

  // ============ NOTIFICATION SYSTEM ============
  
  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('❌ Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        showSnackbar('Notifications enabled! You\'ll be notified of new messages', 'success');
        return true;
      }
    }

    return false;
  }, [showSnackbar]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create a simple notification sound using Web Audio API
      if (!notificationSoundRef.current) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        notificationSoundRef.current = audioContext;
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [soundEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((message) => {
    // Don't show if page is focused
    if (document.hasFocus()) return;
    
    // Don't show if notifications disabled
    if (!notificationsEnabled || Notification.permission !== 'granted') return;
    
    // Throttle notifications (max 1 per 3 seconds)
    const now = Date.now();
    if (now - lastNotificationTime.current < 3000) return;
    lastNotificationTime.current = now;

    try {
      const notification = new Notification(`New message in ${courseInfo?.courseCode || 'Chat'}`, {
        body: `${message.sender.name}: ${message.message.substring(0, 100)}${message.message.length > 100 ? '...' : ''}`,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'chat-message',
        requireInteraction: false,
        silent: !soundEnabled
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [notificationsEnabled, courseInfo, soundEnabled]);

  // Update unread count
  const updateUnreadCount = useCallback((newMessages) => {
    if (!currentUser || document.hasFocus()) {
      setUnreadCount(0);
      return;
    }

    const unreadMessages = newMessages.filter(msg => 
      msg.sender._id !== currentUser._id && 
      (!lastReadMessageId || msg._id > lastReadMessageId)
    );

    setUnreadCount(unreadMessages.length);
    
    // Update document title
    if (unreadMessages.length > 0) {
      document.title = `(${unreadMessages.length}) ${courseInfo?.courseCode || 'Chat'} - SGT LMS`;
    } else {
      document.title = `${courseInfo?.courseCode || 'Chat'} - SGT LMS`;
    }
  }, [currentUser, lastReadMessageId, courseInfo]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (messages.length > 0 && document.hasFocus()) {
      const latestMessage = messages[messages.length - 1];
      setLastReadMessageId(latestMessage._id);
      setUnreadCount(0);
      document.title = `${courseInfo?.courseCode || 'Chat'} - SGT LMS`;
      
      // Notify server about read status via API
      try {
        const token = localStorage.getItem('token');
        await axios.post('/api/group-chat/mark-read', {
          courseId,
          sectionId,
          lastReadMessageId: latestMessage._id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
      
      // Also emit socket event for real-time sync
      if (socket && connected) {
        socket.emit('messages-read', {
          courseId,
          sectionId,
          lastReadMessageId: latestMessage._id
        });
      }
    }
  }, [messages, socket, connected, courseId, sectionId, courseInfo]);

  // ============ END NOTIFICATION SYSTEM ============

  // Enhanced scroll handling
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
      
      // Mark messages as read when scrolling to bottom
      if (isNearBottom && messages.length > 0 && document.hasFocus()) {
        markMessagesAsRead();
      }
    }
  }, [messages, markMessagesAsRead]);

  // Enhanced socket connection optimized for 50,000+ concurrent users
  useEffect(() => {
    const token = localStorage.getItem('token');
    let newSocket = null;
    let initTimeout = null;
    let socketTimeout = null;
    
    // Initialize with basic info to prevent loading states
    setLoading(false); // Set loading to false immediately
    setCurrentUser({
      _id: 'current-user',
      name: 'User',
      email: 'user@example.com',
      roles: ['student']
    });
    
    // Request notification permission for better user experience
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showSnackbar('Browser notifications enabled', 'success');
        }
      });
    }
    
    // Initialize data loading in background (non-blocking)
    const initializeData = async () => {
      try {
        await Promise.all([
          loadCurrentUser(),
          loadCourseAndSectionInfo(),
          loadMessages()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setLoading(false); // Ensure loading is false after all attempts
      }
    };
    
    // Start background initialization immediately
    initTimeout = setTimeout(initializeData, 10); // Very short delay for faster UI

    // Get socket URL from environment or use default
    const socketURL = process.env.REACT_APP_SOCKET_URL || window.location.protocol + '//' + window.location.hostname + ':3000';

    // Initialize socket connection with optimized settings for high load
    socketTimeout = setTimeout(() => {
      try {
        newSocket = io(socketURL + '/group-chat', {
          auth: { token: token || 'demo-token' },
          transports: ['websocket', 'polling'], // Try websocket first for better real-time performance
          timeout: 5000, // 5 second timeout
          reconnection: true, // Enable auto-reconnection for stability
          reconnectionDelay: 1000, // Start with 1 second delay
          reconnectionDelayMax: 5000, // Max 5 seconds between attempts
          reconnectionAttempts: 5, // Try 5 times before giving up
          forceNew: true,
          // Optimize for high concurrency
          pingTimeout: 10000, // 10 seconds ping timeout
          pingInterval: 25000, // 25 seconds ping interval
          // Connection pooling optimizations
          autoConnect: true,
          closeOnBeforeunload: true
        });

      // Enhanced connection events
      newSocket.on('connect', () => {
        console.log('🔗 Connected to enhanced group chat');
        setConnected(true);
        isConnectedRef.current = true; // Update ref
        setReconnecting(false);
        setOfflineMode(false); // Exit offline mode when connected
        connectionAttemptsRef.current = 0;
        
        newSocket.emit('join-chat', { courseId, sectionId });
        showSnackbar('Connected to chat', 'success');
      });

    newSocket.on('joined-chat', (data) => {
      console.log('✅ Joined chat room:', data);
      loadMessages();
      setOnlineUsers(Array.isArray(data.activeUsers) ? data.activeUsers : []);
    });

    // Enhanced message events with duplicate prevention
    newSocket.on('new-message', (message) => {
      console.log('📨 Received new message:', { 
        messageType: message.messageType, 
        hasFileUrl: !!message.fileUrl,
        fileName: message.fileName,
        senderId: message.sender._id,
        currentUserId: currentUser?._id,
        fullMessage: message 
      });
      
      setMessages(prev => {
        // Check if this message already exists (by _id)
        const existingIndex = prev.findIndex(msg => msg._id === message._id);
        
        if (existingIndex >= 0) {
          console.log('⚠️ Skipping duplicate message:', message._id);
          return prev; // Skip duplicate
        }
        
        // Check if this is updating an optimistic message
        const optimisticIndex = prev.findIndex(msg => 
          msg.tempId && !msg.isOptimistic && msg._id === message._id
        );
        
        if (optimisticIndex >= 0) {
          console.log('⚠️ Already updated via callback:', message._id);
          return prev; // Already updated via callback
        }
        
        // Only add if it's from someone else
        if (message.sender._id !== currentUser?._id) {
          console.log('✅ Adding message from other user to chat');
          
          // Trigger notifications for new message
          showBrowserNotification(message);
          playNotificationSound();
          
          const updatedMessages = [...prev, { ...message, status: 'delivered' }];
          updateUnreadCount(updatedMessages);
          
          return updatedMessages;
        }
        
        console.log('⚠️ Skipping own message (already added optimistically)');
        return prev;
      });
    });

    // Message deleted event
    newSocket.on('message-deleted', (data) => {
      console.log('🗑️ Message deleted:', data.messageId);
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      showSnackbar('A message was deleted', 'info');
    });

    newSocket.on('user-typing', (data) => {
      setTypingUsers(prev => {
        if (!prev.find(u => u.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
      
      // Auto-clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }, 3000);
    });

    newSocket.on('user-stopped-typing', (data) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    newSocket.on('message-reaction-added', (data) => {
      console.log('📍 Reaction received:', data);
      
      // Use the full reactions array from backend for sync (more reliable)
      if (data.allReactions) {
        setMessageReactions(prev => {
          const messageReactionsMap = {};
          data.allReactions.forEach(reaction => {
            if (!messageReactionsMap[reaction.emoji]) {
              messageReactionsMap[reaction.emoji] = [];
            }
            messageReactionsMap[reaction.emoji].push({
              userId: reaction.userId,
              userName: reaction.userName
            });
          });
          
          return {
            ...prev,
            [data.messageId]: messageReactionsMap
          };
        });
      } else {
        // Fallback to incremental update if allReactions not provided
        setMessageReactions(prev => {
          const messageReactions = { ...(prev[data.messageId] || {}) };
          const reactionUsers = [...(messageReactions[data.reaction] || [])];
          
          // Check if this is a toggle (remove) action
          const existingIndex = reactionUsers.findIndex(u => u.userId === data.userId);
          
          if (data.actionType === 'removed' || existingIndex >= 0) {
            // Remove reaction
            if (existingIndex >= 0) {
              reactionUsers.splice(existingIndex, 1);
            }
            
            if (reactionUsers.length === 0) {
              delete messageReactions[data.reaction];
            } else {
              messageReactions[data.reaction] = reactionUsers;
            }
          } else {
            // Add reaction
            reactionUsers.push({
              userId: data.userId,
              userName: data.userName
            });
            messageReactions[data.reaction] = reactionUsers;
          }
          
          return {
            ...prev,
            [data.messageId]: messageReactions
          };
        });
      }
    });

      // Enhanced error handling with server load monitoring
      newSocket.on('chat-error', (data) => {
        console.error('Chat error:', data);
        showSnackbar(data.message, 'error');
        
        if (data.code === 'RATE_LIMITED') {
          setSending(true);
          setServerLoad('high');
          setTimeout(() => {
            setSending(false);
            setServerLoad('normal');
          }, data.retryAfter * 1000);
        } else if (data.code === 'SERVER_OVERLOAD') {
          setServerLoad('overloaded');
          showSnackbar('Server is overloaded - Some features may be limited', 'warning');
        }
      });

      // Server load monitoring
      newSocket.on('server-load', (data) => {
        setServerLoad(data.load); // 'low', 'normal', 'high', 'overloaded'
        
        if (data.load === 'high') {
          showSnackbar('Server load is high - Messages may be delayed', 'info');
        } else if (data.load === 'overloaded') {
          showSnackbar('Server overloaded - Limited functionality', 'warning');
        }
      });
      
      newSocket.on('message-filtered', (data) => {
        showSnackbar('Your message was filtered for inappropriate content', 'warning');
      });

      // Heartbeat handling
      newSocket.on('ping', () => {
        newSocket.emit('pong');
      });

      // Enhanced connection handling for high load scenarios
      newSocket.on('connect_error', (error) => {
        // Only log first connection failure to reduce console noise
        if (connectionAttemptsRef.current === 0) {
          console.log('❌ Chat server unavailable, running in offline mode');
        }
        setConnected(false);
        connectionAttemptsRef.current++;
        
        if (connectionAttemptsRef.current >= 3) {
          setReconnecting(false);
          setOfflineMode(true); // Enter offline mode after 3 attempts
          showSnackbar('Chat server unavailable - Running in offline mode', 'info');
        } else {
          setReconnecting(true);
          showSnackbar(`Connecting to chat server (${connectionAttemptsRef.current}/3)...`, 'info');
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('📡 Disconnected from chat:', reason);
        setConnected(false);
        isConnectedRef.current = false; // Update ref
        
        // Handle different disconnect reasons
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          // Server initiated disconnect or client initiated - don't auto-reconnect
          showSnackbar('Disconnected from chat server', 'warning');
        } else {
          // Network issues - attempt reconnection
          setReconnecting(true);
          showSnackbar('Connection lost - Attempting to reconnect...', 'info');
        }
      });

      // Handle reconnection events
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected after', attemptNumber, 'attempts');
        setConnected(true);
        isConnectedRef.current = true; // Update ref
        setReconnecting(false);
        setOfflineMode(false); // Exit offline mode on successful reconnect
        connectionAttemptsRef.current = 0;
        showSnackbar('Reconnected to chat!', 'success');
        
        // Rejoin the room after reconnection
        if (courseId && sectionId) {
          newSocket.emit('join-chat', { courseId, sectionId });
        }
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
        showSnackbar(`Reconnecting... (${attemptNumber}/5)`, 'info');
      });

      newSocket.on('reconnect_failed', () => {
        console.log('❌ Reconnection failed');
        setReconnecting(false);
        showSnackbar('Unable to reconnect - Running in offline mode', 'error');
      });

        setSocket(newSocket);

        // Set offline mode after timeout if no connection
        setTimeout(() => {
          if (!isConnectedRef.current) {
            setConnected(false);
            setReconnecting(false);
            setOfflineMode(true); // Enable offline mode indicator
            console.log('⚠️ Connection timeout - entering offline mode');
          }
        }, 5000); // Give it 5 seconds to connect
      } catch (error) {
        console.error('Socket initialization failed:', error);
        setConnected(false);
        setReconnecting(false);
        setOfflineMode(true); // Enable offline mode on error
        showSnackbar('Running in offline demo mode', 'info');
      }
    }, 100); // Reduced delay for faster initialization

    // Cleanup function - CRITICAL for preventing memory leaks
    return () => {
      if (initTimeout) clearTimeout(initTimeout);
      if (socketTimeout) clearTimeout(socketTimeout);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      
      if (newSocket) {
        newSocket.off('connect');
        newSocket.off('joined-chat');
        newSocket.off('new-message');
        newSocket.off('message-deleted');
        newSocket.off('user-typing');
        newSocket.off('user-stopped-typing');
        newSocket.off('message-reaction-added');
        newSocket.off('chat-error');
        newSocket.off('server-load');
        newSocket.off('message-filtered');
        newSocket.off('ping');
        newSocket.off('connect_error');
        newSocket.off('disconnect');
        newSocket.off('reconnect');
        newSocket.off('reconnect_attempt');
        newSocket.off('reconnect_failed');
        newSocket.disconnect();
        newSocket.close();
      }
    };
  }, [courseId, sectionId, showSnackbar]); // Add dependencies

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission();
    }
  }, [requestNotificationPermission]);

  // Handle window focus/blur events for marking messages as read
  useEffect(() => {
    const handleFocus = () => {
      if (messages.length > 0) {
        markMessagesAsRead();
      }
    };

    const handleBlur = () => {
      // When window loses focus, update last read message
      if (messages.length > 0) {
        setLastReadMessageId(messages[messages.length - 1]._id);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [messages, markMessagesAsRead]);

  // Update unread count when messages change
  useEffect(() => {
    if (messages.length > 0 && !document.hasFocus()) {
      updateUnreadCount(messages);
    } else if (document.hasFocus()) {
      // Reset unread count when focused
      setUnreadCount(0);
      document.title = `${courseInfo?.courseCode || 'Chat'} - SGT LMS`;
    }
  }, [messages, updateUnreadCount, courseInfo]);

  // Enhanced message sending with queuing and retry logic for high load
  const handleSendMessage = useCallback(async () => {
    const message = newMessage.trim();
    if (!message || sending) return;

    if (message.length > 1000) {
      showSnackbar('Message too long (max 1000 characters)', 'warning');
      return;
    }

    setSending(true);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      courseId,
      sectionId,
      message,
      messageType: 'text',
      replyTo: replyTo?._id,
      tempId,
      platform: navigator.platform,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    try {
      setNewMessage('');
      setReplyTo(null);
      
      if (connected && socket) {
        // Stop typing indicator
        socket.emit('typing-stop', { courseId, sectionId });
        
        // Add optimistic UI update
        const optimisticMessage = {
          _id: tempId,
          tempId: tempId,
          message: message,
          sender: currentUser || {
            _id: 'demo-user-1',
            name: 'Demo User',
            roles: ['student']
          },
          timestamp: new Date().toISOString(),
          messageType: 'text',
          replyTo: replyTo,
          isOptimistic: true,
          status: 'sending'
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        scrollToBottom();
        
        // Send message with acknowledgment callback
        socket.emit('send-message', messageData, (response) => {
          if (response && response.success) {
            // Update optimistic message with real _id from server
            setMessages(prev => {
              const updated = prev.map(msg => {
                if (msg.tempId === tempId || msg._id === tempId) {
                  return { 
                    ...msg, 
                    _id: response.message._id,
                    status: 'sent', 
                    isOptimistic: false 
                  };
                }
                return msg;
              });
              return updated;
            });
          } else {
            // Handle error
            const errorMsg = response?.error || 'Failed to send message';
            console.error('❌ Message send error:', errorMsg, 'Full response:', response);
            
            // Add to retry queue
            setMessageQueue(prev => [...prev, messageData]);
            
            // Update message status to failed
            setMessages(prev => prev.map(msg => 
              msg.tempId === tempId 
                ? { ...msg, status: 'failed', isOptimistic: false }
                : msg
            ));
            
            showSnackbar(`Message failed: ${errorMsg}`, 'error');
          }
          setSending(false);
        });
        
        // Set timeout for acknowledgment
        setTimeout(() => {
          setMessages(prev => {
            const msg = prev.find(m => m.tempId === tempId);
            if (msg && msg.status === 'sending') {
              // Timeout - add to queue
              setMessageQueue(prevQueue => [...prevQueue, messageData]);
              showSnackbar('Message send timeout - queued for retry', 'warning');
              return prev.map(m => 
                m.tempId === tempId 
                  ? { ...m, status: 'failed' }
                  : m
              );
            }
            return prev;
          });
          setSending(false);
        }, 10000); // 10 second timeout
        
      } else {
        // Queue message for when connected
        setMessageQueue(prev => [...prev, messageData]);
        
        // Add to UI immediately with queued status
        const queuedMessage = {
          _id: tempId,
          tempId: tempId,
          message: message,
          sender: currentUser || {
            _id: 'demo-user-1',
            name: 'Demo User',
            roles: ['student']
          },
          timestamp: new Date().toISOString(),
          messageType: 'text',
          replyTo: replyTo,
          status: 'queued'
        };
        
        setMessages(prev => [...prev, queuedMessage]);
        scrollToBottom();
        showSnackbar('Message queued - will send when connected', 'info');
        setSending(false);
      }
      
      inputRef.current?.focus();
      
    } catch (error) {
      console.error('Error sending message:', error);
      showSnackbar('Failed to send message', 'error');
      setNewMessage(message);
      setSending(false);
    }
  }, [newMessage, sending, connected, socket, courseId, sectionId, replyTo, showSnackbar, currentUser, scrollToBottom]);

  // Process message queue when connection is restored
  useEffect(() => {
    if (connected && socket && messageQueue.length > 0) {
      console.log(`Processing ${messageQueue.length} queued messages...`);
      
      const processQueue = async () => {
        const successfulMessages = [];
        const failedMessages = [];
        
        for (const queuedMessage of messageQueue) {
          if (queuedMessage.retryCount >= 3) {
            failedMessages.push(queuedMessage.tempId);
            continue;
          }
          
          try {
            queuedMessage.retryCount = (queuedMessage.retryCount || 0) + 1;
            
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Retry timeout'));
              }, 5000);
              
              socket.emit('send-message', queuedMessage, (response) => {
                clearTimeout(timeout);
                if (response && response.success) {
                  resolve(response);
                } else {
                  console.error('Message send error from backend:', response);
                  reject(new Error(response?.error || 'Send failed'));
                }
              });
            });
            
            // Mark as successful
            successfulMessages.push(queuedMessage.tempId);
            
            // Update message status in UI
            setMessages(prev => prev.map(msg => 
              msg.tempId === queuedMessage.tempId 
                ? { ...msg, status: 'sent', isOptimistic: false }
                : msg
            ));
            
          } catch (retryError) {
            console.error('Message retry failed:', retryError);
            
            if (queuedMessage.retryCount >= 3) {
              failedMessages.push(queuedMessage.tempId);
              
              // Update message status to failed
              setMessages(prev => prev.map(msg => 
                msg.tempId === queuedMessage.tempId 
                  ? { ...msg, status: 'failed', isOptimistic: false }
                  : msg
              ));
            }
          }
          
          // Small delay between retries to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Remove successful and permanently failed messages from queue
        setMessageQueue(prev => prev.filter(msg => 
          !successfulMessages.includes(msg.tempId) && !failedMessages.includes(msg.tempId)
        ));
        
        if (successfulMessages.length > 0) {
          showSnackbar(`${successfulMessages.length} queued message(s) sent successfully`, 'success');
        }
        if (failedMessages.length > 0) {
          showSnackbar(`${failedMessages.length} message(s) failed to send`, 'error');
        }
      };
      
      processQueue();
    }
  }, [connected, socket, messageQueue, showSnackbar]);

  // Delete message handler (HOD and Dean only)
  const handleDeleteMessage = useCallback((messageId) => {
    if (!socket || !connected) {
      showSnackbar('Cannot delete message - not connected', 'error');
      return;
    }

    // Check if user has permission (dean, hod, or admin)
    const hasPermission = currentUser?.roles?.includes('dean') || 
                         currentUser?.roles?.includes('hod') || 
                         currentUser?.roles?.includes('admin');
    
    if (!hasPermission) {
      showSnackbar('You do not have permission to delete messages', 'error');
      return;
    }

    // Emit delete message event
    socket.emit('delete-message', {
      messageId,
      courseId,
      sectionId
    });

    showSnackbar('Message deleted', 'success');
    
    // Optimistically remove from UI
    setMessages(prev => prev.filter(msg => msg._id !== messageId));
  }, [socket, connected, currentUser, courseId, sectionId, showSnackbar]);

  // Handle reaction selection (WhatsApp/Telegram style)
  const handleReactionSelect = useCallback((reaction, messageId) => {
    if (!socket || !connected) {
      showSnackbar('Cannot add reaction - not connected', 'warning');
      return;
    }

    if (!currentUser) {
      showSnackbar('User not loaded', 'error');
      return;
    }

    // Emit add-reaction event to backend
    socket.emit('add-reaction', {
      messageId,
      reaction,
      courseId,
      sectionId
    });

    // Close emoji picker after selection
    setShowEmojiPicker(false);
    setEmojiPickerMessageId(null);

    // Optimistic UI update
    setMessageReactions(prev => {
      const messageReactions = { ...(prev[messageId] || {}) };
      const reactionUsers = [...(messageReactions[reaction] || [])];
      
      // Check if user already reacted with this emoji
      const existingIndex = reactionUsers.findIndex(u => u.userId === currentUser._id);
      
      if (existingIndex >= 0) {
        // Remove reaction (toggle off)
        reactionUsers.splice(existingIndex, 1);
        
        // If no more users have this reaction, delete the reaction key
        if (reactionUsers.length === 0) {
          delete messageReactions[reaction];
        } else {
          messageReactions[reaction] = reactionUsers;
        }
      } else {
        // Add reaction
        reactionUsers.push({
          userId: currentUser._id,
          userName: currentUser.name
        });
        messageReactions[reaction] = reactionUsers;
      }
      
      return {
        ...prev,
        [messageId]: messageReactions
      };
    });

  }, [socket, connected, currentUser, courseId, sectionId, showSnackbar]);

  // Enhanced typing handling
  const handleTyping = useCallback(() => {
    if (socket && connected) {
      socket.emit('typing-start', { courseId, sectionId });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { courseId, sectionId });
      }, 1500);
    }
  }, [socket, connected, courseId, sectionId]);

  // Load functions
  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Mock user for demo purposes when no token available
        setCurrentUser({
          _id: 'demo-user-1',
          name: 'Demo User',
          email: 'demo@example.com',
          roles: ['student']
        });
        return;
      }
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error loading user info:', error);
      // Set demo user when API fails
      setCurrentUser({
        _id: 'demo-user-1',
        name: 'Demo User',
        email: 'demo@example.com',
        roles: ['student']
      });
      showSnackbar('Running in demo mode - server not available', 'info');
    }
  };

  const loadCourseAndSectionInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('ℹ️ No token, setting demo section info');
        // Set demo data immediately if no token
        setCourseInfo({
          _id: courseId,
          courseCode: 'DEMO-101',
          title: 'Demo Course',
          description: 'Demo course for testing'
        });
        setSectionInfo({
          _id: sectionId,
          name: 'Demo Section A',
          courseId: courseId
        });
        return;
      }

      console.log('📥 Loading course and section info...');
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased to 5s

      const [courseResponse, sectionResponse] = await Promise.all([
        axios.get(`/api/courses/${courseId}`, { 
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }),
        axios.get(`/api/sections/${sectionId}`, { 
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        })
      ]);
      
      clearTimeout(timeoutId);
      console.log('✅ Course info loaded:', courseResponse.data);
      console.log('✅ Section info loaded:', sectionResponse.data);
      setCourseInfo(courseResponse.data);
      
      // Handle section response - it might be wrapped in {success: true, section: {...}}
      const sectionData = sectionResponse.data.section || sectionResponse.data;
      console.log('✅ Setting section info:', sectionData);
      setSectionInfo(sectionData);
    } catch (error) {
      console.error('❌ Error loading course/section info:', error);
      // Set demo data when API fails
      setCourseInfo({
        _id: courseId,
        courseCode: 'ERROR',
        title: 'Course Load Failed',
        description: 'Could not load course info'
      });
      setSectionInfo({
        _id: sectionId,
        name: 'Section Load Failed',
        courseId: courseId
      });
    }
  };

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Set demo messages immediately if no token
        setMessages([
          {
            _id: 'demo-msg-1',
            message: 'Welcome to the enhanced group chat! 🎉',
            sender: {
              _id: 'demo-user-2',
              name: 'Chat Assistant',
              roles: ['assistant']
            },
            timestamp: new Date(Date.now() - 60000).toISOString(),
            messageType: 'text'
          }
        ]);
        return;
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await axios.get(
        `/api/group-chat/messages/${courseId}/${sectionId}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      console.log('📥 Loaded messages:', { 
        total: response.data.messages?.length || 0,
        fileMessages: response.data.messages?.filter(m => m.messageType === 'image' || m.messageType === 'document').length || 0,
        sample: response.data.messages?.slice(0, 3).map(m => ({ 
          type: m.messageType, 
          hasFileUrl: !!m.fileUrl,
          fileName: m.fileName 
        }))
      });
      const loadedMessages = response.data.messages || [];
      setMessages(loadedMessages);
      
      // Initialize reactions from loaded messages
      const initialReactions = {};
      loadedMessages.forEach(msg => {
        if (msg.reactions && msg.reactions.length > 0) {
          const messageReactionsMap = {};
          msg.reactions.forEach(reaction => {
            if (!messageReactionsMap[reaction.emoji]) {
              messageReactionsMap[reaction.emoji] = [];
            }
            messageReactionsMap[reaction.emoji].push({
              userId: reaction.userId,
              userName: reaction.userName
            });
          });
          initialReactions[msg._id] = messageReactionsMap;
        }
      });
      setMessageReactions(initialReactions);
      
      // Load last read message ID from backend to track unread messages
      try {
        const readReceiptResponse = await axios.get(
          `/api/group-chat/unread-count/${courseId}/${sectionId}`,
          { 
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (readReceiptResponse.data.lastReadMessageId) {
          setLastReadMessageId(readReceiptResponse.data.lastReadMessageId);
        }
      } catch (error) {
        console.log('No previous read receipt found');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Set demo messages when API fails
      setMessages([
        {
          _id: 'demo-msg-1',
          message: 'Welcome to the enhanced group chat! 🎉',
          sender: {
            _id: 'demo-user-2',
            name: 'Chat Assistant',
            roles: ['assistant']
          },
          timestamp: new Date(Date.now() - 60000).toISOString(),
          messageType: 'text'
        },
        {
          _id: 'demo-msg-2',  
          message: 'This is a demo version running in offline mode. The interface has been completely redesigned with modern glassmorphism effects!',
          sender: {
            _id: 'demo-user-2',
            name: 'Chat Assistant', 
            roles: ['assistant']
          },
          timestamp: new Date(Date.now() - 30000).toISOString(),
          messageType: 'text'
        }
      ]);
      showSnackbar('Running in demo mode - backend not connected', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Filter messages based on search and filter
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    
    if (searchQuery) {
      filtered = filtered.filter(msg => 
        msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (messageFilter !== 'all') {
      filtered = filtered.filter(msg => {
        if (messageFilter === 'my-messages') {
          return msg.sender._id === currentUser?._id;
        }
        return true;
      });
    }
    
    return filtered;
  }, [messages, searchQuery, messageFilter, currentUser]);

  // Auto-scroll effect - optimized to reduce lag
  useEffect(() => {
    if (filteredMessages.length > 0) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      });
    }
  }, [filteredMessages.length]); // Only trigger on message count change, not all message updates

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <StyledPaper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: colors.neutral[600] }}>
            Loading enhanced chat...
          </Typography>
        </StyledPaper>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth={isFullscreen ? false : "lg"} 
      sx={{ 
        mt: isMobile ? 0 : 2, 
        mb: isMobile ? 0 : 2, 
        height: isFullscreen ? '100vh' : isMobile ? '100vh' : 'calc(100vh - 100px)',
        px: isMobile ? 0 : 3,
        ...(isFullscreen && { maxWidth: '100vw !important' })
      }}
    >
      <StyledPaper 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Enhanced Header */}
        <Box 
          sx={{ 
            background: colors.primary.gradient,
            color: 'white',
            position: 'relative',
            zIndex: 10
          }}
        >
          {/* Connection status indicator - only show when actively reconnecting */}
          {reconnecting && !offlineMode && (
            <LinearProgress 
              sx={{ 
                '& .MuiLinearProgress-bar': { 
                  backgroundColor: colors.status.busy 
                }
              }} 
            />
          )}
          
          {/* Offline mode indicator */}
          {offlineMode && (
            <Box 
              sx={{ 
                backgroundColor: colors.status.away,
                color: 'white',
                textAlign: 'center',
                py: 0.5,
                fontSize: '0.75rem'
              }}
            >
              📡 Offline Mode - Messages will sync when connection is restored
            </Box>
          )}
          
          <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <IconButton 
              onClick={() => navigate(-1)} 
              sx={{ color: 'white', p: { xs: 0.5, sm: 1 } }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                  {courseInfo ? `${courseInfo.courseCode} - ${courseInfo.title}` : 'Enhanced Chat'}
                </Typography>
                {unreadCount > 0 && (
                  <Chip 
                    label={unreadCount}
                    color="error"
                    size="small"
                    sx={{ 
                      minWidth: '24px',
                      height: { xs: '20px', sm: '24px' },
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      fontWeight: 'bold',
                      '& .MuiChip-label': {
                        px: { xs: 0.75, sm: 1 }
                      }
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  {sectionInfo?.name || 'Loading...'}
                </Typography>
                {Array.isArray(onlineUsers) && onlineUsers.length > 0 && (
                  <Chip 
                    icon={<GroupIcon sx={{ fontSize: '16px !important' }} />}
                    label={`${onlineUsers.length} online`}
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                      height: { xs: '20px', sm: '24px' }
                    }}
                  />
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Search toggle */}
              <Tooltip title={showSearch ? "Close search" : "Search messages"}>
                <IconButton 
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (!showSearch) {
                      setSearchQuery(''); // Clear search when opening
                    }
                  }}
                  sx={{ 
                    color: 'white',
                    backgroundColor: showSearch ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    }
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </Tooltip>

              {/* Online users */}
              <Tooltip title="View online users">
                <IconButton 
                  onClick={() => {
                    setShowOnlineUsers(!showOnlineUsers);
                  }}
                  sx={{ 
                    color: 'white',
                    backgroundColor: showOnlineUsers ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    }
                  }}
                >
                  <OnlineIndicator showCount count={Array.isArray(onlineUsers) ? onlineUsers.length : 0}>
                    <GroupIcon />
                  </OnlineIndicator>
                </IconButton>
              </Tooltip>

              {/* Sound toggle */}
              <Tooltip title={soundEnabled ? "Disable notifications" : "Enable notifications"}>
                <IconButton 
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    showSnackbar(soundEnabled ? 'Notifications disabled' : 'Notifications enabled', 'info');
                  }}
                  sx={{ 
                    color: 'white',
                    backgroundColor: soundEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    }
                  }}
                >
                  {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                </IconButton>
              </Tooltip>

              {/* Browser notifications toggle */}
              <Tooltip title={
                notificationPermission === 'denied' 
                  ? "Browser notifications blocked"
                  : notificationsEnabled 
                    ? "Disable browser notifications" 
                    : "Enable browser notifications"
              }>
                <IconButton 
                  onClick={async () => {
                    if (notificationPermission === 'denied') {
                      showSnackbar('Browser notifications are blocked. Please enable them in your browser settings.', 'warning');
                      return;
                    }
                    
                    if (!notificationsEnabled) {
                      const granted = await requestNotificationPermission();
                      if (granted) {
                        setNotificationsEnabled(true);
                        showSnackbar('Browser notifications enabled', 'success');
                      }
                    } else {
                      setNotificationsEnabled(false);
                      showSnackbar('Browser notifications disabled', 'info');
                    }
                  }}
                  disabled={notificationPermission === 'denied'}
                  sx={{ 
                    color: 'white',
                    backgroundColor: notificationsEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    },
                    '&:disabled': {
                      color: 'rgba(255,255,255,0.3)',
                      backgroundColor: 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  {notificationsEnabled ? <NotificationsActiveIcon /> : <NotificationsOffIcon />}
                </IconButton>
              </Tooltip>

              {/* Fullscreen toggle */}
              <Tooltip title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                <IconButton 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  sx={{ color: 'white' }}
                >
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>

              {/* Connection status */}
              <OnlineIndicator 
                isOnline={connected}
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
              >
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                  <PersonIcon fontSize="small" />
                </Avatar>
              </OnlineIndicator>
            </Box>
          </Box>

          {/* Search bar */}
          <Collapse in={showSearch}>
            <Box sx={{ px: 2, pb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={() => setSearchQuery('')}
                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: 'white' }
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255,255,255,0.7)',
                    opacity: 1
                  }
                }}
              />
            </Box>
          </Collapse>

          {/* Message filter */}
          <Box sx={{ px: 2, pb: 1 }}>
            <ButtonGroup size="small" variant="outlined">
              {[
                { value: 'all', label: 'All' },
                { value: 'my-messages', label: 'My Messages' }
              ].map((filter) => {
                const count = (() => {
                  switch (filter.value) {
                    case 'all': return messages.length;
                    case 'my-messages': return messages.filter(m => m.sender._id === currentUser?._id).length;
                    default: return 0;
                  }
                })();
                
                return (
                  <Button
                    key={filter.value}
                    onClick={() => {
                      setMessageFilter(filter.value);
                      showSnackbar(`Showing ${count} ${filter.label.toLowerCase()}`, 'info');
                    }}
                    variant={messageFilter === filter.value ? 'contained' : 'outlined'}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: messageFilter === filter.value ? colors.primary.main : 'white',
                      backgroundColor: messageFilter === filter.value ? 'white' : 'transparent',
                      minWidth: 'auto',
                      px: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: messageFilter === filter.value ? 'white' : 'rgba(255,255,255,0.1)',
                        borderColor: 'rgba(255,255,255,0.5)',
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    {filter.label} ({count})
                  </Button>
                );
              })}
            </ButtonGroup>
          </Box>
        </Box>

        {/* Online Users Panel */}
        <Collapse in={showOnlineUsers}>
          <Box sx={{ 
            p: 2, 
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderBottom: '1px solid rgba(0,0,0,0.1)'
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Online Users ({Array.isArray(onlineUsers) ? onlineUsers.length : 0})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Array.isArray(onlineUsers) && onlineUsers.length > 0 ? (
                onlineUsers.map((user, index) => (
                  <Chip
                    key={user.userId}
                    avatar={
                      <Avatar sx={{ 
                        width: 24, 
                        height: 24,
                        backgroundColor: colors.primary.main,
                        fontSize: '0.7rem'
                      }}>
                        {user.userName.substring(0, 2).toUpperCase()}
                      </Avatar>
                    }
                    label={user.userName}
                    size="small"
                    sx={{
                      backgroundColor: colors.neutral[100],
                      '&:hover': { backgroundColor: colors.neutral[200] }
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: colors.neutral[500], fontStyle: 'italic' }}>
                  {connected ? 'No other users online' : 'Not connected to see online users'}
                </Typography>
              )}
            </Box>
          </Box>
        </Collapse>

        {/* Enhanced Messages Container */}
        <Box 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            p: { xs: 1, sm: 2, md: 3 },
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
            position: 'relative',
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { 
              width: { xs: '4px', sm: '8px' }
            },
            '&::-webkit-scrollbar-track': { 
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: '4px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: colors.primary.main,
              borderRadius: '4px',
              '&:hover': { backgroundColor: colors.primary.dark }
            }
          }}
        >
          {loading ? (
            <Box sx={{ p: 4 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ mb: 2, display: 'flex', gap: 2 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="rounded" height={60} />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : filteredMessages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              p: 4,
              textAlign: 'center'
            }}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mb: 2,
                  background: colors.secondary.gradient
                }}
              >
                <EmojiIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h5" sx={{ color: colors.neutral[700], mb: 1 }}>
                {searchQuery ? 'No messages found' : 'Start the conversation!'}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.neutral[500] }}>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Send the first message to get this chat started'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              {filteredMessages.map((message, index) => {
                const isConsecutive = index > 0 && 
                  filteredMessages[index - 1].sender._id === message.sender._id &&
                  (new Date(message.timestamp).getTime() - new Date(filteredMessages[index - 1].timestamp).getTime()) < 60000;
                
                const isOwn = message.sender._id === currentUser?._id;
                
                // Use tempId for optimistic messages, _id for real messages
                const messageKey = message.tempId || message._id;
                
                // Only show delete button for HOD and Dean
                const canDelete = currentUser?.roles?.includes('hod') || currentUser?.roles?.includes('dean');
                
                // Check if this is the first unread message (WhatsApp-style separator)
                const isFirstUnread = lastReadMessageId && 
                  !isOwn && 
                  index > 0 &&
                  filteredMessages[index - 1]._id <= lastReadMessageId &&
                  message._id > lastReadMessageId;
                
                return (
                  <Box key={messageKey}>
                    {/* Unread Messages Separator - WhatsApp Style */}
                    {isFirstUnread && (
                      <Box sx={{ my: 3, position: 'relative' }}>
                        <Divider sx={{ borderColor: colors.primary.main, borderWidth: 1 }}>
                          <Chip 
                            label="Unread messages"
                            size="small"
                            sx={{
                              backgroundColor: colors.primary.main,
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              px: 2,
                              py: 0.5,
                              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                              animation: 'pulse 2s ease-in-out infinite',
                              '@keyframes pulse': {
                                '0%': { transform: 'scale(1)' },
                                '50%': { transform: 'scale(1.05)' },
                                '100%': { transform: 'scale(1)' }
                              }
                            }}
                          />
                        </Divider>
                      </Box>
                    )}
                    
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        mb: isConsecutive ? 0.5 : 2,
                        px: 0,
                        flexDirection: isOwn ? 'row-reverse' : 'row'
                      }}
                    >
                      {!isConsecutive && (
                        <OnlineIndicator
                          isOnline={Array.isArray(onlineUsers) && onlineUsers.some(u => u.userId === message.sender._id)}
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                        >
                          <Avatar 
                            sx={{ 
                              background: isOwn ? colors.primary.gradient : colors.secondary.gradient,
                              width: 44,
                              height: 44,
                              mx: 1,
                              fontSize: '1rem',
                              fontWeight: 600,
                              border: '2px solid white',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          >
                            {message.sender.name.substring(0, 2).toUpperCase()}
                          </Avatar>
                        </OnlineIndicator>
                      )}
                      
                      {isConsecutive && (
                        <Box sx={{ width: 44, mx: 1 }} />
                      )}
                      
                      <Box sx={{ 
                        maxWidth: '75%', 
                        minWidth: '20%',
                        position: 'relative' // Added for emoji picker positioning
                      }}>
                        {/* Enhanced message header */}
                        {!isConsecutive && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mb: 1,
                            flexDirection: isOwn ? 'row-reverse' : 'row',
                            gap: 1
                          }}>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                fontWeight: 600, 
                                color: isOwn ? colors.primary.main : colors.secondary.main,
                              }}
                            >
                              {message.sender.name}
                            </Typography>
                            {/* Display new UID (or fallback to legacy regNo/teacherId) */}
                            {(message.sender.uid || message.sender.regNo || message.sender.teacherId || message.sender.id) && (
                              <Chip 
                                label={message.sender.uid || message.sender.regNo || message.sender.teacherId || message.sender.id}
                                size="small"
                                sx={{ 
                                  height: 20,
                                  fontSize: '0.7rem',
                                  backgroundColor: 'rgba(255,255,255,0.9)',
                                  color: colors.neutral[800],
                                  fontWeight: 600,
                                  border: `1px solid ${isOwn ? colors.primary.main : colors.secondary.main}`,
                                  px: 1
                                }}
                              />
                            )}
                            <Chip 
                              label={message.sender.roles?.[0] || 'student'}
                              size="small"
                              sx={{ 
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: isOwn ? colors.primary.main : colors.secondary.main,
                                color: 'white',
                                fontWeight: 500
                              }}
                            />
                          </Box>
                        )}
                        
                        {/* Reply indicator */}
                        {message.replyTo && (
                          <Card 
                            sx={{ 
                              mb: 1, 
                              backgroundColor: colors.neutral[100],
                              borderLeft: `4px solid ${isOwn ? colors.primary.main : colors.secondary.main}`
                            }}
                          >
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                              <Typography variant="caption" sx={{ color: colors.neutral[600] }}>
                                Replying to {message.replyTo.sender.name}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: colors.neutral[700],
                                fontStyle: 'italic',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {message.replyTo.message}
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Enhanced message bubble */}
                        <MessageBubble 
                          isOwn={isOwn} 
                          messageType={message.messageType}
                        >
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontStyle: message.flagged ? 'italic' : 'normal',
                              lineHeight: 1.5,
                              fontSize: '0.95rem'
                            }}
                          >
                            {message.message}
                          </Typography>

                          {/* File/Image rendering */}
                          {(() => {
                            // Debug logging for file messages
                            if (message.message && (message.message.includes('.pdf') || message.message.includes('.jpg') || message.message.includes('.png'))) {
                              console.log('🔍 Potential file message:', {
                                message: message.message,
                                messageType: message.messageType,
                                hasFileUrl: !!message.fileUrl,
                                fileUrl: message.fileUrl,
                                fileName: message.fileName,
                                fullMessageObject: message
                              });
                            }
                            return null;
                          })()}
                          
                          {(message.messageType === 'image' || message.messageType === 'document') && message.fileUrl && (
                            <Box sx={{ mt: 1 }}>
                              {message.messageType === 'image' ? (
                                <Box
                                  component="img"
                                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${message.fileUrl}`}
                                  alt={message.fileName || 'Image'}
                                  sx={{
                                    maxWidth: '100%',
                                    maxHeight: 300,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    '&:hover': {
                                      opacity: 0.9
                                    }
                                  }}
                                  onClick={() => {
                                    const fullUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${message.fileUrl}`;
                                    console.log('🖼️ Opening image:', { fileName: message.fileName, fileUrl: message.fileUrl, fullUrl });
                                    window.open(fullUrl, '_blank');
                                  }}
                                />
                              ) : (
                                <Card 
                                  sx={{ 
                                    p: 2, 
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      backgroundColor: 'rgba(255,255,255,0.15)'
                                    }
                                  }}
                                  onClick={() => {
                                    const fullUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${message.fileUrl}`;
                                    console.log('📄 Opening document:', { fileName: message.fileName, fileUrl: message.fileUrl, fullUrl });
                                    window.open(fullUrl, '_blank');
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ fontSize: 32, color: 'white', display: 'flex', alignItems: 'center' }}>
                                      <AttachFileIcon />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'white' }}>
                                        {message.fileName || 'Document'}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        {message.fileSize ? `${(message.fileSize / 1024).toFixed(2)} KB` : 'File'}
                                      </Typography>
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                      📥 Download
                                    </Typography>
                                  </Box>
                                </Card>
                              )}
                            </Box>
                          )}
                          
                          {message.flagged && (
                            <Chip 
                              label="Content Filtered" 
                              size="small" 
                              sx={{ 
                                mt: 0.5, 
                                fontSize: '0.7rem', 
                                height: '20px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'white'
                              }}
                            />
                          )}
                          
                          {/* Message time and status */}
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mt: 0.5 
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  opacity: 0.8,
                                  fontSize: '0.75rem'
                                }}
                              >
                                {formatTime(message.timestamp)}
                              </Typography>
                              
                              {/* Message status indicators for high-load reliability */}
                              {message.status && (
                                <Box sx={{ fontSize: '10px', opacity: 0.7 }}>
                                  {message.status === 'sending' && '⏳'}
                                  {message.status === 'sent' && '✓'}
                                  {message.status === 'queued' && '📤'}
                                  {message.status === 'failed' && '⚠️'}
                                </Box>
                              )}
                            </Box>
                            
                            {/* Message actions */}
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Reply">
                                <IconButton 
                                  size="small"
                                  onClick={() => {
                                    setReplyTo(message);
                                    showSnackbar(`Replying to ${message.sender.name}`, 'info');
                                    inputRef.current?.focus();
                                  }}
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.8)',
                                    width: 24,
                                    height: 24,
                                    opacity: 0.7,
                                    transition: 'all 0.2s',
                                    '&:hover': { 
                                      opacity: 1,
                                      backgroundColor: 'rgba(255,255,255,0.1)',
                                      transform: 'scale(1.1)'
                                    }
                                  }}
                                >
                                  <ReplyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              
                              {/* React to message button */}
                              <Tooltip title="React to message">
                                <IconButton 
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmojiPickerMessageId(message._id);
                                    setShowEmojiPicker(!showEmojiPicker || emojiPickerMessageId !== message._id);
                                  }}
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.8)',
                                    width: 24,
                                    height: 24,
                                    opacity: 0.7,
                                    transition: 'all 0.2s',
                                    '&:hover': { 
                                      opacity: 1,
                                      backgroundColor: 'rgba(255,255,255,0.1)',
                                      transform: 'scale(1.1)'
                                    }
                                  }}
                                >
                                  <EmojiIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              
                              {(currentUser?.roles?.includes('dean') || currentUser?.roles?.includes('hod') || currentUser?.roles?.includes('admin')) && (
                                <Tooltip title="Delete message">
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleDeleteMessage(message._id)}
                                    sx={{ 
                                      color: 'rgba(255,255,255,0.8)',
                                      width: 24,
                                      height: 24,
                                      opacity: 0.7,
                                      transition: 'all 0.2s',
                                      '&:hover': { 
                                        opacity: 1,
                                        backgroundColor: 'rgba(255,0,0,0.1)',
                                        transform: 'scale(1.1)'
                                      }
                                    }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        </MessageBubble>
                        
                        {/* Message reactions - WhatsApp/Telegram style */}
                        {messageReactions[message._id] && Object.keys(messageReactions[message._id]).length > 0 && (
                          <Box sx={{ 
                            mt: 0.5, 
                            display: 'flex', 
                            gap: 0.5, 
                            flexWrap: 'wrap',
                            justifyContent: isOwn ? 'flex-end' : 'flex-start'
                          }}>
                            {Object.entries(messageReactions[message._id]).map(([reaction, users]) => 
                              users.length > 0 && (
                                <Tooltip 
                                  key={reaction}
                                  title={users.map(u => u.userName).join(', ')}
                                  arrow
                                  placement="top"
                                >
                                  <Chip
                                    label={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <span style={{ fontSize: '14px' }}>{reaction}</span>
                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                          {users.length}
                                        </Typography>
                                      </Box>
                                    }
                                    size="small"
                                    clickable
                                    onClick={() => handleReactionSelect(reaction, message._id)}
                                    sx={{
                                      height: 28,
                                      fontSize: '0.75rem',
                                      borderRadius: '14px',
                                      backgroundColor: users.find(u => u.userId === currentUser?._id) 
                                        ? colors.primary.light 
                                        : 'rgba(255,255,255,0.9)',
                                      border: users.find(u => u.userId === currentUser?._id)
                                        ? `2px solid ${colors.primary.main}`
                                        : '2px solid rgba(0,0,0,0.1)',
                                      color: users.find(u => u.userId === currentUser?._id)
                                        ? colors.primary.main
                                        : colors.neutral[700],
                                      fontWeight: 600,
                                      transition: 'all 0.2s',
                                      '&:hover': { 
                                        backgroundColor: users.find(u => u.userId === currentUser?._id)
                                          ? colors.primary.main
                                          : 'rgba(255,255,255,1)',
                                        color: users.find(u => u.userId === currentUser?._id)
                                          ? 'white'
                                          : colors.neutral[900],
                                        transform: 'scale(1.1)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                      }
                                    }}
                                  />
                                </Tooltip>
                              )
                            )}
                          </Box>
                        )}
                        
                        {/* Emoji picker for reactions - WhatsApp/Telegram style */}
                        {showEmojiPicker && emojiPickerMessageId === message._id && (
                          <Box
                            ref={emojiPickerRef}
                            sx={{
                              position: 'absolute',
                              bottom: '100%',
                              [isOwn ? 'right' : 'left']: 0,
                              mb: 1,
                              p: 1.5,
                              backgroundColor: 'white',
                              borderRadius: 3,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                              display: 'flex',
                              gap: 0.5,
                              zIndex: 1100,
                              flexWrap: 'wrap',
                              maxWidth: { xs: '240px', sm: '320px' },
                              animation: 'slideUp 0.2s ease-out',
                              '@keyframes slideUp': {
                                from: {
                                  opacity: 0,
                                  transform: 'translateY(10px)'
                                },
                                to: {
                                  opacity: 1,
                                  transform: 'translateY(0)'
                                }
                              }
                            }}
                          >
                            {reactionEmojis.map((emoji) => (
                              <IconButton
                                key={emoji}
                                onClick={() => handleReactionSelect(emoji, message._id)}
                                sx={{
                                  fontSize: { xs: '1.4rem', sm: '1.8rem' },
                                  p: { xs: 0.8, sm: 1.2 },
                                  backgroundColor: 'rgba(0,0,0,0.03)',
                                  borderRadius: '50%',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    backgroundColor: colors.primary.light,
                                    transform: 'scale(1.3)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                  }
                                }}
                              >
                                {emoji}
                              </IconButton>
                            ))}
                          </Box>
                        )}
                      </Box>
                  </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Enhanced typing indicator */}
          {typingUsers.length > 0 && (
            <Box sx={{ 
              px: 2, 
              pb: 1,
              animation: `${slideIn} 0.3s ease-out`
            }}>
              <TypingIndicator>
                <Box sx={{ display: 'flex', mr: 1 }}>
                  {typingUsers.slice(0, 3).map((user, index) => (
                    <Avatar 
                      key={user.userId} 
                      sx={{ 
                        background: colors.primary.gradient,
                        fontSize: '0.7rem',
                        width: 24, 
                        height: 24,
                        ml: index > 0 ? -0.5 : 0,
                        zIndex: 3 - index
                      }}
                    >
                      {user.userName.substring(0, 2).toUpperCase()}
                    </Avatar>
                  ))}
                </Box>
                  <Typography variant="caption" sx={{ color: colors.neutral[600], fontStyle: 'italic' }}>
                    {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
                  </Typography>
                <Box className="dots">
                  <div />
                  <div />
                  <div />
                </Box>
              </TypingIndicator>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </Box>

        {/* Scroll to bottom FAB */}
        {showScrollToBottom && (
          <Fab
            size="small"
            onClick={scrollToBottom}
            sx={{
              position: 'absolute',
              bottom: 120,
              right: 24,
              background: colors.primary.gradient,
              color: 'white',
              animation: `${fadeIn} 0.3s ease-out`,
              '&:hover': { 
                background: colors.primary.gradient,
                transform: 'scale(1.1)'
              },
              zIndex: 1000,
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
            }}
          >
            <KeyboardArrowDownIcon />
          </Fab>
        )}

        {/* Reply indicator */}
        {replyTo && (
          <Card 
            sx={{ 
              mx: 2, 
              mb: 1,
              backgroundColor: colors.neutral[50],
              borderLeft: `4px solid ${colors.primary.main}`,
              animation: `${slideIn} 0.3s ease-out`
            }}
          >
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <ReplyIcon sx={{ color: colors.primary.main }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: colors.neutral[600] }}>
                  Replying to {replyTo.sender.name}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: colors.neutral[700],
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {replyTo.message}
                </Typography>
              </Box>
              <IconButton 
                size="small" 
                onClick={() => setReplyTo(null)}
                sx={{ color: colors.neutral[500] }}
              >
                <CloseIcon />
              </IconButton>
            </CardContent>
          </Card>
        )}

        {/* File preview indicator */}
        {selectedFile && (
          <Card 
            sx={{ 
              mx: 2, 
              mb: 1,
              backgroundColor: colors.secondary.main + '10',
              borderLeft: `4px solid ${colors.secondary.main}`,
              animation: `${slideIn} 0.3s ease-out`
            }}
          >
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <AttachFileIcon sx={{ color: colors.secondary.main }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: colors.neutral[600] }}>
                  File attached
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: colors.neutral[700],
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 500
                }}>
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </Typography>
                {uploading && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={uploadProgress} 
                      sx={{ 
                        borderRadius: 1,
                        backgroundColor: colors.secondary.main + '20',
                        '& .MuiLinearProgress-bar': {
                          background: colors.secondary.gradient
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: colors.neutral[600], mt: 0.5 }}>
                      Uploading... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
              </Box>
              <IconButton 
                size="small" 
                onClick={() => {
                  setSelectedFile(null);
                  setUploadProgress(0);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={uploading}
                sx={{ color: colors.neutral[500] }}
              >
                <CloseIcon />
              </IconButton>
            </CardContent>
          </Card>
        )}

        {/* Enhanced floating input */}
        <FloatingInput>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.5, sm: 1, md: 2 } }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={isMobile ? 2 : 4}
                minRows={1}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={connected ? "Type your message..." : "Type your message (offline mode)"}
                disabled={false}
                inputRef={inputRef}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: { xs: '20px', sm: '24px' },
                    backgroundColor: 'white',
                    boxShadow: { xs: '0 1px 4px rgba(0,0,0,0.08)', sm: '0 2px 12px rgba(0,0,0,0.1)' },
                    border: `1px solid ${colors.neutral[200]}`,
                    transition: 'all 0.2s ease',
                    padding: { xs: '4px 8px', sm: '6px 12px' },
                    '&:hover': {
                      boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.12)', sm: '0 4px 20px rgba(0,0,0,0.15)' },
                      borderColor: colors.primary.light
                    },
                    '&.Mui-focused': {
                      boxShadow: { xs: `0 0 0 2px ${colors.primary.main}30`, sm: `0 0 0 4px ${colors.primary.main}20` },
                      borderColor: colors.primary.main
                    }
                  },
                  '& .MuiInputBase-input': {
                    fontSize: { xs: '14px', sm: '15px', md: '16px' },
                    lineHeight: 1.4,
                    padding: { xs: '8px 4px !important', sm: '10px 8px !important' }
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box sx={{ display: 'flex', gap: { xs: 0.25, sm: 0.5 } }}>
                        <Tooltip title="Add emoji">
                          <IconButton 
                            size="small" 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            sx={{ 
                              color: showEmojiPicker ? colors.primary.main : colors.neutral[500],
                              backgroundColor: showEmojiPicker ? colors.primary.main + '10' : 'transparent',
                              p: { xs: 0.5, sm: 1 },
                              '&:hover': {
                                color: colors.primary.main,
                                backgroundColor: colors.primary.main + '10',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <EmojiIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </InputAdornment>
                  )
                }}
              />
              
              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <Paper
                  sx={{
                    position: 'absolute',
                    bottom: 70,
                    right: 80,
                    p: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    borderRadius: 3,
                    zIndex: 1000,
                    maxWidth: 320,
                    animation: `${fadeIn} 0.2s ease-out`
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Pick an Emoji
                    </Typography>
                    <IconButton size="small" onClick={() => setShowEmojiPicker(false)}>
                      <CloseIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
                    {commonEmojis.map((emoji, index) => (
                      <IconButton
                        key={index}
                        onClick={() => handleEmojiSelect(emoji)}
                        sx={{
                          fontSize: '1.5rem',
                          '&:hover': {
                            backgroundColor: colors.primary.main + '10',
                            transform: 'scale(1.2)'
                          }
                        }}
                      >
                        {emoji}
                      </IconButton>
                    ))}
                  </Box>
                </Paper>
              )}
              
              {/* Selected File Indicator */}
              {selectedFile && (
                <Chip
                  label={selectedFile.name}
                  onDelete={() => setSelectedFile(null)}
                  deleteIcon={<CloseIcon />}
                  sx={{
                    position: 'absolute',
                    bottom: 70,
                    left: 0,
                    maxWidth: 200,
                    animation: `${slideIn} 0.2s ease-out`
                  }}
                />
              )}
              
              {/* Character count */}
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 80,
                  color: newMessage.length > 800 ? colors.status.busy : colors.neutral[500],
                  fontSize: '0.7rem',
                  backgroundColor: 'white',
                  px: 1,
                  borderRadius: 1
                }}
              >
                {newMessage.length}/1000
              </Typography>
            </Box>

            {/* File attachment button (Teachers, HODs, Deans only) */}
            {canUploadFiles && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <Tooltip title={selectedFile ? `Upload ${selectedFile.name}` : "Attach file (Teachers, HODs, Deans only)"}>
                  <span>
                    <Fab
                      size={isMobile ? "small" : "medium"}
                      onClick={handleFileUpload}
                      disabled={uploading || sending}
                      sx={{
                        background: selectedFile ? colors.secondary.gradient : colors.neutral[200],
                        width: { xs: 44, sm: 56 },
                        height: { xs: 44, sm: 56 },
                        transition: 'all 0.2s ease',
                        mr: { xs: 0.5, sm: 1 },
                        '&:hover': { 
                          background: selectedFile ? colors.secondary.gradient : colors.neutral[300],
                          transform: 'scale(1.05)',
                          boxShadow: selectedFile ? '0 8px 25px rgba(240, 147, 251, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)'
                        },
                        '&:disabled': { 
                          background: colors.neutral[200],
                          transform: 'none'
                        }
                      }}
                    >
                      {uploading ? (
                        <CircularProgress size={isMobile ? 20 : 24} color="inherit" />
                      ) : (
                        <AttachFileIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                      )}
                    </Fab>
                  </span>
                </Tooltip>
              </>
            )}

            {/* Enhanced send button */}
            <Tooltip title={
              !connected ? "Connecting..." : 
              selectedFile ? `Send file: ${selectedFile.name}` :
              !newMessage.trim() ? "Type a message" : 
              "Send message"
            }>
              <span>
                <Fab
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                  onClick={selectedFile ? handleFileUpload : handleSendMessage}
                  disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}
                  sx={{
                    background: selectedFile ? colors.secondary.gradient : colors.primary.gradient,
                    width: { xs: 44, sm: 56 },
                    height: { xs: 44, sm: 56 },
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      background: selectedFile ? colors.secondary.gradient : colors.primary.gradient,
                      transform: 'scale(1.05)',
                      boxShadow: selectedFile ? '0 8px 25px rgba(240, 147, 251, 0.4)' : '0 8px 25px rgba(102, 126, 234, 0.4)'
                    },
                    '&:disabled': { 
                      background: colors.neutral[300],
                      transform: 'none'
                    },
                    '&:active': {
                      transform: 'scale(0.98)'
                    }
                  }}
                >
                  {sending || uploading ? (
                    <CircularProgress size={isMobile ? 20 : 24} color="inherit" />
                  ) : selectedFile ? (
                    <SendIcon sx={{ 
                      transform: 'translateX(2px)',
                      fontSize: { xs: 20, sm: 24 }
                    }} />
                  ) : (
                    <SendIcon sx={{ 
                      transform: 'translateX(2px)',
                      fontSize: { xs: 20, sm: 24 }
                    }} />
                  )}
                </Fab>
              </span>
            </Tooltip>
          </Box>

          {/* Enhanced status indicators */}
          {!connected && reconnecting && (
            <Alert 
              severity="info"
              sx={{ 
                mt: 1,
                borderRadius: 2,
                backgroundColor: colors.primary.main + '10',
                border: `1px solid ${colors.primary.main}30`
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">
                  Trying to connect...
                </Typography>
              </Box>
            </Alert>
          )}
        </FloatingInput>
      </StyledPaper>

      {/* Enhanced snackbar */}
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
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Notification system - using browser notifications and visual feedback */}
    </Container>
  );
};

export default GroupChatPageEnhanced;

