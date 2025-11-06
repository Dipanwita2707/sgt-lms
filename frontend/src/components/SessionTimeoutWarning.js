import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const SessionTimeoutWarning = ({ open, onExtendSession, countdown }) => {
  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#1e3a5f',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 2
        }}
      >
        <WarningAmberIcon />
        <Typography variant="h6" component="span">
          Session Timeout Warning
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        <Alert 
          severity="warning" 
          icon={<AccessTimeIcon />}
          sx={{
            mb: 3,
            backgroundColor: '#fff3e0',
            '& .MuiAlert-icon': {
              color: '#f57c00'
            }
          }}
        >
          Your session is about to expire due to inactivity
        </Alert>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, color: '#424242' }}>
            You will be automatically logged out in:
          </Typography>
          
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: '#ffecb3',
              border: '4px solid #ffa726',
              boxShadow: '0 4px 12px rgba(255, 167, 38, 0.3)'
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 'bold',
                color: '#e65100',
                fontFamily: 'monospace'
              }}
            >
              {countdown}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ mt: 2, color: '#757575' }}>
            seconds remaining
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: '#616161', textAlign: 'center' }}>
          Click "Stay Logged In" to continue your session
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: 'center',
          pb: 3,
          px: 3
        }}
      >
        <Button
          onClick={onExtendSession}
          variant="contained"
          size="large"
          fullWidth
          sx={{
            backgroundColor: '#1e3a5f',
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#2c5282',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(30, 58, 95, 0.4)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutWarning;
