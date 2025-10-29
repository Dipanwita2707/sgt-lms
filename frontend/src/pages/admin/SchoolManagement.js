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
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import axios from 'axios';
import BulkUploadSchools from '../../components/admin/BulkUploadSchools';

const SchoolManagement = () => {
  const [schools, setSchools] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSchool, setCurrentSchool] = useState({ name: '', code: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSchools();
  }, []);

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
        await axios.put(`/api/schools/${currentSchool._id}`, currentSchool, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('School updated successfully');
      } else {
        await axios.post('/api/schools', currentSchool, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('School created successfully');
      }
      fetchSchools();
      handleClose();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error saving school', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this school?')) {
      try {
        await axios.delete(`/api/schools/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('School deleted successfully');
        fetchSchools();
      } catch (error) {
        showSnackbar(error.response?.data?.message || 'Error deleting school', 'error');
      }
    }
  };

  const handleEdit = (school) => {
    setCurrentSchool(school);
    setEditMode(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setCurrentSchool({ name: '', code: '', description: '' });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleBulkSchoolUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      '/api/admin/schools/bulk-upload',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Refresh schools
    await fetchSchools();
    return response.data;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon /> School Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Add School
        </Button>
      </Box>

      {/* Bulk Upload Schools */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Bulk School Creation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create multiple schools at once using CSV file
        </Typography>
        <BulkUploadSchools onUpload={handleBulkSchoolUpload} />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Dean</TableCell>
              <TableCell>Departments</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school._id}>
                <TableCell>
                  <Chip label={school.code} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{school.name}</TableCell>
                <TableCell>{school.description}</TableCell>
                <TableCell>
                  {school.dean ? school.dean.name : 'No Dean Assigned'}
                </TableCell>
                <TableCell>
                  <Chip label={school.departments?.length || 0} color="secondary" />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(school)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(school._id)} color="error">
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
          {editMode ? 'Edit School' : 'Add New School'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="School Code"
            fullWidth
            variant="outlined"
            value={currentSchool.code}
            onChange={(e) => setCurrentSchool({ ...currentSchool, code: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="School Name"
            fullWidth
            variant="outlined"
            value={currentSchool.name}
            onChange={(e) => setCurrentSchool({ ...currentSchool, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={currentSchool.description}
            onChange={(e) => setCurrentSchool({ ...currentSchool, description: e.target.value })}
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

export default SchoolManagement;
