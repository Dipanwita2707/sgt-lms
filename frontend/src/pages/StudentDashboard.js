import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Drawer
} from '@mui/material';

import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import MenuIcon from '@mui/icons-material/Menu';
import { getCurrentUser } from '../utils/authService';
import { useUserRole } from '../contexts/UserRoleContext';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/admin/NotificationBell';
import sgtLogoWhite from '../assets/new-header-logo.png';
import AnnouncementPage from './AnnouncementPage';

// Import student pages
import StudentHomeDashboard from './student/StudentHomeDashboard';
import StudentCoursesPage from './student/StudentCoursesPage';
import StudentCourseVideos from './student/StudentCourseVideos';
import StudentCourseProgress from './student/StudentCourseProgress';
import StudentCourseUnits from './student/StudentCourseUnits';
import StudentUnitVideo from './student/StudentUnitVideo';
import StudentQuizPage from './student/StudentQuizPage';
import SecureQuizPage from './student/SecureQuizPage';
import QuizLauncher from './student/QuizLauncher';
import StudentForumPage from './student/StudentForumPage';
import StudentForumDetailPage from './student/StudentForumDetailPage';
import StudentUnansweredForumsPage from './student/StudentUnansweredForumsPage';
import StudentSection from '../components/student/StudentSection';
// import StudentLiveClasses from './student/StudentLiveClasses'; // Moved to LEGACY_BACKUP
// Live class components moved to independent video-call-module
// import StudentLiveClassDashboard from '../components/student/StudentLiveClassDashboard';
import QuizResults from '../components/student/QuizResults';
import RecentVideos from '../components/student/RecentVideos';
import StudentProfile from '../components/StudentProfile';
import WatchHistory from '../components/student/WatchHistory';
import ChatDashboard from '../components/ChatDashboard';
import StudentCertificates from '../components/student/StudentCertificates';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const currentUser = getCurrentUser();
  const { user: contextUser, switchRole, availableRoles, activeRole } = useUserRole();
  
  // Use context user if available, fallback to parsed JWT
  const user = contextUser || currentUser;
  
  // Check if we're on a live class route
  const isOnLiveClass = location.pathname.includes('/live-class');

  // Profile menu state
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Event handlers for profile menu
  const handleProfileClick = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleProfileDialogOpen = () => {
    handleProfileMenuClose();
    navigate('/student/profile');
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
    console.log('🎯 Navigating to:', targetRoute);
    
    // Force navigation
    window.location.href = targetRoute;
    
    handleProfileMenuClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh',
      flexDirection: { xs: 'column', md: 'row' }
    }}>
      {/* Professional Header - Full Width Fixed - Hidden on live class */}
      {!isOnLiveClass && (
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
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
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
              console.log('Debug StudentDashboard - availableRoles:', availableRoles, 'activeRole:', activeRole);
              
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
              
              // Remove duplicates and current role
              const currentRole = activeRole || currentUser?.role || 'student';
              const availableRoleOptions = [...new Set(userRoles)].filter(role => role !== currentRole);
              
              console.log('🔍 Student Role Detection:', {
                userRoles,
                currentRole,
                availableRoleOptions,
                contextAvailable: availableRoles?.length > 0
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
              const currentRole = activeRole || currentUser?.role || 'student';
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
      )}

      {/* Mobile Navigation - Sidebar handles its own drawer */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Sidebar 
          currentUser={currentUser} 
          mobileOpen={mobileMenuOpen} 
          handleDrawerToggle={() => setMobileMenuOpen(false)} 
        />
      </Box>

      {/* Sidebar with top margin for fixed header - Hidden on live class & mobile */}
      {!isOnLiveClass && (
        <Box sx={{ 
          display: { xs: 'none', md: 'block' },
          mt: '64px', 
          width: sidebarCollapsed ? '80px' : '280px', 
          flexShrink: 0,
          transition: 'width 0.3s'
        }}>
          <Sidebar currentUser={currentUser} />
        </Box>
      )}
      
      {/* Main Content Area with margin for sidebar and header */}
      <Box sx={{ 
        flexGrow: 1, 
        mt: isOnLiveClass ? 0 : '64px', 
        ml: 0,
        width: isOnLiveClass ? '100vw' : { 
          xs: '100%', 
          md: `calc(100% - ${sidebarCollapsed ? 80 : 280}px)` 
        },
        transition: 'width 0.3s',
        position: isOnLiveClass ? 'fixed' : 'relative',
        top: isOnLiveClass ? 0 : 'auto',
        left: isOnLiveClass ? 0 : 'auto',
        height: isOnLiveClass ? '100vh' : 'auto',
        zIndex: isOnLiveClass ? 1400 : 'auto'
      }}>
        <Box 
          component="main" 
          sx={{ 
            minHeight: isOnLiveClass ? '100vh' : 'calc(100vh - 64px)',
            // Lighter blue gradient background to match reference image
            background: isOnLiveClass ? '#000' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #cbd5e1 70%, #94a3b8 100%)',
          }}
        >
          <Box sx={{ 
            flex: 1, 
            p: isOnLiveClass ? 0 : { xs: 2, md: 3 },
            backgroundColor: 'transparent',
            height: isOnLiveClass ? '100vh' : 'auto'
          }}>
            {/* Routes */}
            <Routes>
            <Route path="/" element={<StudentHomeDashboard />} />
            <Route path="/dashboard" element={<StudentHomeDashboard />} />
            <Route path="/profile" element={<StudentProfile />} />
            <Route path="/chats" element={<ChatDashboard />} />
            <Route path="/courses" element={<StudentCoursesPage />} />
            <Route path="/section" element={<StudentSection user={currentUser} token={token} />} />
            {/* Live class routes moved to independent video-call-module */}
            {/* <Route path="/live-classes" element={<StudentLiveClassDashboard token={token} user={currentUser} />} /> */}
            <Route path="/videos" element={<RecentVideos />} />
            <Route path="/watch-history" element={<WatchHistory />} />
            <Route path="/course/:courseId" element={<StudentCourseUnits />} />
            <Route path="/course/:courseId/videos" element={<StudentCourseVideos />} />
            <Route path="/course/:courseId/video/:videoId" element={<StudentCourseVideos />} />
            <Route path="/course/:courseId/unit/:unitId/video/:videoId" element={<StudentUnitVideo />} />
            <Route path="/course/:courseId/progress" element={<StudentCourseProgress />} />
            <Route path="/quiz-results" element={<QuizResults />} />
            <Route path="/certificates" element={<StudentCertificates />} />
            <Route path="/course/:courseId/quiz/:attemptId" element={<StudentQuizPage user={currentUser} token={token} />} />
            <Route path="/secure-quiz/:attemptId" element={<SecureQuizPage user={currentUser} token={token} />} />
            <Route path="/quiz-launcher/:attemptId" element={<QuizLauncher user={currentUser} token={token} />} />
            <Route path="/forums" element={<StudentForumPage />} />
            <Route path="/forums/:forumId" element={<StudentForumDetailPage />} />
            <Route path="/unanswered-forums" element={<StudentUnansweredForumsPage />} />
            <Route path="/announcements" element={<AnnouncementPage role="student" />} />
            <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
          </Routes>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default StudentDashboard;