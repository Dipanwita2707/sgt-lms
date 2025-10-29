import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HODIcon from '@mui/icons-material/SupervisorAccount';
import AssignIcon from '@mui/icons-material/Assignment';
import DepartmentIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import { 
  assignHODToDepartment, 
  removeHODFromDepartment, 
  getAllSchools,
  getDepartmentsBySchool,
  getAvailableHODsForDepartment 
} from '../../api/hierarchyApi';
import BulkUploadHODs from '../../components/admin/BulkUploadHODs';

const HODManagement = () => {
  const [hods, setHods] = useState([]);
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [availableHODs, setAvailableHODs] = useState([]);
  const [open, setOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentHOD, setCurrentHOD] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    school: '',
    department: '',
    teacherId: ''
  });
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedHODForAssignment, setSelectedHODForAssignment] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchHODs();
    fetchSchoolsData();
    fetchDepartments();
    fetchTeachers();
  }, []);

  const fetchSchoolsData = async () => {
    try {
      console.log('Fetching schools data...');
      const schoolsData = await getAllSchools();
      console.log('Schools data received:', schoolsData);
      console.log('First school departments:', schoolsData[0]?.departments);
      console.log('First department HOD:', schoolsData[0]?.departments?.[0]?.hod);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Error fetching schools:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      showSnackbar('Error fetching schools', 'error');
    }
  };

  const handleAssignHOD = async () => {
    if (!selectedDepartment || !selectedHODForAssignment) {
      showSnackbar('Please select both department and HOD', 'error');
      return;
    }

    setLoading(true);
    try {
      await assignHODToDepartment(selectedDepartment, selectedHODForAssignment);
      showSnackbar('HOD assigned successfully');
      setAssignDialog(false);
      setSelectedSchool('');
      setSelectedDepartment('');
      setSelectedHODForAssignment('');
      fetchHODs();
      fetchSchoolsData();
      fetchDepartments();
    } catch (error) {
      showSnackbar(error.message || 'Error assigning HOD', 'error');
    }
    setLoading(false);
  };

  const handleRemoveHOD = async (departmentId) => {
    if (window.confirm('Are you sure you want to remove the HOD from this department?')) {
      try {
        await removeHODFromDepartment(departmentId);
        showSnackbar('HOD removed successfully');
        fetchHODs();
        fetchSchoolsData();
        fetchDepartments();
      } catch (error) {
        showSnackbar(error.message || 'Error removing HOD', 'error');
      }
    }
  };

  const openAssignDialog = async () => {
    try {
      setAssignDialog(true);
    } catch (error) {
      showSnackbar('Error opening assignment dialog', 'error');
    }
  };

  const handleSchoolSelectionForAssignment = async (schoolId) => {
    console.log('=== School Selection Debug ===');
    console.log('Selected school ID:', schoolId);
    
    setSelectedSchool(schoolId);
    setSelectedDepartment('');
    setSelectedHODForAssignment('');
    
    if (schoolId) {
      try {
        console.log('Fetching departments for school:', schoolId);
        console.log('API endpoint will be: /api/departments/school/' + schoolId);
        
        const departmentsData = await getDepartmentsBySchool(schoolId);
        console.log('Raw departments data received:', departmentsData);
        console.log('Number of departments:', departmentsData.length);
        
        const filteredDepartments = departmentsData.filter(dept => !dept.hod);
        console.log('Departments without HOD:', filteredDepartments);
        console.log('Number of departments without HOD:', filteredDepartments.length);
        
        setFilteredDepartments(filteredDepartments);
      } catch (error) {
        console.error('=== Error fetching departments ===');
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error response:', error.response);
        showSnackbar('Error fetching departments', 'error');
      }
    } else {
      setFilteredDepartments([]);
    }
  };

  const handleDepartmentSelectionForAssignment = async (departmentId) => {
    setSelectedDepartment(departmentId);
    setSelectedHODForAssignment('');
    
    if (departmentId) {
      try {
        console.log('Fetching available HODs for department:', departmentId);
        const availableHODsData = await getAvailableHODsForDepartment(departmentId);
        console.log('Available HODs data received:', availableHODsData);
        setAvailableHODs(availableHODsData);
      } catch (error) {
        console.error('Error fetching available HODs:', error);
        showSnackbar('Error fetching available HODs', 'error');
      }
    }
  };

  // Filter departments when school changes
  useEffect(() => {
    if (currentHOD.school) {
      const filtered = departments.filter(dept => 
        dept.school && dept.school._id === currentHOD.school
      );
      setFilteredDepartments(filtered);
      // Reset department selection if the current department doesn't belong to the selected school
      if (currentHOD.department && !filtered.find(dept => dept._id === currentHOD.department)) {
        setCurrentHOD(prev => ({ ...prev, department: '' }));
      }
    } else {
      setFilteredDepartments([]);
      setCurrentHOD(prev => ({ ...prev, department: '' }));
    }
  }, [currentHOD.school, departments]);

  const fetchSchools = async () => {
    try {
      const response = await axios.get('/api/schools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data);
    } catch (error) {
      showSnackbar('Error fetching schools', 'error');
    }
  };

  const fetchHODs = async () => {
    try {
      const response = await axios.get('/api/admin/hods', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHods(response.data);
    } catch (error) {
      showSnackbar('Error fetching HODs', 'error');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data);
    } catch (error) {
      showSnackbar('Error fetching departments', 'error');
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get('/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter teachers to include users with teacher role (both new roles array and legacy role field)
      setTeachers(response.data.filter(teacher => 
        (teacher.roles && teacher.roles.includes('teacher')) || teacher.role === 'teacher'
      ));
    } catch (error) {
      showSnackbar('Error fetching teachers', 'error');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editMode) {
        await axios.put(`/api/admin/hods/${currentHOD._id}`, {
          name: currentHOD.name,
          email: currentHOD.email,
          schoolId: currentHOD.school, // Send as schoolId, not school
          departmentId: currentHOD.department, // Send as departmentId, not department
          isActive: currentHOD.isActive
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('HOD updated successfully');
      } else {
        await axios.post('/api/admin/hods', {
          name: currentHOD.name,
          email: currentHOD.email,
          password: currentHOD.password,
          schoolId: currentHOD.school, // Send as schoolId, not school
          departmentId: currentHOD.department, // Send as departmentId, not department
          role: 'hod'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('HOD created successfully');
      }
      fetchHODs();
      handleClose();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error saving HOD', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this HOD?')) {
      try {
        await axios.delete(`/api/admin/hods/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('HOD deleted successfully');
        fetchHODs();
      } catch (error) {
        showSnackbar(error.response?.data?.message || 'Error deleting HOD', 'error');
      }
    }
  };

  const handleEdit = (hod) => {
    setCurrentHOD({
      ...hod,
      school: hod.department?.school?._id || hod.department?.school || '',
      department: hod.department?._id || '',
      password: '' // Don't populate password for security
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setCurrentHOD({ 
      name: '', 
      email: '', 
      password: '', 
      school: '',
      department: '', 
      teacherId: '' 
    });
    setFilteredDepartments([]);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleBulkHODUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      '/api/admin/hods/bulk-upload',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Refresh HODs and schools
    await Promise.all([fetchHODs(), fetchSchoolsData()]);
    return response.data;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HODIcon color="primary" /> HOD Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            Add HOD
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssignIcon />}
            onClick={openAssignDialog}
          >
            Assign HOD to Department
          </Button>
        </Box>
      </Box>

      {/* Bulk Upload HODs */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Bulk HOD Creation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create multiple HODs at once and assign to departments using CSV file
        </Typography>
        <BulkUploadHODs onUpload={handleBulkHODUpload} />
      </Box>

      {/* Departments with HOD Assignments by School */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DepartmentIcon color="secondary" />
            Departments & HOD Assignments
          </Typography>
        </Grid>
        {schools.map((school) => (
          <Grid item xs={12} key={school._id}>
            <Card sx={{ mb: 2 }}>
              <CardHeader
                title={`${school.name} - Departments`}
                subheader={`School Code: ${school.code}`}
                avatar={
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {school.name.charAt(0)}
                  </Avatar>
                }
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  {school.departments && school.departments.length > 0 ? (
                    school.departments.map((department) => (
                      <Grid item xs={12} md={6} lg={4} key={department._id}>
                        <Card variant="outlined">
                          <CardHeader
                            avatar={
                              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                <DepartmentIcon />
                              </Avatar>
                            }
                            title={department.name}
                            subheader={`Code: ${department.code}`}
                            action={
                              department.hod ? (
                                <IconButton 
                                  color="error" 
                                  onClick={() => handleRemoveHOD(department._id)}
                                  title="Remove HOD"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              ) : (
                                <IconButton 
                                  color="primary" 
                                  onClick={openAssignDialog}
                                  title="Assign HOD"
                                >
                                  <AssignIcon />
                                </IconButton>
                              )
                            }
                          />
                          <CardContent>
                            {department.hod ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'success.main' }}>
                                  <PersonIcon />
                                </Avatar>
                                <Box>
                                  <Typography variant="h6">{department.hod.name}</Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    {department.hod.email}
                                  </Typography>
                                  <Chip label="HOD" color="success" size="small" sx={{ mt: 1 }} />
                                </Box>
                              </Box>
                            ) : (
                              <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="body2" color="textSecondary">
                                  No HOD Assigned
                                </Typography>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<AssignIcon />}
                                  onClick={openAssignDialog}
                                  sx={{ mt: 1 }}
                                >
                                  Assign HOD
                                </Button>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                        No departments found for this school
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* All HODs Table */}
      <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon color="primary" />
        All HODs
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>HOD ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hods.map((hod) => (
              <TableRow key={hod._id}>
                <TableCell>
                  <Chip label={hod.teacherId || hod.hodId} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{hod.name}</TableCell>
                <TableCell>{hod.email}</TableCell>
                <TableCell>
                  {hod.department ? (
                    <Chip label={hod.department.name} color="secondary" variant="outlined" />
                  ) : (
                    'No Department Assigned'
                  )}
                </TableCell>
                <TableCell>
                  {hod.department?.school ? (
                    <Chip label={hod.department.school.name} color="info" variant="outlined" />
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={hod.isActive ? 'Active' : 'Inactive'} 
                    color={hod.isActive ? 'success' : 'error'} 
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(hod)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(hod._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Assign HOD Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign HOD to Department</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Select School</InputLabel>
            <Select
              value={selectedSchool}
              label="Select School"
              onChange={(e) => handleSchoolSelectionForAssignment(e.target.value)}
            >
              {schools.map((school) => (
                <MenuItem key={school._id} value={school._id}>
                  {school.name} ({school.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Department</InputLabel>
            <Select
              value={selectedDepartment}
              label="Select Department"
              onChange={(e) => handleDepartmentSelectionForAssignment(e.target.value)}
              disabled={!selectedSchool}
            >
              {filteredDepartments.length === 0 ? (
                <MenuItem disabled>
                  <em>{selectedSchool ? 'No departments available or all departments have HODs assigned' : 'Please select a school first'}</em>
                </MenuItem>
              ) : (
                filteredDepartments.map((department) => (
                  <MenuItem key={department._id} value={department._id}>
                    {department.name} ({department.code})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select HOD</InputLabel>
            <Select
              value={selectedHODForAssignment}
              label="Select HOD"
              onChange={(e) => setSelectedHODForAssignment(e.target.value)}
              disabled={!selectedDepartment}
            >
              {availableHODs.length === 0 ? (
                <MenuItem disabled>
                  <em>{selectedDepartment ? 'No HODs available or all HODs are assigned' : 'Please select a department first'}</em>
                </MenuItem>
              ) : (
                availableHODs.map((hod) => (
                  <MenuItem key={hod._id} value={hod._id}>
                    {hod.name} ({hod.email})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAssignHOD} 
            variant="contained"
            disabled={!selectedDepartment || !selectedHODForAssignment || loading}
          >
            Assign HOD
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit HOD' : 'Add New HOD'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={currentHOD.name}
            onChange={(e) => setCurrentHOD({ ...currentHOD, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={currentHOD.email}
            onChange={(e) => setCurrentHOD({ ...currentHOD, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          {!editMode && (
            <TextField
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={currentHOD.password}
              onChange={(e) => setCurrentHOD({ ...currentHOD, password: e.target.value })}
              sx={{ mb: 2 }}
            />
          )}
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>School</InputLabel>
            <Select
              value={currentHOD.school}
              onChange={(e) => setCurrentHOD({ ...currentHOD, school: e.target.value })}
              label="School"
              required
            >
              {schools.map((school) => (
                <MenuItem key={school._id} value={school._id}>
                  {school.name} ({school.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={currentHOD.department}
              onChange={(e) => setCurrentHOD({ ...currentHOD, department: e.target.value })}
              label="Department"
              disabled={!currentHOD.school}
              required
            >
              {filteredDepartments.map((department) => (
                <MenuItem key={department._id} value={department._id}>
                  {department.name} ({department.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HODManagement;
