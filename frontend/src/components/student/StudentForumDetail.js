import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Divider, 
  Avatar, 
  Button, 
  TextField, 
  CircularProgress, 
  Alert,
  Chip,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import * as forumApi from '../../api/forumApi';
import { useParams, useNavigate } from 'react-router-dom';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PushPinIcon from '@mui/icons-material/PushPin';
import SchoolIcon from '@mui/icons-material/School';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PersonIcon from '@mui/icons-material/Person';
import MarkAsResolvedIcon from '@mui/icons-material/DoneAll';

const StudentForumDetail = () => {
  const { forumId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // State
  const [forum, setForum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Reply state
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  
  // Image preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  
  useEffect(() => {
    fetchForumDetails();
  }, [forumId]);
  
  const fetchForumDetails = async () => {
    try {
      setLoading(true);
      const forumData = await forumApi.getDiscussion(forumId);
      setForum(forumData);
    } catch (err) {
      console.error('Error fetching forum details:', err);
      setError('Failed to load discussion. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      setError('Reply content cannot be empty');
      return;
    }
    
    try {
      setSubmittingReply(true);
      
      const replyData = {
        content: replyContent,
        image: replyImage
      };
      
      const result = await forumApi.addReply(forumId, replyData);
      
      // Update the forum with the new reply
      setForum(prevForum => ({
        ...prevForum,
        replies: [...prevForum.replies, result.reply]
      }));
      
      // Reset form
      setReplyContent('');
      setReplyImage(null);
      setSuccess('Reply added successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error submitting reply:', err);
      setError('Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };
  
  const handleMarkAsResolved = async () => {
    try {
      setLoading(true);
      await forumApi.toggleResolved(forumId, true);
      
      // Update the forum status
      setForum(prevForum => ({
        ...prevForum,
        isResolved: true
      }));
      
      setSuccess('Discussion marked as resolved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error marking as resolved:', err);
      setError('Failed to mark as resolved. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReplyImage(e.target.files[0]);
    }
  };
  
  const handlePreviewImage = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewOpen(true);
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
  
  if (loading && !forum) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !forum) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
        <Button 
          variant="outlined" 
          size="small" 
          sx={{ ml: 2 }}
          onClick={() => navigate('/student/forums')}
        >
          Back to Forums
        </Button>
      </Alert>
    );
  }
  
  if (!forum) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        Discussion not found or you don't have permission to view it.
        <Button 
          variant="outlined" 
          size="small" 
          sx={{ ml: 2 }}
          onClick={() => navigate('/student/forums')}
        >
          Back to Forums
        </Button>
      </Alert>
    );
  }
  
  const canMarkAsResolved = forum.user && forum.user._id === localStorage.getItem('userId') && !forum.isResolved;
  
  return (
    <Paper sx={{ p: 3 }}>
      {/* Success and Error Messages */}
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
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/student/forums')}
        >
          Back to Forums
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={forum.isResolved ? 'Resolved' : 'Open'} 
            color={forum.isResolved ? 'success' : 'warning'}
            icon={forum.isResolved ? <CheckCircleIcon /> : undefined}
          />
          
          {forum.isPinned && (
            <Chip 
              icon={<PushPinIcon />}
              label="Pinned" 
              color="primary"
            />
          )}
          
          {canMarkAsResolved && (
            <Button 
              variant="outlined"
              color="success"
              startIcon={<MarkAsResolvedIcon />}
              onClick={handleMarkAsResolved}
              disabled={loading}
            >
              Mark as Resolved
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Main Discussion Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {forum.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1">
                {forum.user?.name || 'Unknown User'}
                <Chip 
                  size="small" 
                  label={forum.user?.role || 'student'} 
                  color="default"
                  sx={{ ml: 1, fontSize: '0.7rem' }}
                />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Posted on {formatDate(forum.createdAt)}
              </Typography>
            </Box>
          </Box>
          
          <Chip 
            size="small" 
            icon={<SchoolIcon />}
            label={`Course: ${forum.course?.title || 'Unknown Course'}`} 
            sx={{ mb: 2 }}
          />
          
          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
            {forum.content}
          </Typography>
          
          {forum.imageUrl && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <img 
                src={forum.imageUrl} 
                alt="Discussion attachment" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '400px', 
                  cursor: 'pointer',
                  border: '1px solid #eee',
                  borderRadius: '4px'
                }} 
                onClick={() => handlePreviewImage(forum.imageUrl)}
              />
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* Replies Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Replies ({forum.replies?.length || 0})
        </Typography>
        
        <Divider sx={{ mb: 3 }} />
        
        {!forum.replies || forum.replies.length === 0 ? (
          <Alert severity="info" sx={{ mb: 4 }}>
            No replies yet. Be the first to respond!
          </Alert>
        ) : (
          <Box sx={{ mb: 4 }}>
            {forum.replies.map((reply, index) => (
              <Paper 
                key={reply._id} 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: reply.isAnswer ? '#e8f5e9' : 
                    reply.user?.role === 'teacher' || reply.user?.role === 'admin' ? '#f0f7ff' : '#fff',
                  border: reply.isAnswer ? '1px solid #4caf50' : 'none'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 1, bgcolor: reply.user?.role === 'teacher' ? 'secondary.main' : 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1">
                        {reply.user?.name || 'Unknown'}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={reply.user?.role || 'student'} 
                        color={reply.user?.role === 'teacher' || reply.user?.role === 'admin' ? 'primary' : 'default'}
                        sx={{ ml: 1, fontSize: '0.7rem' }}
                      />
                      {reply.isAnswer && (
                        <Chip 
                          size="small" 
                          icon={<CheckCircleIcon />}
                          label="Marked as Answer" 
                          color="success"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(reply.createdAt || reply.timestamp)}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
                  {reply.content}
                </Typography>
                
                {reply.imageUrl && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <img 
                      src={reply.imageUrl} 
                      alt="Reply attachment" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px',
                        cursor: 'pointer',
                        border: '1px solid #eee',
                        borderRadius: '4px'
                      }} 
                      onClick={() => handlePreviewImage(reply.imageUrl)}
                    />
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Box>
      
      {/* Reply Form */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add Your Reply
        </Typography>
        
        <form onSubmit={handleReplySubmit}>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Write your reply here..."
            variant="outlined"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="reply-image-upload"
                type="file"
                onChange={handleImageChange}
              />
              <label htmlFor="reply-image-upload">
                <Button
                  component="span"
                  startIcon={<AttachFileIcon />}
                  variant="outlined"
                >
                  Attach Image
                </Button>
              </label>
              
              {replyImage && (
                <Typography variant="caption" sx={{ ml: 2 }}>
                  {replyImage.name}
                </Typography>
              )}
            </Box>
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              disabled={!replyContent.trim() || submittingReply}
            >
              {submittingReply ? 'Submitting...' : 'Submit Reply'}
            </Button>
          </Box>
        </form>
      </Paper>
      
      {/* Image Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
      >
        <DialogContent>
          <img 
            src={previewImage} 
            alt="Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '80vh' 
            }} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button 
            component="a" 
            href={previewImage} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Open in New Tab
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default StudentForumDetail;
