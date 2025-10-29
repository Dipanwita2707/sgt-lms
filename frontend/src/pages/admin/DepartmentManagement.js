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
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as DepartmentIcon
} from '@mui/icons-material';
import axios from 'axios';
import BulkUploadDepartments from '../../components/admin/BulkUploadDepartments';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState({ 
    name: '', 
    code: '', 
    description: '', 
    school: '' 
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDepartments();
    fetchSchools();
  }, []);

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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editMode) {
        await axios.put(`/api/departments/${currentDepartment._id}`, {
          name: currentDepartment.name,
          code: currentDepartment.code,
          description: currentDepartment.description,
          schoolId: currentDepartment.school // Send as schoolId, not school
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Department updated successfully');
      } else {
        await axios.post('/api/departments', {
          name: currentDepartment.name,
          code: currentDepartment.code,
          description: currentDepartment.description,
          schoolId: currentDepartment.school // Send as schoolId, not school
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Department created successfully');
      }
      fetchDepartments();
      handleClose();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error saving department', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await axios.delete(`/api/departments/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Department deleted successfully');
        fetchDepartments();
      } catch (error) {
        showSnackbar(error.response?.data?.message || 'Error deleting department', 'error');
      }
    }
  };

  const handleEdit = (department) => {
    setCurrentDepartment({
      ...department,
      school: department.school._id
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setCurrentDepartment({ name: '', code: '', description: '', school: '' });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleBulkDepartmentUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      '/api/admin/departments/bulk-upload',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Refresh departments
    await fetchDepartments();
    return response.data;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DepartmentIcon /> Department Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Add Department 
        </Button>
      </Box>

      {/* Bulk Upload Departments */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Bulk Department Creation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create multiple departments at once using CSV file
        </Typography>
        <BulkUploadDepartments onUpload={handleBulkDepartmentUpload} />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>HOD</TableCell>
              <TableCell>Courses</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {departments.map((department) => (
              <TableRow key={department._id}>
                <TableCell>
                  <Chip label={department.code} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{department.name}</TableCell>
                <TableCell>
                  <Chip label={department.school?.name} color="secondary" variant="outlined" />
                </TableCell>
                <TableCell>{department.description}</TableCell>
                <TableCell>
                  {department.hod ? department.hod.name : 'No HOD Assigned'}
                </TableCell>
                <TableCell>
                  <Chip label={department.courses?.length || 0} color="info" />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(department)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(department._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Department' : 'Add New Department'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>School</InputLabel>
            <Select
              value={currentDepartment.school}
              onChange={(e) => setCurrentDepartment({ ...currentDepartment, school: e.target.value })}
              label="School"
            >
              {schools.map((school) => (
                <MenuItem key={school._id} value={school._id}>
                  {school.name} ({school.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            label="Department Code"
            fullWidth
            variant="outlined"
            value={currentDepartment.code}
            onChange={(e) => setCurrentDepartment({ ...currentDepartment, code: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Department Name"
            fullWidth
            variant="outlined"
            value={currentDepartment.name}
            onChange={(e) => setCurrentDepartment({ ...currentDepartment, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={currentDepartment.description}
            onChange={(e) => setCurrentDepartment({ ...currentDepartment, description: e.target.value })}
          />
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

export default DepartmentManagement;
