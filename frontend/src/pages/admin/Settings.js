import React, { useState, useEffect } from 'react';
import { Typography, Paper, Divider } from '@mui/material';
import ChangePasswordForm from '../../components/admin/ChangePasswordForm';
import GlobalSettingsForm from '../../components/admin/GlobalSettingsForm';
import axios from 'axios';

const Settings = () => {
  const [settings, setSettings] = useState({});
  const token = localStorage.getItem('token');

  const fetchSettings = async () => {
    const res = await axios.get('/api/admin/settings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Convert array to object for easier access
    const obj = {};
    res.data.forEach(s => { obj[s.key] = s.value; });
    setSettings(obj);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChangePassword = async ({ oldPassword, newPassword }) => {
    await axios.post('/api/admin/change-password', { oldPassword, newPassword }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const handleUpdateSettings = async (form) => {
    for (const key of Object.keys(form)) {
      await axios.post('/api/admin/settings', { key, value: form[key] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    fetchSettings();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Settings</Typography>
      <Typography variant="subtitle1">Change Password</Typography>
      <ChangePasswordForm onChange={handleChangePassword} />
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1">Global Settings</Typography>
      <GlobalSettingsForm onFetch={fetchSettings} onUpdate={handleUpdateSettings} settings={settings} />
    </Paper>
  );
};

export default Settings;
