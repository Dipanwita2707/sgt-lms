import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, LinearProgress, Divider, List, ListItem, ListItemText, CircularProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { getCourseProgress, getStudentQuizResults } from '../../api/studentVideoApi';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QuizIcon from '@mui/icons-material/Quiz';
import CancelIcon from '@mui/icons-material/Cancel';

const CourseProgress = ({ courseId, token }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [quizResults, setQuizResults] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch both progress and quiz results
        const [progressData, quizData] = await Promise.all([
          getCourseProgress(courseId, token),
          getStudentQuizResults(courseId, token)
        ]);
        
        setProgress(progressData);
        setQuizResults(quizData);
        setError(null);
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError('Failed to load course data');
      } finally {
        setLoading(false);
      }
    };
    
    if (courseId && token) {
      fetchData();
    }
  }, [courseId, token]);
  
  // Format time in human-readable format
  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (remainingSeconds > 0 || result === '') result += `${remainingSeconds}s`;
    
    return result.trim();
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  if (!progress) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No progress data available</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Course Progress: {progress.courseTitle} {progress.courseCode && `(${progress.courseCode})`}
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PlayCircleFilledIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Overall Progress</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress.overallPercentage}
                sx={{ height: 10, borderRadius: 5, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {progress.overallPercentage}% Complete
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Videos Completed</Typography>
              </Box>
              <Typography variant="h4">{progress.videosCompleted}/{progress.totalVideos}</Typography>
              <Typography variant="body2" color="text.secondary">
                {progress.videosStarted - progress.videosCompleted} videos in progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTimeIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Watch Time</Typography>
              </Box>
              <Typography variant="h4">
                {formatTime(progress.videoProgress.reduce((total, video) => total + video.timeSpent, 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Quiz Results Section */}
      {quizResults && quizResults.attempts.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <QuizIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Quiz Results</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {/* Quiz Summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Total Quizzes</Typography>
                <Typography variant="h6">{quizResults.summary.totalAttempts}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Passed</Typography>
                <Typography variant="h6" color="success.main">{quizResults.summary.passedAttempts}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Pass Rate</Typography>
                <Typography variant="h6">{quizResults.summary.passRate.toFixed(1)}%</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Average Score</Typography>
                <Typography variant="h6">{quizResults.summary.averageScore}%</Typography>
              </Grid>
            </Grid>
            
            {/* Quiz Results Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Quiz</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quizResults.attempts.map((attempt) => (
                    <TableRow key={attempt._id}>
                      <TableCell>
                        <Typography variant="body2">
                          {attempt.quiz?.title || attempt.quizPool?.title}
                        </Typography>
                        {attempt.unit && (
                          <Typography variant="caption" color="text.secondary">
                            Unit: {attempt.unit.title}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {attempt.score}/{attempt.maxScore} ({attempt.percentage}%)
                        </Typography>
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
      )}
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Video Progress</Typography>
          <Divider sx={{ mb: 2 }} />
          
          <List>
            {progress.videoProgress.map((video) => (
              <ListItem key={video.videoId} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <ListItemText
                  primary={video.title}
                  secondary={`Last watched: ${formatDate(video.lastWatched)}`}
                />
                <Box sx={{ width: '100%', mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">
                      {formatTime(video.timeSpent)} watched
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {video.percentageCompleted}% complete
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={video.percentageCompleted}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={video.percentageCompleted >= 90 ? "success" : "primary"}
                  />
                </Box>
                <Divider sx={{ width: '100%', mt: 2 }} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CourseProgress;
