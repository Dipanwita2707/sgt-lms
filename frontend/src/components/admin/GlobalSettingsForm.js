import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Alert } from '@mui/material';

const GlobalSettingsForm = ({ onFetch, onUpdate, settings }) => {
  const [form, setForm] = useState({ maxUploadSize: '', allowedFileTypes: '', emailTemplate: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (settings) {
      setForm({
        maxUploadSize: settings.maxUploadSize || '',
        allowedFileTypes: settings.allowedFileTypes || '',
        emailTemplate: settings.emailTemplate || ''
      });
    }
  }, [settings]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await onUpdate(form);
      setSuccess('Settings updated');
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <TextField label="Max Upload Size (MB)" name="maxUploadSize" value={form.maxUploadSize} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Allowed File Types (comma separated)" name="allowedFileTypes" value={form.allowedFileTypes} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Email Template" name="emailTemplate" value={form.emailTemplate} onChange={handleChange} fullWidth margin="normal" multiline rows={3} />
      <Button type="submit" variant="contained" color="primary">Save Settings</Button>
    </Box>
  );
};

export default GlobalSettingsForm;
