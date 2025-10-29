import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  Grid,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Chip
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { getQuizForStudent, submitQuizAttempt } from '../../api/quizApi';
import { useNavigate } from 'react-router-dom';

const QuizAttempt = ({ quizId }) => {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [attemptData, setAttemptData] = useState(null);
  
  const navigate = useNavigate();
  
  // Load quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await getQuizForStudent(quizId, token);
        
        if (response.alreadyAttempted) {
          setAlreadyAttempted(true);
          setAttemptData(response.attempt);
        } else {
          setQuiz(response.quiz);
          setTimeLeft(response.quiz.timeLimit * 60); // Convert minutes to seconds
          setStartTime(Date.now());
          
          // Initialize answers object
          const initialAnswers = {};
          response.quiz.questions.forEach(q => {
            initialAnswers[q._id] = null;
          });
          setAnswers(initialAnswers);
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        setError('Failed to load quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuiz();
  }, [quizId]);
  
  // Timer countdown
  useEffect(() => {
    if (!quiz || timeLeft <= 0 || result) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quiz, timeLeft, result]);
  
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(value)
    }));
  };
  
  const handleNext = () => {
    if (currentStep < quiz.questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSubmit = async () => {
    if (submitting) return;
    
    // Confirm if not all questions are answered
    const unansweredCount = Object.values(answers).filter(a => a === null).length;
    if (unansweredCount > 0 && timeLeft > 0) {
      const confirm = window.confirm(
        `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirm) return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      // Format answers for submission
      const formattedAnswers = Object.keys(answers).map(questionId => ({
        questionId,
        selectedOption: answers[questionId] === null ? 0 : answers[questionId] // Default to first option if unanswered
      }));
      
      // Calculate time spent in seconds
      const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
      
      const response = await submitQuizAttempt(quizId, formattedAnswers, timeSpent, token);
      setResult(response.result);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const calculateProgress = () => {
    if (!quiz) return 0;
    const answeredCount = Object.values(answers).filter(a => a !== null).length;
    return (answeredCount / quiz.questions.length) * 100;
  };
  
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
  
  if (alreadyAttempted) {
    return (
      <Paper sx={{ p: 3, my: 2 }}>
        <Typography variant="h5" gutterBottom>
          You have already completed this quiz
        </Typography>
        <Box sx={{ my: 2 }}>
          <Typography variant="body1" gutterBottom>
            Your score: {attemptData.percentage.toFixed(1)}% ({attemptData.score} / {attemptData.maxScore} points)
            {attemptData.securityData?.securityPenalty > 0 && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                Original score: {attemptData.securityData.originalPercentage.toFixed(1)}% 
                (Security penalty: -{attemptData.securityData.securityPenalty}%)
              </Typography>
            )}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Result: {attemptData.passed ? (
              <Chip 
                icon={<CheckCircleIcon />} 
                label="Passed" 
                color="success" 
                variant="outlined" 
              />
            ) : (
              <Chip 
                icon={<CancelIcon />} 
                label="Failed" 
                color="error" 
                variant="outlined" 
              />
            )}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Completed on: {new Date(attemptData.completedAt).toLocaleString()}
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Back to Course
        </Button>
      </Paper>
    );
  }
  
  if (result) {
    return (
      <Paper sx={{ p: 3, my: 2 }}>
        <Typography variant="h5" gutterBottom>
          Quiz Completed
        </Typography>
        
        <Box sx={{ my: 3, p: 2, bgcolor: result.passed ? '#e8f5e9' : '#ffebee', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            {result.passed ? (
              <>
                <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'success.main' }} />
                Congratulations! You passed the quiz.
              </>
            ) : (
              <>
                <CancelIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'error.main' }} />
                You did not pass the quiz. Please review the material and try again.
              </>
            )}
          </Typography>
          
          <Typography variant="body1" gutterBottom>
            Your score: {result.percentage.toFixed(1)}% ({result.score} / {result.maxScore} points)
            {result.securityPenalty > 0 && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                Original score: {result.originalPercentage?.toFixed(1) || ((result.originalScore || result.score) / result.maxScore * 100).toFixed(1)}% 
                (Security penalty: -{result.securityPenalty}%)
              </Typography>
            )}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Question Summary:
        </Typography>
        
        {result.answers.map((answer, index) => (
          <Box key={answer.questionId} sx={{ mb: 2 }}>
            <Typography variant="body1">
              Question {index + 1}: {answer.isCorrect ? (
                <Chip size="small" label="Correct" color="success" />
              ) : (
                <Chip size="small" label="Incorrect" color="error" />
              )}
            </Typography>
          </Box>
        ))}
        
        <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Back to Course
        </Button>
      </Paper>
    );
  }
  
  if (!quiz) return null;
  
  const currentQuestion = quiz.questions[currentStep];
  
  return (
    <Paper sx={{ p: 3, my: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          {quiz.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AccessTimeIcon sx={{ mr: 1, color: timeLeft < 60 ? 'error.main' : 'text.secondary' }} />
          <Typography 
            variant="h6" 
            sx={{ color: timeLeft < 60 ? 'error.main' : 'text.secondary' }}
          >
            {formatTime(timeLeft)}
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2">
          Progress: {Object.values(answers).filter(a => a !== null).length} / {quiz.questions.length} questions answered
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={calculateProgress()} 
          sx={{ mt: 1, height: 8, borderRadius: 1 }}
        />
      </Box>
      
      <Card variant="outlined" sx={{ mb: 3, bgcolor: '#f9f9f9' }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Question {currentStep + 1} of {quiz.questions.length}
            </Typography>
            <Typography variant="h6" gutterBottom>
              {currentQuestion.questionText}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
            </Typography>
          </Box>
          
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">Select one answer:</FormLabel>
            <RadioGroup
              value={answers[currentQuestion._id] !== null ? answers[currentQuestion._id].toString() : ''}
              onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
            >
              {currentQuestion.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={index.toString()}
                  control={<Radio />}
                  label={option}
                  sx={{ py: 0.5 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>
      
      <Grid container spacing={2} justifyContent="space-between">
        <Grid item>
          <Button
            variant="outlined"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
        </Grid>
        <Grid item>
          {currentStep < quiz.questions.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default QuizAttempt;
