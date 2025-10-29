import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  School as SchoolIcon,
  MenuBook as CourseIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const HODDepartmentAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartmentAnalytics();
  }, []);

  const fetchDepartmentAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        '/api/hod-analytics/department-analytics',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Department Analytics Response:', response.data);
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching department analytics:', err);
      setError(err.response?.data?.message || 'Failed to fetch department analytics');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (color) => {
    switch (color) {
      case 'green':
        return '#4caf50';
      case 'yellow':
        return '#ff9800';
      case 'red':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const handleViewCourse = (courseId) => {
    // Navigate to course analytics with pre-selected course
    navigate('/hod/course-analytics', { state: { courseId } });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No analytics data available
      </Alert>
    );
  }

  const { department, totalCourses, courses } = analytics;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Department Analytics
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {department.name} - {department.school?.name || 'N/A'}
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Courses
                  </Typography>
                  <Typography variant="h4">
                    {totalCourses}
                  </Typography>
                </Box>
                <CourseIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Students
                  </Typography>
                  <Typography variant="h4">
                    {courses.reduce((sum, course) => sum + course.totalStudents, 0)}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Sections
                  </Typography>
                  <Typography variant="h4">
                    {courses.reduce((sum, course) => sum + course.sections, 0)}
                  </Typography>
                </Box>
                <SchoolIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Avg Progress
                  </Typography>
                  <Typography variant="h4">
                    {courses.length > 0 
                      ? (courses.reduce((sum, course) => sum + course.averageProgress, 0) / courses.length).toFixed(1)
                      : 0}%
                  </Typography>
                </Box>
                <AssessmentIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Courses Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Course Code</strong></TableCell>
                <TableCell><strong>Course Title</strong></TableCell>
                <TableCell align="center"><strong>Sections</strong></TableCell>
                <TableCell align="center"><strong>Students</strong></TableCell>
                <TableCell><strong>Teachers</strong></TableCell>
                <TableCell align="center"><strong>Videos</strong></TableCell>
                <TableCell align="center"><strong>Quizzes</strong></TableCell>
                <TableCell><strong>Average Progress</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="text.secondary">
                      No courses found in this department
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.courseId} hover>
                    <TableCell>
                      <Chip 
                        label={course.courseCode} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {course.courseTitle}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={course.sections} 
                        size="small" 
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={course.totalStudents} 
                        size="small" 
                        color="success"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        {course.teachers.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No teachers assigned
                          </Typography>
                        ) : (
                          course.teachers.map((teacher, index) => (
                            <Typography 
                              key={teacher.id} 
                              variant="body2"
                              sx={{ fontSize: '0.875rem' }}
                            >
                              {teacher.name}
                              {index < course.teachers.length - 1 && ', '}
                            </Typography>
                          ))
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {course.totalVideos || 0}
                    </TableCell>
                    <TableCell align="center">
                      {course.totalQuizzes || 0}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 200 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                          <Typography 
                            variant="body2" 
                            fontWeight="600"
                            sx={{ color: getProgressColor(course.progressColor) }}
                          >
                            {course.averageProgress.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={course.averageProgress} 
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getProgressColor(course.progressColor),
                              borderRadius: 4,
                            }
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View detailed analytics">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewCourse(course.courseId)}
                          color="primary"
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default HODDepartmentAnalytics;
