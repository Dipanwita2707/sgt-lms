import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Avatar,
  Box,
  Typography,
  IconButton,
  Slide,
  Fade,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  VolumeOff as VolumeOffIcon
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const NotificationPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 16,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.2)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  animation: `${slideIn} 0.3s ease-out`,
  minWidth: 320,
  maxWidth: 400,
}));

const ChatNotification = ({ 
  open, 
  onClose, 
  message, 
  sender, 
  type = 'message',
  autoHideDuration = 6000,
  soundEnabled = true 
}) => {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const getNotificationIcon = () => {
    switch (type) {
      case 'user-joined':
        return <PersonIcon sx={{ color: '#4caf50' }} />;
      case 'user-left':
        return <PersonIcon sx={{ color: '#ff9800' }} />;
      case 'message':
      default:
        return <MessageIcon sx={{ color: '#2196f3' }} />;
    }
  };

  const getNotificationTitle = () => {
    switch (type) {
      case 'user-joined':
        return `${sender?.name} joined the chat`;
      case 'user-left':
        return `${sender?.name} left the chat`;
      case 'message':
      default:
        return `New message from ${sender?.name}`;
    }
  };

  const getNotificationColor = () => {
    switch (type) {
      case 'user-joined':
        return '#4caf50';
      case 'user-left':
        return '#ff9800';
      case 'message':
      default:
        return '#2196f3';
    }
  };

  if (!visible) return null;

  return (
    <Snackbar
      open={visible}
      onClose={handleClose}
      autoHideDuration={autoHideDuration}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ 
        '& .MuiSnackbarContent-root': { 
          padding: 0,
          backgroundColor: 'transparent',
          boxShadow: 'none'
        }
      }}
    >
      <Fade in={visible} timeout={300}>
        <NotificationPaper>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            {/* Avatar */}
            <Avatar
              sx={{
                width: 40,
                height: 40,
                backgroundColor: getNotificationColor(),
                fontSize: '0.875rem'
              }}
            >
              {sender?.name ? sender.name.substring(0, 2).toUpperCase() : getNotificationIcon()}
            </Avatar>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 0.5
                }}
              >
                {getNotificationTitle()}
              </Typography>
              
              {message && type === 'message' && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.4
                  }}
                >
                  {message}
                </Typography>
              )}

              {/* Additional info */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mt: 0.5 
              }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
                
                {sender?.role && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      backgroundColor: getNotificationColor(),
                      color: 'white',
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    {sender.role}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Close button */}
            <IconButton 
              size="small" 
              onClick={handleClose}
              sx={{ 
                color: 'text.secondary',
                '&:hover': { 
                  backgroundColor: 'rgba(0,0,0,0.04)' 
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Sound indicator */}
          {!soundEnabled && (
            <Box sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8 
            }}>
              <VolumeOffIcon 
                sx={{ 
                  fontSize: 16, 
                  color: 'text.secondary',
                  opacity: 0.5 
                }} 
              />
            </Box>
          )}
        </NotificationPaper>
      </Fade>
    </Snackbar>
  );
};

export default ChatNotification;