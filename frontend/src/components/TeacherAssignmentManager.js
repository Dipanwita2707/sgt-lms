import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { teacherAssignmentApi } from '../api/teacherAssignmentApi';
import { hasRole } from '../utils/roleUtils';

const TeacherAssignmentManager = ({ user }) => {
  // State management
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewAssignmentsDialog, setViewAssignmentsDialog] = useState(false);

  // Check if user can manage assignments
  const canManage = hasRole(user, 'admin') || hasRole(user, 'hod') || hasRole(user, 'dean');

  // Load initial data
  useEffect(() => {
    if (canManage) {
      loadTeachers();
      loadSections();
      loadCourses();
    }
  }, [canManage]);

  /**
   * Load available teachers
   */
  const loadTeachers = async () => {
    try {
      const response = await teacherAssignmentApi.getAvailableTeachers();
      if (response.success) {
        setTeachers(response.teachers);
      } else {
        setError('Failed to load teachers: ' + response.message);
      }
    } catch (error) {
      setError('Error loading teachers: ' + error.message);
    }
  };

  /**
   * Load sections (you'll need to implement this API call)
   */
  const loadSections = async () => {
    try {
      // Replace with actual API call to get sections
      // const response = await sectionApi.getSections();
      // setSections(response.data);
      
      // Placeholder for now
      setSections([
        { _id: '1', name: 'Section A - CSE 2nd Year' },
        { _id: '2', name: 'Section B - CSE 2nd Year' }
      ]);
    } catch (error) {
      setError('Error loading sections: ' + error.message);
    }
  };

  /**
   * Load courses (you'll need to implement this API call)
   */
  const loadCourses = async () => {
    try {
      // Replace with actual API call to get courses
      // const response = await courseApi.getCourses();
      // setCourses(response.data);
      
      // Placeholder for now
      setCourses([
        { _id: '1', name: 'Data Structures', code: 'CS201' },
        { _id: '2', name: 'Database Management', code: 'CS202' }
      ]);
    } catch (error) {
      setError('Error loading courses: ' + error.message);
    }
  };

  /**
   * Handle teacher assignment
   */
  const handleAssignTeacher = async () => {
    if (!selectedTeacher || !selectedSection || !selectedCourse) {
      setError('Please select teacher, section, and course');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await teacherAssignmentApi.assignTeacherToCourses(selectedTeacher, [{
        sectionId: selectedSection,
        courseId: selectedCourse
      }]);

      if (response.success) {
        setSuccess('Teacher assigned successfully!');
        // Reset form
        setSelectedTeacher('');
        setSelectedSection('');
        setSelectedCourse('');
      } else {
        setError('Assignment failed: ' + response.message);
      }
    } catch (error) {
      setError('Error assigning teacher: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * View teacher assignments
   */
  const viewTeacherAssignments = async () => {
    if (!selectedTeacher) {
      setError('Please select a teacher first');
      return;
    }

    setLoading(true);
    try {
      const response = await teacherAssignmentApi.getTeacherAssignments(selectedTeacher);
      if (response.success) {
        setAssignments(response.assignments);
        setViewAssignmentsDialog(true);
      } else {
        setError('Failed to load assignments: ' + response.message);
      }
    } catch (error) {
      setError('Error loading assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // If user doesn't have permission
  if (!canManage) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          You don't have permission to manage teacher assignments.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Teacher Assignment Management
      </Typography>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Assignment Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assign Teacher to Course
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Teacher</InputLabel>
                    <Select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      label="Select Teacher"
                    >
                      {teachers.map((teacher) => (
                        <MenuItem key={teacher._id} value={teacher._id}>
                          {teacher.name}
                          {teacher.department && (
                            <Chip 
                              label={teacher.department.name} 
                              size="small" 
                              sx={{ ml: 1 }} 
                            />
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Section</InputLabel>
                    <Select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      label="Select Section"
                    >
                      {sections.map((section) => (
                        <MenuItem key={section._id} value={section._id}>
                          {section.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Course</InputLabel>
                    <Select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      label="Select Course"
                    >
                      {courses.map((course) => (
                        <MenuItem key={course._id} value={course._id}>
                          {course.code} - {course.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      onClick={handleAssignTeacher}
                      disabled={loading || !selectedTeacher || !selectedSection || !selectedCourse}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Assign Teacher'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={viewTeacherAssignments}
                      disabled={!selectedTeacher}
                    >
                      View Assignments
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Teacher Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Teachers: {teachers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Sections: {sections.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Courses: {courses.length}
              </Typography>

              {selectedTeacher && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Teacher:
                  </Typography>
                  <Typography variant="body2">
                    {teachers.find(t => t._id === selectedTeacher)?.name || 'Unknown'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* View Assignments Dialog */}
      <Dialog
        open={viewAssignmentsDialog}
        onClose={() => setViewAssignmentsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Teacher Assignments
        </DialogTitle>
        <DialogContent>
          {assignments.length === 0 ? (
            <Typography>No assignments found for this teacher.</Typography>
          ) : (
            <List>
              {assignments.map((assignment, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`${assignment.course?.name || 'Unknown Course'}`}
                    secondary={`Section: ${assignment.section?.name || 'Unknown Section'}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewAssignmentsDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherAssignmentManager;