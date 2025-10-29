import React, { useEffect, useState } from 'react';
import { IconButton, Badge, Menu, MenuItem, ListItemText, ListItemSecondaryAction, Typography, Divider, Chip, ListItemIcon, Box, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

export default function NotificationBell({ token }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]); // Initialize as empty array
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications function
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      // The API returns { notifications: [...], total, page }, so we need to access res.data.notifications
      const notificationsData = res.data.notifications || [];
      setNotifications(notificationsData);
      setUnread(notificationsData.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]); // Set empty array on error
      setUnread(0);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    if (!token) return;
    
    // Fetch immediately on mount
    fetchNotifications();
    
    // Set up polling every 30 seconds
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 seconds
    
    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, [token]);

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    // Refresh notifications when opening the menu
    fetchNotifications();
  };
  const handleClose = () => setAnchorEl(null);
  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(n => n.map(notif => notif._id === id ? { ...notif, read: true } : notif));
      setUnread(u => Math.max(0, u - 1)); // Ensure unread count doesn't go below 0
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} size="large" sx={{ ml: 2 }}>
        <Badge badgeContent={unread} color="error" overlap="circular">
          <NotificationsIcon fontSize="large" />
        </Badge>
      </IconButton>
      <Menu 
        anchorEl={anchorEl} 
        open={Boolean(anchorEl)} 
        onClose={handleClose} 
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{ 
          sx: { 
            minWidth: 340, 
            maxWidth: 400, 
            maxHeight: '80vh',
            p: 1,
            mt: 1
          } 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Notifications
          </Typography>
          <Tooltip title="Refresh notifications">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                fetchNotifications();
              }}
              disabled={refreshing}
            >
              <RefreshIcon 
                fontSize="small" 
                sx={{ 
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} 
              />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider sx={{ mb: 1 }} />
        {notifications.length === 0 && (
          <MenuItem disabled>
            <Typography color="text.secondary">No notifications</Typography>
          </MenuItem>
        )}
        {Array.isArray(notifications) && notifications.map(n => (
          <MenuItem 
            key={n._id} 
            selected={!n.read} 
            onClick={() => markAsRead(n._id)} 
            sx={{ 
              alignItems: 'flex-start', 
              py: 1.5, 
              px: 2,
              borderLeft: !n.read ? '4px solid #1976d2' : 'none', 
              bgcolor: !n.read ? 'rgba(25, 118, 210, 0.07)' : 'transparent', 
              mb: 0.5,
              '&:hover': {
                bgcolor: !n.read ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>
              <NotificationsIcon color={n.read ? 'disabled' : 'primary'} fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography 
                  fontWeight={!n.read ? 700 : 400} 
                  color={n.read ? 'text.secondary' : 'text.primary'}
                  sx={{ 
                    fontSize: '0.875rem',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                    pr: !n.read ? 6 : 0
                  }}
                >
                  {n.message}
                </Typography>
              }
              secondary={
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(n.createdAt).toLocaleDateString()}
                </Typography>
              }
            />
            {!n.read && (
              <ListItemSecondaryAction sx={{ right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                <Chip label="New" color="primary" size="small" />
              </ListItemSecondaryAction>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
