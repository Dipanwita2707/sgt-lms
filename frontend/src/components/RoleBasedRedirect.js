import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../contexts/UserRoleContext';
import { parseJwt } from '../utils/jwt';

const RoleBasedRedirect = () => {
  const { activeRole, getDashboardRoute, switchRole } = useUserRole();

  useEffect(() => {
    // Check if we're on the root path and redirect based on active role
    if (window.location.pathname === '/' && activeRole) {
      const dashboardRoute = getDashboardRoute(activeRole);
      window.location.href = dashboardRoute;
    }
  }, [activeRole, getDashboardRoute]);

  // If we have an active role, redirect to appropriate dashboard
  if (activeRole) {
    const dashboardRoute = getDashboardRoute(activeRole);
    return <Navigate to={dashboardRoute} replace />;
  }

  // If no active role but we have a token, try to set one
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const userData = parseJwt(token);
      if (userData) {
        let availableRoles = [];
        if (userData.roles && Array.isArray(userData.roles)) {
          availableRoles = userData.roles;
        } else if (userData.role) {
          availableRoles = [userData.role];
        }

        if (availableRoles.length > 0) {
          // Use role hierarchy to determine the primary role
          const roleHierarchy = ['admin', 'dean', 'hod', 'teacher', 'student'];
          let primaryRole = userData.primaryRole;
          
          // If no primary role set, determine from hierarchy
          if (!primaryRole) {
            for (const role of roleHierarchy) {
              if (availableRoles.includes(role)) {
                primaryRole = role;
                break;
              }
            }
          }
          
          const defaultRole = primaryRole || availableRoles[0];
          switchRole(defaultRole);
          return null; // Will refresh and redirect
        }
      }
    } catch (error) {
      console.error('Error parsing token for redirect:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('activeRole');
    }
  }

  // No valid token or role, redirect to login
  return <Navigate to="/login" replace />;
};

export default RoleBasedRedirect;