import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Grid,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Badge,
  Snackbar
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Simple date formatting function
const formatDistanceToNow = (date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return new Date(date).toLocaleDateString();
};

const HODApprovalDashboard = () => {
  const [pendingAnnouncements, setPendingAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchPendingAnnouncements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/announcements/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingAnnouncements(data.announcements);
      } else {
        console.error('Failed to fetch pending announcements');
        showSnackbar('Failed to fetch pending announcements', 'error');
      }
    } catch (error) {
      console.error('Error fetching pending announcements:', error);
      showSnackbar('Error fetching announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAnnouncements();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleReview = (announcement, action) => {
    setSelectedAnnouncement({ ...announcement, action });
    setApprovalNote('');
    setReviewDialog(true);
  };

  const submitReview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/announcements/${selectedAnnouncement._id}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: selectedAnnouncement.action,
          note: approvalNote
        })
      });

      if (response.ok) {
        const data = await response.json();
        showSnackbar(data.message, 'success');
        setReviewDialog(false);
        fetchPendingAnnouncements(); // Refresh the list
      } else {
        const error = await response.json();
        showSnackbar(error.message || 'Failed to process approval', 'error');
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      showSnackbar('Error processing approval', 'error');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'primary';
    }
  };

  const formatTargetSections = (announcement) => {
    if (announcement.targetAudience?.targetSections?.length > 0) {
      return announcement.targetAudience.targetSections.map(section => section.name).join(', ');
    }
    return 'No specific sections';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Teacher Announcement Approvals
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={pendingAnnouncements.length} color="error">
            <Typography variant="body2" color="text.secondary">
              Pending Reviews
            </Typography>
          </Badge>
          <IconButton onClick={fetchPendingAnnouncements} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <Typography>Loading pending announcements...</Typography>
      ) : pendingAnnouncements.length === 0 ? (
        <Alert severity="info">
          No announcements pending approval. All teacher announcements have been reviewed.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {pendingAnnouncements.map((announcement) => (
            <Grid item xs={12} key={announcement._id}>
              <Card sx={{ border: '1px solid', borderColor: 'warning.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {announcement.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          By: {announcement.sender?.name}
                        </Typography>
                        <ScheduleIcon fontSize="small" color="action" sx={{ ml: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Chip 
                          label={announcement.priority?.toUpperCase()} 
                          color={getPriorityColor(announcement.priority)}
                          size="small"
                        />
                        <Chip 
                          label="Pending Approval" 
                          color="warning"
                          size="small"
                        />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => handleReview(announcement, 'approve')}
                        size="small"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => handleReview(announcement, 'reject')}
                        size="small"
                      >
                        Reject
                      </Button>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body1" paragraph>
                    {announcement.message}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <ClassIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Target Sections:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatTargetSections(announcement)}
                    </Typography>
                  </Box>

                  {announcement.scheduledFor && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        <ScheduleIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Scheduled For:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(announcement.scheduledFor).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedAnnouncement?.action === 'approve' ? 'Approve Announcement' : 'Reject Announcement'}
        </DialogTitle>
        <DialogContent>
          {selectedAnnouncement && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedAnnouncement.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                By: {selectedAnnouncement.sender?.name}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedAnnouncement.message}
              </Typography>
              
              <TextField
                label={selectedAnnouncement.action === 'approve' ? 'Approval Note (Optional)' : 'Rejection Reason'}
                multiline
                rows={3}
                fullWidth
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder={
                  selectedAnnouncement.action === 'approve' 
                    ? 'Add any comments about this approval...'
                    : 'Please provide a reason for rejection...'
                }
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={submitReview}
            variant="contained"
            color={selectedAnnouncement?.action === 'approve' ? 'success' : 'error'}
          >
            {selectedAnnouncement?.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HODApprovalDashboard;