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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  LinearProgress,
  TextField,
  Collapse,
  IconButton,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AssignmentIcon from '@mui/icons-material/Assignment';

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
      id={`section-analytics-tabpanel-${index}`}
      aria-labelledby={`section-analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const TeacherSectionAnalytics = ({ user, token }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [searchRegNo, setSearchRegNo] = useState('');
  const [expandedStudents, setExpandedStudents] = useState({});
  const [sectionAnalytics, setSectionAnalytics] = useState({
    overview: {
      totalSections: 0,
      totalStudents: 0,
      averageEngagement: 0,
      courseCompletionRate: 0
    },
    sectionDetails: {
      sectionName: '',
      courseName: '',
      studentCount: 0,
      videoCount: 0,
      averageProgress: 0,
      students: []
    },
    performanceData: {
      labels: [],
      studentProgress: [],
      videoWatchTime: [],
      quizScores: []
    }
  });

  useEffect(() => {
    const fetchTeacherSections = async () => {
      try {
        setLoading(true);
        
        // Get userId from either user.id or user._id
        const userId = user.id || user._id;
        if (!userId) {
          throw new Error('User ID not found');
        }
        
        console.log('[TeacherSectionAnalytics] Fetching sections for teacher:', userId);
        
        // Fetch teacher's sections using the working endpoint
        const sectionsResponse = await axios.get(`/api/sections/teacher/${userId}/connections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('[TeacherSectionAnalytics] Received sections:', sectionsResponse.data);
        setSections(sectionsResponse.data);
        
        if (sectionsResponse.data.length > 0) {
          setSelectedSection(sectionsResponse.data[0]._id);
        }
        
        // Fetch real analytics overview
        const overviewResponse = await axios.get(`/api/sections/analytics/teacher/${userId}/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('[TeacherSectionAnalytics] Received overview:', overviewResponse.data);
        setSectionAnalytics(prev => ({
          ...prev,
          overview: overviewResponse.data
        }));
        
        setLoading(false);
      } catch (err) {
        console.error('[TeacherSectionAnalytics] Error fetching section data:', err);
        setError('Failed to load section analytics: ' + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };
    
    if (token && user) {
      fetchTeacherSections();
    }
  }, [token, user]);

  useEffect(() => {
    const fetchSectionAnalytics = async () => {
      if (!selectedSection) return;
      
      try {
        setLoading(true);
        
        console.log('[TeacherSectionAnalytics] Fetching analytics for section:', selectedSection);
        
        // Fetch real section analytics
        const sectionResponse = await axios.get(`/api/sections/analytics/${selectedSection}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('[TeacherSectionAnalytics] Received section analytics:', sectionResponse.data);
        
        setSectionAnalytics(prev => ({
          ...prev,
          sectionDetails: sectionResponse.data.sectionDetails,
          performanceData: sectionResponse.data.performanceData
        }));
        
        setLoading(false);
      } catch (err) {
        console.error('[TeacherSectionAnalytics] Error fetching section analytics:', err);
        setError('Failed to load section analytics details: ' + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };
    
    if (token && selectedSection) {
      fetchSectionAnalytics();
    }
  }, [token, selectedSection]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSectionChange = (event) => {
    setSelectedSection(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchRegNo(event.target.value);
  };

  const toggleStudentExpanded = (studentId) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Filter students based on search
  const filteredStudents = sectionAnalytics.sectionDetails.students?.filter(student => {
    if (!searchRegNo) return true;
    
    const searchTerm = searchRegNo.toLowerCase();
    return (
      student.studentId?.toLowerCase().includes(searchTerm) ||
      student.regNo?.toLowerCase().includes(searchTerm) ||
      student.firstName?.toLowerCase().includes(searchTerm) ||
      student.lastName?.toLowerCase().includes(searchTerm) ||
      student.email?.toLowerCase().includes(searchTerm) ||
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm)
    );
  }) || [];

  // Chart data for real individual student progress
  const studentProgressData = {
    labels: sectionAnalytics.performanceData?.studentProgressData?.labels || [],
    datasets: [
      {
        label: 'Student Progress (%)',
        data: sectionAnalytics.performanceData?.studentProgressData?.data || [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        fill: false,
        tension: 0.1
      }
    ],
  };

  // Chart data for course completion
  const courseCompletionData = {
    labels: sectionAnalytics.performanceData?.courseCompletion?.map(course => course.courseName) || [],
    datasets: [
      {
        label: 'Course Completion (%)',
        data: sectionAnalytics.performanceData?.courseCompletion?.map(course => course.completion) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1,
      }
    ],
  };

  // Chart data for quiz scores (now using real data)
  const quizScoresData = {
    labels: sectionAnalytics.performanceData?.courseCompletion?.map(course => course.courseName) || [],
    datasets: [
      {
        label: 'Average Quiz Score (%)',
        data: sectionAnalytics.performanceData?.quizScores || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      }
    ],
  };

  // Real engagement distribution data based on student progress
  const engagementData = {
    labels: ['Active Students', 'Inactive Students'],
    datasets: [
      {
        data: [
          sectionAnalytics.performanceData?.engagement?.activeStudents || 0,
          (sectionAnalytics.performanceData?.engagement?.totalStudents || 0) - (sectionAnalytics.performanceData?.engagement?.activeStudents || 0),
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const exportStudentData = () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      alert('No student data to export');
      return;
    }

    // Prepare CSV data
    const csvHeaders = [
      'Student Name',
      'Registration Number', 
      'Email',
      'Overall Progress (%)',
      'Watch Time (minutes)',
      'Quiz Average (%)',
      'Engagement Level',
      'Last Activity',
      'Units Completed',
      'Quizzes Passed',
      'Total Quiz Attempts'
    ];

    const csvData = filteredStudents.map(student => [
      `${student.firstName} ${student.lastName}`,
      student.regNo || 'N/A',
      student.email || 'N/A',
      student.progress || 0,
      student.watchTime || 0,
      student.quizAverage || 0,
      student.engagementLevel || 'low',
      student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : 'Never',
      student.unitDetails ? student.unitDetails.filter(u => u.isCompleted).length : 0,
      student.unitDetails ? student.unitDetails.filter(u => u.quizPassed).length : 0,
      student.unitDetails ? student.unitDetails.reduce((sum, u) => sum + (u.attempts || 0), 0) : 0
    ]);

    // Create CSV content
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `section_analytics_${selectedSection}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEngagementColor = (engagementLevel) => {
    if (engagementLevel === 'high') return 'success';
    if (engagementLevel === 'medium') return 'warning';
    return 'error';
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'success';
    if (progress >= 60) return 'info';
    if (progress >= 40) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Section Analytics Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Monitor student performance and engagement in your assigned sections
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
              <Tab label="Section Details" />
              <Tab label="Student Performance" />
            </Tabs>
            
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <GroupsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Total Sections
                      </Typography>
                      <Typography variant="h3">
                        {sectionAnalytics.overview.totalSections}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <SchoolIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Total Students
                      </Typography>
                      <Typography variant="h3">
                        {sectionAnalytics.overview.totalStudents}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <VideoLibraryIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Avg. Engagement
                      </Typography>
                      <Typography variant="h3">
                        {sectionAnalytics.overview.averageEngagement}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <AssignmentIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Completion Rate
                      </Typography>
                      <Typography variant="h3">
                        {sectionAnalytics.overview.courseCompletionRate}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        My Sections
                      </Typography>
                      <Grid container spacing={2}>
                        {sections.map((section) => (
                          <Grid item xs={12} sm={6} md={4} key={section._id}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  {section.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Course: {section.course?.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Students: {section.students?.length || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Department: {section.department?.name}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel id="section-select-label">Select Section</InputLabel>
                  <Select
                    labelId="section-select-label"
                    value={selectedSection}
                    label="Select Section"
                    onChange={handleSectionChange}
                  >
                    {sections.map((section) => (
                      <MenuItem key={section._id} value={section._id}>
                        {section.name} - {section.course?.title} ({section.department?.name})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              {selectedSection && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Section Information
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Section Name:
                            </Typography>
                            <Typography variant="body1">
                              {sectionAnalytics.sectionDetails.name}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Department:
                            </Typography>
                            <Typography variant="body1">
                              {sectionAnalytics.sectionDetails.department || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Total Students:
                            </Typography>
                            <Typography variant="body1">
                              {sectionAnalytics.sectionDetails.studentsCount}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Total Courses:
                            </Typography>
                            <Typography variant="body1">
                              {sectionAnalytics.sectionDetails.coursesCount}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Total Videos:
                            </Typography>
                            <Typography variant="body1">
                              {sectionAnalytics.performanceData?.videoMetrics?.totalVideos || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Engagement Rate:
                            </Typography>
                            <Typography variant="body1">
                              {sectionAnalytics.performanceData?.engagement?.engagementRate || 0}%
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Student Engagement
                        </Typography>
                        <Box sx={{ height: 250 }}>
                          <Doughnut 
                            data={engagementData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom'
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
                          Section Performance Overview
                        </Typography>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  Student Progress
                                </Typography>
                                <Box sx={{ height: 200 }}>
                                  <Bar 
                                    data={studentProgressData}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      scales: {
                                        y: {
                                          beginAtZero: true,
                                          max: 100
                                        }
                                      }
                                    }}
                                  />
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  Course Completion
                                </Typography>
                                <Box sx={{ height: 200 }}>
                                  <Bar 
                                    data={courseCompletionData}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      scales: {
                                        y: {
                                          beginAtZero: true,
                                          max: 100
                                        }
                                      }
                                    }}
                                  />
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  Quiz Performance
                                </Typography>
                                <Box sx={{ height: 200 }}>
                                  <Bar 
                                    data={quizScoresData}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      scales: {
                                        y: {
                                          beginAtZero: true,
                                          max: 100
                                        }
                                      }
                                    }}
                                  />
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              {selectedSection && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Individual Student Performance
                        </Typography>
                        
                        <Box sx={{ mb: 3 }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={6}>
                              <TextField
                                label="Search Students"
                                variant="outlined"
                                value={searchRegNo}
                                onChange={handleSearchChange}
                                fullWidth
                                size="small"
                                placeholder="Search by name, registration number, or email..."
                                InputProps={{
                                  startAdornment: (
                                    <Box sx={{ mr: 1, color: 'text.secondary' }}>
                                      🔍
                                    </Box>
                                  ),
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Students found: {filteredStudents.length}
                                  </Typography>
                                  {searchRegNo && (
                                    <Chip 
                                      label={`Filtering: "${searchRegNo}"`}
                                      onDelete={() => setSearchRegNo('')}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={exportStudentData}
                                  disabled={filteredStudents.length === 0}
                                  startIcon={<Typography>📊</Typography>}
                                >
                                  Export Data
                                </Button>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>

                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Student</TableCell>
                                <TableCell>Registration No</TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell>Watch Time</TableCell>
                                <TableCell>Quiz Average</TableCell>
                                <TableCell>Engagement</TableCell>
                                <TableCell>Last Activity</TableCell>
                                <TableCell>Details</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredStudents?.map((student) => (
                                <React.Fragment key={student._id}>
                                  <TableRow>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ width: 32, height: 32 }}>
                                          {student.firstName?.[0]}{student.lastName?.[0]}
                                        </Avatar>
                                        <Box>
                                          <Typography variant="body2">
                                            {student.firstName} {student.lastName}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {student.email}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight="medium">
                                        {student.regNo || student.studentId || 'N/A'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LinearProgress 
                                          variant="determinate" 
                                          value={student.progress || 0} 
                                          color={getProgressColor(student.progress || 0)}
                                          sx={{ width: 60 }}
                                        />
                                        <Typography variant="body2">
                                          {student.progress || 0}%
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      {student.watchTime || 0} min
                                    </TableCell>
                                    <TableCell>
                                      {student.quizAverage || 0}%
                                    </TableCell>
                                    <TableCell>
                                      <Chip 
                                        label={student.engagementLevel || 'low'} 
                                        color={getEngagementColor(student.engagementLevel)}
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" color="text.secondary">
                                        {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : 'Never'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <IconButton
                                        size="small"
                                        onClick={() => toggleStudentExpanded(student._id)}
                                      >
                                        {expandedStudents[student._id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                  
                                  {/* Expandable detailed view */}
                                  <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                                      <Collapse in={expandedStudents[student._id]} timeout="auto" unmountOnExit>
                                        <Box sx={{ margin: 2 }}>
                                          <Typography variant="h6" gutterBottom component="div">
                                            Unit-wise Performance Details for {student.firstName} {student.lastName}
                                          </Typography>
                                          
                                          {/* Performance Summary */}
                                          {student.unitDetails && student.unitDetails.length > 0 && (
                                            <Box sx={{ mb: 3 }}>
                                              <Grid container spacing={2}>
                                                <Grid item xs={6} sm={3}>
                                                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                      Units Completed
                                                    </Typography>
                                                    <Typography variant="h6">
                                                      {student.unitDetails.filter(u => u.isCompleted).length} / {student.unitDetails.length}
                                                    </Typography>
                                                  </Card>
                                                </Grid>
                                                <Grid item xs={6} sm={3}>
                                                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                      Quizzes Passed
                                                    </Typography>
                                                    <Typography variant="h6">
                                                      {student.unitDetails.filter(u => u.quizPassed).length} / {student.unitDetails.filter(u => u.attempts > 0).length || student.unitDetails.length}
                                                    </Typography>
                                                  </Card>
                                                </Grid>
                                                <Grid item xs={6} sm={3}>
                                                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                      Total Attempts
                                                    </Typography>
                                                    <Typography variant="h6">
                                                      {student.unitDetails.reduce((sum, u) => sum + (u.attempts || 0), 0)}
                                                    </Typography>
                                                  </Card>
                                                </Grid>
                                                <Grid item xs={6} sm={3}>
                                                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                      Avg. Quiz Score
                                                    </Typography>
                                                    <Typography variant="h6">
                                                      {student.quizAverage || 0}%
                                                    </Typography>
                                                  </Card>
                                                </Grid>
                                              </Grid>
                                            </Box>
                                          )}

                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell><strong>Unit Name</strong></TableCell>
                                                <TableCell><strong>Quiz Marks</strong></TableCell>
                                                <TableCell><strong>Attempts</strong></TableCell>
                                                <TableCell><strong>Best Score</strong></TableCell>
                                                <TableCell><strong>Video Progress</strong></TableCell>
                                                <TableCell><strong>Status</strong></TableCell>
                                                <TableCell><strong>Last Attempt</strong></TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {student.unitDetails && student.unitDetails.length > 0 ? (
                                                student.unitDetails.map((unit, index) => (
                                                  <TableRow key={unit.unitId || index}>
                                                    <TableCell component="th" scope="row">
                                                      <Typography variant="body2" fontWeight="medium">
                                                        {unit.unitName}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      {unit.quizMarks && unit.quizMarks.length > 0 ? (
                                                        <Box>
                                                          <Typography variant="body2">
                                                            {unit.quizMarks.join(', ')}
                                                          </Typography>
                                                          <Typography variant="caption" color="text.secondary">
                                                            (All attempts)
                                                          </Typography>
                                                        </Box>
                                                      ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                          No attempts
                                                        </Typography>
                                                      )}
                                                    </TableCell>
                                                    <TableCell>
                                                      <Chip 
                                                        label={unit.attempts || 0} 
                                                        size="small"
                                                        color={
                                                          unit.attempts === 0 ? 'default' :
                                                          unit.attempts > 3 ? 'error' : 
                                                          unit.attempts > 1 ? 'warning' : 'success'
                                                        }
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography 
                                                          variant="body2" 
                                                          fontWeight="bold"
                                                          color={
                                                            unit.bestScore >= 80 ? 'success.main' : 
                                                            unit.bestScore >= 70 ? 'info.main' :
                                                            unit.bestScore >= 60 ? 'warning.main' : 'error.main'
                                                          }
                                                        >
                                                          {unit.bestScore || 0}%
                                                        </Typography>
                                                        {unit.quizPassed && (
                                                          <Chip 
                                                            label="PASSED" 
                                                            size="small" 
                                                            color="success"
                                                            variant="outlined"
                                                          />
                                                        )}
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <LinearProgress 
                                                          variant="determinate" 
                                                          value={unit.videoProgress || 0} 
                                                          sx={{ width: 60 }}
                                                          color={getProgressColor(unit.videoProgress || 0)}
                                                        />
                                                        <Typography variant="caption">
                                                          {unit.videoProgress || 0}%
                                                        </Typography>
                                                      </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Chip 
                                                        label={unit.isCompleted ? 'Completed' : 'In Progress'} 
                                                        size="small"
                                                        color={unit.isCompleted ? 'success' : 'warning'}
                                                        variant="outlined"
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography variant="caption" color="text.secondary">
                                                        {unit.lastAttempt ? new Date(unit.lastAttempt).toLocaleDateString() : 'Never'}
                                                      </Typography>
                                                    </TableCell>
                                                  </TableRow>
                                                ))
                                              ) : (
                                                <TableRow>
                                                  <TableCell colSpan={7} align="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                      No unit performance data available
                                                    </Typography>
                                                  </TableCell>
                                                </TableRow>
                                              )}
                                            </TableBody>
                                          </Table>
                                        </Box>
                                      </Collapse>
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              ))}
                              {filteredStudents.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={8} align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {searchRegNo ? 'No students found matching search criteria' : 'No students enrolled'}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </TabPanel>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default TeacherSectionAnalytics;
