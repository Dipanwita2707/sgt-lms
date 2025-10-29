import React, { createContext, useContext, useState, useEffect } from 'react';
import { parseJwt } from '../utils/jwt';

const UserRoleContext = createContext();

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
};

export const UserRoleProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [roleAssignments, setRoleAssignments] = useState([]);
  const [activeRoleAssignment, setActiveRoleAssignment] = useState(null);

  // Role hierarchy for determining primary role (highest priority first)
  const getRoleHierarchy = () => {
    return ['admin', 'dean', 'hod', 'teacher', 'student'];
  };

  // Get the highest priority role from available roles
  const getPrimaryRole = (roles) => {
    const hierarchy = getRoleHierarchy();
    for (const role of hierarchy) {
      if (roles.includes(role)) {
        return role;
      }
    }
    return roles[0]; // Fallback to first role if none found in hierarchy
  };

  // Initialize user data from token
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      try {
        const userData = parseJwt(storedToken);
        setUser(userData);
        
        // Get available roles (support both legacy and new multi-role system)
        let roles = [];
        if (userData.roles && Array.isArray(userData.roles)) {
          roles = userData.roles;
        } else if (userData.role) {
          roles = [userData.role];
        }
        
        setAvailableRoles(roles);
        
        // Set role assignments for enhanced multi-role system
        const assignments = userData.roleAssignments || [];
        setRoleAssignments(assignments);
        
        // Determine the primary role based on hierarchy
        const hierarchyBasedPrimary = getPrimaryRole(roles);
        const actualPrimaryRole = userData.primaryRole || hierarchyBasedPrimary;
        
        // Set active role from localStorage or default to primary role
        const savedActiveRole = localStorage.getItem('activeRole');
        let finalActiveRole;
        if (savedActiveRole && roles.includes(savedActiveRole)) {
          setActiveRole(savedActiveRole);
          finalActiveRole = savedActiveRole;
        } else {
          // Default to the highest priority role available
          setActiveRole(actualPrimaryRole);
          localStorage.setItem('activeRole', actualPrimaryRole);
          finalActiveRole = actualPrimaryRole;
        }
        
        // Set initial active role assignment
        const initialAssignment = assignments.find(assignment => assignment.role === finalActiveRole);
        setActiveRoleAssignment(initialAssignment || null);
        
        console.log('🔐 User Role Context initialized:', {
          user: userData.name,
          email: userData.email,
          availableRoles: roles,
          tokenPrimaryRole: userData.primaryRole,
          hierarchyBasedPrimary: hierarchyBasedPrimary,
          finalPrimaryRole: actualPrimaryRole,
          activeRole: savedActiveRole || actualPrimaryRole
        });
        
      } catch (error) {
        console.error('Error parsing JWT token:', error);
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('activeRole');
      }
    }
  }, []);

  // Switch to a different role
  const switchRole = (newRole) => {
    if (!availableRoles.includes(newRole)) {
      console.error(`Cannot switch to role ${newRole}. Available roles:`, availableRoles);
      return false;
    }
    
    console.log(`🔄 Switching from ${activeRole} to ${newRole}`);
    setActiveRole(newRole);
    localStorage.setItem('activeRole', newRole);
    
    // Update active role assignment context
    const newAssignment = roleAssignments.find(assignment => assignment.role === newRole);
    setActiveRoleAssignment(newAssignment || null);
    
    // Redirect to the correct dashboard for the new role
    const newDashboardRoute = getDashboardRoute(newRole);
    console.log(`🎯 Redirecting to: ${newDashboardRoute}`);
    window.location.href = newDashboardRoute;
    return true;
  };

  // Get dashboard route for a role
  const getDashboardRoute = (role) => {
    const routes = {
      admin: '/admin/dashboard', 
      dean: '/dean/dashboard',
      hod: '/hod/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard'
    };
    return routes[role] || '/dashboard';
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return availableRoles.includes(role);
  };

  // Check if user can access a specific role (for permissions)
  const canAccessRole = (role) => {
    // Admin can access any role for testing purposes
    if (hasRole('admin')) {
      return true;
    }
    return hasRole(role);
  };

  // Get role display information
  const getRoleInfo = (role) => {
    const roleInfo = {
      admin: { 
        name: 'Administrator', 
        color: '#d32f2f', 
        icon: '👑',
        description: 'System Administration'
      },
      dean: { 
        name: 'Dean', 
        color: '#1976d2', 
        icon: '🏛️',
        description: 'School Administration'
      },
      hod: { 
        name: 'HOD', 
        color: '#388e3c', 
        icon: '📋',
        description: 'Department Head'
      },
      teacher: { 
        name: 'Teacher', 
        color: '#f57c00', 
        icon: '👨‍🏫',
        description: 'Faculty Member'
      },
      student: { 
        name: 'Student', 
        color: '#5d4037', 
        icon: '🎓',
        description: 'Student'
      }
    };
    return roleInfo[role] || { 
      name: role, 
      color: '#757575', 
      icon: '👤',
      description: 'User'
    };
  };

  // Get current role's school and department assignments
  const getCurrentRoleAssignment = () => {
    return activeRoleAssignment;
  };

  // Get school for current active role
  const getCurrentSchool = () => {
    if (!activeRoleAssignment) return null;
    return activeRoleAssignment.school || null;
  };

  // Get departments for current active role
  const getCurrentDepartments = () => {
    if (!activeRoleAssignment) return [];
    return activeRoleAssignment.departments || [];
  };

  // Get schools for current active role (for dean role)
  const getCurrentSchools = () => {
    if (!activeRoleAssignment) return [];
    return activeRoleAssignment.schools || [];
  };

  // Get role assignment by role name
  const getRoleAssignment = (roleName) => {
    return roleAssignments.find(assignment => assignment.role === roleName);
  };

  const contextValue = {
    user,
    token,
    activeRole,
    availableRoles,
    roleAssignments,
    activeRoleAssignment,
    switchRole,
    hasRole,
    canAccessRole,
    getDashboardRoute,
    getRoleInfo,
    getCurrentRoleAssignment,
    getCurrentSchool,
    getCurrentDepartments,
    getCurrentSchools,
    getRoleAssignment,
    isMultiRole: availableRoles.length > 1
  };

  return (
    <UserRoleContext.Provider value={contextValue}>
      {children}
    </UserRoleContext.Provider>
  );
};