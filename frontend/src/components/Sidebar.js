import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  ListItemButton,
  Box,
  Typography,
  Avatar,
  useTheme,
  alpha,
  Badge,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import axios from 'axios';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import { MdClass } from 'react-icons/md';
import BarChartIcon from '@mui/icons-material/BarChart';
import InsightsIcon from '@mui/icons-material/Insights';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import QuizIcon from '@mui/icons-material/Quiz';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import HistoryIcon from '@mui/icons-material/History';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatIcon from '@mui/icons-material/Chat';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CategoryIcon from '@mui/icons-material/Category';
// VideoCallIcon removed - moved to independent video call module
import { useNavigate, useLocation } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';
import { useUserRole } from '../contexts/UserRoleContext';

const Sidebar = ({ currentUser, mobileOpen = false, handleDrawerToggle = () => {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { activeRole } = useUserRole();
  
  // Sidebar collapse state - persisted in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  
  // Category expansion states
  const [expandedCategories, setExpandedCategories] = useState(() => {
    const saved = localStorage.getItem('expandedCategories');
    return saved ? JSON.parse(saved) : {};
  });

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newState = { ...prev, [categoryId]: !prev[categoryId] };
      localStorage.setItem('expandedCategories', JSON.stringify(newState));
      return newState;
    });
  };
  
  // Update localStorage and dispatch event when collapsed state changes
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState);
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: newState } }));
  };
  
  // CC status state for dynamic menu filtering
  const [ccStatus, setCCStatus] = useState({ isCC: false, coursesCount: 0 });
  
  // Unread chat messages count
  const [totalUnreadChats, setTotalUnreadChats] = useState(0);
  
  // Check CC status when user role changes or component mounts
  useEffect(() => {
    const checkCCStatus = async () => {
      // Only check CC status if user has teacher role
      if (currentUser && (currentUser.role === 'teacher' || currentUser.roles?.includes('teacher'))) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/cc/status', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const status = await response.json();
            setCCStatus(status);
            console.log('🎯 CC Status Check:', status);
          } else {
            // Reset CC status on error
            setCCStatus({ isCC: false, coursesCount: 0 });
          }
        } catch (error) {
          console.error('Error checking CC status:', error);
          setCCStatus({ isCC: false, coursesCount: 0 });
        }
      } else {
        // Reset CC status for non-teachers
        setCCStatus({ isCC: false, coursesCount: 0 });
      }
    };

    checkCCStatus();
  }, [currentUser, activeRole]);
  
  // Fetch unread chat counts
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!currentUser) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/group-chat/unread-counts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setTotalUnreadChats(response.data.totalUnread || 0);
      } catch (error) {
        console.error('Error fetching unread chat counts:', error);
        setTotalUnreadChats(0);
      }
    };

    fetchUnreadCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser]);
  
  // Different menus based on user role - CATEGORIZED
  const adminMenuCategories = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      color: theme.palette.primary.main,
      alwaysExpanded: true, // Dashboard never collapses
      items: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: theme.palette.primary.main }
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <ChatIcon />,
      color: '#00897b',
      items: [
        { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: theme.palette.primary.dark },
        { text: 'Chats', icon: <ChatIcon />, path: 'chats', color: '#00897b', badge: totalUnreadChats > 0 ? totalUnreadChats : null }
      ]
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <PeopleIcon />,
      color: theme.palette.secondary.main,
      items: [
        { text: 'Teachers', icon: <PeopleIcon />, path: 'teachers', color: theme.palette.secondary.main },
        { text: 'Students', icon: <SchoolIcon />, path: 'students', color: theme.palette.primary.light },
        { text: 'Deans', icon: <AccountBalanceIcon />, path: 'deans', color: theme.palette.primary.dark },
        { text: 'HODs', icon: <SupervisorAccountIcon />, path: 'hods', color: theme.palette.secondary.main }
      ]
    },
    {
      id: 'academic',
      label: 'Academic',
      icon: <SchoolIcon />,
      color: theme.palette.secondary.light,
      items: [
        { text: 'Courses', icon: <MdClass />, path: 'courses', color: theme.palette.secondary.light },
        { text: 'Schools', icon: <AccountBalanceIcon />, path: 'schools', color: theme.palette.primary.main },
        { text: 'Departments', icon: <BusinessIcon />, path: 'departments', color: theme.palette.secondary.main },
        { text: 'Sections', icon: <GroupsIcon />, path: 'sections', color: theme.palette.primary.light }
      ]
    },
    {
      id: 'system',
      label: 'System & Access',
      icon: <LockOpenIcon />,
      color: theme.palette.status?.error,
      items: [
        { text: 'Quiz Unlock Dashboard', icon: <LockOpenIcon />, path: 'quiz-unlock-dashboard', color: theme.palette.status?.error },
        { text: 'User Roles', icon: <SupervisorAccountIcon />, path: 'user-roles', color: theme.palette.status?.success },
        { text: 'Audit Logs & Activity', icon: <HistoryIcon />, path: 'roles', color: theme.palette.info.main }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <InsightsIcon />,
      color: theme.palette.primary.main,
      items: [
        { text: 'Analytics', icon: <InsightsIcon />, path: 'enhanced-analytics', color: theme.palette.primary.main }
      ]
    }
  ];
  
  const teacherMenuCategories = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      color: theme.palette.primary.main,
      alwaysExpanded: true,
      items: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', permission: null, color: theme.palette.primary.main },
        { text: 'My Profile', icon: <PersonSearchIcon />, path: 'profile', permission: null, color: theme.palette.secondary.main }
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <ChatIcon />,
      color: '#00897b',
      items: [
        { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', permission: null, color: theme.palette.primary.dark },
        { text: 'Announcement History', icon: <HistoryIcon />, path: 'announcements/history', permission: null, color: theme.palette.status?.warning },
        { text: 'Chats', icon: <ChatIcon />, path: 'chats', permission: null, color: '#00897b', badge: totalUnreadChats > 0 ? totalUnreadChats : null }
      ]
    },
    {
      id: 'teaching',
      label: 'Teaching',
      icon: <SchoolIcon />,
      color: theme.palette.secondary.light,
      items: [
        { text: 'My Courses', icon: <MdClass />, path: 'courses', permission: null, color: theme.palette.secondary.light },
        { text: 'My Sections', icon: <GroupsIcon />, path: 'sections', permission: null, color: theme.palette.primary.light },
        { text: 'Students', icon: <SchoolIcon />, path: 'students', permission: 'manage_students', color: theme.palette.secondary.main, highlight: true },
        { text: 'CC Management', icon: <SupervisorAccountIcon />, path: 'cc-management', permission: null, color: theme.palette.secondary.main, isNew: true }
      ]
    },
    {
      id: 'content',
      label: 'Content & Activities',
      icon: <VideoLibraryIcon />,
      color: theme.palette.primary.light,
      items: [
        { text: 'Videos', icon: <VideoLibraryIcon />, path: 'videos', permission: 'manage_videos', color: theme.palette.primary.light },
        { text: 'Quizzes', icon: <QuizIcon />, path: 'quizzes', permission: null, color: theme.palette.secondary.main }
      ]
    },
    {
      id: 'requests',
      label: 'Unlock Requests',
      icon: <LockOpenIcon />,
      color: theme.palette.status?.error,
      items: [
        { text: 'Quiz Unlock Requests', icon: <LockOpenIcon />, path: 'unlock-requests', permission: null, color: theme.palette.status?.error },
        { text: 'Video Unlock Requests', icon: <VideoLibraryIcon />, path: 'video-unlock-requests', permission: null, color: theme.palette.status?.error }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChartIcon />,
      color: '#2196f3',
      items: [
        { text: 'Course Analytics', icon: <BarChartIcon />, path: 'analytics', permission: null, color: '#2196f3', isNew: true },
        { text: 'Section Analytics', icon: <AssessmentIcon />, path: 'section-analytics', permission: null, color: theme.palette.primary.dark },
        { text: 'Student Analytics', icon: <PersonSearchIcon />, path: 'student-analytics', permission: null, color: '#ff5722', isNew: true }
      ]
    }
  ];
  
  const studentMenuCategories = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      color: theme.palette.primary.main,
      alwaysExpanded: true,
      items: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: theme.palette.primary.main }
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <ChatIcon />,
      color: '#00897b',
      items: [
        { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: theme.palette.primary.dark },
        { text: 'Chats', icon: <ChatIcon />, path: 'chats', color: '#00897b', badge: totalUnreadChats > 0 ? totalUnreadChats : null }
      ]
    },
    {
      id: 'learning',
      label: 'My Learning',
      icon: <SchoolIcon />,
      color: theme.palette.secondary.light,
      items: [
        { text: 'My Courses', icon: <MdClass />, path: 'courses', color: theme.palette.secondary.light },
        { text: 'My Section', icon: <GroupsIcon />, path: 'section', color: theme.palette.primary.light },
        { text: 'Videos', icon: <VideoLibraryIcon />, path: 'videos', color: theme.palette.primary.light }
      ]
    },
    {
      id: 'assessments',
      label: 'Assessments',
      icon: <AssessmentIcon />,
      color: theme.palette.status?.info,
      items: [
        { text: 'Quiz Results', icon: <AssessmentIcon />, path: 'quiz-results', color: theme.palette.status?.info },
        { text: 'My Certificates', icon: <AssignmentIcon />, path: 'certificates', color: '#f57c00', isNew: true }
      ]
    }
  ];
  
  // Dean menu
  const deanMenuCategories = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      color: theme.palette.primary.main,
      alwaysExpanded: true,
      items: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: theme.palette.primary.main }
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <ChatIcon />,
      color: '#00897b',
      items: [
        { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: theme.palette.primary.dark },
        { text: 'Announcement History', icon: <HistoryIcon />, path: 'announcements/history', color: theme.palette.status?.warning },
        { text: 'Chats', icon: <ChatIcon />, path: 'chats', color: '#00897b', badge: totalUnreadChats > 0 ? totalUnreadChats : null }
      ]
    },
    {
      id: 'management',
      label: 'School Management',
      icon: <SupervisorAccountIcon />,
      color: theme.palette.secondary.main,
      items: [
        { text: 'School Management', icon: <SupervisorAccountIcon />, path: 'school-management', color: theme.palette.secondary.main },
        { text: 'Departments', icon: <BusinessIcon />, path: 'departments', color: theme.palette.secondary.main },
        { text: 'Teachers', icon: <PeopleIcon />, path: 'teachers', color: theme.palette.secondary.main }
      ]
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: <LockOpenIcon />,
      color: theme.palette.status?.error,
      items: [
        { text: 'Unlock Requests', icon: <LockOpenIcon />, path: 'unlock-requests', color: theme.palette.status?.error },
        { text: 'Signature Upload', icon: <AssignmentIcon />, path: 'certificates', color: '#009688', isNew: true }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChartIcon />,
      color: theme.palette.primary.main,
      items: [
        { text: 'Analytics', icon: <BarChartIcon />, path: 'analytics', color: theme.palette.primary.main },
        { text: 'Section Analytics', icon: <GroupsIcon />, path: 'section-analytics', color: theme.palette.primary.light, isNew: true },
        { text: 'Student Analytics', icon: <PersonSearchIcon />, path: 'student-analytics', color: '#ff5722', isNew: true }
      ]
    }
  ];

  // HOD menu
  const hodMenuCategories = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      color: theme.palette.primary.main,
      alwaysExpanded: true,
      items: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: theme.palette.primary.main }
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <ChatIcon />,
      color: '#00897b',
      items: [
        { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: theme.palette.primary.dark },
        { text: 'Announcement Approvals', icon: <AssignmentIcon />, path: 'announcement-approvals', color: theme.palette.status?.warning },
        { text: 'Announcement History', icon: <HistoryIcon />, path: 'announcements/history', color: theme.palette.status?.warning },
        { text: 'Chats', icon: <ChatIcon />, path: 'chats', color: '#00897b', badge: totalUnreadChats > 0 ? totalUnreadChats : null }
      ]
    },
    {
      id: 'management',
      label: 'Department Management',
      icon: <SupervisorAccountIcon />,
      color: theme.palette.secondary.main,
      items: [
        { text: 'Sections', icon: <GroupsIcon />, path: 'sections', color: theme.palette.primary.light },
        { text: 'Teachers', icon: <PeopleIcon />, path: 'teachers', color: theme.palette.secondary.main },
        { text: 'Courses', icon: <MdClass />, path: 'courses', color: theme.palette.secondary.light },
        { text: 'CC Management', icon: <SupervisorAccountIcon />, path: 'cc-management', color: theme.palette.secondary.main, isNew: true }
      ]
    },
    {
      id: 'content',
      label: 'Content & Activities',
      icon: <QuizIcon />,
      color: theme.palette.secondary.main,
      items: [
        { text: 'Quiz Management', icon: <QuizIcon />, path: 'quiz-management', color: theme.palette.secondary.main },
        { text: 'Certificate Management', icon: <AssignmentIcon />, path: 'certificates', color: '#1976d2', isNew: true }
      ]
    },
    {
      id: 'requests',
      label: 'Unlock Requests',
      icon: <LockOpenIcon />,
      color: theme.palette.status?.error,
      items: [
        { text: 'Video Unlock Requests', icon: <VideoLibraryIcon />, path: 'video-unlock-requests', color: theme.palette.status?.error },
        { text: 'Quiz Unlock Requests', icon: <LockOpenIcon />, path: 'quiz-unlock-requests', color: theme.palette.status?.error }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChartIcon />,
      color: '#9c27b0',
      items: [
        { text: 'Department Analytics', icon: <AssessmentIcon />, path: 'department-analytics', color: '#9c27b0', isNew: true },
        { text: 'Course Analytics', icon: <BarChartIcon />, path: 'course-analytics', color: '#673ab7', isNew: true },
        { text: 'Student Analytics', icon: <PersonSearchIcon />, path: 'student-analytics', color: '#ff5722', isNew: true }
      ]
    }
  ];

  // Select menu based on active role (from context) or fallback to user role
  const currentRole = activeRole || currentUser?.role || currentUser?.primaryRole;
  let menuCategories = [];
  let basePath = '';
  let roleName = '';
  let roleColor = '';
  
  console.log('🎯 Sidebar Role Selection:', {
    activeRole,
    userRole: currentUser?.role,
    primaryRole: currentUser?.primaryRole,
    selectedRole: currentRole
  });
  
  // Use strict role matching based on activeRole to prevent menu conflicts
  if (currentRole === 'admin') {
    menuCategories = adminMenuCategories;
    basePath = '/admin';
    roleName = 'Administrator';
    roleColor = theme.palette.roles?.admin || theme.palette.primary.dark;
  } else if (currentRole === 'dean') {
    menuCategories = deanMenuCategories;
    basePath = '/dean';
    roleName = 'Dean';
    roleColor = theme.palette.roles?.dean || theme.palette.secondary.main;
  } else if (currentRole === 'hod') {
    menuCategories = hodMenuCategories;
    basePath = '/hod';
    roleName = 'HOD';
    roleColor = theme.palette.roles?.hod || theme.palette.primary.main;
  } else if (currentRole === 'teacher') {
    // Filter teacher menu categories based on permissions and CC status
    menuCategories = teacherMenuCategories.map(category => ({
      ...category,
      items: category.items.filter(item => {
        // Special case: Hide CC Management if user is not currently a CC
        if (item.path === 'cc-management' && !ccStatus.isCC) {
          return false;
        }
        
        // Include if permission is null (always show) or user has the permission
        return item.permission === null || 
          (currentUser.permissions && hasPermission(currentUser, item.permission));
      })
    })).filter(category => category.items.length > 0); // Remove empty categories
    basePath = '/teacher';
    // Update role name based on actual CC status, not just activeRole
    roleName = ccStatus.isCC ? `Course Coordinator (${ccStatus.coursesCount} course${ccStatus.coursesCount !== 1 ? 's' : ''})` : 'Teacher';
    roleColor = ccStatus.isCC ? theme.palette.status?.info || theme.palette.primary.main : theme.palette.roles?.teacher || theme.palette.primary.light;
  } else if (currentRole === 'student') {
    menuCategories = studentMenuCategories;
    basePath = '/student';
    roleName = 'Student';
    roleColor = theme.palette.roles?.student || theme.palette.secondary.light;
  }

  // Get initials for the avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <Box component="nav" sx={{ width: { md: collapsed ? 80 : 280 }, flexShrink: { md: 0 }, transition: 'width 0.3s' }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            marginTop: '64px',
            height: 'calc(100% - 64px)',
            borderRight: 0,
            background: 'linear-gradient(180deg, #011f4b 0%, #03396c 100%)',
            color: '#ffffff !important',
            boxShadow: '4px 0px 24px rgba(1, 31, 75, 0.25)',
            overflowX: 'hidden',
            overflowY: 'auto',
            '& .MuiListItemText-primary': {
              color: '#ffffff !important',
            },
            '& .MuiListItemText-secondary': {
              color: 'rgba(255, 255, 255, 0.8) !important',
            },
            '& .MuiTypography-root': {
              color: 'inherit',
            },
            // Custom scrollbar styling
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.5)',
              },
            },
            '&::-webkit-scrollbar-thumb:active': {
              background: 'rgba(255, 255, 255, 0.7)',
            },
            // For Firefox
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.05)',
          },
        }}
      >
        <SidebarContent />
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: collapsed ? 80 : 280,
            transition: 'width 0.3s',
            borderRight: 0,
            background: 'linear-gradient(180deg, #011f4b 0%, #03396c 100%)',
            color: '#ffffff !important',
            boxShadow: '4px 0px 24px rgba(1, 31, 75, 0.25)',
            overflowX: 'hidden',
            overflowY: 'auto',
            '& .MuiListItemText-primary': {
              color: '#ffffff !important',
            },
            '& .MuiListItemText-secondary': {
              color: 'rgba(255, 255, 255, 0.8) !important',
            },
            '& .MuiTypography-root': {
              color: 'inherit',
            },
            // Custom scrollbar styling
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.5)',
              },
            },
            '&::-webkit-scrollbar-thumb:active': {
              background: 'rgba(255, 255, 255, 0.7)',
            },
            // For Firefox
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.05)',
          },
        }}
        open
      >
        <SidebarContent />
      </Drawer>
    </Box>
  );

  function SidebarContent() {
    return (
      <>
        <Toolbar sx={{ 
          background: 'linear-gradient(135deg, #011f4b 0%, #03396c 100%)',
          height: 80,
          display: 'flex',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #6497b1, transparent)',
          }
        }}>
          {!collapsed && (
            <Typography variant="h5" sx={{ 
              color: 'white', 
              fontWeight: 700, 
              letterSpacing: '0.5px',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)' 
            }}>
              SGT Learning
            </Typography>
          )}
          {collapsed && (
            <Typography variant="h6" sx={{ 
              color: 'white', 
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)' 
            }}>
              SGT
            </Typography>
          )}
        </Toolbar>
        
        {/* Toggle Button */}
        <Box sx={{ 
          display: { xs: 'none', md: 'flex' },
          justifyContent: 'flex-end',
          p: 1,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <IconButton
              onClick={toggleCollapsed}
              sx={{
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* User profile section */}
        <Box sx={{ 
          p: collapsed ? 1 : 3, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          mb: 2,
          background: 'rgba(255, 255, 255, 0.02)',
          transition: 'padding 0.3s'
        }}>
          <Avatar 
            sx={{ 
              width: collapsed ? 48 : 72, 
              height: collapsed ? 48 : 72, 
              bgcolor: roleColor,
              mb: collapsed ? 0 : 2,
              border: '3px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              fontSize: collapsed ? '1rem' : '1.5rem',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
              }
            }}
          >
            {getInitials(currentUser?.name || currentUser?.email)}
          </Avatar>
          {!collapsed && (
            <>
              <Typography variant="h6" sx={{ 
                color: 'white', 
                fontWeight: 600, 
                mb: 0.5,
                textAlign: 'center',
                fontSize: '1.1rem'
              }}>
                {currentUser?.name || currentUser?.email}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: roleColor,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  border: `1px solid ${roleColor}40`,
                }}
              >
                {roleName}
              </Typography>
            </>
          )}
        </Box>
        
        <List sx={{ px: collapsed ? 1 : 2, flex: 1 }}>
          {menuCategories.map((category, categoryIndex) => {
            const isExpanded = category.alwaysExpanded || expandedCategories[category.id];
            const hasSelectedItem = category.items.some(item => {
              const itemPath = item.path === '' ? basePath : `${basePath}/${item.path}`;
              return location.pathname === itemPath;
            });

            return (
              <Box key={category.id} sx={{ mb: 1.5 }}>
                {/* Category Header */}
                {!category.alwaysExpanded && (
                  <ListItemButton
                    onClick={() => toggleCategory(category.id)}
                    sx={{
                      borderRadius: '8px',
                      py: 1,
                      px: collapsed ? 1 : 2,
                      mb: 0.5,
                      bgcolor: hasSelectedItem ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <ListItemIcon sx={{ 
                      color: category.color, 
                      minWidth: collapsed ? 'auto' : 40,
                      justifyContent: 'center'
                    }}>
                      {category.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <>
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 600,
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.85rem',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}
                            >
                              {category.label}
                            </Typography>
                          }
                        />
                        {isExpanded ? <ExpandLessIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} /> : <ExpandMoreIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
                      </>
                    )}
                  </ListItemButton>
                )}

                {/* Category Items */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {category.items.map((item, index) => {
                      const isSelected = item.path === '' 
                        ? location.pathname === basePath 
                        : location.pathname === `${basePath}/${item.path}`;
                      
                      return (
                        <Tooltip key={item.text} title={collapsed ? item.text : ""} placement="right" arrow>
                          <ListItemButton 
                            onClick={() => navigate(`${basePath}/${item.path}`)}
                            sx={{ 
                              my: 0.5,
                              ml: collapsed ? 0 : (category.alwaysExpanded ? 0 : 2),
                              borderRadius: collapsed ? '12px' : '0 12px 12px 0',
                              py: 1.2,
                              px: collapsed ? 1.5 : 2,
                              justifyContent: collapsed ? 'center' : 'flex-start',
                              color: 'rgba(255, 255, 255, 0.9)',
                              position: 'relative',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              ...(isSelected && {
                                bgcolor: 'rgba(255, 255, 255, 0.15)',
                                color: '#ffffff',
                                borderLeft: collapsed ? 'none' : '4px solid #1976d2',
                                borderRadius: collapsed ? '12px' : '0 12px 12px 0',
                                boxShadow: '0 4px 20px rgba(25, 118, 210, 0.4)',
                                '&:hover': {
                                  bgcolor: 'rgba(255, 255, 255, 0.20)',
                                },
                                ...(!collapsed && {
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    right: 0,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '4px',
                                    height: '60%',
                                    backgroundColor: '#1976d2',
                                    borderRadius: '2px 0 0 2px',
                                  }
                                })
                              }),
                              ...(item.highlight && !isSelected && {
                                borderLeft: collapsed ? 'none' : `2px solid ${item.color}40`,
                              }),
                              '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.08)',
                                transform: collapsed ? 'scale(1.05)' : 'translateX(4px)',
                                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)',
                                color: '#ffffff'
                              },
                            }}
                          >
                            <ListItemIcon sx={{ 
                              color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                              minWidth: collapsed ? 'auto' : 50,
                              marginRight: 1,
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              filter: isSelected ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))' : 'none',
                              ...(isSelected && {
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                width: '36px',
                                height: '36px',
                                boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
                              })
                            }}>
                              {item.icon}
                            </ListItemIcon>
                            <ListItemText 
                              primary={
                                <Box display="flex" alignItems="center">
                                  <Typography
                                    variant="body2"
                                    sx={{ 
                                      fontWeight: isSelected ? 700 : 500,
                                      color: isSelected ? '#ffffff' : 'inherit',
                                      transition: 'all 0.3s ease',
                                      textShadow: isSelected ? `0 0 10px ${item.color}80` : 'none',
                                      fontSize: isSelected ? '0.95rem' : '0.9rem'
                                    }}
                                  >
                                    {item.text}
                                  </Typography>
                                  {item.isNew && (
                                    <Badge 
                                      sx={{ 
                                        ml: 1.5,
                                        "& .MuiBadge-badge": {
                                          fontSize: '0.6rem',
                                          height: 18,
                                          padding: '0 6px',
                                          backgroundColor: '#ff0066',
                                          color: 'white',
                                          fontWeight: 'bold',
                                          borderRadius: 10,
                                          boxShadow: '0 2px 6px rgba(255, 0, 102, 0.4)',
                                          animation: 'pulse 2s infinite'
                                        },
                                        '@keyframes pulse': {
                                          '0%': { boxShadow: '0 0 0 0 rgba(255, 0, 102, 0.7)' },
                                          '70%': { boxShadow: '0 0 0 6px rgba(255, 0, 102, 0)' },
                                          '100%': { boxShadow: '0 0 0 0 rgba(255, 0, 102, 0)' }
                                        }
                                      }}
                                      badgeContent="NEW"
                                    />
                                  )}
                                  {item.badge && (
                                    <Badge 
                                      sx={{ 
                                        ml: 1.5,
                                        "& .MuiBadge-badge": {
                                          fontSize: '0.6rem',
                                          height: 18,
                                          padding: '0 6px',
                                          backgroundColor: item.color || theme.palette.status?.success || '#059669',
                                          color: 'white',
                                          fontWeight: 'bold',
                                          borderRadius: 10,
                                          boxShadow: `0 2px 6px ${alpha(item.color || theme.palette.status?.success || '#059669', 0.4)}`,
                                        }
                                      }}
                                      badgeContent={item.badge}
                                    />
                                  )}
                                </Box>
                              }
                              sx={{ display: collapsed ? 'none' : 'block' }}
                            />
                          </ListItemButton>
                        </Tooltip>
                      );
                    })}
                  </List>
                </Collapse>
              </Box>
            );
          })}
        </List>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {!collapsed && (
          <Box 
            sx={{ 
              p: 2.5, 
              textAlign: 'center', 
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'linear-gradient(0deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
              mt: 2
            }}
          >
            <Typography 
              variant="caption" 
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 500,
                letterSpacing: '0.5px',
                fontSize: '0.7rem'
              }}
            >
              © {new Date().getFullYear()} SGT Learning Platform
              <Box component="span" sx={{ 
                display: 'block', 
                mt: 0.5, 
                color: '#6497b1', 
                fontWeight: 600 
              }}>
                Version 2.0
              </Box>
            </Typography>
          </Box>
        )}
      </>
    );
  }
};

export default Sidebar;
