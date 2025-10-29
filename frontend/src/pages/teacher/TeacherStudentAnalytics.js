import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, Divider, 
  TextField, Button, CircularProgress, Tabs, Tab, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Autocomplete, IconButton, Tooltip, Select, MenuItem, FormControl,
  List, ListItem, ListItemText, ListItemIcon, Alert, Avatar, Chip
} from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
  AreaChart, Area
} from 'recharts';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BarChartIcon from '@mui/icons-material/BarChart';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { formatTime } from '../../utils/timeUtils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A020F0', '#4CAF50', '#E91E63', '#9C27B0'];

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function TeacherStudentAnalytics({ token, user }) {
  const { studentId } = useParams();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [enrollmentTrends, setEnrollmentTrends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSearchResult, setStudentSearchResult] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  // Use the token prop instead of getting it from localStorage
  const authToken = token || localStorage.getItem('token');

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const savedSearches = localStorage.getItem('recentStudentSearches');
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
      // If there's an error, clear localStorage item
      localStorage.removeItem('recentStudentSearches');
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, trendsRes, coursesRes] = await Promise.all([
          axios.get('/api/teacher/analytics/overview', { 
            headers: { Authorization: `Bearer ${authToken}` } 
          }),
          axios.get('/api/teacher/analytics/trends', { 
            headers: { Authorization: `Bearer ${authToken}` } 
          }),
          axios.get('/api/teacher/courses', { 
            headers: { Authorization: `Bearer ${authToken}` } 
          }),
        ]);
        
        setOverview(overviewRes.data);
        setEnrollmentTrends(trendsRes.data);
        setCourses(coursesRes.data);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [authToken]);

  // Load student data if studentId is provided in URL
  useEffect(() => {
    if (studentId) {
      const fetchStudentData = async () => {
        setLoading(true);
        setError(null);
        try {
          // First get basic student info
          const studentRes = await axios.get(`/api/teacher/analytics/student/${studentId}/detailed`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
          setSelectedStudent(studentRes.data.student);
          setStudentAnalytics(studentRes.data.analytics);
          setTabValue(2); // Switch to student tab
          
          // Update URL to maintain consistency - only if coming from older route format
          if (window.location.pathname.includes('/student-analytics/')) {
            navigate(`/teacher/student/${studentId}/analytics`, { replace: true });
          }
        } catch (error) {
          console.error('Error fetching student data:', error);
          setError('Failed to load student data. Please try again later.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchStudentData();
    }
  }, [studentId, authToken, navigate]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Add state for recent searches
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Search for student by registration number
  const handleStudentSearch = async () => {
    if (!searchQuery) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/teacher/analytics/student?regNo=${searchQuery}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      setStudentSearchResult(response.data);
      setSelectedStudent(response.data);
      
      // Fetch detailed analytics for this student
      const detailedRes = await axios.get(`/api/teacher/analytics/student/${response.data._id}/detailed`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      setStudentAnalytics(detailedRes.data.analytics);
      
      // Add to recent searches if not already in the list
      if (!recentSearches.some(s => s._id === response.data._id)) {
        setRecentSearches(prev => {
          const updated = [response.data, ...prev].slice(0, 5); // Keep only 5 most recent
          localStorage.setItem('recentStudentSearches', JSON.stringify(updated));
          return updated;
        });
      }
      
      // Update URL to reflect the selected student
      navigate(`/teacher/student/${response.data._id}/analytics`, { replace: true });
    } catch (error) {
      console.error('Error searching for student:', error);
      setStudentSearchResult(null);
      setError('Student not found or error retrieving data. Please check the registration number and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch course analytics
  const fetchCourseAnalytics = async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/teacher/analytics/course/${courseId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setCourseAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching course analytics:', error);
      setCourseAnalytics(null);
      setError('Failed to load course analytics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Dashboard Overview Section
  const renderOverviewSection = () => {
    if (!overview) return <CircularProgress />;
    
    return (
      <Grid container spacing={3}>
        {/* Metrics Cards */}
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(25, 118, 210, 0.12)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 12px 20px rgba(25, 118, 210, 0.2)'
            }
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                p: 2.5,
                background: 'linear-gradient(135deg, #bbdefb 0%, #e3f2fd 100%)'
              }}>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(25, 118, 210, 0.8)', 
                      borderRadius: '12px', 
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 8px rgba(25, 118, 210, 0.25)',
                      mr: 2
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 36, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="#1976d2">{overview.studentCount || overview.totalStudents || 0}</Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 500 }}>Total Students</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(56, 142, 60, 0.12)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 12px 20px rgba(56, 142, 60, 0.2)'
            }
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                p: 2.5,
                background: 'linear-gradient(135deg, #c8e6c9 0%, #e8f5e9 100%)'
              }}>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(56, 142, 60, 0.8)', 
                      borderRadius: '12px', 
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 8px rgba(56, 142, 60, 0.25)',
                      mr: 2
                    }}
                  >
                    <SchoolIcon sx={{ fontSize: 36, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="#388e3c">{overview.courseCount || overview.totalCourses || 0}</Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 500 }}>My Courses</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(245, 124, 0, 0.12)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 12px 20px rgba(245, 124, 0, 0.2)'
            }
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                p: 2.5,
                background: 'linear-gradient(135deg, #ffe082 0%, #fff8e1 100%)'
              }}>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(245, 124, 0, 0.8)', 
                      borderRadius: '12px', 
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 8px rgba(245, 124, 0, 0.25)',
                      mr: 2
                    }}
                  >
                    <OndemandVideoIcon sx={{ fontSize: 36, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="#f57c00">{overview.videoCount || overview.totalVideos || 0}</Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 500 }}>Total Videos</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 16px rgba(123, 31, 162, 0.12)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 12px 20px rgba(123, 31, 162, 0.2)'
            }
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                p: 2.5,
                background: 'linear-gradient(135deg, #e1bee7 0%, #f3e5f5 100%)'
              }}>
                <Box display="flex" alignItems="center">
                  <Box 
                    sx={{ 
                      bgcolor: 'rgba(123, 31, 162, 0.8)', 
                      borderRadius: '12px', 
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 8px rgba(123, 31, 162, 0.25)',
                      mr: 2
                    }}
                  >
                    <AccessTimeIcon sx={{ fontSize: 36, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="#7b1fa2">{overview.averageWatchTime || 0}</Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 500 }}>Avg. Watch Time (min)</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Enrollment Trends Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            height: '100%',
            overflow: 'hidden'
          }}>
            <Typography 
              variant="h6" 
              mb={2.5} 
              sx={{ 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center',
                color: '#3f51b5'
              }}
            >
              <CalendarTodayIcon sx={{ mr: 1.5, color: '#3f51b5' }} />
              Student Enrollment Trends
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart 
                data={enrollmentTrends && enrollmentTrends.months 
                  ? enrollmentTrends.months.map((month, index) => ({
                      name: month,
                      enrollments: enrollmentTrends.enrollments[index] || 0
                    }))
                  : []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#666', fontSize: 12 }}
                  axisLine={{ stroke: '#ccc' }}
                />
                <YAxis 
                  tick={{ fill: '#666', fontSize: 12 }}
                  axisLine={{ stroke: '#ccc' }}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                    padding: '10px 14px'
                  }} 
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: 10
                  }}
                  formatter={(value) => <span style={{ color: '#666', fontWeight: 500 }}>{value}</span>}
                />
                <Area 
                  type="monotone" 
                  dataKey="enrollments" 
                  name="Student Enrollments"
                  stroke="#8884d8" 
                  strokeWidth={3} 
                  fillOpacity={1}
                  fill="url(#enrollmentGradient)"
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#6366f1' }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Watch Time Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            height: '100%',
            overflow: 'hidden'
          }}>
            <Typography 
              variant="h6" 
              mb={2.5} 
              sx={{ 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center',
                color: '#4caf50'
              }}
            >
              <AccessTimeIcon sx={{ mr: 1.5, color: '#4caf50' }} />
              Monthly Watch Time (hours)
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart 
                data={enrollmentTrends && enrollmentTrends.months 
                  ? enrollmentTrends.months.map((month, index) => ({
                      name: month,
                      watchTime: enrollmentTrends.watchTime[index] || 0
                    }))
                  : []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="watchTimeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#666', fontSize: 12 }}
                  axisLine={{ stroke: '#ccc' }}
                />
                <YAxis 
                  tick={{ fill: '#666', fontSize: 12 }}
                  axisLine={{ stroke: '#ccc' }}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                    padding: '10px 14px'
                  }}
                />
                <Bar 
                  dataKey="watchTime" 
                  name="Watch Time (hours)"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  fill="url(#watchTimeGradient)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // Course Analytics Section
  const renderCourseAnalyticsSection = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Course Analytics</Typography>
        
        {/* Course Selection */}
        <Box mb={4} display="flex" gap={2}>
          <Autocomplete
            id="course-select"
            options={courses || []}
            getOptionLabel={(option) => `${option.title} (${option.courseCode || 'No Code'})`}
            sx={{ width: 300 }}
            renderInput={(params) => <TextField {...params} label="Select Course" />}
            onChange={(event, newValue) => {
              setSelectedCourse(newValue);
              if (newValue) {
                fetchCourseAnalytics(newValue._id);
              } else {
                setCourseAnalytics(null);
              }
            }}
          />
        </Box>
        
        {loading && <CircularProgress />}
        
        {!loading && courseAnalytics && (
          <Box>
            <Typography variant="h5" gutterBottom>
              {selectedCourse?.title || 'Course'} ({selectedCourse?.courseCode || ''})
            </Typography>
            
            {/* Course Summary Cards */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Total Students</Typography>
                    <Typography variant="h4">{courseAnalytics.studentCount || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Total Videos</Typography>
                    <Typography variant="h4">{courseAnalytics.videoCount || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Video Completion Rate</Typography>
                    <Typography variant="h4">{courseAnalytics.videoCompletionRate || 0}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Video Watch Time Chart */}
            <Typography variant="h6" gutterBottom>Video Watch Statistics</Typography>
            <Box mb={4}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={courseAnalytics.videosWatchTime?.labels?.map((label, index) => ({
                    name: label,
                    watchTime: courseAnalytics.videosWatchTime.data[index] || 0
                  })) || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                  />
                  <YAxis label={{ value: 'Watch Time (minutes)', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip />
                  <Bar dataKey="watchTime" name="Watch Time (minutes)" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            
            {/* Student list would go here - this would be implemented by the backend in a real application */}
            <Typography variant="h6" gutterBottom>Course Students</Typography>
            <Typography variant="body2" color="textSecondary">
              Select a student to see their detailed analytics.
            </Typography>
          </Box>
        )}
        
        {!loading && !courseAnalytics && !selectedCourse && (
          <Typography variant="body1" color="textSecondary" align="center" mt={4}>
            Please select a course to view analytics
          </Typography>
        )}
      </Box>
    );
  };

  // Student Analytics Section
  const renderStudentAnalyticsSection = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Student Analytics</Typography>
        
        {/* Student Search with Autocomplete */}
        <Box mb={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, #f5f7ff 0%, #eef1ff 100%)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.07)'
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                mb: 2, 
                fontWeight: 600, 
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <PersonSearchIcon sx={{ mr: 1.5 }} />
              Find Student
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Autocomplete
                  freeSolo
                  options={recentSearches}
                  getOptionLabel={(option) => {
                    // Handle both string inputs and student objects
                    if (typeof option === 'string') {
                      return option;
                    }
                    return `${option.regNo} - ${option.name}`;
                  }}
                  renderOption={(props, option) => (
                    <Box 
                      component="li" 
                      {...props} 
                      sx={{ 
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(99, 102, 241, 0.08)'
                        }
                      }}
                    >
                      <Box display="flex" alignItems="center" py={0.8}>
                        <Avatar 
                          sx={{ 
                            mr: 2, 
                            bgcolor: '#6366f1',
                            width: 40,
                            height: 40,
                            fontWeight: 600,
                            fontSize: '1rem'
                          }}
                        >
                          {option.name?.substring(0, 2).toUpperCase() || 'ST'}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>{option.name}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            <Box component="span" sx={{ 
                              bgcolor: 'rgba(99, 102, 241, 0.1)', 
                              color: '#4f46e5',
                              py: 0.3,
                              px: 1,
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              {option.regNo}
                            </Box>
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search by Registration Number"
                      variant="outlined"
                      fullWidth
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        ...params.InputProps,
                        sx: {
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(99, 102, 241, 0.2)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(99, 102, 241, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#6366f1',
                            borderWidth: '1px',
                          },
                        }
                      }}
                    />
                  )}
                  onChange={(event, newValue) => {
                    if (newValue && typeof newValue !== 'string') {
                      // If a student object is selected
                      setSearchQuery(newValue.regNo);
                      navigate(`/teacher/student/${newValue._id}/analytics`);
                    }
                  }}
                  onInputChange={(event, newValue) => {
                    setSearchQuery(newValue);
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button 
                  variant="contained" 
                  onClick={handleStudentSearch}
                  startIcon={<SearchIcon />}
                  fullWidth
                  sx={{ 
                    height: '56px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                      background: 'linear-gradient(135deg, #5354cc 0%, #4338ca 100%)',
                    }
                  }}
                >
                  Search
                </Button>
              </Grid>
            </Grid>
            
            {recentSearches.length > 0 && (
              <Box mt={3}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 1.5, 
                    fontWeight: 600, 
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <CalendarTodayIcon sx={{ fontSize: '0.9rem', mr: 1 }} />
                  Recent Searches
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: 1.5
                  }}
                >
                  {recentSearches.map((student) => (
                    <Chip
                      key={student._id}
                      avatar={
                        <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.8)' }}>
                          {student.name?.substring(0, 1).toUpperCase() || 'S'}
                        </Avatar>
                      }
                      label={`${student.name} (${student.regNo})`}
                      onClick={() => {
                        navigate(`/teacher/student/${student._id}/analytics`);
                      }}
                      sx={{
                        py: 2.5,
                        bgcolor: 'white',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                        '&:hover': {
                          bgcolor: 'rgba(99, 102, 241, 0.05)',
                        },
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        fontWeight: 500
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
        
        {loading && <CircularProgress />}
        
        {!loading && studentAnalytics && selectedStudent && (
          <Box>
            <Typography variant="h5" gutterBottom>
              {selectedStudent.name} ({selectedStudent.regNo})
            </Typography>
            
            {/* Student Summary Cards */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.06)',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.1)'
                  }
                }}>
                  <Box sx={{ 
                    height: '6px', 
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)' 
                  }} />
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <Box 
                        sx={{ 
                          borderRadius: '12px',
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          p: 1.5,
                          mr: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <AccessTimeIcon sx={{ color: '#6366f1' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Total Watch Time
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#6366f1' }}>
                          {formatTime(studentAnalytics.totalWatchTime * 60 || 0)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.06)',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.1)'
                  }
                }}>
                  <Box sx={{ 
                    height: '6px', 
                    background: 'linear-gradient(90deg, #14b8a6 0%, #34d399 100%)' 
                  }} />
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <Box 
                        sx={{ 
                          borderRadius: '12px',
                          bgcolor: 'rgba(20, 184, 166, 0.1)',
                          p: 1.5,
                          mr: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <OndemandVideoIcon sx={{ color: '#14b8a6' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Completed Videos
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#14b8a6' }}>
                          {studentAnalytics.completedVideos || 0}/{studentAnalytics.totalVideos || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.06)',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.1)'
                  }
                }}>
                  <Box sx={{ 
                    height: '6px', 
                    background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)' 
                  }} />
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <Box 
                        sx={{ 
                          borderRadius: '12px',
                          bgcolor: 'rgba(245, 158, 11, 0.1)',
                          p: 1.5,
                          mr: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <BarChartIcon sx={{ color: '#f59e0b' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Average Quiz Score
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>
                          {studentAnalytics.averageQuizScore || 0}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.06)',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.1)'
                  }
                }}>
                  <Box sx={{ 
                    height: '6px', 
                    background: 'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)' 
                  }} />
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <Box 
                        sx={{ 
                          borderRadius: '12px',
                          bgcolor: 'rgba(236, 72, 153, 0.1)',
                          p: 1.5,
                          mr: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <SchoolIcon sx={{ color: '#ec4899' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Courses Enrolled
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#ec4899' }}>
                          {studentAnalytics.courseProgress?.length || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Course Progress Chart */}
            <Typography variant="h6" gutterBottom>Course Progress</Typography>
            <Box mb={4}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={studentAnalytics.courseProgress?.map(course => ({
                    name: course.courseName,
                    progress: course.progress
                  })) || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70}
                  />
                  <YAxis label={{ value: 'Progress (%)', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip formatter={(value) => [`${value}%`, 'Progress']} />
                  <Bar dataKey="progress" fill="#82ca9d">
                    {studentAnalytics.courseProgress?.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            
            {/* Engagement Score Card */}
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center',
                color: '#4f46e5',
                mb: 2.5
              }}
            >
              <BarChartIcon sx={{ mr: 1.5 }} />
              Student Engagement Score
            </Typography>
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} md={4}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
                  height: '100%',
                  background: 'linear-gradient(135deg, #f8faff 0%, #f5f7ff 100%)'
                }}>
                  <CardContent>
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Box 
                        position="relative" 
                        display="flex" 
                        alignItems="center" 
                        justifyContent="center" 
                        sx={{ 
                          width: 200, 
                          height: 200,
                          mt: 2
                        }}
                      >
                        <CircularProgress 
                          variant="determinate" 
                          value={100} // A background track
                          size={200} 
                          thickness={12} 
                          sx={{ color: 'rgba(0, 0, 0, 0.05)', position: 'absolute' }} 
                        />
                        <CircularProgress 
                          variant="determinate" 
                          value={studentAnalytics.engagementScore || 78} // Example score
                          size={200} 
                          thickness={12} 
                          sx={{ 
                            color: (studentAnalytics.engagementScore || 78) > 75 
                              ? '#4ade80' 
                              : (studentAnalytics.engagementScore || 78) > 50 
                                ? '#fb923c' 
                                : '#f43f5e',
                            boxShadow: (studentAnalytics.engagementScore || 78) > 75 
                              ? '0 0 15px rgba(74, 222, 128, 0.3)' 
                              : (studentAnalytics.engagementScore || 78) > 50 
                                ? '0 0 15px rgba(251, 146, 60, 0.3)' 
                                : '0 0 15px rgba(244, 63, 94, 0.3)',
                          }} 
                        />
                        <Box
                          position="absolute"
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Typography 
                            variant="h2" 
                            component="div" 
                            fontWeight="bold"
                            sx={{ 
                              color: (studentAnalytics.engagementScore || 78) > 75 
                                ? '#16a34a' 
                                : (studentAnalytics.engagementScore || 78) > 50 
                                  ? '#ea580c' 
                                  : '#e11d48',
                              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            {studentAnalytics.engagementScore || 78}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary', 
                              fontWeight: 500,
                              opacity: 0.8,
                              letterSpacing: '0.5px'
                            }}
                          >
                            Engagement Score
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box mt={2} textAlign="center" width="100%">
                        <Chip 
                          label={
                            (studentAnalytics.engagementScore || 78) > 75 
                              ? "Excellent Engagement" 
                              : (studentAnalytics.engagementScore || 78) > 50 
                                ? "Good Engagement" 
                                : "Needs Improvement"
                          }
                          sx={{ 
                            bgcolor: (studentAnalytics.engagementScore || 78) > 75 
                              ? 'rgba(74, 222, 128, 0.1)' 
                              : (studentAnalytics.engagementScore || 78) > 50 
                                ? 'rgba(251, 146, 60, 0.1)' 
                                : 'rgba(244, 63, 94, 0.1)',
                            color: (studentAnalytics.engagementScore || 78) > 75 
                              ? '#16a34a' 
                              : (studentAnalytics.engagementScore || 78) > 50 
                                ? '#ea580c' 
                                : '#e11d48',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            py: 1.5,
                            border: '1px solid',
                            borderColor: (studentAnalytics.engagementScore || 78) > 75 
                              ? 'rgba(74, 222, 128, 0.3)' 
                              : (studentAnalytics.engagementScore || 78) > 50 
                                ? 'rgba(251, 146, 60, 0.3)' 
                                : 'rgba(244, 63, 94, 0.3)',
                          }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Card sx={{ 
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
                  height: '100%',
                  background: 'linear-gradient(135deg, #f8faff 0%, #f5f7ff 100%)'
                }}>
                  <CardContent>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 600, 
                        display: 'flex', 
                        alignItems: 'center',
                        color: '#4f46e5'
                      }}
                    >
                      Engagement Breakdown
                    </Typography>
                    <List sx={{ mt: 2 }}>
                      <ListItem 
                        sx={{ 
                          mb: 2, 
                          bgcolor: 'rgba(99, 102, 241, 0.05)', 
                          borderRadius: '10px',
                          border: '1px solid rgba(99, 102, 241, 0.08)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(99, 102, 241, 0.08)',
                            transform: 'translateX(4px)'
                          }
                        }}
                      >
                        <ListItemIcon>
                          <Box 
                            sx={{ 
                              bgcolor: 'rgba(99, 102, 241, 0.1)',
                              p: 1.2,
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <AccessTimeIcon sx={{ color: '#6366f1' }} />
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="subtitle1" fontWeight={600}>
                              Watch Time Consistency
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Watches course videos regularly and consistently
                              </Typography>
                              <Box 
                                sx={{ 
                                  position: 'relative', 
                                  height: 8, 
                                  width: '100%', 
                                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                                  borderRadius: 4,
                                  overflow: 'hidden'
                                }}
                              >
                                <Box 
                                  sx={{ 
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    height: '100%',
                                    width: `${studentAnalytics.watchTimeConsistency || 82}%`,
                                    borderRadius: 4,
                                    background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)'
                                  }}
                                />
                              </Box>
                              <Box 
                                sx={{ 
                                  mt: 0.5, 
                                  display: 'flex', 
                                  justifyContent: 'flex-end'
                                }}
                              >
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600} 
                                  sx={{ color: '#6366f1' }}
                                >
                                  {studentAnalytics.watchTimeConsistency || 82}%
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      
                      <ListItem 
                        sx={{ 
                          mb: 2, 
                          bgcolor: 'rgba(20, 184, 166, 0.05)', 
                          borderRadius: '10px',
                          border: '1px solid rgba(20, 184, 166, 0.08)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(20, 184, 166, 0.08)',
                            transform: 'translateX(4px)'
                          }
                        }}
                      >
                        <ListItemIcon>
                          <Box 
                            sx={{ 
                              bgcolor: 'rgba(20, 184, 166, 0.1)',
                              p: 1.2,
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <BarChartIcon sx={{ color: '#14b8a6' }} />
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="subtitle1" fontWeight={600}>
                              Quiz Performance
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Completes and scores well on course quizzes
                              </Typography>
                              <Box 
                                sx={{ 
                                  position: 'relative', 
                                  height: 8, 
                                  width: '100%', 
                                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                                  borderRadius: 4,
                                  overflow: 'hidden'
                                }}
                              >
                                <Box 
                                  sx={{ 
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    height: '100%',
                                    width: `${studentAnalytics.averageQuizScore || 85}%`,
                                    borderRadius: 4,
                                    background: 'linear-gradient(90deg, #14b8a6 0%, #2dd4bf 100%)'
                                  }}
                                />
                              </Box>
                              <Box 
                                sx={{ 
                                  mt: 0.5, 
                                  display: 'flex', 
                                  justifyContent: 'flex-end'
                                }}
                              >
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600} 
                                  sx={{ color: '#14b8a6' }}
                                >
                                  {studentAnalytics.averageQuizScore || 85}%
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      
                      <ListItem 
                        sx={{ 
                          mb: 2, 
                          bgcolor: 'rgba(245, 158, 11, 0.05)', 
                          borderRadius: '10px',
                          border: '1px solid rgba(245, 158, 11, 0.08)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(245, 158, 11, 0.08)',
                            transform: 'translateX(4px)'
                          }
                        }}
                      >
                        <ListItemIcon>
                          <Box 
                            sx={{ 
                              bgcolor: 'rgba(245, 158, 11, 0.1)',
                              p: 1.2,
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <OndemandVideoIcon sx={{ color: '#f59e0b' }} />
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="subtitle1" fontWeight={600}>
                              Video Completion Rate
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Watches videos to completion
                              </Typography>
                              <Box 
                                sx={{ 
                                  position: 'relative', 
                                  height: 8, 
                                  width: '100%', 
                                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                                  borderRadius: 4,
                                  overflow: 'hidden'
                                }}
                              >
                                <Box 
                                  sx={{ 
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    height: '100%',
                                    width: `${studentAnalytics.videoCompletionRate || 75}%`,
                                    borderRadius: 4,
                                    background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                                  }}
                                />
                              </Box>
                              <Box 
                                sx={{ 
                                  mt: 0.5, 
                                  display: 'flex', 
                                  justifyContent: 'flex-end'
                                }}
                              >
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600} 
                                  sx={{ color: '#f59e0b' }}
                                >
                                  {studentAnalytics.videoCompletionRate || 75}%
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Course Details Table */}
            <Typography variant="h6" gutterBottom>Course Details</Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Course</TableCell>
                    <TableCell align="right">Progress</TableCell>
                    <TableCell align="right">Last Activity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentAnalytics.courseProgress?.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell component="th" scope="row">{course.courseName}</TableCell>
                      <TableCell align="right">{course.progress}%</TableCell>
                      <TableCell align="right">
                        {course.lastActivity 
                          ? new Date(course.lastActivity).toLocaleDateString() 
                          : 'Not available'}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} align="center">No course data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Watch Time by Day of Week */}
            <Typography variant="h6" gutterBottom>Watch Time by Day of Week</Typography>
            <Box mb={4}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Monday', watchTime: Math.floor(Math.random() * 120) + 10 },
                    { name: 'Tuesday', watchTime: Math.floor(Math.random() * 120) + 10 },
                    { name: 'Wednesday', watchTime: Math.floor(Math.random() * 120) + 10 },
                    { name: 'Thursday', watchTime: Math.floor(Math.random() * 120) + 10 },
                    { name: 'Friday', watchTime: Math.floor(Math.random() * 120) + 10 },
                    { name: 'Saturday', watchTime: Math.floor(Math.random() * 120) + 10 },
                    { name: 'Sunday', watchTime: Math.floor(Math.random() * 120) + 10 }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Watch Time (minutes)', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip formatter={(value) => [`${value} min`, 'Watch Time']} />
                  <Bar dataKey="watchTime" name="Watch Time (minutes)" fill="#8884d8">
                    {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            
            {/* Watch Time by Hour of Day */}
            <Typography variant="h6" gutterBottom>Watch Time by Hour of Day</Typography>
            <Box mb={4}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={Array.from({ length: 24 }, (_, i) => ({
                    hour: `${i}:00`,
                    watchTime: Math.floor(Math.random() * 30) + (i >= 8 && i <= 22 ? 20 : 5) // More activity during day hours
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    interval={1}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis label={{ value: 'Watch Time (minutes)', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip formatter={(value) => [`${value} min`, 'Watch Time']} />
                  <Line 
                    type="monotone" 
                    dataKey="watchTime" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}
        
        {!loading && !studentAnalytics && !studentSearchResult && (
          <Typography variant="body1" color="textSecondary" align="center" mt={4}>
            Search for a student by registration number to view analytics
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Box 
        sx={{
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          mb: 3,
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          borderRadius: '16px',
          p: 3,
          color: 'white',
          boxShadow: '0 10px 20px rgba(99, 102, 241, 0.15)'
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ 
            textShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            letterSpacing: '0.5px'
          }}>
            {selectedStudent 
              ? `Analytics for ${selectedStudent.name}` 
              : 'Student Analytics Dashboard'}
          </Typography>
          {selectedStudent && (
            <Typography variant="h6" sx={{ 
              opacity: 0.9, 
              mt: 0.5,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center'
            }}>
              <PersonIcon sx={{ mr: 1, fontSize: '1.2rem' }} /> 
              Registration: {selectedStudent.regNo}
            </Typography>
          )}
        </Box>
        <Button 
          variant="contained" 
          onClick={() => navigate('/teacher/students')}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.25)',
            },
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            py: 1,
            px: 3
          }}
          startIcon={<SchoolIcon />}
        >
          Back to Students
        </Button>
      </Box>
      {/* Error message display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2, 
            mb: 3, 
            borderRadius: '12px',
            boxShadow: '0 4px 14px rgba(244, 67, 54, 0.1)',
            '& .MuiAlert-icon': {
              fontSize: '24px'
            },
            '& .MuiAlert-message': {
              fontSize: '1rem',
              fontWeight: 500
            }
          }}
          variant="filled"
        >
          {error}
        </Alert>
      )}
      
      <Paper sx={{ 
        mb: 3, 
        borderRadius: '16px', 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' 
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTab-root': {
              py: 2,
              transition: 'all 0.3s ease',
              fontWeight: 500,
              '&.Mui-selected': {
                fontWeight: 600,
                background: 'rgba(99, 102, 241, 0.08)',
              },
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0'
            }
          }}
        >
          <Tab 
            label="Overview" 
            icon={<BarChartIcon />} 
            iconPosition="start" 
            sx={{ 
              borderRight: '1px solid rgba(0, 0, 0, 0.08)',
            }}
          />
          <Tab 
            label="Course Analytics" 
            icon={<SchoolIcon />} 
            iconPosition="start"
            sx={{ 
              borderRight: '1px solid rgba(0, 0, 0, 0.08)',
            }}
          />
          <Tab 
            label="Student Analytics" 
            icon={<PersonIcon />} 
            iconPosition="start" 
          />
        </Tabs>
      </Paper>
      
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              mt: 5,
              mb: 5,
              minHeight: '200px'
            }}
          >
            <CircularProgress 
              size={60} 
              thickness={4} 
              sx={{ 
                color: '#6366f1', 
                mb: 2 
              }} 
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.secondary', 
                fontWeight: 500,
                animation: 'pulse 1.5s infinite ease-in-out',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 0.8 },
                  '50%': { opacity: 0.5 }
                }
              }}
            >
              Loading overview data...
            </Typography>
          </Box>
        ) : (
          renderOverviewSection()
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              mt: 5,
              mb: 5,
              minHeight: '200px'
            }}
          >
            <CircularProgress 
              size={60} 
              thickness={4} 
              sx={{ 
                color: '#6366f1', 
                mb: 2 
              }} 
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.secondary', 
                fontWeight: 500,
                animation: 'pulse 1.5s infinite ease-in-out',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 0.8 },
                  '50%': { opacity: 0.5 }
                }
              }}
            >
              Loading course analytics...
            </Typography>
          </Box>
        ) : (
          renderCourseAnalyticsSection()
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        {loading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              mt: 5,
              mb: 5,
              minHeight: '200px'
            }}
          >
            <CircularProgress 
              size={60} 
              thickness={4} 
              sx={{ 
                color: '#6366f1', 
                mb: 2 
              }} 
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.secondary', 
                fontWeight: 500,
                animation: 'pulse 1.5s infinite ease-in-out',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 0.8 },
                  '50%': { opacity: 0.5 }
                }
              }}
            >
              Loading student analytics...
            </Typography>
          </Box>
        ) : (
          renderStudentAnalyticsSection()
        )}
      </TabPanel>
    </Box>
  );
}
