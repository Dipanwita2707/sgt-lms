import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, Toolbar, Typography } from '@mui/material';
import Sidebar from '../components/Sidebar';
import { parseJwt } from '../utils/jwt';

const CCDashboardHome = React.lazy(() => import('./cc/CCDashboardHome'));
const CCReviews = React.lazy(() => import('./cc/CCReviews'));
const CCProfile = React.lazy(() => import('../components/CCProfile'));
const ChatDashboard = React.lazy(() => import('../components/ChatDashboard'));

const CCDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const location = useLocation();

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

  useEffect(() => {
    // no-op: placeholder for future notifications
  }, []);

  if (!currentUser || (currentUser.role !== 'cc' && currentUser.role !== 'admin')) {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === '/cc') {
    return <Navigate to="/cc/dashboard" replace />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ 
        width: sidebarCollapsed ? '80px' : '280px', 
        flexShrink: 0,
        transition: 'width 0.3s'
      }}>
        <Sidebar currentUser={currentUser} />
      </Box>
      <Box sx={{ 
        flexGrow: 1, 
        minHeight: '100vh', 
        bgcolor: '#f5f5f5',
        width: `calc(100% - ${sidebarCollapsed ? 80 : 280}px)`,
        transition: 'width 0.3s'
      }}>
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', px: 3, py: 1 }}>
          <Typography variant="h5">Course Coordinator</Typography>
        </Box>
        <Toolbar />
        <React.Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}> 
          <Routes>
            <Route path="/dashboard" element={<CCDashboardHome />} />
            <Route path="/profile" element={<CCProfile />} />
            <Route path="/chats" element={<ChatDashboard />} />
            <Route path="/reviews" element={<CCReviews />} />
            <Route path="*" element={<Navigate to="/cc/dashboard" replace />} />
          </Routes>
        </React.Suspense>
      </Box>
    </Box>
  );
};

export default CCDashboard;
