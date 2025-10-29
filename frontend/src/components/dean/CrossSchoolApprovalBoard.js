import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Avatar,
  Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Announcement as AnnouncementIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import axios from 'axios';

const CrossSchoolApprovalBoard = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvalDialog, setApprovalDialog] = useState({
    open: false,
    announcement: null,
    action: null
  });
  const [approvalNote, setApprovalNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/announcements/pending-cross-school', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      showSnackbar('Error loading pending requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = (announcement, action) => {
    setApprovalDialog({
      open: true,
      announcement,
      action
    });
    setApprovalNote('');
  };

  const submitApproval = async () => {
    try {
      setProcessing(true);
      await axios.patch(`/api/announcements/${approvalDialog.announcement._id}/cross-school-approve`, {
        action: approvalDialog.action,
        approvalNote: approvalNote.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSnackbar(
        `Announcement ${approvalDialog.action}d successfully`, 
        'success'
      );
      
      setApprovalDialog({ open: false, announcement: null, action: null });
      setApprovalNote('');
      fetchPendingRequests(); // Refresh the list
    } catch (error) {
      console.error('Error processing approval:', error);
      showSnackbar(
        error.response?.data?.message || 'Error processing request', 
        'error'
      );
    } finally {
      setProcessing(false);
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTargetingDescription = (announcement) => {
    const { targetAudience } = announcement;
    let description = [];

    if (targetAudience.targetDepartments?.length > 0) {
      description.push(`${targetAudience.targetDepartments.length} department(s)`);
    }
    if (targetAudience.targetSections?.length > 0) {
      description.push(`${targetAudience.targetSections.length} section(s)`);
    }
    if (targetAudience.targetRoles?.length > 0) {
      description.push(`Roles: ${targetAudience.targetRoles.join(', ')}`);
    }

    return description.length > 0 ? description.join(' • ') : 'All users in school';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
          <AnnouncementIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Cross-School Announcement Approvals
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and approve announcement requests from other school deans
        </Typography>
      </Box>

      {/* Pending Requests */}
      {pendingRequests.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <AnnouncementIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Pending Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You don't have any cross-school announcement requests awaiting approval.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {pendingRequests.map((announcement) => (
            <Grid item xs={12} key={announcement._id}>
              <Card sx={{ 
                border: '2px solid',
                borderColor: 'warning.light',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {announcement.title}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {announcement.sender.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {announcement.sender.email}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Divider orientation="vertical" flexItem />
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SchoolIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {announcement.originalRequestedSchool?.name}
                          </Typography>
                        </Box>
                        
                        <Divider orientation="vertical" flexItem />
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(announcement.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    <Chip 
                      label="Pending Approval" 
                      color="warning" 
                      variant="outlined"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>

                  {/* Message */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ 
                      backgroundColor: 'grey.50', 
                      p: 2, 
                      borderRadius: 1,
                      borderLeft: 4,
                      borderLeftColor: 'primary.main'
                    }}>
                      {announcement.message}
                    </Typography>
                  </Box>

                  {/* Targeting Info */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Target Audience:
                    </Typography>
                    <Alert severity="info" sx={{ backgroundColor: 'info.50' }}>
                      <Typography variant="body2">
                        {getTargetingDescription(announcement)}
                      </Typography>
                    </Alert>
                  </Box>

                  {/* Priority */}
                  <Box sx={{ mb: 3 }}>
                    <Chip 
                      label={`Priority: ${announcement.priority?.toUpperCase() || 'NORMAL'}`}
                      color={announcement.priority === 'high' ? 'error' : 
                             announcement.priority === 'urgent' ? 'error' : 'default'}
                      size="small"
                    />
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ApproveIcon />}
                      onClick={() => handleApprovalAction(announcement, 'approve')}
                      sx={{ minWidth: 120 }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={() => handleApprovalAction(announcement, 'reject')}
                      sx={{ minWidth: 120 }}
                    >
                      Reject
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Approval Dialog */}
      <Dialog 
        open={approvalDialog.open} 
        onClose={() => setApprovalDialog({ open: false, announcement: null, action: null })}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'} Announcement
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Title:</strong> {approvalDialog.announcement?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>From:</strong> {approvalDialog.announcement?.sender?.name} 
              ({approvalDialog.announcement?.sender?.email})
            </Typography>
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label={`${approvalDialog.action === 'approve' ? 'Approval' : 'Rejection'} Note (Optional)`}
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            placeholder={`Add a note explaining your ${approvalDialog.action} decision...`}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setApprovalDialog({ open: false, announcement: null, action: null })}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button 
            onClick={submitApproval}
            variant="contained"
            color={approvalDialog.action === 'approve' ? 'success' : 'error'}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : 
                       (approvalDialog.action === 'approve' ? <ApproveIcon /> : <RejectIcon />)}
          >
            {processing ? 'Processing...' : 
             (approvalDialog.action === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CrossSchoolApprovalBoard;