import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Divider, List, ListItem, ListItemText, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import { getWatchHistory } from '../../api/studentVideoApi';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';

const WatchHistory = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [watchHistory, setWatchHistory] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchWatchHistory = async () => {
      try {
        setLoading(true);
        const data = await getWatchHistory(token);
        setWatchHistory(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching watch history:', err);
        setError('Failed to load watch history');
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchWatchHistory();
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
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
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
  
  if (!watchHistory || watchHistory.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No watch history available</Typography>
      </Box>
    );
  }
  
  // Calculate total watch time across all courses
  const totalWatchTime = watchHistory.reduce((total, course) => total + course.totalTimeSpent, 0);
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Your Watch History</Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Total Watch Time</Typography>
                  <Typography variant="h4">{formatTime(totalWatchTime)}</Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <VideoLibraryIcon color="secondary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Courses Watched</Typography>
                  <Typography variant="h4">{watchHistory.length}</Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PlayCircleOutlineIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Videos Watched</Typography>
                  <Typography variant="h4">
                    {watchHistory.reduce((total, course) => total + course.videos.length, 0)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Box>
        {watchHistory.map((course) => (
          <Accordion key={course.courseId} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                <Typography variant="h6">
                  {course.courseTitle} {course.courseCode && `(${course.courseCode})`}
                </Typography>
                <Chip 
                  label={`${formatTime(course.totalTimeSpent)}`}
                  color="primary"
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Divider sx={{ mb: 2 }} />
              <List>
                {course.videos.map((video) => (
                  <ListItem key={video.videoId} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={video.videoTitle}
                      secondary={`Last watched: ${formatDate(video.lastWatched)}`}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Watch time: {formatTime(video.timeSpent)}
                      </Typography>
                    </Box>
                    <Divider sx={{ width: '100%', mt: 2 }} />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export default WatchHistory;
