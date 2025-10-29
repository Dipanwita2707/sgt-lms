import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Typography,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  SwapHoriz as SwitchIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useUserRole } from '../contexts/UserRoleContext';

const RoleSwitcher = () => {
  const { 
    user, 
    activeRole, 
    availableRoles, 
    switchRole, 
    getRoleInfo, 
    getDashboardRoute,
    isMultiRole,
    getRoleAssignment,
    getCurrentRoleAssignment,
    getCurrentSchool,
    getCurrentDepartments
  } = useUserRole();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRoleSwitch = (newRole) => {
    handleClose();
    if (newRole !== activeRole) {
      const success = switchRole(newRole);
      if (!success) {
        console.error('Failed to switch role to:', newRole);
      }
    }
  };

  // Format role context information (school/department)
  const formatRoleContext = (role) => {
    const assignment = getRoleAssignment(role);
    if (!assignment) return '';
    
    const contextParts = [];
    
    // For Dean role, show schools
    if (role === 'dean' && assignment.schools && assignment.schools.length > 0) {
      const schoolNames = assignment.schools.map(school => school.name || school).join(', ');
      contextParts.push(`Schools: ${schoolNames}`);
    }
    
    // For other roles, show school and departments
    else {
      if (assignment.school) {
        const schoolName = assignment.school.name || assignment.school;
        contextParts.push(`School: ${schoolName}`);
      }
      
      if (assignment.departments && assignment.departments.length > 0) {
        const deptNames = assignment.departments.map(dept => dept.name || dept).join(', ');
        contextParts.push(`Dept: ${deptNames}`);
      }
    }
    
    return contextParts.join(' • ');
  };

  if (!user || !activeRole) {
    return null;
  }

  const currentRoleInfo = getRoleInfo(activeRole);

  return (
    <Box>
      <Tooltip title={isMultiRole ? "Click to switch roles" : "Current role"}>
        <Button
          onClick={handleClick}
          startIcon={<AccountIcon />}
          endIcon={isMultiRole ? <SwitchIcon /> : null}
          variant="outlined"
          sx={{
            borderColor: currentRoleInfo.color,
            color: currentRoleInfo.color,
            '&:hover': {
              borderColor: currentRoleInfo.color,
              backgroundColor: `${currentRoleInfo.color}10`
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '16px' }}>{currentRoleInfo.icon}</span>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                {user.name}
              </Typography>
              <Typography variant="caption" sx={{ color: currentRoleInfo.color, lineHeight: 1 }}>
                {currentRoleInfo.name}
              </Typography>
            </Box>
          </Box>
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 280,
            mt: 1
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
          <Chip 
            label={`${availableRoles.length} Role${availableRoles.length > 1 ? 's' : ''} Available`}
            size="small"
            color="primary"
            sx={{ mt: 1 }}
          />
        </Box>

        {/* Current Role */}
        <Box sx={{ p: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ px: 1, fontWeight: 'bold' }}>
            Current Role
          </Typography>
          <MenuItem 
            selected
            sx={{ 
              backgroundColor: `${currentRoleInfo.color}15 !important`,
              border: `1px solid ${currentRoleInfo.color}30`,
              borderRadius: 1,
              mx: 1,
              mb: 1
            }}
          >
            <ListItemIcon>
              <span style={{ fontSize: '20px' }}>{currentRoleInfo.icon}</span>
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {currentRoleInfo.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentRoleInfo.description}
              </Typography>
              {formatRoleContext(activeRole) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                  {formatRoleContext(activeRole)}
                </Typography>
              )}
            </ListItemText>
            <DashboardIcon sx={{ color: currentRoleInfo.color, ml: 1 }} />
          </MenuItem>
        </Box>

        {/* Available Roles to Switch */}
        {isMultiRole && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ p: 1 }}>
              <Typography variant="overline" color="text.secondary" sx={{ px: 1, fontWeight: 'bold' }}>
                Switch to Role
              </Typography>
              {availableRoles
                .filter(role => role !== activeRole)
                .map((role) => {
                  const roleInfo = getRoleInfo(role);
                  return (
                    <MenuItem
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      sx={{ 
                        mx: 1, 
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: `${roleInfo.color}10`
                        }
                      }}
                    >
                      <ListItemIcon>
                        <span style={{ fontSize: '18px' }}>{roleInfo.icon}</span>
                      </ListItemIcon>
                      <ListItemText>
                        <Typography variant="body2">
                          {roleInfo.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {roleInfo.description}
                        </Typography>
                        {formatRoleContext(role) && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                            {formatRoleContext(role)}
                          </Typography>
                        )}
                      </ListItemText>
                      <SwitchIcon sx={{ color: roleInfo.color, ml: 1 }} />
                    </MenuItem>
                  );
                })
              }
            </Box>
          </>
        )}

        {!isMultiRole && (
          <Box sx={{ p: 2 }}>
            <Alert severity="info" variant="outlined">
              You have a single role assigned. Contact admin to get additional roles.
            </Alert>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />
        
        {/* Quick Actions */}
        <Box sx={{ p: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ px: 1, fontWeight: 'bold' }}>
            Quick Actions
          </Typography>
          <MenuItem onClick={() => { window.location.href = getDashboardRoute(activeRole); }}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText>Go to Dashboard</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { 
            localStorage.removeItem('token'); 
            localStorage.removeItem('activeRole'); 
            window.location.href = '/login'; 
          }}>
            <ListItemIcon>
              <span style={{ fontSize: '18px' }}>🚪</span>
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Box>
      </Menu>
    </Box>
  );
};

export default RoleSwitcher;