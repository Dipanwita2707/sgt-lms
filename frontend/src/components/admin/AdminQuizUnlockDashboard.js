import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Stack,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  Badge
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LockResetIcon from '@mui/icons-material/LockReset';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import { format } from 'date-fns';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const AdminQuizUnlockDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockNote, setUnlockNote] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get('/api/quiz-unlock/admin-all-locked-students', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setItems(response.data.data);
      } else {
        showAlert('Error fetching locked students', 'error');
      }
    } catch (err) {
      console.error('Failed to load locks:', err);
      showAlert('Error fetching locked students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const getReasonText = (reason) => {
    switch (reason) {
      case 'BELOW_PASSING_SCORE':
        return 'Below Passing Score';
      case 'SECURITY_VIOLATION':
        return 'Security Violation';
      case 'TIME_EXCEEDED':
        return 'Time Exceeded';
      case 'MANUAL_LOCK':
        return 'Manual Lock';
      default:
        return reason;
    }
  };

  const getAuthorizationChip = (level) => {
    const configs = {
      'TEACHER': { color: 'warning', icon: '👨‍🏫', label: 'Teacher Level' },
      'HOD': { color: 'secondary', icon: '👨‍💼', label: 'HOD Level' },
      'DEAN': { color: 'error', icon: '🎓', label: 'Dean Level' }
    };
    
    const config = configs[level] || { color: 'default', icon: '❓', label: level };
    
    return (
      <Chip 
        size="small" 
        color={config.color} 
        label={`${config.icon} ${config.label}`}
        variant="filled"
      />
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(it =>
      (it.student?.name || '').toLowerCase().includes(q) ||
      (it.student?.regno || '').toLowerCase().includes(q) ||
      (it.course?.name || '').toLowerCase().includes(q) ||
      (it.quiz?.title || '').toLowerCase().includes(q) ||
      getReasonText(it.lockInfo?.reason || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleAdminUnlock = (item) => {
    setSelectedLock(item);
    setUnlockReason('');
    setUnlockNote('');
    setUnlockDialogOpen(true);
  };

  const performAdminUnlock = async () => {
    if (!unlockReason.trim()) {
      showAlert('Please provide a reason for the admin override unlock', 'error');
      return;
    }

    try {
      setUnlocking(true);
      const response = await axios.post(
        `/api/quiz-unlock/admin-unlock/${selectedLock.lockId}`,
        {
          reason: unlockReason,
          notes: unlockNote
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showAlert('Quiz unlocked successfully by admin override', 'success');
        setUnlockDialogOpen(false);
        fetchData();
      } else {
        showAlert(response.data.message || 'Unlock failed', 'error');
      }
    } catch (error) {
      console.error('Admin unlock error:', error);
      showAlert(error.response?.data?.message || 'Error performing admin unlock', 'error');
    } finally {
      setUnlocking(false);
    }
  };

  const fetchHistory = async (item) => {
    try {
      const response = await axios.get(
        `/api/quiz-unlock/unlock-history/${item.student.id}/${item.quiz.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistoryItem({ ...item, history: response.data.data });
      setHistoryOpen(true);
    } catch (error) {
      console.error('Error fetching history:', error);
      showAlert('Error fetching unlock history', 'error');
    }
  };

  const securityViolations = filtered.filter(item => item.lockInfo?.isSecurityViolation);
  const regularLocks = filtered.filter(item => !item.lockInfo?.isSecurityViolation);

  return (
    <Box>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert({ show: false, message: '', severity: 'info' })}>
          {alert.message}
        </Alert>
      )}

      <Card elevation={2}>
        <CardHeader
          avatar={<AdminPanelSettingsIcon color="primary" />}
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Admin Quiz Unlock Dashboard</Typography>
              <Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchData} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          }
          subheader="Admin override: Unlock any quiz regardless of authorization level or violation type."
        />
        <Divider />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search by name, reg no, course, quiz, or reason"
              value={query}
              onChange={e => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ maxWidth: 420, width: '100%' }}
            />
            <Box display="flex" gap={1}>
              <Chip 
                label={`Total: ${items.length}`} 
                color="primary" 
              />
              {securityViolations.length > 0 && (
                <Badge badgeContent={securityViolations.length} color="error">
                  <Chip 
                    icon={<SecurityIcon />}
                    label="Security Violations" 
                    color="error" 
                    variant="outlined"
                  />
                </Badge>
              )}
            </Box>
          </Stack>

          {/* Security Violations Section */}
          {securityViolations.length > 0 && (
            <Box mb={3}>
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Security Violations Requiring Immediate Attention
                </Typography>
                <Typography variant="body2">
                  These quiz locks were triggered by security violations and require admin review.
                </Typography>
              </Alert>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'error.light' }}>
                      <TableCell><strong>Student</strong></TableCell>
                      <TableCell><strong>Reg No</strong></TableCell>
                      <TableCell><strong>Course</strong></TableCell>
                      <TableCell><strong>Quiz</strong></TableCell>
                      <TableCell><strong>Violation Type</strong></TableCell>
                      <TableCell><strong>Locked Since</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityViolations.map((item) => (
                      <TableRow key={item.lockId} sx={{ backgroundColor: 'error.lighter' }}>
                        <TableCell>{item.student?.name}</TableCell>
                        <TableCell>{item.student?.regno}</TableCell>
                        <TableCell>{item.course?.name}</TableCell>
                        <TableCell>{item.quiz?.title}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            color="error" 
                            icon={<SecurityIcon />}
                            label={getReasonText(item.lockInfo?.reason)}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.lockInfo?.lockTimestamp), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              startIcon={<AdminPanelSettingsIcon />}
                              onClick={() => handleAdminUnlock(item)}
                            >
                              Override Unlock
                            </Button>
                            <IconButton 
                              size="small" 
                              onClick={() => fetchHistory(item)}
                            >
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Regular Locks Section */}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Reg No</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Quiz</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Authorization Level</TableCell>
                  <TableCell>Unlock History</TableCell>
                  <TableCell>Locked Since</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regularLocks.map((item) => (
                  <TableRow key={item.lockId}>
                    <TableCell>{item.student?.name}</TableCell>
                    <TableCell>{item.student?.regno}</TableCell>
                    <TableCell>{item.course?.name}</TableCell>
                    <TableCell>{item.quiz?.title}</TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        color={item.lockInfo?.isSecurityViolation ? 'error' : 'warning'}
                        label={getReasonText(item.lockInfo?.reason)}
                      />
                    </TableCell>
                    <TableCell>
                      {item.lockInfo?.lastFailureScore !== undefined 
                        ? `${item.lockInfo.lastFailureScore}/${item.lockInfo.passingScore}` 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getAuthorizationChip(item.lockInfo?.unlockAuthorizationLevel)}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        {item.lockInfo?.teacherUnlockCount > 0 && (
                          <Chip size="small" label={`T:${item.lockInfo.teacherUnlockCount}`} />
                        )}
                        {item.lockInfo?.hodUnlockCount > 0 && (
                          <Chip size="small" label={`H:${item.lockInfo.hodUnlockCount}`} />
                        )}
                        {item.lockInfo?.deanUnlockCount > 0 && (
                          <Chip size="small" label={`D:${item.lockInfo.deanUnlockCount}`} />
                        )}
                        {item.lockInfo?.adminUnlockCount > 0 && (
                          <Chip size="small" color="primary" label={`A:${item.lockInfo.adminUnlockCount}`} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.lockInfo?.lockTimestamp), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<AdminPanelSettingsIcon />}
                          onClick={() => handleAdminUnlock(item)}
                        >
                          Override
                        </Button>
                        <IconButton 
                          size="small" 
                          onClick={() => fetchHistory(item)}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No locked quizzes found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Admin Unlock Dialog */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AdminPanelSettingsIcon color="primary" sx={{ mr: 1 }} />
            Admin Override Unlock
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLock ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Admin Override:</strong> You are about to unlock a quiz using administrative privileges. 
                  This bypasses all normal authorization levels.
                </Typography>
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                {selectedLock.student?.name} • {selectedLock.course?.name} • {selectedLock.quiz?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reg No: {selectedLock.student?.regno || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Lock Reason: {getReasonText(selectedLock.lockInfo?.reason)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Current Authorization Level: {getAuthorizationChip(selectedLock.lockInfo?.unlockAuthorizationLevel)}
              </Typography>
              
              <TextField
                autoFocus
                margin="dense"
                label="Admin Override Reason *"
                fullWidth
                multiline
                rows={2}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Explain why admin override is necessary..."
              />
              <TextField
                margin="dense"
                label="Additional Notes"
                fullWidth
                multiline
                rows={2}
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                placeholder="Any additional details..."
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={performAdminUnlock} 
            variant="contained" 
            color="primary"
            disabled={unlocking || !unlockReason.trim()}
            startIcon={unlocking ? <CircularProgress size={16} /> : <AdminPanelSettingsIcon />}
          >
            {unlocking ? 'Unlocking...' : 'Admin Override Unlock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Unlock History</DialogTitle>
        <DialogContent dividers>
          {historyItem ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {historyItem.student?.name} • {historyItem.course?.name} • {historyItem.quiz?.title}
              </Typography>
              
              <List>
                {/* Teacher History */}
                {historyItem.history?.unlockHistory?.teacher?.map((entry, index) => (
                  <ListItem key={`teacher-${index}`}>
                    <ListItemText
                      primary={`Teacher Unlock ${index + 1}`}
                      secondary={`${format(new Date(entry.unlockTimestamp), 'MMM dd, yyyy HH:mm')} - ${entry.reason}`}
                    />
                  </ListItem>
                ))}
                
                {/* HOD History */}
                {historyItem.history?.unlockHistory?.hod?.map((entry, index) => (
                  <ListItem key={`hod-${index}`}>
                    <ListItemText
                      primary={`HOD Unlock ${index + 1}`}
                      secondary={`${format(new Date(entry.unlockTimestamp), 'MMM dd, yyyy HH:mm')} - ${entry.reason}`}
                    />
                  </ListItem>
                ))}
                
                {/* Dean History */}
                {historyItem.history?.unlockHistory?.dean?.map((entry, index) => (
                  <ListItem key={`dean-${index}`}>
                    <ListItemText
                      primary={`Dean Unlock ${index + 1}`}
                      secondary={`${format(new Date(entry.unlockTimestamp), 'MMM dd, yyyy HH:mm')} - ${entry.reason}`}
                    />
                  </ListItem>
                ))}
                
                {/* Admin History */}
                {historyItem.history?.unlockHistory?.admin?.map((entry, index) => (
                  <ListItem key={`admin-${index}`}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <AdminPanelSettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                          Admin Override {index + 1}
                        </Box>
                      }
                      secondary={`${format(new Date(entry.unlockTimestamp), 'MMM dd, yyyy HH:mm')} - ${entry.reason} (Override Level: ${entry.overrideLevel})`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminQuizUnlockDashboard;