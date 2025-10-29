import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Divider,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { getVideoQuiz } from '../../api/quizApi';
import { Link } from 'react-router-dom';

const QuizSection = ({ videoId, videoWatched }) => {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await getVideoQuiz(videoId, token);
        setQuiz(response);
      } catch (error) {
        if (error.response?.status === 404) {
          // No quiz for this video, not an error
          setQuiz(null);
        } else {
          console.error('Error fetching quiz:', error);
          setError('Failed to load quiz information.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (videoId) {
      fetchQuiz();
    }
  }, [videoId]);
  
  const handleStartQuiz = () => {
    if (!videoWatched) {
      setOpenDialog(true);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
  
  if (!quiz) {
    return (
      <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QuizIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="subtitle1" color="text.secondary">
            No quiz available for this video
          </Typography>
        </Box>
      </Paper>
    );
  }
  
  return (
    <>
      <Paper sx={{ p: 2, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <QuizIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Quiz Available
          </Typography>
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          {quiz.title}
        </Typography>
        
        {quiz.description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {quiz.description}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Box>
            <Typography variant="body2">
              Time limit: {quiz.timeLimit} minutes
            </Typography>
            <Typography variant="body2">
              Passing score: {quiz.passingScore}%
            </Typography>
            <Typography variant="body2">
              Points: {quiz.totalPoints}
            </Typography>
          </Box>
          
          {quiz.attempted ? (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <AssignmentTurnedInIcon fontSize="small" sx={{ mr: 0.5 }} />
                Quiz completed
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                Score: {quiz.percentage.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color={quiz.passed ? 'success.main' : 'error.main'}>
                {quiz.passed ? 'Passed' : 'Failed'}
              </Typography>
            </Box>
          ) : (
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to={`/student/course/${quiz.course}/quiz/${quiz._id}`}
              onClick={handleStartQuiz}
              disabled={!videoWatched}
            >
              Start Secure Quiz
            </Button>
          )}
        </Box>
        
        {!videoWatched && !quiz.attempted && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You need to watch the video before taking the quiz.
          </Alert>
        )}
      </Paper>
      
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>Watch the video first</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You need to watch the video before taking the quiz. This ensures you have the knowledge needed to succeed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuizSection;
