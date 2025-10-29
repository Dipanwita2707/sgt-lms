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
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import * as forumApi from '../../api/forumApi';
import axios from 'axios';

// Icons
import ForumIcon from '@mui/icons-material/Forum';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PushPinIcon from '@mui/icons-material/PushPin';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`forum-tabpanel-${index}`}
      aria-labelledby={`forum-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const StudentForums = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [forums, setForums] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  
  // Create forum dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newForum, setNewForum] = useState({
    title: '',
    content: '',
    courseId: '',
    image: null
  });
  
  // View forum dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentForum, setCurrentForum] = useState(null);
  
  // Reply dialog state
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyData, setReplyData] = useState({
    content: '',
    image: null
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch courses assigned to student
        const coursesResponse = await axios.get('/api/student/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCourses(coursesResponse.data);
        setLoading(false);
        
        // Load initial forums (all courses)
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
        // Fetch forums for all enrolled courses (collect them one by one)
        const allForums = [];
        for (const course of courses) {
          try {
            const response = await forumApi.getCourseDiscussions(course._id);
            allForums.push(...response.discussions);
          } catch (error) {
            console.error(`Error fetching forums for course ${course._id}:`, error);
          }
        }
        forumsData = allForums;
      } else {
        // Fetch forums for specific course
        const response = await forumApi.getCourseDiscussions(courseId);
        forumsData = response.discussions;
      }
      
      // Sort by pinned and recent
      forumsData.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
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
  
  // Create forum dialog handlers
  const handleCreateForumOpen = () => {
    setCreateDialogOpen(true);
    // Default to the first course if available
    if (courses.length > 0 && !newForum.courseId) {
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
  
  const handleCreateForumChange = (e) => {
    const { name, value } = e.target;
    setNewForum(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewForum(prev => ({
        ...prev,
        image: e.target.files[0]
      }));
    }
  };
  
  const handleCreateForum = async () => {
    if (!newForum.title || !newForum.content || !newForum.courseId) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      const result = await forumApi.createDiscussion(newForum);
      
      // Add to the list if in the correct tab/filter
      if (selectedCourse === 'all' || selectedCourse === newForum.courseId) {
        setForums(prev => [result.discussion, ...prev]);
      }
      
      setSuccess('Question posted successfully! Teachers will be notified.');
      setTimeout(() => setSuccess(''), 3000);
      handleCreateForumClose();
    } catch (err) {
      console.error('Error creating discussion:', err);
      setError('Failed to post question. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // View forum handlers
  const handleViewForum = async (forumId) => {
    try {
      setLoading(true);
      const forum = await forumApi.getDiscussion(forumId);
      setCurrentForum(forum);
      setViewDialogOpen(true);
    } catch (err) {
      console.error('Error fetching forum details:', err);
      setError('Failed to load forum details');
    } finally {
      setLoading(false);
    }
  };
  
  // Reply handlers
  const handleOpenReplyDialog = (forum) => {
    setCurrentForum(forum);
    setReplyDialogOpen(true);
    setReplyData({
      content: '',
      image: null
    });
  };
  
  const handleReplyChange = (e) => {
    const { name, value } = e.target;
    setReplyData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleReplyImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReplyData(prev => ({
        ...prev,
        image: e.target.files[0]
      }));
    }
  };
  
  const handleSubmitReply = async () => {
    if (!replyData.content || !currentForum) return;
    
    try {
      setLoading(true);
      const response = await forumApi.addReply(currentForum._id, replyData);
      
      // Update the current forum with the new reply if viewing
      if (viewDialogOpen && currentForum) {
        setCurrentForum(prevForum => ({
          ...prevForum,
          replies: [...prevForum.replies, response.reply]
        }));
      }
      
      setReplyDialogOpen(false);
      setSuccess('Reply added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to add reply');
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
  
  return (
    <Paper sx={{ p: 0 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)} 
          aria-label="forum tabs"
        >
          <Tab icon={<ForumIcon />} iconPosition="start" label="Course Forums" />
        </Tabs>
      </Box>
      
      {/* Success and Error Alerts */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ m: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>Course Forums</Typography>
          <Typography variant="body2" color="text.secondary">
            Ask questions and participate in discussions about your courses.
          </Typography>
        </Box>
        
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
            startIcon={<AddIcon />}
            onClick={handleCreateForumOpen}
          >
            Ask a Question
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : forums.length === 0 ? (
          <Alert severity="info">
            No forums found for your courses. Ask a question to get started.
          </Alert>
        ) : (
          <List>
            {forums.map(forum => (
              <React.Fragment key={forum._id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{ 
                    bgcolor: forum.isPinned ? '#f5f5f5' : 'inherit',
                    '&:hover': { bgcolor: '#fafafa' }
                  }}
                  secondaryAction={
                    <Box>
                      <Tooltip title="View Discussion">
                        <IconButton edge="end" onClick={() => handleViewForum(forum._id)}>
                          <VisibilityIcon />
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
                        <Typography variant="h6" component="div">
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
                        <Typography component="span" variant="body2" color="text.primary">
                          {forum.content.substring(0, 150)}{forum.content.length > 150 ? '...' : ''}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                          <Chip 
                            size="small" 
                            icon={<SchoolIcon fontSize="small" />}
                            label={forum.course?.title || 'Unknown Course'} 
                          />
                          <Typography variant="caption" color="text.secondary">
                            Posted by: {forum.user?.name || 'Unknown'} ({forum.user?.role || 'user'})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {formatDate(forum.createdAt)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {forum.replies?.length || 0} replies
                          </Typography>
                        </Box>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </TabPanel>
      
      {/* Create Forum Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateForumClose} maxWidth="md" fullWidth>
        <DialogTitle>Ask a Question</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="course-select-label">Course</InputLabel>
            <Select
              labelId="course-select-label"
              id="courseId"
              name="courseId"
              value={newForum.courseId}
              onChange={handleCreateForumChange}
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
            label="Question Title"
            name="title"
            value={newForum.title}
            onChange={handleCreateForumChange}
            placeholder="What's your question? Be specific."
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="content"
            label="Details"
            name="content"
            value={newForum.content}
            onChange={handleCreateForumChange}
            multiline
            rows={5}
            placeholder="Provide all the information that might help others answer your question."
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
            onClick={handleCreateForum}
            variant="contained"
            disabled={loading || !newForum.title || !newForum.content || !newForum.courseId}
          >
            {loading ? 'Posting...' : 'Post Question'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Forum Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {currentForum ? (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{currentForum.title}</Typography>
                <Box>
                  <Chip 
                    label={currentForum.isResolved ? 'Resolved' : 'Open'} 
                    color={currentForum.isResolved ? 'success' : 'warning'}
                    sx={{ mr: 1 }}
                  />
                  {currentForum.isPinned && (
                    <Chip 
                      icon={<PushPinIcon />}
                      label="Pinned" 
                      color="primary"
                    />
                  )}
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Posted by {currentForum.user?.name || 'Unknown'} ({currentForum.user?.role || 'user'}) 
                  on {formatDate(currentForum.createdAt)}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Course: {currentForum.course?.title || 'Unknown Course'}
                </Typography>
              </Box>
              
              <Typography variant="body1" paragraph>
                {currentForum.content}
              </Typography>
              
              {currentForum.imageUrl && (
                <Box sx={{ my: 2 }}>
                  <img 
                    src={currentForum.imageUrl} 
                    alt="Discussion attachment" 
                    style={{ maxWidth: '100%', maxHeight: '300px' }} 
                  />
                </Box>
              )}
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Replies ({currentForum.replies?.length || 0})
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenReplyDialog(currentForum)}
                >
                  Add Reply
                </Button>
              </Box>
              
              {!currentForum.replies || currentForum.replies.length === 0 ? (
                <Alert severity="info">
                  No replies yet. Teachers and other students will respond soon.
                </Alert>
              ) : (
                currentForum.replies.map(reply => (
                  <Paper 
                    key={reply._id} 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      bgcolor: reply.isAnswer ? '#e8f5e9' : 
                        reply.user?.role === 'teacher' || reply.user?.role === 'admin' ? '#f0f7ff' : '#fff',
                      border: reply.isAnswer ? '1px solid #4caf50' : 'none'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle2">
                          {reply.user?.name || 'Unknown'} 
                          <Chip 
                            size="small" 
                            label={reply.user?.role || 'student'} 
                            color={reply.user?.role === 'teacher' || reply.user?.role === 'admin' ? 'primary' : 'default'}
                            sx={{ ml: 1, fontSize: '0.6rem' }}
                          />
                        </Typography>
                        {reply.isAnswer && (
                          <Chip 
                            size="small" 
                            label="Answer" 
                            color="success"
                            icon={<CheckCircleIcon />}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(reply.timestamp)}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body1" paragraph>
                      {reply.content}
                    </Typography>
                    
                    {reply.imageUrl && (
                      <Box sx={{ my: 2 }}>
                        <img 
                          src={reply.imageUrl} 
                          alt="Reply attachment" 
                          style={{ maxWidth: '100%', maxHeight: '200px' }} 
                        />
                      </Box>
                    )}
                  </Paper>
                ))
              )}
            </DialogContent>
            <DialogActions>
              <Button 
                variant="contained"
                onClick={() => handleOpenReplyDialog(currentForum)}
              >
                Reply
              </Button>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        ) : (
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Add Reply to: {currentForum?.title}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            required
            fullWidth
            id="content"
            label="Your Reply"
            name="content"
            value={replyData.content}
            onChange={handleReplyChange}
            multiline
            rows={5}
          />
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Attach Image (Optional)
            </Typography>
            <input
              accept="image/*"
              id="reply-image-upload"
              type="file"
              onChange={handleReplyImageChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="reply-image-upload">
              <Button variant="outlined" component="span">
                Upload Image
              </Button>
            </label>
            {replyData.image && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Selected: {replyData.image.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitReply}
            variant="contained"
            disabled={loading || !replyData.content}
          >
            {loading ? 'Submitting...' : 'Submit Reply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default StudentForums;
