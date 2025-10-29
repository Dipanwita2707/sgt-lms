import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Flag as FlagIcon,
  Visibility as ViewIcon,
  Quiz as QuizIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  MenuBook as CourseIcon
} from '@mui/icons-material';
import axios from 'axios';

const TeacherCCManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [coordinatedCourses, setCoordinatedCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [units, setUnits] = useState([]);
  const [quizPools, setQuizPools] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [flagDialog, setFlagDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [flagNote, setFlagNote] = useState('');
  const [viewQuestionsDialog, setViewQuestionsDialog] = useState(false);
  const [selectedQuizPool, setSelectedQuizPool] = useState(null);
  const [quizPoolQuestions, setQuizPoolQuestions] = useState([]);
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCoordinatedCourses();
    fetchPendingReviews();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchUnitsForCourse(selectedCourse);
      fetchQuizPools();
    }
  }, [selectedCourse]);

  const fetchCoordinatedCourses = async () => {
    try {
      const response = await axios.get('/api/cc/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const courses = Array.isArray(response.data) ? response.data : (response.data.courses || []);
      setCoordinatedCourses(courses);
      if (courses.length > 0) setSelectedCourse(courses[0]._id);
    } catch (error) {
      setError('Failed to fetch coordinated courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitsForCourse = async (courseId) => {
    try {
      const response = await axios.get(`/api/unit/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnits(response.data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      setUnits([]);
    }
  };

  const fetchQuizPools = async () => {
    try {
      setLoading(true);
      if (!selectedCourse) { setQuizPools([]); return; }
      const response = await axios.get(`/api/quiz-pools/course/${selectedCourse}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pools = Array.isArray(response.data) ? response.data : (response.data.quizPools || []);
      setQuizPools(pools);
    } catch (error) {
      setError('Failed to fetch quiz pools');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      // Teachers who are coordinators can access review queue (backend validates coordination)
      const response = await axios.get('/api/cc/reviews/pending', { headers: { Authorization: `Bearer ${token}` } });
      const items = Array.isArray(response.data) ? response.data : (response.data.items || []);
      setPendingReviews(items);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      setPendingReviews([]); // Clear on error instead of maintaining old data
    }
  };

  const handleViewQuestions = async (quizPool) => {
    setSelectedQuizPool(quizPool);
    try {
      const response = await axios.get(`/api/quiz-pools/${quizPool._id}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const questions = response.data.questions || response.data || [];
      setQuizPoolQuestions(questions);
      setViewQuestionsDialog(true);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to fetch questions');
    }
  };

  const handleApproveQuestion = async (review) => {
    try {
      await axios.post('/api/teacher/question-reviews/approve', {
        quizId: review.quiz,
        questionId: review.questionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Question approved successfully');
      fetchPendingReviews();
    } catch (error) {
      setError('Failed to approve question');
    }
  };

  const handleRejectQuestion = async (review) => {
    try {
      await axios.post('/api/teacher/question-reviews/reject', {
        quizId: review.quiz,
        questionId: review.questionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Question rejected successfully');
      fetchPendingReviews();
    } catch (error) {
      setError('Failed to reject question');
    }
  };

  const handleFlagQuestion = (question) => {
    setSelectedQuestion(question);
    setFlagNote('');
    setFlagDialog(true);
  };

  const submitFlag = async () => {
    if (!selectedQuestion || !flagNote.trim()) return;
    
    try {
      // Handle different question source formats
      let requestBody;
      
      console.log('Selected question for flagging:', selectedQuestion);
      
      if (selectedQuestion.quizId && selectedQuestion._id) {
        // From pending reviews
        requestBody = {
          quizId: selectedQuestion.quizId,
          questionId: selectedQuestion._id,
          note: flagNote
        };
        console.log('Flagging pending review question:', requestBody);
      } else if (selectedQuestion.originalQuizId) {
        // From quiz pool - approved question
        requestBody = {
          quizId: selectedQuestion.originalQuizId,
          questionId: selectedQuestion._id,
          note: flagNote
        };
        console.log('Flagging approved quiz pool question:', requestBody);
      } else {
        console.error('Invalid question format:', selectedQuestion);
        throw new Error('Invalid question format for flagging');
      }
      
      await axios.post('/api/teacher/question-reviews/flag', requestBody, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Question flagged successfully for HOD review');
      setFlagDialog(false);
      setFlagNote('');
      fetchPendingReviews();
    } catch (error) {
      console.error('Flag error:', error);
      setError('Failed to flag question: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const filteredQuizPools = quizPools.filter(pool =>
    (
      pool.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pool.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ) && (
      !selectedUnit || (pool.unit?._id === selectedUnit)
    )
  );

  const QuizPoolManagementTab = () => (
    <Box>
      {/* CC Overview */}
      <Card sx={{ 
        mb: 3,
        border: '1px solid #6497b1',
        boxShadow: '0 4px 16px rgba(0, 91, 150, 0.15)',
        '&:hover': { boxShadow: '0 6px 20px rgba(0, 91, 150, 0.25)' }
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Course Coordinator Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card sx={{ 
                textAlign: 'center', 
                p: 2, 
                bgcolor: '#e3f2fd',
                border: '1px solid #6497b1',
                boxShadow: '0 2px 8px rgba(0, 91, 150, 0.1)',
                '&:hover': { boxShadow: '0 4px 12px rgba(0, 91, 150, 0.2)' }
              }}>
                <CourseIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
                <Typography variant="h4" color="primary">
                  {coordinatedCourses.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Coordinated Courses
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ 
                textAlign: 'center', 
                p: 2, 
                bgcolor: '#fff3e0',
                border: '1px solid #6497b1',
                boxShadow: '0 2px 8px rgba(0, 91, 150, 0.1)',
                '&:hover': { boxShadow: '0 4px 12px rgba(0, 91, 150, 0.2)' }
              }}>
                <QuizIcon sx={{ fontSize: 40, color: '#f57c00', mb: 1 }} />
                <Typography variant="h4" color="#f57c00">
                  {filteredQuizPools.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Quiz Pools
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ 
                textAlign: 'center', 
                p: 2, 
                bgcolor: '#fff8e1',
                border: '1px solid #6497b1',
                boxShadow: '0 2px 8px rgba(0, 91, 150, 0.1)',
                '&:hover': { boxShadow: '0 4px 12px rgba(0, 91, 150, 0.2)' }
              }}>
                <FlagIcon sx={{ fontSize: 40, color: '#ffa000', mb: 1 }} />
                <Typography variant="h4" color="#ffa000">
                  {pendingReviews.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Pending Reviews
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Course</InputLabel>
            <Select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              label="Course"
            >
              {coordinatedCourses.map(course => (
                <MenuItem key={course._id} value={course._id}>
                  {course.title} ({course.courseCode})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth disabled={!selectedCourse}>
            <InputLabel>Unit</InputLabel>
            <Select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              label="Unit"
            >
              <MenuItem value="">All Units</MenuItem>
              {units.map(unit => (
                <MenuItem key={unit._id} value={unit._id}>
                  {unit.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Search quiz pools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
        </Grid>
      </Grid>

      {/* Quiz Pools Table */}
      <Card sx={{
        border: '1px solid #6497b1',
        boxShadow: '0 4px 16px rgba(0, 91, 150, 0.15)',
        '&:hover': { boxShadow: '0 6px 20px rgba(0, 91, 150, 0.25)' }
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quiz Pools ({filteredQuizPools.length})
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : filteredQuizPools.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={3}>
              No quiz pools found for your coordinated courses.
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Questions</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredQuizPools.map((pool) => (
                    <TableRow key={pool._id}>
                      <TableCell>
                        <Typography variant="subtitle2">{pool.title}</Typography>
                        {pool.description && (
                          <Typography variant="caption" color="textSecondary">
                            {pool.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {coordinatedCourses.find(c => c._id === selectedCourse)?.title} ({coordinatedCourses.find(c => c._id === selectedCourse)?.courseCode})
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {pool.unit?.title || 'General'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${pool.quizzes?.length || 0} quizzes`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'action.active' }} />
                          <Typography variant="body2">
                            {pool.createdBy?.name || 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={pool.isActive ? 'Active' : 'Inactive'}
                          color={pool.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Review Questions">
                          <IconButton 
                            size="small"
                            onClick={() => handleViewQuestions(pool)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const PendingReviewsTab = () => (
    <Box>
      <Card sx={{
        border: '1px solid #6497b1',
        boxShadow: '0 4px 16px rgba(0, 91, 150, 0.15)',
        '&:hover': { boxShadow: '0 6px 20px rgba(0, 91, 150, 0.25)' }
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            My Pending Reviews ({pendingReviews.length})
          </Typography>
          
          {pendingReviews.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={3}>
              No questions pending your review.
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Upload Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingReviews.map((review) => (
                    <TableRow key={review._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                          {review.snapshot?.question || review.snapshot?.questionText || 'Question text unavailable'}
                        </Typography>
                        
                        {/* Display Options */}
                        {review.snapshot?.options && review.snapshot.options.length > 0 && (
                          <Box sx={{ mt: 1, pl: 1 }}>
                            {review.snapshot.options.map((option, idx) => (
                              <Typography 
                                key={idx} 
                                variant="caption" 
                                display="block"
                                sx={{
                                  color: idx === review.snapshot.correctOption ? 'success.main' : 'text.secondary',
                                  fontWeight: idx === review.snapshot.correctOption ? 'bold' : 'normal',
                                  backgroundColor: idx === review.snapshot.correctOption ? 'success.light' : 'transparent',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  mb: 0.5,
                                  border: idx === review.snapshot.correctOption ? '1px solid' : 'none',
                                  borderColor: idx === review.snapshot.correctOption ? 'success.main' : 'transparent'
                                }}
                              >
                                {String.fromCharCode(65 + idx)}. {option}
                                {idx === review.snapshot.correctOption && ' ✓ (Correct)'}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                          Points: {review.snapshot?.points || 1}
                          {review.snapshot?.type && ` | Type: ${review.snapshot.type}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {review.course?.title} ({review.course?.courseCode})
                      </TableCell>
                      <TableCell>
                        {review.unit?.title || 'General'}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, color: 'action.active' }} />
                          <Typography variant="body2">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={review.status}
                          color={review.status === 'pending' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          <Tooltip title="Approve Question">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleApproveQuestion(review)}
                              sx={{ bgcolor: 'success.light', color: 'success.dark' }}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Disapprove Question">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRejectQuestion(review)}
                              sx={{ bgcolor: 'error.light', color: 'error.dark' }}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Flag Question">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={() => handleFlagQuestion({
                                ...review.snapshot,
                                _id: review.questionId,
                                quizId: review.quiz
                              })}
                              sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}
                            >
                              <FlagIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const ViewQuestionsDialog = () => (
    <Dialog 
      open={viewQuestionsDialog} 
      onClose={() => setViewQuestionsDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Questions in {selectedQuizPool?.title}
      </DialogTitle>
      <DialogContent>
        {quizPoolQuestions.length === 0 ? (
          <Typography color="textSecondary" textAlign="center" py={3}>
            No questions in this quiz pool yet.
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Question</TableCell>
                  <TableCell>Options</TableCell>
                  <TableCell>Correct</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quizPoolQuestions.map((question, index) => (
                  <TableRow key={question._id || index}>
                    <TableCell>
                      <Typography variant="body2">
                        {question.text || question.questionText || 'Question text unavailable'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {question.options?.map((option, idx) => {
                        // Handle both old format (string array) and new format (object array)
                        const optionText = typeof option === 'string' ? option : option.text;
                        const isCorrect = typeof option === 'string' ? 
                          (idx === question.correctOption) : 
                          option.isCorrect;
                        
                        return (
                          <Typography 
                            key={idx} 
                            variant="caption" 
                            display="block"
                            color={isCorrect ? 'success.main' : 'textSecondary'}
                          >
                            {String.fromCharCode(65 + idx)}. {optionText}
                          </Typography>
                        );
                      })}
                    </TableCell>
                    <TableCell>
                      {question.options && question.correctOption !== undefined ? (
                        <Chip 
                          label={String.fromCharCode(65 + question.correctOption)}
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Typography variant="caption" color="textSecondary">N/A</Typography>
                      )}
                    </TableCell>
                    <TableCell>{question.points}</TableCell>
                    <TableCell>
                      <Tooltip title="Flag Question">
                        <IconButton 
                          size="small" 
                          color="warning"
                          onClick={() => handleFlagQuestion(question)}
                        >
                          <FlagIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setViewQuestionsDialog(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  const FlagQuestionDialog = React.useMemo(() => (
    <Dialog 
      open={flagDialog} 
      onClose={() => setFlagDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Flag Question for Review
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Question: {selectedQuestion?.text || selectedQuestion?.questionText || 'Question text unavailable'}
        </Typography>
        <TextField
          fullWidth
          label="Flag Note"
          multiline
          rows={4}
          value={flagNote}
          onChange={(e) => setFlagNote(e.target.value)}
          placeholder="Explain why this question needs review..."
          sx={{ mt: 2 }}
          autoFocus={false}
          onFocus={(e) => e.target.selectionStart = e.target.value.length}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setFlagDialog(false)}>Cancel</Button>
        <Button 
          variant="contained" 
          color="warning"
          onClick={submitFlag}
          disabled={!flagNote.trim()}
        >
          Flag for HOD Review
        </Button>
      </DialogActions>
    </Dialog>
  ), [flagDialog, selectedQuestion, flagNote]);

  if (coordinatedCourses.length === 0 && !loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Course Coordinator Management
        </Typography>
        <Alert severity="info">
          You are not assigned as a Course Coordinator for any courses yet.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Course Coordinator Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            label={
              <Badge badgeContent={filteredQuizPools.length} color="primary" max={999}>
                Quiz Pool Management
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={pendingReviews.length} color="warning" max={999}>
                Pending Reviews
              </Badge>
            } 
          />
        </Tabs>
      </Box>

      {activeTab === 0 && <QuizPoolManagementTab />}
      {activeTab === 1 && <PendingReviewsTab />}

      {/* Dialogs */}
      <ViewQuestionsDialog />
      {FlagQuestionDialog}
    </Box>
  );
};

export default TeacherCCManagement;