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
      console.log('Assigned sections:', response.data.assignedSections);
      
      // Debug each section's courses
      if (response.data.assignedSections) {
        response.data.assignedSections.forEach((section, idx) => {
          console.log(`Section ${idx} (${section.name}):`, section);
          console.log(`Section ${idx} courses:`, section.courses);
          if (section.courses) {
            section.courses.forEach((course, courseIdx) => {
              console.log(`  Course ${courseIdx}:`, course);
              console.log(`    - title: ${course.title}`);
              console.log(`    - courseCode: ${course.courseCode}`);
              console.log(`    - name: ${course.name}`);
              console.log(`    - code: ${course.code}`);
            });
          }
        });
      }
      
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
      <Box sx={{ mt: { xs: 2, sm: 3, md: 4 }, px: { xs: 1, sm: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            My Sections
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchUserProfile} color="primary" size={window.innerWidth < 600 ? 'small' : 'medium'}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Student Info Card */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Paper sx={{ 
              p: { xs: 2, sm: 3 }, 
              mb: 3, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white' 
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 2, 
                  fontWeight: 'bold',
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }}
              >
                Welcome, {userProfile.name}!
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <EmailIcon sx={{ mr: 1, fontSize: { xs: 16, sm: 18 } }} />
                    {userProfile.email}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <BadgeIcon sx={{ mr: 1, fontSize: { xs: 16, sm: 18 } }} />
                    Student ID: {userProfile.regNo || userProfile.studentId || 'Not assigned'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <SchoolIcon sx={{ mr: 1, fontSize: { xs: 16, sm: 18 } }} />
                    {userProfile.school?.name || 'School not assigned'}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <GroupsIcon sx={{ mr: 1, fontSize: { xs: 16, sm: 18 } }} />
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
              <Card sx={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                '&:hover': { boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 3, 
                      display: 'flex', 
                      alignItems: 'center', 
                      color: 'primary.main', 
                      fontWeight: 'bold',
                      fontSize: { xs: '1.1rem', sm: '1.25rem' }
                    }}
                  >
                    <ClassIcon sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                    {section.name || 'Section Name Not Available'}
                  </Typography>

                  <Grid container spacing={3}>
                    {/* Course Information with Teachers */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: { xs: 1.5, sm: 2 }, backgroundColor: '#f8f9fa' }}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            mb: 2, 
                            fontWeight: 'bold', 
                            color: 'primary.main',
                            fontSize: { xs: '0.95rem', sm: '1rem' }
                          }}
                        >
                          <MenuBookIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: { xs: 18, sm: 20 } }} />
                          Courses & Teachers
                        </Typography>
                        {section.courses && section.courses.length > 0 ? (
                          <List dense>
                            {section.courses.map((course, courseIndex) => (
                              <ListItem 
                                key={course._id || courseIndex} 
                                sx={{ 
                                  px: { xs: 0.5, sm: 0 }, 
                                  py: { xs: 1, sm: 1.5 },
                                  mb: 1,
                                  borderRadius: 1,
                                  backgroundColor: 'white',
                                  border: '1px solid #e0e0e0',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start'
                                }}
                              >
                                <Grid container spacing={2} alignItems="center">
                                  <Grid item xs={12} sm={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', pl: { xs: 1, sm: 2 } }}>
                                      <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                                        <MenuBookIcon color="primary" sx={{ fontSize: { xs: 18, sm: 24 } }} />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Typography 
                                            variant="subtitle2" 
                                            fontWeight="bold"
                                            sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem' } }}
                                          >
                                            {course.name || course.title || 'Course Name N/A'}
                                          </Typography>
                                        }
                                        secondary={
                                          <Typography 
                                            variant="caption"
                                            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                          >
                                            Code: {course.courseCode || course.code || 'N/A'}
                                          </Typography>
                                        }
                                      />
                                    </Box>
                                  </Grid>
                                  <Grid item xs={12} sm={6}>
                                    {course.assignedTeacher ? (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        pl: { xs: 1, sm: 2 },
                                        mt: { xs: 0, sm: 0 }
                                      }}>
                                        <ListItemAvatar>
                                          <Avatar sx={{ 
                                            bgcolor: 'secondary.main', 
                                            width: { xs: 28, sm: 32 }, 
                                            height: { xs: 28, sm: 32 },
                                            fontSize: { xs: '0.875rem', sm: '1rem' }
                                          }}>
                                            {course.assignedTeacher.name ? course.assignedTeacher.name.charAt(0).toUpperCase() : 'T'}
                                          </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                          primary={
                                            <Typography 
                                              variant="body2" 
                                              fontWeight="500"
                                              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                                            >
                                              {course.assignedTeacher.name || 'Teacher Name N/A'}
                                            </Typography>
                                          }
                                          secondary={
                                            course.assignedTeacher.email && (
                                              <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                  display: 'flex', 
                                                  alignItems: 'center',
                                                  fontSize: { xs: '0.65rem', sm: '0.7rem' }
                                                }}
                                              >
                                                <EmailIcon sx={{ fontSize: { xs: 10, sm: 12 }, mr: 0.5 }} />
                                                <Box 
                                                  component="span" 
                                                  sx={{ 
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: { xs: '150px', sm: '200px' }
                                                  }}
                                                >
                                                  {course.assignedTeacher.email}
                                                </Box>
                                              </Typography>
                                            )
                                          }
                                        />
                                      </Box>
                                    ) : (
                                      <Typography 
                                        variant="caption" 
                                        color="text.secondary" 
                                        sx={{ 
                                          pl: { xs: 1, sm: 2 }, 
                                          fontStyle: 'italic',
                                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                        }}
                                      >
                                        No teacher assigned to this course
                                      </Typography>
                                    )}
                                  </Grid>
                                </Grid>
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontStyle: 'italic',
                              fontSize: { xs: '0.8rem', sm: '0.875rem' }
                            }}
                          >
                            No courses assigned to this section
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
                          icon={<SchoolIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />} 
                          label={`School: ${section.school?.name || 'N/A'}`}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            width: '100%',
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            '& .MuiChip-label': {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Chip 
                          icon={<ClassIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />} 
                          label={`Department: ${section.department?.name || 'N/A'}`}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            width: '100%',
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            '& .MuiChip-label': {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Chip 
                          icon={<GroupsIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />} 
                          label={`Students: ${section.students?.length || 0}`}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            width: '100%',
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' }
                          }}
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
