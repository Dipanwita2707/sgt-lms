import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  CircularProgress,
  Alert,
  Autocomplete,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Timer as TimerIcon,
  MenuBook as CourseIcon,
  ExpandMore,
  ExpandLess,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import axios from 'axios';

const StudentIndividualAnalytics = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [expandedCourses, setExpandedCourses] = useState(new Set());

  // Search for students
  const handleSearch = async (searchValue) => {
    if (!searchValue || searchValue.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        '/api/student-analytics/search',
        {
          params: { query: searchValue },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSearchResults(response.data.students || []);
    } catch (err) {
      console.error('Error searching students:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Fetch student analytics
  const fetchStudentAnalytics = async (search) => {
    if (!search) return;

    try {
      setLoading(true);
      setError('');
      setStudentData(null);

      const token = localStorage.getItem('token');
      const response = await axios.get(
        '/api/student-analytics/student',
        {
          params: { search },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Student Analytics Response:', response.data);
      setStudentData(response.data);
    } catch (err) {
      console.error('Error fetching student analytics:', err);
      setError(err.response?.data?.message || 'Failed to fetch student analytics');
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  const getProgressColor = (progress) => {
    const progressNum = parseFloat(progress);
    if (progressNum >= 75) return '#4caf50'; // Green
    if (progressNum >= 50) return '#ff9800'; // Yellow
    return '#f44336'; // Red
  };

  const handleStudentSelect = (student) => {
    if (student) {
      setSelectedStudent(student);
      fetchStudentAnalytics(student.regNo || student.email);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Student Individual Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Search and view comprehensive analytics for any student in your school
        </Typography>
      </Box>

      {/* Search Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Autocomplete
              freeSolo
              options={searchResults}
              getOptionLabel={(option) => 
                typeof option === 'string' ? option : `${option.name} (${option.regNo}) - ${option.email}`
              }
              onInputChange={(event, value) => {
                setSearchQuery(value);
                handleSearch(value);
              }}
              onChange={(event, value) => {
                if (value && typeof value !== 'string') {
                  handleStudentSelect(value);
                }
              }}
              loading={searching}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search by Name, Registration No, or Email"
                  placeholder="Enter at least 2 characters..."
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {searching ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar src={option.profilePicture} sx={{ width: 32, height: 32 }}>
                      {option.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="600">
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.regNo} • {option.email} • {option.department}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<SearchIcon />}
              onClick={() => fetchStudentAnalytics(searchQuery)}
              disabled={!searchQuery || searchQuery.length < 2}
              sx={{ height: 56 }}
            >
              Search Student
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Student Profile and Analytics */}
      {!loading && studentData && (
        <>
          {/* Student Profile Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3} display="flex" justifyContent="center" alignItems="center">
                  <Avatar
                    src={studentData.student.profilePicture}
                    sx={{ width: 120, height: 120, fontSize: '3rem' }}
                  >
                    {studentData.student.name.charAt(0)}
                  </Avatar>
                </Grid>
                <Grid item xs={12} md={9}>
                  <Typography variant="h5" gutterBottom fontWeight="600">
                    {studentData.student.name}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <BadgeIcon color="primary" fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          Reg No: <strong>{studentData.student.regNo}</strong>
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <EmailIcon color="primary" fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          Email: <strong>{studentData.student.email}</strong>
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <SchoolIcon color="primary" fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          School: <strong>{studentData.student.school?.name || 'N/A'}</strong>
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <PersonIcon color="primary" fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          Department: <strong>{studentData.student.department?.name || 'N/A'}</strong>
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Total Courses
                      </Typography>
                      <Typography variant="h4">
                        {studentData.statistics.totalCourses}
                      </Typography>
                    </Box>
                    <CourseIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Avg Progress
                      </Typography>
                      <Typography variant="h4">
                        {studentData.statistics.averageProgress}%
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Avg Marks
                      </Typography>
                      <Typography variant="h4">
                        {studentData.statistics.averageMarks}%
                      </Typography>
                    </Box>
                    <AssessmentIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Watch Time
                      </Typography>
                      <Typography variant="h4">
                        {studentData.statistics.totalWatchTimeFormatted || '0s'}
                      </Typography>
                    </Box>
                    <TimerIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Course-wise Analytics Table */}
          <Paper>
            <Box p={2}>
              <Typography variant="h6" gutterBottom>
                Course-wise Performance
              </Typography>
            </Box>
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell><strong>Course Code</strong></TableCell>
                    <TableCell><strong>Course Title</strong></TableCell>
                    <TableCell><strong>Section</strong></TableCell>
                    <TableCell align="center"><strong>Videos</strong></TableCell>
                    <TableCell align="center"><strong>Watch Time</strong></TableCell>
                    <TableCell><strong>Progress</strong></TableCell>
                    <TableCell><strong>Marks</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentData.courses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">
                          No courses enrolled yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentData.courses.map((course) => (
                      <React.Fragment key={course.courseId}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => toggleCourse(course.courseId)}
                            >
                              {expandedCourses.has(course.courseId) ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Chip label={course.courseCode} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{course.courseTitle}</TableCell>
                          <TableCell>
                            {course.sections && course.sections.length > 0 ? (
                              course.sections.map((section, idx) => (
                                <Chip 
                                  key={section.id}
                                  label={section.name} 
                                  size="small" 
                                  color="primary"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ))
                            ) : (
                              <Chip label="N/A" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {course.videosWatched}/{course.totalVideos}
                          </TableCell>
                          <TableCell align="center">
                            {course.watchTimeFormatted || '0s'}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ minWidth: 150 }}>
                              <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="600"
                                  sx={{ color: getProgressColor(course.overallProgress) }}
                                >
                                  {course.overallProgress}%
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={parseFloat(course.overallProgress)} 
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: '#e0e0e0',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: getProgressColor(course.overallProgress),
                                    borderRadius: 3,
                                  }
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${course.courseMarks}%`}
                              size="small"
                              sx={{
                                backgroundColor: getProgressColor(course.courseMarks),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                        </TableRow>

                        {/* Expanded Row - Unit-wise Details */}
                        <TableRow>
                          <TableCell colSpan={8} sx={{ py: 0 }}>
                            <Collapse in={expandedCourses.has(course.courseId)} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 2 }}>
                                <Typography variant="subtitle2" gutterBottom fontWeight="600">
                                  Unit-wise Performance
                                </Typography>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell><strong>Unit Title</strong></TableCell>
                                      <TableCell align="center"><strong>Quiz Marks</strong></TableCell>
                                      <TableCell align="center"><strong>Status</strong></TableCell>
                                      <TableCell align="center"><strong>Attempts</strong></TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {course.unitMarks.map((unit) => (
                                      <TableRow key={unit.unitId}>
                                        <TableCell>{unit.unitTitle}</TableCell>
                                        <TableCell align="center">
                                          {unit.percentage.toFixed(1)}%
                                        </TableCell>
                                        <TableCell align="center">
                                          <Chip
                                            label={
                                              unit.attempted
                                                ? unit.percentage >= 75 ? 'Excellent' :
                                                  unit.percentage >= 50 ? 'Good' :
                                                  'Needs Improvement'
                                                : 'Not Attempted'
                                            }
                                            size="small"
                                            sx={{
                                              backgroundColor: unit.attempted 
                                                ? getProgressColor(unit.percentage) 
                                                : '#9e9e9e',
                                              color: 'white'
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell align="center">
                                          {unit.attemptsCount || 0}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* No Data Message */}
      {!loading && !studentData && !error && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Search for a Student
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a student's name, registration number, or email to view their analytics
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default StudentIndividualAnalytics;
