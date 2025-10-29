import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Avatar,
  TextField,
  Divider,
  IconButton,
  Alert,
  Paper,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiscussion, addReply, deleteDiscussion, deleteReply } from '../../api/discussionApi';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';

const DiscussionDetail = ({ token, user }) => {
  const { courseId, discussionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [discussion, setDiscussion] = useState(null);
  const [error, setError] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState(null);

  useEffect(() => {
    fetchDiscussion();
  }, [discussionId, token]);

  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const data = await getDiscussion(discussionId, token);
      setDiscussion(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching discussion:', err);
      setError('Failed to load discussion');
    } finally {
      setLoading(false);
    }
  };

  const handleReplyContentChange = (e) => {
    setReplyContent(e.target.value);
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
      
      setReplyImage(file);
      
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
    setReplyImage(null);
    setImagePreview(null);
  };

  const handleSubmitReply = async () => {
    // Validate form
    if (!replyContent.trim()) {
      setFormError('Reply content is required');
      return;
    }
    
    try {
      setSubmitting(true);
      setFormError('');
      
      await addReply(
        discussionId,
        {
          content: replyContent,
          image: replyImage
        },
        token
      );
      
      // Reset form
      setReplyContent('');
      setReplyImage(null);
      setImagePreview(null);
      
      // Refresh discussion data
      await fetchDiscussion();
    } catch (err) {
      console.error('Error adding reply:', err);
      setFormError('Failed to add reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDiscussion = async () => {
    try {
      await deleteDiscussion(discussionId, token);
      // Redirect back to discussions list
      navigate(`/student/course/${courseId}/discussions`);
    } catch (err) {
      console.error('Error deleting discussion:', err);
      setError('Failed to delete discussion');
    }
  };

  const openDeleteReplyDialog = (replyId) => {
    setDeletingReplyId(replyId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteReply = async () => {
    if (!deletingReplyId) return;
    
    try {
      await deleteReply(discussionId, deletingReplyId, token);
      // Refresh discussion data
      await fetchDiscussion();
      // Close dialog
      setDeleteDialogOpen(false);
      setDeletingReplyId(null);
    } catch (err) {
      console.error('Error deleting reply:', err);
      setError('Failed to delete reply');
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

  // Check if user can delete (admin or owner)
  const canDeleteDiscussion = user && (
    user.role === 'admin' || 
    (discussion?.user?._id === user._id)
  );

  const canDeleteReply = (reply) => user && (
    user.role === 'admin' || 
    (reply.user?._id === user._id)
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!discussion) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Discussion not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/student/course/${courseId}/discussions`)}
        >
          Back to Discussions
        </Button>
        
        {canDeleteDiscussion && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Discussion
          </Button>
        )}
      </Box>

      {/* Main Discussion */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ mr: 2 }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight="bold">
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

          <Typography variant="h5" gutterBottom>
            {discussion.title}
          </Typography>

          <Typography variant="body1" paragraph>
            {discussion.content}
          </Typography>

          {discussion.imageUrl && (
            <Box sx={{ mb: 2 }}>
              <img 
                src={discussion.imageUrl} 
                alt="Discussion" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 400, 
                  borderRadius: 4 
                }} 
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Replies Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Replies ({discussion.replies?.length || 0})
        </Typography>

        {discussion.replies && discussion.replies.length > 0 ? (
          discussion.replies.map((reply) => (
            <Paper key={reply._id} elevation={1} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {reply.user?.name || 'Unknown User'}
                      </Typography>
                      <Chip 
                        label={reply.user?.role || 'unknown'}
                        size="small"
                        color={getRoleBadgeColor(reply.user?.role)}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(reply.timestamp)}
                    </Typography>
                  </Box>
                </Box>

                {canDeleteReply(reply) && (
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => openDeleteReplyDialog(reply._id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {reply.content}
              </Typography>

              {reply.imageUrl && (
                <Box sx={{ mb: 1 }}>
                  <img 
                    src={reply.imageUrl} 
                    alt="Reply" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: 300, 
                      borderRadius: 4 
                    }} 
                  />
                </Box>
              )}
            </Paper>
          ))
        ) : (
          <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No replies yet. Be the first to reply!
            </Typography>
          </Box>
        )}
      </Box>

      {/* Add Reply Form */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add Your Reply
        </Typography>

        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Write your reply here..."
          value={replyContent}
          onChange={handleReplyContentChange}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="reply-image-upload"
              type="file"
              onChange={handleImageChange}
            />
            <label htmlFor="reply-image-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<ImageIcon />}
              >
                Add Image
              </Button>
            </label>

            {imagePreview && (
              <Box sx={{ position: 'relative', display: 'inline-block', ml: 2 }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    height: 40, 
                    width: 'auto',
                    borderRadius: 4,
                    display: 'block'
                  }} 
                />
                <IconButton
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)'
                    },
                    p: 0.5
                  }}
                  size="small"
                  onClick={handleRemoveImage}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            endIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
            onClick={handleSubmitReply}
            disabled={submitting || !replyContent.trim()}
          >
            {submitting ? 'Sending...' : 'Send Reply'}
          </Button>
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          {deletingReplyId ? "Delete Reply" : "Delete Discussion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deletingReplyId 
              ? "Are you sure you want to delete this reply? This action cannot be undone."
              : "Are you sure you want to delete this discussion? All replies will also be deleted. This action cannot be undone."
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={deletingReplyId ? handleDeleteReply : handleDeleteDiscussion} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscussionDetail;
