import React, { useState, useEffect } from 'react';
import {
  Typography, 
  Paper, 
  Box, 
  Tabs, 
  Tab, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Chip, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  CircularProgress, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Divider,
  Pagination,
  InputAdornment,
  OutlinedInput
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Import centralized forum API
import * as forumApi from '../../api/forumApi';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import FlagIcon from '@mui/icons-material/Flag';
import FilterListIcon from '@mui/icons-material/FilterList';
import MessageIcon from '@mui/icons-material/Message';
import SchoolIcon from '@mui/icons-material/School';
import RefreshIcon from '@mui/icons-material/Refresh';
import ForumIcon from '@mui/icons-material/Forum';
import SendIcon from '@mui/icons-material/Send';
import PushPinIcon from '@mui/icons-material/PushPin';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';

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

const ForumModeration = ({ currentUser }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [forums, setForums] = useState([]);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    course: 'all',
    status: 'all',
    sortBy: 'newest'
  });
  const [courses, setCourses] = useState([]);
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentForum, setCurrentForum] = useState(null);
  const [forumReplies, setForumReplies] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  
  // Load forums on initial render
  useEffect(() => {
    fetchData();
    fetchCourses();
    fetchCategories();
  }, [page, filterOptions]);
  
  // Fetch all necessary data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch forums with pagination and filters
      const { course, status, sortBy } = filterOptions;
      const filters = {
        course: course || 'all',
        status: status || 'all',
        sort: sortBy || 'newest',
        search: searchTerm
      };
      
      const result = await forumApi.getAllDiscussions(page, 10, filters);
      
      setForums(result.discussions);
      setTotalPages(result.pagination.totalPages);
      
      // Fetch flagged posts
      const flaggedRes = await axios.get('/api/admin/forums/flagged', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFlaggedPosts(flaggedRes.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching forum data:', err);
      setError('Failed to load forum data');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch courses for filter
  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/admin/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(res.data);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };
  
  // Fetch forum categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/admin/forum-categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  // Handle filter changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilterOptions(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1); // Reset to first page when filters change
  };
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilterOptions({
      course: 'all',
      status: 'all',
      sortBy: 'newest'
    });
    setSearchTerm('');
    setPage(1);
  };
  
  // Open view dialog and fetch forum details
  const handleViewForum = async (forumId) => {
    try {
      setLoading(true);
      const discussion = await forumApi.getDiscussion(forumId);
      setCurrentForum(discussion);
      setForumReplies(discussion.replies || []);
      setViewDialogOpen(true);
    } catch (err) {
      console.error('Error fetching forum details:', err);
      setError('Failed to load forum details');
    } finally {
      setLoading(false);
    }
  };
  
  // Close forum view dialog
  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setCurrentForum(null);
    setForumReplies([]);
  };
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (item, type = 'forum') => {
    setItemToDelete({ item, type });
    setDeleteDialogOpen(true);
  };
  
  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      const { item, type } = itemToDelete;
      
      if (type === 'forum') {
        await forumApi.removeDiscussion(item._id);
        
        // Update forums list
        setForums(forums.filter(forum => forum._id !== item._id));
      } else if (type === 'reply') {
        await forumApi.deleteReply(currentForum._id, item._id);
        
        // Update replies list
        setForumReplies(forumReplies.filter(reply => reply._id !== item._id));
      } else if (type === 'category') {
        await axios.delete(`/api/admin/forum-category/${item._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Update categories list
        setCategories(categories.filter(category => category._id !== item._id));
      }
      
      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(`Failed to delete ${itemToDelete.type}`);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };
  
  // Mark forum as resolved/unresolved
  const handleToggleResolved = async (forum) => {
    try {
      setLoading(true);
      const response = await forumApi.toggleResolved(forum._id, !forum.isResolved);
      
      // Update the forum in the list
      setForums(forums.map(f => 
        f._id === forum._id ? { ...f, isResolved: !f.isResolved } : f
      ));
      
      // If viewing this forum, update it in the dialog too
      if (currentForum && currentForum._id === forum._id) {
        setCurrentForum({ ...currentForum, isResolved: !currentForum.isResolved });
      }
      
      setSuccess(`Forum marked as ${!forum.isResolved ? 'resolved' : 'unresolved'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating forum status:', err);
      setError('Failed to update forum status');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle pin status of a discussion
  const handleTogglePin = async (forum) => {
    try {
      setLoading(true);
      const response = await forumApi.togglePin(forum._id, !forum.isPinned);
      
      // Update the forum in the list
      setForums(forums.map(f => 
        f._id === forum._id ? { ...f, isPinned: !f.isPinned } : f
      ));
      
      // If viewing this forum, update it in the dialog too
      if (currentForum && currentForum._id === forum._id) {
        setCurrentForum({ ...currentForum, isPinned: !currentForum.isPinned });
      }
      
      setSuccess(`Forum ${!forum.isPinned ? 'pinned' : 'unpinned'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating pin status:', err);
      setError('Failed to update pin status');
    } finally {
      setLoading(false);
    }
  };
  
  // Mark reply as answer
  const handleMarkAsAnswer = async (replyId, isCurrentlyAnswer) => {
    if (!currentForum) return;
    
    try {
      setLoading(true);
      const response = await forumApi.markReplyAsAnswer(
        currentForum._id, 
        replyId, 
        !isCurrentlyAnswer
      );
      
      // Update the reply in the list
      setForumReplies(forumReplies.map(reply => {
        if (reply._id === replyId) {
          return { ...reply, isAnswer: !isCurrentlyAnswer };
        }
        // If this reply is being marked as an answer, unmark others
        return !isCurrentlyAnswer ? { ...reply, isAnswer: false } : reply;
      }));
      
      // Update the forum's resolved status
      if (currentForum) {
        setCurrentForum({
          ...currentForum,
          isResolved: response.isResolved
        });
        
        // Also update in the forums list
        setForums(forums.map(f => 
          f._id === currentForum._id ? { ...f, isResolved: response.isResolved } : f
        ));
      }
      
      setSuccess(`Reply ${!isCurrentlyAnswer ? 'marked as answer' : 'unmarked as answer'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error marking reply as answer:', err);
      setError('Failed to update reply status');
    } finally {
      setLoading(false);
    }
  };
  
  // Open category dialog
  const handleOpenCategoryDialog = () => {
    setNewCategory({ name: '', description: '' });
    setCategoryDialogOpen(true);
  };
  
  // Handle category form input
  const handleCategoryInput = (e) => {
    const { name, value } = e.target;
    setNewCategory(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategory.name) return;
    
    try {
      setLoading(true);
      const res = await axios.post('/api/admin/forum-category', newCategory, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCategories([...categories, res.data]);
      setCategoryDialogOpen(false);
      setNewCategory({ name: '', description: '' });
      setSuccess('Category created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating category:', err);
      setError('Failed to create category');
    } finally {
      setLoading(false);
    }
  };
  
  // Reply to a forum
  const handleOpenReplyDialog = (forum) => {
    setCurrentForum(forum);
    setReplyContent('');
    setReplyDialogOpen(true);
  };
  
  // Submit reply
  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !currentForum) return;
    
    try {
      setLoading(true);
      const replyData = { 
        content: replyContent,
        isAnswer: false
      };
      
      const response = await forumApi.addReply(currentForum._id, replyData);
      
      // If the forum is currently open in the view dialog, add the reply there
      if (viewDialogOpen && currentForum) {
        setForumReplies([...forumReplies, response.reply]);
        
        // Update resolved status if it changed
        if (response.isResolved !== currentForum.isResolved) {
          setCurrentForum({
            ...currentForum,
            isResolved: response.isResolved
          });
          
          // Also update in the forums list
          setForums(forums.map(f => 
            f._id === currentForum._id ? { ...f, isResolved: response.isResolved } : f
          ));
        }
      }
      
      setReplyDialogOpen(false);
      setReplyContent('');
      setSuccess('Reply posted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error posting reply:', err);
      setError('Failed to post reply');
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
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          aria-label="forum moderation tabs"
        >
          <Tab icon={<ForumIcon />} iconPosition="start" label="Forums" />
          <Tab icon={<FlagIcon />} iconPosition="start" label="Flagged Content" />
          <Tab icon={<CategoryIcon />} iconPosition="start" label="Categories" />
        </Tabs>
      </Box>
      
      {/* Success and Error Alerts */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ m: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Forums Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>Discussion Forums</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all forum discussions across the platform. Moderate content, resolve issues, and respond to student questions.
          </Typography>
        </Box>
        
        {/* Filters and Search */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mb: 2 }}>
            <OutlinedInput
              placeholder="Search by title or content"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              }
              fullWidth
            />
            <Button type="submit" variant="contained">Search</Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="course-filter-label">Course</InputLabel>
              <Select
                labelId="course-filter-label"
                value={filterOptions.course}
                name="course"
                onChange={handleFilterChange}
                label="Course"
              >
                <MenuItem value="all">All Courses</MenuItem>
                {courses.map(course => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={filterOptions.status}
                name="status"
                onChange={handleFilterChange}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="sort-filter-label">Sort By</InputLabel>
              <Select
                labelId="sort-filter-label"
                value={filterOptions.sortBy}
                name="sortBy"
                onChange={handleFilterChange}
                label="Sort By"
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
                <MenuItem value="mostActive">Most Active</MenuItem>
                <MenuItem value="leastActive">Least Active</MenuItem>
              </Select>
            </FormControl>
            
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={resetFilters}
              variant="outlined"
            >
              Reset
            </Button>
          </Box>
        </Paper>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : forums.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No forums found matching your criteria.
          </Alert>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="forums table">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Replies</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {forums.map((forum) => (
                    <TableRow
                      key={forum._id}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        backgroundColor: forum.isPinned ? '#f5f5f5' : 'inherit'
                      }}
                    >
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {forum.isPinned && (
                            <Tooltip title="Pinned">
                              <PushPinIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                            </Tooltip>
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {forum.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          icon={<SchoolIcon />}
                          label={forum.course?.title || 'Unknown Course'} 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">
                            {forum.user?.name || 'Unknown'}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={forum.user?.role || 'unknown'} 
                            sx={{ ml: 1, fontSize: '0.6rem' }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(forum.createdAt)}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          label={forum.isResolved ? 'Resolved' : 'Open'} 
                          color={forum.isResolved ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{forum.replies?.length || 0}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Tooltip title="View Discussion">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewForum(forum._id)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reply">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenReplyDialog(forum)}
                            >
                              <MessageIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={forum.isPinned ? "Unpin" : "Pin"}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleTogglePin(forum)}
                              color={forum.isPinned ? "primary" : "default"}
                            >
                              <PushPinIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={forum.isResolved ? "Mark as Unresolved" : "Mark as Resolved"}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleToggleResolved(forum)}
                              color={forum.isResolved ? "success" : "default"}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleOpenDeleteDialog(forum, 'forum')}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
              />
            </Box>
          </>
        )}
      </TabPanel>
      
      {/* Flagged Content Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>Flagged Content</Typography>
          <Typography variant="body2" color="text.secondary">
            Review and moderate content that has been flagged by users as inappropriate or violating community guidelines.
          </Typography>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : flaggedPosts.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No flagged content to review.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {flaggedPosts.map((post) => (
              <Grid item xs={12} key={post._id}>
                <Card sx={{ bgcolor: '#fff8e1' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {post.type === 'forum' ? 'Forum Thread' : 'Forum Reply'}
                      </Typography>
                      <Chip 
                        size="small"
                        label={`${post.flagCount} ${post.flagCount === 1 ? 'flag' : 'flags'}`} 
                        color="error"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Course: {post.courseTitle || 'Unknown Course'} | 
                      Flagged on: {formatDate(post.lastFlaggedAt)}
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="body1" paragraph>
                      {post.content}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      <strong>Flag reasons:</strong> {post.flagReasons.join(', ')}
                    </Typography>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button 
                        variant="outlined" 
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewForum(post.forumId)}
                      >
                        View in Context
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => {
                          // API call to dismiss flags
                          alert('Flags dismissed - implement API call');
                        }}
                      >
                        Dismiss Flags
                      </Button>
                      <Button 
                        variant="contained" 
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleOpenDeleteDialog(post, post.type)}
                      >
                        Delete Content
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      {/* Categories Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>Forum Categories</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage categories for organizing discussion forums. Categories help students find relevant discussions more easily.
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleOpenCategoryDialog}
          >
            Add Category
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : categories.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No categories have been created yet.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="categories table">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Forums Count</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow
                    key={category._id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {category.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{category.description}</TableCell>
                    <TableCell>{category.forumsCount || 0}</TableCell>
                    <TableCell>{formatDate(category.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              // Implement edit functionality
                              alert('Edit category - implement this feature');
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleOpenDeleteDialog(category, 'category')}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
      
      {/* View Forum Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        {currentForum ? (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{currentForum.title}</Typography>
                <Chip 
                  label={currentForum.isResolved ? 'Resolved' : 'Open'} 
                  color={currentForum.isResolved ? 'success' : 'warning'}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Posted by {currentForum.createdBy?.name || 'Unknown'} ({currentForum.createdBy?.role || 'user'}) 
                  on {formatDate(currentForum.createdAt)}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Course: {currentForum.courseTitle || 'Unknown Course'}
                </Typography>
              </Box>
              
              <Typography variant="body1" paragraph>
                {currentForum.description}
              </Typography>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Replies ({forumReplies.length})
              </Typography>
              
              {forumReplies.length === 0 ? (
                <Alert severity="info">
                  No replies yet.
                </Alert>
              ) : (
                forumReplies.map((reply) => (
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
                    
                    <Typography variant="body1">
                      {reply.content}
                    </Typography>
                    
                    {reply.imageUrl && (
                      <Box sx={{ mt: 2 }}>
                        <img 
                          src={reply.imageUrl} 
                          alt="Reply attachment" 
                          style={{ maxWidth: '100%', maxHeight: '200px' }} 
                        />
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Tooltip title={reply.isAnswer ? "Unmark as Answer" : "Mark as Answer"}>
                        <IconButton 
                          size="small" 
                          color={reply.isAnswer ? "success" : "default"}
                          onClick={() => handleMarkAsAnswer(reply._id, reply.isAnswer)}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleOpenDeleteDialog(reply, 'reply')}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                ))
              )}
            </DialogContent>
            <DialogActions>
              <Button 
                startIcon={<MessageIcon />}
                onClick={() => {
                  handleCloseViewDialog();
                  handleOpenReplyDialog(currentForum);
                }}
              >
                Reply
              </Button>
              <Button 
                startIcon={currentForum.isResolved ? <BlockIcon /> : <CheckCircleIcon />}
                onClick={() => handleToggleResolved(currentForum)}
                color={currentForum.isResolved ? 'warning' : 'success'}
              >
                Mark as {currentForum.isResolved ? 'Unresolved' : 'Resolved'}
              </Button>
              <Button onClick={handleCloseViewDialog}>Close</Button>
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Category Dialog */}
      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
      >
        <DialogTitle>Add Forum Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
            fullWidth
            variant="outlined"
            value={newCategory.name}
            onChange={handleCategoryInput}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newCategory.description}
            onChange={handleCategoryInput}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateCategory} 
            variant="contained"
            disabled={!newCategory.name || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reply Dialog */}
      <Dialog
        open={replyDialogOpen}
        onClose={() => setReplyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Post Reply to: {currentForum?.title}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            multiline
            rows={5}
            label="Your Reply"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitReply} 
            variant="contained"
            disabled={!replyContent.trim() || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Post Reply
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ForumModeration;
