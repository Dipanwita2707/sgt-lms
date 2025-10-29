import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const MultiRoleContext = createContext();

export const useMultiRole = () => {
  const context = useContext(MultiRoleContext);
  if (!context) {
    throw new Error('useMultiRole must be used within a MultiRoleProvider');
  }
  return context;
};

export const MultiRoleProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [currentRole, setCurrentRole] = useState('');
  const [loading, setLoading] = useState(true);

  // Initialize user and role data
  useEffect(() => {
    initializeUserData();
  }, []);

  // Set up axios interceptor to include active role in headers
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const activeRole = localStorage.getItem('activeRole') || currentRole;
      if (activeRole) {
        config.headers['x-active-role'] = activeRole;
      }
      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [currentRole]);

  const initializeUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Get current user info
      const userResponse = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userData = userResponse.data;
      setUser(userData);

      // Get user's available roles
      try {
        const rolesResponse = await axios.get(`/api/admin/users/${userData._id}/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setAvailableRoles(rolesResponse.data.availableRoles || []);
        
        // Set current role - check localStorage first, then user data
        const storedRole = localStorage.getItem('activeRole');
        const userRoles = rolesResponse.data.availableRoles || [];
        
        let activeRole = rolesResponse.data.currentRole || rolesResponse.data.primaryRole;
        
        // Validate stored role is still valid for this user
        if (storedRole && userRoles.includes(storedRole)) {
          activeRole = storedRole;
        }
        
        setCurrentRole(activeRole);
        localStorage.setItem('activeRole', activeRole);
        
      } catch (roleError) {
        console.warn('Failed to fetch user roles, using fallback data:', roleError);
        // Fallback to user object data - properly handle legacy users
        let fallbackRoles = [];
        if (userData.roles && userData.roles.length > 0) {
          fallbackRoles = userData.roles;
        } else if (userData.role) {
          // For legacy users, use the single role field
          fallbackRoles = [userData.role];
        }
        
        setAvailableRoles(fallbackRoles);
        
        const fallbackRole = userData.primaryRole || userData.role;
        setCurrentRole(fallbackRole);
        localStorage.setItem('activeRole', fallbackRole);
      }
    } catch (error) {
      console.error('Failed to initialize user data:', error);
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('activeRole');
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (newRole) => {
    if (!availableRoles.includes(newRole)) {
      throw new Error(`User does not have access to role: ${newRole}`);
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/admin/users/${user._id}/switch-role`,
        { newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCurrentRole(newRole);
      localStorage.setItem('activeRole', newRole);
      
      return true;
    } catch (error) {
      console.error('Failed to switch role:', error);
      throw error;
    }
  };

  const hasRole = (role) => {
    return availableRoles.includes(role);
  };

  const hasAnyRole = (roles) => {
    return roles.some(role => availableRoles.includes(role));
  };

  const hasAllRoles = (roles) => {
    return roles.every(role => availableRoles.includes(role));
  };

  const isCurrentRole = (role) => {
    return currentRole === role;
  };

  const refreshUserData = () => {
    setLoading(true);
    initializeUserData();
  };

  const logout = () => {
    setUser(null);
    setAvailableRoles([]);
    setCurrentRole('');
    localStorage.removeItem('token');
    localStorage.removeItem('activeRole');
  };

  const value = {
    user,
    availableRoles,
    currentRole,
    loading,
    switchRole,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isCurrentRole,
    refreshUserData,
    logout,
    isMultiRole: availableRoles.length > 1
  };

  return (
    <MultiRoleContext.Provider value={value}>
      {children}
    </MultiRoleContext.Provider>
  );
};

export default MultiRoleContext;