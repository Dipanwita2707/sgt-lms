import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { parseJwt } from './jwt';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = () => {
      // Get token from localStorage
      const token = localStorage.getItem('token');

      // If no token, not authenticated
      if (!token) {
        setAuthenticated(false);
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        // Parse JWT to get user data
        const userData = parseJwt(token);

        // Check if token is valid and not expired
        if (!userData || userData.exp * 1000 < Date.now()) {
          console.log('Token expired or invalid');
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setAuthenticated(false);
          setHasPermission(false);
        } else {
          // Check if user has the required role
          setAuthenticated(true);
          setHasPermission(
            allowedRoles.length === 0 || allowedRoles.includes(userData.role)
          );
        }
      } catch (error) {
        console.error('Error verifying authentication:', error);
        setAuthenticated(false);
        setHasPermission(false);
      }

      setLoading(false);
    };

    verifyAuth();
  }, [allowedRoles]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!authenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasPermission) {
    // Redirect to unauthorized page if doesn't have permission
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
