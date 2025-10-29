import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Typography, 
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Paper
} from '@mui/material';
import {
  Security,
  Fullscreen,
  VisibilityOff,
  Warning,
  Timer,
  Block,
  CheckCircle
} from '@mui/icons-material';

const QuizSecurityBriefing = ({ open, onAccept, onCancel, quizInfo }) => {
  const securityRules = [
    {
      icon: <Fullscreen color="primary" />,
      title: "Fullscreen Mode Required",
      description: "The quiz must be taken in fullscreen mode. Exiting fullscreen will trigger warnings."
    },
    {
      icon: <VisibilityOff color="warning" />,
      title: "Tab Switching Restrictions",
      description: "You can switch tabs maximum 3 times for 15 seconds each. After that, the quiz will auto-submit."
    },
    {
      icon: <Block color="error" />,
      title: "Disabled Features",
      description: "Right-click, keyboard shortcuts (Ctrl+C, Ctrl+V, F12, etc.), and developer tools are disabled."
    },
    {
      icon: <Timer color="info" />,
      title: "Time Limit",
      description: `You have ${quizInfo?.timeLimit || 30} minutes to complete the quiz. Timer will auto-submit when time expires.`
    },
    {
      icon: <Warning color="warning" />,
      title: "Security Monitoring",
      description: "All activities are monitored and logged. Security violations may result in penalty or disqualification."
    },
    {
      icon: <CheckCircle color="success" />,
      title: "Fair Play",
      description: "This is your opportunity to demonstrate your knowledge. Answer honestly and to the best of your ability."
    }
  ];

  return (
    <Dialog 
      open={open} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Security />
        Quiz Security Briefing
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Important: Please read carefully before starting the quiz
          </Typography>
          <Typography>
            This is a secure quiz environment designed to ensure fair assessment. 
            Please review the security measures and rules below.
          </Typography>
        </Alert>

        <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Quiz Information
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Title:</strong> {quizInfo?.unitTitle || 'Unit Quiz'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Course:</strong> {quizInfo?.courseTitle || 'Course'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Questions:</strong> {quizInfo?.questions?.length || 0}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Time Limit:</strong> {quizInfo?.timeLimit || 30} minutes
          </Typography>
          <Typography variant="body1">
            <strong>Passing Score:</strong> 70%
          </Typography>
        </Paper>

        <Typography variant="h6" gutterBottom sx={{ color: 'error.main' }}>
          Security Rules & Monitoring
        </Typography>
        
        <List>
          {securityRules.map((rule, index) => (
            <ListItem key={index} sx={{ 
              mb: 1, 
              bgcolor: 'background.default', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <ListItemIcon>{rule.icon}</ListItemIcon>
              <ListItemText
                primary={rule.title}
                secondary={rule.description}
                primaryTypographyProps={{ fontWeight: 'medium' }}
              />
            </ListItem>
          ))}
        </List>

        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Warning:</strong> Once you start the quiz, you cannot pause or restart it. 
            Make sure you have a stable internet connection and are in a quiet environment.
          </Typography>
        </Alert>

        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Academic Integrity:</strong> Any attempt to cheat or circumvent security measures 
            will result in automatic quiz failure and may lead to disciplinary action.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button onClick={onCancel} variant="outlined" size="large">
          Cancel
        </Button>
        <Button 
          onClick={onAccept} 
          variant="contained" 
          size="large"
          sx={{ minWidth: 200 }}
        >
          I Understand - Start Quiz
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuizSecurityBriefing;
