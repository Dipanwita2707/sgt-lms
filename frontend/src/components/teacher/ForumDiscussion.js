import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Container,
  Avatar,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import { useParams, Link } from 'react-router-dom';
import { getForumDiscussion, postForumReply } from '../../api/teacherApi';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SchoolIcon from '@mui/icons-material/School';

const ForumDiscussion = ({ token, user }) => {
  const { forumId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [forum, setForum] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    const fetchForumDetails = async () => {
      try {
        setLoading(true);
        const data = await getForumDiscussion(forumId, token);
        setForum(data.forum || null);
        setReplies(data.replies || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching forum details:', err);
        setError('Failed to load forum discussion');
      } finally {
        setLoading(false);
      }
    };
    
    if (forumId && token) {
      fetchForumDetails();
    }
  }, [forumId, token]);
  
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      const newReply = await postForumReply(forumId, replyContent, token);
      
      // Add the new reply to the list
      setReplies([...replies, newReply]);
      setReplyContent('');
      setSuccess('Reply posted successfully');
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error posting reply:', err);
      setError(err.response?.data?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !forum) {
    return (
      <Container>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button 
          variant="outlined" 
          component={Link} 
          to="/teacher/forums"
          startIcon={<ArrowBackIcon />}
        >
          Back to Forums
        </Button>
      </Container>
    );
  }
  
  if (!forum) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mb: 3 }}>Forum not found or you do not have access</Alert>
        <Button 
          variant="outlined" 
          component={Link} 
          to="/teacher/forums"
          startIcon={<ArrowBackIcon />}
        >
          Back to Forums
        </Button>
      </Container>
    );
  }
  
  return (
    <Container>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Button 
          variant="text" 
          component={Link} 
          to="/teacher/forums"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back to Forums
        </Button>
        <Chip 
          icon={<SchoolIcon />}
          label={forum.courseTitle}
          color="primary"
          variant="outlined"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Chip 
          label={forum.isResolved ? 'Resolved' : 'Open'} 
          color={forum.isResolved ? 'success' : 'warning'}
        />
      </Box>
      
      <Typography variant="h5" gutterBottom>
        {forum.title}
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                {forum.createdBy?.name?.charAt(0) || 'S'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1">
                  {forum.createdBy?.name || 'Unknown'} 
                  {forum.createdBy?.role && (
                    <Chip 
                      size="small" 
                      label={forum.createdBy.role} 
                      sx={{ ml: 1, fontSize: '0.7rem' }}
                    />
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Posted on {formatDate(forum.createdAt)}
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="body1" paragraph>
              {forum.description}
            </Typography>
          </CardContent>
        </Card>
        
        {replies.length > 0 ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              Replies ({replies.length})
            </Typography>
            
            {replies.map((reply) => (
              <Paper key={reply._id} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: reply.createdBy?.role === 'teacher' ? 'secondary.main' : 'primary.main' }}>
                    {reply.createdBy?.name?.charAt(0) || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {reply.createdBy?.name || 'Unknown'} 
                      {reply.createdBy?.role && (
                        <Chip 
                          size="small" 
                          label={reply.createdBy.role} 
                          color={reply.createdBy?.role === 'teacher' ? 'secondary' : 'primary'}
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Replied on {formatDate(reply.createdAt)}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body1">
                  {reply.content}
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            No replies yet. Be the first to respond!
          </Alert>
        )}
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Post a Reply
        </Typography>
        <Box component="form" onSubmit={handleSubmitReply}>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Type your reply here..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            disabled={submitting}
            required
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting || !replyContent.trim()}
              startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {submitting ? 'Posting...' : 'Post Reply'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForumDiscussion;
