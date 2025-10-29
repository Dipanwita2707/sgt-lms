import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  SupervisorAccount as HODIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Groups as GroupsIcon,
  MenuBook as CourseIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  AccountBox as AccountBoxIcon,
  Class as ClassIcon,
  ManageAccounts as ManageAccountsIcon
} from '@mui/icons-material';
import axios from 'axios';

const HODProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem('token');

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setProfile(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const getRoleColor = (role) => {
    const colors = {
      student: '#4caf50',
      teacher: '#2196f3',
      hod: '#ff9800',
      dean: '#9c27b0',
      admin: '#f44336',
      cc: '#795548'
    };
    return colors[role] || '#757575';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
          My Profile
        </Typography>
        <Tooltip title="Refresh Profile">
          <IconButton 
            onClick={handleRefresh} 
            disabled={refreshing}
            sx={{ 
              backgroundColor: '#f5f5f5', 
              '&:hover': { backgroundColor: '#e0e0e0' } 
            }}
          >
            <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Basic Information Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 'fit-content', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: getRoleColor(profile?.role),
                  fontSize: '3rem'
                }}
              >
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'H'}
              </Avatar>
              
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                {profile?.name || 'N/A'}
              </Typography>
              
              <Chip 
                label={profile?.role?.toUpperCase() || 'HOD'}
                sx={{ 
                  backgroundColor: getRoleColor(profile?.role),
                  color: 'white',
                  fontWeight: 'bold',
                  mb: 2
                }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Head of Department
              </Typography>

              {profile?.createdAt && (
                <Typography variant="caption" color="text.secondary">
                  Member since {formatDate(profile.createdAt)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed Information */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {/* Contact Information */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <AccountBoxIcon sx={{ mr: 1, color: '#ff9800' }} />
                  Contact Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Email Address" 
                      secondary={profile?.email || 'Not available'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BadgeIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="UID" 
                      secondary={profile?.uid || profile?.employeeId || profile?.teacherId || 'Not assigned'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Account Created" 
                      secondary={formatDate(profile?.createdAt)} 
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            {/* Department Information */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <ManageAccountsIcon sx={{ mr: 1, color: '#ff9800' }} />
                  Department Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  {profile?.school && (
                    <ListItem>
                      <ListItemIcon>
                        <SchoolIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="School" 
                        secondary={profile.school.name || 'Not assigned'} 
                      />
                    </ListItem>
                  )}
                  {profile?.department && (
                    <ListItem>
                      <ListItemIcon>
                        <ClassIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Department" 
                        secondary={profile.department.name || 'Not assigned'} 
                      />
                    </ListItem>
                  )}
                  {profile?.managedSections && (
                    <ListItem>
                      <ListItemIcon>
                        <Groups color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Managed Sections" 
                        secondary={`${profile.managedSections.length || 0} section(s)`} 
                      />
                    </ListItem>
                  )}
                  {profile?.teachingCourses && (
                    <ListItem>
                      <ListItemIcon>
                        <MenuBook color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Teaching Courses" 
                        secondary={`${profile.teachingCourses.length || 0} course(s)`} 
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default HODProfile;