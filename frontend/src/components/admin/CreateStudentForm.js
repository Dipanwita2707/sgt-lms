import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Grid, 
  Alert,
  FormHelperText,
  InputAdornment,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { createStudent } from '../../api/studentApi';
import axios from 'axios';

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const CreateStudentForm = ({ onStudentCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    regNo: '',
    school: '',
    department: '',
    section: '',
    coursesAssigned: []
  });
  
  const [courses, setCourses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState({});
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSchools();
    fetchDepartments();
    fetchSections();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await axios.get('/api/schools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get('/api/sections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSections(response.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  // Filter departments when school changes
  useEffect(() => {
    if (formData.school) {
      const filtered = departments.filter(dept => {
        const deptSchoolId = typeof dept.school === 'string' ? dept.school : dept.school._id;
        return deptSchoolId === formData.school;
      });
      setFilteredDepartments(filtered);
      // Reset department and section if they don't belong to selected school
      if (formData.department && !filtered.find(d => d._id === formData.department)) {
        setFormData(prev => ({ ...prev, department: '', section: '' }));
      }
    } else {
      setFilteredDepartments([]);
      setFormData(prev => ({ ...prev, department: '', section: '' }));
    }
  }, [formData.school, departments]);

  // Filter sections when department changes
  useEffect(() => {
    if (formData.department) {
      const filtered = sections.filter(section => {
        const sectionDepId = typeof section.department === 'string' ? section.department : section.department._id;
        return sectionDepId === formData.department;
      });
      setFilteredSections(filtered);
      // Reset section if it doesn't belong to selected department
      if (formData.section && !filtered.find(s => s._id === formData.section)) {
        setFormData(prev => ({ ...prev, section: '' }));
      }
    } else {
      setFilteredSections([]);
      setFormData(prev => ({ ...prev, section: '' }));
    }
  }, [formData.department, sections]);

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return value.trim() === '' ? 'Name is required' : '';
      case 'email':
        return value.trim() === '' 
          ? 'Email is required' 
          : !emailRegex.test(value) 
            ? 'Invalid email format' 
            : '';
      case 'password':
        return value.trim() === '' 
          ? 'Password is required' 
          : value.length < 6 
            ? 'Password must be at least 6 characters' 
            : '';
      case 'regNo':
        // RegNo is optional, as it will be auto-generated if not provided
        if (value.trim() === '') return '';
        return /^S\d{6}$/.test(value) 
          ? '' 
          : 'Registration number should start with S followed by 6 digits';
      case 'school':
        return value.trim() === '' ? 'School is required' : '';
      case 'department':
        return ''; // Department is optional
      case 'section':
        return ''; // Section is optional
      default:
        return '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key === 'coursesAssigned') return; // Skip validation for courses
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setTouched({ ...touched, [name]: true });
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors({ ...errors, [name]: error });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, value);
    setErrors({ ...errors, [name]: error });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await createStudent(formData, token);
      setSuccess('Student created successfully!');
      resetForm();
      if (onStudentCreated) {
        onStudentCreated(response);
      }
    } catch (error) {
      console.error('Error creating student:', error);
      // If we get a 400 but the student was actually created (race condition)
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        // Still show success message since the student was likely created
        setSuccess('Student created successfully!');
        resetForm();
        if (onStudentCreated) {
          onStudentCreated();
        }
      } else {
        setErrors({ 
          submit: error.response?.data?.message || 'Failed to create student. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      regNo: '',
      school: '',
      department: '',
      section: '',
      coursesAssigned: []
    });
    setErrors({});
    setTouched({});
  };

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3, 
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PersonAddIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h2">
          Create New Student
        </Typography>
      </Box>
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}
      
      {errors.submit && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setErrors({ ...errors, submit: '' })}
        >
          {errors.submit}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name"
              label="Full Name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              fullWidth
              required
              error={touched.name && !!errors.name}
              helperText={touched.name && errors.name}
              disabled={loading}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              fullWidth
              required
              error={touched.email && !!errors.email}
              helperText={touched.email && errors.email}
              disabled={loading}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              fullWidth
              required
              error={touched.password && !!errors.password}
              helperText={touched.password && errors.password}
              disabled={loading}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="regNo"
              label="Registration Number (Optional)"
              value={formData.regNo}
              onChange={handleChange}
              onBlur={handleBlur}
              fullWidth
              error={touched.regNo && !!errors.regNo}
              helperText={
                touched.regNo && errors.regNo ? 
                errors.regNo : 
                "If left empty, a registration number will be automatically assigned"
              }
              disabled={loading}
              margin="normal"
              InputProps={{
                startAdornment: <InputAdornment position="start">S</InputAdornment>,
              }}
              placeholder="123456"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" error={touched.school && !!errors.school}>
              <InputLabel>School *</InputLabel>
              <Select
                name="school"
                value={formData.school}
                onChange={handleChange}
                onBlur={handleBlur}
                label="School *"
                disabled={loading}
              >
                {schools.map((school) => (
                  <MenuItem key={school._id} value={school._id}>
                    {school.name} ({school.code})
                  </MenuItem>
                ))}
              </Select>
              {touched.school && errors.school && (
                <FormHelperText>{errors.school}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" disabled={!formData.school || loading}>
              <InputLabel>Department (Optional)</InputLabel>
              <Select
                name="department"
                value={formData.department}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Department (Optional)"
              >
                <MenuItem value="">
                  <em>No Department</em>
                </MenuItem>
                {filteredDepartments.map((department) => (
                  <MenuItem key={department._id} value={department._id}>
                    {department.name} ({department.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" disabled={!formData.department || loading}>
              <InputLabel>Section (Optional)</InputLabel>
              <Select
                name="section"
                value={formData.section}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Section (Optional)"
              >
                <MenuItem value="">
                  <em>No Section</em>
                </MenuItem>
                {filteredSections.map((section) => (
                  <MenuItem key={section._id} value={section._id}>
                    {section.name} - {section.course?.title || 'No Course'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormHelperText sx={{ mb: 1 }}>
              When creating a student:
            </FormHelperText>
            <FormHelperText sx={{ mb: 0.5 }}>
              • School assignment is required during admission
            </FormHelperText>
            <FormHelperText sx={{ mb: 0.5 }}>
              • Department and Section assignments are optional during creation
            </FormHelperText>
            <FormHelperText sx={{ mb: 0.5 }}>
              • If you select a department, you can optionally assign the student to a section within that department
            </FormHelperText>
            <FormHelperText sx={{ mb: 0.5 }}>
              • If you leave the registration number empty, the system will generate one starting with "S" followed by 6 digits
            </FormHelperText>
            <FormHelperText sx={{ mb: 0.5 }}>
              • If you provide a registration number, make sure it starts with "S" followed by 6 digits
            </FormHelperText>
            <FormHelperText sx={{ mb: 0.5 }}>
              • Courses can be assigned to students after creation
            </FormHelperText>
          </Grid>
          
          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={resetForm}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Reset
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
            >
              Create Student
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default CreateStudentForm;
