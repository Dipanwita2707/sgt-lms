import React, { useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useUserRole } from '../contexts/UserRoleContext';

/**
 * Component to ensure user is on the correct dashboard based on their active role
 * If user is on wrong dashboard, redirect to correct one
 */
const DashboardRoleGuard = ({ children, requiredRole }) => {
  const { activeRole, getDashboardRoute } = useUserRole();
  const location = useLocation();

  useEffect(() => {
    if (activeRole) {
      console.log('🛡️ DashboardRoleGuard Check:', {
        currentPath: location.pathname,
        activeRole,
        requiredRole,
        shouldRedirect: activeRole !== requiredRole
      });
    }
  }, [activeRole, requiredRole, location.pathname]);

  // If user's active role doesn't match the required role for this dashboard
  if (activeRole && activeRole !== requiredRole) {
    const correctDashboard = getDashboardRoute(activeRole);
    console.log(`🔄 Redirecting from ${location.pathname} to ${correctDashboard} (active role: ${activeRole})`);
    return <Navigate to={correctDashboard} replace />;
  }

  // If active role matches required role, render the dashboard
  return children;
};

export default DashboardRoleGuard;