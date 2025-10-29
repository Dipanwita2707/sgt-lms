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
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Analytics as AnalyticsIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  QuestionAnswer as QuestionIcon,
  Check as CheckIcon,
  School as SchoolIcon,
  ContentCopy as ContentCopyIcon,
  LibraryBooks as LibraryBooksIcon,
  Settings as SettingsIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { parseJwt } from '../../utils/jwt';
import QuizUploadForm from '../../components/teacher/QuizUploadForm';
import QuizConfigurationDialog from '../../components/common/QuizConfigurationDialog';

const TeacherQuizzes = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [quizPools, setQuizPools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, quiz: null });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [expandedQuizPool, setExpandedQuizPool] = useState(null);
  const [quizPoolQuestions, setQuizPoolQuestions] = useState({});
  const [poolDetailsDialog, setPoolDetailsDialog] = useState({ open: false, pool: null });
  const [quizConfigDialogOpen, setQuizConfigDialogOpen] = useState(false);
  const [selectedConfigUnit, setSelectedConfigUnit] = useState(null);
  const [uploadedQuestions, setUploadedQuestions] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch teacher's courses
      const coursesResponse = await axios.get('/api/teacher/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(coursesResponse.data);

      // If teacher has courses, fetch data for the first course
      if (coursesResponse.data.length > 0) {
        const firstCourseId = coursesResponse.data[0]._id;
        setSelectedCourse(firstCourseId);
        await Promise.all([
          fetchUnits(firstCourseId),
          fetchUploadedQuestions(firstCourseId)
        ]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load quiz data. Please try again later.');
      setLoading(false);
    }
  };

  const fetchQuizzes = async (courseId) => {
    try {
      console.log(`Fetching quizzes for course: ${courseId}`);
      const response = await axios.get(`/api/quizzes/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Quizzes API response:", response.data);
      
      // The API returns { quizzes, quizPools } object, extract the quizzes array
      if (response.data && Array.isArray(response.data.quizzes)) {
        setQuizzes(response.data.quizzes);
      } else if (Array.isArray(response.data)) {
        setQuizzes(response.data);
      } else {
        setQuizzes([]);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setQuizzes([]);
    }
  };

  const fetchQuizPools = async (courseId) => {
    try {
      const response = await axios.get(`/api/quiz-pools/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure quizPools is always an array
      setQuizPools(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching quiz pools:', err);
      setQuizPools([]);
    }
  };

  const fetchUnits = async (courseId) => {
    try {
      const response = await axios.get(`/api/units/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure units is always an array
      setUnits(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching units:', err);
      setUnits([]);
    }
  };

  const fetchUploadedQuestions = async (courseId) => {
    try {
      const response = await axios.get(`/api/quizzes/teacher/uploaded-questions/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUploadedQuestions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching uploaded questions:', err);
      setUploadedQuestions([]);
    }
  };

  const handleCourseChange = async (courseId) => {
    setSelectedCourse(courseId);
    setTabValue(0); // Reset to first tab
    await Promise.all([
      fetchUnits(courseId),
      fetchUploadedQuestions(courseId)
    ]);
  };

  const handleDeleteQuiz = async (quiz) => {
    try {
      await axios.delete(`/api/quizzes/${quiz._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh quizzes list
      await fetchQuizzes(selectedCourse);
      setDeleteDialog({ open: false, quiz: null });
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Failed to delete quiz. Please try again.');
    }
  };

  const handleViewAnalytics = (quizId) => {
    navigate(`/teacher/quiz-analytics/${quizId}`);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenQuizConfig = (unit) => {
    setSelectedConfigUnit(unit);
    setQuizConfigDialogOpen(true);
  };

  const handleCloseQuizConfig = () => {
    setQuizConfigDialogOpen(false);
    setSelectedConfigUnit(null);
  };

  const fetchQuizPoolQuestions = async (poolId) => {
    if (quizPoolQuestions[poolId]) {
      return; // Already fetched
    }
    
    try {
      console.log(`Fetching questions for quiz pool: ${poolId}`);
      const response = await axios.get(`/api/quiz-pools/${poolId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`Received ${response.data.length} questions for quiz pool ${poolId}`);
      
      setQuizPoolQuestions(prev => ({
        ...prev,
        [poolId]: response.data
      }));
    } catch (err) {
      console.error('Error fetching quiz pool questions:', err);
      // Initialize with empty array on error
      setQuizPoolQuestions(prev => ({
        ...prev,
        [poolId]: []
      }));
    }
  };

  const handleExpandPool = (poolId) => {
    if (expandedQuizPool === poolId) {
      setExpandedQuizPool(null);
    } else {
      setExpandedQuizPool(poolId);
      fetchQuizPoolQuestions(poolId);
    }
  };

  const getUnitName = (unitId) => {
    const unit = units.find(u => u._id === unitId);
    return unit ? unit.title : 'Unknown Unit';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {showUploadForm ? (
        <QuizUploadForm onCancel={() => setShowUploadForm(false)} />
      ) : (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">Quiz Management</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowUploadForm(true)}
            >
              Create Quiz
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Course Selection */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Course
            </Typography>
            <TextField
              select
              fullWidth
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              variant="outlined"
            >
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.title} ({course.courseCode})
                </MenuItem>
              ))}
            </TextField>
          </Paper>

          {/* Tabs for Quizzes */}
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                icon={<QuestionIcon />} 
                label="My Uploaded Questions" 
                iconPosition="start"
              />
              <Tab 
                icon={<SettingsIcon />} 
                label="Quiz Settings" 
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* Quiz Statistics (Only shown on first tab) */}
          {tabValue === 0 && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Total Uploaded Questions
                    </Typography>
                    <Typography variant="h3">
                      {uploadedQuestions.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Active Questions
                    </Typography>
                    <Typography variant="h3">
                      {uploadedQuestions.filter(q => q.status === 'Added to Pool').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Inactive Questions
                    </Typography>
                    <Typography variant="h3">
                      {uploadedQuestions.filter(q => q.status === 'Inactive').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* My Uploaded Questions Tab Content */}
          {tabValue === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <QuizIcon sx={{ mr: 1 }} color="primary" />
                My Uploaded Questions
              </Typography>

              {uploadedQuestions.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Unit</TableCell>
                        <TableCell>Question</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell>Upload Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadedQuestions.map((question, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {question.unitTitle || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                              {question.questionText?.substring(0, 80)}...
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={question.questionType || 'MCQ'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={question.status || 'Pending'}
                              color={
                                question.status === 'Added to Pool' ? 'success' :
                                question.status === 'Rejected' ? 'error' :
                                'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {question.createdAt ? new Date(question.createdAt).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No uploaded questions found. Upload questions to see them here.
                </Alert>
              )}
            </Paper>
          )}

          {/* Quiz Settings Tab */}
          {tabValue === 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <SettingsIcon color="primary" />
                Quiz Configuration by Unit
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Configure quiz settings per unit and section.</strong> Set custom time limits, number of questions, and other parameters. 
                  If not configured, quizzes will use default settings: <strong>30 minutes, 10 questions</strong>.
                </Typography>
              </Alert>

              {units.length > 0 ? (
                <Grid container spacing={3}>
                  {units.map((unit) => {
                    const selectedCourseData = courses.find(c => c._id === selectedCourse);
                    return (
                      <Grid item xs={12} md={6} key={unit._id}>
                        <Card sx={{ 
                          height: '100%',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            boxShadow: 3,
                            borderColor: 'primary.main'
                          }
                        }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {unit.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {unit.description || 'No description'}
                            </Typography>
                            
                            {selectedCourseData && selectedCourseData.sections && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Sections: {selectedCourseData.sections.length}
                                </Typography>
                              </Box>
                            )}

                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              startIcon={<SettingsIcon />}
                              onClick={() => handleOpenQuizConfig(unit)}
                            >
                              Configure Quiz Settings
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Alert severity="info">
                  No units found for this course. Create units first to configure quiz settings.
                </Alert>
              )}
            </Paper>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialog.open}
            onClose={() => setDeleteDialog({ open: false, quiz: null })}
          >
            <DialogTitle>Delete Quiz</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete the quiz "{deleteDialog.quiz?.title}"?
                This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialog({ open: false, quiz: null })}>
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteQuiz(deleteDialog.quiz)}
                color="error"
                variant="contained"
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {/* Quiz Configuration Dialog */}
          {selectedConfigUnit && selectedCourse && (
            <QuizConfigurationDialog
              open={quizConfigDialogOpen}
              onClose={handleCloseQuizConfig}
              courseId={selectedCourse}
              unitId={selectedConfigUnit._id}
              unitTitle={selectedConfigUnit.title}
              sections={courses.find(c => c._id === selectedCourse)?.sections || []}
              userRole="teacher"
            />
          )}
        </>
      )}
    </Box>
  );
};

export default TeacherQuizzes;
