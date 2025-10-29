import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Avatar, Menu, MenuItem, Badge, Tooltip } from '@mui/material';
import { Navigate, useNavigate } from 'react-router-dom';
import { 
  Menu as MenuIcon, 
  Home as HomeIcon, 
  VideoLibrary as VideoLibraryIcon, 
  Group as GroupIcon, 
  ExitToApp as LogoutIcon, 
  AccountCircle as AccountIcon,
  Forum as ForumIcon,
  CloudUpload as CloudUploadIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import TeacherRoutes from '../routes/TeacherRoutes';

const TeacherDashboardPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [accountMenu, setAccountMenu] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnread, setPrevUnread] = useState(0);
  const [blink, setBlink] = useState(false); // transient pulse on increase
  const [annBlink, setAnnBlink] = useState(false); // persistent while unread announcement exists
  const navigate = useNavigate();
  
  // Parse user from localStorage if available
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
  }, []);

  // Poll unread notifications and detect announcement-type unread items
  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res = await axios.get('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } });
        const count = res.data.unread || 0;
        setUnreadCount(count);
        if (count > prevUnread) {
          setBlink(true);
          setTimeout(() => setBlink(false), 5000);
        }
        setPrevUnread(count);
        if (count > 0) {
          const listRes = await axios.get('/api/notifications?page=1&limit=50', { headers: { Authorization: `Bearer ${token}` } });
          const list = listRes.data.notifications || listRes.data || [];
          const hasAnn = list.some(n => !n.read && n.type === 'announcement');
          setAnnBlink(hasAnn);
        } else {
          setAnnBlink(false);
        }
      } catch (e) { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [token, prevUnread]);

  const openNotifications = async (e) => {
    setNotifAnchor(e.currentTarget);
    try {
      const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      const list = res.data.notifications || res.data || [];
      setNotifications(list);
      if (unreadCount > 0) {
        await axios.patch('/api/notifications/mark-all/read', {}, { headers: { Authorization: `Bearer ${token}` } });
        setUnreadCount(0);
        setAnnBlink(false);
      }
    } catch (e) {/* ignore */}
  };

  const closeNotifications = () => setNotifAnchor(null);
  
  // If no token or not a teacher, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  const handleAccountMenuOpen = (event) => {
    setAccountMenu(event.currentTarget);
  };
  
  const handleAccountMenuClose = () => {
    setAccountMenu(null);
  };
  
  // Check user permissions
  const canManageVideos = user?.permissions?.includes('Manage Videos');
  const canViewAnalytics = user?.permissions?.includes('View Analytics');
  
  const drawerWidth = 240;
  
  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
          {user?.name?.charAt(0) || 'T'}
        </Avatar>
        <Box>
          <Typography variant="subtitle1">{user?.name || 'Teacher'}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email || ''}</Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        <ListItem button onClick={() => { navigate('/teacher'); setDrawerOpen(false); }}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button onClick={() => { navigate('/teacher/courses'); setDrawerOpen(false); }}>
          <ListItemIcon><VideoLibraryIcon /></ListItemIcon>
          <ListItemText primary="My Courses" />
        </ListItem>
        <ListItem button onClick={() => { navigate('/teacher/forums'); setDrawerOpen(false); }}>
          <ListItemIcon><ForumIcon /></ListItemIcon>
          <ListItemText primary="Discussion Forums" />
        </ListItem>
        {canManageVideos && (
          <ListItem button onClick={() => { navigate('/teacher/videos/upload'); setDrawerOpen(false); }}>
            <ListItemIcon><CloudUploadIcon /></ListItemIcon>
            <ListItemText primary="Upload Videos" />
          </ListItem>
        )}
        {canViewAnalytics && (
          <ListItem button onClick={() => { navigate('/teacher/analytics'); setDrawerOpen(false); }}>
            <ListItemIcon><BarChartIcon /></ListItemIcon>
            <ListItemText primary="Analytics Dashboard" />
          </ListItem>
        )}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Teacher Portal
          </Typography>
          <style>{`@keyframes bellPulse {0%{transform:scale(1);}50%{transform:scale(1.25);}100%{transform:scale(1);} } @keyframes annGlow {0%{box-shadow:0 0 0 0 rgba(255,0,0,0.7);}70%{box-shadow:0 0 0 14px rgba(255,0,0,0);}100%{box-shadow:0 0 0 0 rgba(255,0,0,0);} }`}</style>
          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={openNotifications} sx={{ ...(blink ? { animation: 'bellPulse 1s ease-in-out infinite' } : {}), ...(annBlink ? { position:'relative', animation: 'annGlow 1.6s infinite' } : {}) }}>
              <Badge color="error" badgeContent={unreadCount > 99 ? '99+' : unreadCount} invisible={unreadCount === 0}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <IconButton color="inherit" onClick={handleAccountMenuOpen} sx={{ ml: 1 }}>
            <AccountIcon />
          </IconButton>
          <Menu
            anchorEl={accountMenu}
            open={Boolean(accountMenu)}
            onClose={handleAccountMenuClose}
          >
            <MenuItem onClick={handleAccountMenuClose}>My Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={closeNotifications}
            PaperProps={{ sx: { maxHeight: 400, width: 320 } }}
          >
            {notifications.length === 0 && <MenuItem disabled>No notifications</MenuItem>}
            {notifications.slice(0, 50).map(n => (
              <MenuItem key={n._id} onClick={closeNotifications} sx={!n.read ? { fontWeight: 600 } : {}}>
                <Box>
                  <Typography variant="body2">{n.message}</Typography>
                  <Typography variant="caption" color="text.secondary">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}>
        <TeacherRoutes user={user} token={token} />
      </Box>
    </Box>
  );
};

export default TeacherDashboardPage;
