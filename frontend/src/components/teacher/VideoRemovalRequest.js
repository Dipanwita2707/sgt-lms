import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Container,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseVideos, requestVideoRemoval } from '../../api/teacherApi';

const VideoRemovalRequest = ({ token, user }) => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reason, setReason] = useState('');
  const [reasonType, setReasonType] = useState('inappropriate');
  const [courseId, setCourseId] = useState('');
  
  // Predefined reason options
  const reasonTypes = [
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'copyright', label: 'Copyright violation' },
    { value: 'outdated', label: 'Content is outdated' },
    { value: 'quality', label: 'Poor video/audio quality' },
    { value: 'other', label: 'Other reason' }
  ];
  
  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        setLoading(true);
        // Note: This API might need to be adjusted to fetch a single video
        // For now, we'll fetch all course videos and find the matching one
        const allCoursesVideos = await Promise.all(
          user.courses.map(async (courseId) => {
            const data = await getCourseVideos(courseId, token);
            return { courseId, videos: data.videos || [] };
          })
        );
        
        let foundVideo = null;
        let foundCourseId = '';
        
        for (const courseData of allCoursesVideos) {
          const video = courseData.videos.find(v => v._id === videoId);
          if (video) {
            foundVideo = video;
            foundCourseId = courseData.courseId;
            break;
          }
        }
        
        if (foundVideo) {
          setVideo(foundVideo);
          setCourseId(foundCourseId);
        } else {
          setError('Video not found or you do not have access to it');
        }
      } catch (err) {
        console.error('Error fetching video details:', err);
        setError('Failed to load video details');
      } finally {
        setLoading(false);
      }
    };
    
    if (videoId && token) {
      fetchVideoDetails();
    }
  }, [videoId, token, user]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a detailed reason for the removal request');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      // Format the full reason with the category
      const fullReason = `${reasonType.toUpperCase()}: ${reason}`;
      
      await requestVideoRemoval(videoId, fullReason, token);
      setSuccess('Removal request submitted successfully');
      
      // Navigate back after a delay
      setTimeout(() => {
        navigate(`/teacher/course/${courseId}/videos`);
      }, 2000);
    } catch (err) {
      console.error('Error submitting removal request:', err);
      setError(err.response?.data?.message || 'Failed to submit removal request');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !video) {
    return (
      <Container>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button 
          variant="outlined" 
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>Request Video Removal</Typography>
        <Typography color="text.secondary" gutterBottom>
          Submit a request to remove the video: {video?.title}
        </Typography>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Reason Category</FormLabel>
            <RadioGroup
              value={reasonType}
              onChange={(e) => setReasonType(e.target.value)}
            >
              {reasonTypes.map((type) => (
                <FormControlLabel
                  key={type.value}
                  value={type.value}
                  control={<Radio />}
                  label={type.label}
                  disabled={submitting}
                />
              ))}
            </RadioGroup>
          </FormControl>
          
          <TextField
            label="Detailed Explanation"
            fullWidth
            multiline
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            required
            sx={{ mb: 3 }}
            placeholder="Please provide a detailed explanation for why this video should be removed..."
          />
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Submitting...' : 'Submit Removal Request'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default VideoRemovalRequest;
