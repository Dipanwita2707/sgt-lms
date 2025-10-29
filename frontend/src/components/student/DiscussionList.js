import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Divider, 
  Button, 
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Alert
} from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { getCourseDiscussions, createDiscussion } from '../../api/discussionApi';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import ForumIcon from '@mui/icons-material/Forum';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PersonIcon from '@mui/icons-material/Person';

const DiscussionList = ({ token, user }) => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [discussions, setDiscussions] = useState([]);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchDiscussions();
  }, [courseId, token]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const data = await getCourseDiscussions(courseId, token);
      setDiscussions(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching discussions:', err);
      setError('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setNewDiscussion({
      title: '',
      content: '',
      image: null
    });
    setImagePreview(null);
    setFormError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDiscussion(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image size must be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setFormError('Only image files are allowed');
        return;
      }
      
      setNewDiscussion(prev => ({
        ...prev,
        image: file
      }));
      
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setFormError('');
    }
  };

  const handleRemoveImage = () => {
    setNewDiscussion(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    // Validate form
    if (!newDiscussion.title.trim()) {
      setFormError('Title is required');
      return;
    }
    
    if (!newDiscussion.content.trim()) {
      setFormError('Content is required');
      return;
    }
    
    try {
      setSubmitting(true);
      setFormError('');
      
      await createDiscussion(
        {
          courseId,
          title: newDiscussion.title,
          content: newDiscussion.content,
          image: newDiscussion.image
        },
        token
      );
      
      // Refresh discussions list
      await fetchDiscussions();
      
      // Close dialog
      setOpenDialog(false);
    } catch (err) {
      console.error('Error creating discussion:', err);
      setFormError('Failed to create discussion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get user role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'teacher':
        return 'success';
      case 'student':
        return 'primary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Discussion Forum</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          New Discussion
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {discussions.length === 0 ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <ForumIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No discussions yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Be the first to start a discussion in this course.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <List sx={{ bgcolor: 'background.paper' }}>
          {discussions.map((discussion) => (
            <Card key={discussion._id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {discussion.user?.name || 'Unknown User'}
                      </Typography>
                      <Chip 
                        label={discussion.user?.role || 'unknown'}
                        size="small"
                        color={getRoleBadgeColor(discussion.user?.role)}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(discussion.timestamp)}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h6" gutterBottom>
                  {discussion.title}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {discussion.content.length > 200 
                    ? `${discussion.content.substring(0, 200)}...` 
                    : discussion.content}
                </Typography>

                {discussion.imageUrl && (
                  <Box sx={{ mb: 2 }}>
                    <img 
                      src={discussion.imageUrl} 
                      alt="Discussion" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: 200, 
                        borderRadius: 4,
                        display: 'block'
                      }} 
                    />
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ChatBubbleOutlineIcon sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {discussion.replies?.length || 0} replies
                    </Typography>
                  </Box>

                  <Button 
                    component={Link} 
                    to={`/student/course/${courseId}/discussion/${discussion._id}`}
                    color="primary"
                  >
                    View Discussion
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      {/* New Discussion Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Start New Discussion</Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseDialog} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            id="title"
            name="title"
            label="Discussion Title"
            type="text"
            fullWidth
            variant="outlined"
            value={newDiscussion.title}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="content"
            name="content"
            label="Discussion Content"
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            value={newDiscussion.content}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ mb: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="image-upload"
              type="file"
              onChange={handleImageChange}
            />
            <label htmlFor="image-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<ImageIcon />}
              >
                Add Image
              </Button>
            </label>
          </Box>
          
          {imagePreview && (
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 300, 
                  borderRadius: 4,
                  display: 'block'
                }} 
              />
              <IconButton
                sx={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)'
                  },
                  p: 0.5
                }}
                onClick={handleRemoveImage}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit" disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Posting...' : 'Post Discussion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscussionList;
