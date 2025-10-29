import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Container, Chip, List, ListItem, ListItemText, Divider, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import QuizIcon from '@mui/icons-material/Quiz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import ScheduleIcon from '@mui/icons-material/Schedule';
// Live class icons removed - moved to independent video call module
import { getStudentQuizResults, getAllDeadlineWarnings } from '../../api/studentVideoApi';

const StudentDashboard = ({ user }) => {
  const [quizResults, setQuizResults] = useState(null);
  const [deadlineWarnings, setDeadlineWarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deadlineLoading, setDeadlineLoading] = useState(true);
  
  useEffect(() => {
    const fetchQuizResults = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const results = await getStudentQuizResults(null, token); // Get all quiz results
          setQuizResults(results);
        }
      } catch (error) {
        console.error('Error fetching quiz results:', error);
        setQuizResults({ summary: { totalAttempts: 0, passedAttempts: 0, failedAttempts: 0, passRate: 0, averageScore: 0 }, attempts: [] });
      } finally {
        setLoading(false);
      }
    };

    const fetchDeadlineWarnings = async () => {
      try {
        console.log('🔍 StudentDashboard: Fetching deadline warnings...');
        const token = localStorage.getItem('token');
        console.log('📝 Token exists:', !!token);
        if (token) {
          console.log('📞 Making API call to getAllDeadlineWarnings...');
          const warnings = await getAllDeadlineWarnings(token);
          console.log('📋 Received deadline warnings:', warnings);
          setDeadlineWarnings(warnings);
        } else {
          console.log('❌ No token found in localStorage');
        }
      } catch (error) {
        console.error('❌ Error fetching deadline warnings:', error);
        setDeadlineWarnings({ deadlineWarnings: [], summary: { total: 0, expired: 0, upcoming: 0 } });
      } finally {
        console.log('✅ Setting deadlineLoading to false');
        setDeadlineLoading(false);
      }
    };
    
    fetchQuizResults();
    fetchDeadlineWarnings();
  }, []);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name || 'Student'}!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Track your progress and continue learning where you left off.
        </Typography>

        {/* Deadline Warnings Section */}
        {console.log('🎨 Rendering deadline section. deadlineLoading:', deadlineLoading, 'deadlineWarnings:', deadlineWarnings)}
        {deadlineLoading ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Loading deadline information...
          </Alert>
        ) : deadlineWarnings && deadlineWarnings.summary.total > 0 && (
          <Alert 
            severity={deadlineWarnings.summary.expired > 0 ? "error" : "warning"} 
            sx={{ mb: 3 }}
            icon={<WarningIcon />}
          >
            <Typography variant="h6" gutterBottom>
              {deadlineWarnings.summary.expired > 0 ? "⚠️ Urgent Deadline Alerts!" : "📅 Upcoming Deadlines"}
            </Typography>
            <Typography variant="body2" paragraph>
              You have {deadlineWarnings.summary.total} deadline{deadlineWarnings.summary.total !== 1 ? 's' : ''} requiring attention
              {deadlineWarnings.summary.expired > 0 && (
                <span style={{ fontWeight: 'bold', color: '#d32f2f' }}>
                  {' '}({deadlineWarnings.summary.expired} expired!)
                </span>
              )}
            </Typography>
            <List dense>
              {deadlineWarnings.deadlineWarnings.slice(0, 3).map((warning) => (
                <ListItem key={`${warning.course._id}-${warning.unit._id}`}>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">
                          {warning.course.title} - {warning.unit.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={warning.warning.isExpired ? 'EXPIRED' : `${warning.warning.daysRemaining} days left`}
                          color={warning.warning.isExpired ? 'error' : warning.warning.daysRemaining <= 1 ? 'warning' : 'info'}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Deadline: {new Date(warning.unit.deadline).toLocaleDateString()} at{' '}
                        {new Date(warning.unit.deadline).toLocaleTimeString()}
                        {warning.unit.deadlineDescription && ` - ${warning.unit.deadlineDescription}`}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
            {deadlineWarnings.deadlineWarnings.length > 3 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ... and {deadlineWarnings.deadlineWarnings.length - 3} more deadline{deadlineWarnings.deadlineWarnings.length - 3 !== 1 ? 's' : ''}
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color={deadlineWarnings.summary.expired > 0 ? "error" : "warning"}
                component={Link}
                to="/student/courses"
                startIcon={<ScheduleIcon />}
                size="small"
              >
                View All Courses & Deadlines
              </Button>
            </Box>
          </Alert>
        )}

        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Quiz Results Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <QuizIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Quiz Results
                  </Typography>
                </Box>
                
                {loading ? (
                  <Typography variant="body1" color="text.secondary">
                    Loading quiz results...
                  </Typography>
                ) : quizResults && quizResults.summary.totalAttempts > 0 ? (
                  <>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Overall Performance:</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Quizzes: {quizResults.summary.totalAttempts}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Passed: {quizResults.summary.passedAttempts} | Failed: {quizResults.summary.failedAttempts}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pass Rate: {quizResults.summary.passRate.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Score: {quizResults.summary.averageScore}%
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" gutterBottom>
                      <strong>Recent Quiz Results:</strong>
                    </Typography>
                    <List dense>
                      {quizResults.attempts.slice(0, 3).map((attempt, index) => (
                        <ListItem key={attempt._id} sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" noWrap>
                                  {attempt.quiz?.title || attempt.quizPool?.title}
                                </Typography>
                                <Chip
                                  icon={attempt.passed ? <CheckCircleIcon /> : <CancelIcon />}
                                  label={`${attempt.percentage}%`}
                                  color={attempt.passed ? 'success' : 'error'}
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {attempt.course.title} • {formatDate(attempt.completedAt)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                ) : (
                  <Typography variant="body1" color="text.secondary" paragraph>
                    No quiz results yet. Start taking quizzes to see your performance here.
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    component={Link}
                    to="/student/quiz-results"
                    startIcon={<QuizIcon />}
                  >
                    View All Results
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Watch History Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <HistoryIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Watch History
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  View your complete watch history across all courses, including time spent on each video.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to="/student/watch-history"
                    startIcon={<AccessTimeIcon />}
                  >
                    View Watch History
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Course Progress Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssessmentIcon color="secondary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Course Progress
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Check your progress in each course, including completion percentages and remaining videos.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    component={Link}
                    to="/student/courses"
                    startIcon={<VideoLibraryIcon />}
                  >
                    View Courses
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Live Classes Card removed - moved to independent video call module */}

          {/* Resume Learning Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PlayCircleOutlineIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Continue Learning
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Pick up right where you left off with your most recently watched videos.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    component={Link}
                    to="/student/recent-videos"
                    startIcon={<PlayCircleOutlineIcon />}
                  >
                    Resume Learning
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default StudentDashboard;
