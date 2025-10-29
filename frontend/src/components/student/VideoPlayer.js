import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, LinearProgress, Card, CardContent, Alert } from '@mui/material';
import { updateWatchHistory } from '../../api/studentVideoApi';

const VideoPlayer = ({ video, token }) => {
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeWatched, setTimeWatched] = useState(0);
  
  // Store last update timestamp to track watch time
  const lastUpdateRef = useRef(Date.now());
  // Store accumulated time to send in batches
  const accumulatedTimeRef = useRef(0);
  
  // Update watch history in the backend
  const updateBackendWatchHistory = async () => {
    try {
      // Only update if accumulated time is at least 1 second
      if (accumulatedTimeRef.current >= 1 && videoRef.current) {
        await updateWatchHistory(video._id, {
          timeSpent: accumulatedTimeRef.current,
          currentTime: videoRef.current.currentTime,
          duration: videoRef.current.duration
        }, token);
        
        // Reset accumulated time after sending to backend
        accumulatedTimeRef.current = 0;
      }
    } catch (error) {
      console.error('Error updating watch history:', error);
    }
  };
  
  // Handle video time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const currentVideoTime = videoRef.current.currentTime;
    const videoDuration = videoRef.current.duration;
    
    // Calculate progress
    const newProgress = (currentVideoTime / videoDuration) * 100;
    setProgress(newProgress);
    setCurrentTime(currentVideoTime);
    
    // Calculate time watched since last update
    const now = Date.now();
    const timeDiff = now - lastUpdateRef.current;
    
    // If video is playing, add to accumulated time (in seconds)
    if (isPlaying) {
      accumulatedTimeRef.current += timeDiff / 1000;
      setTimeWatched(prev => prev + timeDiff / 1000);
    }
    
    // Update last update timestamp
    lastUpdateRef.current = now;
    
    // Send update to backend every 5 seconds
    if (accumulatedTimeRef.current >= 5) {
      updateBackendWatchHistory();
    }
  };
  
  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };
  
  // Handle play/pause
  const handlePlay = () => {
    setIsPlaying(true);
    // Reset last update timestamp when starting to play
    lastUpdateRef.current = Date.now();
  };
  
  const handlePause = () => {
    setIsPlaying(false);
    // When paused, update watch history
    updateBackendWatchHistory();
  };
  
  // Handle ended
  const handleEnded = () => {
    setIsPlaying(false);
    // When video ends, update watch history
    updateBackendWatchHistory();
  };

  // Prevent seeking by handling the seeked event
  const handleSeeked = (e) => {
    if (videoRef.current) {
      // If user tries to seek forward, reset to currentTime
      // Allow seeking backward (rewinding) but not forward
      if (videoRef.current.currentTime > currentTime + 1) { // +1 second tolerance
        videoRef.current.currentTime = currentTime;
      }
    }
  };

  // Add event listener for seeking
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('seeked', handleSeeked);
    }
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('seeked', handleSeeked);
      }
    };
  }, [currentTime]);
  
  // Format time in MM:SS format
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Clean up - send final update when component unmounts
  useEffect(() => {
    return () => {
      updateBackendWatchHistory();
    };
  }, []);
  
  return (
    <Card sx={{ mb: { xs: 2, sm: 3 } }}>
      <Box sx={{ position: 'relative' }}>
        <video
          ref={videoRef}
          src={video.videoUrl}
          controls
          width="100%"
          style={{ 
            maxHeight: '500px', 
            height: 'auto',
            display: 'block'
          }}
          controlsList="nodownload noremoteplayback nofullscreen"
          onContextMenu={e => e.preventDefault()}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleMetadataLoaded}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          playsInline
        />
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            height: { xs: 4, sm: 5 }, 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0 
          }}
        />
      </Box>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{
          fontSize: { xs: '1rem', sm: '1.25rem' }
        }}>
          {video.title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.875rem', sm: '0.875rem' }
          }}
        >
          {video.description}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: { xs: 1, sm: 1.5 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 0.5, sm: 0 }
        }}>
          <Typography variant="body2" sx={{
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}>
            Time: {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
          <Typography variant="body2" color="primary" sx={{
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}>
            Watch time: {formatTime(timeWatched)}
          </Typography>
        </Box>
        <Alert severity="info" sx={{ mt: { xs: 1.5, sm: 2 } }}>
          <Typography variant="body2" sx={{
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}>
            Note: Fast-forwarding is disabled to ensure you get the most out of this content.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;
