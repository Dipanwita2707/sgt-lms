import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Button, 
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import TeacherVideoDialog from '../../components/teacher/TeacherVideoDialog';
import { formatVideoUrl } from '../../utils/videoUtils';
import { getTeacherUnitsByCourse } from '../../api/teacherApi';

const TeacherVideos = () => {
  const token = localStorage.getItem('token');
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    courseId: '',
    unitId: '',
    file: null
  });
  const [uploadError, setUploadError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [openVideoDialog, setOpenVideoDialog] = useState(false);
  const [units, setUnits] = useState([]);
  
  useEffect(() => {
    const fetchAllVideos = async () => {
      try {
        // First get all courses
        const coursesResponse = await axios.get('/api/teacher/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const courses = coursesResponse.data;
        setCourses(courses);
        const allVideos = [];
        
        // For each course, get videos
        for (const course of courses) {
          const videosResponse = await axios.get(`/api/teacher/course/${course._id}/videos`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Add course info to each video
          const videosWithCourse = videosResponse.data.map(video => ({
            ...video,
            courseName: course.title,
            courseCode: course.courseCode
          }));
          
          allVideos.push(...videosWithCourse);
        }
        
        setVideos(allVideos);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos. Please try again later.');
        setLoading(false);
      }
    };
    
    if (token) {
      fetchAllVideos();
    }
  }, [token]);
  
  const handlePlayVideo = (video) => {
    setSelectedVideo(video);
    setOpenVideoDialog(true);
  };
  
  const handleCloseVideoDialog = () => {
    setOpenVideoDialog(false);
    // Delay clearing the video data until after dialog closes to prevent UI flicker
    setTimeout(() => {
      setSelectedVideo(null);
    }, 300);
  };
  
  const handleRemoveRequest = async (videoId) => {
    try {
      const response = await axios.post(`/api/teacher/video/${videoId}/removal-request`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Removal request submitted successfully');
    } catch (err) {
      console.error('Error submitting removal request:', err);
      alert('Failed to submit removal request');
    }
  };

  const handleOpenUploadDialog = () => {
    // Reset form data
    setUploadData({
      title: '',
      description: '',
      courseId: courses.length > 0 ? courses[0]._id : '',
      unitId: '',
      file: null
    });
    setUploadError('');
    setOpenUploadDialog(true);
    
    // Fetch units for the initial course
    if (courses.length > 0) {
      fetchUnits(courses[0]._id);
    }
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUploadData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If course changes, fetch units for that course
    if (name === 'courseId' && value) {
      fetchUnits(value);
    }
  };
  
  const fetchUnits = async (courseId) => {
    try {
      setUploadData(prev => ({
        ...prev,
        unitId: ''
      }));
      
      const unitsData = await getTeacherUnitsByCourse(courseId, token);
      setUnits(unitsData);
    } catch (err) {
      console.error('Error fetching units:', err);
      setUnits([]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadData(prev => ({
        ...prev,
        file: e.target.files[0]
      }));
    }
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!uploadData.title) {
      setUploadError('Please enter a title');
      return;
    }
    
    if (!uploadData.courseId) {
      setUploadError('Please select a course');
      return;
    }
    
    // Check if units exist for this course and if unit is selected
    if (units.length > 0 && !uploadData.unitId) {
      setUploadError('Please select a unit');
      return;
    }
    
    if (!uploadData.file) {
      setUploadError('Please select a video file');
      return;
    }
    
    try {
      setUploadLoading(true);
      setUploadError('');
      
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      formData.append('video', uploadData.file);
      
      // Append unitId if available
      if (uploadData.unitId) {
        formData.append('unitId', uploadData.unitId);
      }
      
      const response = await axios.post(
        `/api/teacher/course/${uploadData.courseId}/video`, 
        formData, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Refresh video list
      const coursesResponse = await axios.get('/api/teacher/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const courses = coursesResponse.data;
      const allVideos = [];
      
      for (const course of courses) {
        const videosResponse = await axios.get(`/api/teacher/course/${course._id}/videos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const videosWithCourse = videosResponse.data.map(video => ({
          ...video,
          courseName: course.title,
          courseCode: course.courseCode
        }));
        
        allVideos.push(...videosWithCourse);
      }
      
      setVideos(allVideos);
      setUploadLoading(false);
      handleCloseUploadDialog();
      
    } catch (err) {
      console.error('Error uploading video:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload video');
      setUploadLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" gutterBottom sx={{
        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
      }}>
        My Videos
      </Typography>
      <Typography variant="subtitle1" gutterBottom sx={{
        fontSize: { xs: '0.875rem', sm: '1rem' },
        mb: { xs: 2, sm: 3 }
      }}>
        Manage your course videos
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<CloudUploadIcon />}
              onClick={handleOpenUploadDialog}
            >
              Upload New Video
            </Button>
          </Box>
          
          {videos.length === 0 ? (
            <Paper sx={{ p: 3 }}>
              <Typography>No videos uploaded yet.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {videos.map((video) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={video._id}>
                  <Card sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <CardMedia
                      component="div"
                      sx={{ 
                        height: { xs: 180, sm: 140 }, 
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <PlayCircleOutlineIcon fontSize="large" sx={{ fontSize: { xs: '3rem', sm: '2.5rem' } }} />
                    </CardMedia>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }}>
                        {video.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        gutterBottom
                        sx={{
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {video.description || 'No description'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}>
                        Course: {video.courseName} ({video.courseCode})
                      </Typography>
                      {video.unitTitle && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}>
                          Unit: {video.unitTitle}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" sx={{
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}>
                        Duration: {video.duration ? `${Math.floor(video.duration / 60)}:${video.duration % 60}` : 'Unknown'}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ 
                      justifyContent: 'space-between',
                      px: { xs: 1, sm: 2 },
                      pb: { xs: 1, sm: 2 }
                    }}>
                      <Button 
                        size="small" 
                        startIcon={<PlayCircleOutlineIcon />}
                        onClick={() => handlePlayVideo(video)}
                        sx={{
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                      >
                        Play
                      </Button>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoveRequest(video._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
      
      {/* Upload Video Dialog */}
      <Dialog open={openUploadDialog} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload New Video</DialogTitle>
        <DialogContent>
          {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
          
          <form onSubmit={handleSubmitUpload}>
            <TextField
              margin="dense"
              name="title"
              label="Video Title"
              type="text"
              fullWidth
              variant="outlined"
              value={uploadData.title}
              onChange={handleInputChange}
              required
              disabled={uploadLoading}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              value={uploadData.description}
              onChange={handleInputChange}
              multiline
              rows={3}
              disabled={uploadLoading}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel id="course-select-label">Course</InputLabel>
              <Select
                labelId="course-select-label"
                name="courseId"
                value={uploadData.courseId}
                label="Course"
                onChange={handleInputChange}
                required
                disabled={uploadLoading}
              >
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.title} ({course.courseCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {units.length > 0 && (
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                <InputLabel id="unit-select-label">Unit</InputLabel>
                <Select
                  labelId="unit-select-label"
                  name="unitId"
                  value={uploadData.unitId}
                  label="Unit"
                  onChange={handleInputChange}
                  required
                  disabled={uploadLoading}
                >
                  {units.map((unit) => (
                    <MenuItem key={unit._id} value={unit._id}>
                      {unit.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <Button
              variant="outlined"
              component="label"
              disabled={uploadLoading}
              fullWidth
              sx={{ mb: 2 }}
            >
              Select Video File
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            
            {uploadData.file && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                Selected file: {uploadData.file.name}
              </Typography>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog} disabled={uploadLoading}>Cancel</Button>
          <Button 
            onClick={handleSubmitUpload} 
            variant="contained" 
            color="primary" 
            disabled={uploadLoading}
            startIcon={uploadLoading ? <CircularProgress size={20} /> : null}
          >
            {uploadLoading ? 'Uploading...' : 'Upload Video'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Video Player Dialog */}
      <TeacherVideoDialog
        open={openVideoDialog}
        onClose={handleCloseVideoDialog}
        video={selectedVideo}
      />
    </Box>
  );
};

export default TeacherVideos;
