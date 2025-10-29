import React, { useState } from 'react';
import { Box, TextField, Button, Alert } from '@mui/material';

const ChangePasswordForm = ({ onChange }) => {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await onChange(form);
      setSuccess('Password changed successfully');
      setForm({ oldPassword: '', newPassword: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <TextField label="Old Password" name="oldPassword" value={form.oldPassword} onChange={handleChange} type="password" fullWidth margin="normal" required />
      <TextField label="New Password" name="newPassword" value={form.newPassword} onChange={handleChange} type="password" fullWidth margin="normal" required />
      <Button type="submit" variant="contained" color="primary">Change Password</Button>
    </Box>
  );
};

export default ChangePasswordForm;
