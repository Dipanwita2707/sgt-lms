import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography,
  Avatar,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Drawer
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import axios from 'axios';
import { parseJwt } from '../utils/jwt';
import { hasPermission } from '../utils/permissions';
import { useUserRole } from '../contexts/UserRoleContext';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/admin/NotificationBell';
import DashboardRoleGuard from '../components/DashboardRoleGuard';
import AnnouncementPage from './AnnouncementPage';
import sgtLogoWhite from '../assets/new-header-logo.png';

// Import Teacher Dashboard components
import TeacherDashboardHome from './teacher/TeacherDashboardHome';
import TeacherCourses from './teacher/TeacherCourses';
import TeacherCourseDetail from './teacher/TeacherCourseDetail';
import TeacherVideos from './teacher/TeacherVideos';
import TeacherStudents from './teacher/TeacherStudents';
import TeacherAnalytics from './teacher/TeacherAnalytics';
import TeacherQuizzes from './teacher/TeacherQuizzes';
import QuizAnalytics from './teacher/QuizAnalytics';
import TeacherSections from '../components/teacher/TeacherSections';
import TeacherSectionAnalytics from '../components/teacher/TeacherSectionAnalytics';
import TeacherCourseAnalytics from '../components/teacher/TeacherCourseAnalytics';
import TeacherProfile from '../components/TeacherProfile';
import TeacherAnnouncementHistory from './teacher/TeacherAnnouncementHistory';
import TeacherCCManagement from './teacher/TeacherCCManagement';
import QuizUnlockDashboard from '../components/teacher/QuizUnlockDashboard';
import ChatDashboard from '../components/ChatDashboard';
import VideoUnlockDashboard from '../components/teacher/VideoUnlockDashboard';
import StudentIndividualAnalytics from '../components/common/StudentIndividualAnalytics';
import UnauthorizedPage from './UnauthorizedPage';
// Lazy load components to avoid circular dependencies
// Live class components moved to independent video-call-module
// const TeacherLiveClassDashboard = React.lazy(() => import('../components/teacher/TeacherLiveClassDashboard'));
// const SgtLmsLiveClass = React.lazy(() => import('../components/liveclass/CodeTantraLiveClass'));

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const { user: contextUser, switchRole, availableRoles, activeRole, hasRole } = useUserRole();
  const location = useLocation();
  
  // Use context user if available, fallback to parsed JWT
  const user = contextUser || currentUser;

  console.log('TeacherDashboard Debug:');
  console.log('- contextUser:', contextUser);
  console.log('- currentUser:', currentUser);
  console.log('- availableRoles:', availableRoles);
  console.log('- activeRole:', activeRole);
  console.log('- hasRole function:', typeof hasRole);
  console.log('- User roles from JWT:', currentUser?.roles);
  console.log('- User primaryRole:', currentUser?.primaryRole);
  console.log('- Full currentUser object:', currentUser);

  // Profile menu state
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dashboard cards state (restored)
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [teachingStats, setTeachingStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeAssignments: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Check if we're on the main dashboard route
  const isOnMainDashboard = location.pathname === '/teacher/dashboard' || location.pathname === '/teacher/dashboard/';

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
    navigate('/teacher/profile');
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

  // Load dashboard data
  useEffect(() => {
    if (!token) return;

    const loadDashboardData = async () => {
      try {
        // Load notifications
        const notificationsRes = await axios.get('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(notificationsRes.data.notifications || []);
        setNotificationsLoading(false);

        // Teachers don't have access to audit logs - skip recent activity loading
        setRecentActivity([]);
        setActivityLoading(false);

        // Load teaching statistics
        const coursesRes = await axios.get('/api/teacher/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const analyticsRes = await axios.get('/api/teacher/analytics/overview', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setTeachingStats({
          totalCourses: coursesRes.data.courses?.length || 0,
          totalStudents: analyticsRes.data.totalStudents || 0,
          activeAssignments: analyticsRes.data.activeAssignments || 0
        });
        setStatsLoading(false);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setNotificationsLoading(false);
        setActivityLoading(false);
        setStatsLoading(false);
      }
    };

    loadDashboardData();
  }, [token]);

  // Create a protected route component that checks permissions
  const PermissionRoute = ({ element, permission }) => {
    // If no permission is required or user has permission, render the element
    if (!permission || hasPermission(user, permission)) {
      return element;
    }
    // Otherwise, render the unauthorized page
    return <UnauthorizedPage />;
  };

  return (
    <DashboardRoleGuard requiredRole="teacher">
      <Box sx={{ 
        display: 'flex', 
        minHeight: '100vh',
        flexDirection: { xs: 'column', md: 'row' }
      }}>
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
          {/* Left side - Mobile Menu + Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Mobile Menu Icon - Only visible on mobile */}
            <IconButton
              sx={{ 
                display: { xs: 'flex', md: 'none' },
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            
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
                {user?.name?.charAt(0)?.toUpperCase() || 'T'}
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
                console.log('Debug - availableRoles:', availableRoles, 'activeRole:', activeRole);
                
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
                const currentRole = activeRole || currentUser?.role || 'teacher';
                const availableRoleOptions = [...new Set(userRoles)].filter(role => role !== currentRole);
                
                console.log('🔍 Role Detection:', {
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
                const currentRole = activeRole || currentUser?.role || 'teacher';
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

        {/* Mobile Drawer - Only visible on mobile */}
        {/* Note: Sidebar component has its own drawer, we pass mobileOpen state to it */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <Sidebar 
            currentUser={user} 
            mobileOpen={mobileMenuOpen} 
            handleDrawerToggle={() => setMobileMenuOpen(false)} 
          />
        </Box>

        {/* Sidebar with top margin for fixed header - Hidden on mobile */}
        <Box sx={{ 
          display: { xs: 'none', md: 'block' },
          mt: '64px', 
          width: sidebarCollapsed ? '80px' : '280px', 
          flexShrink: 0,
          transition: 'width 0.3s'
        }}>
          <Sidebar currentUser={user} />
        </Box>
        
        {/* Main Content Area with margin for sidebar and header */}
        <Box sx={{ 
          flexGrow: 1, 
          mt: '64px', 
          ml: 0,
          width: { 
            xs: '100%', 
            md: `calc(100% - ${sidebarCollapsed ? 80 : 280}px)` 
          },
          transition: 'width 0.3s'
        }}>
          <Box 
            component="main" 
            sx={{ 
              minHeight: 'calc(100vh - 64px)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #cbd5e1 70%, #94a3b8 100%)',
            }}
          >
            <Box sx={{ 
              p: { xs: 2, md: 3 },
              backgroundColor: 'transparent'
            }}>
              
              {/* Restored Dashboard Cards - Only show on main dashboard */}
              {isOnMainDashboard && (
                <>
                  {/* Enhanced Header Section */}
                  <Box sx={{ 
                    mb: 4,
                    p: 3,
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
                            mb: 0.5
                          }}
                        >
                          Teacher Dashboard
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: '#64748b'
                          }}
                        >
                          Welcome back, {user?.name}! Manage your courses and students from here.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Dashboard Cards */}
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
                          subheader="Latest updates and alerts"
                          action={
                            <IconButton size="small">
                              <MoreVertIcon />
                            </IconButton>
                          }
                        />
                        <CardContent sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {notificationsLoading ? (
                            <Typography color="text.secondary">Loading...</Typography>
                          ) : notifications.length === 0 ? (
                            <Typography color="text.secondary">No notifications</Typography>
                          ) : (
                            <List dense>
                              {notifications.slice(0, 4).map((notification, index) => (
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
                          )}
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
                          subheader="Your recent teaching activity"
                          action={
                            <IconButton size="small">
                              <MoreVertIcon />
                            </IconButton>
                          }
                        />
                        <CardContent sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {activityLoading ? (
                            <Typography color="text.secondary">Loading...</Typography>
                          ) : recentActivity.length === 0 ? (
                            <Typography color="text.secondary">No recent activity</Typography>
                          ) : (
                            <List dense>
                              {recentActivity.slice(0, 4).map((activity, index) => (
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
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Teaching Overview Card */}
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
                              Teaching Overview
                            </Typography>
                          }
                          subheader="Your teaching statistics"
                          action={
                            <IconButton size="small">
                              <MoreVertIcon />
                            </IconButton>
                          }
                        />
                        <CardContent>
                          {statsLoading ? (
                            <Typography color="text.secondary">Loading...</Typography>
                          ) : (
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Courses
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#005b96' }}>
                                  {teachingStats.totalCourses}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Students
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#005b96' }}>
                                  {teachingStats.totalStudents}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Active Assignments
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#005b96' }}>
                                  {teachingStats.activeAssignments}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </>
              )}

              {/* Routes */}
              <Routes>
                <Route path="/dashboard" element={<TeacherDashboardHome />} />
                <Route path="/profile" element={<TeacherProfile />} />
                <Route path="/chats" element={<ChatDashboard />} />
                <Route path="/courses" element={<TeacherCourses />} />
                <Route path="/sections" element={<TeacherSections />} />
                <Route path="/section-analytics" element={<TeacherSectionAnalytics user={currentUser} token={token} />} />
                {/* Live class routes moved to independent video-call-module */}
                {/* <Route path="/live-classes" element={
                  <Suspense fallback={<div>Loading Live Classes...</div>}>
                    <TeacherLiveClassDashboard token={token} user={user} />
                  </Suspense>
                } />
                <Route path="/live-class/:classId" element={
                  <Suspense fallback={<div>Loading Live Class Room...</div>}>
                    <SgtLmsLiveClass token={token} user={user} />
                  </Suspense>
                } />
                <Route path="/live-class/room/:classId" element={
                  <Suspense fallback={<div>Loading Live Class Room...</div>}>
                    <SgtLmsLiveClass token={token} user={user} />
                  </Suspense>
                } /> */}
                <Route path="/course/:courseId" element={<TeacherCourseDetail />} />
                <Route path="/videos" element={<PermissionRoute element={<TeacherVideos />} permission="manage_videos" />} />
                <Route path="/students" element={<PermissionRoute element={<TeacherStudents />} permission="manage_students" />} />
                <Route path="/cc-management" element={<TeacherCCManagement />} />
                <Route path="/quizzes" element={<TeacherQuizzes />} />
                <Route path="/unlock-requests" element={<QuizUnlockDashboard />} />
                <Route path="/video-unlock-requests" element={<VideoUnlockDashboard />} />
                <Route path="/quiz-analytics/:quizId" element={<QuizAnalytics />} />
                <Route path="/announcements" element={<AnnouncementPage role="teacher" teacherCourses={[]} userId={currentUser?._id} />} />
                <Route path="/announcements/history" element={<TeacherAnnouncementHistory token={token} />} />
                <Route path="/student-analytics" element={<StudentIndividualAnalytics />} />
                <Route path="/analytics" element={<TeacherCourseAnalytics />} />
                <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Box>
    </DashboardRoleGuard>
  );
};

export default TeacherDashboard;