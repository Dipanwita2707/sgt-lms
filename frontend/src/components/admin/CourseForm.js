import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Alert, 
  Typography, 
  Autocomplete, 
  Chip, 
  Paper, 
  Divider,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import axios from 'axios';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';

const CourseForm = ({ onSubmit, initial, submitLabel }) => {
  const [form, setForm] = useState(initial || { 
    title: '', 
    description: '', 
    school: '', 
    department: '' 
  });
  const [error, setError] = useState('');
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Fetch schools and departments
    const fetchData = async () => {
      try {
        const [schoolsRes, departmentsRes] = await Promise.all([
          axios.get('/api/schools', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setSchools(schoolsRes.data);
        setDepartments(departmentsRes.data);
      } catch (err) {
        console.error('Error fetching schools/departments:', err);
      }
    };
    
    fetchData();
    
    // Set initial school and department if editing
    if (initial) {
      setForm(prev => ({
        ...prev,
        school: initial.school?._id || initial.school || '',
        department: initial.department?._id || initial.department || ''
      }));
    }
  }, [initial, token]);

  // Filter departments when school changes
  useEffect(() => {
    if (form.school) {
      const filtered = departments.filter(dept => {
        const deptSchoolId = typeof dept.school === 'string' ? dept.school : dept.school._id;
        return deptSchoolId === form.school;
      });
      setFilteredDepartments(filtered);
      // Reset department if it doesn't belong to selected school
      if (form.department && !filtered.find(d => d._id === form.department)) {
        setForm(prev => ({ ...prev, department: '' }));
      }
    } else {
      setFilteredDepartments([]);
      setForm(prev => ({ ...prev, department: '' }));
    }
  }, [form.school, departments]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ title: '', description: '', school: '', department: '' });

    setError('');
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.description) {
      setError('Please fill in all required fields');
      return;
    }
    if (!form.school) {
      setError('School is required');
      return;
    }
    if (!form.department) {
      setError('Department is required');  
      return;
    }
    
    onSubmit(form);
    
    // Only reset if not editing an existing course
    if (!initial) {
      resetForm();
    }
  };





  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
        {initial ? 'Update Course' : 'Create New Course'}
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {initial && initial.courseCode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Course Code: <strong>{initial.courseCode}</strong>
          </Typography>
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {initial && initial.courseCode && (
            <Grid item xs={12}>
              <TextField 
                label="Course Code" 
                value={initial.courseCode} 
                fullWidth 
                margin="normal" 
                InputProps={{
                  readOnly: true,
                  startAdornment: <CodeIcon color="action" sx={{ mr: 1 }} />,
                }}
                variant="filled"
                helperText="This is an automatically generated unique course code"
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField 
              label="Course Title" 
              name="title" 
              value={form.title} 
              onChange={handleChange} 
              fullWidth 
              margin="normal" 
              required
              variant="outlined"
              InputProps={{
                startAdornment: <TitleIcon color="action" sx={{ mr: 1 }} />,
              }}
              placeholder="Enter a descriptive title for the course"
              helperText="A clear title helps students understand the course content"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField 
              label="Course Description" 
              name="description" 
              value={form.description} 
              onChange={handleChange} 
              fullWidth 
              margin="normal" 
              multiline 
              rows={4}
              variant="outlined"
              InputProps={{
                startAdornment: <DescriptionIcon color="action" sx={{ mr: 1 }} />,
              }}
              placeholder="Provide details about the course content, objectives, and learning outcomes"
              helperText="A detailed description helps students know what to expect"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>School</InputLabel>
              <Select
                name="school"
                value={form.school}
                onChange={handleChange}
                label="School"
              >
                {schools.map(school => (
                  <MenuItem key={school._id} value={school._id}>
                    {school.name} ({school.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal" required disabled={!form.school}>
              <InputLabel>Department</InputLabel>
              <Select
                name="department"
                value={form.department}
                onChange={handleChange}
                label="Department"
              >
                {filteredDepartments.map(dept => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name} ({dept.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Teacher Assignment:</strong> Teachers are no longer assigned directly to courses. 
                Instead, use <strong>Section Management</strong> to assign courses to sections, then assign 
                teachers to specific section-course combinations.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={resetForm}
            startIcon={<ClearIcon />}
          >
            Clear
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
          >
            {submitLabel || 'Create Course'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CourseForm;
