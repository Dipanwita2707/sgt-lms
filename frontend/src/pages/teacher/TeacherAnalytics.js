import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const TeacherAnalytics = ({ viewType = 'course' }) => {
  const token = localStorage.getItem('token');
  // Initialize tab based on viewType
  const initialTabValue = viewType === 'student' ? 1 : viewType === 'course' ? 2 : 0;
  const [tabValue, setTabValue] = useState(initialTabValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalStudents: 0,
      totalCourses: 0,
      totalVideos: 0,
      averageWatchTime: 0
    },
    trends: {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      enrollments: [0, 0, 0, 0, 0, 0],
      watchTime: [0, 0, 0, 0, 0, 0]
    },
    courseAnalytics: {
      studentCount: 0,
      videoCount: 0,
      videoCompletionRate: 0,
      videosWatchTime: {
        labels: [],
        data: []
      }
    }
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Fetch courses first
        const coursesResponse = await axios.get('/api/teacher/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourses(coursesResponse.data);
        
        if (coursesResponse.data.length > 0) {
          setSelectedCourse(coursesResponse.data[0]._id);
        }
        
        // Fetch analytics overview
        const overviewResponse = await axios.get('/api/teacher/analytics/overview', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Fetch enrollment trends
        const trendsResponse = await axios.get('/api/teacher/analytics/trends', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Combine data
        setAnalyticsData({
          overview: overviewResponse.data,
          trends: trendsResponse.data,
          courseAnalytics: {
            studentCount: 0,
            videoCount: 0,
            videoCompletionRate: 0,
            videosWatchTime: {
              labels: [],
              data: []
            }
          }
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
        setLoading(false);
      }
    };
    
    if (token) {
      fetchAnalyticsData();
    }
  }, [token]);
  
  useEffect(() => {
    const fetchCourseAnalytics = async () => {
      if (!selectedCourse) return;
      
      try {
        setLoading(true);
        console.log('Fetching course analytics for course ID:', selectedCourse);
        
        // Fetch course-specific analytics
        const courseAnalyticsResponse = await axios.get(`/api/teacher/analytics/course/${selectedCourse}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Course analytics response:', courseAnalyticsResponse.data);
        
        setAnalyticsData(prev => ({
          ...prev,
          courseAnalytics: courseAnalyticsResponse.data
        }));
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course analytics:', err);
        console.error('Error details:', err.response?.data || err.message);
        setError('Failed to load course analytics. Please try again later.');
        setLoading(false);
      }
    };
    
    if (token && selectedCourse) {
      fetchCourseAnalytics();
    }
  }, [token, selectedCourse]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
  };
  
  // Chart data for enrollment trends
  const enrollmentTrendsData = {
    labels: analyticsData?.trends?.months || [],
    datasets: [
      {
        label: 'Student Enrollments',
        data: analyticsData?.trends?.enrollments || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      }
    ],
  };
  
  // Chart data for watch time trends
  const watchTimeTrendsData = {
    labels: analyticsData?.trends?.months || [],
    datasets: [
      {
        label: 'Watch Time (hours)',
        data: analyticsData?.trends?.watchTime || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      }
    ],
  };
  
  // Chart data for video watch time by video
  const videoWatchTimeData = {
    labels: analyticsData?.courseAnalytics?.videosWatchTime?.labels || [],
    datasets: [
      {
        label: 'Average Watch Time (minutes)',
        data: analyticsData?.courseAnalytics?.videosWatchTime?.data || [],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      }
    ],
  };
  
  // Chart data for completion rate
  const completionRateData = {
    labels: ['Completed', 'Not Completed'],
    datasets: [
      {
        data: [
          analyticsData?.courseAnalytics?.videoCompletionRate || 0, 
          100 - (analyticsData?.courseAnalytics?.videoCompletionRate || 0)
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        {viewType === 'student' ? 'Student Analytics' : viewType === 'course' ? 'Course Analytics' : 'Analytics Dashboard'}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        {viewType === 'student' 
          ? 'View detailed student performance and engagement statistics' 
          : viewType === 'course' 
            ? 'View detailed course performance and engagement statistics'
            : 'View statistics and insights about your courses and students'}
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Overview" />
              <Tab label="Student Analytics" />
              <Tab label="Course Analytics" />
            </Tabs>
            
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Total Students
                      </Typography>
                      <Typography variant="h3">
                        {analyticsData?.overview?.totalStudents || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Total Courses
                      </Typography>
                      <Typography variant="h3">
                        {analyticsData?.overview?.totalCourses || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Total Videos
                      </Typography>
                      <Typography variant="h3">
                        {analyticsData?.overview?.totalVideos || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Avg. Watch Time
                      </Typography>
                      <Typography variant="h3">
                        {analyticsData?.overview?.averageWatchTime || 0}
                        <Typography component="span" variant="h5">min</Typography>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Enrollment Trends
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <Line 
                          data={enrollmentTrendsData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Watch Time Trends
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <Line 
                          data={watchTimeTrendsData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Student Enrollment Trends
                      </Typography>
                      <Box sx={{ height: 400 }}>
                        <Line 
                          data={enrollmentTrendsData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Number of Enrollments'
                                }
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'Month'
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Watch Time Trends
                      </Typography>
                      <Box sx={{ height: 400 }}>
                        <Line 
                          data={watchTimeTrendsData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Hours Watched'
                                }
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'Month'
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel id="course-select-label">Select Course</InputLabel>
                  <Select
                    labelId="course-select-label"
                    value={selectedCourse}
                    label="Select Course"
                    onChange={handleCourseChange}
                  >
                    {courses.map((course) => (
                      <MenuItem key={course._id} value={course._id}>
                        {course.title} ({course.courseCode})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Students
                      </Typography>
                      <Typography variant="h3">
                        {analyticsData?.courseAnalytics?.studentCount || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Videos
                      </Typography>
                      <Typography variant="h3">
                        {analyticsData?.courseAnalytics?.videoCount || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Video Completion Rate
                      </Typography>
                      <Typography variant="h3">
                        {analyticsData?.courseAnalytics?.videoCompletionRate || 0}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Video Watch Time
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <Bar 
                          data={videoWatchTimeData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Minutes Watched'
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Video Completion
                      </Typography>
                      <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Pie 
                          data={completionRateData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Box>
      )}
    </div>
  );
};

export default TeacherAnalytics;
