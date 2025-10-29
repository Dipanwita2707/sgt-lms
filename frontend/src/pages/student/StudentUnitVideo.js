import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Button, 
  CircularProgress, 
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Breadcrumbs,
  Link,
  Paper,
  Chip,
  Alert
} from '@mui/material';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { formatVideoUrl, formatDuration } from '../../utils/videoUtils';
import CustomVideoPlayer from '../../components/student/CustomVideoPlayer';
import { getCourseUnits, updateWatchHistory } from '../../api/studentVideoApi';

// Icons
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const StudentUnitVideo = () => {
  const { courseId, unitId, videoId } = useParams();
  const token = localStorage.getItem('token');
  
  const [course, setCourse] = useState(null);
  const [unit, setUnit] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isUpdatingVideoState, setIsUpdatingVideoState] = useState(false);
  
  useEffect(() => {
    const fetchUnitAndVideos = async () => {
      try {
        setLoading(true);
        
        // Fetch units for this course
        const unitsResponse = await getCourseUnits(courseId, token);
        
        // Find the specific unit
        const currentUnit = unitsResponse.find(u => u._id === unitId);
        
        if (!currentUnit) {
          setError('Unit not found or you do not have access to this unit.');
          setLoading(false);
          return;
        }
        
        // Set course data
        if (currentUnit.course) {
          setCourse({
            _id: currentUnit.course._id,
            title: currentUnit.course.title,
            courseCode: currentUnit.course.courseCode
          });
        }
        
        setUnit(currentUnit);
        setVideos(currentUnit.videos || []);
        
        // If videoId is provided, set current video
        if (videoId && currentUnit.videos) {
          const videoToPlay = currentUnit.videos.find(v => v._id === videoId);
          if (videoToPlay) {
            setCurrentVideo(videoToPlay);
            
            // Record initial video watch (don't override position)
            updateWatchHistory(videoId, {
              timeSpent: 0.1, // Use 0.1 instead of 0 to pass backend validation
              duration: videoToPlay.duration
              // Don't send currentTime: 0 - let the backend keep existing position
            }, token).catch(err => {
              console.error('Error recording initial video watch:', err);
            });
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching unit videos:', err);
        setError('Failed to load unit videos. Please try again.');
        setLoading(false);
      }
    };
    
    if (token && courseId && unitId) {
      fetchUnitAndVideos();
    }
  }, [token, courseId, unitId, videoId]);
  
  const handlePlayVideo = (video) => {
    setCurrentVideo(video);
    
    // Update URL to include videoId without reloading
    window.history.pushState(
      {}, 
      '', 
      `/student/course/${courseId}/unit/${unitId}/video/${video._id}`
    );
    
    // Record initial video watch event
    try {
      if (!token) {
        console.warn('Cannot update watch history: Token is missing');
        return;
      }
      
      updateWatchHistory(video._id, {
        timeSpent: 0.1, // Use 0.1 instead of 0 to pass backend validation
        duration: video.duration
        // Don't send currentTime: 0 - let the backend keep existing position
      }, token);
    } catch (err) {
      console.error('Error recording video watch:', err);
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/courses" color="inherit">
          My Courses
        </Link>
        <Link component={RouterLink} to={`/student/course/${courseId}/units`} color="inherit">
          Course Units
        </Link>
        <Typography color="text.primary">Unit Videos</Typography>
      </Breadcrumbs>
      
      <Button
        component={RouterLink}
        to={`/student/course/${courseId}/units`}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Back to Units
      </Button>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : !unit ? (
        <Typography variant="body1">
          Unit not found or you don't have access to this unit.
        </Typography>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            {unit.title}
          </Typography>
          
          {course && (
            <Typography variant="subtitle1" color="text.secondary" paragraph>
              Course: {course.title} ({course.courseCode})
            </Typography>
          )}
          
          <Grid container spacing={4}>
            {/* Current/Selected Video Player */}
            {currentVideo && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    {currentVideo.title}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <CustomVideoPlayer 
                      videoId={currentVideo._id}
                      videoUrl={currentVideo.videoUrl.startsWith('http') ? currentVideo.videoUrl : formatVideoUrl(currentVideo.videoUrl)}
                      title={currentVideo.title}
                      token={token}
                      onTimeUpdate={(currentTime, duration) => {
                        // Update the local duration if different from what's stored
                        if (duration > 0 && Math.abs(currentVideo.duration - duration) > 1) {
                          console.log(`Updating video duration in parent: ${duration}s`);
                          setCurrentVideo(prev => ({
                            ...prev,
                            duration: duration
                          }));
                        }
                      }}
                      onVideoComplete={(videoId) => {
                        console.log(`Video ${videoId} completed - refreshing videos list`);
                        
                        // Prevent multiple state updates by checking if we're already updating
                        if (isUpdatingVideoState) {
                          console.log('Already updating video state, ignoring duplicate completion event');
                          return;
                        }
                        
                        // Set flag to prevent duplicate updates
                        setIsUpdatingVideoState(true);
                        
                        // Force update of completed video state
                        setCurrentVideo(prev => ({
                          ...prev,
                          watched: true
                        }));
                        
                        // Update the videos list to mark this video as watched
                        setVideos(prevVideos => {
                          return prevVideos.map(video => {
                            if (video._id === videoId) {
                              // Mark this specific video as watched
                              return { 
                                ...video, 
                                watched: true,
                                // Store the completion time for analytics
                                completedAt: new Date().toISOString()
                              };
                            }
                            return video;
                          });
                        });
                        
                        // Reset the update flag after a delay to allow for future updates
                        setTimeout(() => {
                          setIsUpdatingVideoState(false);
                        }, 1000);
                      }}
                    />
                  </Box>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Your progress is automatically tracked while watching. You cannot skip ahead in the video, but you can adjust the playback speed and use full-screen mode.
                  </Alert>
                  
                  <Typography variant="body1" paragraph>
                    {currentVideo.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      icon={<AccessTimeIcon />} 
                      label={`Duration: ${formatDuration(currentVideo.duration)}`} 
                    />
                    
                    {currentVideo.watched && (
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        color="success" 
                        label="Watched" 
                      />
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}
            
            {/* Video List */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Unit Videos ({videos.length})
              </Typography>
              
              {videos.length === 0 ? (
                <Typography variant="body1">
                  No videos available for this unit yet.
                </Typography>
              ) : (
                <List sx={{ bgcolor: 'background.paper' }}>
                  {videos.map((video, index) => (
                    <React.Fragment key={video._id}>
                      <ListItem 
                        alignItems="flex-start"
                        sx={{ 
                          cursor: 'pointer',
                          bgcolor: currentVideo && currentVideo._id === video._id ? 'action.selected' : 'inherit',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                        onClick={() => handlePlayVideo(video)}
                      >
                        <ListItemIcon>
                          {video.watched ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <PlayCircleOutlineIcon color="primary" />
                          )}
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1">
                              {index + 1}. {video.title}
                              {video.watched && (
                                <Chip 
                                  size="small" 
                                  label="Watched" 
                                  color="success" 
                                  sx={{ ml: 1 }} 
                                />
                              )}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                Duration: {formatDuration(video.duration || 0)}
                              </Typography>
                              
                              {/* Add progress bar for each video */}
                              {video.duration > 0 && (
                                <Box sx={{ mt: 1, mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Progress: {Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%
                                  </Typography>
                                  <Box sx={{ width: '100%', mr: 1 }}>
                                    <Box
                                      sx={{
                                        width: '100%',
                                        height: 8,
                                        bgcolor: 'grey.300',
                                        borderRadius: 5,
                                        position: 'relative'
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          height: '100%',
                                          borderRadius: 5,
                                          bgcolor: video.watched ? 'success.main' : 'primary.main',
                                          width: `${Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%`,
                                          transition: 'width 0.5s ease-in-out'
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                </Box>
                              )}
                              
                              {video.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {video.description.substring(0, 100)}
                                  {video.description.length > 100 ? '...' : ''}
                                </Typography>
                              )}
                            </>
                          }
                        />
                        
                        <Button 
                          variant="outlined" 
                          color="primary" 
                          size="small"
                          sx={{ mt: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayVideo(video);
                          }}
                        >
                          {video.watched ? 'Rewatch' : 'Watch'}
                        </Button>
                      </ListItem>
                      
                      {index < videos.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default StudentUnitVideo;
