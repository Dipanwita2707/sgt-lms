import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  ListItemIcon
} from '@mui/material';
import { 
  People as PeopleIcon, 
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Class as ClassIcon,
  Groups as GroupsIcon,
  Email as EmailIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import axios from 'axios';

const StudentSection = ({ user, token }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      console.log('Fetching user profile with sections...');
      
      const response = await axios.get('/api/auth/me');
      console.log('User profile response:', response.data);
      
      setUserProfile(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to fetch your section information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading your section information...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we fetch your section details
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error" action={
            <Tooltip title="Refresh">
              <IconButton color="inherit" onClick={fetchUserProfile}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          }>
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  if (!userProfile?.assignedSections || userProfile.assignedSections.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Section Assigned
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                You are not currently assigned to any section. Contact your administrator or teacher for section assignment.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Tooltip title="Check again for section assignment">
                  <IconButton 
                    onClick={fetchUserProfile} 
                    disabled={loading}
                    size="large"
                    color="primary"
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            My Sections
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchUserProfile} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Student Info Card */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                Welcome, {userProfile.name}!
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon sx={{ mr: 1, fontSize: 18 }} />
                    {userProfile.email}
                  </Typography>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BadgeIcon sx={{ mr: 1, fontSize: 18 }} />
                    Student ID: {userProfile.regNo || userProfile.studentId || 'Not assigned'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SchoolIcon sx={{ mr: 1, fontSize: 18 }} />
                    {userProfile.school?.name || 'School not assigned'}
                  </Typography>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                    <GroupsIcon sx={{ mr: 1, fontSize: 18 }} />
                    Enrolled in {userProfile.assignedSections.length} section(s)
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Sections */}
        <Grid container spacing={3}>
          {userProfile.assignedSections.map((section, index) => (
            <Grid item xs={12} key={section._id || index}>
              <Card sx={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', '&:hover': { boxShadow: '0 8px 20px rgba(0,0,0,0.15)' } }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main', fontWeight: 'bold' }}>
                    <ClassIcon sx={{ mr: 1 }} />
                    {section.name || 'Section Name Not Available'}
                  </Typography>

                  <Grid container spacing={3}>
                    {/* Course Information */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: '#f8f9fa', height: '100%' }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                          <MenuBookIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Course Information
                        </Typography>
                        {section.courses && section.courses.length > 0 ? (
                          <List dense>
                            {section.courses.map((course, courseIndex) => (
                              <ListItem key={course._id || courseIndex} sx={{ px: 0 }}>
                                <ListItemIcon>
                                  <MenuBookIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={course.name || course.title || 'Course Name N/A'}
                                  secondary={`Code: ${course.courseCode || course.code || 'N/A'}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No courses assigned to this section
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    {/* Teacher Information */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: '#f0f7ff', height: '100%' }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                          <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Section Teacher
                        </Typography>
                        {section.teacher || (section.teachers && section.teachers.length > 0) ? (
                          <List dense>
                            {/* Display single teacher if exists */}
                            {section.teacher && (
                              <ListItem sx={{ px: 0 }}>
                                <ListItemAvatar>
                                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                                    {section.teacher.name ? section.teacher.name.charAt(0).toUpperCase() : 'T'}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={section.teacher.name || 'Teacher Name N/A'}
                                  secondary={
                                    <Box>
                                      {section.teacher.email && (
                                        <Typography variant="caption" display="block" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                          <EmailIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                          {section.teacher.email}
                                        </Typography>
                                      )}
                                      {section.teacher.teacherId && (
                                        <Typography variant="caption" display="block" color="text.secondary">
                                          Teacher ID: {section.teacher.teacherId}
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            )}
                            {/* Display multiple teachers if they exist */}
                            {section.teachers && section.teachers.map((teacher, teacherIndex) => (
                              <ListItem key={teacher._id || teacherIndex} sx={{ px: 0 }}>
                                <ListItemAvatar>
                                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                    {teacher.name ? teacher.name.charAt(0).toUpperCase() : 'T'}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={teacher.name || 'Teacher Name N/A'}
                                  secondary={
                                    <Box>
                                      {teacher.email && (
                                        <Typography variant="caption" display="block" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                          <EmailIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                          {teacher.email}
                                        </Typography>
                                      )}
                                      {teacher.teacherId && (
                                        <Typography variant="caption" display="block" color="text.secondary">
                                          Teacher ID: {teacher.teacherId}
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No teacher assigned to this section
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Section Details */}
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Chip 
                          icon={<SchoolIcon />} 
                          label={`School: ${section.school?.name || 'N/A'}`}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Chip 
                          icon={<ClassIcon />} 
                          label={`Department: ${section.department?.name || 'N/A'}`}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Chip 
                          icon={<GroupsIcon />} 
                          label={`Students: ${section.students?.length || 0}`}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default StudentSection;
