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
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LockResetIcon from '@mui/icons-material/LockReset';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { format } from 'date-fns';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const DeanQuizUnlockDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [unlockNote, setUnlockNote] = useState('');
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // Tab management
  const [currentTab, setCurrentTab] = useState(0);
  const [unlockHistory, setUnlockHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get('/api/quiz-unlock/dean-locked-students', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Transform data to match admin table format with proper unlock history
        const transformedData = response.data.data.map(lock => ({
          student: {
            _id: lock.student.id,
            name: lock.student.name,
            email: lock.student.email,
            regNo: lock.student.regno
          },
          course: {
            _id: lock.course.id,
            title: lock.course.title,
            courseCode: lock.course.courseCode
          },
          unit: {
            _id: lock.quiz.id,
            title: lock.quiz.title
          },
          type: 'deanRequired',
          reason: getReasonText(lock.lockInfo.reason),
          violationCount: 0,
          attemptsTaken: lock.lockInfo.totalAttempts,
          attemptLimit: lock.lockInfo.maxAttempts || 3,
          lockedAt: lock.lockInfo.lockTimestamp,
          unlockHistory: lock.unlockHistory || {
            teacher: [],
            hod: [],
            dean: [],
            admin: []
          },
          lockId: lock.lockId,
          lockInfo: lock.lockInfo,
          teacherUnlockCount: lock.lockInfo.teacherUnlockCount,
          hodUnlockCount: lock.lockInfo.hodUnlockCount || 0,
          deanUnlockCount: lock.lockInfo.deanUnlockCount || 0
        }));
        setItems(transformedData);
      } else {
        showAlert('Error fetching locked students', 'error');
      }
    } catch (err) {
      console.error('Failed to load dean unlock requests:', err);
      showAlert('Error fetching locked students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnlockHistory = async () => {
    if (!token) return;
    try {
      setHistoryLoading(true);
      
      // Updated: Dean unlock history now works without mandatory filters
      // The backend has been updated to handle Dean's institutional oversight
      const response = await axios.get('/api/quiz-unlock/dean-unlock-history', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUnlockHistory(response.data.data || []);
      } else {
        console.error('Failed to load unlock history:', response.data.message);
        // Don't show error for empty history - it's normal
        if (response.data.message && !response.data.message.includes('filter')) {
          showAlert('Error fetching unlock history', 'error');
        }
        setUnlockHistory([]);
      }
    } catch (err) {
      console.error('Failed to load unlock history:', err);
      // Don't show error alert for 400 status - it means no data with filters
      if (err.response?.status !== 400) {
        showAlert('Error fetching unlock history', 'error');
      }
      setUnlockHistory([]);
    } finally {
      setHistoryLoading(false);
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

  useEffect(() => {
    fetchData();
    fetchUnlockHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 1 && unlockHistory.length === 0) {
      fetchUnlockHistory();
    }
  };

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(it =>
      (it.student?.name || '').toLowerCase().includes(q) ||
      (it.student?.regNo || '').toLowerCase().includes(q) ||
      (it.course?.name || '').toLowerCase().includes(q) ||
      (it.unit?.title || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleDeanUnlock = async (item) => {
    setSelectedLock(item);
    setUnlockReason('');
    setUnlockNote('');
    setUnlockDialogOpen(true);
  };

  const handleUnlockConfirm = async () => {
    if (!unlockReason.trim()) {
      showAlert('Please provide a reason for unlocking', 'warning');
      return;
    }

    try {
      setUnlocking(true);
      const response = await axios.post(
        `/api/quiz-unlock/dean-unlock/${selectedLock.lockId}`,
        {
          reason: unlockReason,
          notes: unlockNote
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        showAlert(
          `Successfully unlocked ${selectedLock.student.name} for ${selectedLock.unit.title}`,
          'success'
        );
        setUnlockDialogOpen(false);
        await fetchData(); // Refresh the list
      } else {
        showAlert(response.data.message || 'Error unlocking student', 'error');
      }
    } catch (error) {
      console.error('Error unlocking student:', error);
      const message = error.response?.data?.message || 'Error unlocking student';
      showAlert(message, 'error');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading students requiring dean authorization...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert({ show: false, message: '', severity: 'info' })}>
          {alert.message}
        </Alert>
      )}

      <Card elevation={2}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" display="flex" alignItems="center">
                <AdminPanelSettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                Dean Quiz Unlock Management
              </Typography>
              <Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => {
                    if (currentTab === 0) {
                      fetchData();
                    } else {
                      fetchUnlockHistory();
                    }
                  }} disabled={loading || historyLoading}>
                    {(loading || historyLoading) ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          }
          subheader="Manage quiz unlock requests and view your unlock history across the institution."
        />
        
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            label={
              <Badge badgeContent={items.length} color="error" max={99}>
                Current Requests
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={unlockHistory.length} color="primary" max={99}>
                Unlock History
              </Badge>
            } 
          />
        </Tabs>
        
        <Divider />
        <CardContent>
          {/* Tab 0: Current Requests */}
          {currentTab === 0 && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Dean Authority:</strong> These students have exhausted their teacher unlock limit (3 unlocks). 
                  As Dean, you have unlimited unlock authority for these cases.
                </Typography>
              </Alert>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search by name, reg no, course, or unit"
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
            <Chip label={`Total: ${items.length}`} />
          </Stack>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Reg No</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Violations</TableCell>
                  <TableCell>Attempts</TableCell>
                  <TableCell>Locked/Last Unlock</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((it, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Chip size="small" color="error" label="Dean Required" />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'error.main' }}>
                          {(it.student?.name || '?').slice(0,1)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{it.student?.name || 'Unknown'}</Typography>
                          <Typography variant="caption" color="text.secondary">{it.student?.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{it.student?.regNo || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{it.course?.name || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">({it.course?.code})</Typography>
                    </TableCell>
                    <TableCell>{it.unit?.title || '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" color="error" variant="outlined" label={it.reason || '-'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color="default" label="0" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{it.attemptsTaken}/{it.attemptLimit}</Typography>
                      <Typography variant="caption" color="error.main">
                        Teacher: 3/3 (exhausted)
                        {it.unlockHistory?.admin?.some(a => a.overrideLevel === 'TEACHER') && (
                          <Chip size="small" variant="outlined" color="secondary" label="Admin Override" sx={{ ml: 0.5, fontSize: '0.6rem', height: '16px' }} />
                        )}
                      </Typography>
                      <Typography variant="caption" color="warning.main" display="block">
                        HOD: {it.lockInfo?.hodUnlockCount || 0}/3
                        {it.unlockHistory?.admin?.some(a => a.overrideLevel === 'HOD') && (
                          <Chip size="small" variant="outlined" color="secondary" label="Admin Override" sx={{ ml: 0.5, fontSize: '0.6rem', height: '16px' }} />
                        )}
                      </Typography>
                      <Typography variant="caption" color="primary">
                        Dean: {it.lockInfo?.deanUnlockCount || 0}/3
                        {it.unlockHistory?.admin?.some(a => a.overrideLevel === 'DEAN') && (
                          <Chip size="small" variant="outlined" color="secondary" label="Admin Override" sx={{ ml: 0.5, fontSize: '0.6rem', height: '16px' }} />
                        )}
                      </Typography>
                      {it.unlockHistory?.admin?.length > 0 && (
                        <Typography variant="caption" color="secondary" display="block">
                          Admin: {it.unlockHistory.admin.length} override(s)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{it.lockedAt ? new Date(it.lockedAt).toLocaleString() : '-'}</Typography>
                        {it.lockInfo?.lastDeanUnlock && (
                          <Typography variant="caption" color="text.secondary">
                            Last dean unlock: {new Date(it.lockInfo.lastDeanUnlock).toLocaleString()}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {it.unlockHistory?.admin?.some(a => a.overrideLevel === 'DEAN') ? (
                        <Chip 
                          size="small" 
                          label="Admin Overridden" 
                          color="secondary"
                          variant="outlined"
                        />
                      ) : (
                        <Tooltip title="Dean Authorization - Limited to 3 unlocks">
                          <span>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<LockResetIcon />}
                              onClick={() => handleDeanUnlock(it)}
                              disabled={it.lockInfo?.deanUnlockCount >= 3}
                            >
                              Dean Unlock ({Math.max(0, 3 - (it.lockInfo?.deanUnlockCount || 0))})
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      <IconButton 
                        size="small" 
                        sx={{ ml: 1 }} 
                        onClick={() => { setHistoryItem(it); setHistoryOpen(true); }}
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary">No dean unlock requests.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
            </>
          )}

          {/* Tab 1: Unlock History */}
          {currentTab === 1 && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Institution-wide Unlock History:</strong> View all unlock activities performed by teachers, HODs, yourself, and admin overrides.
                </Typography>
              </Alert>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Search history by student, course, or action"
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
                <Chip label={`Total History: ${unlockHistory.length}`} />
              </Stack>

              {historyLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                  <CircularProgress />
                  <Typography variant="h6" sx={{ ml: 2 }}>
                    Loading unlock history...
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date & Time</TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Quiz</TableCell>
                        <TableCell>Unlocked By</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {unlockHistory
                        .filter(item => {
                          if (!query) return true;
                          const q = query.toLowerCase();
                          return (
                            item.student?.name?.toLowerCase().includes(q) ||
                            item.student?.regNo?.toLowerCase().includes(q) ||
                            item.course?.name?.toLowerCase().includes(q) ||
                            item.quiz?.title?.toLowerCase().includes(q) ||
                            item.unlockedBy?.name?.toLowerCase().includes(q) ||
                            item.reason?.toLowerCase().includes(q)
                          );
                        })
                        .map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {format(new Date(item.unlockTimestamp), 'MMM dd, yyyy')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(item.unlockTimestamp), 'hh:mm a')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                                  {(item.student?.name || '?').charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.student?.name || 'Unknown'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.student?.regNo || 'N/A'}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.course?.name || 'N/A'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({item.course?.code || 'N/A'})
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.quiz?.title || 'N/A'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.main' }}>
                                  {(item.unlockedBy?.name || '?').charAt(0)}
                                </Avatar>
                                <Typography variant="body2">
                                  {item.unlockedBy?.name || 'Unknown'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={
                                  item.type === 'ADMIN_OVERRIDE' ? 'Admin Override' :
                                  item.role || 'Unknown'
                                } 
                                color={
                                  item.type === 'ADMIN_OVERRIDE' || item.role === 'Admin' ? 'secondary' :
                                  item.role === 'dean' ? 'error' :
                                  item.role === 'hod' ? 'warning' :
                                  'primary'
                                }
                                variant="outlined"
                              />
                              {item.type === 'ADMIN_OVERRIDE' && item.overrideLevel && (
                                <Typography variant="caption" color="secondary.main" sx={{ display: 'block', mt: 0.5 }}>
                                  {item.overrideLevel} level override
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.reason || 'No reason provided'}</Typography>
                              {item.type === 'ADMIN_OVERRIDE' && item.lockReason && (
                                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                                  Original lock: {item.lockReason}
                                </Typography>
                              )}
                              {item.notes && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                  {item.notes}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label="Unlocked" 
                                color="success" 
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      {unlockHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No unlock history available.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dean Unlock Confirmation Dialog */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AdminPanelSettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
            Dean Authorization - Unlock Quiz
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLock ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Dean Authority Required:</strong> This student has exhausted all teacher unlock attempts.
                  Your authorization will grant them access to retake the quiz.
                </Typography>
              </Alert>

              <Typography variant="subtitle2" gutterBottom>
                {selectedLock.student?.name} • {selectedLock.course?.name} • {selectedLock.unit?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reg No: {selectedLock.student?.regNo || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Current Attempts: {selectedLock.attemptsTaken}/{selectedLock.attemptLimit}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks Used: {selectedLock.teacherUnlockCount}/3 (exhausted)
              </Typography>
              <Typography variant="body2" gutterBottom>
                Previous Dean Unlocks: {selectedLock.deanUnlockCount}
              </Typography>

              <Alert severity="info" sx={{ my: 2 }}>
                <Typography variant="body2">
                  As Dean, you have unlimited unlock authority. This will be dean unlock #{selectedLock.deanUnlockCount + 1}.
                </Typography>
              </Alert>

              <TextField
                autoFocus
                margin="dense"
                label="Dean Authorization Reason *"
                fullWidth
                variant="outlined"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g., Appeal approved, Technical difficulties verified, Special circumstances"
                sx={{ mb: 2 }}
              />

              <TextField
                margin="dense"
                label="Dean Notes (Optional)"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                placeholder="Additional context, conditions, or instructions for the unlock..."
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)} disabled={unlocking}>
            Close
          </Button>
          {selectedLock && (
            <Button 
              variant="contained" 
              onClick={handleUnlockConfirm}
              disabled={unlocking || !unlockReason.trim()}
              startIcon={unlocking ? <CircularProgress size={20} /> : <LockResetIcon />}
              color="primary"
            >
              {unlocking ? 'Authorizing...' : 'Authorize Unlock'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Complete Unlock History</DialogTitle>
        <DialogContent dividers>
          {historyItem ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {historyItem.student?.name} • {historyItem.course?.name} • {historyItem.unit?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Locked At: {historyItem.lockedAt ? new Date(historyItem.lockedAt).toLocaleString() : '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reason: {historyItem.reason || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks: {historyItem.teacherUnlockCount}/3 (exhausted)
              </Typography>
              <Typography variant="body2" gutterBottom>
                HOD Unlocks: {historyItem.hodUnlockCount || 0}/3
              </Typography>
              <Typography variant="body2" gutterBottom>
                Dean Unlocks: {historyItem.deanUnlockCount}/3
              </Typography>
              {historyItem.unlockHistory?.admin?.length > 0 && (
                <Typography variant="body2" gutterBottom color="secondary">
                  Admin Overrides: {historyItem.unlockHistory.admin.length}
                </Typography>
              )}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>Complete Unlock History</Typography>
              
              {/* Teacher Unlocks */}
              {historyItem.unlockHistory?.teacher?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="primary">Teacher Unlocks:</Typography>
                  <List dense>
                    {historyItem.unlockHistory.teacher.map((h, i) => (
                      <ListItem key={`teacher-${i}`}>
                        <ListItemText
                          primary={`${h.teacherId?.name || 'Teacher'} - ${new Date(h.unlockTimestamp).toLocaleString()}`}
                          secondary={h.reason || h.notes || ''}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {/* HOD Unlocks */}
              {historyItem.unlockHistory?.hod?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">HOD Unlocks:</Typography>
                  <List dense>
                    {historyItem.unlockHistory.hod.map((h, i) => (
                      <ListItem key={`hod-${i}`}>
                        <ListItemText
                          primary={`${h.hodId?.name || 'HOD'} - ${new Date(h.unlockTimestamp).toLocaleString()}`}
                          secondary={h.reason || h.notes || ''}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {/* Dean Unlocks */}
              {historyItem.unlockHistory?.dean?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="error.main">Dean Unlocks:</Typography>
                  <List dense>
                    {historyItem.unlockHistory.dean.map((h, i) => (
                      <ListItem key={`dean-${i}`}>
                        <ListItemText
                          primary={`${h.deanId?.name || 'Dean'} - ${new Date(h.unlockTimestamp).toLocaleString()}`}
                          secondary={h.reason || h.notes || ''}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {/* Admin Overrides */}
              {historyItem.unlockHistory?.admin?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="secondary.main">Admin Overrides:</Typography>
                  <List dense>
                    {historyItem.unlockHistory.admin.map((h, i) => (
                      <ListItem key={`admin-${i}`}>
                        <ListItemText
                          primary={`Admin Override (${h.overrideLevel} level) - ${new Date(h.unlockTimestamp).toLocaleString()}`}
                          secondary={`${h.reason || ''} ${h.notes ? `| ${h.notes}` : ''}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {(!historyItem.unlockHistory?.teacher?.length && 
                !historyItem.unlockHistory?.hod?.length && 
                !historyItem.unlockHistory?.dean?.length && 
                !historyItem.unlockHistory?.admin?.length) && (
                <Typography variant="body2" color="text.secondary">No unlock history available.</Typography>
              )}
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

export default DeanQuizUnlockDashboard;