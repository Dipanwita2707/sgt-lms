import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import {
  Security,
  Quiz as QuizIcon,
  PlayArrow,
  CheckCircle,
  Warning,
  Info,
  Settings,
  Fullscreen,
  Timer,
  Block
} from '@mui/icons-material';

const SecureQuizDemo = () => {
  const [demoStep, setDemoStep] = useState(0);

  const features = [
    {
      icon: <Fullscreen color="primary" />,
      title: "Automatic Fullscreen Mode",
      description: "Quiz automatically enters fullscreen when started. Exiting triggers warnings and penalties.",
      status: "✅ Implemented"
    },
    {
      icon: <Security color="success" />,
      title: "Tab Switch Detection",
      description: "Maximum 3 tab switches allowed for 15 seconds each. Auto-submit after violations.",
      status: "✅ Implemented"
    },
    {
      icon: <Block color="error" />,
      title: "Disabled Shortcuts & Context Menu",
      description: "F12, Ctrl+C, Ctrl+V, right-click, and other shortcuts are disabled during quiz.",
      status: "✅ Implemented"
    },
    {
      icon: <Timer color="warning" />,
      title: "Timer with Auto-Submit",
      description: "Countdown timer with automatic submission when time expires.",
      status: "✅ Implemented"
    },
    {
      icon: <QuizIcon color="info" />,
      title: "Question Navigation Sidebar",
      description: "Sidebar showing all questions with status: answered, unanswered, marked for review.",
      status: "✅ Implemented"
    },
    {
      icon: <Warning color="warning" />,
      title: "Security Violation Tracking",
      description: "All violations are logged and can result in score penalties or disqualification.",
      status: "✅ Implemented"
    }
  ];

  const securityMeasures = [
    "Real-time tab switching monitoring",
    "Fullscreen enforcement",
    "Keyboard shortcut blocking",
    "Context menu disabling",
    "Developer tools prevention",
    "Copy-paste prevention",
    "Activity logging and audit trail",
    "Automatic penalty system",
    "Progressive warnings system"
  ];

  const quizFlow = [
    {
      step: 1,
      title: "Security Briefing",
      description: "Student sees detailed security rules and quiz information before starting.",
      color: "info"
    },
    {
      step: 2,
      title: "Fullscreen Activation",
      description: "Quiz automatically enters fullscreen mode with security monitoring active.",
      color: "primary"
    },
    {
      step: 3,
      title: "Question Navigation",
      description: "Student can navigate between questions using the sidebar or next/previous buttons.",
      color: "secondary"
    },
    {
      step: 4,
      title: "Security Monitoring",
      description: "All activities monitored: tab switches, fullscreen exits, keyboard shortcuts.",
      color: "warning"
    },
    {
      step: 5,
      title: "Auto-Submit & Results",
      description: "Quiz auto-submits on time expiry or security violations. Results include penalties.",
      color: "success"
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Security sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            Secure Quiz System
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Comprehensive anti-cheating quiz system with fullscreen mode, 
            tab switching prevention, and security monitoring
          </Typography>
          
          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>System Status:</strong> Fully implemented and ready for use!
          </Alert>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Feature Overview */}
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Key Features
        </Typography>
        
        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {feature.icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {feature.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {feature.description}
                  </Typography>
                  <Chip 
                    label={feature.status} 
                    color="success" 
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Quiz Flow */}
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Quiz Flow Process
        </Typography>
        
        <Grid container spacing={2}>
          {quizFlow.map((flow, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Chip 
                      label={flow.step} 
                      color={flow.color}
                      sx={{ mr: 1, fontWeight: 'bold' }}
                    />
                    <Typography variant="h6">
                      {flow.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {flow.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Security Measures */}
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Security Measures
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                Anti-Cheating Features
              </Typography>
              <List dense>
                {securityMeasures.map((measure, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon>
                      <CheckCircle sx={{ color: 'error.contrastText' }} />
                    </ListItemIcon>
                    <ListItemText primary={measure} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                Violation Consequences
              </Typography>
              <List dense>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon>
                    <Info sx={{ color: 'warning.contrastText' }} />
                  </ListItemIcon>
                  <ListItemText primary="1st violation: Warning message" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon>
                    <Warning sx={{ color: 'warning.contrastText' }} />
                  </ListItemIcon>
                  <ListItemText primary="2nd violation: Score penalty" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon>
                    <Block sx={{ color: 'warning.contrastText' }} />
                  </ListItemIcon>
                  <ListItemText primary="3rd violation: Auto-submit quiz" />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon>
                    <Security sx={{ color: 'warning.contrastText' }} />
                  </ListItemIcon>
                  <ListItemText primary="All violations logged for audit" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Demo Section */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Ready to Test
          </Typography>
          <Typography variant="body1" paragraph>
            The secure quiz system is fully implemented and ready for use. 
            Students will see the security briefing before starting any quiz.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Next Steps:</strong> Create a quiz in the teacher dashboard and assign it to students. 
            When students access the quiz, they'll be guided through the secure quiz process.
          </Alert>
          
          <Button 
            variant="contained" 
            size="large" 
            startIcon={<PlayArrow />}
            sx={{ mr: 2 }}
            onClick={() => window.open('/student/course/1/quiz/1', '_blank')}
          >
            Preview Quiz Flow
          </Button>
          
          <Button 
            variant="outlined" 
            size="large" 
            startIcon={<Settings />}
            onClick={() => alert('Navigate to Teacher Dashboard to create quizzes')}
          >
            Create Quiz
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SecureQuizDemo;
