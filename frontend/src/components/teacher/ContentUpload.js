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
  Grid,
  Tabs,
  Tab,
  Divider,
  FormHelperText
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import QuizIcon from '@mui/icons-material/Quiz';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import { getTeacherCourses, uploadCourseVideo } from '../../api/teacherApi';
import { getQuizTemplate, uploadQuiz } from '../../api/quizApi';
import { Link } from 'react-router-dom';

const ContentUpload = ({ token, user }) => {
  const [tabValue, setTabValue] = useState(0);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [videos, setVideos] = useState([]);
  
  // Video upload state
  const [videoFile, setVideoFile] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  
  // Quiz upload state
  const [quizFile, setQuizFile] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizFileName, setQuizFileName] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  
  // Common state
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
  
  // When a course is selected, fetch its videos (for quiz tab)
  useEffect(() => {
    const fetchVideos = async () => {
      if (selectedCourse && tabValue === 1) {
        try {
          const data = await getCourseVideos(selectedCourse, token);
          setVideos(data);
        } catch (err) {
          console.error('Error fetching videos:', err);
        }
      }
    };
    
    fetchVideos();
  }, [selectedCourse, tabValue, token]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };
  
  const handleVideoFileChange = (e) => {
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
      
      setVideoFile(file);
      setVideoFileName(file.name);
      setError('');
    }
  };
  
  const handleQuizFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        setQuizFile(null);
        e.target.value = null;
        return;
      }
      
      setQuizFile(file);
      setQuizFileName(file.name);
      setError('');
    }
  };
  
  const handleDownloadTemplate = async () => {
    try {
      await getQuizTemplate(token);
    } catch (err) {
      setError('Failed to download template. Please try again.');
      console.error('Error downloading template:', err);
    }
  };
  
  const handleVideoUpload = async (e) => {
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
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await uploadCourseVideo(selectedCourse, {
        file: videoFile,
        title: videoTitle,
        description: videoDescription
      }, token);
      
      // Clear form after successful upload
      setVideoFile(null);
      setVideoTitle('');
      setVideoDescription('');
      setVideoFileName('');
      
      setSuccess('Video uploaded successfully!');
    } catch (err) {
      console.error('Error uploading video:', err);
      setError(err.response?.data?.message || 'Failed to upload video');
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuizUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }
    
    if (!selectedVideo) {
      setError('Please select a video for this quiz');
      return;
    }
    
    if (!quizFile) {
      setError('Please select a CSV file with quiz questions');
      return;
    }
    
    if (!quizTitle.trim()) {
      setError('Please enter a title for the quiz');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const formData = new FormData();
      formData.append('file', quizFile);
      formData.append('title', quizTitle);
      formData.append('description', quizDescription);
      formData.append('courseId', selectedCourse);
      formData.append('videoId', selectedVideo);
      formData.append('timeLimit', timeLimit);
      formData.append('passingScore', passingScore);
      
      await uploadQuiz(formData, token);
      
      // Clear form after successful upload
      setQuizFile(null);
      setQuizTitle('');
      setQuizDescription('');
      setQuizFileName('');
      
      setSuccess('Quiz uploaded successfully!');
    } catch (err) {
      console.error('Error uploading quiz:', err);
      setError(err.response?.data?.message || 'Failed to upload quiz');
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
        <Typography variant="h5" gutterBottom>Upload Content</Typography>
        <Alert severity="info">
          You don't have any courses assigned to you. Please contact an administrator.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>Content Upload</Typography>
        <Typography color="text.secondary" gutterBottom>
          Upload videos and quizzes for your courses
        </Typography>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ mb: 3 }}
          centered
        >
          <Tab icon={<VideoLibraryIcon />} label="Upload Video" />
          <Tab icon={<QuizIcon />} label="Upload Quiz" />
        </Tabs>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Video Upload Tab */}
        {tabValue === 0 && (
          <Box component="form" onSubmit={handleVideoUpload}>
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
                    onChange={handleVideoFileChange}
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
                  {videoFileName && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Selected file: {videoFileName}
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
        )}
        
        {/* Quiz Upload Tab */}
        {tabValue === 1 && (
          <Box component="form" onSubmit={handleQuizUpload}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <QuizIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                    How to create a quiz:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    1. Download the CSV template by clicking the button below.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    2. Open the template in Excel or a text editor and add your questions, answer options, and mark the correct answer.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    3. Save the file as CSV and upload it using the form below.
                  </Typography>
                  <Button
                    startIcon={<CloudUploadIcon />}
                    variant="outlined"
                    size="small"
                    onClick={handleDownloadTemplate}
                  >
                    Download Template
                  </Button>
                </Box>
              </Grid>
              
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
              
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Select Video</InputLabel>
                  <Select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    label="Select Video"
                    disabled={loading || !selectedCourse || videos.length === 0}
                  >
                    {videos.length > 0 ? (
                      videos.map((video) => (
                        <MenuItem key={video._id} value={video._id}>
                          {video.title}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>
                        {selectedCourse ? 'No videos available for this course' : 'Select a course first'}
                      </MenuItem>
                    )}
                  </Select>
                  {selectedCourse && videos.length === 0 && (
                    <FormHelperText>
                      No videos found for this course. Please upload a video first.
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Quiz Title"
                  fullWidth
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Quiz Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Time Limit (minutes)"
                  type="number"
                  fullWidth
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    inputProps: { min: 5, max: 180 }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Passing Score (%)"
                  type="number"
                  fullWidth
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    inputProps: { min: 0, max: 100 }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <input
                    accept=".csv"
                    style={{ display: 'none' }}
                    id="quiz-upload"
                    type="file"
                    onChange={handleQuizFileChange}
                    disabled={loading}
                  />
                  <label htmlFor="quiz-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      sx={{ mb: 1 }}
                      disabled={loading}
                    >
                      Select CSV File
                    </Button>
                  </label>
                  {quizFileName && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Selected file: {quizFileName}
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading || !quizFile || !selectedVideo}
                  startIcon={loading ? <CircularProgress size={20} /> : <QuizIcon />}
                >
                  {loading ? 'Uploading...' : 'Upload Quiz'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ContentUpload;
