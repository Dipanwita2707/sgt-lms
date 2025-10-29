import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Autocomplete } from '@mui/material';
import { getTeachersBySearch } from '../../api/courseApi';

const AssignTeacherDialog = ({ open, onClose, onSubmit }) => {
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const searchTeachers = async (query) => {
    if (!query || query.length < 2) return;
    
    setLoading(true);
    try {
      const teachers = await getTeachersBySearch(query, token);
      setTeacherOptions(teachers);
    } catch (err) {
      console.error('Error searching teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherSearch.length >= 2) {
      const timer = setTimeout(() => {
        searchTeachers(teacherSearch);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [teacherSearch]);

  const handleSubmit = () => {
    if (!selectedTeacher) return setError('Please select a teacher');
    setError('');
    onSubmit(selectedTeacher.teacherId);
    setSelectedTeacher(null);
    setTeacherSearch('');
  };

  const handleClose = () => {
    setSelectedTeacher(null);
    setTeacherSearch('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Assign Teacher to Course</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        <Autocomplete
          options={teacherOptions}
          getOptionLabel={(option) => `${option.teacherId || ''} - ${option.name} (${option.email})`}
          value={selectedTeacher}
          onChange={(event, newValue) => {
            setSelectedTeacher(newValue);
          }}
          onInputChange={(event, newInputValue) => {
            setTeacherSearch(newInputValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Teacher"
              placeholder="Search by ID, name or email"
              margin="normal"
              fullWidth
              required
            />
          )}
          loading={loading}
          filterOptions={(x) => x} // Disable the built-in filtering
          noOptionsText={teacherSearch.length < 2 ? "Type at least 2 characters to search" : "No teachers found"}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">Assign</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignTeacherDialog;
