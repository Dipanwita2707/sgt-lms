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
import LockResetIcon from '@mui/icons-material/LockReset';
import DeanIcon from '@mui/icons-material/AccountBalance';
import AssignIcon from '@mui/icons-material/Assignment';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import { 
  assignDeanToSchool, 
  removeDeanFromSchool, 
  getAllSchools, 
  getAvailableDeansForSchool 
} from '../../api/hierarchyApi';
import BulkUploadDeans from '../../components/admin/BulkUploadDeans';

const DeanManagement = () => {
  const [deans, setDeans] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [availableDeans, setAvailableDeans] = useState([]);
  const [open, setOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDean, setCurrentDean] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    school: '',
    teacherId: ''
  });
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedDeanForAssignment, setSelectedDeanForAssignment] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Reset password dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDeanId, setResetDeanId] = useState('');
  const [resetDeanName, setResetDeanName] = useState('');
  const [newDeanPassword, setNewDeanPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDeans();
    fetchSchoolsData();
    fetchTeachers();
  }, []);

  const fetchSchoolsData = async () => {
    try {
      console.log('Fetching schools data...');
      const schoolsData = await getAllSchools();
      console.log('Schools data received:', schoolsData);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Error fetching schools:', error);
      showSnackbar('Error fetching schools', 'error');
    }
  };

  const handleAssignDean = async () => {
    if (!selectedSchool || !selectedDeanForAssignment) {
      showSnackbar('Please select both school and dean', 'error');
      return;
    }

    setLoading(true);
    try {
      await assignDeanToSchool(selectedSchool, selectedDeanForAssignment);
      showSnackbar('Dean assigned successfully');
      setAssignDialog(false);
      setSelectedSchool('');
      setSelectedDeanForAssignment('');
      fetchDeans();
      fetchSchoolsData();
    } catch (error) {
      showSnackbar(error.message || 'Error assigning dean', 'error');
    }
    setLoading(false);
  };

  const handleRemoveDean = async (schoolId) => {
    if (window.confirm('Are you sure you want to remove the dean from this school?')) {
      try {
        await removeDeanFromSchool(schoolId);
        showSnackbar('Dean removed successfully');
        fetchDeans();
        fetchSchoolsData();
      } catch (error) {
        showSnackbar(error.message || 'Error removing dean', 'error');
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

  const handleSchoolSelection = async (schoolId) => {
    setSelectedSchool(schoolId);
    if (schoolId) {
      try {
        const availableDeansData = await getAvailableDeansForSchool(schoolId);
        setAvailableDeans(availableDeansData);
      } catch (error) {
        showSnackbar('Error fetching available deans', 'error');
      }
    }
  };

  const fetchDeans = async () => {
    try {
      const response = await axios.get('/api/admin/deans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeans(response.data);
    } catch (error) {
      showSnackbar('Error fetching deans', 'error');
    }
  };

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

  const fetchTeachers = async () => {
    try {
      const response = await axios.get('/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data.filter(teacher => teacher.role === 'teacher'));
    } catch (error) {
      showSnackbar('Error fetching teachers', 'error');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editMode) {
        await axios.put(`/api/admin/deans/${currentDean._id}`, {
          name: currentDean.name,
          email: currentDean.email,
          schoolId: currentDean.school, // Send as schoolId, not school
          isActive: currentDean.isActive
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Dean updated successfully');
      } else {
        await axios.post('/api/admin/deans', {
          name: currentDean.name,
          email: currentDean.email,
          password: currentDean.password,
          schoolId: currentDean.school, // Send as schoolId, not school
          role: 'dean'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Dean created successfully');
      }
      fetchDeans();
      handleClose();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error saving dean', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this dean?')) {
      try {
        await axios.delete(`/api/admin/deans/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Dean deleted successfully');
        fetchDeans();
      } catch (error) {
        showSnackbar(error.response?.data?.message || 'Error deleting dean', 'error');
      }
    }
  };

  const handleEdit = (dean) => {
    setCurrentDean({
      ...dean,
      school: dean.school?._id || '',
      password: '' // Don't populate password for security
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setCurrentDean({ name: '', email: '', password: '', school: '', teacherId: '' });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleBulkDeanUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      '/api/admin/deans/bulk-upload',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Refresh deans and schools
    await Promise.all([fetchDeans(), fetchSchoolsData()]);
    return response.data;
  };

  const openResetDialog = (dean) => {
    setResetDeanId(dean._id);
    setResetDeanName(dean.name || dean.email);
    setNewDeanPassword('');
    setResetDialogOpen(true);
  };

  const closeResetDialog = () => {
    setResetDialogOpen(false);
    setResetDeanId('');
    setResetDeanName('');
    setNewDeanPassword('');
    setResetLoading(false);
  };

  const handleResetPassword = async () => {
    if (!newDeanPassword || newDeanPassword.length < 6) {
      showSnackbar('Please enter a password with at least 6 characters', 'error');
      return;
    }
    try {
      setResetLoading(true);
      await axios.post('/api/admin/deans/reset-password', {
        deanId: resetDeanId,
        newPassword: newDeanPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Dean password reset successfully');
      closeResetDialog();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error resetting password', 'error');
      setResetLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeanIcon color="primary" /> Dean Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            Add Dean
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssignIcon />}
            onClick={openAssignDialog}
          >
            Assign Dean to School
          </Button>
        </Box>
      </Box>

      {/* Bulk Upload Deans */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Bulk Dean Creation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create multiple Deans at once and assign to schools using CSV file
        </Typography>
        <BulkUploadDeans onUpload={handleBulkDeanUpload} />
      </Box>

      {/* Schools with Dean Assignments */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon color="secondary" />
            Schools & Dean Assignments
          </Typography>
        </Grid>
        {schools.map((school) => (
          <Grid item xs={12} md={6} lg={4} key={school._id}>
            <Card>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <SchoolIcon />
                  </Avatar>
                }
                title={school.name}
                subheader={`Code: ${school.code}`}
                action={
                  school.dean ? (
                    <IconButton 
                      color="error" 
                      onClick={() => handleRemoveDean(school._id)}
                      title="Remove Dean"
                    >
                      <DeleteIcon />
                    </IconButton>
                  ) : (
                    <IconButton 
                      color="primary" 
                      onClick={openAssignDialog}
                      title="Assign Dean"
                    >
                      <AssignIcon />
                    </IconButton>
                  )
                }
              />
              <Divider />
              <CardContent>
                {school.dean ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{school.dean.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {school.dean.email}
                      </Typography>
                      <Chip label="Dean" color="success" size="small" sx={{ mt: 1 }} />
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      No Dean Assigned
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AssignIcon />}
                      onClick={openAssignDialog}
                      sx={{ mt: 1 }}
                    >
                      Assign Dean
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* All Deans Table */}
      <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon color="primary" />
        All Deans
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Dean ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deans.map((dean) => (
              <TableRow key={dean._id}>
                <TableCell>
                  <Chip label={dean.teacherId || dean.deanId} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{dean.name}</TableCell>
                <TableCell>{dean.email}</TableCell>
                <TableCell>
                  {dean.school ? (
                    <Chip label={dean.school.name} color="secondary" variant="outlined" />
                  ) : (
                    'No School Assigned'
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={dean.isActive ? 'Active' : 'Inactive'} 
                    color={dean.isActive ? 'success' : 'error'} 
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(dean)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => openResetDialog(dean)} color="warning" title="Reset Password">
                    <LockResetIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(dean._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Assign Dean Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Dean to School</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Select School</InputLabel>
            <Select
              value={selectedSchool}
              label="Select School"
              onChange={(e) => handleSchoolSelection(e.target.value)}
            >
              {schools.filter(school => !school.dean).map((school) => (
                <MenuItem key={school._id} value={school._id}>
                  {school.name} ({school.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Dean</InputLabel>
            <Select
              value={selectedDeanForAssignment}
              label="Select Dean"
              onChange={(e) => setSelectedDeanForAssignment(e.target.value)}
              disabled={!selectedSchool}
            >
              {availableDeans.map((dean) => (
                <MenuItem key={dean._id} value={dean._id}>
                  {dean.name} ({dean.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAssignDean} 
            variant="contained"
            disabled={!selectedSchool || !selectedDeanForAssignment || loading}
          >
            Assign Dean
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Dean' : 'Add New Dean'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={currentDean.name}
            onChange={(e) => setCurrentDean({ ...currentDean, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={currentDean.email}
            onChange={(e) => setCurrentDean({ ...currentDean, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          {!editMode && (
            <TextField
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={currentDean.password}
              onChange={(e) => setCurrentDean({ ...currentDean, password: e.target.value })}
              sx={{ mb: 2 }}
            />
          )}
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>School</InputLabel>
            <Select
              value={currentDean.school}
              onChange={(e) => setCurrentDean({ ...currentDean, school: e.target.value })}
              label="School"
            >
              {schools.length === 0 ? (
                <MenuItem disabled>
                  <em>No schools available</em>
                </MenuItem>
              ) : (
                schools.map((school) => (
                  <MenuItem key={school._id} value={school._id}>
                    {school.name} ({school.code})
                  </MenuItem>
                ))
              )}
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

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onClose={closeResetDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Dean Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter a new password for {resetDeanName}.
          </Typography>
          <TextField
            label="New Password"
            type="password"
            fullWidth
            value={newDeanPassword}
            onChange={(e) => setNewDeanPassword(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeResetDialog}>Cancel</Button>
          <Button onClick={handleResetPassword} variant="contained" disabled={resetLoading}>
            {resetLoading ? 'Saving...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeanManagement;
