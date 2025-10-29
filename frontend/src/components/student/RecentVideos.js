import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { getWatchHistory } from '../../api/studentVideoApi';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const RecentVideos = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [recentVideos, setRecentVideos] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchRecentVideos = async () => {
      try {
        setLoading(true);
        const history = await getWatchHistory(token);
        
        // Process the watch history to get the most recent videos
        const allVideos = [];
        
        history.forEach(course => {
          course.videos.forEach(video => {
            if (video.lastWatched) {
              allVideos.push({
                videoId: video.videoId,
                videoTitle: video.videoTitle,
                lastWatched: new Date(video.lastWatched),
                timeSpent: video.timeSpent,
                courseId: course.courseId,
                courseTitle: course.courseTitle,
                progress: video.progress
              });
            }
          });
        });
        
        // Sort videos by last watched date (most recent first)
        allVideos.sort((a, b) => b.lastWatched - a.lastWatched);
        
        // Take the 10 most recent videos
        setRecentVideos(allVideos.slice(0, 10));
        setError(null);
      } catch (err) {
        console.error('Error fetching recent videos:', err);
        setError('Failed to load recent videos');
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchRecentVideos();
    }
  }, [token]);
  
  // Format time in human-readable format
  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (remainingSeconds > 0 || result === '') result += `${remainingSeconds}s`;
    
    return result.trim();
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return 'Never';
    
    // Calculate time difference
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    
    return date.toLocaleDateString();
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  if (!recentVideos || recentVideos.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>You haven't watched any videos yet.</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Continue Learning</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Pick up where you left off with your most recently watched videos.
      </Typography>
      
      <Grid container spacing={3}>
        {recentVideos.map((video, index) => (
          <Grid item xs={12} md={6} key={`${video.videoId}-${index}`}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {video.videoTitle}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  Course: {video.courseTitle}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Watched {formatDate(video.lastWatched)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Time spent: {formatTime(video.timeSpent)}
                  </Typography>
                  
                  {video.progress !== undefined && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                      Progress: {Math.round(video.progress * 100)}%
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    component={Link}
                    to={`/student/course/${video.courseId}/video/${video.videoId}`}
                    startIcon={<PlayCircleOutlineIcon />}
                  >
                    Continue Watching
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RecentVideos;
