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
import { Link } from 'react-router-dom';
import { getTeacherForums } from '../../api/teacherApi';
import ForumIcon from '@mui/icons-material/Forum';
import SchoolIcon from '@mui/icons-material/School';

const ForumsList = ({ token, user }) => {
  const [loading, setLoading] = useState(true);
  const [forums, setForums] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchForums = async () => {
      try {
        setLoading(true);
        const data = await getTeacherForums(token);
        setForums(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching forums:', err);
        setError('Failed to load forums');
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchForums();
    }
  }, [token]);
  
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
  
  if (!forums || forums.length === 0) {
    return (
      <Container>
        <Typography variant="h5" gutterBottom>Discussion Forums</Typography>
        <Alert severity="info">
          There are no active discussion forums for your courses.
        </Alert>
      </Container>
    );
  }
  
  // Group forums by course
  const forumsByCourse = forums.reduce((acc, forum) => {
    const courseId = forum.courseId;
    if (!acc[courseId]) {
      acc[courseId] = {
        courseTitle: forum.courseTitle || 'Unknown Course',
        forums: []
      };
    }
    acc[courseId].forums.push(forum);
    return acc;
  }, {});
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>Discussion Forums</Typography>
        <Typography color="text.secondary" gutterBottom>
          View and respond to student questions in your course forums
        </Typography>
      </Box>
      
      {Object.entries(forumsByCourse).map(([courseId, courseData]) => (
        <Box key={courseId} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SchoolIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">{courseData.courseTitle}</Typography>
          </Box>
          
          <Grid container spacing={2}>
            {courseData.forums.map((forum) => (
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
        </Box>
      ))}
    </Container>
  );
};

export default ForumsList;
