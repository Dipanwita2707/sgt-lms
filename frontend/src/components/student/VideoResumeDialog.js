import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Icon
} from '@mui/material';
import { PlayArrow, Refresh } from '@mui/icons-material';
import { formatDuration } from '../../utils/videoUtils';

const VideoResumeDialog = ({ 
  open, 
  onClose, 
  onResumeFromPosition, 
  onStartFromBeginning, 
  currentPosition, 
  videoDuration,
  videoTitle,
  lastWatched 
}) => {
  const formatLastWatched = (date) => {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const watchedDate = new Date(date);
    const diffInHours = (now - watchedDate) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  const progressPercentage = videoDuration > 0 ? (currentPosition / videoDuration) * 100 : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PlayArrow color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h6" component="div">
            Resume Video?
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
          {progressPercentage >= 95 ? (
            <>You've completed <strong>{videoTitle}</strong></>
          ) : (
            <>You were watching <strong>{videoTitle}</strong></>
          )}
        </Typography>
        
        <Box sx={{ 
          bgcolor: 'grey.50', 
          p: 2, 
          borderRadius: 1, 
          mb: 2,
          border: '1px solid',
          borderColor: 'grey.200'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Last position:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatDuration(currentPosition)} / {formatDuration(videoDuration)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            width: '100%', 
            height: 8, 
            bgcolor: 'grey.300', 
            borderRadius: 1, 
            overflow: 'hidden',
            mb: 1
          }}>
            <Box sx={{ 
              width: `${progressPercentage}%`, 
              height: '100%', 
              bgcolor: 'primary.main',
              transition: 'width 0.3s ease'
            }} />
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            {Math.round(progressPercentage)}% completed • Last watched {formatLastWatched(lastWatched)}
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          {progressPercentage >= 95 ? 
            'Would you like to rewatch from the end or start from the beginning?' :
            'Would you like to continue from where you left off or start over?'
          }
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={onStartFromBeginning}
          variant="outlined"
          startIcon={<Refresh />}
          sx={{ flex: 1 }}
        >
          Start Over
        </Button>
        <Button
          onClick={onResumeFromPosition}
          variant="contained"
          startIcon={<PlayArrow />}
          sx={{ flex: 1 }}
          autoFocus
        >
          Resume
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VideoResumeDialog;