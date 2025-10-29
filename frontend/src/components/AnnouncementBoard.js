import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Box, Typography, Paper, Divider, TextField, Button, Checkbox, 
  FormControlLabel, Select, MenuItem, FormControl, InputLabel, Card, 
  CardContent, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, Tooltip, Chip, useTheme, Grid, List, ListItem,
  ListItemText, ListItemIcon, Collapse, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Badge from '@mui/material/Badge';
import TeacherAnnouncementComponent from './TeacherAnnouncementComponent';
import NotificationsIcon from '@mui/icons-material/Notifications';

const AnnouncementBoard = ({ role, token, teacherCourses, userId }) => {
  const theme = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState([]); // For admin
  const [selectedCourse, setSelectedCourse] = useState(''); // For teacher
  const [canAnnounce, setCanAnnounce] = useState(false); // For teacher
  const [loading, setLoading] = useState(false);
  
  // States for edit/delete functionality
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [editMessage, setEditMessage] = useState('');
  const [editRecipients, setEditRecipients] = useState([]);
  
  // State for edit history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [announcementHistory, setAnnouncementHistory] = useState(null);
  const [expandedHistoryItems, setExpandedHistoryItems] = useState({});
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState('success');
  // Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false); // blink trigger for new admin announcements
  const announcementRefs = useRef({});
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    // Fetch announcements (filtered by role/course)
    fetchAnnouncements();
    
    // Fetch teacher permission if role is teacher and a valid userId exists
    if (role === 'teacher' && userId) {
      axios.get(`/api/teacher/${userId}/can-announce`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setCanAnnounce(Boolean(res.data?.canAnnounce)))
        .catch(() => setCanAnnounce(false));
    } else if (role === 'teacher') {
      setCanAnnounce(false);
    }
  }, [role, token, userId]);

  // Poll unread notification count + detect unread announcements every 10s
  useEffect(() => {
    if (!token) return;
    const poll = async () => {
      try {
        const countRes = await axios.get('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } });
        const totalUnread = countRes.data.unread || 0;
        setUnreadCount(totalUnread);
        if (totalUnread > 0) {
          // Fetch notifications to identify announcement-specific unread items
            const listRes = await axios.get('/api/notifications?page=1&limit=50', { headers: { Authorization: `Bearer ${token}` } });
            const list = listRes.data.notifications || listRes.data || [];
            const hasUnreadAnn = list.some(n => !n.read && n.type === 'announcement');
            setHasNewAnnouncement(hasUnreadAnn);
        } else {
          setHasNewAnnouncement(false);
        }
      } catch (_) {
        /* ignore */
      }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const loadNotifications = () => {
    axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const list = res.data.notifications || res.data || [];
        setNotifications(list);
      })
      .catch(() => setNotifications([]));
  };

  const handleNotificationClick = () => {
    if (!showNotifications) {
      loadNotifications();
      if (unreadCount > 0) {
        axios.patch('/api/notifications/mark-all/read', {}, { headers: { Authorization: `Bearer ${token}` } })
          .then(() => setUnreadCount(0))
          .catch(() => {});
      }
    }
    setShowNotifications(prev => !prev);
  // Clear announcement blink when opened
  if (!showNotifications) setHasNewAnnouncement(false);
  };

  const goToItem = (n) => {
    if (n.type === 'announcement' && (n.data?.announcementId || n.announcement)) {
      const annId = n.data?.announcementId || n.announcement;
      setShowNotifications(false);
      // Scroll after panel closes
      setTimeout(() => {
        const el = announcementRefs.current[annId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(annId);
          setTimeout(() => setHighlightedId(null), 2500);
        }
      }, 150);
    }
  };
  
  const fetchAnnouncements = () => {
  axios.get('/api/announcements', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        // Ensure we always set an array, handle different response formats
        const data = res.data;
        if (Array.isArray(data)) {
          setAnnouncements(data);
        } else if (data && Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        } else {
          setAnnouncements([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch announcements:', err);
        setAlertMessage('Failed to fetch announcements');
        setAlertSeverity('error');
        setShowAlert(true);
        setAnnouncements([]);
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Only admin and authorized teachers can post announcements
      if (role === 'admin') {
        await axios.post('/api/admin/announcement', { message, recipients }, { headers: { Authorization: `Bearer ${token}` } });
        setAlertMessage('Announcement posted successfully');
        setAlertSeverity('success');
      } else if (role === 'teacher' && canAnnounce && selectedCourse) {
        await axios.post(`/api/teacher/course/${selectedCourse}/announcement`, { message }, { headers: { Authorization: `Bearer ${token}` } });
        setAlertMessage('Announcement posted successfully');
        setAlertSeverity('success');
      }
      setMessage('');
      setRecipients([]);
      setSelectedCourse('');
      setShowAlert(true);
      
      // Refresh announcements
      fetchAnnouncements();
    } catch (err) {
      setAlertMessage('Failed to post announcement');
      setAlertSeverity('error');
      setShowAlert(true);
    }
    setLoading(false);
  };
  
  // Handle edit announcement
  const handleEditClick = (announcement) => {
    setSelectedAnnouncement(announcement);
    setEditMessage(announcement.message);
    setEditRecipients(announcement.recipients || []);
    setEditDialogOpen(true);
  };
  
  const handleEditSubmit = async () => {
    try {
      await axios.put(`/api/admin/announcement/${selectedAnnouncement._id}`, {
        message: editMessage,
        recipients: editRecipients
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setEditDialogOpen(false);
      setAlertMessage('Announcement updated successfully');
      setAlertSeverity('success');
      setShowAlert(true);
      fetchAnnouncements();
    } catch (err) {
      setAlertMessage('Failed to update announcement');
      setAlertSeverity('error');
      setShowAlert(true);
    }
  };
  
  // Handle delete announcement
  const handleDeleteClick = (announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`/api/admin/announcement/${selectedAnnouncement._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDeleteDialogOpen(false);
      setAlertMessage('Announcement deleted successfully');
      setAlertSeverity('success');
      setShowAlert(true);
      fetchAnnouncements();
    } catch (err) {
      setAlertMessage('Failed to delete announcement');
      setAlertSeverity('error');
      setShowAlert(true);
    }
  };

  // View edit history of an announcement
  const handleViewHistory = async (announcement) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/announcements/${announcement._id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAnnouncementHistory(response.data);
      setHistoryDialogOpen(true);
      setLoading(false);
    } catch (err) {
      setAlertMessage('Failed to fetch edit history');
      setAlertSeverity('error');
      setShowAlert(true);
      setLoading(false);
    }
  };
  
  // Toggle the expanded state of a history item
  const toggleHistoryItem = (index) => {
    setExpandedHistoryItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Format date to a readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      {/* Header Bar */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: theme.palette.primary.contrastText,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          boxShadow: `0 4px 14px ${theme.palette.primary.main}55`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AnnouncementIcon sx={{ mr: 1.5, fontSize: 36, opacity: 0.9 }} />
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
                letterSpacing: 0.5,
                lineHeight: 1.1
              }}
            >
              Announcements Board
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Stay updated with the latest information
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <style>{`@keyframes pulseGlow {0%{box-shadow:0 0 0 0 rgba(255,255,255,0.6);}70%{box-shadow:0 0 0 12px rgba(255,255,255,0);}100%{box-shadow:0 0 0 0 rgba(255,255,255,0);}}`}</style>
          <Tooltip title={hasNewAnnouncement ? 'New announcement' : 'Notifications'}>
            <IconButton
              onClick={handleNotificationClick}
              sx={{
                position: 'relative',
                bgcolor: hasNewAnnouncement ? 'error.light' : 'rgba(255,255,255,0.15)',
                color: 'white',
                '&:hover': { bgcolor: hasNewAnnouncement ? 'error.main' : 'rgba(255,255,255,0.25)' },
                animation: hasNewAnnouncement ? 'pulseGlow 1.6s infinite' : 'none'
              }}
            >
              <Badge
                color="error"
                variant={unreadCount > 0 ? 'standard' : 'dot'}
                badgeContent={unreadCount > 99 ? '99+' : unreadCount}
                invisible={unreadCount === 0}
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {showNotifications && (
        <Paper elevation={3} sx={{ mb: 3, p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Notifications</Typography>
          {notifications.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No notifications</Typography>
          ) : (
            <List dense>
              {notifications.map(n => (
                <ListItem 
                  key={n._id} 
                  button 
                  onClick={() => goToItem(n)} 
                  sx={{ bgcolor: !n.read ? 'action.hover' : 'transparent', borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText 
                    primary={n.message} 
                    secondary={n.createdAt ? new Date(n.createdAt).toLocaleString() : ''} 
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}
      {/* Alert for success/error messages */}
      {showAlert && (
        <Alert 
          severity={alertSeverity} 
          sx={{ mb: 3 }}
          onClose={() => setShowAlert(false)}
        >
          {alertMessage}
        </Alert>
      )}
      
  {/* Title is now inside colored header bar above */}
      
      {/* Only show the form for admin and teacher roles */}
      {role !== 'student' && (
        <Box sx={{ mb: 4 }}>
          {/* Teacher gets specialized section-based announcement component */}
          {role === 'teacher' ? (
            <TeacherAnnouncementComponent user={{ name, userId, role }} />
          ) : (
            /* Admin announcement form */
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                background: `linear-gradient(to right, ${theme.palette.primary.light}15, ${theme.palette.background.paper})`,
                border: `1px solid ${theme.palette.primary.light}`,
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.dark, fontWeight: 'bold' }}>
                Post New Announcement
              </Typography>
              <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your announcement here..."
                required
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
              
              {role === 'admin' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: theme.palette.text.secondary }}>
                    Recipients:
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={recipients.includes('teacher')}
                        onChange={e => {
                          if (e.target.checked) setRecipients([...recipients, 'teacher']);
                          else setRecipients(recipients.filter(r => r !== 'teacher'));
                        }}
                        sx={{ color: theme.palette.primary.main }}
                      />
                    }
                    label="Teachers"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={recipients.includes('student')}
                        onChange={e => {
                          if (e.target.checked) setRecipients([...recipients, 'student']);
                          else setRecipients(recipients.filter(r => r !== 'student'));
                        }}
                        sx={{ color: theme.palette.primary.main }}
                      />
                    }
                    label="Students"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={recipients.includes('hod')}
                        onChange={e => {
                          if (e.target.checked) setRecipients([...recipients, 'hod']);
                          else setRecipients(recipients.filter(r => r !== 'hod'));
                        }}
                        sx={{ color: theme.palette.primary.main }}
                      />
                    }
                    label="HODs"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={recipients.includes('dean')}
                        onChange={e => {
                          if (e.target.checked) setRecipients([...recipients, 'dean']);
                          else setRecipients(recipients.filter(r => r !== 'dean'));
                        }}
                        sx={{ color: theme.palette.primary.main }}
                      />
                    }
                    label="Deans"
                  />
                </Box>
              )}
              
              {role === 'teacher' && canAnnounce && teacherCourses && teacherCourses.length > 0 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Course</InputLabel>
                <Select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  required
                >
                  <MenuItem value="">
                    <em>Select a course</em>
                  </MenuItem>
                  {teacherCourses.map(c => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
              
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading || (role === 'teacher' && !canAnnounce) || (role === 'admin' && recipients.length === 0)}
                sx={{ 
                  fontWeight: 'bold',
                  textTransform: 'none',
                  px: 3,
                  py: 1
                }}
              >
                Post Announcement
              </Button>
              </form>
            </Paper>
          )}
        </Box>
      )}
      
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          color: theme.palette.primary.dark,
          fontWeight: 'bold',
          mb: 2,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <EventIcon sx={{ mr: 1 }} />
        Recent Announcements
      </Typography>

      {/* Admin tools section */}
      {(role === 'admin') && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<HistoryIcon />}
            size="small"
            onClick={() => {
              setAlertMessage('This feature will allow viewing all announcement history');
              setAlertSeverity('info');
              setShowAlert(true);
            }}
            sx={{ mr: 1 }}
          >
            View All Edit History
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AnnouncementIcon />}
            size="small"
            onClick={() => {
              window.location.href = '/admin/announcements';
            }}
          >
            Manage All Announcements
          </Button>
        </Box>
      )}
      
      {/* Show announcements list with safe array check */}
      {!Array.isArray(announcements) || announcements.length === 0 ? (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 3, 
            textAlign: 'center',
            backgroundColor: theme.palette.grey[50],
            borderRadius: 2
          }}
        >
          <Typography variant="body1" color="textSecondary">
            {!Array.isArray(announcements) ? 'Error loading announcements.' : 'No announcements to display.'}
          </Typography>
        </Paper>
      ) : (
        <Box>
          {announcements.map(announcement => (
            <Card 
              key={announcement._id} 
              ref={el => { if (el) announcementRefs.current[announcement._id] = el; }}
              sx={{ 
                mb: 2, 
                borderRadius: 2, 
                overflow: 'visible',
                position: 'relative',
                transition: 'all 0.2s ease-in-out',
                border: highlightedId === announcement._id ? `2px solid ${theme.palette.warning.main}` : `1px solid ${theme.palette.grey[200]}`,
                '&:hover': {
                  boxShadow: `0 5px 15px ${theme.palette.primary.light}30`,
                  borderColor: theme.palette.primary.light
                },
                boxShadow: highlightedId === announcement._id ? `0 0 0 3px ${theme.palette.warning.light}55` : undefined
              }}
            >
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ mb: 1 }}>
                      <Typography 
                        variant="body1" 
                        component="div"
                        sx={{ 
                          fontSize: '1rem',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {announcement.message}
                      </Typography>
                      {announcement.isEdited && (
                        <Box sx={{ mt: 1 }}>
                          <Tooltip title={announcement.lastEditedBy ? `Last edited by ${announcement.lastEditedBy.name} on ${formatDate(announcement.lastEditedAt)}` : 'Edited'}>
                            <Chip 
                              label="Edited" 
                              size="small" 
                              color="info" 
                              sx={{ height: 20, fontSize: '0.7rem' }}
                              icon={<EditIcon style={{ fontSize: '0.8rem' }} />}
                            />
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  alignItems: 'center', 
                  fontSize: '0.875rem', 
                  color: theme.palette.text.secondary 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.primary.main }} />
                    <Typography variant="caption" component="span" sx={{ fontWeight: 'medium' }}>
                      {announcement.sender?.name || 'Unknown'} 
                      {announcement.sender?.teacherId ? ` (ID: ${announcement.sender.teacherId})` : ''} 
                      {announcement.role === 'admin' ? ' (Administrator)' : 
                       announcement.role === 'teacher' ? ' (Teacher)' : ''}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {announcement.course ? (
                      <>
                        <MenuBookIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.primary.main }} />
                        <Typography variant="caption" component="span">
                          Course: {announcement.course.title}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <GroupsIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.primary.main }} />
                        <Typography variant="caption" component="span">
                          To: {announcement.recipients?.map(r => {
                            const roleMap = {
                              'teacher': 'Teachers',
                              'student': 'Students', 
                              'hod': 'HODs',
                              'dean': 'Deans',
                              'admin': 'Administrators'
                            };
                            return roleMap[r] || r.charAt(0).toUpperCase() + r.slice(1) + 's';
                          }).join(', ')}
                        </Typography>
                      </>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EventIcon fontSize="small" sx={{ mr: 0.5, color: theme.palette.primary.main }} />
                    <Typography variant="caption">
                      {announcement.createdAt ? formatDate(announcement.createdAt) : 'Unknown date'}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Admin controls - ensure they are only shown to admin users */}
                {role === 'admin' && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12, 
                    display: 'flex',
                    gap: 1
                  }}>
                    {announcement.isEdited && (
                      <Tooltip title="View edit history">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewHistory(announcement)}
                          sx={{ 
                            color: theme.palette.info.main,
                            backgroundColor: theme.palette.grey[100],
                            '&:hover': {
                              backgroundColor: theme.palette.info.light,
                              color: 'white'
                            }
                          }}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Edit announcement">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditClick(announcement)}
                        sx={{ 
                          color: theme.palette.primary.main,
                          backgroundColor: theme.palette.grey[100],
                          '&:hover': {
                            backgroundColor: theme.palette.primary.light,
                            color: 'white'
                          }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete announcement">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteClick(announcement)}
                        sx={{ 
                          color: theme.palette.error.main,
                          backgroundColor: theme.palette.grey[100],
                          '&:hover': {
                            backgroundColor: theme.palette.error.light,
                            color: 'white'
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      
      {/* Edit Announcement Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
          Edit Announcement
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3, mt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editMessage}
            onChange={e => setEditMessage(e.target.value)}
            placeholder="Edit your announcement..."
            required
            sx={{ mb: 3 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>
            Recipients:
          </Typography>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editRecipients.includes('teacher')}
                  onChange={e => {
                    if (e.target.checked) setEditRecipients([...editRecipients, 'teacher']);
                    else setEditRecipients(editRecipients.filter(r => r !== 'teacher'));
                  }}
                />
              }
              label="Teachers"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editRecipients.includes('student')}
                  onChange={e => {
                    if (e.target.checked) setEditRecipients([...editRecipients, 'student']);
                    else setEditRecipients(editRecipients.filter(r => r !== 'student'));
                  }}
                />
              }
              label="Students"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editRecipients.includes('hod')}
                  onChange={e => {
                    if (e.target.checked) setEditRecipients([...editRecipients, 'hod']);
                    else setEditRecipients(editRecipients.filter(r => r !== 'hod'));
                  }}
                />
              }
              label="HODs"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editRecipients.includes('dean')}
                  onChange={e => {
                    if (e.target.checked) setEditRecipients([...editRecipients, 'dean']);
                    else setEditRecipients(editRecipients.filter(r => r !== 'dean'));
                  }}
                />
              }
              label="Deans"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained" 
            color="primary"
            disabled={editMessage.trim() === '' || editRecipients.length === 0}
          >
            Update Announcement
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ color: theme.palette.error.main }}>
          Delete Announcement
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this announcement? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit History Dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: theme.palette.info.main, color: 'white', display: 'flex', alignItems: 'center' }}>
          <HistoryIcon sx={{ mr: 1 }} />
          Announcement Edit History
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: 3, mt: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <Typography>Loading history...</Typography>
            </Box>
          ) : announcementHistory ? (
            <>
              <Box sx={{ mb: 3, p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Current Version
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
                  {announcementHistory.announcement.message}
                </Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: theme.palette.text.secondary }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Last edited by {announcementHistory.announcement.lastEditedBy?.name || 'Unknown'} on {formatDate(announcementHistory.announcement.lastEditedAt)}
                </Typography>
              </Box>
              
              {announcementHistory.history.length > 0 ? (
                <>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                    Previous Versions
                  </Typography>
                  <List sx={{ bgcolor: theme.palette.background.paper, borderRadius: 1, mb: 2 }}>
                    {announcementHistory.history.map((historyItem, index) => (
                      <React.Fragment key={index}>
                        <ListItem 
                          button 
                          onClick={() => toggleHistoryItem(index)}
                          sx={{ 
                            borderBottom: '1px solid',
                            borderColor: theme.palette.divider,
                            '&:hover': {
                              bgcolor: theme.palette.action.hover
                            }
                          }}
                        >
                          <ListItemIcon>
                            <AccessTimeIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`Edited by ${historyItem.editedBy?.name || 'Unknown'}`}
                            secondary={formatDate(historyItem.editedAt)}
                          />
                          {expandedHistoryItems[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </ListItem>
                        <Collapse in={expandedHistoryItems[index]} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, bgcolor: theme.palette.grey[50] }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Previous Message:
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: theme.palette.divider }}>
                              {historyItem.previousMessage}
                            </Typography>
                            <Typography variant="subtitle2" gutterBottom>
                              Previous Recipients:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                              {historyItem.previousRecipients?.map((recipient, i) => {
                                const getRecipientLabel = (type) => {
                                  switch(type) {
                                    case 'teacher': return 'Teachers';
                                    case 'student': return 'Students';
                                    case 'hod': return 'HODs';
                                    case 'dean': return 'Deans';
                                    default: return type;
                                  }
                                };
                                return (
                                  <Chip 
                                    key={i} 
                                    label={getRecipientLabel(recipient)} 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined"
                                  />
                                );
                              }) || <Typography variant="caption">No recipients data</Typography>}
                            </Box>
                          </Box>
                        </Collapse>
                      </React.Fragment>
                    ))}
                  </List>
                </>
              ) : (
                <Typography variant="body1" color="textSecondary">
                  No edit history available.
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body1" color="textSecondary">
              Failed to load announcement history.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnnouncementBoard;
