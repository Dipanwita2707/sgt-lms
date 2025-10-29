import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Alert, 
  Autocomplete, 
  TextField, 
  CircularProgress, 
  Typography,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';
import { getCourses } from '../../api/courseApi';
import { getStudents } from '../../api/studentApi';

const AssignCourseForm = ({ onAssign }) => {
  const [regNo, setRegNo] = useState('');
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const token = localStorage.getItem('token');

  // Fetch students and courses on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingStudents(true);
        setLoadingCourses(true);
        
        const studentsData = await getStudents(token);
        const coursesData = await getCourses(token);
        
        setStudents(studentsData);
        setCourses(coursesData);
      } catch (err) {
        setError('Failed to load students or courses data');
        console.error('Error fetching data:', err);
      } finally {
        setLoadingStudents(false);
        setLoadingCourses(false);
      }
    };
    
    fetchData();
  }, [token]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!regNo) {
      setError('Please select a student');
      return;
    }
    
    if (!courseId) {
      setError('Please select a course');
      return;
    }
    
    try {
      await onAssign(regNo, courseId);
      setSuccess('Course assigned successfully');
      setRegNo('');
      setCourseId('');
    } catch (err) {
      setError(err.message || 'Failed to assign course');
    }
  };

  return (
    <Card elevation={2} sx={{ mb: 3, overflow: 'visible' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Assign Course to Student</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select a student and a course from the dropdown menus to assign a course to a student.
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <Autocomplete
            id="student-registration"
            options={students}
            getOptionLabel={(option) => `${option.regNo} - ${option.name}`}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            loading={loadingStudents}
            value={students.find(s => s.regNo === regNo) || null}
            onChange={(event, newValue) => {
              setRegNo(newValue ? newValue.regNo : '');
            }}
            renderOption={(props, option) => (
              <li {...props} key={option._id}>
                {`${option.regNo} - ${option.name}`}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Student Registration Number"
                required
                margin="normal"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingStudents ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          
          <Autocomplete
            id="course-selection"
            options={courses}
            getOptionLabel={(option) => `${option.courseCode || option.code || 'No Code'} - ${option.title}`}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            loading={loadingCourses}
            value={courses.find(c => c._id === courseId) || null}
            onChange={(event, newValue) => {
              setCourseId(newValue ? newValue._id : '');
            }}
            renderOption={(props, option) => (
              <li {...props} key={option._id}>
                {`${option.courseCode || option.code || 'No Code'} - ${option.title}`}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Course Code"
                required
                margin="normal"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCourses ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            disabled={loadingStudents || loadingCourses}
          >
            Assign Course
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AssignCourseForm;
