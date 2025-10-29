import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardMedia, 
  Grid, 
  CircularProgress, 
  Button, 
  Alert,
  Container,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useParams, Link } from 'react-router-dom';
import { getCourseVideos, uploadCourseVideo, getTeacherUnitsByCourse } from '../../api/teacherApi';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const CourseVideos = ({ token, user }) => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    unitId: ''
  });
  const [units, setUnits] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const data = await getCourseVideos(courseId, token);
        setVideos(data.videos || []);
        setCourseTitle(data.courseTitle || 'Course');
        setError(null);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos');
      } finally {
        setLoading(false);
      }
    };
    
    if (courseId && token) {
      fetchVideos();
    }
  }, [courseId, token]);
  
  const fetchUnits = async () => {
    try {
      const unitsData = await getTeacherUnitsByCourse(courseId, token);
      setUnits(unitsData);
    } catch (err) {
      console.error('Error fetching units:', err);
      setUnits([]);
    }
  };
  
  const handleRemoveRequest = (video) => {
    setSelectedVideo(video);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVideo(null);
  };
  
  const handleOpenUploadDialog = async () => {
    await fetchUnits();
    setUploadData({
      title: '',
      description: '',
      unitId: ''
    });
    setVideoFile(null);
    setFileName('');
    setUploadDialog(true);
  };
  
  const handleCloseUploadDialog = () => {
    setUploadDialog(false);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUploadData({
      ...uploadData,
      [name]: value
    });
  };
  
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
      
      setVideoFile(file);
      setFileName(file.name);
      setError('');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!uploadData.title.trim()) {
      setError('Please enter a title for the video');
      return;
    }
    
    if (!videoFile) {
      setError('Please select a video file to upload');
      return;
    }
    
    if (units.length > 0 && !uploadData.unitId) {
      setError('Please select a unit');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      await uploadCourseVideo(courseId, {
        file: videoFile,
        title: uploadData.title,
        description: uploadData.description,
        unitId: uploadData.unitId
      }, token);
      
      // Refresh the video list
      const data = await getCourseVideos(courseId, token);
      setVideos(data.videos || []);
      
      // Close the dialog and reset form
      setUploadDialog(false);
      setUploadData({
        title: '',
        description: '',
        unitId: ''
      });
      setVideoFile(null);
      setFileName('');
    } catch (err) {
      console.error('Error uploading video:', err);
      setError(err.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  const canManageVideos = user?.permissions?.includes('Manage Videos');
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {courseTitle}: Videos
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          Manage video content for this course
        </Typography>
      </Box>
      
      {canManageVideos && (
        <Box sx={{ mb: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleOpenUploadDialog}
            startIcon={<VideoLibraryIcon />}
          >
            Upload New Video
          </Button>
        </Box>
      )}
      
      {videos.length === 0 ? (
        <Alert severity="info">
          No videos have been uploaded for this course yet.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {videos.map((video) => (
            <Grid item xs={12} md={6} lg={4} key={video._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 0,
                    paddingTop: '56.25%', // 16:9 aspect ratio
                    position: 'relative',
                    bgcolor: 'rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Video thumbnail or placeholder */}
                  {video.thumbnailUrl ? (
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title}
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }} 
                    />
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <VideoLibraryIcon sx={{ fontSize: 60, opacity: 0.7 }} />
                    </Box>
                  )}
                </CardMedia>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {video.title}
                  </Typography>
                  
                  {video.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {video.description}
                    </Typography>
                  )}
                  
                  {video.unitTitle && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Unit: {video.unitTitle}
                    </Typography>
                  )}
                  
                  <Typography variant="caption" color="text.secondary" display="block">
                    Duration: {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      component={Link}
                      to={`/teacher/video/${video._id}`}
                    >
                      Watch
                    </Button>
                    
                    {canManageVideos && (
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={() => handleRemoveRequest(video)}
                        title="Request video removal"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Video Removal Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Request Video Removal</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to request removal of "{selectedVideo?.title}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will send a request to the administrator. The video will remain available until approved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            component={Link}
            to={`/teacher/video/${selectedVideo?._id}/remove-request`}
            color="error"
            variant="contained"
            onClick={handleCloseDialog}
          >
            Continue to Request
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Video Upload Dialog */}
      <Dialog open={uploadDialog} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Video</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Video Title"
              name="title"
              value={uploadData.title}
              onChange={handleInputChange}
              disabled={uploading}
            />
            
            <TextField
              margin="normal"
              fullWidth
              label="Video Description"
              name="description"
              multiline
              rows={4}
              value={uploadData.description}
              onChange={handleInputChange}
              disabled={uploading}
            />
            
            {units.length > 0 && (
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Unit</InputLabel>
                <Select
                  name="unitId"
                  value={uploadData.unitId}
                  onChange={handleInputChange}
                  label="Unit"
                  disabled={uploading}
                >
                  {units.map((unit) => (
                    <MenuItem key={unit._id} value={unit._id}>
                      {unit.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <Box sx={{ mt: 2, mb: 2 }}>
              <input
                accept="video/*"
                style={{ display: 'none' }}
                id="video-upload"
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label htmlFor="video-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploading}
                  fullWidth
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained" 
            color="primary"
            disabled={uploading || !videoFile}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CourseVideos;
