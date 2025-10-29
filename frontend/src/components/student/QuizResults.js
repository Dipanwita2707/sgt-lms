import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Paper,
  Divider,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import { getStudentQuizResults } from '../../api/studentVideoApi';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import QuizIcon from '@mui/icons-material/Quiz';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';

const QuizResults = () => {
  console.log('QuizResults: Component rendering...');
  const [quizResults, setQuizResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizResults = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('QuizResults: No authentication token found');
          setError('No authentication token found');
          setLoading(false);
          return;
        }
        
        console.log('QuizResults: Fetching quiz results...');
        const results = await getStudentQuizResults(null, token); // Get all quiz results
        console.log('QuizResults: Successfully fetched quiz results:', results);
        setQuizResults(results);
      } catch (err) {
        console.error('QuizResults: Error fetching quiz results:', err);
        console.error('QuizResults: Error details:', err.response?.data || err.message);
        
        // Don't throw the error - just set error state
        if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (err.response?.status === 404) {
          setError('Quiz results not found.');
        } else if (err.code === 'NETWORK_ERROR' || !err.response) {
          setError('Cannot connect to server. Please ensure the server is running.');
        } else {
          setError('Failed to load quiz results. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    console.log('QuizResults: Component mounted, starting data fetch...');
    fetchQuizResults();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ p: 3 }}>
          <Typography color="error" variant="h6">{error}</Typography>
        </Box>
      </Container>
    );
  }

  if (!quizResults || quizResults.summary.totalAttempts === 0) {
    return (
      <Container>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Quiz Results
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You haven't taken any quizzes yet. Start learning and taking quizzes to see your results here.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Quiz Results
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Track your quiz performance and marks across all courses.
        </Typography>

        {/* Summary Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <QuizIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Quizzes</Typography>
                </Box>
                <Typography variant="h4">{quizResults.summary.totalAttempts}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Passed</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {quizResults.summary.passedAttempts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {quizResults.summary.passRate.toFixed(1)}% pass rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CancelIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Failed</Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  {quizResults.summary.failedAttempts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Average Score</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {quizResults.summary.averageScore}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quiz Results Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Quiz Attempts
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Quiz/Course</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Percentage</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time Spent</TableCell>
                    <TableCell>Date Completed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quizResults.attempts.map((attempt) => (
                    <TableRow key={attempt._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {attempt.quiz?.title || attempt.quizPool?.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {attempt.course.title} {attempt.course.courseCode && `(${attempt.course.courseCode})`}
                          </Typography>
                          {attempt.unit && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Unit: {attempt.unit.title}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={attempt.type === 'individual' ? 'Individual' : 'Pool'}
                          size="small"
                          variant="outlined"
                          color={attempt.type === 'individual' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {attempt.score}/{attempt.maxScore}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={attempt.percentage}
                            sx={{ width: 60, height: 8 }}
                            color={attempt.passed ? 'success' : 'error'}
                          />
                          <Box>
                            <Typography variant="body2">
                              {attempt.percentage}%
                            </Typography>
                            {attempt.securityData?.securityPenalty > 0 && (
                              <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.65rem' }}>
                                (Penalty: -{attempt.securityData.securityPenalty}%)
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={attempt.passed ? <CheckCircleIcon /> : <CancelIcon />}
                          label={attempt.passed ? 'Passed' : 'Failed'}
                          color={attempt.passed ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimelapseIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatTime(attempt.timeSpent)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(attempt.completedAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default QuizResults;