import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Tooltip,
  Divider
} from '@mui/material';
import {
  PersonOutline,
  SupervisorAccount,
  School,
  AdminPanelSettings,
  Business,
  SwapHoriz,
  AccountCircle,
  ExpandMore
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RoleSwitcher = ({ user, onRoleChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [currentRole, setCurrentRole] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Role icons mapping
  const roleIcons = {
    admin: <AdminPanelSettings color="primary" />,
    dean: <Business color="secondary" />,
    hod: <SupervisorAccount color="success" />,
    teacher: <School color="info" />,
    student: <PersonOutline color="warning" />
  };

  // Role colors mapping
  const roleColors = {
    admin: 'primary',
    dean: 'secondary',
    hod: 'success', 
    teacher: 'info',
    student: 'warning'
  };

  // Dashboard routes mapping
  const dashboardRoutes = {
    admin: '/admin/dashboard',
    dean: '/dean/dashboard',
    hod: '/hod/dashboard',
    teacher: '/teacher/dashboard',
    student: '/student/dashboard'
  };

  useEffect(() => {
    fetchUserRoles();
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user?._id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/admin/users/${user._id}/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserRoles(response.data.availableRoles || []);
      setCurrentRole(response.data.currentRole || response.data.primaryRole || '');
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      // Fallback to user prop data
      if (user.roles) {
        setUserRoles(user.roles);
        setCurrentRole(user.primaryRole || user.role);
      } else if (user.role) {
        setUserRoles([user.role]);
        setCurrentRole(user.role);
      }
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRoleSwitch = async (newRole) => {
    if (newRole === currentRole) {
      handleMenuClose();
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/admin/users/${user._id}/switch-role`,
        { newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setCurrentRole(newRole);
      
      // Update token with new role header for future requests
      localStorage.setItem('activeRole', newRole);

      // Call parent callback
      if (onRoleChange) {
        onRoleChange(newRole);
      }

      // Navigate to appropriate dashboard
      const targetRoute = dashboardRoutes[newRole];
      if (targetRoute) {
        navigate(targetRoute);
      }

      // Show success message
      console.log(`Switched to ${newRole} role successfully`);
    } catch (error) {
      console.error('Failed to switch role:', error);
      alert(`Failed to switch to ${newRole} role. Please try again.`);
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };

  const formatRoleName = (role) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Don't render if user has only one role
  if (userRoles.length <= 1) {
    return (
      <Box display="flex" alignItems="center" sx={{ ml: 1 }}>
        <Chip
          icon={roleIcons[currentRole]}
          label={formatRoleName(currentRole)}
          color={roleColors[currentRole]}
          size="small"
        />
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center" sx={{ ml: 1 }}>
      <Tooltip title="Switch Role">
        <IconButton
          onClick={handleMenuOpen}
          disabled={loading}
          sx={{ 
            borderRadius: 2,
            px: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {roleIcons[currentRole]}
            <Typography variant="body2" color="inherit">
              {formatRoleName(currentRole)}
            </Typography>
            <ExpandMore fontSize="small" />
          </Box>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: 200,
            mt: 1
          }
        }}
      >
        <MenuItem disabled>
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          <ListItemText 
            primary="Switch Role" 
            secondary={`${user?.name || 'User'}`}
          />
        </MenuItem>
        <Divider />

        {userRoles.map((role) => (
          <MenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
            selected={role === currentRole}
            disabled={loading}
          >
            <ListItemIcon>
              {roleIcons[role]}
            </ListItemIcon>
            <ListItemText primary={formatRoleName(role)} />
            {role === currentRole && (
              <Box sx={{ ml: 1 }}>
                <Chip 
                  label="Active" 
                  size="small" 
                  color={roleColors[role]}
                  variant="outlined"
                />
              </Box>
            )}
          </MenuItem>
        ))}

        <Divider />
        <MenuItem disabled>
          <ListItemIcon>
            <SwapHoriz />
          </ListItemIcon>
          <ListItemText 
            primary={`${userRoles.length} roles available`}
            primaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default RoleSwitcher;