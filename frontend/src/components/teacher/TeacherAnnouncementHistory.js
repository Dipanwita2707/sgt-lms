import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Tab,
  Tabs,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Avatar
} from '@mui/material';
import {
  History as HistoryIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Pending as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Message as MessageIcon,
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

const TeacherAnnouncementHistory = ({ token }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [viewDialog, setViewDialog] = useState({
    open: false,
    announcement: null
  });

  useEffect(() => {
    fetchAnnouncementHistory();
  }, []);

  const fetchAnnouncementHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/teacher/announcements/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (err) {
      console.error('Error fetching announcement history:', err);
      setError(err.response?.data?.message || 'Failed to load announcement history');
    } finally {
      setLoading(false);
    }
  };

  const openViewDialog = (announcement) => {
    setViewDialog({
      open: true,
      announcement
    });
  };

  const closeViewDialog = () => {
    setViewDialog({
      open: false,
      announcement: null
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <ApprovedIcon color="success" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusChip = (status) => {
    const colors = {
      approved: 'success',
      rejected: 'error',
      pending: 'warning'
    };
    
    const labels = {
      approved: 'Approved',
      rejected: 'Rejected',
      pending: 'Pending Approval'
    };

    return (
      <Chip
        icon={getStatusIcon(status)}
        label={labels[status] || status}
        color={colors[status] || 'default'}
        size="small"
      />
    );
  };

  const getFilteredAnnouncements = () => {
    if (!history) return [];
    
    switch (selectedTab) {
      case 0: // All
        return history.announcements;
      case 1: // Pending
        return history.announcements.filter(a => a.status === 'pending');
      case 2: // Approved
        return history.announcements.filter(a => a.status === 'approved');
      case 3: // Rejected
        return history.announcements.filter(a => a.status === 'rejected');
      default:
        return history.announcements;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Announcement History...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  const filteredAnnouncements = getFilteredAnnouncements();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <HistoryIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Announcement History
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                <AssignmentIcon />
              </Avatar>
              <Typography variant="h4" fontWeight="bold">
                {history?.totalCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Announcements
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                <ApprovedIcon />
              </Avatar>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {history?.approvedCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
                <PendingIcon />
              </Avatar>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {history?.pendingCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'error.main', mx: 'auto', mb: 1 }}>
                <RejectedIcon />
              </Avatar>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {history?.rejectedCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rejected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            label={
              <Badge badgeContent={history?.totalCount} color="info">
                All
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={history?.pendingCount} color="warning">
                Pending
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={history?.approvedCount} color="success">
                Approved
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={history?.rejectedCount} color="error">
                Rejected
              </Badge>
            } 
          />
        </Tabs>
      </Card>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <AssignmentIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Announcements Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedTab === 0 
                ? 'You haven\'t created any announcements yet.'
                : `No ${['all', 'pending', 'approved', 'rejected'][selectedTab]} announcements found.`
              }
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredAnnouncements.map((announcement) => (
            <Grid item xs={12} key={announcement.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      {announcement.title}
                    </Typography>
                    {getStatusChip(announcement.status)}
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 2
                    }}
                  >
                    {announcement.message}
                  </Typography>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" gap={2}>
                      <Chip 
                        icon={<SchoolIcon />}
                        label={`${announcement.targetSections.length} sections`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        icon={<TimeIcon />}
                        label={formatDistanceToNow(new Date(announcement.submittedAt), { addSuffix: true })}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => openViewDialog(announcement)}
                    >
                      View Details
                    </Button>
                  </Box>

                  {announcement.approvalNote && (
                    <Alert 
                      severity={announcement.status === 'approved' ? 'success' : 'error'} 
                      sx={{ mt: 2 }}
                    >
                      <strong>HOD Note:</strong> {announcement.approvalNote}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialog.open} 
        onClose={closeViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Announcement Details</Typography>
          <IconButton onClick={closeViewDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {viewDialog.announcement && (
            <Box>
              {/* Status */}
              <Box display="flex" alignItems="center" mb={3}>
                <Typography variant="subtitle1" sx={{ mr: 2 }}>Status:</Typography>
                {getStatusChip(viewDialog.announcement.status)}
              </Box>

              {/* Title */}
              <Typography variant="h6" gutterBottom>
                {viewDialog.announcement.title}
              </Typography>

              {/* Message */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                  {viewDialog.announcement.message}
                </Typography>
              </Paper>

              {/* Target Sections */}
              <Typography variant="subtitle1" gutterBottom>
                Target Sections:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                {viewDialog.announcement.targetSections.map((section, index) => (
                  <Chip key={index} label={section} variant="outlined" />
                ))}
              </Box>

              {/* Submission Details */}
              <Typography variant="subtitle1" gutterBottom>
                Submission Details:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <TimeIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Submitted"
                    secondary={formatDistanceToNow(new Date(viewDialog.announcement.submittedAt), { addSuffix: true })}
                  />
                </ListItem>
                
                {viewDialog.announcement.approvedBy && (
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Reviewed By"
                      secondary={`${viewDialog.announcement.approvedBy.name} (${viewDialog.announcement.approvedBy.email})`}
                    />
                  </ListItem>
                )}
                
                <ListItem>
                  <ListItemIcon>
                    <ViewIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Visibility Status"
                    secondary={viewDialog.announcement.isVisible ? 'Visible to students' : 'Not visible to students'}
                  />
                </ListItem>
              </List>

              {/* Approval Note */}
              {viewDialog.announcement.approvalNote && (
                <Alert 
                  severity={viewDialog.announcement.status === 'approved' ? 'success' : 'error'} 
                  sx={{ mt: 2 }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    HOD's Note:
                  </Typography>
                  {viewDialog.announcement.approvalNote}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={closeViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherAnnouncementHistory;