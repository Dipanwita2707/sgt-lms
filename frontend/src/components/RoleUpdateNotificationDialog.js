import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const RoleUpdateNotificationDialog = ({ 
  open, 
  onClose, 
  updatedUser,
  onForceLogout 
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleForceLogout = async () => {
    setIsLoggingOut(true);
    if (onForceLogout) {
      await onForceLogout(updatedUser);
    }
  };

  if (!updatedUser) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'warning.light', 
        color: 'warning.contrastText',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <RefreshIcon />
        Role Update Successful
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>{updatedUser.name}'s</strong> roles have been successfully updated in the database!
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            New Role Configuration:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="primary" />
              </ListItemIcon>
              <ListItemText>
                <strong>Roles:</strong> {updatedUser.roles?.join(', ') || 'None'}
              </ListItemText>
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="primary" />
              </ListItemIcon>
              <ListItemText>
                <strong>Primary Role:</strong> {updatedUser.primaryRole || 'None'}
              </ListItemText>
            </ListItem>
          </List>
        </Box>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            ⚠️ Important: JWT Token Refresh Required
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            The user's browser still contains the old authentication token. 
            To see the new roles and use the role switching feature, 
            <strong> {updatedUser.name} must log out and log back in</strong>.
          </Typography>
        </Alert>

        <Box sx={{ 
          bgcolor: 'grey.100', 
          p: 2, 
          borderRadius: 1,
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="subtitle2" gutterBottom>
            💡 How it works:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • JWT tokens contain role information and cannot be updated in real-time<br/>
            • New roles are saved to database immediately ✅<br/>
            • Fresh JWT token with new roles is generated at login<br/>
            • Role switching feature will be available after re-login
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          I'll Tell Them Later
        </Button>
        
        {updatedUser.email && (
          <Button
            onClick={handleForceLogout}
            variant="contained"
            color="warning"
            disabled={isLoggingOut}
            startIcon={<LogoutIcon />}
          >
            {isLoggingOut ? 'Notifying...' : 'Send Logout Notification'}
          </Button>
        )}
        
        <Button onClick={onClose} variant="contained">
          Got It!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleUpdateNotificationDialog;