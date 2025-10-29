import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResetPasswordErrorPage from './pages/ResetPasswordErrorPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import VerifyCertificate from './pages/public/VerifyCertificate';
import PrivateRoute from './components/PrivateRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';
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
  const timerRef = useRef();
  const INACTIVITY_LIMIT = 300000; // 5 minutes in ms

  // Reset inactivity timer
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Clear session (localStorage, etc.)
      localStorage.removeItem('token');
      // You may want to clear other session data here
      navigate('/login');
    }, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    restoreUserFromToken();
    
    // List of events to consider as activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); // Start timer on mount
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
      </ThemeProvider>
    </UserRoleProvider>
  );
}

export default App;
