import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper, 
  CircularProgress,
  Alert,
  Container,
  Grid
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { getTeacherCourses, uploadCourseVideo } from '../../api/teacherApi';
import { getUnitsByCourse } from '../../api/unitApi';

const VideoUpload = ({ token, user }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileName, setFileName] = useState('');
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  // Fetch units when course changes
  useEffect(() => {
    const fetchUnits = async () => {
      if (!selectedCourse) {
        setUnits([]);
        setSelectedUnit('');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const data = await getUnitsByCourse(selectedCourse, token);
        setUnits(data);
        setSelectedUnit('');
      } catch (err) {
        setUnits([]);
        setSelectedUnit('');
      }
    };
    fetchUnits();
  }, [selectedCourse]);
  
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setFetchingCourses(true);
        const data = await getTeacherCourses(token);
        setCourses(data);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load your courses');
      } finally {
        setFetchingCourses(false);
      }
    };
    
    fetchCourses();
  }, [token]);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid video file (MP4, WebM, or OGG)');
        setVideoFile(null);
        e.target.value = null;
        return;
      }
      
      // Check file size (limit to 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError('File size exceeds the limit (100MB)');
        setVideoFile(null);
        e.target.value = null;
        return;
      }

      // Extract video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        console.log('Video duration extracted:', duration, 'seconds');
        
        // Store duration with the file
        file.videoDuration = duration;
        setVideoFile(file);
        setFileName(file.name);
        setError('');
      };
      
      video.onerror = function() {
        console.warn('Could not extract video duration');
        // Still allow upload without duration
        setVideoFile(file);
        setFileName(file.name);
        setError('');
      };
      
      video.src = URL.createObjectURL(file);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }
    
    if (!videoFile) {
      setError('Please select a video file to upload');
      return;
    }
    
    if (!videoTitle.trim()) {
      setError('Please enter a title for the video');
      return;
    }
    
    if (!selectedUnit) {
      setError('Please select a unit');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await uploadCourseVideo(selectedCourse, {
        file: videoFile,
        title: videoTitle,
        description: videoDescription,
        unitId: selectedUnit
      }, token);
      // Clear form after successful upload
      setVideoFile(null);
      setVideoTitle('');
      setVideoDescription('');
      setFileName('');
      setSelectedUnit('');
      setSuccess('Video uploaded successfully!');
    } catch (err) {
      console.error('Error uploading video:', err);
      setError(err.response?.data?.message || 'Failed to upload video');
    } finally {
      setLoading(false);
    }
  };
  
  if (fetchingCourses) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (courses.length === 0) {
    return (
      <Container>
        <Typography variant="h5" gutterBottom>Upload Video</Typography>
        <Alert severity="info">
          You don't have any courses assigned to you. Please contact an administrator.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>Upload Video</Typography>
        <Typography color="text.secondary" gutterBottom>
          Upload video content for your courses
        </Typography>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Select Course</InputLabel>
                <Select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  label="Select Course"
                  disabled={loading}
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {selectedCourse && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Select Unit</InputLabel>
                  <Select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    label="Select Unit"
                    disabled={loading || units.length === 0}
                  >
                    {units.length === 0 ? (
                      <MenuItem value="" disabled>No units available</MenuItem>
                    ) : (
                      units.map((unit) => (
                        <MenuItem key={unit._id} value={unit._id}>{unit.title}</MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                label="Video Title"
                fullWidth
                required
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Video Description"
                fullWidth
                multiline
                rows={4}
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <input
                  accept="video/*"
                  style={{ display: 'none' }}
                  id="video-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <label htmlFor="video-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 1 }}
                    disabled={loading}
                  >
                    Select Video File
                  </Button>
                </label>
                {fileName && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected file: {fileName}
                  </Typography>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !videoFile}
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              >
                {loading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default VideoUpload;
