import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Container, Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import GroupIcon from '@mui/icons-material/Group';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ClassIcon from '@mui/icons-material/Class';
// Video call icon removed - moved to independent video call module
import { hasPermission } from '../../utils/permissions';

const TeacherDashboard = ({ user }) => {
  // Get permissions from user object
  const permissions = user?.permissions || [];
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name || 'Teacher'}!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your courses and interact with students.
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Your Permissions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {hasPermission(user, 'manage_teachers') && (
              <Chip icon={<PersonIcon />} label="Manage Teachers" color="primary" variant="outlined" />
            )}
            {hasPermission(user, 'manage_students') && (
              <Chip icon={<GroupIcon />} label="Manage Students" color="primary" variant="outlined" />
            )}
            {hasPermission(user, 'manage_courses') && (
              <Chip icon={<SchoolIcon />} label="Manage Courses" color="primary" variant="outlined" />
            )}
            {hasPermission(user, 'manage_videos') && (
              <Chip icon={<VideoLibraryIcon />} label="Manage Videos" color="primary" variant="outlined" />
            )}
            {hasPermission(user, 'view_analytics') && (
              <Chip icon={<BarChartIcon />} label="View Analytics" color="primary" variant="outlined" />
            )}
            {permissions.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No special permissions assigned. Contact admin for access.
              </Typography>
            )}
          </Box>
        </Box>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Teacher Profile Card */}
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    My Profile
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  View your profile information, assigned sections, department details, and your HOD/Dean contacts.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to="/teacher/profile"
                    startIcon={<PersonIcon />}
                  >
                    View Profile
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* My Sections Card */}
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ClassIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    My Sections
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  View your assigned sections, manage students, and track course progress across all your classes.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to="/teacher/sections"
                    startIcon={<ClassIcon />}
                  >
                    View Sections
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Manage Courses Card */}
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SchoolIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    My Courses
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  View and manage all your assigned courses, including student progress and video content.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to="/teacher/courses"
                    startIcon={<VideoLibraryIcon />}
                  >
                    View Courses
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Upload Content Card */}
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CloudUploadIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Upload Content
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Upload videos and quizzes to your assigned courses.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to="/teacher/videos/upload"
                    startIcon={<CloudUploadIcon />}
                    disabled={!hasPermission(user, 'manage_videos')}
                  >
                    Upload Content
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Live Classes Card removed - moved to independent video call module */}

          {/* Students Management Card */}
          {hasPermission(user, 'manage_students') && (
            <Grid item xs={12} md={6} lg={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <GroupIcon color="info" sx={{ fontSize: 40, mr: 2 }} />
                    <Typography variant="h5" component="div">
                      Manage Students
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    View and manage students enrolled in your courses.
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      color="info"
                      component={Link}
                      to="/teacher/students"
                      startIcon={<GroupIcon />}
                    >
                      View Students
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
          
          {/* Analytics Card */}
          {hasPermission(user, 'view_analytics') && (
            <Grid item xs={12} md={6} lg={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BarChartIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                    <Typography variant="h5" component="div">
                      Analytics Dashboard
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    View comprehensive analytics for your courses and students.
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      component={Link}
                      to="/analytics"
                      startIcon={<BarChartIcon />}
                    >
                      View Analytics
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
          {/* Request Super Admin Card */}
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Request Super Admin
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Submit a request or escalation to the super admin. View your previous requests and their status.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="warning"
                    component={Link}
                    to="/teacher/requests"
                    startIcon={<PersonIcon />}
                  >
                    Request Admin
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default TeacherDashboard;
