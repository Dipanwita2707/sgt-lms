import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Alert,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination
} from '@mui/material';
import {
  Business,
  LockOpen,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Info,
  Warning,
  CheckCircle,
  Person,
  Quiz,
  School,
  AccessTime,
  SupervisorAccount,
  AdminPanelSettings,
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const HODQuizUnlockDashboard = ({ showAlert: propShowAlert }) => {
  const [items, setItems] = useState([]);
  const [unlockHistory, setUnlockHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = Current Requests, 1 = Unlock History
  const [unlocking, setUnlocking] = useState(false);
  const [query, setQuery] = useState('');
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockNote, setUnlockNote] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  // Pagination and filtering state for unlock history
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({});
  const [filters, setFilters] = useState({
    courseId: '',
    unitId: '',
    sectionId: '',
    studentSearch: '',
    actionType: '',
    startDate: '',
    endDate: ''
  });
  const [filterOptions, setFilterOptions] = useState({ courses: [], units: [], sections: [] });

  const token = localStorage.getItem('token');

  // Internal showAlert function if no prop provided
  const showAlert = propShowAlert || ((message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  });

  const fetchData = async () => {
    if (!filters.courseId || !filters.sectionId) return; // HOD requires course and section
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('courseId', filters.courseId);
      if (filters.unitId) params.append('unitId', filters.unitId);
      params.append('sectionId', filters.sectionId);
      
      const response = await axios.get(`/api/quiz-unlock/hod-locked-students?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setItems(response.data.data || []);
      } else {
        showAlert('Error loading HOD unlock requests', 'error');
      }
    } catch (error) {
      console.error('Error fetching HOD locked students:', error);
      const message = error.response?.data?.message || 'Error loading HOD unlock requests';
      showAlert(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getReasonText = (reason) => {
    switch (reason) {
      case 'BELOW_PASSING_SCORE':
        return 'Below Passing Score';
      case 'SECURITY_VIOLATION':
        return 'Security Violation';
      case 'TIME_EXCEEDED':
        return 'Time Exceeded';
      case 'MANUAL_LOCK':
        return 'Manual Lock';
      default:
        return reason;
    }
  };

  const fetchFilterOptions = async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/quiz-unlock/filter-options', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setFilterOptions(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const fetchUnlockHistory = async (page = historyPage) => {
    const token = localStorage.getItem('token');
    if (!token || !filters.courseId || !filters.sectionId) return; // HOD requires course and section
    
    try {
      setHistoryLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      // Add filters
      params.append('courseId', filters.courseId);
      if (filters.unitId) params.append('unitId', filters.unitId);
      params.append('sectionId', filters.sectionId);
      if (filters.studentSearch) params.append('studentSearch', filters.studentSearch);
      if (filters.actionType && filters.actionType !== 'all') params.append('actionType', filters.actionType);

      const response = await axios.get(`/api/quiz-unlock/hod-unlock-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUnlockHistory(response.data.data || []);
        setHistoryPagination(response.data.pagination || {});
      } else {
        showAlert('Error fetching unlock history', 'error');
      }
    } catch (err) {
      console.error('Failed to load HOD unlock history:', err);
      showAlert('Error fetching unlock history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1 && unlockHistory.length === 0) {
      fetchUnlockHistory();
    }
  };

  useEffect(() => {
    // Only load initial filter options (courses), no data
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch data when mandatory filters are selected
  useEffect(() => {
    if (filters.courseId && filters.sectionId) {
      if (activeTab === 0) {
        fetchData();
      } else if (activeTab === 1) {
        setHistoryPage(1);
        fetchUnlockHistory(1);
      }
    } else {
      // Clear data when mandatory filters not selected
      setItems([]);
      setUnlockHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.courseId, filters.unitId, filters.sectionId, activeTab]);

  // Fetch history when other filters change (but only if mandatory filters are selected)
  useEffect(() => {
    if (activeTab === 1 && filters.courseId && filters.sectionId) {
      setHistoryPage(1);
      fetchUnlockHistory(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.studentSearch, filters.actionType]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(it =>
      (it.student?.name || '').toLowerCase().includes(q) ||
      (it.student?.regno || '').toLowerCase().includes(q) ||
      (it.course?.name || '').toLowerCase().includes(q) ||
      (it.quiz?.title || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleHODUnlock = async (item) => {
    if (!item.lockInfo?.requiresHodUnlock) {
      showAlert('This quiz does not require HOD authorization', 'warning');
      return;
    }
    setSelectedLock(item);
    setUnlockReason('');
    setUnlockNote('');
    setUnlockDialogOpen(true);
  };

  const handleUnlockConfirm = async () => {
    if (!unlockReason.trim()) {
      showAlert('Please provide a reason for unlocking', 'warning');
      return;
    }

    try {
      setUnlocking(true);
      const response = await axios.post(
        `/api/quiz-unlock/hod-unlock/${selectedLock.lockId}`,
        {
          reason: unlockReason,
          notes: unlockNote
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        showAlert(
          `Successfully unlocked ${selectedLock.student.name} for ${selectedLock.quiz.title}`,
          'success'
        );
        setUnlockDialogOpen(false);
        await fetchData(); // Refresh the current requests list
        await fetchUnlockHistory(); // Refresh the unlock history
      } else {
        showAlert(response.data.message || 'Error unlocking student', 'error');
      }
    } catch (error) {
      console.error('Error unlocking student:', error);
      const message = error.response?.data?.message || 'Error unlocking student';
      showAlert(message, 'error');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert({ show: false, message: '', severity: 'info' })}>
          {alert.message}
        </Alert>
      )}
      
      <Card elevation={3}>
        <CardHeader
          avatar={<Business color="primary" sx={{ fontSize: 32 }} />}
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h5" fontWeight="bold">
                <Business sx={{ mr: 1, color: 'primary.main' }} />
                HOD Quiz Unlock Dashboard
              </Typography>
              <Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchData} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          }
          subheader="Manage HOD quiz unlock requests and view unlock history."
        />

        {/* Mandatory Filter Controls */}
        <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchIcon />
              Required Filters for HOD Access
              <Chip 
                size="small" 
                label={`${filters.courseId && filters.sectionId ? 'Complete' : 'Incomplete'}`} 
                color={filters.courseId && filters.sectionId ? 'success' : 'warning'} 
              />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              HOD users must select Course and Section to view data
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            {/* Course Filter - MANDATORY */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small" required>
                <InputLabel sx={{ color: !filters.courseId ? 'error.main' : undefined }}>
                  Course *
                </InputLabel>
                <Select
                  value={filters.courseId}
                  label="Course *"
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    courseId: e.target.value,
                    unitId: '', // Reset unit when course changes
                    sectionId: '' // Reset section when course changes
                  }))}
                  error={!filters.courseId}
                >
                  <MenuItem value="" disabled>
                    <em>Select Course</em>
                  </MenuItem>
                  {filterOptions.courses?.map(course => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.courseCode} - {course.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Section Filter - MANDATORY */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small" required>
                <InputLabel sx={{ color: !filters.sectionId ? 'error.main' : undefined }}>
                  Section *
                </InputLabel>
                <Select
                  value={filters.sectionId}
                  label="Section *"
                  onChange={(e) => setFilters(prev => ({ ...prev, sectionId: e.target.value }))}
                  disabled={!filters.courseId}
                  error={!filters.sectionId}
                >
                  <MenuItem value="" disabled>
                    <em>Select Section</em>
                  </MenuItem>
                  {filterOptions.sections
                    ?.filter(section => !filters.courseId || section.courseId === filters.courseId)
                    ?.map(section => (
                      <MenuItem key={section._id} value={section._id}>
                        {section.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Unit Filter - OPTIONAL */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Unit (Optional)</InputLabel>
                <Select
                  value={filters.unitId}
                  label="Unit (Optional)"
                  onChange={(e) => setFilters(prev => ({ ...prev, unitId: e.target.value }))}
                  disabled={!filters.courseId}
                >
                  <MenuItem value="">All Units</MenuItem>
                  {filterOptions.units
                    ?.filter(unit => !filters.courseId || unit.courseId === filters.courseId)
                    ?.map(unit => (
                      <MenuItem key={unit._id} value={unit._id}>
                        {unit.title}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab 
            label={
              <Badge badgeContent={items.length} color="primary" max={99}>
                Current Requests
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={unlockHistory.length} color="secondary" max={99}>
                Unlock History
              </Badge>
            } 
          />
        </Tabs>
        <Divider />
        <CardContent>
          {activeTab === 0 && (
            <>
              {!filters.courseId || !filters.sectionId ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Business sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select Course and Section to View Current Requests
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    HOD access requires both Course and Section selection for security and data filtering.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`Course: ${filters.courseId ? '✓' : '✗'}`} 
                      color={filters.courseId ? 'success' : 'default'} 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label={`Section: ${filters.sectionId ? '✓' : '✗'}`} 
                      color={filters.sectionId ? 'success' : 'default'} 
                    />
                  </Box>
                </Box>
              ) : loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>HOD Authority:</strong> These students have exhausted their teacher unlock limit (3 unlocks). 
                      As HOD, you can approve one unlock per student. After your unlock, future locks will require Dean authorization.
                    </Typography>
                  </Alert>

                  {/* Search */}
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      placeholder="Search by student name, registration number, course, or quiz..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                      }}
                      sx={{ maxWidth: 600 }}
                    />
                  </Box>

                  {/* Summary Cards */}
                  {filtered.length > 0 && (
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" color="warning.main" fontWeight="bold">
                            {filtered.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pending HOD Approvals
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" color="error.main" fontWeight="bold">
                            {filtered.filter(item => item.lockInfo?.teacherUnlockCount >= 3).length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Teacher Limit Exhausted
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" color="info.main" fontWeight="bold">
                            {Math.round(filtered.reduce((sum, item) => sum + (item.lockInfo?.lastFailureScore || 0), 0) / filtered.length || 0)}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Average Score
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.50' }}>
                          <TableCell><strong>Student</strong></TableCell>
                          <TableCell><strong>Course & Quiz</strong></TableCell>
                          <TableCell><strong>Lock Reason</strong></TableCell>
                          <TableCell><strong>Score</strong></TableCell>
                          <TableCell><strong>Teacher Unlocks</strong></TableCell>
                          <TableCell><strong>Lock Date</strong></TableCell>
                          <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.map((item) => (
                          <TableRow key={item.lockId} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {item.student.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.student.regno || 'N/A'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2">
                                  {item.course.title || item.course.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.course.courseCode || item.course.code}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2">
                                  {item.quiz.title}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getReasonText(item.lockInfo.reason)}
                                color="error"
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {item.lockInfo.lastFailureScore}% / {item.lockInfo.passingScore}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={(item.lockInfo.lastFailureScore / item.lockInfo.passingScore) * 100}
                                  color={item.lockInfo.lastFailureScore < item.lockInfo.passingScore ? 'error' : 'success'}
                                  sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" color="error.main" fontWeight="bold">
                                  {item.lockInfo.teacherUnlockCount}/3 Used
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Limit Exhausted
                                </Typography>
                                {item.lockInfo.hodUnlockCount > 0 && (
                                  <Typography variant="caption" color="warning.main" display="block">
                                    HOD: {item.lockInfo.hodUnlockCount}/3
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {format(new Date(item.lockInfo.lockTimestamp), 'MMM dd, HH:mm')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                <Tooltip title="Approve HOD Unlock">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="warning"
                                    startIcon={<LockOpen />}
                                    onClick={() => handleHODUnlock(item)}
                                  >
                                    Unlock
                                  </Button>
                                </Tooltip>
                                <Tooltip title="View History">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => { setHistoryItem(item); setHistoryOpen(true); }}
                                  >
                                    <HistoryIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No HOD unlock requests found for the selected filters.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </>
          )}

          {activeTab === 1 && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Department Unlock History
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  All quizzes unlocked by you and teachers in your department
                </Typography>
              </Box>

              {/* Additional History Filters */}
              <Paper sx={{ mb: 2, p: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Additional Search Options
                </Typography>
                <Grid container spacing={2}>
                  {/* Student Search */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Search Student"
                      placeholder="Name, Reg No, or Email"
                      value={filters.studentSearch}
                      onChange={(e) => setFilters(prev => ({ ...prev, studentSearch: e.target.value }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* Action Type Filter */}
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Action Type</InputLabel>
                      <Select
                        value={filters.actionType}
                        label="Action Type"
                        onChange={(e) => setFilters(prev => ({ ...prev, actionType: e.target.value }))}
                      >
                        <MenuItem value="">All Actions</MenuItem>
                        <MenuItem value="TEACHER_UNLOCK">Teacher Unlock</MenuItem>
                        <MenuItem value="HOD_UNLOCK">HOD Unlock</MenuItem>
                        <MenuItem value="ADMIN_OVERRIDE">Admin Override</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Clear History Filters */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="outlined"
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        studentSearch: '',
                        actionType: ''
                      }))}
                      disabled={!filters.studentSearch && !filters.actionType}
                      sx={{ height: '40px' }}
                    >
                      Clear History Filters
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
              
              {!filters.courseId || !filters.sectionId ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select Course and Section to View Unlock History
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use the mandatory filter controls above to select Course and Section first.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`Course: ${filters.courseId ? '✓' : '✗'}`} 
                      color={filters.courseId ? 'success' : 'default'} 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label={`Section: ${filters.sectionId ? '✓' : '✗'}`} 
                      color={filters.sectionId ? 'success' : 'default'} 
                    />
                  </Box>
                </Box>
              ) : historyLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : unlockHistory.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No unlock history found for the selected course{filters.unitId ? ' and unit' : ''}.
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Action Type</TableCell>
                          <TableCell>Student</TableCell>
                          <TableCell>Course</TableCell>
                          <TableCell>Quiz</TableCell>
                          <TableCell>Unlock Date</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell>Current Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unlockHistory.map((history, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <Box>
                                <Chip 
                                  size="small" 
                                  label={history.type === 'ADMIN_OVERRIDE' ? 'Admin Override' : 'HOD Unlock'} 
                                  color={history.type === 'ADMIN_OVERRIDE' ? 'secondary' : 'warning'}
                                  sx={{ mb: 0.5 }}
                                />
                                <Typography variant="body2" fontWeight={600}>
                                  {history.unlockedBy?.name || 'Unknown'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {history.unlockedBy?.role || history.type}
                                </Typography>
                                {history.type === 'ADMIN_OVERRIDE' && history.overrideLevel && (
                                  <Typography variant="caption" color="secondary.main" sx={{ display: 'block' }}>
                                    Override Level: {history.overrideLevel}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {history.student?.name || 'Unknown'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {history.student?.regno || '-'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {history.course?.name || '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({history.course?.code || '-'})
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {history.quiz?.title || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(history.unlockTimestamp).toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ maxWidth: 200 }}>
                                  {history.reason || '-'}
                                </Typography>
                                {history.type === 'ADMIN_OVERRIDE' && history.lockReason && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                    Original Lock: {history.lockReason}
                                  </Typography>
                                )}
                                {history.notes && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Notes: {history.notes}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={history.isCurrentlyLocked ? 'Locked Again' : 'Unlocked'} 
                                color={history.isCurrentlyLocked ? 'error' : 'success'}
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Pagination */}
                  {historyPagination && historyPagination.totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Page {historyPagination.currentPage} of {historyPagination.totalPages}
                        {historyPagination.total && (
                          <> • {historyPagination.total} total records</>
                        )}
                      </Typography>
                      <Pagination
                        count={historyPagination.totalPages}
                        page={historyPage}
                        onChange={(event, value) => {
                          setHistoryPage(value);
                          fetchUnlockHistory(value);
                        }}
                        color="primary"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* HOD Unlock Confirmation Dialog */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Business sx={{ mr: 1, color: 'warning.main' }} />
            HOD Authorization - Unlock Quiz
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLock ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>HOD Authority Required:</strong> This student has exhausted all teacher unlock attempts.
                  Your authorization will grant them access to retake the quiz. After this unlock, future locks will require Dean approval.
                </Typography>
              </Alert>

              <Typography variant="subtitle2" gutterBottom>
                {selectedLock.student?.name} • {selectedLock.course?.name} • {selectedLock.quiz?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reg No: {selectedLock.student?.regno || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Current Score: {selectedLock.lockInfo?.lastFailureScore}% (Required: {selectedLock.lockInfo?.passingScore}%)
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks Used: {selectedLock.lockInfo?.teacherUnlockCount}/3 (exhausted)
              </Typography>

              <TextField
                fullWidth
                label="Reason for Unlock"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                required
                multiline
                rows={3}
                placeholder="e.g., Student demonstrated understanding of concepts, technical issues during quiz, medical circumstances..."
                sx={{ mt: 2, mb: 2 }}
              />

              <TextField
                fullWidth
                label="Additional Notes (Optional)"
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                multiline
                rows={2}
                placeholder="Any additional context or conditions for this unlock..."
              />
            </Box>
          ) : (
            <Typography>No lock selected</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUnlockConfirm}
            variant="contained"
            color="warning"
            disabled={unlocking || !unlockReason.trim()}
            startIcon={unlocking ? <CircularProgress size={16} /> : <LockOpen />}
          >
            {unlocking ? 'Unlocking...' : 'Confirm HOD Unlock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <HistoryIcon sx={{ mr: 1 }} />
            Unlock History
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {historyItem ? (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {historyItem.student?.name} - {historyItem.quiz?.title}
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Teacher Unlock History</Typography>
                {historyItem.teacherUnlockHistory && historyItem.teacherUnlockHistory.length > 0 ? (
                  <Box>
                    {historyItem.teacherUnlockHistory.map((unlock, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2"><strong>Teacher:</strong> {unlock.teacherId?.name}</Typography>
                        <Typography variant="body2"><strong>Date:</strong> {format(new Date(unlock.unlockTimestamp), 'MMM dd, yyyy HH:mm')}</Typography>
                        <Typography variant="body2"><strong>Reason:</strong> {unlock.reason}</Typography>
                        {unlock.notes && <Typography variant="body2"><strong>Notes:</strong> {unlock.notes}</Typography>}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No teacher unlock history</Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Typography>No history selected</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HODQuizUnlockDashboard;