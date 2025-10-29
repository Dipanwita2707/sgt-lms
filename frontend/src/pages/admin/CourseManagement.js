import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Paper, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Button, 
  Box, 
  Tabs, 
  Tab, 
  Divider, 
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Fade
} from '@mui/material';
import CourseForm from '../../components/admin/CourseForm';
import CourseTable from '../../components/admin/CourseTable';
import CourseDetails from '../../components/admin/CourseDetails';
import VideoTable from '../../components/admin/VideoTable';
import VideoUploadDialog from '../../components/admin/VideoUploadDialog';
import BulkAssignCourses from '../../components/admin/BulkAssignCourses';
import BulkUploadCourses from '../../components/admin/BulkUploadCourses';
import {
  getCourses,
  createCourse,
  editCourse,
  deleteCourse,
  // assignCourseToTeacher, // REMOVED: Use section-based assignment
  bulkAssignCourses,
  bulkUploadCourses
} from '../../api/courseApi';
import { uploadVideo, removeVideo, warnVideo } from '../../api/videoApi';
import AddIcon from '@mui/icons-material/Add';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import SchoolIcon from '@mui/icons-material/School';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Tab Panel component for switching between views
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`course-tabpanel-${index}`}
      aria-labelledby={`course-tab-${index}`}
      {...other}
      style={{ padding: '16px 0' }}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [editCourseId, setEditCourseId] = useState(null);
  const [videos, setVideos] = useState([]); // For demo, videos can be fetched per course if needed
  const [uploadDialog, setUploadDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [viewingCourseDetails, setViewingCourseDetails] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const token = localStorage.getItem('token');

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCourses(token);
      setCourses(data);
    } catch (err) {
      setError('Failed to fetch courses');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line
  }, []);

  const handleCreateCourse = async (form) => {
    try {
      await createCourse(form, token);
      setSnackbar('Course created successfully');
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create course');
    }
  };

  const handleEditCourse = async (updates) => {
    try {
      await editCourse(editCourseId, updates, token);
      setSnackbar('Course updated successfully');
      setEditCourseId(null);
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update course');
    }
  };

  const handleDeleteCourse = async (id) => {
    try {
      await deleteCourse(id, token);
      setSnackbar('Course deleted successfully');
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete course');
    }
  };



  const handleBulkAssign = async (file) => {
    try {
      await bulkAssignCourses(file, token);
      setSnackbar('Bulk course assignment completed successfully');
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk assignment failed');
    }
  };
  
  const handleBulkUpload = async (file) => {
    try {
      await bulkUploadCourses(file, token);
      setSnackbar('Courses uploaded successfully');
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk upload failed');
    }
  };

  // Video management handlers
  const handleUploadVideo = async (data, setProgress) => {
    try {
      // Make sure unitId is included in the upload
      const videoData = { 
        ...data,
        file: data.file,
        title: data.title,
        description: data.description,
        courseId: data.courseId,
        unitId: data.unitId
      };
      
      await uploadVideo(videoData, token, setProgress);
      setSnackbar('Video uploaded successfully');
      setUploadDialog(false);
      // Optionally refresh video list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload video');
    }
  };

  const handleRemoveVideo = async (id) => {
    try {
      await removeVideo(id, token);
      setSnackbar('Video removed successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove video');
    }
  };

  const handleWarnVideo = async (id) => {
    try {
      await warnVideo(id, token);
      setSnackbar('Video warned successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to warn video');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  const handleViewCourseDetails = (courseId) => {
    setSelectedCourseId(courseId);
    setViewingCourseDetails(true);
  };

  const handleBackFromCourseDetails = () => {
    setViewingCourseDetails(false);
    setSelectedCourseId(null);
  };

  // If viewing course details, show the course details component
  if (viewingCourseDetails && selectedCourseId) {
    return (
      <Container maxWidth="xl">
        <CourseDetails 
          courseId={selectedCourseId} 
          onBack={handleBackFromCourseDetails} 
          token={token} 
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 0, mb: 4, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ 
          p: 2, 
          backgroundColor: 'primary.main', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Course Management Center
          </Typography>
          <Box>
            <Tooltip title="Refresh Data">
              <IconButton color="inherit" onClick={fetchCourses} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Help">
              <IconButton color="inherit" onClick={toggleHelp}>
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Fade in={showHelp}>
          <Box sx={{ p: 2, backgroundColor: 'info.light', display: showHelp ? 'block' : 'none' }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">Quick Help</Typography>
            <Typography variant="body2">
              • <strong>Create Courses:</strong> Add new courses with detailed information and assign teachers.<br />
              • <strong>Bulk Operations:</strong> Upload multiple courses or assign courses to students in bulk using CSV files.<br />
              • <strong>Manage Courses:</strong> View, edit, and delete existing courses or assign teachers to them.<br />
              • <strong>Videos:</strong> Upload and manage course-related videos.<br />
              • <strong>Course Details:</strong> Click on a course title or the "Details" button to view comprehensive course information.
            </Typography>
          </Box>
        </Fade>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            aria-label="course management tabs"
            sx={{ px: 2 }}
          >
            <Tab icon={<AddIcon />} label="Create Course" iconPosition="start" />
            <Tab icon={<SchoolIcon />} label="Manage Courses" iconPosition="start" />
            <Tab icon={<CloudUploadIcon />} label="Bulk Operations" iconPosition="start" />
            <Tab icon={<VideoLibraryIcon />} label="Videos" iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Create New Course
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
              Add a new course to the system by providing the details below. Teachers will be assigned to courses through sections.
            </Typography>
            <CourseForm onSubmit={handleCreateCourse} submitLabel="Create Course" />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Course List
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
              View and manage all courses. Click on a course title or the "Details" button to view comprehensive information including assigned students, videos, and analytics.
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <CourseTable
                courses={courses}
                onEdit={course => {
                  setEditCourseId(course._id);
                  setTabValue(0); // Switch to create/edit tab
                }}
                onDelete={handleDeleteCourse}
                onViewDetails={handleViewCourseDetails}
              />
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Bulk Operations
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader 
                    title="Bulk Upload Courses" 
                    subheader="Upload multiple courses at once using a CSV file"
                  />
                  <CardContent>
                    <BulkUploadCourses onUpload={handleBulkUpload} />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader 
                    title="Bulk Assign Courses" 
                    subheader="Assign courses to students in bulk using a CSV file"
                  />
                  <CardContent>
                    <BulkAssignCourses onUpload={handleBulkAssign} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Course Videos
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
              Manage videos associated with your courses. You can upload new videos or manage existing ones.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<CloudUploadIcon />}
                onClick={() => setUploadDialog(true)}
              >
                Upload New Video
              </Button>
            </Box>
            
            <VideoTable
              videos={videos}
              onRemove={handleRemoveVideo}
              onWarn={handleWarnVideo}
              onEdit={() => {}}
            />
            
            <VideoUploadDialog
              open={uploadDialog}
              onClose={() => setUploadDialog(false)}
              onUpload={handleUploadVideo}
            />
          </Box>
        </TabPanel>
      </Paper>

      {/* Edit Course - Shows in the Create tab but with different title */}
      {editCourseId && tabValue === 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Edit Course
          </Typography>
          <CourseForm
            onSubmit={handleEditCourse}
            initial={courses.find(c => c._id === editCourseId)}
            submitLabel="Update Course"
          />
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={() => setEditCourseId(null)}
            >
              Cancel Editing
            </Button>
          </Box>
        </Box>
      )}

      <Snackbar 
        open={!!snackbar} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnackbar('')}>
          {snackbar}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CourseManagement;
