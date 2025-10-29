import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Stack,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  ListItemText,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LockResetIcon from '@mui/icons-material/LockReset';
import HistoryIcon from '@mui/icons-material/History';

import { format } from 'date-fns';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const QuizUnlockDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [unlockHistory, setUnlockHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = Current Requests, 1 = Unlock History
  const [query, setQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [unlockNote, setUnlockNote] = useState('');
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  
  // Pagination states
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({});
  
  // Filter states
  const [filters, setFilters] = useState({
    courseId: '',
    unitId: '',
    sectionId: '',
    studentSearch: '',
    actionType: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    courses: [],
    units: [],
    sections: []
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const fetchData = async () => {
    if (!token || !filters.courseId || !filters.unitId || !filters.sectionId) return;
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.courseId) params.append('courseId', filters.courseId);
      if (filters.unitId) params.append('unitId', filters.unitId);
      if (filters.sectionId) params.append('sectionId', filters.sectionId);
      
      const response = await axios.get(`/api/quiz-unlock/locked-students?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Transform data to match admin table format with proper unlock history
        const transformedData = response.data.data.map(lock => ({
          student: {
            _id: lock.student.id,
            name: lock.student.name,
            email: lock.student.email,
            regNo: lock.student.regno
          },
          course: {
            _id: lock.course.id,
            name: lock.course.name,
            code: lock.course.code
          },
          unit: {
            _id: lock.quiz.id,
            title: lock.quiz.title
          },
          type: 'attemptsExhausted',
          reason: getReasonText(lock.lockInfo.reason),
          violationCount: 0,
          attemptsTaken: lock.lockInfo.totalAttempts,
          attemptLimit: lock.lockInfo.maxAttempts || 3,
          lockedAt: lock.lockInfo.lockTimestamp,
          unlockHistory: lock.unlockHistory || {
            teacher: [],
            hod: [],
            dean: [],
            admin: []
          },
          lockId: lock.lockId,
          lockInfo: lock.lockInfo,
          canTeacherUnlock: lock.lockInfo.canTeacherUnlock,
          remainingTeacherUnlocks: lock.lockInfo.remainingTeacherUnlocks
        }));
        setItems(transformedData);
      } else {
        showAlert('Error fetching locked students', 'error');
      }
    } catch (err) {
      console.error('Failed to load locks:', err);
      showAlert('Error fetching locked students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnlockHistory = async (page = historyPage) => {
    if (!token || !filters.courseId || !filters.unitId || !filters.sectionId) return; // Only fetch if all required filters selected
    try {
      setHistoryLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      // Add filters
      if (filters.courseId) params.append('courseId', filters.courseId);
      if (filters.unitId) params.append('unitId', filters.unitId);
      if (filters.sectionId) params.append('sectionId', filters.sectionId);
      if (filters.studentSearch) params.append('studentSearch', filters.studentSearch);
      if (filters.actionType && filters.actionType !== 'all') params.append('actionType', filters.actionType);

      const response = await axios.get(`/api/quiz-unlock/teacher-unlock-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUnlockHistory(response.data.data || []);
        setHistoryPagination(response.data.pagination || {});
      } else {
        showAlert('Error fetching unlock history', 'error');
      }
    } catch (err) {
      console.error('Failed to load unlock history:', err);
      showAlert('Error fetching unlock history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    if (!token) {
      console.error('No token available for fetchFilterOptions');
      return;
    }
    try {
      console.log('Fetching filter options...');
      const response = await axios.get('/api/quiz-unlock/filter-options', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Filter options response:', response.data);

      if (response.data.success) {
        setFilterOptions(response.data.data);
        console.log('Filter options set:', response.data.data);
        
        if (response.data.data.courses.length === 0) {
          showAlert('No courses assigned to you. Please contact admin.', 'warning');
        }
      } else {
        console.error('Filter options request failed:', response.data.message);
        showAlert(response.data.message || 'Failed to load filter options', 'error');
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
      const message = err.response?.data?.message || 'Error loading filter options';
      showAlert(message, 'error');
    }
  };



  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
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

  useEffect(() => {
    // Only load initial filter options (courses), no data
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate filters when filterOptions are loaded
  useEffect(() => {
    if (filterOptions.courses && filterOptions.courses.length > 0) {
      // Check if current courseId exists in available courses
      const currentCourse = filterOptions.courses.find(course => course._id === filters.courseId);
      if (filters.courseId && !currentCourse) {
        console.log('🔄 Selected course not found in options, resetting filters');
        setFilters(prev => ({
          ...prev,
          courseId: '',
          unitId: '',
          sectionId: '',
          studentSearch: '',
          actionType: ''
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions.courses]);

  // Fetch data when all required filters are selected
  useEffect(() => {
    if (filters.courseId && filters.unitId && filters.sectionId) {
      if (activeTab === 0) {
        fetchData();
      } else if (activeTab === 1) {
        setHistoryPage(1);
        fetchUnlockHistory(1);
      }
    } else {
      // Clear data when filters not complete
      setItems([]);
      setUnlockHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.courseId, filters.unitId, filters.sectionId, activeTab]);

  // Fetch history when other filters change (but only if all required filters selected)
  useEffect(() => {
    if (activeTab === 1 && filters.courseId && filters.unitId && filters.sectionId) {
      setHistoryPage(1);
      fetchUnlockHistory(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.studentSearch, filters.actionType]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1 && unlockHistory.length === 0) {
      fetchUnlockHistory();
    }
  };

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(it =>
      (it.student?.name || '').toLowerCase().includes(q) ||
      (it.student?.regNo || '').toLowerCase().includes(q) ||
      (it.course?.name || '').toLowerCase().includes(q) ||
      (it.unit?.title || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleTeacherUnlock = async (item) => {
    const authLevel = item.lockInfo?.unlockAuthorizationLevel || 'TEACHER';
    const canTeacherAct = authLevel === 'TEACHER' && item.lockInfo?.canTeacherUnlock;
    
    if (!canTeacherAct) {
      if (authLevel === 'HOD') {
        showAlert('This request is at HOD level. HOD authorization required.', 'info');
      } else if (authLevel === 'DEAN') {
        showAlert('This request is at Dean level. Dean authorization required.', 'info');
      } else if (authLevel === 'ADMIN') {
        showAlert('This request requires Admin override. All unlock limits have been exceeded.', 'error');
      } else {
        showAlert('Teacher unlock limit exceeded. HOD authorization required.', 'warning');
      }
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
        `/api/quiz-unlock/teacher-unlock/${selectedLock.lockId}`,
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
          `Successfully unlocked ${selectedLock.student.name} for ${selectedLock.unit.title}`,
          'success'
        );
        setUnlockDialogOpen(false);
        await fetchData(); // Refresh the current requests list
        await fetchUnlockHistory(); // Refresh the unlock history
      } else {
        if (response.data.requiresHodUnlock) {
          showAlert('Teacher unlock limit exceeded. HOD authorization required.', 'warning');
        } else {
          showAlert(response.data.message || 'Error unlocking student', 'error');
        }
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
    <Box>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert({ show: false, message: '', severity: 'info' })}>
          {alert.message}
        </Alert>
      )}

      <Card elevation={2}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Quiz Unlock Requests - All Levels</Typography>
              <Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchData} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          }
          subheader="Manage quiz unlock requests and view unlock history. Teacher (3) → HOD (3) → Dean (3) → Admin (unlimited) unlock hierarchy."
        />
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
              {/* Filter Controls - Always Visible for Teachers */}
              <Paper sx={{ mb: 2, p: 2 }}>
                <Box 
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', mb: filtersExpanded ? 2 : 0 }} 
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                >
                  <SearchIcon />
                  <Typography variant="h6">Required Filters</Typography>
                  {Object.values(filters).some(v => v) && (
                    <Chip size="small" label="Active" color="primary" />
                  )}
                  <IconButton size="small" sx={{ ml: 'auto' }}>
                    <RefreshIcon sx={{ transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                  </IconButton>
                </Box>
                
                {filtersExpanded && (
                  <Grid container spacing={2}>
                    {/* Course Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small" required>
                        <InputLabel>Course *</InputLabel>
                        <Select
                          value={filters.courseId}
                          label="Course *"
                          onChange={(e) => setFilters(prev => ({ 
                            ...prev, 
                            courseId: e.target.value,
                            unitId: '',
                            sectionId: ''
                          }))}
                        >
                          <MenuItem value="">Select Course</MenuItem>
                          {filterOptions.courses?.map(course => (
                            <MenuItem key={course._id} value={course._id}>
                              {course.courseCode} - {course.title}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Unit Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small" required>
                        <InputLabel>Unit *</InputLabel>
                        <Select
                          value={filters.unitId}
                          label="Unit *"
                          onChange={(e) => setFilters(prev => ({ 
                            ...prev, 
                            unitId: e.target.value,
                            sectionId: ''
                          }))}
                          disabled={!filters.courseId}
                        >
                          <MenuItem value="">Select Unit</MenuItem>
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

                    {/* Section Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small" required>
                        <InputLabel>Section *</InputLabel>
                        <Select
                          value={filters.sectionId}
                          label="Section *"
                          onChange={(e) => setFilters(prev => ({ ...prev, sectionId: e.target.value }))}
                          disabled={!filters.courseId}
                        >
                          <MenuItem value="">Select Section</MenuItem>
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

                    {/* Student Search - Optional */}
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Search Student (Optional)"
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

                    {/* Clear Filters Button */}
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        onClick={() => setFilters({
                          courseId: '',
                          unitId: '',
                          sectionId: '',
                          studentSearch: '',
                          actionType: ''
                        })}
                        disabled={!Object.values(filters).some(v => v)}
                      >
                        Clear All Filters
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Paper>

              {!filters.courseId || !filters.unitId || !filters.sectionId ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select Course, Unit, and Section to View Unlock Requests
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teachers must select all three filters: Course, Unit, and Section to view unlock requests.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`Course: ${filters.courseId ? '✓' : '✗'}`} 
                      color={filters.courseId ? 'success' : 'default'} 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label={`Unit: ${filters.unitId ? '✓' : '✗'}`} 
                      color={filters.unitId ? 'success' : 'default'} 
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
              ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No unlock requests found for the selected filters.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
                    <TextField
                      size="small"
                      placeholder="Search by name, reg no within results"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        )
                      }}
                      sx={{ maxWidth: 420, width: '100%' }}
                    />
                    <Chip label={`Total: ${items.length}`} />
                  </Stack>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell>Student</TableCell>
                          <TableCell>Reg No</TableCell>
                          <TableCell>Course</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell>Unlock History</TableCell>
                          <TableCell>Current Level</TableCell>
                          <TableCell>Locked/Last Unlock</TableCell>
                          <TableCell align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.map((it, idx) => {
                          const authLevel = it.lockInfo?.unlockAuthorizationLevel || 'TEACHER';
                          const hasAdminOverride = it.unlockHistory?.admin?.some(a => a.overrideLevel === authLevel);
                          const canTeacherAct = authLevel === 'TEACHER' && it.lockInfo?.canTeacherUnlock && !hasAdminOverride;
                          
                          return (
                            <TableRow key={idx} hover>
                              <TableCell>
                                {authLevel === 'TEACHER' && (
                                  <Chip size="small" color="primary" label="Teacher Level" />
                                )}
                                {authLevel === 'HOD' && (
                                  <Chip size="small" color="warning" label="HOD Level" />
                                )}
                                {authLevel === 'DEAN' && (
                                  <Chip size="small" color="error" label="Dean Level" />
                                )}
                                {authLevel === 'ADMIN' && (
                                  <Chip size="small" color="secondary" label="Admin Required" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Avatar sx={{ width: 28, height: 28 }}>{(it.student?.name || '?').slice(0,1)}</Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>{it.student?.name || 'Unknown'}</Typography>
                                    <Typography variant="caption" color="text.secondary">{it.student?.email}</Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell>{it.student?.regNo || '-'}</TableCell>
                              <TableCell>
                                <Typography variant="body2">{it.course?.name || '-'}</Typography>
                                <Typography variant="caption" color="text.secondary">({it.course?.code})</Typography>
                              </TableCell>
                              <TableCell>{it.unit?.title || '-'}</TableCell>
                              <TableCell>
                                <Chip size="small" color="warning" variant="outlined" label={it.reason || '-'} />
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant="caption">
                                    Teacher: {it.lockInfo?.teacherUnlockCount || 0}/3
                                    {it.unlockHistory?.admin?.some(a => a.overrideLevel === 'TEACHER') && (
                                      <Chip size="small" variant="outlined" color="secondary" label="Admin Override" sx={{ ml: 0.5, fontSize: '0.6rem', height: '16px' }} />
                                    )}
                                  </Typography>
                                  <Typography variant="caption">
                                    HOD: {it.lockInfo?.hodUnlockCount || 0}/3
                                    {it.unlockHistory?.admin?.some(a => a.overrideLevel === 'HOD') && (
                                      <Chip size="small" variant="outlined" color="secondary" label="Admin Override" sx={{ ml: 0.5, fontSize: '0.6rem', height: '16px' }} />
                                    )}
                                  </Typography>
                                  <Typography variant="caption">
                                    Dean: {it.lockInfo?.deanUnlockCount || 0}/3
                                    {it.unlockHistory?.admin?.some(a => a.overrideLevel === 'DEAN') && (
                                      <Chip size="small" variant="outlined" color="secondary" label="Admin Override" sx={{ ml: 0.5, fontSize: '0.6rem', height: '16px' }} />
                                    )}  
                                  </Typography>
                                  {it.unlockHistory?.admin?.length > 0 && (
                                    <Typography variant="caption" color="secondary">
                                      Admin: {it.unlockHistory.admin.length} override(s)
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {authLevel === 'TEACHER' && 'Teacher Can Act'}
                                  {authLevel === 'HOD' && 'HOD Required'}
                                  {authLevel === 'DEAN' && 'Dean Required'}
                                  {authLevel === 'ADMIN' && 'Admin Override Required'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Level: {authLevel}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant="body2">{it.lockedAt ? new Date(it.lockedAt).toLocaleString() : '-'}</Typography>
                                  {it.lockInfo?.lastTeacherUnlock && (
                                    <Typography variant="caption" color="text.secondary">
                                      Last T unlock: {new Date(it.lockInfo.lastTeacherUnlock).toLocaleString()}
                                    </Typography>
                                  )}
                                  {it.lockInfo?.lastHodUnlock && (
                                    <Typography variant="caption" color="text.secondary">
                                      Last H unlock: {new Date(it.lockInfo.lastHodUnlock).toLocaleString()}
                                    </Typography>
                                  )}
                                  {it.lockInfo?.lastDeanUnlock && (
                                    <Typography variant="caption" color="text.secondary">
                                      Last D unlock: {new Date(it.lockInfo.lastDeanUnlock).toLocaleString()}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {canTeacherAct ? (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="primary"
                                      startIcon={<LockResetIcon />}
                                      onClick={() => handleTeacherUnlock(it)}
                                    >
                                      Unlock ({it.lockInfo?.remainingTeacherUnlocks || 0})
                                    </Button>
                                  ) : (
                                    <Chip 
                                      size="small" 
                                      label={
                                        hasAdminOverride ? 'Admin Overridden' :
                                        authLevel === 'HOD' ? 'At HOD Level' : 
                                        authLevel === 'DEAN' ? 'At Dean Level' : 
                                        authLevel === 'ADMIN' ? 'Admin Override Required' :
                                        'T-Limit Reached'
                                      }
                                      color={
                                        hasAdminOverride ? 'secondary' :
                                        authLevel === 'HOD' ? 'warning' : 
                                        authLevel === 'DEAN' ? 'error' : 
                                        authLevel === 'ADMIN' ? 'secondary' :
                                        'default'
                                      }
                                    />
                                  )}
                                  <IconButton 
                                    size="small"
                                    onClick={() => { setHistoryItem(it); setHistoryOpen(true); }}
                                  >
                                    <HistoryIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={10} align="center">
                              <Typography variant="body2" color="text.secondary">No unlock requests.</Typography>
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
                  Teacher Unlock History
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  All quizzes you have previously unlocked for students
                </Typography>
              </Box>

              {/* Required Filters for History */}
              <Paper sx={{ p: 3, mb: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SearchIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" color="primary.main">
                    Required Filters
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  {/* Course Filter */}
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Course *</InputLabel>
                      <Select
                        value={filters.courseId}
                        label="Course *"
                        onChange={(e) => {
                          const courseId = e.target.value;
                          setFilters(prev => ({
                            ...prev,
                            courseId,
                            unitId: '', // Reset dependent filters
                            sectionId: ''
                          }));
                        }}
                        disabled={false}
                      >
                        <MenuItem value="">
                          <em>Select Course</em>
                        </MenuItem>
                        {filterOptions?.courses?.map((course) => (
                          <MenuItem key={course._id} value={course._id}>
                            {course.courseCode} - {course.title}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Unit Filter */}
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Unit *</InputLabel>
                      <Select
                        value={filters.unitId}
                        label="Unit *"
                        onChange={(e) => {
                          const unitId = e.target.value;
                          setFilters(prev => ({
                            ...prev,
                            unitId,
                            sectionId: '' // Reset dependent filter
                          }));
                        }}
                        disabled={!filters.courseId}
                      >
                        <MenuItem value="">
                          <em>Select Unit</em>
                        </MenuItem>
                        {filterOptions?.units
                          ?.filter(unit => unit.courseId === filters.courseId)
                          ?.map((unit) => (
                            <MenuItem key={unit._id} value={unit._id}>
                              {unit.title}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Section Filter */}
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Section *</InputLabel>
                      <Select
                        value={filters.sectionId}
                        label="Section *"
                        onChange={(e) => {
                          setFilters(prev => ({
                            ...prev,
                            sectionId: e.target.value
                          }));
                        }}
                        disabled={!filters.unitId}
                      >
                        <MenuItem value="">
                          <em>Select Section</em>
                        </MenuItem>
                        {filterOptions?.sections
                          ?.filter(section => !filters.unitId || section.courseId === filters.courseId)
                          ?.map((section) => (
                            <MenuItem key={section._id} value={section._id}>
                              {section.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Filter Status Indicators */}
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    Filter Status:
                  </Typography>
                  <Chip 
                    label={`Course: ${filters.courseId ? '✓' : '✗'}`} 
                    color={filters.courseId ? 'success' : 'default'} 
                    size="small" 
                  />
                  <Chip 
                    label={`Unit: ${filters.unitId ? '✓' : '✗'}`} 
                    color={filters.unitId ? 'success' : 'default'} 
                    size="small" 
                  />
                  <Chip 
                    label={`Section: ${filters.sectionId ? '✓' : '✗'}`} 
                    color={filters.sectionId ? 'success' : 'default'} 
                    size="small" 
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Teachers must select all three filters: Course, Unit, and Section to view unlock history.
                </Typography>
              </Paper>

              {/* Additional History Filters */}
              <Paper sx={{ mb: 2, p: 2 }}>
                <Grid container spacing={2}>
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
                        <MenuItem value="ADMIN_OVERRIDE">Admin Override</MenuItem>
                        <MenuItem value="HOD_UNLOCK">HOD Unlock</MenuItem>
                        <MenuItem value="DEAN_UNLOCK">Dean Unlock</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

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
              
              {!filters.courseId || !filters.unitId || !filters.sectionId ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select Course, Unit, and Section to View Unlock History
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use the filter controls above to select all required filters: Course, Unit, and Section.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`Course: ${filters.courseId ? '✓' : '✗'}`} 
                      color={filters.courseId ? 'success' : 'default'} 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label={`Unit: ${filters.unitId ? '✓' : '✗'}`} 
                      color={filters.unitId ? 'success' : 'default'} 
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
                                  label={history.type === 'ADMIN_OVERRIDE' ? 'Admin Override' : 'Teacher Unlock'} 
                                  color={history.type === 'ADMIN_OVERRIDE' ? 'secondary' : 'primary'}
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

      {/* Unlock Confirmation Dialog */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Unlock Quiz for Student</DialogTitle>
        <DialogContent dividers>
          {selectedLock ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {selectedLock.student?.name} • {selectedLock.course?.name} • {selectedLock.unit?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reg No: {selectedLock.student?.regNo || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Current Attempts: {selectedLock.attemptsTaken}/{selectedLock.attemptLimit}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks Used: {(selectedLock.lockInfo?.teacherUnlockCount || 0)}/3
              </Typography>
              <Typography variant="body2" gutterBottom>
                Remaining Teacher Unlocks: {selectedLock.remainingTeacherUnlocks}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Alert severity="info" sx={{ mb: 2 }}>
                This will be unlock #{(selectedLock.lockInfo?.teacherUnlockCount || 0) + 1} of 3 allowed teacher unlocks.
                {(selectedLock.lockInfo?.teacherUnlockCount || 0) === 2 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Warning:</strong> This is the final teacher unlock. Further unlocks will require Dean authorization.
                  </Typography>
                )}
              </Alert>
              <TextField
                autoFocus
                margin="dense"
                label="Reason for Unlock *"
                fullWidth
                variant="outlined"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g., Technical issue during quiz, Student appeal approved"
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Additional Notes (Optional)"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                placeholder="Any additional context or instructions..."
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)} disabled={unlocking}>
            Close
          </Button>
          {selectedLock && (
            <Button 
              variant="contained" 
              onClick={handleUnlockConfirm}
              disabled={unlocking || !unlockReason.trim()}
              startIcon={unlocking ? <CircularProgress size={20} /> : <LockResetIcon />}
            >
              {unlocking ? 'Unlocking...' : 'Confirm Unlock'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Unlock History</DialogTitle>
        <DialogContent dividers>
          {historyItem ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {historyItem.student?.name} • {historyItem.course?.name} • {historyItem.unit?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Locked At: {historyItem.lockedAt ? new Date(historyItem.lockedAt).toLocaleString() : '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reason: {historyItem.reason || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks: {(historyItem.lockInfo?.teacherUnlockCount || 0)}/3
              </Typography>
              <Typography variant="body2" gutterBottom>
                HOD Unlocks: {(historyItem.lockInfo?.hodUnlockCount || 0)}/3
              </Typography>
              <Typography variant="body2" gutterBottom>
                Dean Unlocks: {(historyItem.lockInfo?.deanUnlockCount || 0)}/3
              </Typography>
              {historyItem.unlockHistory?.admin?.length > 0 && (
                <Typography variant="body2" gutterBottom color="secondary">
                  Admin Overrides: {historyItem.unlockHistory.admin.length}
                </Typography>
              )}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>Complete Unlock History</Typography>
              
              {/* Teacher Unlocks */}
              {historyItem.unlockHistory?.teacher?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="primary">Teacher Unlocks:</Typography>
                  <List dense>
                    {historyItem.unlockHistory.teacher.map((h, i) => (
                      <ListItem key={`teacher-${i}`}>
                        <ListItemText
                          primary={`${h.teacherId?.name || 'Teacher'} - ${new Date(h.unlockTimestamp).toLocaleString()}`}
                          secondary={h.reason || h.notes || ''}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {/* HOD Unlocks */}
              {historyItem.unlockHistory?.hod?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">HOD Unlocks:</Typography>
                  <List dense>
                    {historyItem.unlockHistory.hod.map((h, i) => (
                      <ListItem key={`hod-${i}`}>
                        <ListItemText
                          primary={`${h.hodId?.name || 'HOD'} - ${new Date(h.unlockTimestamp).toLocaleString()}`}
                          secondary={h.reason || h.notes || ''}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {/* Dean Unlocks */}
              {historyItem.unlockHistory?.dean?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="error.main">Dean Unlocks:</Typography>
                  <List dense>
                    {historyItem.unlockHistory.dean.map((h, i) => (
                      <ListItem key={`dean-${i}`}>
                        <ListItemText
                          primary={`${h.deanId?.name || 'Dean'} - ${new Date(h.unlockTimestamp).toLocaleString()}`}
                          secondary={h.reason || h.notes || ''}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {/* Admin Overrides */}
              {historyItem.unlockHistory?.admin?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" color="secondary.main">Admin Overrides:</Typography>
                  <List dense>
                    {historyItem.unlockHistory.admin.map((h, i) => (
                      <ListItem key={`admin-${i}`}>
                        <ListItemText
                          primary={`Admin Override (${h.overrideLevel} level) - ${new Date(h.unlockTimestamp).toLocaleString()}`}
                          secondary={`${h.reason || ''} ${h.notes ? `| ${h.notes}` : ''}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {(!historyItem.unlockHistory?.teacher?.length && 
                !historyItem.unlockHistory?.hod?.length && 
                !historyItem.unlockHistory?.dean?.length && 
                !historyItem.unlockHistory?.admin?.length) && (
                <Typography variant="body2" color="text.secondary">No unlock history available.</Typography>
              )}

            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizUnlockDashboard;