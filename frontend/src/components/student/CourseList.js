import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, LinearProgress, Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { getStudentCourses } from '../../api/studentVideoApi';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ForumIcon from '@mui/icons-material/Forum';

// Helper function to format duration in seconds to a readable time format
const formatDuration = (seconds) => {
  if (!seconds) return '0m';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const CourseList = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const data = await getStudentCourses(token);
        setCourses(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchCourses();
    }
  }, [token]);
  
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
  
  if (!courses || courses.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>You are not enrolled in any courses</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>My Courses</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Track your progress and continue learning across all your enrolled courses.
      </Typography>
      
      <Grid container spacing={3}>
        {courses.map((course) => (
          <Grid item xs={12} md={6} key={course._id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {course.title}
                </Typography>
                
                {course.courseCode && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Course Code: {course.courseCode}
                  </Typography>
                )}
                
                {course.progress !== undefined && (
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Course Progress
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={course.progress} 
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                )}
                
                {course.videosCompleted !== undefined && course.totalVideos !== undefined && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {course.videosCompleted} of {course.totalVideos} videos completed
                  </Typography>
                )}
                
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Videos: {course.totalVideos || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Duration: {formatDuration(course.totalDuration || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teacher: {course.teacher || 'Not assigned'}
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    component={Link}
                    to={`/student/course/${course._id}/progress`}
                    startIcon={<AssessmentIcon />}
                    size="small"
                  >
                    Progress
                  </Button>
                  
                  <Button 
                    variant="contained" 
                    color="primary"
                    component={Link}
                    to={`/student/course/${course._id}/units`}
                    startIcon={<PlayCircleOutlineIcon />}
                    size="small"
                  >
                    Watch Videos
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    color="info"
                    component={Link}
                    to={`/student/course/${course._id}/discussions`}
                    startIcon={<ForumIcon />}
                    size="small"
                  >
                    Discussions
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default CourseList;
