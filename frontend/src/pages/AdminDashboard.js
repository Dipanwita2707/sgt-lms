import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Box, 
  Chip, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  Avatar, 
  Divider,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import axios from 'axios';
import DashboardIcon from '@mui/icons-material/Dashboard';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventNoteIcon from '@mui/icons-material/EventNote';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { parseJwt } from '../utils/jwt';
import { useUserRole } from '../contexts/UserRoleContext';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/admin/NotificationBell';
import sgtLogoWhite from '../assets/new-header-logo.png';
import AnnouncementPage from './AnnouncementPage';
import AnalyticsDashboard from './admin/AnalyticsDashboard';
import EnhancedAnalytics from './admin/EnhancedAnalytics';
import TeacherManagement from './admin/TeacherManagement';
import StudentManagement from './admin/StudentManagement';
import CourseManagement from './admin/CourseManagement';
import SchoolManagement from './admin/SchoolManagement';
import DepartmentManagement from './admin/DepartmentManagement';
import SectionManagement from '../components/admin/SectionManagement';
import DeanManagement from './admin/DeanManagement';
import HODManagement from './admin/HODManagement';
import VideoManagement from './admin/VideoManagement';
import QuizManagement from './admin/QuizManagement';
import Analytics from './admin/Analytics';
import UnlockRequests from './admin/UnlockRequests';
import AdminQuizUnlockDashboard from '../components/admin/AdminQuizUnlockDashboard';
import AdminProfile from '../components/AdminProfile';
import UserRoleManagement from './admin/UserRoleManagement';
import RoleManagement from './admin/RoleManagement';
import AdvancedAuditLogDashboard from '../components/admin/AdvancedAuditLogDashboard';
import { useLocation } from 'react-router-dom';
import ChatDashboard from '../components/ChatDashboard';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const { user: contextUser, switchRole, availableRoles, activeRole } = useUserRole();
  const location = useLocation();
  
  // Use context user if available, fallback to parsed JWT
  const user = contextUser || currentUser;

  // Profile menu state
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  // Listen for sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (event) => {
      setSidebarCollapsed(event.detail.collapsed);
    };
    
    window.addEventListener('sidebarToggle', handleSidebarToggle);
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
  }, []);

  // Event handlers
  const handleProfileClick = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleProfileDialogOpen = () => {
    handleProfileMenuClose();
    navigate('/admin/profile');
  };

  const handleSwitchRole = (targetRole) => {
    console.log('🔄 Attempting to switch to role:', targetRole);
    
    // Try using the context switchRole first
    if (switchRole && typeof switchRole === 'function') {
      const result = switchRole(targetRole);
      if (result) {
        return; // Successfully switched using context
      }
    }
    
    // Fallback: Manual role switching
    console.log('🔄 Using manual role switching fallback');
    localStorage.setItem('activeRole', targetRole);
    
    // Get the correct dashboard route for the target role
    const routes = {
      admin: '/admin/dashboard', 
      dean: '/dean/dashboard',
      hod: '/hod/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard'
    };
    
    const targetRoute = routes[targetRole] || '/dashboard';
    console.log('🎯 Redirecting to:', targetRoute);
    
    // Force page reload to the new dashboard
    window.location.href = targetRoute;
    
    handleProfileMenuClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Check if we're on the main dashboard route
  const isOnMainDashboard = location.pathname === '/admin/dashboard' || location.pathname === '/admin/dashboard/';

  useEffect(() => {
    if (!token) return;
    // Fetch notifications
    (async () => {
      try {
        const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        setNotifications(res.data.notifications || []);
        setNotificationsLoading(false);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setNotificationsLoading(false);
      }
    })();

    // Fetch recent activity
    (async () => {
      try {
        const res = await axios.get('/api/admin/audit-logs/recent', { headers: { Authorization: `Bearer ${token}` } });
        setRecentActivity(res.data.logs || []);
        setActivityLoading(false);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        setRecentActivity([]);
        setActivityLoading(false);
      }
    })();
  }, [token]);

  const renderListItems = (items, loading, emptyMessage) => {
    if (loading) {
      return (
        <ListItem>
          <ListItemText primary="Loading..." />
        </ListItem>
      );
    }
    
    if (items.length === 0) {
      return (
        <ListItem>
          <ListItemText primary={emptyMessage} />
        </ListItem>
      );
    }
    
    return null;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Professional Header - Full Width Fixed */}
      <Box 
        sx={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          boxShadow: '0 2px 8px rgba(0, 91, 150, 0.15)',
          zIndex: 1300
        }}
      >
        {/* Left side - SGT Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={sgtLogoWhite} 
            alt="Header Logo" 
            style={{ 
              height: '50px',
              filter: 'brightness(1)',
              objectFit: 'contain'
            }} 
          />
        </Box>

        {/* Right side - Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notification Bell with light color for dark header */}
          <Box 
            sx={{ 
              '& .MuiIconButton-root': {
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              },
              '& .MuiSvgIcon-root': {
                color: 'white'
              }
            }}
          >
            <NotificationBell token={token} />
          </Box>

          {/* Profile Menu */}
          <IconButton
            onClick={handleProfileClick}
            sx={{
              ml: 2,
              p: 1,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                color: '#005b96',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </Avatar>
          </IconButton>

          {/* Profile Dropdown Menu */}
          <Menu
            anchorEl={profileAnchorEl}
            open={Boolean(profileAnchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 220,
                boxShadow: '0 8px 32px rgba(0, 91, 150, 0.15)',
                border: '1px solid rgba(0, 91, 150, 0.1)'
              }
            }}
          >
            <MenuItem 
              onClick={handleProfileDialogOpen}
              sx={{ 
                py: 1.5,
                '&:hover': { 
                  backgroundColor: 'rgba(0, 91, 150, 0.08)' 
                } 
              }}
            >
              <PersonIcon sx={{ mr: 2, color: '#005b96' }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                My Profile
              </Typography>
            </MenuItem>
            
            <Divider sx={{ my: 1 }} />
            
            {/* Dynamic Role switching options - show all user roles except current */}
            {(() => {
              console.log('Debug AdminDashboard - availableRoles:', availableRoles, 'activeRole:', activeRole);
              
              // Get all possible user roles from different sources
              const userRoles = [];
              
              // From context (preferred)
              if (availableRoles && availableRoles.length > 0) {
                userRoles.push(...availableRoles);
              }
              
              // From JWT roles array (fallback)
              if (currentUser?.roles && Array.isArray(currentUser.roles)) {
                userRoles.push(...currentUser.roles);
              }
              
              // From JWT single role (fallback)
              if (currentUser?.role) {
                userRoles.push(currentUser.role);
              }
              
              // From JWT primaryRole (fallback)
              if (currentUser?.primaryRole) {
                userRoles.push(currentUser.primaryRole);
              }
              
              // Check additional role properties that might exist in JWT
              if (currentUser?.userRole) {
                userRoles.push(currentUser.userRole);
              }
              
              if (currentUser?.assignedRoles && Array.isArray(currentUser.assignedRoles)) {
                userRoles.push(...currentUser.assignedRoles);
              }
              
              // Remove duplicates and current role
              const currentRole = activeRole || currentUser?.role || 'admin';
              const availableRoleOptions = [...new Set(userRoles)].filter(role => role !== currentRole);
              
              console.log('🔍 Admin Role Detection:', {
                userRoles,
                currentRole,
                availableRoleOptions,
                contextAvailable: availableRoles?.length > 0,
                jwtRoles: currentUser?.roles,
                jwtRole: currentUser?.role,
                totalRolesFound: userRoles.length,
                uniqueRoles: [...new Set(userRoles)],
                switchOptionsCount: availableRoleOptions.length
              });
              
              // Role labels and icons
              const roleLabels = {
                admin: 'Administrator',
                dean: 'Dean',
                hod: 'HOD',
                teacher: 'Teacher',
                student: 'Student'
              };
              
              const roleIcons = {
                admin: '👑',
                dean: '🏛️',
                hod: '🏢',
                teacher: '👨‍🏫',
                student: '🎓'
              };
              
              // Return the menu items
              return availableRoleOptions.map((role) => (
                <MenuItem 
                  key={role}
                  onClick={() => handleSwitchRole(role)}
                  sx={{ 
                    py: 1.5,
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 91, 150, 0.08)' 
                    } 
                  }}
                >
                  <SwitchAccountIcon sx={{ mr: 2, color: '#005b96' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Switch to {roleLabels[role] || role} {roleIcons[role] || ''}
                  </Typography>
                </MenuItem>
              ));
            })()}
            
            {/* Show divider if there are roles to switch to */}
            {(() => {
              const userRoles = [
                ...(availableRoles || []),
                ...(currentUser?.roles || []),
                currentUser?.role,
                currentUser?.primaryRole
              ].filter(Boolean);
              const currentRole = activeRole || currentUser?.role || 'admin';
              const hasMultipleRoles = [...new Set(userRoles)].filter(role => role !== currentRole).length > 0;
              return hasMultipleRoles ? <Divider sx={{ my: 1 }} /> : null;
            })()}
            
            <MenuItem 
              onClick={handleLogout}
              sx={{ 
                py: 1.5,
                '&:hover': { 
                  backgroundColor: 'rgba(211, 47, 47, 0.08)' 
                } 
              }}
            >
              <LogoutIcon sx={{ mr: 2, color: '#d32f2f' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#d32f2f' }}>
                Logout
              </Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Sidebar with top margin for fixed header */}
      <Box sx={{ 
        mt: '64px', 
        width: sidebarCollapsed ? '80px' : '280px', 
        flexShrink: 0,
        transition: 'width 0.3s'
      }}>
        <Sidebar currentUser={currentUser} />
      </Box>
      
      {/* Main Content Area with margin for sidebar and header */}
      <Box sx={{ 
        flexGrow: 1, 
        mt: '64px', 
        ml: 0,
        width: `calc(100% - ${sidebarCollapsed ? 80 : 280}px)`,
        transition: 'width 0.3s'
      }}>
        <Box 
          component="main" 
          sx={{ 
            minHeight: 'calc(100vh - 64px)',
            // Lighter blue gradient background to match reference image
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #cbd5e1 70%, #94a3b8 100%)',
          }}
        >
          <Box sx={{ 
            p: { xs: 2, md: 3 },
            backgroundColor: 'transparent' // Ensure no default white background
          }}>
            

            {/* Routes */}
            <Routes>
              <Route path="/dashboard" element={
                <Box>
                  {/* Show overview cards only on main dashboard */}
                  {isOnMainDashboard && (
                    <>
                      {/* Enhanced Header Section */}
                      <Box sx={{ 
                        mb: 4,
                        p: 3,
                        // Remove white background - make it transparent
                        background: 'transparent',
                        borderRadius: 3,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar 
                            sx={{ 
                              width: 48, 
                              height: 48, 
                              bgcolor: '#005b96',
                              mr: 3
                            }}
                          >
                            <DashboardIcon sx={{ fontSize: 32 }} />
                          </Avatar>
                          <Box>
                            <Typography 
                              variant="h4" 
                              sx={{ 
                                fontWeight: 700, 
                                color: '#1e293b',
                                textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                fontSize: { xs: '1.75rem', md: '2.125rem' }
                              }}
                            >
                              Admin Dashboard
                            </Typography>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                color: '#64748b',
                                mt: 0.5,
                                fontWeight: 500
                              }}
                            >
                              Welcome back, {user?.name || 'Administrator'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Dashboard Cards Grid */}
                      <Grid container spacing={3} sx={{ mb: 4 }}>
                        {/* Notifications Card */}
                        <Grid item xs={12} md={4}>
                          <Card 
                            sx={{ 
                              height: '300px',
                              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                              border: '1px solid #6497b1',
                              boxShadow: '0 4px 20px rgba(100, 151, 177, 0.15)',
                              '&:hover': {
                                boxShadow: '0 8px 30px rgba(100, 151, 177, 0.25)',
                                transform: 'translateY(-2px)'
                              },
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <CardHeader
                              avatar={
                                <Avatar sx={{ bgcolor: '#005b96' }}>
                                  <NotificationsActiveIcon />
                                </Avatar>
                              }
                              title={
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                  Notifications
                                </Typography>
                              }
                              subheader={
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                  Latest updates and alerts
                                </Typography>
                              }
                              action={
                                <IconButton size="small">
                                  <MoreVertIcon />
                                </IconButton>
                              }
                            />
                            <CardContent sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                              <List dense>
                                {renderListItems(notifications, notificationsLoading, "No notifications")}
                                {!notificationsLoading && notifications.slice(0, 4).map((notification, index) => (
                                  <ListItem key={index} sx={{ px: 0 }}>
                                    <ListItemText
                                      primary={notification.message}
                                      secondary={new Date(notification.createdAt).toLocaleDateString()}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                      secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Recent Activity Card */}
                        <Grid item xs={12} md={4}>
                          <Card 
                            sx={{ 
                              height: '300px',
                              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                              border: '1px solid #6497b1',
                              boxShadow: '0 4px 20px rgba(100, 151, 177, 0.15)',
                              '&:hover': {
                                boxShadow: '0 8px 30px rgba(100, 151, 177, 0.25)',
                                transform: 'translateY(-2px)'
                              },
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <CardHeader
                              avatar={
                                <Avatar sx={{ bgcolor: '#005b96' }}>
                                  <EventNoteIcon />
                                </Avatar>
                              }
                              title={
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                  Recent Activity
                                </Typography>
                              }
                              subheader={
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                  System activity logs
                                </Typography>
                              }
                              action={
                                <IconButton size="small">
                                  <MoreVertIcon />
                                </IconButton>
                              }
                            />
                            <CardContent sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                              <List dense>
                                {renderListItems(recentActivity, activityLoading, "No recent activity")}
                                {!activityLoading && recentActivity.slice(0, 4).map((activity, index) => (
                                  <ListItem key={index} sx={{ px: 0 }}>
                                    <ListItemText
                                      primary={activity.action}
                                      secondary={new Date(activity.timestamp).toLocaleString()}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                      secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* System Overview Card */}
                        <Grid item xs={12} md={4}>
                          <Card 
                            sx={{ 
                              height: '300px',
                              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                              border: '1px solid #6497b1',
                              boxShadow: '0 4px 20px rgba(100, 151, 177, 0.15)',
                              '&:hover': {
                                boxShadow: '0 8px 30px rgba(100, 151, 177, 0.25)',
                                transform: 'translateY(-2px)'
                              },
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <CardHeader
                              avatar={
                                <Avatar sx={{ bgcolor: '#005b96' }}>
                                  <TrendingUpIcon />
                                </Avatar>
                              }
                              title={
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                  System Overview
                                </Typography>
                              }
                              subheader={
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                  Key metrics and stats
                                </Typography>
                              }
                              action={
                                <IconButton size="small">
                                  <MoreVertIcon />
                                </IconButton>
                              }
                            />
                            <CardContent>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Total Users
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#005b96' }}>
                                    12
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Active Courses
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#005b96' }}>
                                    6
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    System Health
                                  </Typography>
                                  <Chip label="Excellent" color="success" size="small" />
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </>
                  )}
                  
                  {/* Full Analytics Dashboard */}
                  <AnalyticsDashboard />
                </Box>
              } />
              <Route path="teachers" element={<TeacherManagement currentUser={user} />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="chats" element={<ChatDashboard />} />
              <Route path="courses" element={<CourseManagement />} />
              <Route path="schools" element={<SchoolManagement />} />
              <Route path="departments" element={<DepartmentManagement />} />
              <Route path="sections" element={<SectionManagement />} />
              <Route path="deans" element={<DeanManagement />} />
              <Route path="hods" element={<HODManagement />} />
              <Route path="videos" element={<VideoManagement />} />
              <Route path="quizzes" element={<QuizManagement />} />
              <Route path="quiz-attempts" element={<Analytics />} />
              <Route path="quiz-bulk-unlock" element={<UnlockRequests />} />
              <Route path="quiz-unlock-dashboard" element={<AdminQuizUnlockDashboard />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="enhanced-analytics" element={<EnhancedAnalytics />} />
              <Route path="announcements" element={<AnnouncementPage role="admin" />} />
              <Route path="profile" element={<AdminProfile />} />
              {currentUser?.role === 'admin' && <Route path="user-roles" element={<UserRoleManagement />} />}
              {currentUser?.role === 'admin' && <Route path="roles" element={<AdvancedAuditLogDashboard />} />}
              <Route path="*" element={<Navigate to="/admin/dashboard" />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;