import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Autocomplete,
  Alert
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BarChartIcon from '@mui/icons-material/BarChart';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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

export default function TeacherEnhancedAnalytics({ token, user }) {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [enrollmentTrends, setEnrollmentTrends] = useState([]);
  const [topCourses, setTopCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSearchResult, setStudentSearchResult] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [periodFilter, setPeriodFilter] = useState('monthly');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const authToken = token || localStorage.getItem('token');

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
          axios.get(`/api/teacher/analytics/trends?period=${periodFilter}`, { 
            headers: { Authorization: `Bearer ${authToken}` } 
          }),
          axios.get('/api/teacher/courses', { 
            headers: { Authorization: `Bearer ${authToken}` } 
          }),
        ]);
        
        setOverview(overviewRes.data);
        setEnrollmentTrends(trendsRes.data);
        setCourses(coursesRes.data);
        
        // If there are courses, get the top courses by student count
        if (coursesRes.data.length > 0) {
          // Sort courses by student count (this is a simplification, you might want to use actual analytics data)
          const sortedCourses = [...coursesRes.data].sort((a, b) => (b.students?.length || 0) - (a.students?.length || 0));
          setTopCourses(sortedCourses.slice(0, 5)); // Get top 5 courses
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [authToken, periodFilter]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle period filter change
  const handlePeriodChange = (event) => {
    setPeriodFilter(event.target.value);
  };

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
      // Also fetch detailed analytics for this student
      await fetchStudentAnalytics(response.data._id);
      setTabValue(2); // Switch to student tab
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

  // Fetch student analytics
  const fetchStudentAnalytics = async (studentId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/teacher/analytics/student/${studentId}/detailed`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setStudentAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      setStudentAnalytics(null);
      setError('Failed to load student analytics. Please try again later.');
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
          <Card sx={{ backgroundColor: '#e3f2fd' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PeopleIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">{overview.totalStudents || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">Total Students</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: '#e8f5e9' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <SchoolIcon sx={{ fontSize: 40, color: '#388e3c', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">{overview.totalCourses || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">Assigned Courses</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: '#fff8e1' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <OndemandVideoIcon sx={{ fontSize: 40, color: '#f57c00', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">{overview.totalVideos || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">Total Videos</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: '#f3e5f5' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AccessTimeIcon sx={{ fontSize: 40, color: '#7b1fa2', mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">{overview.activeStudents || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">Active Students (7d)</Typography>
                  <Typography variant="caption">{overview.activeStudentsPercentage?.toFixed(1) || 0}% of total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Enrollment Trends Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Student Enrollment Trends</Typography>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={periodFilter}
                  onChange={handlePeriodChange}
                  displayEmpty
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={enrollmentTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Top Courses */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Your Courses</Typography>
            {topCourses.length > 0 ? (
              <Box>
                {topCourses.map((course, index) => (
                  <Box 
                    key={course._id} 
                    sx={{ 
                      mb: 2, 
                      p: 1.5, 
                      borderRadius: 1, 
                      backgroundColor: index % 2 === 0 ? '#f5f5f5' : '#fff',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#e3f2fd' }
                    }}
                    onClick={() => {
                      setSelectedCourse(course);
                      fetchCourseAnalytics(course._id);
                      setTabValue(1); // Switch to course tab
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle1" fontWeight={500}>{course.title}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {course.courseCode || 'No Code'} • {course.students?.length || 0} students
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourse(course);
                          fetchCourseAnalytics(course._id);
                          setTabValue(1); // Switch to course tab
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
                {courses.length > topCourses.length && (
                  <Typography 
                    variant="body2" 
                    color="primary" 
                    align="center" 
                    sx={{ mt: 2, cursor: 'pointer' }}
                    onClick={() => setTabValue(1)} // Switch to course tab
                  >
                    View all {courses.length} courses
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body1" color="textSecondary" align="center">
                No courses available
              </Typography>
            )}
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
              {courseAnalytics.course.title} ({courseAnalytics.course.courseCode})
            </Typography>
            
            {/* Course Summary Cards */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Total Students</Typography>
                    <Typography variant="h4">{courseAnalytics.summary.totalStudents}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Total Videos</Typography>
                    <Typography variant="h4">{courseAnalytics.summary.totalVideos}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Total Teachers</Typography>
                    <Typography variant="h4">{courseAnalytics.summary.totalTeachers}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Avg. Watch Time</Typography>
                    <Typography variant="h4">{courseAnalytics.summary.avgWatchTimeFormatted}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Video Analytics */}
            <Typography variant="h6" gutterBottom>Video Watch Statistics</Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Video Title</TableCell>
                    <TableCell align="right">Students Watched</TableCell>
                    <TableCell align="right">Total Watch Time</TableCell>
                    <TableCell align="right">Avg. Watch Time</TableCell>
                    <TableCell align="right">Watch %</TableCell>
                    <TableCell align="right">Completion Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courseAnalytics.videoAnalytics.map((video) => (
                    <TableRow key={video._id}>
                      <TableCell component="th" scope="row">{video.title}</TableCell>
                      <TableCell align="right">{video.studentsWatched}</TableCell>
                      <TableCell align="right">{video.totalWatchTimeFormatted}</TableCell>
                      <TableCell align="right">{video.avgWatchTimeFormatted}</TableCell>
                      <TableCell align="right">{video.watchPercentage.toFixed(1)}%</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 100,
                              mr: 1,
                              borderRadius: 1,
                              height: 8,
                              background: `linear-gradient(to right, #4caf50 ${video.completionRate}%, #f5f5f5 ${video.completionRate}%)`,
                            }}
                          />
                          <Typography variant="body2">
                            {Math.round(video.completionRate)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Student Watch Chart */}
            <Typography variant="h6" gutterBottom>Total Watch Time by Student</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={courseAnalytics.studentAnalytics}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                />
                <YAxis label={{ value: 'Watch Time (seconds)', angle: -90, position: 'insideLeft' }} />
                <RechartsTooltip 
                  formatter={(value, name, props) => [
                    props.payload.totalWatchTimeFormatted, 
                    'Watch Time'
                  ]} 
                />
                <Bar dataKey="totalWatchTime" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Student Watch Table */}
            <Typography variant="h6" gutterBottom mt={4}>Student Watch Statistics</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Registration No</TableCell>
                    <TableCell align="right">Total Watch Time</TableCell>
                    <TableCell align="right">Videos Watched</TableCell>
                    <TableCell align="right">Days Active</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courseAnalytics.studentAnalytics.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell component="th" scope="row">{student.name || 'Unknown'}</TableCell>
                      <TableCell>{student.regNo || 'N/A'}</TableCell>
                      <TableCell align="right">{student.totalWatchTimeFormatted || '0s'}</TableCell>
                      <TableCell align="right">{student.videosWatched || 0}</TableCell>
                      <TableCell align="right">{student.uniqueDaysActive || 0}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Student Details">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedStudent({
                                _id: student._id,
                                name: student.name,
                                regNo: student.regNo
                              });
                              fetchStudentAnalytics(student._id);
                              setTabValue(2); // Switch to student tab
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        
        {!loading && !courseAnalytics && !selectedCourse && (
          <Typography variant="body1" color="textSecondary" align="center" mt={4}>
            Please select a course to view analytics
          </Typography>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
      </Box>
    );
  };

  // Student Analytics Section
  const renderStudentAnalyticsSection = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Student Analytics</Typography>
        
        {/* Student Search */}
        <Box mb={4} display="flex" gap={2}>
          <TextField
            label="Search by Registration Number"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 300 }}
          />
          <Button 
            variant="contained" 
            onClick={handleStudentSearch}
            startIcon={<SearchIcon />}
          >
            Search
          </Button>
        </Box>
        
        {loading && <CircularProgress />}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
        
        {!loading && studentAnalytics && (
          <Box>
            <Typography variant="h5" gutterBottom>
              {studentAnalytics.student.name} ({studentAnalytics.student.regNo})
            </Typography>
            
            {/* Student Summary Cards */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Total Watch Time</Typography>
                    <Typography variant="h5">{studentAnalytics.summary.totalWatchTimeFormatted}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Courses Enrolled</Typography>
                    <Typography variant="h5">{studentAnalytics.summary.totalCourses}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Videos Watched</Typography>
                    <Typography variant="h5">{studentAnalytics.summary.totalVideosWatched}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Avg. Time Per Video</Typography>
                    <Typography variant="h5">{studentAnalytics.summary.averageWatchTimeFormatted}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Engagement Metrics */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>First Activity</Typography>
                    <Typography variant="h6">
                      {studentAnalytics.engagementMetrics.firstActivity
                        ? new Date(studentAnalytics.engagementMetrics.firstActivity).toLocaleDateString()
                        : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Days Active</Typography>
                    <Typography variant="h6">{studentAnalytics.engagementMetrics.totalDaysActive || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Longest Streak</Typography>
                    <Typography variant="h6">{studentAnalytics.engagementMetrics.longestStreak || 0} days</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Avg. Session Length</Typography>
                    <Typography variant="h6">{studentAnalytics.engagementMetrics.averageSessionLengthFormatted || '0s'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Course Watch Time Chart */}
            <Typography variant="h6" gutterBottom>Course Watch Time</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={studentAnalytics.courseAnalytics}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="title" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                />
                <YAxis label={{ value: 'Watch Time (seconds)', angle: -90, position: 'insideLeft' }} />
                <RechartsTooltip 
                  formatter={(value, name, props) => [
                    props.payload.totalWatchTimeFormatted, 
                    'Watch Time'
                  ]} 
                />
                <Bar dataKey="totalWatchTime" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Watch Time by Day of Week */}
            <Grid container spacing={3} mt={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Watch Time by Day</Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={Object.entries(studentAnalytics.activityHeatmap.byDay).map(([day, value]) => ({
                        day,
                        watchTime: value
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [formatTime(value), 'Watch Time']} />
                      <Bar dataKey="watchTime" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Watch Time by Hour</Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                      data={Object.entries(studentAnalytics.activityHeatmap.byHour).map(([hour, value]) => ({
                        hour,
                        watchTime: value
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => [formatTime(value), 'Watch Time']} />
                      <Area type="monotone" dataKey="watchTime" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
            
            {/* Course Details */}
            <Typography variant="h6" gutterBottom mt={4}>Course Engagement Details</Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Course</TableCell>
                    <TableCell align="right">Watch Time</TableCell>
                    <TableCell align="right">Videos Watched</TableCell>
                    <TableCell align="right">Total Videos</TableCell>
                    <TableCell align="right">Completion</TableCell>
                    <TableCell align="right">Last Activity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentAnalytics.courseAnalytics.map((course) => (
                    <TableRow key={course._id}>
                      <TableCell component="th" scope="row">{course.title}</TableCell>
                      <TableCell align="right">{course.totalWatchTimeFormatted}</TableCell>
                      <TableCell align="right">{course.videosWatched}</TableCell>
                      <TableCell align="right">{course.totalVideos}</TableCell>
                      <TableCell align="right">{course.completionPercentage.toFixed(1)}%</TableCell>
                      <TableCell align="right">
                        {course.lastActivity 
                          ? new Date(course.lastActivity).toLocaleDateString() 
                          : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Video Details Expansion */}
            <Typography variant="h6" gutterBottom>Detailed Video Watch Data</Typography>
            {studentAnalytics.courseAnalytics.map((course) => (
              <Box key={course._id} mb={3}>
                <Typography variant="subtitle1" fontWeight="bold">{course.title}</Typography>
                
                {course.videoDetails && course.videoDetails.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Video</TableCell>
                          <TableCell align="right">Time Watched</TableCell>
                          <TableCell align="right">Last Watched</TableCell>
                          <TableCell align="right">Playback Speed</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {course.videoDetails.map((video) => (
                          <TableRow key={video.videoId}>
                            <TableCell>{video.title}</TableCell>
                            <TableCell align="right">{video.timeSpentFormatted}</TableCell>
                            <TableCell align="right">
                              {video.lastWatched 
                                ? new Date(video.lastWatched).toLocaleString() 
                                : 'Never'}
                            </TableCell>
                            <TableCell align="right">{video.avgPlaybackSpeed}x</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="textSecondary">No video details available</Typography>
                )}
              </Box>
            ))}
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
      <Typography variant="h4" mb={3}>Analytics Dashboard</Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Overview" icon={<BarChartIcon />} iconPosition="start" />
          <Tab label="Course Analytics" icon={<SchoolIcon />} iconPosition="start" />
          <Tab label="Student Analytics" icon={<PersonIcon />} iconPosition="start" />
        </Tabs>
      </Paper>
      
      <TabPanel value={tabValue} index={0}>
        {renderOverviewSection()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {renderCourseAnalyticsSection()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        {renderStudentAnalyticsSection()}
      </TabPanel>
    </Box>
  );
}
