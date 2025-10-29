import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Alert, 
  Autocomplete, 
  TextField,
  Typography
} from '@mui/material';
import { getCourses } from '../../api/courseApi';

const AssignCourseDialog = ({ open, onClose, onSubmit, teacher }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseOptions, setCourseOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!open) return;
    
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const courses = await getCourses(token);
        setCourseOptions(courses);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [open, token]);

  const handleSubmit = () => {
    if (!selectedCourse) return setError('Please select a course');
    setError('');
    onSubmit(selectedCourse._id);
    setSelectedCourse(null);
    setCourseSearch('');
  };

  const handleClose = () => {
    setSelectedCourse(null);
    setCourseSearch('');
    setError('');
    onClose();
  };

  const filterCourses = (options, { inputValue }) => {
    const filterValue = inputValue.toLowerCase();
    return options.filter(course => 
      (course.title && course.title.toLowerCase().includes(filterValue)) ||
      (course.courseCode && course.courseCode.toLowerCase().includes(filterValue)) ||
      (course.description && course.description.toLowerCase().includes(filterValue))
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Assign Course to Teacher</DialogTitle>
      <DialogContent>
        {teacher && (
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Assigning course to: <strong>{teacher.name}</strong> ({teacher.teacherId || 'No ID'})
          </Typography>
        )}
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Autocomplete
          options={courseOptions}
          getOptionLabel={(option) => `${option.courseCode || ''} - ${option.title}`}
          value={selectedCourse}
          onChange={(event, newValue) => {
            setSelectedCourse(newValue);
          }}
          onInputChange={(event, newInputValue) => {
            setCourseSearch(newInputValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Course"
              placeholder="Search by code or title"
              margin="normal"
              fullWidth
              required
            />
          )}
          loading={loading}
          filterOptions={filterCourses}
          noOptionsText={loading ? "Loading courses..." : "No courses found"}
          renderOption={(props, option) => (
            <li {...props}>
              <div>
                <Typography variant="body1" fontWeight="medium" color="primary">
                  {option.courseCode || 'No Code'} - {option.title}
                </Typography>
                {option.description && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {option.description.substring(0, 100)}
                    {option.description.length > 100 ? '...' : ''}
                  </Typography>
                )}
              </div>
            </li>
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!selectedCourse}
        >
          Assign Course
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignCourseDialog;
