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
  TextField,
  Avatar,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import * as forumApi from '../../api/forumApi';

const TeacherForumDetail = () => {
  const { forumId } = useParams();
  const navigate = useNavigate();
  const [forum, setForum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    const fetchForumDetails = async () => {
      try {
        setLoading(true);
        // Use the centralized forum API instead of direct axios call
        const data = await forumApi.getDiscussion(forumId);
        setForum(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching forum details:', err);
        setError('Failed to load forum details. Please try again later.');
        setLoading(false);
      }
    };
    
    if (forumId) {
      fetchForumDetails();
    }
  }, [forumId]);
  
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    
    if (!reply.trim()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Use the centralized forum API to add a reply
      const response = await forumApi.addReply(forumId, { content: reply });
      
      // Refresh the forum data to include the new reply
      const updatedForum = await forumApi.getDiscussion(forumId);
      setForum(updatedForum);
      
      // Clear the reply field
      setReply('');
      setSuccess('Reply posted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error posting reply:', err);
      setError('Failed to post reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Function to mark a reply as answer
  const handleMarkAsAnswer = async (replyId, isCurrentlyAnswer) => {
    try {
      setLoading(true);
      await forumApi.markReplyAsAnswer(forumId, replyId, !isCurrentlyAnswer);
      
      // Refresh the forum data
      const updatedForum = await forumApi.getDiscussion(forumId);
      setForum(updatedForum);
      
      setSuccess(isCurrentlyAnswer ? 'Answer marking removed' : 'Reply marked as answer');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error marking reply as answer:', err);
      setError('Failed to update answer status');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to toggle resolved status
  const handleToggleResolved = async () => {
    try {
      setLoading(true);
      await forumApi.toggleResolved(forumId, !forum.isResolved);
      
      // Refresh the forum data
      const updatedForum = await forumApi.getDiscussion(forumId);
      setForum(updatedForum);
      
      setSuccess(forum.isResolved ? 'Discussion marked as unresolved' : 'Discussion marked as resolved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error toggling resolved status:', err);
      setError('Failed to update resolved status');
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
    <div>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/teacher/forums')}
          sx={{ mr: 2 }}
        >
          Back to Forums
        </Button>
        
        {!loading && forum && (
          <Typography variant="h4">
            {forum.title}
          </Typography>
        )}
      </Box>
      
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
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : forum ? (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Forum Information
                </Typography>
                <Chip 
                  label={forum.isResolved ? 'Resolved' : 'Open'} 
                  color={forum.isResolved ? 'success' : 'warning'}
                />
              </Box>
              <Typography variant="body1">
                {forum.content || forum.description}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Posted by: {forum.user?.name || 'Unknown'} • 
                  Course: {forum.course?.title || forum.courseName || 'Unknown Course'} • 
                  Last activity: {formatDate(forum.updatedAt || forum.lastActivity || forum.createdAt)}
                </Typography>
              </Box>
              {forum.imageUrl && (
                <Box sx={{ mt: 2 }}>
                  <img 
                    src={forum.imageUrl} 
                    alt="Discussion attachment" 
                    style={{ maxWidth: '100%', maxHeight: '300px' }} 
                  />
                </Box>
              )}
            </CardContent>
          </Card>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Discussion ({forum.replies?.length || forum.posts?.length || 0} posts)
            </Typography>
            <Button
              variant="outlined"
              color={forum.isResolved ? "success" : "warning"}
              startIcon={<CheckCircleIcon />}
              onClick={handleToggleResolved}
            >
              {forum.isResolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
            </Button>
          </Box>
          
          <Paper sx={{ mb: 4 }}>
            {(!forum.replies || forum.replies.length === 0) && (!forum.posts || forum.posts.length === 0) ? (
              <Box sx={{ p: 3 }}>
                <Typography>No posts in this forum yet. Be the first to post!</Typography>
              </Box>
            ) : (
              <List>
                {/* Render replies if using new API structure */}
                {forum.replies && forum.replies.map((reply, index) => (
                  <React.Fragment key={reply._id || index}>
                    <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', width: '100%', mb: 1 }}>
                        <Avatar sx={{ mr: 2, bgcolor: reply.user?.role === 'teacher' ? 'primary.main' : 'secondary.main' }}>
                          {(reply.user?.name || 'U').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mr: 1 }}>
                              {reply.user?.name || 'Unknown'}
                            </Typography>
                            <Chip 
                              label={reply.user?.role || 'student'} 
                              size="small"
                              color={reply.user?.role === 'teacher' ? 'primary' : 'secondary'}
                              sx={{ height: 20, mr: 1 }}
                            />
                            {reply.isAnswer && (
                              <Chip 
                                size="small" 
                                label="Answer" 
                                color="success"
                                icon={<CheckCircleIcon />}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(reply.timestamp || reply.createdAt || reply.date)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ pl: 7, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {reply.content}
                        </Typography>
                        <Tooltip title={reply.isAnswer ? "Unmark as Answer" : "Mark as Answer"}>
                          <IconButton 
                            size="small" 
                            color={reply.isAnswer ? "success" : "default"}
                            onClick={() => handleMarkAsAnswer(reply._id, reply.isAnswer)}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      {reply.imageUrl && (
                        <Box sx={{ pl: 7, mt: 1 }}>
                          <img 
                            src={reply.imageUrl} 
                            alt="Reply attachment" 
                            style={{ maxWidth: '50%', maxHeight: '200px' }} 
                          />
                        </Box>
                      )}
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
                
                {/* Render posts if using old API structure */}
                {forum.posts && forum.posts.map((post, index) => (
                  <React.Fragment key={post._id || index}>
                    <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', width: '100%', mb: 1 }}>
                        <Avatar sx={{ mr: 2, bgcolor: post.authorRole === 'teacher' ? 'primary.main' : 'secondary.main' }}>
                          {(post.author || 'U').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mr: 1 }}>
                              {post.author || 'Unknown'}
                            </Typography>
                            <Chip 
                              label={post.authorRole || 'student'} 
                              size="small"
                              color={post.authorRole === 'teacher' ? 'primary' : 'secondary'}
                              sx={{ height: 20 }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(post.date)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ pl: 7, width: '100%' }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {post.content}
                        </Typography>
                      </Box>
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Post a Reply
            </Typography>
            <form onSubmit={handleReplySubmit}>
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                label="Your reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={submitting}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  endIcon={<SendIcon />}
                  disabled={!reply.trim() || submitting}
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </Button>
              </Box>
            </form>
          </Paper>
        </>
      ) : (
        <Alert severity="error">Forum not found</Alert>
      )}
    </div>
  );
};

export default TeacherForumDetail;
