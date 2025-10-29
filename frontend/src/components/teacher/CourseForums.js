import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Button,
  Alert,
  Container,
  Chip,
  Divider
} from '@mui/material';
import { useParams, Link } from 'react-router-dom';
import { getCourseForums } from '../../api/teacherApi';
import ForumIcon from '@mui/icons-material/Forum';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const CourseForums = ({ token, user }) => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [forums, setForums] = useState([]);
  const [error, setError] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  
  useEffect(() => {
    const fetchForums = async () => {
      try {
        setLoading(true);
        const data = await getCourseForums(courseId, token);
        setForums(data.forums || []);
        setCourseTitle(data.courseTitle || 'Course');
        setError(null);
      } catch (err) {
        console.error('Error fetching forums:', err);
        setError('Failed to load forums');
      } finally {
        setLoading(false);
      }
    };
    
    if (courseId && token) {
      fetchForums();
    }
  }, [courseId, token]);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Container>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="text" 
          component={Link} 
          to="/teacher/forums"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          All Forums
        </Button>
        <Typography variant="h5">{courseTitle}: Discussion Forums</Typography>
      </Box>
      
      {forums.length === 0 ? (
        <Alert severity="info">
          There are no discussion forums for this course yet.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {forums.map((forum) => (
            <Grid item xs={12} key={forum._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div">
                      {forum.title}
                    </Typography>
                    <Chip 
                      size="small"
                      label={forum.isResolved ? 'Resolved' : 'Open'} 
                      color={forum.isResolved ? 'success' : 'warning'}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Started by {forum.createdBy?.name || 'Unknown'} on {formatDate(forum.createdAt)}
                  </Typography>
                  
                  {forum.description && (
                    <Typography variant="body2" paragraph>
                      {forum.description.length > 150 
                        ? `${forum.description.substring(0, 150)}...` 
                        : forum.description
                      }
                    </Typography>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {forum.repliesCount || 0} {forum.repliesCount === 1 ? 'reply' : 'replies'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last activity: {forum.lastActivityAt ? formatDate(forum.lastActivityAt) : 'Never'}
                      </Typography>
                    </Box>
                    
                    <Button 
                      variant="contained" 
                      color="primary"
                      component={Link}
                      to={`/teacher/forum/${forum._id}`}
                      startIcon={<ForumIcon />}
                    >
                      View Discussion
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default CourseForums;
