import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Alert, 
  FormGroup, 
  FormControlLabel, 
  Checkbox, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel
} from '@mui/material';
import axios from 'axios';

const PERMISSIONS = [
  { key: 'manage_teachers', label: 'Manage Teachers' },
  { key: 'manage_students', label: 'Manage Students' },
  { key: 'manage_courses', label: 'Manage Courses' },
  { key: 'manage_videos', label: 'Manage Videos' },
  { key: 'view_analytics', label: 'View Analytics' },
  // Add more as needed
];

const AddTeacherForm = ({ onAdd }) => {

  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    permissions: [],
    school: '',
    department: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState({});
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);

  const token = localStorage.getItem('token');

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // Fetch schools, departments, and sections on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching teacher form data...');
        console.log('Making API calls to fetch schools, departments, sections...');
        
        const schoolsPromise = axios.get('/api/schools', { headers: { Authorization: `Bearer ${token}` } });
        const departmentsPromise = axios.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } });

        const [schoolsRes, departmentsRes] = await Promise.all([
          schoolsPromise.catch(err => {
            console.error('Schools API failed:', err);
            return { data: [] };
          }),
          departmentsPromise.catch(err => {
            console.error('Departments API failed:', err);
            return { data: [] };
          })
        ]);
        
        console.log('Schools data:', schoolsRes.data);
        console.log('Departments data:', departmentsRes.data);
        
        // Safely set the data with fallbacks
        setSchools(Array.isArray(schoolsRes.data) ? schoolsRes.data : []);
        setDepartments(Array.isArray(departmentsRes.data) ? departmentsRes.data : []);
      } catch (err) {
        console.error('Error fetching data:', err);
        console.error('Error details:', err.response?.data);
      }
    };
    fetchData();
  }, [token]);

  // Filter departments when school changes
  useEffect(() => {
    if (form.school && Array.isArray(departments)) {
      const filtered = departments.filter(dept => 
        dept && dept.school && dept.school._id === form.school
      );
      setFilteredDepartments(filtered);
      
      // Reset department if it doesn't belong to selected school
      if (form.department && !filtered.find(d => d && d._id === form.department)) {
        setForm(prev => ({ ...prev, department: '' }));
      }
    } else {
      setFilteredDepartments([]);
      setForm(prev => ({ ...prev, department: '' }));
    }
  }, [form.school, departments]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTouched({ ...touched, [e.target.name]: true });
  };
  
  const handlePermissionChange = key => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key]
    }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!emailRegex.test(form.email)) return 'Invalid email address';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters';
    if (!form.school) return 'School is required';
    if (!form.department) return 'Department is required';
    // Sections are optional
    return '';
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await onAdd(form);
      setSuccess('Teacher added successfully');
      setForm({ name: '', email: '', password: '', permissions: [], school: '', department: '' });
      setTouched({});
    } catch (err) {
      setError(err.message || 'Failed to add teacher');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>
        A unique UID (5-digit format: 00001, 00002) will be automatically generated upon creation.
        <br />
        Teachers are assigned to school and department. Section and course assignments should be done separately via the Section-Course-Teacher relationship.
      </Alert>
      <TextField
        label="Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        error={!!touched.name && !form.name.trim()}
        helperText={touched.name && !form.name.trim() ? 'Name is required' : ''}
        inputProps={{ title: 'Enter the full name of the teacher' }}
      />
      <TextField
        label="Email"
        name="email"
        value={form.email}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        error={!!touched.email && (!form.email.trim() || !emailRegex.test(form.email))}
        helperText={touched.email && !form.email.trim() ? 'Email is required' : (touched.email && !emailRegex.test(form.email) ? 'Invalid email address' : '')}
        inputProps={{ title: 'Enter a valid email address' }}
      />
      <TextField
        label="Password"
        name="password"
        value={form.password}
        onChange={handleChange}
        type="password"
        fullWidth
        margin="normal"
        required
        error={!!touched.password && (!form.password || form.password.length < 6)}
        helperText={touched.password && (!form.password || form.password.length < 6) ? 'Password must be at least 6 characters' : ''}
        inputProps={{ title: 'Password must be at least 6 characters' }}
      />
      
      <FormControl fullWidth margin="normal" required error={!!touched.school && !form.school}>
        <InputLabel>School</InputLabel>
        <Select
          name="school"
          value={form.school}
          onChange={handleChange}
          label="School"
        >
          {Array.isArray(schools) && schools.length === 0 ? (
            <MenuItem disabled>
              <em>No schools available</em>
            </MenuItem>
          ) : (
            Array.isArray(schools) && schools.map(school => (
              school && school._id && school.name && school.code ? (
                <MenuItem key={school._id} value={school._id}>
                  {school.name} ({school.code})
                </MenuItem>
              ) : null
            ))
          )}
        </Select>
        {touched.school && !form.school && <Alert severity="error" sx={{ mt: 1 }}>School is required</Alert>}
      </FormControl>

      <FormControl fullWidth margin="normal" required error={!!touched.department && !form.department} disabled={!form.school}>
        <InputLabel>Department</InputLabel>
        <Select
          name="department"
          value={form.department}
          onChange={handleChange}
          label="Department"
        >
          <MenuItem value="">
            <em>Select Department</em>
          </MenuItem>
          {Array.isArray(filteredDepartments) && filteredDepartments.map(dept => (
            dept && dept._id && dept.name && dept.code ? (
              <MenuItem key={dept._id} value={dept._id}>
                {dept.name} ({dept.code})
              </MenuItem>
            ) : null
          ))}
        </Select>
        {touched.department && !form.department && <Alert severity="error" sx={{ mt: 1 }}>Department is required</Alert>}
      </FormControl>
      
      <FormGroup row sx={{ mt: 2 }}>
        {PERMISSIONS.map(p => (
          <FormControlLabel
            key={p.key}
            control={<Checkbox checked={form.permissions.includes(p.key)} onChange={() => handlePermissionChange(p.key)} />}
            label={p.label}
          />
        ))}
      </FormGroup>
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>Add Teacher</Button>
    </Box>
  );
};

export default AddTeacherForm;