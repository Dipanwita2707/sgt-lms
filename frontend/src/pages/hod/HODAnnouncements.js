import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  Grid,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Switch,
  Divider,
  Avatar,
  ListItemAvatar,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Announcement as AnnouncementIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Class as CourseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';

const HODAnnouncements = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [targetingOptions, setTargetingOptions] = useState({});
  
  // Form state for creating announcements
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    targetAudience: {
      targetCourses: [],
      includeTeachers: false,
      includeStudents: false
    }
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAnnouncements();
    fetchTargetingOptions();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/announcements', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetingOptions = async () => {
    try {
      const response = await axios.get('/api/announcements/targeting-options', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Targeting options response:', response.data);
      console.log('Teachers by course keys:', Object.keys(response.data.teachersByCourse || {}));
      console.log('Department summary:', response.data.departmentSummary);
      setTargetingOptions(response.data);
    } catch (error) {
      console.error('Error fetching targeting options:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    try {
      await axios.post('/api/announcements', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCreateDialog(false);
      setForm({
        title: '',
        message: '',
        priority: 'normal',
        targetAudience: {
          targetCourses: [],
          includeTeachers: false,
          includeStudents: false
        }
      });
      setSelectedCourse('all');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const handleTargetingChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        [field]: value
      }
    }));
  };

  const toggleCourseSelection = (courseId) => {
    const currentCourses = form.targetAudience.targetCourses || [];
    const isSelected = currentCourses.includes(courseId);
    
    if (isSelected) {
      handleTargetingChange('targetCourses', currentCourses.filter(id => id !== courseId));
    } else {
      handleTargetingChange('targetCourses', [...currentCourses, courseId]);
    }
  };

  const selectAllCourses = () => {
    const allCourseIds = (targetingOptions.courses || []).map(c => c._id);
    handleTargetingChange('targetCourses', allCourseIds);
  };

  const clearAllCourses = () => {
    handleTargetingChange('targetCourses', []);
  };

  const getSelectedCoursesInfo = () => {
    const selectedCourses = form.targetAudience.targetCourses || [];
    const includeTeachers = form.targetAudience.includeTeachers;
    const includeStudents = form.targetAudience.includeStudents;
    
    let totalTeachers = 0;
    let totalStudents = 0;
    
    selectedCourses.forEach(courseId => {
      if (includeTeachers) {
        const teachers = targetingOptions.teachersByCourse?.[courseId]?.teachers || [];
        totalTeachers += teachers.length;
      }
      if (includeStudents) {
        const students = targetingOptions.studentsByCourse?.[courseId]?.students || [];
        totalStudents += students.length;
      }
    });
    
    return { 
      totalTeachers: includeTeachers ? totalTeachers : 0, 
      totalStudents: includeStudents ? totalStudents : 0, 
      courseCount: selectedCourses.length 
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Department Announcements
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
          sx={{ bgcolor: '#1976d2' }}
        >
          Create Announcement
        </Button>
      </Box>

      {/* Department Summary */}
      {targetingOptions.departmentSummary && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            <strong>{targetingOptions.departmentSummary.name} Department:</strong> {' '}
            {targetingOptions.departmentSummary.totalTeachers} teachers, {' '}
            {targetingOptions.departmentSummary.totalStudents} students across {' '}
            {targetingOptions.departmentSummary.totalCourses} courses
          </Typography>
        </Alert>
      )}

      {/* Announcements List */}
      <Grid container spacing={3}>
        {announcements.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <AnnouncementIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No announcements yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create your first department announcement
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialog(true)}
                >
                  Create Announcement
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          announcements.map((announcement) => (
            <Grid item xs={12} key={announcement._id}>
              <Card sx={{ 
                borderLeft: `4px solid ${
                  announcement.priority === 'high' ? '#f44336' : 
                  announcement.priority === 'medium' ? '#ff9800' : '#4caf50'
                }`
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {announcement.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip 
                          label={announcement.priority.toUpperCase()} 
                          size="small"
                          color={
                            announcement.priority === 'high' ? 'error' : 
                            announcement.priority === 'medium' ? 'warning' : 'success'
                          }
                        />
                        <Chip 
                          label={announcement.targetedUsers?.length || 0 + ' recipients'} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(announcement.createdAt))} ago
                    </Typography>
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {announcement.message}
                  </Typography>
                  
                  {announcement.targetedUsers?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Sent to:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {announcement.targetedUsers.slice(0, 5).map((user) => (
                          <Chip 
                            key={user._id} 
                            label={user.name} 
                            size="small" 
                            variant="outlined"
                            avatar={<Avatar sx={{ width: 20, height: 20 }}>{user.name[0]}</Avatar>}
                          />
                        ))}
                        {announcement.targetedUsers.length > 5 && (
                          <Chip 
                            label={`+${announcement.targetedUsers.length - 5} more`} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Create Announcement Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AnnouncementIcon />
            Create Department Announcement
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Announcement Title"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message"
                value={form.message}
                onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={form.priority}
                  label="Priority"
                  onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Target Audience Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Target Audience
              </Typography>
              
              {/* Audience Type Selection */}
              <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Select Recipients
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.targetAudience.includeTeachers}
                          onChange={(e) => handleTargetingChange('includeTeachers', e.target.checked)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon />
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              Teachers
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Send to teachers assigned to selected courses
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.targetAudience.includeStudents}
                          onChange={(e) => handleTargetingChange('includeStudents', e.target.checked)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GroupIcon />
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              Students
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Send to students enrolled in selected courses
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* Course Selection */}
            {(targetingOptions.courses?.length > 0) && (
              <Grid item xs={12}>
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CourseIcon />
                      Select Courses
                    </Typography>
                    <Box>
                      <Button size="small" onClick={selectAllCourses}>
                        Select All
                      </Button>
                      <Button size="small" onClick={clearAllCourses}>
                        Clear All
                      </Button>
                    </Box>
                  </Box>
                  
                  <Grid container spacing={2}>
                    {(targetingOptions.courses || []).map((course) => {
                      const courseId = course._id;
                      const teacherCount = targetingOptions.teachersByCourse?.[courseId]?.teachers?.length || 0;
                      const studentCount = targetingOptions.studentsByCourse?.[courseId]?.students?.length || 0;
                      const isSelected = form.targetAudience.targetCourses?.includes(courseId);
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={courseId}>
                          <Card 
                            sx={{ 
                              cursor: 'pointer',
                              border: isSelected ? 2 : 1,
                              borderColor: isSelected ? 'primary.main' : 'divider',
                              bgcolor: isSelected ? 'primary.light' : 'background.paper',
                              '&:hover': {
                                bgcolor: isSelected ? 'primary.light' : 'action.hover'
                              }
                            }}
                            onClick={() => toggleCourseSelection(courseId)}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Checkbox 
                                  checked={isSelected}
                                  onChange={() => toggleCourseSelection(courseId)}
                                  sx={{ p: 0, mt: 0.5 }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    {course?.title || 'Course Name'}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Code: {course?.courseCode || 'N/A'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {form.targetAudience.includeTeachers && (
                                      <Chip 
                                        icon={<PersonIcon />}
                                        label={`${teacherCount} Teachers`}
                                        size="small"
                                        variant="outlined"
                                        color={isSelected ? 'primary' : 'default'}
                                      />
                                    )}
                                    {form.targetAudience.includeStudents && (
                                      <Chip 
                                        icon={<GroupIcon />}
                                        label={`${studentCount} Students`}
                                        size="small"
                                        variant="outlined"
                                        color={isSelected ? 'primary' : 'default'}
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              </Grid>
            )}

            {/* No Courses Available Message */}
            {!(targetingOptions.courses?.length) && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>No courses available</strong> in your department. Please contact the administrator to add courses.
                  </Typography>
                  {targetingOptions.departmentSummary && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Department: {targetingOptions.departmentSummary.name}
                    </Typography>
                  )}
                </Alert>
              </Grid>
            )}

            {/* Recipients Summary */}
            <Grid item xs={12}>
              {(form.targetAudience.includeTeachers || form.targetAudience.includeStudents) && form.targetAudience.targetCourses?.length > 0 ? (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Selected Recipients:</strong> {' '}
                    {form.targetAudience.includeTeachers && getSelectedCoursesInfo().totalTeachers > 0 && 
                      `${getSelectedCoursesInfo().totalTeachers} teachers`}
                    {form.targetAudience.includeTeachers && form.targetAudience.includeStudents && 
                      getSelectedCoursesInfo().totalTeachers > 0 && getSelectedCoursesInfo().totalStudents > 0 && ' and '}
                    {form.targetAudience.includeStudents && getSelectedCoursesInfo().totalStudents > 0 && 
                      `${getSelectedCoursesInfo().totalStudents} students`}
                    {' from '}
                    {getSelectedCoursesInfo().courseCount} course{getSelectedCoursesInfo().courseCount !== 1 ? 's' : ''}
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>No Recipients Selected:</strong> {' '}
                    {!form.targetAudience.includeTeachers && !form.targetAudience.includeStudents 
                      ? "Please select teachers, students, or both"
                      : "Please select at least one course"}
                  </Typography>
                </Alert>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateAnnouncement}
            variant="contained"
            disabled={
              !form.title || 
              !form.message || 
              (!form.targetAudience.includeTeachers && !form.targetAudience.includeStudents) ||
              !form.targetAudience.targetCourses?.length
            }
            startIcon={<SendIcon />}
          >
            Send Announcement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HODAnnouncements;