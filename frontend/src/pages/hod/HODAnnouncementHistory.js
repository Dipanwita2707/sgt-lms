import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, CircularProgress, Grid, Tab, Tabs, Alert } from '@mui/material';
import { CheckCircle as ApproveIcon, Cancel as RejectIcon, History as HistoryIcon } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const HODApprovalHistory = ({ token }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [myApprovals, setMyApprovals] = useState([]);
  const [myAnnouncements, setMyAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const approvalsRes = await axios.get('/api/announcements/my-approvals/history', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMyApprovals(approvalsRes.data.approvalHistory || []);
      
      const announcementsRes = await axios.get('/api/announcements', { 
        params: { activeRole: 'hod' }, 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMyAnnouncements(announcementsRes.data.announcements || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => { 
    setActiveTab(newValue); 
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const approvedCount = myApprovals.filter(a => 
    a.myApprovals?.some(approval => approval.action === 'approved')
  ).length;
  
  const rejectedCount = myApprovals.filter(a => 
    a.myApprovals?.some(approval => approval.action === 'rejected')
  ).length;
  
  const myApprovedAnnouncements = myAnnouncements.filter(a => 
    a.approvalStatus === 'approved'
  ).length;
  
  const myPendingAnnouncements = myAnnouncements.filter(a => 
    a.approvalStatus === 'pending'
  ).length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <HistoryIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Announcement History
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View your announcements and teacher approvals
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="My Approvals" />
          <Tab label="My Announcements" />
        </Tabs>
      </Box>
      
      {activeTab === 0 && (
        <Box>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography variant="h6" color="success.dark">
                    <ApproveIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Approved
                  </Typography>
                  <Typography variant="h3" color="success.dark">
                    {approvedCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent>
                  <Typography variant="h6" color="error.dark">
                    <RejectIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Rejected
                  </Typography>
                  <Typography variant="h3" color="error.dark">
                    {rejectedCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'info.light' }}>
                <CardContent>
                  <Typography variant="h6" color="info.dark">
                    <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Total Reviews
                  </Typography>
                  <Typography variant="h3" color="info.dark">
                    {myApprovals.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {myApprovals.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <HistoryIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Approval History
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You haven't reviewed any teacher announcements yet.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {myApprovals.map((item) => (
                <Grid item xs={12} key={item._id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold">
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        From: {item.sender?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 2, mb: 2 }}>
                        {item.message}
                      </Typography>
                      {item.myApprovals?.map((approval, idx) => (
                        <Chip 
                          key={idx}
                          icon={approval.action === 'approved' ? <ApproveIcon /> : <RejectIcon />}
                          label={`${approval.action.toUpperCase()} on ${format(new Date(approval.actionDate), 'MMM dd, yyyy HH:mm')}`}
                          color={approval.action === 'approved' ? 'success' : 'error'}
                          sx={{ mr: 1 }}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography variant="h6" color="success.dark">
                    Approved
                  </Typography>
                  <Typography variant="h3" color="success.dark">
                    {myApprovedAnnouncements}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent>
                  <Typography variant="h6" color="warning.dark">
                    Pending
                  </Typography>
                  <Typography variant="h3" color="warning.dark">
                    {myPendingAnnouncements}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'info.light' }}>
                <CardContent>
                  <Typography variant="h6" color="info.dark">
                    Total
                  </Typography>
                  <Typography variant="h3" color="info.dark">
                    {myAnnouncements.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {myAnnouncements.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <HistoryIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Announcements
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You haven't created any announcements yet.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {myAnnouncements.map((item) => (
                <Grid item xs={12} key={item._id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight="bold">
                          {item.title}
                        </Typography>
                        <Chip 
                          label={item.approvalStatus.toUpperCase()} 
                          color={
                            item.approvalStatus === 'approved' ? 'success' : 
                            item.approvalStatus === 'pending' ? 'warning' : 
                            'error'
                          } 
                        />
                      </Box>
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        {item.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Created: {format(new Date(item.createdAt), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default HODApprovalHistory;