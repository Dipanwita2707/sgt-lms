import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  LinearProgress, 
  Alert,
  Autocomplete,
  Typography,
  Box
} from '@mui/material';
import { getCourses } from '../../api/courseApi';
import { getUnitsByCourse } from '../../api/unitApi';

const VideoUploadDialog = ({ open, onClose, onUpload }) => {
  const [form, setForm] = useState({ title: '', description: '', courseId: '', unitId: '' });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const courseData = await getCourses(token);
      setCourses(courseData);
    } catch (err) {
      setError('Failed to load courses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = e => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Extract video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        console.log('Video duration extracted:', duration, 'seconds');
        
        // Store duration with the file
        selectedFile.videoDuration = duration;
        setFile(selectedFile);
      };
      
      video.onerror = function() {
        console.warn('Could not extract video duration');
        // Still allow upload without duration
        setFile(selectedFile);
      };
      
      video.src = URL.createObjectURL(selectedFile);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    setFile(e.dataTransfer.files[0]);
  };

  const handleCourseChange = async (event, value) => {
    setSelectedCourse(value);
    setSelectedUnit(null);
    setUnits([]);
    
    if (value) {
      setForm({ ...form, courseId: value._id, unitId: '' });
      
      // Fetch units for the selected course
      setLoadingUnits(true);
      try {
        const unitsData = await getUnitsByCourse(value._id, token);
        setUnits(unitsData);
      } catch (err) {
        console.error('Error fetching units:', err);
      } finally {
        setLoadingUnits(false);
      }
    } else {
      setForm({ ...form, courseId: '', unitId: '' });
    }
  };
  
  const handleUnitChange = (event, value) => {
    setSelectedUnit(value);
    if (value) {
      setForm({ ...form, unitId: value._id });
    } else {
      setForm({ ...form, unitId: '' });
    }
  };

  const handleUpload = async () => {
    setError('');
    if (!file || !form.title || !form.courseId) return setError('Title, course, and file are required');
    
    // Check if units are available but none selected
    if (units.length > 0 && !form.unitId) {
      return setError('Please select a unit');
    }
    
    try {
      await onUpload({ ...form, file }, setProgress);
      setForm({ title: '', description: '', courseId: '', unitId: '' });
      setSelectedCourse(null);
      setSelectedUnit(null);
      setUnits([]);
      setFile(null);
      setProgress(0);
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Video</DialogTitle>
      <DialogContent onDrop={handleDrop} onDragOver={e => e.preventDefault()} sx={{ minWidth: 350 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField 
          label="Title" 
          name="title" 
          value={form.title} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
          required 
        />
        <TextField 
          label="Description" 
          name="description" 
          value={form.description} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
          multiline 
          rows={3}
        />
        
        <Autocomplete
          options={courses}
          getOptionLabel={(option) => `${option.courseCode || ''} - ${option.title}`}
          value={selectedCourse}
          onChange={handleCourseChange}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Course"
              margin="normal"
              required
              fullWidth
              placeholder="Search by course code or title"
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box>
                <Typography variant="body1" fontWeight="medium" color="primary">
                  {option.courseCode || 'No Code'} - {option.title}
                </Typography>
                {option.description && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {option.description.substring(0, 60)}
                    {option.description.length > 60 ? '...' : ''}
                  </Typography>
                )}
              </Box>
            </li>
          )}
          noOptionsText={loading ? "Loading courses..." : "No courses found"}
        />
        
        {selectedCourse && (
          <Autocomplete
            options={units}
            getOptionLabel={(option) => option.title}
            value={selectedUnit}
            onChange={handleUnitChange}
            loading={loadingUnits}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Unit"
                margin="normal"
                required
                error={!form.unitId && units.length > 0}
                helperText={!form.unitId && units.length > 0 ? "Unit selection is required" : ""}
                fullWidth
                placeholder={units.length === 0 ? "No units available" : "Search for unit"}
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body1">
                    {option.title}
                  </Typography>
                  {option.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {option.description.substring(0, 60)}
                      {option.description.length > 60 ? '...' : ''}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            noOptionsText={loadingUnits ? "Loading units..." : "No units available"}
          />
        )}
        
        <Box sx={{ mt: 3, mb: 1 }}>
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleFileChange} 
            style={{ width: '100%' }} 
          />
        </Box>
        
        {file && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="body2">
              Selected: <strong>{file.name}</strong> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </Typography>
          </Box>
        )}
        
        {progress > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" align="center" gutterBottom>
              Uploading: {progress.toFixed(0)}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 2 }} />
          </Box>
        )}
        
        <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px dashed #ccc' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Or drag and drop a video file here
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleUpload} 
          variant="contained" 
          disabled={!file || !form.title || !form.courseId || (units.length > 0 && !form.unitId) || progress > 0}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VideoUploadDialog;
