import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Skeleton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  VideoLibrary as VideoIcon,
  Quiz as QuizIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Enhanced Course Details with comprehensive visibility
const EnhancedCourseDetails = ({ courseId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  
  const token = localStorage.getItem('token');

  // Enhanced data fetching with comprehensive error handling
  const fetchCourseData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching course data for ID:', courseId);
      
      // Test multiple endpoints in parallel with individual error handling
      const endpoints = [
        { 
          name: 'courseDetails',
          url: `/api/admin/course/${courseId}/details`,
          fallback: `/api/courses/${courseId}`
        },
        { 
          name: 'courseVideos',
          url: `/api/admin/course/${courseId}/videos`,
          fallback: null
        },
        { 
          name: 'courseStudents',
          url: `/api/admin/course/${courseId}/students`,
          fallback: null
        },
        {
          name: 'directCourseAPI',
          url: `/api/courses/${courseId}`,
          fallback: null
        }
      ];

      const results = {};
      const errors = {};
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying ${endpoint.name}: ${endpoint.url}`);
          const response = await fetch(endpoint.url, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            results[endpoint.name] = data;
            console.log(`✅ ${endpoint.name} successful:`, data);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
        } catch (err) {
          console.error(`❌ ${endpoint.name} failed:`, err.message);
          errors[endpoint.name] = err.message;
          
          // Try fallback if available
          if (endpoint.fallback) {
            try {
              console.log(`Trying fallback for ${endpoint.name}: ${endpoint.fallback}`);
              const fallbackResponse = await fetch(endpoint.fallback, {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                results[endpoint.name] = fallbackData;
                console.log(`✅ ${endpoint.name} fallback successful:`, fallbackData);
                errors[endpoint.name] = null; // Clear error since fallback worked
              }
            } catch (fallbackErr) {
              console.error(`❌ ${endpoint.name} fallback also failed:`, fallbackErr.message);
            }
          }
        }
      }

      // Set debug information
      setDebugInfo({
        endpoints: endpoints.map(ep => ({
          name: ep.name,
          url: ep.url,
          fallback: ep.fallback,
          success: !!results[ep.name],
          error: errors[ep.name]
        })),
        results,
        errors
      });

      // Determine primary course data source
      const primaryCourseData = results.courseDetails || results.directCourseAPI;
      
      if (!primaryCourseData) {
        throw new Error('Could not fetch course data from any endpoint');
      }

      // Combine all available data
      const enhancedCourseData = {
        ...primaryCourseData,
        videos: results.courseVideos || [],
        students: results.courseStudents || [],
        _metadata: {
          dataSource: results.courseDetails ? 'admin-api' : 'direct-api',
          endpointResults: results,
          endpointErrors: errors,
          fetchTime: new Date().toISOString()
        }
      };

      setCourseData(enhancedCourseData);
      console.log('Final enhanced course data:', enhancedCourseData);

    } catch (err) {
      console.error('Failed to fetch course data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      if (showLoader) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCourseData(false);
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {[1, 2, 3].map(i => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rectangular" height={150} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>
    );
  }

  if (error && !courseData) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>Failed to Load Course Details</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        
        {debugInfo && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Debug Information</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                <Typography variant="subtitle2" gutterBottom>Endpoint Tests:</Typography>
                {debugInfo.endpoints.map((ep, idx) => (
                  <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: ep.success ? 'success.light' : 'error.light', borderRadius: 1 }}>
                    <Typography variant="body2">
                      <strong>{ep.name}:</strong> {ep.url}
                    </Typography>
                    <Typography variant="caption">
                      {ep.success ? '✅ Success' : `❌ Error: ${ep.error}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={() => fetchCourseData()} startIcon={<RefreshIcon />}>
            Retry
          </Button>
          <Button variant="outlined" onClick={onBack}>
            Back to Course List
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Enhanced Course Header with Metadata */}
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" gutterBottom>
                {courseData.courseCode ? `${courseData.courseCode}: ` : ''}{courseData.title}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {courseData.description || 'No description available'}
              </Typography>
              
              {/* Enhanced Metadata Display */}
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {courseData.school && (
                  <Chip 
                    icon={<SchoolIcon />} 
                    label={`School: ${courseData.school.name || courseData.school._id}`}
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                )}
                {courseData.department && (
                  <Chip 
                    icon={<PersonIcon />} 
                    label={`Dept: ${courseData.department.name || courseData.department._id}`}
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                )}
                <Chip 
                  icon={<AnalyticsIcon />} 
                  label={`Data: ${courseData._metadata?.dataSource || 'unknown'}`}
                  size="small" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' }, mt: { xs: 2, md: 0 } }}>
              <Button 
                variant="outlined" 
                color="inherit" 
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ mr: 1 }}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button variant="outlined" color="inherit" onClick={onBack}>
                Back
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Course Statistics Dashboard */}
        <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <VideoIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="primary">
                    {courseData.videos?.length || courseData.videosCount || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Videos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <PersonIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="secondary">
                    {courseData.students?.length || courseData.studentsCount || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Students
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <SchoolIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="success.main">
                    {courseData.teachers?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teachers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <AssignmentIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="warning.main">
                    {courseData.units?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Units
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Enhanced Tabs with Better Organization */}
      <Paper elevation={2}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<InfoIcon />} label="Overview" />
          <Tab icon={<PersonIcon />} label="Students" />
          <Tab icon={<VideoIcon />} label="Videos" />
          <Tab icon={<AssignmentIcon />} label="Content" />
          <Tab icon={<AnalyticsIcon />} label="Debug" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Course Information</Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Course Code:</Typography>
                    <Typography variant="body1">{courseData.courseCode || 'Not assigned'}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">School:</Typography>
                    <Typography variant="body1">
                      {courseData.school?.name || 'Not assigned'}
                      {courseData.school?.code && ` (${courseData.school.code})`}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Department:</Typography>
                    <Typography variant="body1">
                      {courseData.department?.name || 'Not assigned'}
                      {courseData.department?.code && ` (${courseData.department.code})`}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Credits:</Typography>
                    <Typography variant="body1">{courseData.credits || 'Not specified'}</Typography>
                  </Box>
                  
                  {courseData.semester && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Semester:</Typography>
                      <Typography variant="body1">{courseData.semester}</Typography>
                    </Box>
                  )}
                  
                  {courseData.academicYear && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Academic Year:</Typography>
                      <Typography variant="body1">{courseData.academicYear}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Assigned Teachers</Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {courseData.teachers && courseData.teachers.length > 0 ? (
                    <List>
                      {courseData.teachers.map((teacher, index) => (
                        <ListItem key={index} disablePadding>
                          <ListItemIcon>
                            <PersonIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={teacher.name}
                            secondary={`${teacher.email} ${teacher.teacherId ? `(ID: ${teacher.teacherId})` : ''}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">
                      No teachers assigned to this course yet.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Students Tab */}
        <TabPanel value={tabValue} index={1}>
          {courseData.students && courseData.students.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Registration No</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Progress</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courseData.students.map((student) => (
                    <TableRow key={student._id || student.regNo}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.regNo}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={student.progress || 0}
                            sx={{ flexGrow: 1, mr: 1 }}
                          />
                          <Typography variant="body2">
                            {student.progress || 0}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={student.isActive !== false ? 'Active' : 'Inactive'}
                          color={student.isActive !== false ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              No students enrolled in this course yet.
            </Alert>
          )}
        </TabPanel>

        {/* Videos Tab */}
        <TabPanel value={tabValue} index={2}>
          {courseData.videos && courseData.videos.length > 0 ? (
            <Grid container spacing={3}>
              {courseData.videos.map((video) => (
                <Grid item xs={12} sm={6} md={4} key={video._id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" noWrap title={video.title}>
                        {video.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Duration: {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        URL: {video.url || video.videoUrl || 'No URL'}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <Chip label={`${video.views || 0} views`} size="small" />
                        <Button size="small" startIcon={<VisibilityIcon />}>
                          View
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              No videos uploaded for this course yet.
            </Alert>
          )}
        </TabPanel>

        {/* Content Tab */}
        <TabPanel value={tabValue} index={3}>
          {courseData.units && courseData.units.length > 0 ? (
            <Box>
              {courseData.units.map((unit, index) => (
                <Accordion key={unit._id} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      Unit {index + 1}: {unit.title}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      {unit.description}
                    </Typography>
                    
                    {unit.videos && unit.videos.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Videos ({unit.videos.length})</Typography>
                        <List dense>
                          {unit.videos.map((video, videoIndex) => (
                            <ListItem key={videoIndex}>
                              <ListItemIcon>
                                <VideoIcon />
                              </ListItemIcon>
                              <ListItemText
                                primary={video.title}
                                secondary={`Duration: ${video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                    
                    {unit.quizzes && unit.quizzes.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Quizzes ({unit.quizzes.length})</Typography>
                        <List dense>
                          {unit.quizzes.map((quiz, quizIndex) => (
                            <ListItem key={quizIndex}>
                              <ListItemIcon>
                                <QuizIcon />
                              </ListItemIcon>
                              <ListItemText
                                primary={quiz.title}
                                secondary={`Questions: ${quiz.questionCount || 0}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : (
            <Alert severity="info">
              No content units created for this course yet.
            </Alert>
          )}
        </TabPanel>

        {/* Debug Tab */}
        <TabPanel value={tabValue} index={4}>
          {debugInfo && (
            <Box>
              <Typography variant="h6" gutterBottom>API Endpoint Status</Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {debugInfo.endpoints.map((endpoint, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {endpoint.success ? (
                            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                          ) : (
                            <ErrorIcon color="error" sx={{ mr: 1 }} />
                          )}
                          <Typography variant="subtitle1">{endpoint.name}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                          {endpoint.url}
                        </Typography>
                        {endpoint.fallback && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            Fallback: {endpoint.fallback}
                          </Typography>
                        )}
                        {endpoint.error && (
                          <Alert severity="error" sx={{ mt: 1 }} size="small">
                            {endpoint.error}
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Typography variant="h6" gutterBottom>Raw Data</Typography>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Course Data JSON</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box 
                    component="pre" 
                    sx={{ 
                      bgcolor: 'grey.100', 
                      p: 2, 
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    {JSON.stringify(courseData, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Floating Action Button for Quick Actions */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 28, px: 3 }}
        >
          Add Content
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<UploadIcon />}
          sx={{ borderRadius: 28, px: 3 }}
        >
          Upload Video
        </Button>
      </Box>
    </Box>
  );
};

export default EnhancedCourseDetails;