import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  AccessTime as TimeIcon,
  Message as MessageIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import axios from 'axios';

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

const HODAnnouncementApproval = ({ token }) => {
  const [pendingAnnouncements, setPendingAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    announcement: null,
    action: null
  });
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState(null);

  useEffect(() => {
    fetchPendingAnnouncements();
  }, []);

  const fetchPendingAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/announcements/pending-approvals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingAnnouncements(response.data.announcements || []);
    } catch (err) {
      console.error('Error fetching pending announcements:', err);
      setError(err.response?.data?.message || 'Failed to load pending announcements');
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (announcement, action) => {
    setReviewDialog({
      open: true,
      announcement,
      action
    });
    setReviewNote('');
  };

  const closeReviewDialog = () => {
    setReviewDialog({
      open: false,
      announcement: null,
      action: null
    });
    setReviewNote('');
  };

  const handleReview = async () => {
    if (!reviewDialog.announcement || !reviewDialog.action) return;

    try {
      setSubmitting(true);
      
      await axios.patch(
        `/api/announcements/${reviewDialog.announcement._id}/approve`,
        {
          action: reviewDialog.action,
          note: reviewNote
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove the reviewed announcement from the list
      setPendingAnnouncements(prev => 
        prev.filter(a => a._id !== reviewDialog.announcement._id)
      );

      closeReviewDialog();
    } catch (err) {
      console.error('Error reviewing announcement:', err);
      setError(err.response?.data?.message || 'Failed to review announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Pending Announcements...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <AssignmentIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Announcement Requests & Approvals
        </Typography>
        <Badge 
          badgeContent={pendingAnnouncements.length} 
          color="error" 
          sx={{ ml: 2 }}
        >
          <Chip 
            label={`${pendingAnnouncements.length} Pending`} 
            color="warning" 
            variant="outlined"
          />
        </Badge>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {pendingAnnouncements.length === 0 ? (
          <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ApproveIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Pending Announcements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All teacher announcements have been reviewed. Check back later for new requests.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {pendingAnnouncements.map((announcement) => (
            <Grid item xs={12} key={announcement._id}>
              <Accordion 
                expanded={expandedPanel === announcement._id}
                onChange={handlePanelChange(announcement._id)}
                sx={{ 
                  border: '1px solid',
                  borderColor: 'warning.main',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ 
                    bgcolor: 'warning.light',
                    '&.Mui-expanded': { bgcolor: 'warning.main' }
                  }}
                >
                  <Box display="flex" alignItems="center" width="100%">
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box flexGrow={1}>
                      <Typography variant="h6" fontWeight="bold">
                        {announcement.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        From: {announcement.sender.name} ({announcement.sender.email})
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        icon={<TimeIcon />}
                        label={formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                        size="small"
                        color="warning"
                      />
                      <Chip 
                        icon={<SchoolIcon />}
                        label={`${announcement.targetAudience.targetSections.length} sections`}
                        size="small"
                        color="info"
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  <Box sx={{ p: 2 }}>
                    {/* Message Content */}
                    <Box mb={3}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        <MessageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Message Content
                      </Typography>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                            {announcement.message}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>

                    {/* Target Sections */}
                    <Box mb={3}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Target Sections
                      </Typography>
                      <List dense>
                        {announcement.targetAudience.targetSections.map((section) => (
                          <ListItem key={section._id}>
                            <ListItemIcon>
                              <SchoolIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={section.name}
                              secondary={`Department: ${section.department?.name || 'N/A'}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Action Buttons */}
                    <Box display="flex" gap={2} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => openReviewDialog(announcement, 'reject')}
                        size="large"
                      >
                        Disapprove
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => openReviewDialog(announcement, 'approve')}
                        size="large"
                      >
                        Approve
                      </Button>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Review Dialog */}
      <Dialog 
        open={reviewDialog.open} 
        onClose={closeReviewDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          bgcolor: reviewDialog.action === 'approve' ? 'success.light' : 'error.light'
        }}>
          <WarningIcon sx={{ mr: 2 }} />
          Are you sure you want to {reviewDialog.action} this announcement?
        </DialogTitle>
        
        <DialogContent>
          {reviewDialog.announcement && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Announcement:</strong> {reviewDialog.announcement.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>From:</strong> {reviewDialog.announcement.sender.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Sections:</strong> {reviewDialog.announcement.targetAudience.targetSections.length} sections
              </Typography>
              
              <Box mt={3}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={`${reviewDialog.action === 'approve' ? 'Approval' : 'Rejection'} Note (Optional)`}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={`Add a note about your ${reviewDialog.action} decision...`}
                />
              </Box>

              <Alert 
                severity={reviewDialog.action === 'approve' ? 'success' : 'warning'} 
                sx={{ mt: 2 }}
              >
                {reviewDialog.action === 'approve' 
                  ? 'This announcement will be visible to students in the target sections immediately after approval.'
                  : 'This announcement will NOT be visible to students and the teacher will be notified of the rejection.'
                }
              </Alert>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={closeReviewDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleReview}
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Processing...' : `Confirm ${reviewDialog.action}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HODAnnouncementApproval;