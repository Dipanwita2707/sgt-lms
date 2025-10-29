import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  Box,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TeacherVideoPlayer from './TeacherVideoPlayer';
import { formatVideoUrl } from '../../utils/videoUtils';

const TeacherVideoDialog = ({ open, onClose, video }) => {
  if (!video) return null;
  
  // Format the video URL to ensure it's correct
  const videoUrl = formatVideoUrl(video.videoUrl);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      fullScreen={{ xs: true, sm: false }}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2 },
          bgcolor: '#f8f8f8',
          margin: { xs: 0, sm: 2 },
          maxHeight: { xs: '100%', sm: '90vh' }
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: { xs: 1.5, sm: 2 }, 
        bgcolor: 'secondary.main', 
        color: 'white' 
      }}>
        <Typography variant="h6" component="div" sx={{ 
          fontSize: { xs: '1rem', sm: '1.25rem' },
          pr: 5
        }}>
          {video.title}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: { xs: 4, sm: 8 },
            top: { xs: 4, sm: 8 },
            color: 'white'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ 
        p: { xs: 1, sm: 2 }, 
        mt: 1,
        overflowX: 'hidden'
      }}>
        {video.description && (
          <Box sx={{ mb: { xs: 1, sm: 2 } }}>
            <Typography variant="body1" color="text.secondary" sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}>
              {video.description}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ width: '100%' }}>
          <TeacherVideoPlayer 
            videoUrl={videoUrl} 
            title={video.title} 
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherVideoDialog;
