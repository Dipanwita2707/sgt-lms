import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  School as SchoolIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import axios from 'axios';

const TeacherAnnouncementComponent = ({ user }) => {
  const [sections, setSections] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const token = localStorage.getItem('token');

  // Fetch teacher's sections
  useEffect(() => {
    const fetchSections = async () => {
      try {
        setSectionsLoading(true);
        const response = await axios.get('/api/teacher/sections', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSections(response.data);
      } catch (error) {
        console.error('Error fetching sections:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load sections. Please try again.',
          severity: 'error'
        });
      } finally {
        setSectionsLoading(false);
      }
    };

    fetchSections();
  }, [token]);

  // Handle section selection
  const handleSectionChange = (sectionId) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      setSnackbar({
        open: true,
        message: 'Please provide both title and message.',
        severity: 'warning'
      });
      return;
    }

    if (selectedSections.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select at least one section.',
        severity: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/teacher/announcement', {
        title: title.trim(),
        message: message.trim(),
        targetSections: selectedSections
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSnackbar({
        open: true,
        message: response.data.message || 'Announcement submitted for HOD approval successfully!',
        severity: 'success'
      });

      // Reset form
      setTitle('');
      setMessage('');
      setSelectedSections([]);
    } catch (error) {
      console.error('Error creating announcement:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to create announcement. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate total students in selected sections
  const getTotalStudents = () => {
    return sections
      .filter(section => selectedSections.includes(section._id))
      .reduce((total, section) => total + section.studentCount, 0);
  };

  if (sectionsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading your sections...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create Section Announcement
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Your announcement will be sent to your HOD for approval before being shared with students.
        </Typography>
      </Alert>

      <Paper elevation={2} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* Title Input */}
          <TextField
            fullWidth
            label="Announcement Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
            placeholder="Enter a clear title for your announcement"
          />

          {/* Message Input */}
          <TextField
            fullWidth
            label="Announcement Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            margin="normal"
            required
            multiline
            rows={4}
            placeholder="Write your announcement message here..."
          />

          <Divider sx={{ my: 3 }} />

          {/* Section Selection */}
          <Typography variant="h6" gutterBottom>
            <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Select Sections
          </Typography>

          {sections.length === 0 ? (
            <Alert severity="warning">
              No sections assigned to you. Please contact the administrator.
            </Alert>
          ) : (
            <>
              <FormGroup sx={{ mb: 2 }}>
                {sections.map((section) => (
                  <Card key={section._id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent sx={{ py: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedSections.includes(section._id)}
                              onChange={() => handleSectionChange(section._id)}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {section.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {section.department}
                              </Typography>
                            </Box>
                          }
                        />
                        
                        <Box display="flex" alignItems="center" gap={2}>
                          <Chip
                            icon={<PeopleIcon />}
                            label={`${section.studentCount} students`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            icon={<AssignmentIcon />}
                            label={`${section.courses.length} courses`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      
                      {section.courses.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Courses: {section.courses.map(course => course.title).join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </FormGroup>

              {/* Summary */}
              {selectedSections.length > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Summary:</strong> You have selected {selectedSections.length} section(s) 
                    with a total of {getTotalStudents()} students.
                  </Typography>
                </Alert>
              )}
            </>
          )}

          {/* Submit Button */}
          <Box display="flex" gap={2} sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || selectedSections.length === 0 || !title.trim() || !message.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <AssignmentIcon />}
            >
              {loading ? 'Submitting...' : 'Submit for HOD Approval'}
            </Button>
            
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setTitle('');
                setMessage('');
                setSelectedSections([]);
              }}
              disabled={loading}
            >
              Clear Form
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeacherAnnouncementComponent;