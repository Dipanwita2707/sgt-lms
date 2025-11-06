import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Checkbox, FormGroup, FormControlLabel, CircularProgress, Snackbar, Alert,
  Accordion, AccordionSummary, AccordionDetails, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Divider, Grid, Card, CardContent
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, 
  AccessTime as AccessTimeIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Computer as ComputerIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
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
const fetchSessions = async (token) => {
  const res = await axios.get('/api/admin/sessions?limit=100', { 
    headers: { Authorization: `Bearer ${token}` } 
  });
  return res.data;
};
const fetchSessionActivities = async (sessionId, token) => {
  const res = await axios.get(`/api/admin/sessions/${sessionId}/activities`, { 
    headers: { Authorization: `Bearer ${token}` } 
  });
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
  const [sessions, setSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionActivities, setSessionActivities] = useState({});
  const [loadingActivities, setLoadingActivities] = useState({});
  const token = localStorage.getItem('token');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rolesData = await fetchRoles(token);
        setRoles(rolesData);
        setPermissions(await fetchPermissions());
        const sessionsData = await fetchSessions(token);
        setSessions(sessionsData.sessions || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSnackbar("Failed to load data. You may not have sufficient permissions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleExpandSession = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    
    setExpandedSession(sessionId);
    
    // Load activities if not already loaded
    if (!sessionActivities[sessionId]) {
      setLoadingActivities(prev => ({ ...prev, [sessionId]: true }));
      try {
        const data = await fetchSessionActivities(sessionId, token);
        setSessionActivities(prev => ({ ...prev, [sessionId]: data }));
      } catch (error) {
        console.error('Error loading session activities:', error);
        setSnackbar('Failed to load session activities');
      } finally {
        setLoadingActivities(prev => ({ ...prev, [sessionId]: false }));
      }
    }
  };

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
          
          {/* User Sessions & Activity Tracking */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" mb={2}>User Sessions & Activity Tracking</Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>
              All user activities are now grouped by login session. Each session shows all actions performed from login to logout.
            </Typography>
            
            {sessions.length === 0 ? (
              <Typography variant="body2" sx={{ mt: 1 }}>No sessions found.</Typography>
            ) : (
              sessions.map(session => (
                <Accordion 
                  key={session.sessionId}
                  expanded={expandedSession === session.sessionId}
                  onChange={() => handleExpandSession(session.sessionId)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {session.userName} ({session.userEmail})
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip 
                            icon={<LoginIcon />}
                            label={new Date(session.loginTime).toLocaleString()} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                          <Chip 
                            icon={<AccessTimeIcon />}
                            label={`Duration: ${session.duration}`} 
                            size="small" 
                          />
                          <Chip 
                            label={`${session.activityCount} activities`} 
                            size="small" 
                            color="info"
                          />
                          <Chip 
                            icon={<ComputerIcon />}
                            label={`${session.browser} on ${session.os}`} 
                            size="small" 
                            variant="outlined"
                          />
                          {session.hasLogout ? (
                            <Chip 
                              icon={<LogoutIcon />}
                              label="Logged Out" 
                              size="small" 
                              color="success"
                            />
                          ) : (
                            <Chip 
                              label={session.isActive ? "Active" : "Session Expired"} 
                              size="small" 
                              color={session.isActive ? "warning" : "default"}
                            />
                          )}
                        </Box>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {session.userRole}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {loadingActivities[session.sessionId] ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : sessionActivities[session.sessionId] ? (
                      <Box>
                        {/* Session Summary */}
                        <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                          <CardContent>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="textSecondary">Session ID</Typography>
                                <Typography variant="body2" fontFamily="monospace">{session.sessionId}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="textSecondary">IP Address</Typography>
                                <Typography variant="body2">{session.ipAddress}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="textSecondary">Login Time</Typography>
                                <Typography variant="body2">{new Date(session.loginTime).toLocaleString()}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="textSecondary">Last Activity</Typography>
                                <Typography variant="body2">{new Date(session.lastActivity).toLocaleString()}</Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>

                        {/* Activity Timeline */}
                        <Typography variant="subtitle2" mb={1} fontWeight="bold">Activity Timeline</Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell>Action</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Response Time</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {sessionActivities[session.sessionId].activities.map((activity, index) => (
                                <TableRow key={activity.id} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' } }}>
                                  <TableCell>
                                    <Typography variant="caption">
                                      {new Date(activity.timestamp).toLocaleTimeString()}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={activity.actionType.toUpperCase()} 
                                      size="small"
                                      color={
                                        activity.actionType === 'login' ? 'primary' :
                                        activity.actionType === 'logout' ? 'success' :
                                        activity.actionType === 'delete' ? 'error' :
                                        activity.actionType === 'create' || activity.actionType === 'update' ? 'warning' :
                                        'default'
                                      }
                                      sx={{ minWidth: 70 }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">{activity.description || activity.action}</Typography>
                                    {activity.requestUrl && (
                                      <Typography variant="caption" color="textSecondary">
                                        {activity.requestMethod} {activity.requestUrl}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {activity.status === 'success' ? (
                                      <Chip icon={<CheckCircleIcon />} label="Success" size="small" color="success" />
                                    ) : (
                                      <Chip icon={<ErrorIcon />} label={activity.status} size="small" color="error" />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">
                                      {activity.responseTime ? `${activity.responseTime}ms` : '-'}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">No activity data loaded</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
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
