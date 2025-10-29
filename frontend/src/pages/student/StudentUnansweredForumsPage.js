import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Breadcrumbs, 
  Link, 
  Paper, 
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import * as forumApi from '../../api/forumApi';

// Icons
import ForumIcon from '@mui/icons-material/Forum';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const StudentUnansweredForumsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forums, setForums] = useState([]);
  
  useEffect(() => {
    const fetchUnansweredForums = async () => {
      try {
        setLoading(true);
        const response = await forumApi.getUnansweredForums();
        setForums(response.forums);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching unanswered forums:', err);
        setError('Failed to load unanswered forums. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUnansweredForums();
  }, []);
  
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/forums" color="inherit">
          Forums
        </Link>
        <Typography color="text.primary">Unanswered Forums</Typography>
      </Breadcrumbs>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Unanswered Forum Topics
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          These forum topics have the most votes but still need answers. Can you help?
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : forums.length === 0 ? (
          <Alert severity="info" icon={<HelpOutlineIcon />}>
            No unanswered forum topics found at the moment. Great job, your community is active!
          </Alert>
        ) : (
          <List>
            {forums.map(forum => (
              <React.Fragment key={forum._id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{ 
                    '&:hover': { bgcolor: '#fafafa' }
                  }}
                  secondaryAction={
                    <Box>
                      <Tooltip title="View Discussion">
                        <IconButton 
                          edge="end" 
                          onClick={() => navigate(`/student/forum/${forum._id}`)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PriorityHighIcon 
                          color="warning" 
                          fontSize="small" 
                          sx={{ mr: 1 }} 
                        />
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
                            label={forum.course?.title || 'Unknown Course'} 
                          />
                          <Typography variant="caption" color="text.secondary">
                            Posted by: {forum.user?.name || 'Unknown'} ({forum.user?.role || 'user'})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {formatDate(forum.createdAt)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {forum.replies?.length || 0} replies (no solution yet)
                          </Typography>
                          {forum.upvotes && (
                            <Chip 
                              size="small" 
                              label={`${forum.upvotes} upvotes`}
                              color="primary"
                              variant="outlined"
                            />
                          )}
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
      </Paper>
    </Container>
  );
};

export default StudentUnansweredForumsPage;
