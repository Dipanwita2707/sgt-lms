import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  TextField,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  VideoLibrary as VideoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  BarChart as BarChartIcon,
  OndemandVideo as OndemandVideoIcon,
  Add as AddIcon,
  QuestionAnswer as QuizIcon
} from '@mui/icons-material';

import { getCourseDetails, getCourseVideos, getCourseStudents } from '../../api/courseApi';
import { getQuizDetails, getQuizPoolQuestions, getQuizPoolAnalytics } from '../../api/quizPoolApi';
import { getVideoAnalytics } from '../../api/videoApi';
import { createUnit, recalculateUnitAccess } from '../../api/unitApi';

// Helper function to format duration in seconds to readable format
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Helper function to calculate progress percentage
const calculateProgress = (completedCount, totalCount) => {
  if (!totalCount) return 0;
  return Math.round((completedCount / totalCount) * 100);
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`course-tabpanel-${index}`}
      aria-labelledby={`course-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const VideoAnalyticsDialog = ({ open, onClose, videoId, token }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && videoId) {
      const fetchAnalytics = async () => {
        try {
          setLoading(true);
          const data = await getVideoAnalytics(videoId, token);
          setAnalytics(data);
        } catch (error) {
          console.error('Error fetching video analytics:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAnalytics();
    }
  }, [open, videoId, token]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="lg"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center' }}>
        <BarChartIcon sx={{ mr: 1 }} />
        Video Analytics & Player
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : analytics ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              {analytics.videoTitle}
            </Typography>
            
            {/* Video Player */}
            <Box sx={{ mb: 3 }}>
              <video
                controls
                width="100%"
                height="400"
                style={{ borderRadius: '8px', backgroundColor: '#000' }}
                src={analytics.videoUrl}
                poster={analytics.thumbnail}
                onLoadedMetadata={(e) => {
                  console.log('Video metadata loaded, actual duration:', e.target.duration);
                }}
                onError={(e) => {
                  console.error('Video loading error for URL:', analytics.videoUrl, e);
                  // Try alternative URL if the current one fails
                  if (!analytics.videoUrl.startsWith('http')) {
                    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                    const fallbackUrl = `${API_BASE_URL}/${analytics.videoUrl}`;
                    console.log('Trying fallback URL:', fallbackUrl);
                    e.target.src = fallbackUrl;
                  }
                }}
                onCanPlay={() => {
                  console.log('Video can play, URL is working:', analytics.videoUrl);
                }}
              >
                <source src={analytics.videoUrl} type="video/mp4" />
                <source src={analytics.videoUrl} type="video/webm" />
                <source src={analytics.videoUrl} type="video/avi" />
                <source src={analytics.videoUrl} type="video/mov" />
                Your browser does not support the video tag.
              </video>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Video URL: {analytics.videoUrl}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Fallback URL: {analytics.videoUrl.startsWith('http') ? 'N/A' : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${analytics.videoUrl}`}
              </Typography>
            </Box>

            {/* Analytics Overview */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Overall Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Total Views</Typography>
                      <Typography variant="h4">{analytics.totalViews}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Average Watch Time</Typography>
                      <Typography variant="h4">{formatDuration(analytics.averageWatchTime)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                      <Typography variant="h4">{analytics.completionRate}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Total Watch Time</Typography>
                      <Typography variant="h4">{formatDuration(analytics.totalViews * analytics.averageWatchTime)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
            
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
              Student Viewing Data
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reg. No.</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Watch Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Progress</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Sessions</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Last Watched</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.studentData?.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.regNo}</TableCell>
                      <TableCell>{formatDuration(student.watchTime)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={student.progress} 
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {student.progress}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {student.sessionCount || 0} sessions
                        {student.averageSessionLength > 0 && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Avg: {formatDuration(student.averageSessionLength)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{student.lastWatched ? new Date(student.lastWatched).toLocaleString() : 'Never'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Typography color="error">Failed to load analytics data</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const CourseDetails = ({ courseId, onBack, token }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [courseDetails, setCourseDetails] = useState(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizDialogLoading, setQuizDialogLoading] = useState(false);
  const [quizDialogError, setQuizDialogError] = useState('');
  const [selectedQuizData, setSelectedQuizData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoAnalyticsOpen, setVideoAnalyticsOpen] = useState(false);
  const [addUnitDialogOpen, setAddUnitDialogOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ 
    title: '', 
    description: '', 
    hasDeadline: false,
    deadline: '',
    deadlineDescription: '',
    strictDeadline: true,
    warningDays: 3
  });
  const [unitCreationError, setUnitCreationError] = useState('');
  const [unitCreationSuccess, setUnitCreationSuccess] = useState(false);
  const [unitCreationLoading, setUnitCreationLoading] = useState(false);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  const [recalculateMessage, setRecalculateMessage] = useState('');

  // helper to fetch pool analytics
  const fetchPoolAnalytics = async (poolId) => {
    try {
      return await getQuizPoolAnalytics(poolId, token);
    } catch (e) {
      console.error('Failed to fetch quiz pool analytics', e);
      return null;
    }
  };

  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true);
      try {
        // Fetch course details, videos, and students in parallel
        const [details, videosData, studentsData] = await Promise.all([
          getCourseDetails(courseId, token),
          getCourseVideos(courseId, token),
          getCourseStudents(courseId, token)
        ]);
        
        console.log('Course details:', details);
        console.log('Videos data:', videosData);
        console.log('Video URLs after processing:', videosData.map(v => ({ id: v._id, title: v.title, url: v.url, duration: v.duration })));
        console.log('Students data:', studentsData);
        
        setCourseDetails(details);
        setVideos(videosData);
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, token]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleViewAnalytics = (videoId) => {
    console.log('handleViewAnalytics called with videoId:', videoId);
    console.log('Available videos:', videos.map(v => ({ id: v._id, title: v.title, url: v.url })));
    
    // Find the video in the videos array first
    const videoInList = videos.find(v => v._id === videoId);
    if (videoInList) {
      console.log('Found video in list:', videoInList);
    } else {
      console.warn('Video not found in videos list, checking course details...');
      // Also check in course details units
      if (courseDetails?.units) {
        for (const unit of courseDetails.units) {
          if (unit.videos) {
            const foundVideo = unit.videos.find(v => v._id === videoId);
            if (foundVideo) {
              console.log('Found video in unit:', foundVideo);
              break;
            }
          }
        }
      }
    }
    
    setSelectedVideo(videoId);
    setVideoAnalyticsOpen(true);
  };

  const closeVideoAnalytics = () => {
    setVideoAnalyticsOpen(false);
  };

  const handleCreateUnit = async () => {
    try {
      setUnitCreationError('');
      setUnitCreationSuccess(false);
      setUnitCreationLoading(true);
      
      if (!newUnit.title) {
        setUnitCreationError('Unit title is required');
        setUnitCreationLoading(false);
        return;
      }
      
      await createUnit(courseId, newUnit, token);
      setNewUnit({ 
        title: '', 
        description: '', 
        hasDeadline: false,
        deadline: '',
        deadlineDescription: '',
        strictDeadline: true,
        warningDays: 3
      });
      setUnitCreationSuccess(true);
      
      // Refresh course data
      const [details, videosData, studentsData] = await Promise.all([
        getCourseDetails(courseId, token),
        getCourseVideos(courseId, token),
        getCourseStudents(courseId, token)
      ]);
      
      setCourseDetails(details);
      setVideos(videosData);
      setStudents(studentsData);
      
      // Close dialog after a delay to show success message
      setTimeout(() => {
        setAddUnitDialogOpen(false);
        setUnitCreationSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error creating unit:', error);
      setUnitCreationError(error.message || 'Failed to create unit');
    } finally {
      setUnitCreationLoading(false);
    }
  };

  const handleRecalculateUnitAccess = async () => {
    try {
      setRecalculateLoading(true);
      setRecalculateMessage('');
      
      const result = await recalculateUnitAccess(courseId, token);
      
      setRecalculateMessage(
        `✅ Success! Updated ${result.studentsUpdated} students, unlocked ${result.unitsUnlocked} units`
      );
      
      // Refresh course data to show updated progress
      setTimeout(async () => {
        try {
          const [details, studentsData] = await Promise.all([
            getCourseDetails(courseId, token),
            getCourseStudents(courseId, token)
          ]);
          setCourseDetails(details);
          setStudents(studentsData);
        } catch (error) {
          console.error('Error refreshing course data:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error recalculating unit access:', error);
      setRecalculateMessage(`❌ Error: ${error.message || 'Failed to recalculate unit access'}`);
    } finally {
      setRecalculateLoading(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setRecalculateMessage('');
      }, 5000);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!courseDetails) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Failed to load course details
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mt: 2 }}>
          Back to Course List
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Course Header */}
        <Box sx={{ 
          p: 3, 
          backgroundColor: 'primary.main', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit" onClick={onBack} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {courseDetails.courseCode}: {courseDetails.title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                {courseDetails.description}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Chip 
              label={`${students.length} Students`} 
              color="secondary" 
              sx={{ mr: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} 
            />
            <Chip 
              label={`${videos.length} Videos`} 
              color="secondary" 
              sx={{ backgroundColor: 'rgba(255,255,255,0.15)' }} 
            />
          </Box>
        </Box>

        {/* Course Summary */}
        <Box sx={{ p: 3, backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Overall Progress
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                    <Typography variant="h4" component="div">
                      {courseDetails.overallProgress || 0}%
                    </Typography>
                    <Typography sx={{ mb: 1, ml: 1 }} color="text.secondary">
                      completed
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={courseDetails.overallProgress || 0}
                    sx={{ height: 10, borderRadius: 5, mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Teachers Assigned
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {courseDetails.teachers && courseDetails.teachers.length > 0 ? (
                      courseDetails.teachers.map((teacher, index) => (
                        <Chip 
                          key={index}
                          avatar={<Avatar>{teacher.name.charAt(0)}</Avatar>}
                          label={teacher.name}
                          sx={{ m: 0.5 }}
                        />
                      ))
                    ) : (
                      <Typography color="text.secondary">No teachers assigned</Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Course Statistics
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Total Students:</strong> {students.length}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Total Videos:</strong> {videos.length}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Created On:</strong> {new Date(courseDetails.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Tabs for different sections */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="course details tabs">
            <Tab icon={<PersonIcon />} iconPosition="start" label="Students" />
            <Tab icon={<VideoIcon />} iconPosition="start" label="Videos" />
            <Tab icon={<SchoolIcon />} iconPosition="start" label="Content" />
          </Tabs>
        </Box>

        {/* Students Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Enrolled Students ({students.length})
          </Typography>
          
          {students.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reg No</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Progress</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {student.name.charAt(0)}
                          </Avatar>
                          {student.name}
                        </Box>
                      </TableCell>
                      <TableCell>{student.regNo}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={student.progress || 0}
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {student.progress || 0}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={student.isActive ? 'Active' : 'Inactive'}
                          color={student.isActive ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">
              No students enrolled in this course yet.
            </Typography>
          )}
        </TabPanel>

        {/* Videos Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Course Videos ({videos.length})
          </Typography>
          
          {videos.length > 0 ? (
            <Grid container spacing={3}>
              {videos.map((video) => {
                console.log('Rendering video:', video._id, video.title);
                return (
                <Grid item xs={12} md={6} lg={4} key={video._id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => {
                      console.log('Video clicked:', video._id);
                      handleViewAnalytics(video._id);
                    }}>
                      <Box 
                        component="video"
                        src={video.url}
                        poster={video.thumbnail}
                        sx={{ 
                          width: '100%', 
                          height: 180, 
                          objectFit: 'cover',
                          backgroundColor: '#000',
                          pointerEvents: 'none' // Prevent video controls from interfering with click
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          borderRadius: '50%',
                          width: 60,
                          height: 60,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '24px'
                        }}
                      >
                        ▶
                      </Box>
                      {video.warned && (
                        <Chip
                          icon={<WarningIcon />}
                          label="Flagged Content"
                          color="warning"
                          size="small"
                          sx={{ position: 'absolute', top: 8, right: 8 }}
                        />
                      )}
                      <Chip
                        label={formatDuration(video.duration)}
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          bottom: 8, 
                          right: 8,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: 'white'
                        }}
                      />
                    </Box>
                    
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" component="div" noWrap title={video.title}>
                        {video.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {video.teacherName || 'Unknown Teacher'}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {video.views || 0} views
                        </Typography>
                        <Chip 
                          label={`${video.completionRate || 0}% completion`}
                          size="small"
                          color={video.completionRate > 75 ? 'success' : video.completionRate > 40 ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                    
                    <Divider />
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        size="small" 
                        startIcon={<BarChartIcon />}
                        onClick={() => handleViewAnalytics(video._id)}
                      >
                        View Analytics
                      </Button>
                    </Box>
                  </Card>
                </Grid>
                );
              })}
            </Grid>
          ) : (
            <Typography color="text.secondary">
              No videos have been uploaded for this course yet.
            </Typography>
          )}
        </TabPanel>

        {/* Content Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Course Content
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => setAddUnitDialogOpen(true)}
              >
                Add New Unit
              </Button>
              
              <Button 
                variant="outlined" 
                color="secondary" 
                startIcon={<SchoolIcon />}
                onClick={handleRecalculateUnitAccess}
                disabled={recalculateLoading}
                size="small"
              >
                {recalculateLoading ? 'Recalculating...' : 'Fix Unit Access'}
              </Button>
            </Box>
          </Box>
          
          {recalculateMessage && (
            <Alert 
              severity={recalculateMessage.includes('✅') ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              {recalculateMessage}
            </Alert>
          )}
          
          {courseDetails.units && courseDetails.units.length > 0 ? (
            <Box>
              {courseDetails.units.map((unit, index) => (
                <Card key={unit._id} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Unit {index + 1}: {unit.title}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {unit.description}
                    </Typography>
                    
                    <List>
                      {/* Display Videos */}
                      {unit.videos && unit.videos.length > 0 ? (
                        unit.videos.map((video, videoIndex) => (
                          <ListItem 
                            key={videoIndex} 
                            alignItems="flex-start"
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'action.hover' },
                              borderRadius: 1,
                              mb: 1
                            }}
                            onClick={() => {
                              console.log('Unit video clicked:', video._id);
                              handleViewAnalytics(video._id);
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <OndemandVideoIcon />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Typography component="span">
                                    {video.title}
                                  </Typography>
                                  <Chip 
                                    icon={<OndemandVideoIcon />} 
                                    label="Play Video" 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined"
                                  />
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography component="span" variant="body2" color="text.primary">
                                    Duration: {formatDuration(video.duration)}
                                  </Typography>
                                  {" — "}{video.description}
                                  <br />
                                  <Typography variant="caption" color="text.secondary">
                                    URL: {video.videoUrl || 'No URL'}
                                  </Typography>
                                </>
                              }
                            />
                          </ListItem>
                        ))
                      ) : null}
                      
                      {/* Display Quizzes */}
                      {unit.quizzes && unit.quizzes.length > 0 ? (
                        <>
                          <Divider textAlign="left" sx={{ my: 2 }}>
                            <Chip label="Quizzes" color="primary" icon={<QuizIcon />} />
                          </Divider>
                          {unit.quizzes.map((quiz, quizIndex) => (
                            <ListItem key={quizIndex} alignItems="flex-start" button onClick={async () => {
                              setQuizDialogError('');
                              setQuizDialogLoading(true);
                              setQuizDialogOpen(true);
                              try {
                                const data = await getQuizDetails(quiz._id, token);
                                setSelectedQuizData({ type: 'quiz', data });
                              } catch (e) {
                                setQuizDialogError(e.response?.data?.message || e.message);
                              } finally {
                                setQuizDialogLoading(false);
                              }
                            }}>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'error.main' }}>
                                  <QuizIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography component="span">
                                      {quiz.title}
                                    </Typography>
                                    {quiz.isActive && (
                                      <Chip 
                                        label="Active" 
                                        color="success" 
                                        size="small" 
                                        sx={{ ml: 1 }} 
                                      />
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography component="span" variant="body2" color="text.primary">
                                      Questions: {quiz.questionCount || quiz.questions?.length || 0}
                                    </Typography>
                                    {quiz.description && <> — {quiz.description}</>}
                                  </>
                                }
                              />
                            </ListItem>
                          ))}
                        </>
                      ) : null}
                      
                      {/* Display Quiz Pools */}
                      {unit.quizPools && unit.quizPools.length > 0 ? (
                        <>
                          <Divider textAlign="left" sx={{ my: 2 }}>
                            <Chip label="Quiz Pools" color="secondary" icon={<QuizIcon />} />
                          </Divider>
                          {unit.quizPools.map((pool, poolIndex) => (
                            <ListItem key={poolIndex} alignItems="flex-start" button onClick={async () => {
                              setQuizDialogError('');
                              setQuizDialogLoading(true);
                              setQuizDialogOpen(true);
                              try {
                                const [questionsResponse, analytics] = await Promise.all([
                                  getQuizPoolQuestions(pool._id, token),
                                  fetchPoolAnalytics(pool._id)
                                ]);
                                // Extract questions array from the response object
                                const questions = questionsResponse.questions || questionsResponse;
                                setSelectedQuizData({ type: 'pool', data: { pool, questions, analytics } });
                              } catch (e) {
                                setQuizDialogError(e.response?.data?.message || e.message);
                              } finally {
                                setQuizDialogLoading(false);
                              }
                            }}>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'warning.main' }}>
                                  <QuizIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography component="span">
                                      {pool.title}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography component="span" variant="body2" color="text.primary">
                                      Quiz Pool • {pool.questionCount || 0} questions
                                    </Typography>
                                    {pool.description && <> — {pool.description}</>}
                                  </>
                                }
                              />
                            </ListItem>
                          ))}
                        </>
                      ) : null}
                      
                    </List>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary">
              No units have been created for this course yet. Click "Add New Unit" to create course content.
            </Typography>
          )}
        </TabPanel>
      </Paper>

      {/* Video Analytics Dialog */}
      <VideoAnalyticsDialog
        open={videoAnalyticsOpen}
        onClose={closeVideoAnalytics}
        videoId={selectedVideo}
        token={token}
      />

      {/* Add Unit Dialog */}
      <Dialog
        open={addUnitDialogOpen}
        onClose={() => {
          if (!unitCreationSuccess) {
            setAddUnitDialogOpen(false);
            setUnitCreationError('');
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
          Add New Unit
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {unitCreationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {unitCreationError}
            </Alert>
          )}
          
          {unitCreationSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Unit created successfully!
            </Alert>
          )}
          
          <Typography variant="body2" gutterBottom>
            Create a new unit for this course to organize content. You can add videos, quizzes, and reading materials to the unit later.
          </Typography>
          <TextField
            label="Unit Title"
            fullWidth
            margin="normal"
            required
            value={newUnit.title}
            onChange={(e) => setNewUnit({ ...newUnit, title: e.target.value })}
            disabled={unitCreationSuccess}
            error={!!(unitCreationError && !newUnit.title)}
            helperText={unitCreationError && !newUnit.title ? "Title is required" : ""}
          />
          <TextField
            label="Unit Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={newUnit.description}
            onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })}
            disabled={unitCreationSuccess}
          />
          
          {/* Deadline Settings */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Deadline Settings
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newUnit.hasDeadline}
                  onChange={(e) => {
                    console.log('Deadline checkbox toggled:', e.target.checked);
                    setNewUnit({ ...newUnit, hasDeadline: e.target.checked });
                  }}
                  disabled={unitCreationSuccess}
                />
              }
              label="Set completion deadline for this unit"
            />
            {/* Debug info */}
            <Typography variant="caption" color="text.secondary" display="block">
              Has deadline: {newUnit.hasDeadline ? 'Yes' : 'No'}
            </Typography>
          </Box>
          
          {newUnit.hasDeadline && (
            <Box sx={{ pl: 2, pb: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <TextField
                label="Deadline Date & Time"
                type="datetime-local"
                fullWidth
                margin="normal"
                required
                value={newUnit.deadline}
                onChange={(e) => setNewUnit({ ...newUnit, deadline: e.target.value })}
                disabled={unitCreationSuccess}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: new Date().toISOString().slice(0, 16) // Prevent past dates
                }}
                helperText="Students must complete this unit before this deadline"
              />
              
              <TextField
                label="Deadline Description (Optional)"
                fullWidth
                margin="normal"
                value={newUnit.deadlineDescription}
                onChange={(e) => setNewUnit({ ...newUnit, deadlineDescription: e.target.value })}
                disabled={unitCreationSuccess}
                placeholder="e.g., End of Module 1, Midterm preparation, etc."
                helperText="Optional description to help students understand the deadline context"
              />
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Warning Days</InputLabel>
                    <Select
                      value={newUnit.warningDays}
                      onChange={(e) => setNewUnit({ ...newUnit, warningDays: e.target.value })}
                      disabled={unitCreationSuccess}
                    >
                      <MenuItem value={1}>1 day before</MenuItem>
                      <MenuItem value={2}>2 days before</MenuItem>
                      <MenuItem value={3}>3 days before</MenuItem>
                      <MenuItem value={5}>5 days before</MenuItem>
                      <MenuItem value={7}>1 week before</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newUnit.strictDeadline}
                        onChange={(e) => setNewUnit({ ...newUnit, strictDeadline: e.target.checked })}
                        disabled={unitCreationSuccess}
                      />
                    }
                    label="Strict deadline"
                    sx={{ mt: 2 }}
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    If enabled, no marks/watch time will be counted after deadline
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {unitCreationSuccess ? (
            <Button 
              onClick={() => {
                setAddUnitDialogOpen(false);
                setUnitCreationSuccess(false);
                setNewUnit({ 
                  title: '', 
                  description: '', 
                  hasDeadline: false,
                  deadline: '',
                  deadlineDescription: '',
                  strictDeadline: true,
                  warningDays: 3
                });
              }} 
              color="primary"
              variant="contained"
            >
              Close
            </Button>
          ) : (
            <>
              <Button 
                onClick={() => {
                  setAddUnitDialogOpen(false);
                  setUnitCreationError('');
                  setNewUnit({ 
                    title: '', 
                    description: '', 
                    hasDeadline: false,
                    deadline: '',
                    deadlineDescription: '',
                    strictDeadline: true,
                    warningDays: 3
                  });
                }} 
                color="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUnit}
                color="primary"
                variant="contained"
                disabled={!newUnit.title || unitCreationLoading}
              >
                {unitCreationLoading ? 'Creating...' : 'Create Unit'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Quiz / Quiz Pool Detail Dialog */}
      <Dialog
        open={quizDialogOpen}
        onClose={() => { setQuizDialogOpen(false); setSelectedQuizData(null); }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
          {selectedQuizData?.type === 'pool' ? 'Quiz Pool Questions' : 'Quiz Details'}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 600 }}>
          {quizDialogLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}
          {quizDialogError && !quizDialogLoading && (
            <Alert severity="error" sx={{ mb: 2 }}>{quizDialogError}</Alert>
          )}
          {!quizDialogLoading && !quizDialogError && selectedQuizData && (
            <Box>
              {selectedQuizData.type === 'quiz' && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>{selectedQuizData.data.quiz.title}</Typography>
                  {selectedQuizData.data.quiz.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedQuizData.data.quiz.description}
                    </Typography>
                  )}
                  <Typography variant="body2" gutterBottom>
                    Course: {selectedQuizData.data.quiz.course?.title} | Unit: {selectedQuizData.data.quiz.unit?.title || 'N/A'}
                  </Typography>
                  {selectedQuizData.data.quiz.createdBy && (
                    <Typography variant="body2" gutterBottom>
                      Uploaded By: {selectedQuizData.data.quiz.createdBy.name} ({selectedQuizData.data.quiz.createdBy.email})
                    </Typography>
                  )}
                  <Typography variant="body2" gutterBottom>
                    Questions: {selectedQuizData.data.quiz.questionCount} • Total Points: {selectedQuizData.data.quiz.totalPoints}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>Questions & Answers</Typography>
                  {selectedQuizData.data.questions && Array.isArray(selectedQuizData.data.questions) ? selectedQuizData.data.questions.map((q, idx) => (
                    <Paper key={q._id} sx={{ p:2, mb:2 }} variant="outlined">
                      <Typography variant="subtitle2" gutterBottom>
                        {idx + 1}. {q.questionText}
                      </Typography>
                      <Box sx={{ pl:1 }}>
                        {q.options.map((opt, oIdx) => (
                          <Typography key={oIdx} variant="body2" sx={{ fontWeight: oIdx === q.correctOption ? 'bold' : 'normal', color: oIdx === q.correctOption ? 'success.main' : 'text.primary' }}>
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </Typography>
                        ))}
                      </Box>
                      <Typography variant="caption" color="text.secondary">Points: {q.points}</Typography>
                    </Paper>
                  )) : (
                    <Typography variant="body2" color="text.secondary">No questions available</Typography>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>Student Attempts (Direct)</Typography>
                  {selectedQuizData.data.attempts.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No direct attempts recorded (pool-based quizzes won't list here).</Typography>
                  ) : (
                    <Table size="small" sx={{ mb:2 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Student</TableCell>
                          <TableCell>Reg No</TableCell>
                          <TableCell>Score</TableCell>
                          <TableCell>%</TableCell>
                          <TableCell>Passed</TableCell>
                          <TableCell>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedQuizData.data.attempts.map(a => (
                          <TableRow key={a._id}>
                            <TableCell>{a.student?.name}</TableCell>
                            <TableCell>{a.student?.regNo}</TableCell>
                            <TableCell>{a.score}/{a.maxScore}</TableCell>
                            <TableCell>{a.percentage.toFixed(1)}%</TableCell>
                            <TableCell>{a.passed ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{a.completedAt ? new Date(a.completedAt).toLocaleString() : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              )}
              {selectedQuizData.type === 'pool' && (
                <Box>
                  <Typography variant="h6" gutterBottom>{selectedQuizData.data.pool.title}</Typography>
                  {selectedQuizData.data.pool.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedQuizData.data.pool.description}
                    </Typography>
                  )}
                  <Typography variant="body2" gutterBottom>
                    Total Questions: {selectedQuizData.data.pool.questionCount || (selectedQuizData.data.questions?.length || 0)} (Pool Count) • Loaded: {selectedQuizData.data.questions?.length || 0}
                  </Typography>
                  
                  {selectedQuizData.data.pool.contributors && selectedQuizData.data.pool.contributors.length > 0 && (
                    <Box sx={{ mb:2 }}>
                      <Typography variant="subtitle2" gutterBottom>Contributors:</Typography>
                      {selectedQuizData.data.pool.contributors.map(c => (
                        <Chip key={c._id} label={c.name} size="small" sx={{ mr:0.5, mt:0.5 }} />
                      ))}
                    </Box>
                  )}
                  
                  {selectedQuizData.data.analytics && (
                    <Box sx={{ mb:3 }}>
                      <Divider sx={{ my:2 }} />
                      <Typography variant="subtitle1" gutterBottom>Student Attempts</Typography>
                      {(() => {
                        // Get attempts from either analytics.attempts or root-level attempts
                        const attempts = selectedQuizData.data.analytics?.attempts || selectedQuizData.data.attempts || [];
                        
                        if (attempts.length === 0) {
                          return <Typography variant="body2" color="text.secondary">No attempts yet.</Typography>;
                        }
                        
                        return (
                          <Table size="small" sx={{ mb:2 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Student</TableCell>
                                <TableCell>Reg No</TableCell>
                                <TableCell>Score</TableCell>
                                <TableCell>%</TableCell>
                                <TableCell>Passed</TableCell>
                                <TableCell>Date</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {attempts.map(a => (
                                <TableRow key={a._id}>
                                  <TableCell>{a.student?.name}</TableCell>
                                  <TableCell>{a.student?.regNo}</TableCell>
                                  <TableCell>{a.score}/{a.maxScore}</TableCell>
                                  <TableCell>{a.percentage.toFixed(1)}%</TableCell>
                                  <TableCell>{a.passed ? 'Yes' : 'No'}</TableCell>
                                  <TableCell>{a.completedAt ? new Date(a.completedAt).toLocaleString() : '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        );
                      })()}
                    </Box>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>Questions</Typography>
                  {selectedQuizData.data.questions && Array.isArray(selectedQuizData.data.questions) ? selectedQuizData.data.questions.map((q, idx) => (
                    <Paper key={q._id} sx={{ p:2, mb:2 }} variant="outlined">
                      <Typography variant="subtitle2" gutterBottom>
                        {idx + 1}. {q.text}
                      </Typography>
                      <Box sx={{ pl:1 }}>
                        {q.options.map((opt, oIdx) => (
                          <Typography key={oIdx} variant="body2" sx={{ fontWeight: opt.isCorrect ? 'bold' : 'normal', color: opt.isCorrect ? 'success.main' : 'text.primary' }}>
                            {String.fromCharCode(65 + oIdx)}. {opt.text}
                          </Typography>
                        ))}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display:'block', mt:0.5 }}>
                        Points: {q.points} • Source Quiz: {q.originalQuizTitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Question Uploader: {q.uploader?.name || 'Unknown'}{q.uploader?.teacherId ? ` (${q.uploader.teacherId})` : ''} • User ID: {q.uploader?.id || 'N/A'}
                      </Typography>
                    </Paper>
                  )) : (
                    <Typography variant="body2" color="text.secondary">No questions available</Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setQuizDialogOpen(false); setSelectedQuizData(null); }}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CourseDetails;
