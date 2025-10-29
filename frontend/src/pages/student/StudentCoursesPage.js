import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  CircularProgress, 
  Box,
  LinearProgress,
  Divider,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';

const StudentCoursesPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/student/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCourses(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again.');
        setLoading(false);
      }
    };
    
    if (token) {
      fetchCourses();
    }
  }, [token]);
  
  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Typography color="text.primary">My Courses</Typography>
      </Breadcrumbs>
      
      <Typography variant="h4" gutterBottom>
        My Courses
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : courses.length === 0 ? (
        <Typography variant="body1">
          You don't have any courses assigned yet. Please contact your administrator.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {courses.map((course) => (
            <Grid item xs={12} sm={6} md={4} key={course._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {course.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Course Code: {course.courseCode}
                  </Typography>
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Progress:
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={course.progress || 0} 
                        sx={{ height: 8, borderRadius: 5 }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {`${course.progress || 0}%`}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Videos:</strong> {course.videoCount || course.totalVideos || 0}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Videos Started:</strong> {course.videosStarted || 0}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Duration:</strong> {course.totalDuration > 0 ? formatDuration(course.totalDuration) : 'Not calculated'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Teacher:</strong> {course.teacherName || 'Not assigned'}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary"
                    onClick={() => navigate(`/student/course/${course._id}/videos`)}
                  >
                    View Videos
                  </Button>
                  <Button 
                    size="small" 
                    color="secondary"
                    onClick={() => navigate(`/student/course/${course._id}/progress`)}
                  >
                    View Progress
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default StudentCoursesPage;
