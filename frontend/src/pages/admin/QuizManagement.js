import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Divider,
  Button,
  TextField,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
  Alert,

} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  School as SchoolIcon,
  QuestionAnswer as QuestionIcon,
  LibraryBooks as LibraryBooksIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import axios from 'axios';

const QuizManagement = () => {
  const token = localStorage.getItem('token');
  
  // State
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [units, setUnits] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizPools, setQuizPools] = useState([]);
  const [quizPoolQuestions, setQuizPoolQuestions] = useState({});
  const [expandedQuizPool, setExpandedQuizPool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedQuestion, setCopiedQuestion] = useState(null);

  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to fetch courses. Please try again.');
      setLoading(false);
    }
  };

  // Fetch units for selected course
  const fetchUnits = async (courseId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/units/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnits(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching units:', err);
      setError('Failed to fetch units. Please try again.');
      setLoading(false);
    }
  };

  // Fetch quizzes and quiz pools for selected course
  const fetchQuizzes = async (courseId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/quizzes/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // The API might return both quizzes and quizPools
      if (response.data.quizzes) {
        setQuizzes(response.data.quizzes);
        setQuizPools(response.data.quizPools || []);
      } else {
        // If the API returns just an array of quizzes
        setQuizzes(response.data);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to fetch quizzes. Please try again.');
      setLoading(false);
    }
  };

  // Handle course change
  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);
    
    if (courseId) {
      fetchUnits(courseId);
      fetchQuizzes(courseId);
    } else {
      setUnits([]);
      setQuizzes([]);
      setQuizPools([]);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle accordion expansion
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Fetch quiz pool questions
  const fetchQuizPoolQuestions = async (poolId) => {
    if (quizPoolQuestions[poolId]) {
      return; // Already fetched
    }
    
    try {
      console.log(`Fetching questions for quiz pool: ${poolId}`);
      setLoading(true);
      const response = await axios.get(`/api/quiz-pools/${poolId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`Received ${response.data.length} questions for quiz pool ${poolId}`);
      
      setQuizPoolQuestions(prev => ({
        ...prev,
        [poolId]: response.data
      }));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching quiz pool questions:', err);
      // Initialize with empty array on error
      setQuizPoolQuestions(prev => ({
        ...prev,
        [poolId]: []
      }));
      setLoading(false);
    }
  };

  // Handle quiz pool expansion
  const handleExpandPool = (poolId) => {
    if (expandedQuizPool === poolId) {
      setExpandedQuizPool(null);
    } else {
      setExpandedQuizPool(poolId);
      fetchQuizPoolQuestions(poolId);
    }
  };

  // Copy question to clipboard (simulated)
  const handleCopyQuestion = (question) => {
    setCopiedQuestion(question._id);
    setTimeout(() => setCopiedQuestion(null), 2000);
  };

  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter quiz pools based on search term
  const filteredQuizPools = quizPools.filter(pool => 
    pool.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group quizzes by unit
  const groupQuizzesByUnit = () => {
    const groupedQuizzes = {};
    
    units.forEach(unit => {
      groupedQuizzes[unit._id] = {
        unitInfo: unit,
        quizzes: quizzes.filter(quiz => quiz.unit && quiz.unit._id === unit._id),
        quizPools: quizPools.filter(pool => pool.unit && pool.unit._id === unit._id)
      };
    });
    
    // Add quizzes without unit
    groupedQuizzes['no-unit'] = {
      unitInfo: { title: 'No Unit Assigned' },
      quizzes: quizzes.filter(quiz => !quiz.unit),
      quizPools: quizPools.filter(pool => !pool.unit)
    };
    
    return groupedQuizzes;
  };

  const groupedQuizzes = groupQuizzesByUnit();

  // Render quiz details
  const renderQuizDetails = (quiz) => {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Quiz Details:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>Created by:</strong> {quiz.createdBy?.name || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>Time Limit:</strong> {quiz.timeLimit || 30} minutes
            </Typography>
            <Typography variant="body2">
              <strong>Passing Score:</strong> {quiz.passingScore || 70}%
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>Total Questions:</strong> {quiz.questions?.length || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Course:</strong> {quiz.course?.title || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>Unit:</strong> {quiz.unit?.title || 'None'}
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle2" gutterBottom>
          Questions:
        </Typography>
        {quiz.questions && quiz.questions.length > 0 ? (
          <List>
            {quiz.questions.map((question, index) => (
              <ListItem 
                key={question._id || index} 
                sx={{ 
                  bgcolor: 'background.paper', 
                  mb: 1, 
                  borderRadius: 1,
                  border: '1px solid rgba(0,0,0,0.12)'
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" component="div">
                      Question {index + 1}: {question.questionText}
                    </Typography>
                    <Tooltip title="Copy question">
                      <IconButton 
                        size="small" 
                        onClick={() => handleCopyQuestion(question)}
                        color={copiedQuestion === question._id ? "success" : "default"}
                      >
                        {copiedQuestion === question._id ? 
                          <CheckIcon fontSize="small" /> : 
                          <ContentCopyIcon fontSize="small" />
                        }
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Box sx={{ mt: 1 }}>
                    {question.options && question.options.map((option, optIndex) => (
                      <Typography 
                        key={optIndex} 
                        variant="body2" 
                        sx={{ 
                          color: optIndex === question.correctOption ? 'success.main' : 'text.primary',
                          fontWeight: optIndex === question.correctOption ? 'bold' : 'normal',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {optIndex === question.correctOption && (
                          <CheckIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                        )}
                        Option {optIndex + 1}: {option}
                      </Typography>
                    ))}
                  </Box>
                  
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Points:</strong> {question.points || 1}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No questions available
          </Typography>
        )}
      </Box>
    );
  };

  // Render quiz pool details
  const renderQuizPoolDetails = (pool) => {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Quiz Pool Details:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>Created by:</strong> {pool.createdBy?.name || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>Questions Per Attempt:</strong> {pool.questionsPerAttempt || 10}
            </Typography>
            <Typography variant="body2">
              <strong>Passing Score:</strong> {pool.passingScore || 70}%
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>Total Quizzes in Pool:</strong> {pool.quizzes?.length || 0}
            </Typography>
            <Typography variant="body2">
              <strong>Course:</strong> {pool.course?.title || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>Unit:</strong> {pool.unit?.title || 'None'}
            </Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={expandedQuizPool === pool._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => handleExpandPool(pool._id)}
            fullWidth
            sx={{ mb: 2 }}
          >
            {expandedQuizPool === pool._id ? 'Hide Questions' : 'View All Questions with Answers'}
          </Button>
          
          {expandedQuizPool === pool._id && (
            quizPoolQuestions[pool._id] ? (
              quizPoolQuestions[pool._id].length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Total Questions: {quizPoolQuestions[pool._id].length}
                  </Typography>
                  <List>
                    {quizPoolQuestions[pool._id].map((question, index) => (
                      <Paper key={question._id || index} sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Question {index + 1}: {question.text}
                        </Typography>
                        
                        <Box sx={{ mt: 1, ml: 2 }}>
                          {question.options.map((option, optIndex) => (
                            <Box 
                              key={optIndex} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                mb: 0.5,
                                fontWeight: option.isCorrect ? 'bold' : 'normal',
                                color: option.isCorrect ? 'success.main' : 'text.primary'
                              }}
                            >
                              {option.isCorrect && <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 18 }} />}
                              <Typography variant="body2">
                                {String.fromCharCode(65 + optIndex)}. {option.text}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                        
                        {question.explanation && (
                          <Box sx={{ mt: 1, bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                            <Typography variant="body2">
                              <strong>Explanation:</strong> {question.explanation}
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            From quiz: {question.originalQuizTitle} • Created by: {question.createdBy}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Points: {question.points}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </List>
                </Box>
              ) : (
                <Alert severity="info" sx={{ my: 2 }}>
                  No questions found in this quiz pool. Add quizzes to this pool to see questions.
                </Alert>
              )
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={24} />
              </Box>
            )
          )}
        </Box>
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle2" gutterBottom>
          Contributing Teachers:
        </Typography>
        {pool.contributors && pool.contributors.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {pool.contributors.map((contributor, index) => (
              <Chip 
                key={contributor._id || index}
                label={contributor.name} 
                icon={<SchoolIcon />} 
                variant="outlined" 
                color="primary"
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No contributors information available
          </Typography>
        )}
        
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<QuestionIcon />}
          sx={{ mt: 1 }}
        >
          View All Pool Questions
        </Button>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Quiz Management
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Select Course"
              value={selectedCourse}
              onChange={handleCourseChange}
              variant="outlined"
            >
              <MenuItem value="">
                <em>Select a course</em>
              </MenuItem>
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.title} ({course.courseCode})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Quizzes"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : selectedCourse ? (
        <>
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Organized by Unit" icon={<LibraryBooksIcon />} iconPosition="start" />
              <Tab label="All Quizzes" icon={<QuestionIcon />} iconPosition="start" />
              <Tab label="Quiz Pools" icon={<SchoolIcon />} iconPosition="start" />
            </Tabs>
            
            <Box sx={{ p: 3 }}>
              {/* Tab 1: Organized by Unit */}
              {tabValue === 0 && (
                <Box>
                  {units.length === 0 && quizzes.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" align="center">
                      No units or quizzes found for this course
                    </Typography>
                  ) : (
                    Object.keys(groupedQuizzes).map(unitId => {
                      const unitData = groupedQuizzes[unitId];
                      // Skip if no quizzes and no quiz pools
                      if (unitData.quizzes.length === 0 && unitData.quizPools.length === 0) {
                        return null;
                      }
                      
                      return (
                        <Accordion 
                          key={unitId} 
                          expanded={expanded === unitId}
                          onChange={handleAccordionChange(unitId)}
                          sx={{ mb: 2 }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">
                              {unitData.unitInfo.title}
                            </Typography>
                            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                              {unitData.quizzes.length > 0 && (
                                <Chip 
                                  label={`${unitData.quizzes.length} Quiz${unitData.quizzes.length !== 1 ? 'zes' : ''}`} 
                                  color="primary" 
                                  size="small" 
                                  variant="outlined"
                                />
                              )}
                              {unitData.quizPools.length > 0 && (
                                <Chip 
                                  label={`${unitData.quizPools.length} Pool${unitData.quizPools.length !== 1 ? 's' : ''}`} 
                                  color="secondary" 
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={3}>
                              {/* Quizzes in this unit */}
                              {unitData.quizzes.length > 0 && (
                                <Grid item xs={12}>
                                  <Typography variant="subtitle1" gutterBottom>
                                    Individual Quizzes:
                                  </Typography>
                                  <Grid container spacing={2}>
                                    {unitData.quizzes.map(quiz => (
                                      <Grid item xs={12} key={quiz._id}>
                                        <Card variant="outlined">
                                          <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                              {quiz.title}
                                            </Typography>
                                            {quiz.description && (
                                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                                {quiz.description}
                                              </Typography>
                                            )}
                                            {renderQuizDetails(quiz)}
                                          </CardContent>
                                        </Card>
                                      </Grid>
                                    ))}
                                  </Grid>
                                </Grid>
                              )}
                              
                              {/* Quiz Pools in this unit */}
                              {unitData.quizPools.length > 0 && (
                                <Grid item xs={12}>
                                  <Typography variant="subtitle1" gutterBottom>
                                    Quiz Pools:
                                  </Typography>
                                  <Grid container spacing={2}>
                                    {unitData.quizPools.map(pool => (
                                      <Grid item xs={12} key={pool._id}>
                                        <Card variant="outlined">
                                          <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                              {pool.title}
                                            </Typography>
                                            {pool.description && (
                                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                                {pool.description}
                                              </Typography>
                                            )}
                                            {renderQuizPoolDetails(pool)}
                                          </CardContent>
                                        </Card>
                                      </Grid>
                                    ))}
                                  </Grid>
                                </Grid>
                              )}
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })
                  )}
                </Box>
              )}
              
              {/* Tab 2: All Quizzes */}
              {tabValue === 1 && (
                <Box>
                  {filteredQuizzes.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" align="center">
                      No quizzes found
                    </Typography>
                  ) : (
                    <Grid container spacing={3}>
                      {filteredQuizzes.map(quiz => (
                        <Grid item xs={12} key={quiz._id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                  <Typography variant="h6" gutterBottom>
                                    {quiz.title}
                                  </Typography>
                                  {quiz.unit && (
                                    <Chip 
                                      label={quiz.unit.title} 
                                      size="small" 
                                      sx={{ mr: 1, mb: 1 }} 
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              </Box>
                              
                              {quiz.description && (
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  {quiz.description}
                                </Typography>
                              )}
                              
                              {renderQuizDetails(quiz)}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}
              
              {/* Tab 3: Quiz Pools */}
              {tabValue === 2 && (
                <Box>
                  {filteredQuizPools.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" align="center">
                      No quiz pools found
                    </Typography>
                  ) : (
                    <Grid container spacing={3}>
                      {filteredQuizPools.map(pool => (
                        <Grid item xs={12} md={6} key={pool._id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                {pool.title}
                              </Typography>
                              {pool.unit && (
                                <Chip 
                                  label={pool.unit.title} 
                                  size="small" 
                                  sx={{ mr: 1, mb: 1 }} 
                                  color="secondary"
                                  variant="outlined"
                                />
                              )}
                              
                              {pool.description && (
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  {pool.description}
                                </Typography>
                              )}
                              
                              {renderQuizPoolDetails(pool)}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </>
      ) : (
        <Typography variant="body1" color="text.secondary" align="center">
          Please select a course to view quizzes
        </Typography>
      )}
    </Box>
  );
};

export default QuizManagement;
