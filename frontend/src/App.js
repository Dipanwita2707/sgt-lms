import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResetPasswordErrorPage from './pages/ResetPasswordErrorPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import VerifyCertificate from './pages/public/VerifyCertificate';
import PrivateRoute from './components/PrivateRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import { restoreUserFromToken } from './utils/authService';
import { UserRoleProvider } from './contexts/UserRoleContext';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const DeanDashboard = lazy(() => import('./pages/DeanDashboard'));
const HODDashboard = lazy(() => import('./pages/HODDashboard'));
const CCDashboard = lazy(() => import('./pages/CCDashboard'));
const GroupChatPageEnhanced = lazy(() => import('./components/GroupChatPageEnhanced'));
const GroupChatPage = lazy(() => import('./components/GroupChatPage')); // Legacy fallback
const GroupChatListPage = lazy(() => import('./components/GroupChatList'));

// Create a simple theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f4f6f8',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Roboto, Arial',
  },
});

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef();
  const warningTimerRef = useRef();
  const countdownIntervalRef = useRef();
  
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  const INACTIVITY_LIMIT = 300000; // 5 minutes in ms
  const WARNING_TIME = 240000; // 4 minutes in ms (show warning 1 minute before logout)

  // Check if user is on a protected page (video watching or quiz)
  const isOnProtectedPage = () => {
    const path = location.pathname;
    const isWatchingVideo = path.includes('/video/') || path.includes('/watch/');
    const isTakingQuiz = path.includes('/quiz/') || path.includes('/secure-quiz/') || path.includes('/attempt/');
    return isWatchingVideo || isTakingQuiz;
  };

  // Clear all timers
  const clearAllTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  // Handle session expiry
  const handleSessionExpiry = () => {
    clearAllTimers();
    setShowWarning(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
    navigate('/login');
  };

  // Extend session when user clicks "Stay Logged In"
  const handleExtendSession = () => {
    console.log('🔄 Session extended by user');
    setShowWarning(false);
    clearAllTimers();
    resetTimer(); // Restart the full 5-minute timer
  };

  // Show warning dialog
  const showWarningDialog = () => {
    // Don't show warning if on protected pages
    if (isOnProtectedPage()) {
      console.log('⏯️ Skipping session timeout - user is watching video or taking quiz');
      resetTimer(); // Just reset the timer silently
      return;
    }

    console.log('⚠️ Showing session timeout warning');
    setShowWarning(true);
    setCountdown(60);

    // Start countdown
    let remainingSeconds = 60;
    countdownIntervalRef.current = setInterval(() => {
      remainingSeconds--;
      setCountdown(remainingSeconds);
      
      if (remainingSeconds <= 0) {
        clearInterval(countdownIntervalRef.current);
        handleSessionExpiry();
      }
    }, 1000);
  };

  // Reset inactivity timer
  const resetTimer = () => {
    // Don't apply session timeout on protected pages
    if (isOnProtectedPage()) {
      return;
    }

    clearAllTimers();
    setShowWarning(false);

    // Set warning timer (4 minutes)
    warningTimerRef.current = setTimeout(() => {
      showWarningDialog();
    }, WARNING_TIME);

    // Set logout timer (5 minutes - backup in case warning is dismissed)
    timerRef.current = setTimeout(() => {
      if (!showWarning) {
        handleSessionExpiry();
      }
    }, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    restoreUserFromToken();
    
    // List of events to consider as activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); // Start timer on mount
    
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearAllTimers();
    };
  }, []);

  // Reset timer when location changes (navigating counts as activity)
  useEffect(() => {
    resetTimer();
  }, [location.pathname]);

  return (
    <UserRoleProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
    <Suspense fallback={<div style={{padding: 24}}>Loading…</div>}>
    <Routes>
        {/* Public Routes - No Authentication Required */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/reset-password-error" element={<ResetPasswordErrorPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/verify-certificate/:hash?" element={<VerifyCertificate />} />
        <Route path="/verify" element={<VerifyCertificate />} />
        
        {/* Protected Routes - Authentication Required */}
        <Route 
          path="/admin/*" 
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/dean/*" 
          element={
            <PrivateRoute allowedRoles={['dean', 'admin']}>
              <DeanDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/hod/*" 
          element={
            <PrivateRoute allowedRoles={['hod', 'admin']}>
              <HODDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/teacher/*" 
          element={
            <PrivateRoute allowedRoles={['teacher', 'admin']}>
              <TeacherDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/cc/*" 
          element={
            <PrivateRoute allowedRoles={['teacher', 'admin']}>
              <CCDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/student/*" 
          element={
            <PrivateRoute allowedRoles={['student', 'admin']}>
              <StudentDashboard />
            </PrivateRoute>
          } 
        />
        {/* Enhanced Group Chat Route (Default) */}
        <Route 
          path="/group-chat/:courseId/:sectionId" 
          element={
            <PrivateRoute allowedRoles={['student', 'teacher', 'hod', 'dean', 'admin', 'cc', 'superadmin']}>
              <GroupChatPageEnhanced />
            </PrivateRoute>
          } 
        />
        {/* Original Group Chat Route (Legacy fallback) */}
        <Route 
          path="/group-chat-legacy/:courseId/:sectionId" 
          element={
            <PrivateRoute allowedRoles={['student', 'teacher', 'hod', 'dean', 'admin', 'cc', 'superadmin']}>
              <GroupChatPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/group-chat-list" 
          element={
            <PrivateRoute allowedRoles={['hod', 'dean', 'admin', 'superadmin']}>
              <GroupChatListPage />
            </PrivateRoute>
          } 
        />
        {/* Live class routes removed - moved to independent video call module */}
        <Route path="/dashboard" element={<RoleBasedRedirect />} />
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
    </Suspense>
      <SessionTimeoutWarning 
        open={showWarning} 
        onExtendSession={handleExtendSession} 
        countdown={countdown} 
      />
      </ThemeProvider>
    </UserRoleProvider>
  );
}

export default App;
