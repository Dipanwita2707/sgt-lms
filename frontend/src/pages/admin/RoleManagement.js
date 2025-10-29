import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormGroup, FormControlLabel, CircularProgress, Snackbar, Alert } from '@mui/material';
import axios from 'axios';

const fetchRoles = async (token) => {
  const res = await axios.get('/api/roles', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};
const fetchPermissions = async () => {
  // Hardcoded for now, should be fetched from backend config if exposed
  return [
    'manage_teachers',
    'manage_students',
    'manage_courses',
    'manage_videos',
    'view_analytics',
  ];
};
const fetchAuditLogs = async (token) => {
  const res = await axios.get('/api/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};
const createRole = async (role, token) => {
  const res = await axios.post('/api/role', role, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};
const updateRole = async (id, permissions, token) => {
  const res = await axios.put(`/api/role/${id}`, { permissions }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [snackbar, setSnackbar] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rolesData = await fetchRoles(token);
        setRoles(rolesData);
        setPermissions(await fetchPermissions());
        setAuditLogs(await fetchAuditLogs(token));
      } catch (error) {
        console.error("Error fetching data:", error);
        setSnackbar("Failed to load roles. You may not have sufficient permissions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleOpen = (role) => {
    setEditRole(role || { name: '', permissions: [] });
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    if (editRole._id) {
      await updateRole(editRole._id, editRole.permissions, token);
      setSnackbar('Role updated');
    } else {
      await createRole(editRole, token);
      setSnackbar('Role created');
    }
    setRoles(await fetchRoles(token));
    setOpen(false);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" mb={2}>Role & Permission Management</Typography>
      
      {snackbar && snackbar.includes("permissions") ? (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#fff4e5' }}>
          <Typography variant="h6" color="error">Access Restricted</Typography>
          <Typography>
            Role management is restricted to admin users only. 
            The current user does not have sufficient permissions to access this feature.
          </Typography>
        </Paper>
      ) : (
        <>
          <Button variant="contained" onClick={() => handleOpen(null)} sx={{ mb: 2 }}>Create Role</Button>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6">Roles</Typography>
            {roles.length === 0 ? (
              <Typography variant="body2" sx={{ mt: 1 }}>No roles found or insufficient permissions.</Typography>
            ) : (
              roles.map(role => (
                <Box key={role._id} sx={{ mb: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  <b>{role.name}</b> — Permissions: {role.permissions.join(', ')}
                  <Button size="small" onClick={() => handleOpen(role)} sx={{ ml: 2 }}>Edit</Button>
                </Box>
              ))
            )}
          </Paper>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6">Audit Log</Typography>
            {auditLogs.length === 0 ? (
              <Typography variant="body2" sx={{ mt: 1 }}>No audit logs found or insufficient permissions.</Typography>
            ) : (
              auditLogs.map(log => (
                <Box key={log._id} sx={{ mb: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  <b>{log.action}</b> by {log.performedBy?.email} {log.targetUser && <>→ {log.targetUser.email}</>} at {new Date(log.createdAt).toLocaleString()}<br />
                  {log.details && <pre style={{ margin: 0 }}>{JSON.stringify(log.details, null, 2)}</pre>}
                </Box>
              ))
            )}
          </Paper>
        </>
      )}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editRole?._id ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Role Name"
            value={editRole?.name || ''}
            onChange={e => setEditRole(r => ({ ...r, name: e.target.value }))}
            fullWidth
            margin="normal"
            disabled={!!editRole?._id}
          />
          <FormGroup>
            {permissions.map(perm => (
              <FormControlLabel
                key={perm}
                control={<Checkbox checked={editRole?.permissions?.includes(perm)} onChange={e => setEditRole(r => ({ ...r, permissions: e.target.checked ? [...r.permissions, perm] : r.permissions.filter(p => p !== perm) }))} />}
                label={perm}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')}>
        <Alert severity="success">{snackbar}</Alert>
      </Snackbar>
    </Box>
  );
}
