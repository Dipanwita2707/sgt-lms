import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  LinearProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import {
  Lock,
  Person,
  Quiz,
  School,
  ContactSupport,
  Info,
  Warning,
  CheckCircle,
  AccessTime,
  SupervisorAccount,
  AdminPanelSettings,
  Business
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const QuizLockStatus = ({ quizId, studentId, onUnlockUpdate }) => {
  const [lockStatus, setLockStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  useEffect(() => {
    if (quizId && studentId) {
      fetchLockStatus();
    }
  }, [quizId, studentId]);

  const fetchLockStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/quiz-unlock/lock-status/${studentId}/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setLockStatus(response.data);
        if (onUnlockUpdate && !response.data.isLocked) {
          onUnlockUpdate(false);
        }
      } else {
        setError('Error fetching lock status');
      }
    } catch (error) {
      console.error('Error fetching lock status:', error);
      setError('Error fetching lock status');
    } finally {
      setLoading(false);
    }
  };

  const getAuthorizationIcon = (level) => {
    switch (level) {
      case 'DEAN':
        return <AdminPanelSettings />;
      case 'HOD':
        return <Business />;
      case 'TEACHER':
      default:
        return <SupervisorAccount />;
    }
  };

  const getAuthorizationColor = (level) => {
    switch (level) {
      case 'DEAN':
        return 'error';
      case 'HOD':
        return 'warning';
      case 'TEACHER':
      default:
        return 'info';
    }
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

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'BELOW_PASSING_SCORE':
        return 'error';
      case 'SECURITY_VIOLATION':
        return 'warning';
      case 'TIME_EXCEEDED':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <LinearProgress sx={{ width: '100%' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={fetchLockStatus} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!lockStatus || !lockStatus.isLocked) {
    return null; // Not locked, don't show anything
  }

  const { data } = lockStatus;

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Card elevation={4} sx={{ border: '2px solid #d32f2f', backgroundColor: '#fef7f7' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Lock color="error" sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h5" color="error.main" fontWeight="bold">
                Quiz Locked
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                This quiz is currently locked and unavailable
              </Typography>
            </Box>
          </Box>

          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold">
              Your quiz access has been restricted due to: {getReasonText(data.reason)}
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📊 Quiz Performance
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Your Score
                </Typography>
                <Typography variant="h6" color="error.main">
                  {data.lastFailureScore}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Passing Score
                </Typography>
                <Typography variant="h6" color="success.main">
                  {data.passingScore}%
                </Typography>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Performance Gap
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(data.lastFailureScore / data.passingScore) * 100}
                color="error"
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary">
                {data.passingScore - data.lastFailureScore}% below passing threshold
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🔓 Unlock Information
            </Typography>
            
            <Box display="flex" alignItems="center" mb={2}>
              {getAuthorizationIcon(data.unlockAuthorizationLevel)}
              <Typography variant="body1" sx={{ ml: 1 }}>
                <strong>Authorization Required:</strong> {data.unlockAuthorizationLevel}
              </Typography>
            </Box>

            {data.unlockAuthorizationLevel === 'TEACHER' ? (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Teacher Unlock Status
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      Unlocks Used: {data.teacherUnlockCount}/3
                    </Typography>
                    <Typography variant="body2" color="primary.main">
                      {data.remainingTeacherUnlocks} remaining
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(data.teacherUnlockCount / 3) * 100}
                    color={data.teacherUnlockCount >= 3 ? 'error' : 'primary'}
                    sx={{ height: 6, borderRadius: 3, mt: 1 }}
                  />
                </Box>
                
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Contact your teacher</strong> to request an unlock. Your teacher can unlock this quiz 
                    {data.remainingTeacherUnlocks > 0 ? ` ${data.remainingTeacherUnlocks} more time${data.remainingTeacherUnlocks > 1 ? 's' : ''}` : ' no more times'}.
                    {data.remainingTeacherUnlocks === 0 && ' Further unlocks require HOD authorization.'}
                  </Typography>
                </Alert>
              </Box>
            ) : data.unlockAuthorizationLevel === 'HOD' ? (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Teacher unlock limit exceeded.</strong> All {data.teacherUnlockCount} teacher unlocks have been used.
                  </Typography>
                </Alert>
                
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>HOD authorization required.</strong> Please contact your Head of Department 
                    for approval to unlock this quiz.
                  </Typography>
                </Alert>
              </Box>
            ) : (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>HOD unlock used.</strong> The department head has already approved an unlock for this quiz.
                  </Typography>
                </Alert>
                
                <Alert severity="error">
                  <Typography variant="body2">
                    <strong>Dean authorization required.</strong> Please contact the academic dean or administrator 
                    for special permission to unlock this quiz.
                  </Typography>
                </Alert>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <AccessTime fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Locked Since: {format(new Date(data.lockTimestamp), 'MMM dd, yyyy HH:mm')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Attempts: {data.totalAttempts}
            </Typography>
          </Box>

          <Box display="flex" gap={2} justifyContent="center">
            <Button
              variant="outlined"
              startIcon={<ContactSupport />}
              onClick={() => setHelpDialogOpen(true)}
            >
              Get Help
            </Button>
            <Button
              variant="contained"
              onClick={fetchLockStatus}
              disabled={loading}
            >
              Check Status
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <ContactSupport sx={{ mr: 1 }} />
            How to Get Your Quiz Unlocked
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box>
            <Typography variant="h6" gutterBottom>
              📧 Contact Information
            </Typography>
            
            {data.unlockAuthorizationLevel === 'TEACHER' ? (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Your teacher can unlock this quiz</strong> ({data.remainingTeacherUnlocks} unlock{data.remainingTeacherUnlocks !== 1 ? 's' : ''} remaining)
                  </Typography>
                </Alert>
                
                <Typography variant="body2" paragraph>
                  <strong>Steps to request unlock:</strong>
                </Typography>
                <Typography variant="body2" component="div">
                  1. Contact your course teacher via email or during office hours<br/>
                  2. Explain the circumstances that led to the quiz failure<br/>
                  3. Provide any supporting documentation if applicable<br/>
                  4. Wait for teacher approval and unlock
                </Typography>
              </Box>
            ) : data.unlockAuthorizationLevel === 'HOD' ? (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>HOD authorization required</strong> (Teacher unlock limit exceeded)
                  </Typography>
                </Alert>
                
                <Typography variant="body2" paragraph>
                  <strong>Steps to request HOD unlock:</strong>
                </Typography>
                <Typography variant="body2" component="div">
                  1. Contact your course teacher first to get their recommendation<br/>
                  2. Submit a formal appeal to your Head of Department<br/>
                  3. Include teacher's recommendation and supporting documentation<br/>
                  4. Wait for HOD's review and decision
                </Typography>
              </Box>
            ) : (
              <Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Dean authorization required</strong> (HOD unlock limit exceeded)
                  </Typography>
                </Alert>
                
                <Typography variant="body2" paragraph>
                  <strong>Steps to request dean unlock:</strong>
                </Typography>
                <Typography variant="body2" component="div">
                  1. Contact your course teacher and HOD first to get their recommendations<br/>
                  2. Submit a formal appeal to the academic dean<br/>
                  3. Include teacher's and HOD's recommendations with supporting documentation<br/>
                  4. Wait for dean's review and final decision
                </Typography>
              </Box>
            )}

            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
              📋 What to Include in Your Request
            </Typography>
            <Typography variant="body2" component="div">
              • Student ID and full name<br/>
              • Course name and quiz title<br/>
              • Reason for quiz failure<br/>
              • Any technical issues encountered<br/>
              • Supporting documentation (if any)<br/>
              • Request for specific accommodations
            </Typography>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Unlock requests are subject to academic policies and instructor discretion.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizLockStatus;