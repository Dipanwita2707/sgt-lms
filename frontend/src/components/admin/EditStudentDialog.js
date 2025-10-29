import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert } from '@mui/material';

const EditStudentDialog = ({ open, onClose, student, onSubmit }) => {
  const [form, setForm] = useState({ name: '', email: '', regNo: '' });
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  useEffect(() => {
    if (student) setForm({ name: student.name, email: student.email, regNo: student.regNo });
  }, [student]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTouched({ ...touched, [e.target.name]: true });
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!emailRegex.test(form.email)) return 'Invalid email address';
    if (!form.regNo.trim()) return 'Reg No is required';
    return '';
  };

  const handleSubmit = () => {
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError('');
    onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Student</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
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
          inputProps={{ title: 'Enter the full name of the student' }}
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
          label="Reg No"
          name="regNo"
          value={form.regNo}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!touched.regNo && !form.regNo.trim()}
          helperText={touched.regNo && !form.regNo.trim() ? 'Reg No is required' : ''}
          inputProps={{ title: 'Enter the registration number' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditStudentDialog;
