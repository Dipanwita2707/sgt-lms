import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Tooltip,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  LockOpen,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Quiz as QuizIcon,
  AccessTime,
  AdminPanelSettings as AdminPanelSettingsIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import { getAuthToken } from '../../utils/authService';

const HODQuizUnlockDashboard = ({ showAlert = () => {} }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  
  // Unlock dialog state
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockNote, setUnlockNote] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  
  // History dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  
  const token = getAuthToken();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/quiz-unlock/hod-locked-students', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setItems(response.data.data || []);
      } else {
        showAlert('Failed to fetch locked students', 'error');
      }
    } catch (error) {
      console.error('Error fetching HOD locked students:', error);
      showAlert('Error fetching data: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getFailureReasonDisplay = (reason) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(it =>
      (it.student?.name || '').toLowerCase().includes(q) ||
      (it.student?.regno || '').toLowerCase().includes(q) ||
      (it.course?.name || '').toLowerCase().includes(q) ||
      (it.quiz?.title || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleHODUnlock = async (item) => {
    const authLevel = item.lockInfo?.unlockAuthorizationLevel || 'TEACHER';
    const canHodAct = authLevel === 'HOD' && item.lockInfo?.canHodUnlock;
    
    if (!canHodAct) {
      if (authLevel === 'TEACHER') {
        showAlert('This request is at Teacher level. Teacher should handle this.', 'info');
      } else if (authLevel === 'DEAN') {
        showAlert('This request is at Dean level. Dean authorization required.', 'info');
      } else if (authLevel === 'ADMIN') {
        showAlert('This request requires Admin override. All unlock limits have been exceeded.', 'error');
      } else {
        showAlert('HOD unlock limit exceeded. Dean authorization required.', 'warning');
      }
      return;
    }
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
        `/api/quiz-unlock/hod-unlock/${selectedLock.lockId}`,
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
          `Successfully unlocked ${selectedLock.student.name} for ${selectedLock.quiz.title}`,
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

  return (
    <Box p={3}>
      <Card>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center">
              <AdminPanelSettingsIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h5" component="h1" fontWeight="bold">
                Quiz Unlock Requests - Department View
              </Typography>
              <Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchData} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          }
          subheader="Students who have exhausted teacher unlock limits and require HOD authorization."
        />
        <Divider />
        <CardContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>HOD Authority:</strong> These students have exhausted their teacher unlock limit (3 unlocks). 
              As HOD, you can unlock these students. After your unlock, any future failures will require Dean authorization.
            </Typography>
          </Alert>
          
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by student name, registration number, course, or quiz title..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="small"
            />
          </Box>
          
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Student</strong></TableCell>
                  <TableCell><strong>Course</strong></TableCell>
                  <TableCell><strong>Quiz</strong></TableCell>
                  <TableCell><strong>Failure Reason</strong></TableCell>
                  <TableCell><strong>Score</strong></TableCell>
                  <TableCell><strong>Unlock History</strong></TableCell>
                  <TableCell><strong>Current Level</strong></TableCell>
                  <TableCell><strong>Locked Since</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item) => {
                  const authLevel = item.lockInfo?.unlockAuthorizationLevel || 'TEACHER';
                  const canHodAct = authLevel === 'HOD' && item.lockInfo?.canHodUnlock;
                  
                  return (
                  <TableRow key={item.lockId} hover>
                    <TableCell>
                      {authLevel === 'TEACHER' && (
                        <Chip size="small" color="primary" label="Teacher Level" />
                      )}
                      {authLevel === 'HOD' && (
                        <Chip size="small" color="warning" label="HOD Level" />
                      )}
                      {authLevel === 'DEAN' && (
                        <Chip size="small" color="error" label="Dean Level" />
                      )}
                      {authLevel === 'ADMIN' && (
                        <Chip size="small" color="secondary" label="Admin Required" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {item.student.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.student.regno || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {item.course.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.course.code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.quiz.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getFailureReasonDisplay(item.lockInfo.reason)} 
                        size="small" 
                        color="error" 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="error">
                        {item.lockInfo.lastFailureScore}% 
                        <Typography variant="caption" display="block">
                          (Required: {item.lockInfo.passingScore}%)
                        </Typography>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="caption">
                          Teacher: {item.lockInfo?.teacherUnlockCount || 0}/3
                        </Typography>
                        <Typography variant="caption" display="block">
                          HOD: {item.lockInfo?.hodUnlockCount || 0}/3
                        </Typography>
                        <Typography variant="caption" display="block">
                          Dean: {item.lockInfo?.deanUnlockCount || 0}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {authLevel === 'TEACHER' && 'Teacher Level'}
                        {authLevel === 'HOD' && 'HOD Can Act'}
                        {authLevel === 'DEAN' && 'Dean Required'}
                        {authLevel === 'ADMIN' && 'Admin Override Required'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Level: {authLevel}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="caption">
                          {format(new Date(item.lockInfo.lockTimestamp), 'MMM dd, HH:mm')}
                        </Typography>
                        {item.lockInfo?.lastTeacherUnlock && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Last T: {format(new Date(item.lockInfo.lastTeacherUnlock), 'MMM dd, HH:mm')}
                          </Typography>
                        )}
                        {item.lockInfo?.lastHodUnlock && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Last H: {format(new Date(item.lockInfo.lastHodUnlock), 'MMM dd, HH:mm')}
                          </Typography>
                        )}
                        {item.lockInfo?.lastDeanUnlock && (
                          <Typography variant="caption" display="block" color="warning.main">
                            Last D: {format(new Date(item.lockInfo.lastDeanUnlock), 'MMM dd, HH:mm')}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {canHodAct ? (
                          <Tooltip title="HOD Unlock">
                            <Button
                              variant="contained"
                              color="warning"
                              size="small"
                              startIcon={<LockOpen />}
                              onClick={() => handleHODUnlock(item)}
                            >
                              Unlock ({item.lockInfo?.remainingHodUnlocks || 0})
                            </Button>
                          </Tooltip>
                        ) : (
                          <Chip 
                            size="small" 
                            label={
                              authLevel === 'TEACHER' ? 'Teacher Level' : 
                              authLevel === 'DEAN' ? 'At Dean Level' : 
                              authLevel === 'ADMIN' ? 'Admin Override Required' :
                              'H-Limit Reached'
                            }
                            color={
                              authLevel === 'TEACHER' ? 'primary' : 
                              authLevel === 'DEAN' ? 'error' : 
                              authLevel === 'ADMIN' ? 'secondary' :
                              'default'
                            }
                          />
                        )}
                        
                        <Tooltip title="View History">
                          <IconButton
                            size="small"
                            onClick={() => { setHistoryItem(item); setHistoryOpen(true); }}
                          >
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No HOD unlock requests.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* HOD Unlock Confirmation Dialog */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AdminPanelSettingsIcon sx={{ mr: 1, color: 'warning.main' }} />
            HOD Authorization - Unlock Quiz
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLock ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>HOD Authority Required:</strong> This student has exhausted all teacher unlock attempts.
                  Your authorization will grant them access to retake the quiz. After this unlock, any future failures will require Dean approval.
                </Typography>
              </Alert>

              <Typography variant="subtitle2" gutterBottom>
                {selectedLock.student?.name} • {selectedLock.course?.name} • {selectedLock.quiz?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reg No: {selectedLock.student?.regno || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Current Attempts: {selectedLock.lockInfo?.totalAttempts}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks Used: {selectedLock.lockInfo?.teacherUnlockCount}/3 (exhausted)
              </Typography>
              <Typography variant="body2" gutterBottom>
                Last Score: {selectedLock.lockInfo?.lastFailureScore}% (Required: {selectedLock.lockInfo?.passingScore}%)
              </Typography>

              <TextField
                autoFocus
                margin="dense"
                label="Unlock Reason"
                fullWidth
                variant="outlined"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g., Technical issues, Special circumstances, etc."
                required
                sx={{ mt: 3 }}
              />
              
              <TextField
                margin="dense"
                label="Additional Notes (Optional)"
                fullWidth
                variant="outlined"
                multiline
                rows={3}
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                placeholder="Any additional context or instructions..."
              />
            </Box>
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUnlockConfirm} 
            variant="contained" 
            color="warning"
            disabled={unlocking || !unlockReason.trim()}
            startIcon={unlocking ? <CircularProgress size={16} /> : <LockOpen />}
          >
            {unlocking ? 'Unlocking...' : 'Authorize Unlock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Unlock History - {historyItem?.student?.name}
        </DialogTitle>
        <DialogContent dividers>
          {historyItem && (
            <Box>
              <Typography variant="h6" gutterBottom>Quiz: {historyItem.quiz?.title}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Course: {historyItem.course?.name} ({historyItem.course?.code})
              </Typography>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Teacher Unlocks ({historyItem.lockInfo?.teacherUnlockCount})</Typography>
              {historyItem.teacherUnlockHistory && historyItem.teacherUnlockHistory.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Teacher</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyItem.teacherUnlockHistory.map((unlock, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(new Date(unlock.unlockTimestamp), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{unlock.teacherId?.name || 'Unknown'}</TableCell>
                        <TableCell>{unlock.reason}</TableCell>
                        <TableCell>{unlock.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">No teacher unlocks recorded.</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HODQuizUnlockDashboard;