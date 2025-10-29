import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Button, 
  List, 
  ListItem, 
  ListItemText,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TeacherCourses = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeacherCourses = async () => {
      try {
        const response = await axios.get('/api/teacher/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourses(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching teacher courses:', err);
        setError('Failed to load courses. Please try again later.');
        setLoading(false);
      }
    };

    if (token) {
      fetchTeacherCourses();
    }
  }, [token]);

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        My Courses
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        View and manage your assigned courses
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        <Paper sx={{ p: 3, mt: 3 }}>
          {courses.length === 0 ? (
            <Typography>No courses assigned yet.</Typography>
          ) : (
            <List>
              {courses.map((course, index) => (
                <React.Fragment key={course._id}>
                  {index > 0 && <Divider />}
                  <ListItem sx={{ py: 2 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6">{course.title}</Typography>
                          {course.coordinatorOnly && (
                            <Box component="span" sx={{ ml: 1, px: 1, py: 0.25, bgcolor: 'warning.light', color: 'warning.dark', borderRadius: 1, fontSize: 12 }}>
                              Coordinator
                            </Box>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Course Code: {course.courseCode}
                          </Typography>
                          {course.coordinators && course.coordinators.length > 0 && (
                            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                              Coordinator{course.coordinators.length > 1 ? 's' : ''}: {course.coordinators.map(cc => cc.name || cc.email || cc.uid || cc.teacherId).join(', ')}
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {course.description || 'No description available.'}
                          </Typography>
                        </Box>
                      }
                    />
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={() => navigate(`/teacher/course/${course._id}`)}
                      sx={{ ml: 2 }}
                    >
                      View Course
                    </Button>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}
    </div>
  );
};

export default TeacherCourses;
