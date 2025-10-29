import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
  Button,
  Chip
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { getQuizAnalytics } from '../../api/quizApi';
import { useParams, useNavigate } from 'react-router-dom';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const QuizAnalytics = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await getQuizAnalytics(quizId, token);
        setData(response);
      } catch (error) {
        console.error('Error fetching quiz analytics:', error);
        setError(error.response?.data?.message || 'Failed to load quiz analytics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [quizId]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
        <Button sx={{ ml: 2 }} variant="outlined" size="small" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Alert>
    );
  }
  
  if (!data) return null;
  
  const { quiz, analytics, attempts } = data;
  
  // Prepare data for pass/fail pie chart
  const passFailData = {
    labels: ['Passed', 'Failed'],
    datasets: [
      {
        data: [analytics.passedAttempts, analytics.failedAttempts],
        backgroundColor: ['#4caf50', '#f44336'],
        borderColor: ['#388e3c', '#d32f2f'],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare data for question accuracy bar chart
  const questionLabels = analytics.questionAnalytics.map((q, i) => `Q${i+1}`);
  const accuracyData = {
    labels: questionLabels,
    datasets: [
      {
        label: 'Accuracy (%)',
        data: analytics.questionAnalytics.map(q => q.accuracy),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Quiz Analytics</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back
        </Button>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {quiz.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {quiz.description}
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Course: {quiz.course.title}</Typography>
            <Typography variant="subtitle1">Video: {quiz.video.title}</Typography>
            <Typography variant="subtitle1">Created by: {quiz.createdBy.name}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Questions: {quiz.questionCount}</Typography>
            <Typography variant="subtitle1">Total Points: {quiz.totalPoints}</Typography>
            <Typography variant="subtitle1">Passing Score: {quiz.passingScore}%</Typography>
            <Typography variant="subtitle1">Created: {new Date(quiz.createdAt).toLocaleDateString()}</Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Performance
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  Total Attempts: {analytics.totalAttempts}
                </Typography>
                <Typography variant="body1">
                  Pass Rate: {analytics.passRate.toFixed(1)}%
                </Typography>
                <Typography variant="body1">
                  Average Score: {analytics.averageScore.toFixed(1)}%
                </Typography>
              </Box>
              
              {analytics.totalAttempts > 0 && (
                <Box sx={{ height: 200, mt: 2 }}>
                  <Pie data={passFailData} options={{ maintainAspectRatio: false }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Question Performance
              </Typography>
              
              {analytics.totalAttempts > 0 ? (
                <Box sx={{ height: 250 }}>
                  <Bar 
                    data={accuracyData} 
                    options={{
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          title: {
                            display: true,
                            text: 'Percentage Correct'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Questions'
                          }
                        }
                      }
                    }} 
                  />
                </Box>
              ) : (
                <Alert severity="info">
                  No attempts have been made on this quiz yet.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Paper sx={{ mt: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Question Details
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Question</TableCell>
                <TableCell align="right">Correct</TableCell>
                <TableCell align="right">Incorrect</TableCell>
                <TableCell align="right">Accuracy</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analytics.questionAnalytics.map((question, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {question.questionText}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{question.correctCount}</TableCell>
                  <TableCell align="right">{question.incorrectCount}</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={`${question.accuracy.toFixed(1)}%`}
                      color={question.accuracy >= 70 ? 'success' : question.accuracy >= 40 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      <Paper sx={{ mt: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Student Attempts
        </Typography>
        
        {attempts.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Reg. No.</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell align="right">Percentage</TableCell>
                  <TableCell align="center">Result</TableCell>
                  <TableCell align="right">Completion Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attempts.map((attempt) => (
                  <TableRow key={attempt._id} hover>
                    <TableCell>{attempt.student.name}</TableCell>
                    <TableCell>{attempt.student.regNo}</TableCell>
                    <TableCell align="right">{attempt.score} / {attempt.maxScore}</TableCell>
                    <TableCell align="right">{attempt.percentage.toFixed(1)}%</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={attempt.passed ? 'Passed' : 'Failed'}
                        color={attempt.passed ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {new Date(attempt.completedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            No students have attempted this quiz yet.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default QuizAnalytics;
