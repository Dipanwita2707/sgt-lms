import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material';
import {
  School as SchoolIcon,
  Class as ClassIcon,
  Groups as GroupsIcon,
  MenuBook as BookIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { getUserAssignments, getDeanAssignments } from '../../api/hierarchyApi';

const AssignedSectionsCard = ({ userId, userRole = 'admin', title = "Assigned Sections & Classes" }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, [userId, userRole]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      
      let response;
      if (userRole === 'dean') {
        response = await getDeanAssignments();
      } else {
        response = await getUserAssignments(userId);
      }
      
      setData(response);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{
        background: '#ffffff',
        border: '1px solid #6497b1',
        boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)'
      }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{
        background: '#ffffff',
        border: '1px solid #6497b1',
        boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)'
      }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  const { assignedSections = [], courseAssignments = [], stats = {}, school } = data || {};

  return (
    <Card sx={{ 
      height: '100%', 
      background: '#ffffff',
      border: '1px solid #6497b1',
      boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)'
    }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <ClassIcon />
          </Avatar>
        }
        title={title}
        subheader={userRole === 'dean' && school ? `${school.name} (${school.code})` : `${stats.totalSections || 0} sections assigned`}
      />
      <CardContent>
        {/* Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {userRole === 'dean' ? stats.assignedSections : stats.totalSections || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Assigned Sections
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="secondary.main" fontWeight="bold">
                {userRole === 'dean' ? stats.totalStudentsInAssignedSections : stats.totalStudents || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Students
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {userRole === 'dean' ? stats.totalCoursesInAssignedSections : stats.totalCourses || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Courses
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats.activeCourseAssignments || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Teaching Assignments
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Assigned Sections */}
        {assignedSections.length > 0 ? (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon /> Assigned Sections
            </Typography>
            {assignedSections.map((section, index) => (
              <Accordion key={section._id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {section.name}
                    </Typography>
                    <Chip 
                      label={section.department?.name} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Badge 
                      badgeContent={section.students ? section.students.length : 0} 
                      color="secondary"
                      sx={{ ml: 'auto' }}
                    >
                      <GroupsIcon />
                    </Badge>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        <BookIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Courses ({section.courses ? section.courses.length : 0})
                      </Typography>
                      {section.courses && section.courses.length > 0 ? (
                        <List dense>
                          {section.courses.map((course) => (
                            <ListItem key={course._id} sx={{ py: 0.5 }}>
                              <ListItemText
                                primary={course.title}
                                secondary={course.courseCode}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No courses assigned
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Students ({section.students ? section.students.length : 0})
                      </Typography>
                      {section.students && section.students.length > 0 ? (
                        <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                          <List dense>
                            {section.students.slice(0, 5).map((student) => (
                              <ListItem key={student._id} sx={{ py: 0.5 }}>
                                <ListItemText
                                  primary={student.name}
                                  secondary={`${student.regNo} • ${student.email}`}
                                />
                              </ListItem>
                            ))}
                            {section.students.length > 5 && (
                              <ListItem>
                                <ListItemText
                                  primary={`... and ${section.students.length - 5} more students`}
                                  sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                                />
                              </ListItem>
                            )}
                          </List>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No students enrolled
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ) : (
          <Alert severity="info">No sections assigned</Alert>
        )}

        {/* Course Teaching Assignments */}
        {courseAssignments.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BookIcon /> Teaching Assignments
            </Typography>
            <List>
              {courseAssignments.map((assignment) => (
                <ListItem key={assignment._id} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}>
                  <ListItemIcon>
                    <BookIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {assignment.course?.title}
                        </Typography>
                        <Chip label={assignment.course?.courseCode} size="small" />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Section: {assignment.section?.name} • 
                        Assigned by: {assignment.assignedBy?.name}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignedSectionsCard;