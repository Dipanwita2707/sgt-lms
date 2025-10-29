import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  Grid,
  Alert,
  FormHelperText,
  IconButton,
  InputAdornment,
  Divider,
  CircularProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InfoIcon from '@mui/icons-material/Info';
import { uploadQuiz, getQuizTemplate } from '../../api/quizApi';
import { getUnitsByCourse } from '../../api/unitApi';

const UploadQuizForm = ({ courseId, videoId, videoTitle, onQuizUploaded }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    timeLimit: 30,
    passingScore: 60
  });
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  // Fetch units for the course
  useEffect(() => {
    const fetchUnits = async () => {
      if (!courseId) return;
      try {
        const token = localStorage.getItem('token');
        const data = await getUnitsByCourse(courseId, token);
        setUnits(data);
      } catch (err) {
        setUnits([]);
      }
    };
    fetchUnits();
  }, [courseId]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };
  
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      await getQuizTemplate(token);
    } catch (error) {
      setError('Failed to download template. Please try again.');
      console.error('Error downloading template:', error);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title.trim()) {
      setError('Quiz title is required');
      return;
    }
    if (!selectedUnit) {
      setError('Please select a unit');
      return;
    }
    if (!file) {
      setError('Please upload a CSV file with quiz questions');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      
      const data = new FormData();
      data.append('file', file);
      data.append('title', formData.title);
      data.append('description', formData.description);
  data.append('courseId', courseId);
  data.append('unitId', selectedUnit);
  if (videoId) data.append('videoId', videoId);
      data.append('timeLimit', formData.timeLimit);
      data.append('passingScore', formData.passingScore);
      
      const response = await uploadQuiz(data, token);
      
      setSuccess('Quiz uploaded successfully!');
      setFormData({
        title: '',
        description: '',
        timeLimit: 30,
        passingScore: 60
      });
  setFile(null);
  setSelectedUnit('');
      
      // Notify parent component
      if (onQuizUploaded) {
        onQuizUploaded(response.quiz);
      }
    } catch (error) {
      console.error('Error uploading quiz:', error);
      setError(error.response?.data?.message || 'Failed to upload quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CloudUploadIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h2">
          Upload Quiz for: {videoTitle}
        </Typography>
      </Box>
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle1" gutterBottom>
          <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
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
          startIcon={<FileDownloadIcon />}
          variant="outlined"
          size="small"
          onClick={handleDownloadTemplate}
        >
          Download Template
        </Button>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
  <Box component="form" onSubmit={handleSubmit}>
        <Grid item xs={12}>
          <TextField
            select
            label="Select Unit"
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
            fullWidth
            required
            disabled={loading || units.length === 0}
            SelectProps={{ native: false }}
          >
            {units.length === 0 ? (
              <option value="" disabled>No units available</option>
            ) : (
              units.map(unit => (
                <option key={unit._id} value={unit._id}>{unit.title}</option>
              ))
            )}
          </TextField>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              name="title"
              label="Quiz Title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              required
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Quiz Description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="timeLimit"
              label="Time Limit (minutes)"
              value={formData.timeLimit}
              onChange={handleChange}
              type="number"
              fullWidth
              InputProps={{
                inputProps: { min: 5, max: 180 }
              }}
              disabled={loading}
            />
            <FormHelperText>
              The time students have to complete the quiz (5-180 minutes)
            </FormHelperText>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="passingScore"
              label="Passing Score (%)"
              value={formData.passingScore}
              onChange={handleChange}
              type="number"
              fullWidth
              InputProps={{
                inputProps: { min: 0, max: 100 },
                endAdornment: <InputAdornment position="end">%</InputAdornment>
              }}
              disabled={loading}
            />
            <FormHelperText>
              Minimum percentage required to pass the quiz (0-100%)
            </FormHelperText>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ py: 1.5, border: '1px dashed' }}
              disabled={loading}
            >
              {file ? file.name : 'Click to upload CSV file'}
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            <FormHelperText>
              Upload your CSV file with quiz questions. Make sure to follow the template format.
            </FormHelperText>
          </Grid>
          
          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Uploading...' : 'Upload Quiz'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default UploadQuizForm;
