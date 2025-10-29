import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PushPinIcon from '@mui/icons-material/PushPin';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as forumApi from '../../api/forumApi';

const TeacherForums = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [forums, setForums] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newForum, setNewForum] = useState({
    title: '',
    content: '',
    courseId: '',
    image: null
  });
  const [selectedCourse, setSelectedCourse] = useState('all');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch courses
        const coursesResponse = await axios.get('/api/teacher/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCourses(coursesResponse.data);
        
        // Load all forums by default
        fetchForumsByFilter('all');
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    if (token) {
      fetchData();
    }
  }, [token]);
  
  // Fetch forums by course filter
  const fetchForumsByFilter = async (courseId) => {
    try {
      setLoading(true);
      
      let forumsData;
      if (courseId === 'all') {
        // Fetch all forums for teacher using the centralized API
        try {
          const response = await axios.get('/api/teacher/forums', {
            headers: { Authorization: `Bearer ${token}` }
          });
          forumsData = response.data;
        } catch (err) {
          // If the teacher-specific endpoint fails, fall back to the general forums API
          console.warn('Falling back to general forums API');
          const allForumsResponse = await axios.get('/api/forums/teacher', 
            { headers: { Authorization: `Bearer ${token}` }}
          );
          forumsData = allForumsResponse.data;
        }
      } else {
        // Fetch forums for specific course using centralized API
        const response = await forumApi.getCourseDiscussions(courseId);
        forumsData = response.data.discussions || response.data;
      }
      
      setForums(forumsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching forums:', err);
      setError('Failed to load forums. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle course filter change
  const handleCourseChange = (event) => {
    const courseId = event.target.value;
    setSelectedCourse(courseId);
    fetchForumsByFilter(courseId);
  };
  
  const handleCreateForumOpen = () => {
    setCreateDialogOpen(true);
    if (courses.length > 0) {
      setNewForum(prev => ({
        ...prev,
        courseId: courses[0]._id
      }));
    }
  };
  
  const handleCreateForumClose = () => {
    setCreateDialogOpen(false);
    setNewForum({
      title: '',
      content: '',
      courseId: '',
      image: null
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewForum({
      ...newForum,
      [name]: value
    });
  };
  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewForum(prev => ({
        ...prev,
        image: e.target.files[0]
      }));
    }
  };
  
  const handleCreateForumSubmit = async () => {
    if (!newForum.title || !newForum.courseId) {
      setError('Title and course are required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Use the centralized forum API to create a new discussion
      const result = await forumApi.createDiscussion({
        title: newForum.title,
        content: newForum.content || newForum.title, // Ensure there's content
        courseId: newForum.courseId,
        image: newForum.image
      });
      
      // Add to the list if in the correct filter
      if (selectedCourse === 'all' || selectedCourse === newForum.courseId) {
        // Refresh forums to show the new one
        fetchForumsByFilter(selectedCourse);
      }
      
      setSuccess('Forum created successfully');
      setTimeout(() => setSuccess(''), 3000);
      handleCreateForumClose();
    } catch (err) {
      console.error('Error creating forum:', err);
      setError('Failed to create forum. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Function to toggle pin status
  const handleTogglePin = async (forum) => {
    try {
      setLoading(true);
      await forumApi.togglePin(forum._id, !forum.isPinned);
      
      // Refresh forums list to show updated pin status
      fetchForumsByFilter(selectedCourse);
      
      setSuccess(forum.isPinned ? 'Forum unpinned' : 'Forum pinned');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error toggling pin status:', err);
      setError('Failed to update pin status');
      setLoading(false);
    }
  };
  
  // Function to toggle resolved status
  const handleToggleResolved = async (forum) => {
    try {
      setLoading(true);
      await forumApi.toggleResolved(forum._id, !forum.isResolved);
      
      // Refresh forums list to show updated resolved status
      fetchForumsByFilter(selectedCourse);
      
      setSuccess(forum.isResolved ? 'Forum marked as unresolved' : 'Forum marked as resolved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error toggling resolved status:', err);
      setError('Failed to update resolved status');
      setLoading(false);
    }
  };
  
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Forums
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Manage discussion forums for your courses
      </Typography>
      
      {/* Success and Error Alerts */}
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
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Forum Overview
                  </Typography>
                  <Typography variant="body1">
                    Active Forums: {forums.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="course-filter-label">Filter by Course</InputLabel>
              <Select
                labelId="course-filter-label"
                id="course-filter"
                value={selectedCourse}
                onChange={handleCourseChange}
                label="Filter by Course"
              >
                <MenuItem value="all">All Courses</MenuItem>
                {courses.map(course => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.title} ({course.courseCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateForumOpen}
              disabled={courses.length === 0}
            >
              Create New Forum
            </Button>
          </Box>
          
          <Paper>
            {forums.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography>No forums available yet.</Typography>
              </Box>
            ) : (
              <List>
                {forums.map((forum) => (
                  <React.Fragment key={forum._id}>
                    <ListItem 
                      alignItems="flex-start"
                      sx={{ 
                        bgcolor: forum.isPinned ? '#f5f5f5' : 'inherit',
                        '&:hover': { bgcolor: '#fafafa' }
                      }}
                      secondaryAction={
                        <Box>
                          <Tooltip title="View Forum">
                            <IconButton onClick={() => navigate(`/teacher/forum/${forum._id}`)}>
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={forum.isPinned ? "Unpin" : "Pin"}>
                            <IconButton
                              onClick={() => handleTogglePin(forum)}
                              color={forum.isPinned ? "primary" : "default"}
                            >
                              <PushPinIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={forum.isResolved ? "Mark as Unresolved" : "Mark as Resolved"}>
                            <IconButton 
                              onClick={() => handleToggleResolved(forum)}
                              color={forum.isResolved ? "success" : "default"}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {forum.isPinned && (
                              <PushPinIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                            )}
                            <Typography variant="h6">
                              {forum.title}
                            </Typography>
                            <Chip 
                              size="small"
                              label={forum.isResolved ? 'Resolved' : 'Open'} 
                              color={forum.isResolved ? 'success' : 'warning'}
                              sx={{ ml: 2 }}
                            />
                          </Box>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography component="span" variant="body2" color="text.primary" display="block">
                              {forum.content || forum.description || 'No description'}
                            </Typography>
                            <Typography component="span" variant="body2" display="block" color="text.secondary">
                              Course: {forum.course?.title || forum.courseName || 'Unknown'} • 
                              Posts: {forum.replies?.length || forum.postCount || 0} • 
                              Last activity: {formatDate(forum.updatedAt || forum.lastActivity || forum.createdAt)}
                            </Typography>
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
          
          {/* Create Forum Dialog */}
          <Dialog open={createDialogOpen} onClose={handleCreateForumClose} maxWidth="md" fullWidth>
            <DialogTitle>Create New Forum</DialogTitle>
            <DialogContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              )}
              
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="course-select-label">Course</InputLabel>
                <Select
                  labelId="course-select-label"
                  id="courseId"
                  name="courseId"
                  value={newForum.courseId}
                  onChange={handleInputChange}
                  label="Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.title} ({course.courseCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="title"
                label="Forum Title"
                name="title"
                value={newForum.title}
                onChange={handleInputChange}
              />
              
              <TextField
                margin="normal"
                fullWidth
                id="content"
                label="Content/Description"
                name="content"
                value={newForum.content}
                onChange={handleInputChange}
                multiline
                rows={4}
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Attach Image (Optional)
                </Typography>
                <input
                  accept="image/*"
                  id="forum-image-upload"
                  type="file"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="forum-image-upload">
                  <Button variant="outlined" component="span">
                    Upload Image
                  </Button>
                </label>
                {newForum.image && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Selected: {newForum.image.name}
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCreateForumClose}>Cancel</Button>
              <Button 
                onClick={handleCreateForumSubmit}
                variant="contained"
                color="primary"
                disabled={loading || !newForum.title || !newForum.courseId}
              >
                {loading ? 'Creating...' : 'Create Forum'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default TeacherForums;
