import React, { useState, useEffect, useCallback } from 'react';
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
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  SupervisorAccount as HODIcon,
  AccountBalance as DeanIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Groups as GroupsIcon,
  MenuBook as CourseIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const TeacherProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem('token');

  const fetchProfile = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
        // Clear any cached profile data from localStorage
        localStorage.removeItem('teacherProfile');
        localStorage.removeItem('profileCache');
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Very aggressive cache-busting to ensure fresh data
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const response = await axios.get(`/api/teacher/profile?_t=${timestamp}&_r=${randomId}&_force=${isManualRefresh ? 1 : 0}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'If-Modified-Since': 'Mon, 26 Jul 1997 05:00:00 GMT',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': isManualRefresh ? '1' : '0'
        }
      });
      
      setProfile(response.data);
      console.log('🔍 TeacherProfile: Fresh data received:', response.data);
      console.log('📊 Statistics breakdown:', {
        totalSections: response.data?.statistics?.totalSections,
        totalStudents: response.data?.statistics?.totalStudents,
        directStudents: response.data?.statistics?.directStudents,
        coordinatedStudents: response.data?.statistics?.coordinatedStudents,
        coordinatedCoursesCount: response.data?.statistics?.coordinatedCoursesCount
      });
      console.log('📚 Assigned sections:', response.data?.assignedSections?.length);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Fetch profile on component mount and when token changes
  useEffect(() => {
    if (token) {
      // Set loading state instead of clearing profile
      setLoading(true);
      setError(null);
      fetchProfile();
    }
  }, [token, fetchProfile]);

  // Force refresh when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        console.log('Page became visible, forcing profile refresh...');
        setLoading(true); // Set loading state instead of clearing profile
        fetchProfile();
      }
    };

    // Also listen for focus events
    const handleFocus = () => {
      if (token) {
        console.log('Window focused, refreshing profile...');
        setProfile(null);
        fetchProfile();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchProfile, token]);

  const handleManualRefresh = () => {
    setLoading(true); // Set loading state instead of clearing profile
    setError(null);
    
    // Clear all possible cached data
    localStorage.removeItem('teacherProfile');
    localStorage.removeItem('profileCache');
    sessionStorage.clear();
    
    // Clear axios cache if it exists
    if (axios.defaults.cache) {
      axios.defaults.cache.clear();
    }
    
    fetchProfile(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading || !profile) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Profile...</Typography>
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

  // Additional safety check for profile structure
  if (!profile.personalInfo) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Profile Data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Cache refresh notice */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Tip:</strong> If you see outdated data, click "Refresh" below or press Ctrl+F5 to force reload the page.
        </Typography>
      </Alert>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Teacher Profile
        </Typography>
        <Tooltip title="Force refresh profile data and clear cache">
          <Button
            variant="contained"
            color="primary"
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            sx={{ minWidth: 150 }}
          >
            {refreshing ? 'Refreshing...' : 'Force Refresh'}
          </Button>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Personal Information Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
                  <PersonIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {profile.personalInfo.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teacher
                  </Typography>
                </Box>
              </Box>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={profile.personalInfo.email}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="UID"
                    secondary={profile.personalInfo.uid || profile.personalInfo.teacherId || 'Not Assigned'}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Join Date"
                    secondary={formatDate(profile.personalInfo.joinDate)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Department & Hierarchy Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SchoolIcon sx={{ mr: 1 }} />
                Department & Hierarchy
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <SchoolIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="School"
                    secondary={profile.school.name}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <SchoolIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Department"
                    secondary={profile.department.name}
                  />
                </ListItem>

                <Divider sx={{ my: 1 }} />

                <ListItem>
                  <ListItemIcon>
                    <HODIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Head of Department (HOD)"
                    secondary={
                      profile.hod ? (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {profile.hod.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {profile.hod.email}
                          </Typography>
                          {(profile.hod.uid || profile.hod.teacherId) && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              UID: {profile.hod.uid || profile.hod.teacherId}
                            </Typography>
                          )}
                        </Box>
                      ) : 'Not Assigned'
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <DeanIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Dean"
                    secondary={
                      profile.dean ? (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {profile.dean.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {profile.dean.email}
                          </Typography>
                        </Box>
                      ) : 'Not Assigned'
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics Card */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Teaching Statistics
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Badge badgeContent={profile.statistics.totalSections} color="primary">
                      <GroupsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Badge>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      {profile.statistics.totalSections}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sections Assigned
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Badge badgeContent={profile.statistics.totalStudents} color="secondary">
                      <PersonIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                    </Badge>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      {profile.statistics.totalStudents}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Students
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      ({profile.statistics.directStudents} from assigned sections)
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <Box textAlign="center">
                    <Badge badgeContent={profile.statistics.totalCourses} color="success">
                      <CourseIcon sx={{ fontSize: 40, color: 'success.main' }} />
                    </Badge>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      {profile.statistics.totalCourses}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Courses
                    </Typography>
                  </Box>
                </Grid>

                {profile.statistics.coordinatedCoursesCount > 0 && (
                  <Grid item xs={12} sm={3}>
                    <Box textAlign="center">
                      <Badge badgeContent={profile.statistics.coordinatedCoursesCount} color="warning">
                        <CourseIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                      </Badge>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {profile.statistics.coordinatedCoursesCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Quiz Coordination (CC)
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Assigned Sections */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <GroupsIcon sx={{ mr: 1 }} />
                Assigned Sections ({profile.assignedSections.length})
              </Typography>

              {profile.assignedSections.length === 0 ? (
                <Alert severity="info">
                  No sections assigned yet.
                </Alert>
              ) : (
                profile.assignedSections.map((section) => (
                  <Accordion key={section._id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {section.name}
                        </Typography>
                        <Box display="flex" gap={1} mr={2}>
                          <Chip
                            icon={<PersonIcon />}
                            label={`${section.studentCount} students`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            icon={<CourseIcon />}
                            label={`${section.courseCount} courses`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Department: {section.department}
                      </Typography>
                      
                      {section.courses.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Courses:
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {section.courses.map((course) => (
                              <Chip
                                key={course._id}
                                label={`${course.title} (${course.courseCode})`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Coordinated Courses (CC) - For Quiz Management Only */}
        {Array.isArray(profile.coordinatedCourses) && profile.coordinatedCourses.length > 0 && (
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CourseIcon sx={{ mr: 1 }} />
                  Quiz Coordination (CC) ({profile.coordinatedCourses.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  As a Course Coordinator, you can review and approve quiz questions for these courses.
                </Typography>

                <Grid container spacing={2}>
                  {profile.coordinatedCourses.map((course) => (
                    <Grid item xs={12} md={6} key={course._id}>
                      <Paper sx={{ p: 2 }} variant="outlined">
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {course.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Code: {course.courseCode}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Department: {course.department?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              School: {course.school?.name || 'Unknown'}
                            </Typography>
                          </Box>
                          <Box>
                            <Chip label="Quiz Review" size="small" color="primary" />
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default TeacherProfile;