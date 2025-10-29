import React, { useState, useEffect, useCallback, memo, useRef, useMemo, useDeferredValue } from 'react';
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
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Flag as FlagIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

// Memoized TextField component to prevent re-rendering issues
const MemoizedTextField = memo(({ value, onChange, onFocus, ...props }) => {
  return (
    <TextField
      {...props}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      autoFocus={false}
    />
  );
});

const HODQuizManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [quizPools, setQuizPools] = useState([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  // Approved questions state
  const [approvedQuestions, setApprovedQuestions] = useState([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [approvedSearch, setApprovedSearch] = useState('');
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedRowsPerPage, setApprovedRowsPerPage] = useState(10);
  
  // Auth context
  const token = localStorage.getItem('token');
  const currentUser = token ? parseJwt(token) : null;
  
  // Dialog states
  const [viewQuestionsDialog, setViewQuestionsDialog] = useState(false);
  const [addQuestionDialog, setAddQuestionDialog] = useState(false);
  const [editQuestionDialog, setEditQuestionDialog] = useState(false);
  const [selectedQuizPool, setSelectedQuizPool] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [quizPoolQuestions, setQuizPoolQuestions] = useState([]);
  
  // Question form state
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctOption: 0,
    points: 1
  });
  // Separate dialog for HOD direct add
  const [hodAddDialog, setHodAddDialog] = useState(false);
  
  // Optimized handlers to prevent re-rendering issues
  const setQuestionFormRef = useRef(setQuestionForm);
  setQuestionFormRef.current = setQuestionForm;
  
  const handleQuestionTextChange = useCallback((e) => {
    const value = e.target.value;
    setQuestionFormRef.current(prev => ({ ...prev, questionText: value }));
  }, []);
  
  const handleOptionChange = useCallback((index, value) => {
    setQuestionFormRef.current(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  }, []);
  
  const handlePointsChange = useCallback((e) => {
    const value = parseInt(e.target.value) || 1;
    setQuestionFormRef.current(prev => ({ ...prev, points: value }));
  }, []);
  
  const handleCorrectOptionChange = useCallback((e) => {
    setQuestionFormRef.current(prev => ({ ...prev, correctOption: e.target.value }));
  }, []);

  // Debounced search values to avoid heavy re-filtering on each keystroke
  const deferredPoolsSearch = useDeferredValue(searchTerm);
  const deferredApprovedSearch = useDeferredValue(approvedSearch);
  
  // Fetch HOD courses
  const fetchCourses = useCallback(async () => {
    try {
      setError('');
      const res = await axios.get('/api/hod/courses', { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.courses)
          ? data.courses
          : Array.isArray(data)
            ? data
            : [];
      setCourses(items);
    } catch (e) {
      console.error('Failed to fetch HOD courses:', e?.response?.data || e.message);
      setError('Failed to fetch courses');
      setCourses([]);
    }
  }, [token]);

  // Fetch units for a course
  const fetchUnits = useCallback(async (courseId) => {
    if (!courseId) { setUnits([]); return; }
    try {
      setError('');
      const res = await axios.get(`/api/units/course/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.units)
          ? data.units
          : Array.isArray(data)
            ? data
            : [];
      setUnits(items);
    } catch (e) {
      console.error('Failed to fetch units:', e?.response?.data || e.message);
      setError('Failed to fetch units');
      setUnits([]);
    }
  }, [token]);

  // Initial load for courses, flagged questions and quiz pools
  useEffect(() => {
    fetchCourses();
    fetchFlaggedQuestions();
    fetchQuizPools();
  }, [fetchCourses]);

  // When course changes, load units and reset unit selection and approved questions
  useEffect(() => {
    if (selectedCourse) {
      fetchUnits(selectedCourse);
    } else {
      setUnits([]);
      setSelectedUnit('');
    }
    // Refresh quiz pools list according to filters
    fetchQuizPools();
    // Reset approved questions view when course changes
    setApprovedQuestions([]);
  }, [selectedCourse]);

  // When unit changes, optionally refresh approved questions and quiz pools
  useEffect(() => {
    fetchQuizPools();
    if (activeTab === 2 && selectedCourse && selectedUnit) {
      fetchApprovedQuestions(selectedCourse, selectedUnit);
    }
  }, [selectedUnit]);

  // When tab switches to Approved Questions, load data if filters are chosen
  useEffect(() => {
    if (activeTab === 2 && selectedCourse && selectedUnit) {
      fetchApprovedQuestions(selectedCourse, selectedUnit);
    }
  }, [activeTab]);

  // Stable focus handler for text inputs to keep cursor at end on focus
  const handleFocus = useCallback((e) => {
    setTimeout(() => {
      if (e?.target) {
        const len = e.target.value?.length ?? 0;
        try {
          e.target.setSelectionRange(len, len);
        } catch (_) {
          // ignore if not supported
        }
      }
    }, 0);
  }, []);

  // Add Question dialog (memoized, local state to avoid parent re-render)
  const HODAddQuestionDialog = memo(({ open, onClose, selectedCourse, selectedUnit }) => {
    const [form, setForm] = React.useState({
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0,
      points: 1,
    });

    const localHandleFocus = React.useCallback((e) => {
      // Defer to next tick to ensure cursor stays at end
      setTimeout(() => {
        if (e?.target) {
          e.target.setSelectionRange(e.target.value.length, e.target.value.length);
        }
      }, 0);
    }, []);

    const onQuestionChange = React.useCallback((e) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, questionText: value }));
    }, []);

    const onOptionChange = React.useCallback((index, value) => {
      setForm((prev) => {
        const options = [...prev.options];
        options[index] = value;
        return { ...prev, options };
      });
    }, []);

    const onPointsChange = React.useCallback((e) => {
      const value = parseInt(e.target.value) || 1;
      setForm((prev) => ({ ...prev, points: value }));
    }, []);

    const onCorrectChange = React.useCallback((e) => {
      setForm((prev) => ({ ...prev, correctOption: e.target.value }));
    }, []);

    // Reset the form whenever dialog opens
    React.useEffect(() => {
      if (open) {
        setForm({ questionText: '', options: ['', '', '', ''], correctOption: 0, points: 1 });
      }
    }, [open]);

    const canCreate = Boolean(selectedCourse && selectedUnit && form.questionText.trim() && !form.options.some((o) => !o.trim()));

    const handleCreate = async () => {
      try {
        await axios.post(
          '/api/hod/questions',
          {
            courseId: selectedCourse,
            unitId: selectedUnit,
            questionText: form.questionText,
            options: form.options,
            correctOption: form.correctOption,
            points: form.points,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onClose?.();
      } catch (err) {
        console.error(err);
        setError('Failed to create question');
      }
    };

    return (
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
        // Prevent focus thrashing/freezes while typing on some browsers
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        keepMounted
      >
        <DialogTitle>Add Question to Unit</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <MemoizedTextField
              fullWidth
              label="Question Text"
              multiline
              rows={3}
              value={form.questionText}
              onChange={onQuestionChange}
              sx={{ mb: 2 }}
              onFocus={localHandleFocus}
            />
            {form.options.map((option, index) => (
              <MemoizedTextField
                key={`option-${index}`}
                fullWidth
                label={`Option ${String.fromCharCode(65 + index)}`}
                value={option}
                onChange={(e) => onOptionChange(index, e.target.value)}
                sx={{ mb: 2 }}
                onFocus={localHandleFocus}
              />
            ))}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Correct Option</InputLabel>
              <Select value={form.correctOption} onChange={onCorrectChange} label="Correct Option">
                {form.options.map((_, index) => (
                  <MenuItem key={index} value={index}>
                    Option {String.fromCharCode(65 + index)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <MemoizedTextField
              fullWidth
              label="Points"
              type="number"
              value={form.points}
              onChange={onPointsChange}
              inputProps={{ min: 1, max: 10 }}
              onFocus={localHandleFocus}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" disabled={!canCreate} onClick={handleCreate}>
            Create Question
          </Button>
        </DialogActions>
      </Dialog>
    );
  });
  
  // Fetch quiz pools with optional course/unit filtering
  const fetchQuizPools = async () => {
    try {
      setLoading(true);
      setError('');
      // Only fetch when a course is selected; backend route expects a courseId
      if (!selectedCourse) {
        setQuizPools([]);
        return;
      }
      const res = await axios.get(`/api/quiz-pools/course/${selectedCourse}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      const pools = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.pools)
          ? data.pools
          : Array.isArray(data)
            ? data
            : [];
      let filtered = pools;

      // Course filter is already applied by backend route

      if (selectedUnit) {
        filtered = filtered.filter((p) => {
          const unitId = p?.unit?._id || p?.unitId || p?.unit;
          return unitId && unitId.toString() === selectedUnit.toString();
        });
      }

      setQuizPools(filtered);
    } catch (error) {
      console.error('Failed to fetch quiz pools:', error?.response?.data || error.message);
      setError('Failed to fetch quiz pools');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlaggedQuestions = async () => {
    try {
      // Backend HOD reviews endpoint: GET /api/hod/reviews/flagged -> { total, page, limit, items }
      const response = await axios.get('/api/hod/reviews/flagged', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFlaggedQuestions(response.data?.items || []);
    } catch (error) {
      console.error('Error fetching flagged questions:', error);
    }
  };

  const fetchApprovedQuestions = async (courseId, unitId) => {
    try {
      setApprovedLoading(true);
      setError('');
      const res = await axios.get(`/api/hod/questions/approved`, {
        params: { courseId, unitId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setApprovedQuestions(res.data?.items || []);
    } catch (e) {
      console.error('Failed to fetch approved questions:', e?.response?.data || e.message);
      setError('Failed to fetch approved questions');
      setApprovedQuestions([]);
    } finally {
      setApprovedLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleApproveQuestion = async (reviewId) => {
    try {
      // Backend uses POST /api/hod/reviews/:reviewId/resolve with body { action: 'approve' }
      await axios.post(`/api/hod/reviews/${reviewId}/resolve`, { action: 'approve' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFlaggedQuestions();
    } catch (error) {
      setError('Failed to approve question');
    }
  };

  const handleRejectQuestion = async (reviewId) => {
    try {
      await axios.post(`/api/hod/reviews/${reviewId}/resolve`, { action: 'reject' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFlaggedQuestions();
    } catch (error) {
      setError('Failed to reject question');
    }
  };

  const handleViewQuestions = async (quizPool) => {
    setSelectedQuizPool(quizPool);
    try {
      const response = await axios.get(`/api/quiz-pools/${quizPool._id}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizPoolQuestions(response.data.questions || []);
      setViewQuestionsDialog(true);
    } catch (error) {
      setError('Failed to fetch questions');
    }
  };

  const handleAddQuestion = (quizPool) => {
    setSelectedQuizPool(quizPool);
    setQuestionForm({
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0,
      points: 1
    });
    setAddQuestionDialog(true);
  };

  const handleEditQuestion = (quizPool, question) => {
    setSelectedQuizPool(quizPool);
    setSelectedQuestion(question);
    setQuestionForm({
      questionText: question.questionText,
      options: [...question.options],
      correctOption: question.correctOption,
      points: question.points
    });
    setEditQuestionDialog(true);
  };

  const handleSaveQuestion = async () => {
    try {
      if (editQuestionDialog) {
        // Update existing question
        if (selectedQuizPool) {
          // Teacher/Admin legacy path inside pool dialog
          await axios.put(`/api/quiz-pools/${selectedQuizPool._id}/questions/${selectedQuestion._id}`, 
            questionForm, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (selectedQuestion && selectedQuestion.originalQuizId) {
          // HOD edit from Approved Questions tab
          await axios.put(`/api/hod/questions/${selectedQuestion.originalQuizId}/${selectedQuestion._id}`,
            questionForm,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } else {
        // Add new question
        await axios.post(`/api/quiz-pools/${selectedQuizPool._id}/questions`, 
          questionForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setAddQuestionDialog(false);
      setEditQuestionDialog(false);
      if (viewQuestionsDialog && selectedQuizPool) {
        handleViewQuestions(selectedQuizPool); // Refresh questions
      }
      fetchQuizPools(); // Refresh quiz pools
      if (activeTab === 2 && selectedCourse && selectedUnit) {
        fetchApprovedQuestions(selectedCourse, selectedUnit);
      }
    } catch (error) {
      setError('Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId, opts = {}) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      if (opts.originalQuizId) {
        // From Approved Questions tab (HOD)
        await axios.delete(`/api/hod/questions/${opts.originalQuizId}/${questionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // From pool dialog
        await axios.delete(`/api/quiz-pools/${selectedQuizPool._id}/questions/${questionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      if (viewQuestionsDialog && selectedQuizPool) {
        handleViewQuestions(selectedQuizPool); // Refresh questions
      }
      fetchQuizPools(); // Refresh quiz pools
      if (activeTab === 2 && selectedCourse && selectedUnit) {
        fetchApprovedQuestions(selectedCourse, selectedUnit);
      }
    } catch (error) {
      setError('Failed to delete question');
    }
  };

  const filteredQuizPools = useMemo(() => {
    const term = (deferredPoolsSearch || '').toLowerCase();
    if (!term) return quizPools;
    return quizPools.filter(pool =>
      pool.title?.toLowerCase().includes(term) ||
      pool.description?.toLowerCase().includes(term)
    );
  }, [quizPools, deferredPoolsSearch]);

  const QuizPoolsTab = () => (
    <Box>
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
              <MenuItem value="">All Courses</MenuItem>
              {courses.map(course => (
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
      <Card>
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
              No quiz pools found. Select a course to view quiz pools.
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
                    <TableCell>Created At</TableCell>
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
                          {pool.course?.title} ({pool.course?.courseCode})
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
                        <Box display="flex" alignItems="center">
                          <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, color: 'action.active' }} />
                          <Typography variant="body2">
                            {new Date(pool.createdAt).toLocaleDateString()}
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
                        {/* HODs can manage flagged reviews; restrict direct question management to teachers/admins */}
                        {['teacher', 'admin'].includes(currentUser?.role) && (
                          <>
                            <Tooltip title="View Questions">
                              <IconButton 
                                size="small"
                                onClick={() => handleViewQuestions(pool)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Add Question">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => handleAddQuestion(pool)}
                              >
                                <AddIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
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

  const FlaggedQuestionsTab = () => (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Flagged Questions ({flaggedQuestions.length})
          </Typography>
          
          {flaggedQuestions.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={3}>
              No flagged questions pending review.
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Uploaded By</TableCell>
                    <TableCell>Flagged By</TableCell>
                    <TableCell>Flag Note</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flaggedQuestions.map((review) => (
                    <TableRow key={review._id}>
                      <TableCell>
                        <Typography variant="body2">
                          {review.snapshot?.questionText || 'Question text unavailable'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Points: {review.snapshot?.points || 1}
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
                          <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'action.active' }} />
                          <Typography variant="body2">
                            {review.uploader?.name || 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <FlagIcon sx={{ fontSize: 16, mr: 0.5, color: 'warning.main' }} />
                          <Typography variant="body2">
                            {review.assignedTo?.name || 'Unknown CC'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {review.note || 'No note provided'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Approve Question">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleApproveQuestion(review._id)}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Question">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRejectQuestion(review._id)}
                          >
                            <RejectIcon />
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

  const ApprovedQuestionsTab = () => {
    const term = (deferredApprovedSearch || '').toLowerCase();
    const filteredApproved = useMemo(() => {
      if (!term) return approvedQuestions;
      return approvedQuestions.filter((q) => {
        const text = (q.question?.questionText || '').toLowerCase();
        const uploader = (q.uploader?.name || '').toLowerCase();
        return text.includes(term) || uploader.includes(term);
      });
    }, [approvedQuestions, term]);
    const start = approvedPage * approvedRowsPerPage;
    const pageItems = filteredApproved.slice(start, start + approvedRowsPerPage);

    return (
    <Box>
      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Course</InputLabel>
            <Select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              label="Course"
            >
              <MenuItem value="">Select Course</MenuItem>
              {courses.map(course => (
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
              <MenuItem value="">Select Unit</MenuItem>
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
            placeholder="Search question or uploader..."
            value={approvedSearch}
            onChange={(e) => { setApprovedSearch(e.target.value); setApprovedPage(0); }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Approved Questions {selectedCourse && selectedUnit ? `(${approvedQuestions.length})` : ''}
          </Typography>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!selectedCourse || !selectedUnit}
              onClick={() => {
                setQuestionForm({ questionText: '', options: ['', '', '', ''], correctOption: 0, points: 1 });
                setHodAddDialog(true);
              }}
            >
              Add Question
            </Button>
          </Box>
          {!selectedCourse || !selectedUnit ? (
            <Typography color="textSecondary" textAlign="center" py={3}>
              Select a course and unit to view approved questions.
            </Typography>
          ) : approvedLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : approvedQuestions.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={3}>
              No approved questions found for this unit.
            </Typography>
          ) : (
            (() => {
              const filtered = filteredApproved;
              return (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Options</TableCell>
                    <TableCell>Correct</TableCell>
                    <TableCell>Points</TableCell>
                    <TableCell>Uploaded By</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageItems.map((q) => (
                    <TableRow key={`${q.quizId}-${q.questionId}`}>
                      <TableCell sx={{ maxWidth: 400 }}>
                        <Typography variant="body2">{q.question?.questionText}</Typography>
                      </TableCell>
                      <TableCell>
                        {q.question?.options?.map((opt, idx) => (
                          <Typography key={idx} variant="caption" display="block" color={idx === q.question?.correctOption ? 'success.main' : 'textSecondary'}>
                            {String.fromCharCode(65 + idx)}. {opt}
                          </Typography>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Chip label={String.fromCharCode(65 + (q.question?.correctOption ?? 0))} color="success" size="small" />
                      </TableCell>
                      <TableCell>{q.question?.points ?? 1}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'action.active' }} />
                          <Typography variant="body2">{q.uploader?.name || 'Unknown'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, color: 'action.active' }} />
                          <Typography variant="body2">{new Date(q.updatedAt).toLocaleString()}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit Question">
                          <IconButton size="small" onClick={() => {
                            // Prepare edit form using current snapshot
                            setSelectedQuizPool(null);
                            setSelectedQuestion({
                              _id: q.questionId,
                              questionText: q.question?.questionText,
                              options: q.question?.options || [],
                              correctOption: q.question?.correctOption ?? 0,
                              points: q.question?.points ?? 1,
                              originalQuizId: q.quizId
                            });
                            setQuestionForm({
                              questionText: q.question?.questionText || '',
                              options: [...(q.question?.options || ['', '', '', ''])],
                              correctOption: q.question?.correctOption ?? 0,
                              points: q.question?.points ?? 1
                            });
                            setEditQuestionDialog(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Question">
                          <IconButton size="small" color="error" onClick={() => handleDeleteQuestion(q.questionId, { originalQuizId: q.quizId })}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
                <Typography variant="caption" color="textSecondary">
                  Showing {filtered.length === 0 ? 0 : start + 1}-{Math.min(start + approvedRowsPerPage, filtered.length)} of {filtered.length}
                </Typography>
                <Box>
                  <TextField
                    select
                    size="small"
                    label="Rows"
                    value={approvedRowsPerPage}
                    onChange={(e) => { setApprovedRowsPerPage(parseInt(e.target.value)); setApprovedPage(0); }}
                    sx={{ width: 100, mr: 2 }}
                  >
                    {[5,10,20,50].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                  </TextField>
                  <Button disabled={approvedPage === 0} onClick={() => setApprovedPage((p) => Math.max(0, p - 1))}>Prev</Button>
                  <Button disabled={(approvedPage + 1) * approvedRowsPerPage >= filtered.length} onClick={() => setApprovedPage((p) => p + 1)}>Next</Button>
                </Box>
              </Box>
            </TableContainer>
              );
            })()
          )}
        </CardContent>
      </Card>
    </Box>
  );
  };

  const ViewQuestionsDialog = () => (
    <Dialog 
      open={viewQuestionsDialog} 
      onClose={() => setViewQuestionsDialog(false)}
      maxWidth="md"
      fullWidth
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      keepMounted
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
                        {question.questionText}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {question.options?.map((option, idx) => (
                        <Typography 
                          key={idx} 
                          variant="caption" 
                          display="block"
                          color={idx === question.correctOption ? 'success.main' : 'textSecondary'}
                        >
                          {String.fromCharCode(65 + idx)}. {option}
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={String.fromCharCode(65 + question.correctOption)}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{question.points}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit Question">
                        <IconButton 
                          size="small"
                          onClick={() => handleEditQuestion(selectedQuizPool, question)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Question">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteQuestion(question._id)}
                        >
                          <DeleteIcon />
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
        <Button 
          variant="contained" 
          onClick={() => handleAddQuestion(selectedQuizPool)}
          startIcon={<AddIcon />}
        >
          Add Question
        </Button>
      </DialogActions>
    </Dialog>
  );

  const QuestionFormDialog = () => (
    <Dialog 
      open={addQuestionDialog || editQuestionDialog} 
      onClose={() => {
        setAddQuestionDialog(false);
        setEditQuestionDialog(false);
      }}
      maxWidth="sm"
      fullWidth
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      keepMounted
    >
      <DialogTitle>
        {editQuestionDialog ? 'Edit Question' : 'Add Question'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <MemoizedTextField
            fullWidth
            label="Question Text"
            multiline
            rows={3}
            value={questionForm.questionText}
            onChange={handleQuestionTextChange}
            sx={{ mb: 2 }}
            onFocus={handleFocus}
          />
          
          {questionForm.options.map((option, index) => (
            <MemoizedTextField
              key={`edit-option-${index}`}
              fullWidth
              label={`Option ${String.fromCharCode(65 + index)}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              sx={{ mb: 2 }}
              onFocus={handleFocus}
            />
          ))}
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Correct Option</InputLabel>
            <Select
              value={questionForm.correctOption}
              onChange={handleCorrectOptionChange}
              label="Correct Option"
            >
              {questionForm.options.map((_, index) => (
                <MenuItem key={index} value={index}>
                  Option {String.fromCharCode(65 + index)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <MemoizedTextField
            fullWidth
            label="Points"
            type="number"
            value={questionForm.points}
            onChange={handlePointsChange}
            inputProps={{ min: 1, max: 10 }}
            onFocus={handleFocus}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setAddQuestionDialog(false);
          setEditQuestionDialog(false);
        }}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSaveQuestion}
          disabled={!questionForm.questionText || questionForm.options.some(opt => !opt.trim())}
        >
          {editQuestionDialog ? 'Update' : 'Add'} Question
        </Button>
      </DialogActions>
    </Dialog>
  );

  // removed duplicate HODAddQuestionDialog implementation

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Quiz Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            label={
              <Badge badgeContent={filteredQuizPools.length} color="primary" max={999}>
                Quiz Pools
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={flaggedQuestions.length} color="error" max={999}>
                Flagged Questions
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={selectedCourse && selectedUnit ? approvedQuestions.length : 0} color="secondary" max={999}>
                Approved Questions
              </Badge>
            }
          />
        </Tabs>
      </Box>

      {activeTab === 0 && <QuizPoolsTab />}
      {activeTab === 1 && <FlaggedQuestionsTab />}
      {activeTab === 2 && <ApprovedQuestionsTab />}

      {/* Dialogs */}
      <ViewQuestionsDialog />
      <QuestionFormDialog />
      <HODAddQuestionDialog
        key={hodAddDialog ? 'open' : 'closed'}
        open={hodAddDialog}
        onClose={() => setHodAddDialog(false)}
        selectedCourse={selectedCourse}
        selectedUnit={selectedUnit}
      />
    </Box>
  );
};

export default HODQuizManagement;
