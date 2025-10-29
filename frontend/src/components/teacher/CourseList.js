import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Button, Alert, Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import { getTeacherCourses } from '../../api/teacherApi';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import GroupIcon from '@mui/icons-material/Group';

const CourseList = ({ token, user }) => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);
  
  // Check user permissions
  const canManageVideos = user?.permissions?.includes('Manage Videos');
  const canManageStudents = user?.permissions?.includes('Manage Students');
  
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const data = await getTeacherCourses(token);
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
        <Typography>You are not assigned to any courses</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>My Courses</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage your assigned courses and student progress.
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
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {course.description || 'No description available'}
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, mb: 3 }}>
                  {course.studentsCount !== undefined && (
                    <Chip 
                      icon={<GroupIcon />} 
                      label={`${course.studentsCount} Students`} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  )}
                  {course.videosCount !== undefined && (
                    <Chip 
                      icon={<VideoLibraryIcon />} 
                      label={`${course.videosCount} Videos`} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    component={Link}
                    to={`/teacher/course/${course._id}/videos`}
                    startIcon={<VideoLibraryIcon />}
                  >
                    Videos
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    color="primary"
                    component={Link}
                    to={`/teacher/course/${course._id}/students`}
                    startIcon={<GroupIcon />}
                    disabled={!canManageStudents}
                  >
                    Students
                  </Button>
                </Box>
                
                {canManageVideos && (
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      component={Link}
                      to="/teacher/videos/upload"
                      startIcon={<VideoLibraryIcon />}
                      fullWidth
                    >
                      Upload New Video
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default CourseList;
