import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Chip
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

/**
 * SecurityViolationDialog - A reusable dialog component for displaying security violations
 * with attempt tracking and countdown timer
 */
const SecurityViolationDialog = ({
  open,
  violationType,
  currentAttempt,
  maxAttempts,
  countdown,
  onDismiss,
  autoSubmitting = false
}) => {
  // Debug: Log when component renders and props
  console.log('🚨 SecurityViolationDialog render:', {
    open,
    violationType,
    currentAttempt,
    maxAttempts,
    countdown,
    autoSubmitting
  });

  // Debug: If dialog should be open but isn't visible, there might be a rendering issue
  if (open) {
    console.log('🚨 DIALOG SHOULD BE OPEN! If you cannot see it, there is a rendering/CSS issue');
  }

  // Get violation-specific messages and icons
  const getViolationInfo = () => {
    switch (violationType) {
      case 'tab-switch':
        return {
          title: 'Tab Switching Detected',
          icon: <WarningIcon sx={{ fontSize: 60, color: '#ff9800' }} />,
          message: 'You switched to another tab or window.',
          instruction: 'Stay focused on the quiz page at all times.',
          severity: 'warning'
        };
      case 'alt-tab':
        return {
          title: 'Alt+Tab Detected',
          icon: <WarningIcon sx={{ fontSize: 60, color: '#ff9800' }} />,
          message: 'You used Alt+Tab to switch applications.',
          instruction: 'Do not switch between applications during the quiz.',
          severity: 'warning'
        };
      case 'fullscreen-exit':
        return {
          title: 'Fullscreen Mode Exited',
          icon: <WarningIcon sx={{ fontSize: 60, color: '#ff9800' }} />,
          message: 'You exited fullscreen mode.',
          instruction: 'The quiz must be taken in fullscreen mode. Return to fullscreen immediately.',
          severity: 'warning'
        };
      case 'window-minimize':
        return {
          title: 'Window Minimized',
          icon: <WarningIcon sx={{ fontSize: 60, color: '#ff9800' }} />,
          message: 'You minimized or resized the browser window.',
          instruction: 'Keep the browser window maximized in fullscreen mode.',
          severity: 'warning'
        };
      case 'suspicious-timing':
        return {
          title: 'Suspicious Activity',
          icon: <ErrorIcon sx={{ fontSize: 60, color: '#f44336' }} />,
          message: 'You were away from the quiz for an extended period.',
          instruction: 'Stay focused on the quiz without leaving the page.',
          severity: 'error'
        };
      case 'keyboard-shortcut':
        return {
          title: 'Forbidden Shortcut Used',
          icon: <ErrorIcon sx={{ fontSize: 60, color: '#f44336' }} />,
          message: 'You attempted to use a forbidden keyboard shortcut.',
          instruction: 'Do not use developer tools, copy/paste, or system shortcuts during the quiz.',
          severity: 'error'
        };
      case 'context-menu':
        return {
          title: 'Right-Click Detected',
          icon: <InfoIcon sx={{ fontSize: 60, color: '#2196f3' }} />,
          message: 'You attempted to open the context menu.',
          instruction: 'Right-clicking is disabled during the quiz.',
          severity: 'info'
        };
      case 'clipboard':
        return {
          title: 'Clipboard Action Blocked',
          icon: <ErrorIcon sx={{ fontSize: 60, color: '#f44336' }} />,
          message: 'You attempted to copy, cut, or paste content.',
          instruction: 'Clipboard operations are not allowed during the quiz.',
          severity: 'error'
        };
      case 'devtools-open-heuristic':
        return {
          title: 'Developer Tools Detected',
          icon: <ErrorIcon sx={{ fontSize: 60, color: '#f44336' }} />,
          message: 'Developer tools may be open.',
          instruction: 'Close all developer tools and browser extensions immediately.',
          severity: 'error'
        };
      default:
        return {
          title: 'Security Violation',
          icon: <WarningIcon sx={{ fontSize: 60, color: '#ff9800' }} />,
          message: 'A security rule has been violated.',
          instruction: 'Follow all quiz rules to avoid automatic submission.',
          severity: 'warning'
        };
    }
  };

  const violationInfo = getViolationInfo();
  const isLastAttempt = currentAttempt >= maxAttempts;
  const remainingAttempts = Math.max(0, maxAttempts - currentAttempt);
  const progressValue = (currentAttempt / maxAttempts) * 100;

  // Check if we're in fullscreen mode
  const isFullscreen = document.fullscreenElement !== null;
  
  // Use custom overlay for fullscreen mode to ensure visibility
  if (open && isFullscreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999, // Very high z-index for fullscreen
        fontFamily: 'Roboto, Arial, sans-serif'
      }}>
        <div style={{
          backgroundColor: isLastAttempt ? '#ffebee' : '#fff3e0',
          border: `3px solid ${isLastAttempt ? '#f44336' : '#ff9800'}`,
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          textAlign: 'center'
        }}>
          {/* Title with icon */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '60px', color: isLastAttempt ? '#f44336' : '#ff9800' }}>
                ⚠️
              </div>
              <h2 style={{ 
                margin: 0, 
                color: isLastAttempt ? '#d32f2f' : '#e65100',
                fontWeight: 'bold'
              }}>
                {violationInfo.title}
              </h2>
            </div>
          </div>

          {/* Attempt Counter */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>Security Violation Attempt:</span>
              <span style={{
                backgroundColor: isLastAttempt ? '#f44336' : '#ff9800',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {currentAttempt} / {maxAttempts}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressValue}%`,
                height: '100%',
                backgroundColor: isLastAttempt ? '#f44336' : '#ff9800',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            <div style={{
              marginTop: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: isLastAttempt ? '#f44336' : '#ff9800'
            }}>
              {isLastAttempt 
                ? '⚠️ LAST ATTEMPT! Next violation will auto-submit your quiz!'
                : `${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining`
              }
            </div>
          </div>

          {/* Violation Message */}
          <div style={{
            backgroundColor: isLastAttempt ? '#ffcdd2' : '#ffe0b2',
            border: `1px solid ${isLastAttempt ? '#f44336' : '#ff9800'}`,
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              {violationInfo.message}
            </div>
            <div>{violationInfo.instruction}</div>
          </div>

          {/* Auto-submit warning or countdown */}
          {autoSubmitting ? (
            <div style={{
              backgroundColor: '#ffcdd2',
              border: '1px solid #f44336',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
              color: '#d32f2f'
            }}>
              <div style={{ fontWeight: 'bold' }}>🚨 Maximum violations reached!</div>
              <div>Your quiz is being automatically submitted...</div>
            </div>
          ) : (
            <>
              {/* Countdown Timer */}
              {countdown > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fff',
                  padding: '24px',
                  borderRadius: '8px',
                  border: `2px solid ${isLastAttempt ? '#f44336' : '#ff9800'}`,
                  marginBottom: '16px'
                }}>
                  <span style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    color: isLastAttempt ? '#f44336' : '#ff9800'
                  }}>
                    {countdown}
                  </span>
                  <span style={{ fontSize: '24px', marginLeft: '16px' }}>seconds</span>
                </div>
              )}

              {/* Instructions */}
              <div style={{
                backgroundColor: isLastAttempt ? '#ffcdd2' : '#ffe0b2',
                padding: '16px',
                borderRadius: '4px',
                border: `1px solid ${isLastAttempt ? '#f44336' : '#ff9800'}`,
                textAlign: 'left',
                marginBottom: '16px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  📋 To avoid further violations:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Stay in fullscreen mode throughout the quiz</li>
                  <li>Do not switch tabs, windows, or applications</li>
                  <li>Do not minimize or resize the browser window</li>
                  <li>Keep focus on the quiz at all times</li>
                  <li>Do not use keyboard shortcuts or developer tools</li>
                  <li>Do not copy, paste, or use the context menu</li>
                </ul>
              </div>
            </>
          )}

          {/* Button */}
          <button
            onClick={onDismiss}
            disabled={countdown > 0 || autoSubmitting}
            style={{
              backgroundColor: countdown > 0 || autoSubmitting ? '#ccc' : (isLastAttempt ? '#f44336' : '#ff9800'),
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: countdown > 0 || autoSubmitting ? 'not-allowed' : 'pointer',
              minWidth: '200px'
            }}
          >
            {autoSubmitting 
              ? 'Submitting...' 
              : countdown > 0 
                ? `Wait ${countdown}s` 
                : 'I Understand - Continue Quiz'
            }
          </button>
        </div>
      </div>
    );
  }

  // Use regular Material-UI Dialog for non-fullscreen mode
  return (
    <Dialog 
      open={open} 
      onClose={() => {}} // Prevent closing by clicking outside
      maxWidth="sm" 
      fullWidth
      style={{ zIndex: 9999 }} // Force high z-index for debugging
      PaperProps={{
        sx: {
          backgroundColor: isLastAttempt ? '#ffebee' : '#fff3e0',
          border: `3px solid ${isLastAttempt ? '#f44336' : '#ff9800'}`,
          zIndex: 9999 // Force high z-index for debugging
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          color: isLastAttempt ? '#d32f2f' : '#e65100', 
          fontWeight: 'bold',
          textAlign: 'center',
          pb: 1
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {violationInfo.icon}
          {violationInfo.title}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Attempt Counter */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Security Violation Attempt:
            </Typography>
            <Chip 
              label={`${currentAttempt} / ${maxAttempts}`}
              color={isLastAttempt ? 'error' : 'warning'}
              size="small"
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressValue}
            color={isLastAttempt ? 'error' : 'warning'}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography 
            variant="caption" 
            color={isLastAttempt ? 'error' : 'warning.main'}
            sx={{ display: 'block', mt: 0.5, fontWeight: 'bold' }}
          >
            {isLastAttempt 
              ? '⚠️ LAST ATTEMPT! Next violation will auto-submit your quiz!'
              : `${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining`
            }
          </Typography>
        </Box>

        {/* Violation Message */}
        <Alert severity={violationInfo.severity} sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight="bold" gutterBottom>
            {violationInfo.message}
          </Typography>
          <Typography variant="body2">
            {violationInfo.instruction}
          </Typography>
        </Alert>

        {/* Auto-submit warning */}
        {autoSubmitting ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              🚨 Maximum violations reached!
            </Typography>
            <Typography variant="body2">
              Your quiz is being automatically submitted...
            </Typography>
          </Alert>
        ) : (
          <>
            {/* Countdown Timer */}
            {countdown > 0 && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#fff',
                p: 3,
                borderRadius: 2,
                border: `2px solid ${isLastAttempt ? '#f44336' : '#ff9800'}`,
                mb: 2
              }}>
                <Typography 
                  variant="h3" 
                  color={isLastAttempt ? 'error' : 'warning.main'}
                  sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                >
                  {countdown}
                </Typography>
                <Typography variant="h6" sx={{ ml: 2 }}>
                  seconds
                </Typography>
              </Box>
            )}

            {/* Instructions */}
            <Box sx={{ 
              backgroundColor: isLastAttempt ? '#ffcdd2' : '#ffe0b2',
              p: 2, 
              borderRadius: 1,
              border: `1px solid ${isLastAttempt ? '#f44336' : '#ff9800'}`
            }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                📋 To avoid further violations:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                <li>Stay in fullscreen mode throughout the quiz</li>
                <li>Do not switch tabs, windows, or applications</li>
                <li>Do not minimize or resize the browser window</li>
                <li>Keep focus on the quiz at all times</li>
                <li>Do not use keyboard shortcuts or developer tools</li>
                <li>Do not copy, paste, or use the context menu</li>
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button 
          onClick={onDismiss} 
          variant="contained" 
          color={isLastAttempt ? 'error' : 'warning'}
          size="large"
          disabled={countdown > 0 || autoSubmitting}
          sx={{ minWidth: 200 }}
        >
          {autoSubmitting 
            ? 'Submitting...' 
            : countdown > 0 
              ? `Wait ${countdown}s` 
              : 'I Understand - Continue Quiz'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SecurityViolationDialog;
