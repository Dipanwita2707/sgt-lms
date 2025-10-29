import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import axios from 'axios';
import QuizSecurityBriefing from '../../components/student/QuizSecurityBriefing';
import SecureQuizPage from './SecureQuizPage';

const QuizLauncher = ({ user, token }) => {
  const { quizId, courseId } = useParams();
  const navigate = useNavigate();
  const [localToken] = useState(token || localStorage.getItem('token'));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizInfo, setQuizInfo] = useState(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [startQuiz, setStartQuiz] = useState(false);
  const [attemptId, setAttemptId] = useState(null);

  // Create a quiz attempt and load quiz information for the briefing
  useEffect(() => {
    const createQuizAttempt = async () => {
      try {
        if (!quizId || !localToken) {
          setError('Missing quiz ID or authentication token');
          return;
        }

        // Create a new quiz attempt
        const createResponse = await axios.post(`/api/student/quiz/${quizId}/attempt`, {}, {
          headers: { Authorization: `Bearer ${localToken}` }
        });

        if (createResponse.data && createResponse.data.attemptId) {
          setAttemptId(createResponse.data.attemptId);
          
          // Now get the quiz information for the attempt
          const quizResponse = await axios.get(`/api/student/quiz/attempt/${createResponse.data.attemptId}`, {
            headers: { Authorization: `Bearer ${localToken}` }
          });

          setQuizInfo(quizResponse.data);
        } else {
          setError('Failed to create quiz attempt');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error creating quiz attempt:', err);
        setError('Failed to start quiz. Please try again.');
        setLoading(false);
      }
    };

    createQuizAttempt();
  }, [quizId, localToken]);

  const handleAcceptBriefing = () => {
    setShowBriefing(false);
    setStartQuiz(true);
  };

  const handleCancelBriefing = () => {
    navigate(courseId ? `/student/course/${courseId}/units` : '/student/courses');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  // Show security briefing first
  if (showBriefing) {
    return (
      <QuizSecurityBriefing
        open={showBriefing}
        onAccept={handleAcceptBriefing}
        onCancel={handleCancelBriefing}
        quizInfo={quizInfo}
      />
    );
  }

  // Start the secure quiz
  if (startQuiz && attemptId) {
    // Navigate to secure quiz with the attempt ID
    console.log('Starting secure quiz with attempt ID:', attemptId);
    navigate(`/student/secure-quiz/${attemptId}`);
    
    // Return a loading indicator while navigation happens
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Starting secure quiz mode...</Typography>
      </Box>
    );
  }

  return null;
};

export default QuizLauncher;
