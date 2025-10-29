import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Button,
  Pagination,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Divider,
  Stack
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';


const HODAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Data states
  const [departmentAnalytics, setDepartmentAnalytics] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState([]);
  const [studentAnalytics, setStudentAnalytics] = useState({ students: [], pagination: {} });
  const [sectionAnalytics, setSectionAnalytics] = useState([]);
  // Course details dialog state
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseTeachers, setCourseTeachers] = useState([]);
  const [courseStudents, setCourseStudents] = useState([]);
  const [courseSections, setCourseSections] = useState([]);
  const [courseStudentsPage, setCourseStudentsPage] = useState(1);
  const [courseStudentsLimit, setCourseStudentsLimit] = useState(25);
  const [courseStudentsTotalPages, setCourseStudentsTotalPages] = useState(1);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseDialogTab, setCourseDialogTab] = useState(0); // 0: Teachers, 1: Students, 2: Sections
  
  // Student analytics filters
  const [studentPage, setStudentPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState({ field: 'name', order: 'asc' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAnalyticsData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 2) { // Student analytics tab
      fetchStudentAnalytics();
    }
  }, [studentPage, studentSearch, studentSort]);

  // When course dialog pagination changes, refetch students
  useEffect(() => {
    if (courseDialogOpen && selectedCourse && courseDialogTab === 1) {
      fetchCourseRelations(selectedCourse._id, courseStudentsPage, courseStudentsLimit, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseStudentsPage, courseStudentsLimit]);

  const fetchAnalyticsData = async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    
    try {
      const endpoints = [
        '/api/hod/analytics/department',
        '/api/hod/analytics/courses', 
        '/api/hod/analytics/sections'
      ];

      const [deptRes, courseRes, sectionRes] = await Promise.all(
        endpoints.map(endpoint => 
          axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
        )
      );

      setDepartmentAnalytics(deptRes.data);
      setCourseAnalytics(courseRes.data);
      setSectionAnalytics(sectionRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAnalytics = async () => {
    if (!token) return;
    
    try {
      console.log('Fetching student analytics with search:', studentSearch);
      const params = new URLSearchParams({
        page: studentPage,
        limit: 10,
        search: studentSearch,
        sortBy: studentSort.field,
        sortOrder: studentSort.order
      });

      console.log('Request params:', params.toString());
      const response = await axios.get(`/api/hod/analytics/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Student analytics response:', response.data);
      setStudentAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching student analytics:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleStudentSearch = () => {
    setStudentPage(1);
    fetchStudentAnalytics();
  };

  const openCourseDialog = async (course) => {
    setSelectedCourse(course);
    setCourseDialogOpen(true);
    setCourseDialogTab(0);
    setCourseStudentsPage(1);
    setCourseTeachers([]);
    setCourseStudents([]);
    setCourseSections([]);
    await fetchCourseRelations(course._id, 1, courseStudentsLimit, true);
    await fetchCourseSections(course._id);
  };

  const closeCourseDialog = () => {
    setCourseDialogOpen(false);
    setSelectedCourse(null);
  };

  const fetchCourseRelations = async (courseId, page = 1, limit = 25, initial = false) => {
    if (!token) return;
    try {
      if (initial) setCourseLoading(true);
      const params = new URLSearchParams({ page, limit });
      const res = await axios.get(`/api/hod/course/${courseId}/relations?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourseTeachers(res.data.teachers || []);
      setCourseStudents(res.data.students || []);
      setCourseStudentsTotalPages(res.data.pagination?.totalPages || 1);
    } catch (e) {
      console.error('Failed to fetch course relations:', e);
    } finally {
      if (initial) setCourseLoading(false);
    }
  };

  const fetchCourseSections = async (courseId) => {
    if (!token) return;
    try {
      const res = await axios.get(`/api/hod/course/${courseId}/sections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourseSections(res.data.sections || []);
    } catch (e) {
      console.error('Failed to fetch course sections:', e);
    }
  };

  const exportStudentsCsv = () => {
    // Export currently loaded page of students
    const headers = ['Name', 'Reg No', 'Email', 'Sections'];
    const rows = courseStudents.map(s => [
      s.name || '',
      s.regNo || '',
      s.email || '',
      (s.sections || []).join('; ')
    ]);
    const escapeCsv = (v) => {
      const val = v == null ? '' : String(v);
      if (val.includes('"') || val.includes(',') || val.includes('\n')) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    };
    const csv = [headers, ...rows].map(r => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCourse?.title || 'course'}-students-page-${courseStudentsPage}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatGradeDistribution = (gradeData) => {
    if (!gradeData || gradeData.length === 0) return [];
    
    const gradeLabels = {
      0: 'F (0-59%)',
      60: 'D (60-69%)', 
      70: 'C (70-79%)',
      80: 'B (80-89%)',
      90: 'A (90-100%)'
    };
    
    const colors = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3'];
    
    return gradeData.map((grade, index) => ({
      grade: gradeLabels[grade._id] || 'Other',
      count: grade.count,
      color: colors[index] || '#9e9e9e'
    }));
  };

  const formatEnrollmentTrend = (enrollmentData) => {
    if (!enrollmentData || enrollmentData.length === 0) return [];
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return enrollmentData.map(item => ({
      month: monthNames[item._id.month - 1],
      enrollments: item.count
    }));
  };

  const MetricCard = ({ title, value, subtitle, color, progress }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color: color, fontWeight: 'bold' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
        {progress !== undefined && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        )}
      </CardContent>
    </Card>
  );

  if (loading && !departmentAnalytics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Department Analytics - {departmentAnalytics?.department?.name}
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Department Overview" />
        <Tab label="Course Analytics" />
        <Tab label="Student Analytics" />
        <Tab label="Section Analytics" />
      </Tabs>

      {activeTab === 0 && departmentAnalytics && (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Students"
                value={departmentAnalytics.statistics.totalStudents}
                subtitle="Department enrollment"
                color="#1976d2"
                progress={Math.min((departmentAnalytics.statistics.totalStudents / 500) * 100, 100)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Faculty"
                value={departmentAnalytics.statistics.totalTeachers}
                subtitle="Active teachers"
                color="#2e7d32"
                progress={Math.min((departmentAnalytics.statistics.totalTeachers / 20) * 100, 100)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Courses"
                value={departmentAnalytics.statistics.totalCourses}
                subtitle="Active courses"
                color="#ed6c02"
                progress={Math.min((departmentAnalytics.statistics.totalCourses / 30) * 100, 100)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Avg Quiz Score"
                value={`${Math.round(departmentAnalytics.statistics.quizMetrics.avgScore || 0)}%`}
                subtitle="Department average"
                color="#9c27b0"
                progress={departmentAnalytics.statistics.quizMetrics.avgScore || 0}
              />
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            {/* Enrollment Trend */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Student Enrollment Trend (This Year)
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={formatEnrollmentTrend(departmentAnalytics.monthlyEnrollment)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="enrollments" stroke="#1976d2" name="New Students" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Grade Distribution */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Grade Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={formatGradeDistribution(departmentAnalytics.gradeDistribution)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ grade, count }) => `${grade}: ${count}`}
                      >
                        {formatGradeDistribution(departmentAnalytics.gradeDistribution).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Department Statistics */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Department Performance Metrics
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary">
                          {departmentAnalytics.statistics.videoMetrics.totalVideos}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Videos
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary">
                          {formatTime(departmentAnalytics.statistics.videoMetrics.totalWatchTime)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Watch Time
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary">
                          {Math.round(departmentAnalytics.statistics.passRate || 0)}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Quiz Pass Rate
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary">
                          {departmentAnalytics.statistics.quizMetrics.totalAttempts}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Quiz Attempts
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 1 && (
        // Course Analytics
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Course Performance Overview
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={courseAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgOverallProgress" fill="#1976d2" name="Avg Progress %" />
                    <Bar dataKey="avgQuizScore" fill="#2e7d32" name="Avg Quiz Score %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Course Details
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Course</strong></TableCell>
                        <TableCell><strong>Students</strong></TableCell>
                        <TableCell><strong>Videos</strong></TableCell>
                        <TableCell><strong>Watch Time</strong></TableCell>
                        <TableCell><strong>Quiz Score</strong></TableCell>
                        <TableCell><strong>Pass Rate</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {courseAnalytics.map((course, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {course.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {course.courseCode}
                            </Typography>
                          </TableCell>
                          <TableCell>{course.enrollmentCount}</TableCell>
                          <TableCell>{course.videoCount}</TableCell>
                          <TableCell>{formatTime(course.totalWatchTime)}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${Math.round(course.avgQuizScore || 0)}%`}
                              size="small"
                              color={course.avgQuizScore >= 80 ? "success" : course.avgQuizScore >= 70 ? "primary" : "warning"}
                            />
                          </TableCell>
                          <TableCell>{Math.round(course.quizPassRate || 0)}%</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={() => openCourseDialog(course)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        // Student Analytics
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                  <TextField
                    placeholder="Search students by name, email, or reg number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleStudentSearch();
                      }
                    }}
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                  <Button variant="contained" onClick={handleStudentSearch}>
                    Search
                  </Button>
                  {studentSearch && (
                    <Button 
                      variant="outlined" 
                      onClick={() => {
                        setStudentSearch('');
                        setStudentPage(1);
                        // Automatically fetch data when clearing search
                        setTimeout(() => fetchStudentAnalytics(), 100);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </Box>
                
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Student Performance ({studentAnalytics.pagination.totalCount} students)
                </Typography>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Student</strong></TableCell>
                        <TableCell><strong>Courses</strong></TableCell>
                        <TableCell><strong>Avg Progress</strong></TableCell>
                        <TableCell><strong>Quiz Score</strong></TableCell>
                        <TableCell><strong>Watch Time</strong></TableCell>
                        <TableCell><strong>Last Activity</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentAnalytics.students.map((student, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {student.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {student.regNo}
                            </Typography>
                          </TableCell>
                          <TableCell>{student.totalCourses}</TableCell>
                          <TableCell>
                            <LinearProgress
                              variant="determinate"
                              value={student.avgProgress || 0}
                              sx={{ mr: 1, minWidth: 60 }}
                            />
                            {Math.round(student.avgProgress || 0)}%
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${Math.round(student.avgQuizScore || 0)}%`}
                              size="small"
                              color={student.avgQuizScore >= 80 ? "success" : student.avgQuizScore >= 70 ? "primary" : "warning"}
                            />
                          </TableCell>
                          <TableCell>{formatTime(student.totalWatchTime)}</TableCell>
                          <TableCell>
                            {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {studentAnalytics.pagination.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={studentAnalytics.pagination.totalPages}
                      page={studentPage}
                      onChange={(e, page) => setStudentPage(page)}
                      color="primary"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        // Section Analytics
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Section Performance Overview
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sectionAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgProgress" fill="#1976d2" name="Avg Progress %" />
                    <Bar dataKey="avgQuizScore" fill="#2e7d32" name="Avg Quiz Score %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Section Details
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Section</strong></TableCell>
                        <TableCell><strong>Students</strong></TableCell>
                        <TableCell><strong>Active Students</strong></TableCell>
                        <TableCell><strong>Avg Progress</strong></TableCell>
                        <TableCell><strong>Quiz Score</strong></TableCell>
                        <TableCell><strong>Pass Rate</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sectionAnalytics.map((section, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {section.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{section.studentCount}</TableCell>
                          <TableCell>{section.activeStudents}</TableCell>
                          <TableCell>
                            <LinearProgress
                              variant="determinate"
                              value={section.avgProgress || 0}
                              sx={{ mr: 1, minWidth: 60 }}
                            />
                            {Math.round(section.avgProgress || 0)}%
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${Math.round(section.avgQuizScore || 0)}%`}
                              size="small"
                              color={section.avgQuizScore >= 80 ? "success" : section.avgQuizScore >= 70 ? "primary" : "warning"}
                            />
                          </TableCell>
                          <TableCell>{Math.round(section.quizPassRate || 0)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Course details dialog */}
      <Dialog open={!!courseDialogOpen} onClose={closeCourseDialog} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Course details</Typography>
            {selectedCourse && (
              <Typography variant="body2" color="textSecondary">
                {selectedCourse.title} ({selectedCourse.courseCode})
              </Typography>
            )}
          </Box>
          <IconButton onClick={closeCourseDialog} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Tabs value={courseDialogTab} onChange={(e,v)=>setCourseDialogTab(v)} sx={{ mb: 2 }}>
            <Tab label="Teachers" />
            <Tab label="Students" />
            <Tab label="Sections" />
          </Tabs>

          {courseLoading ? (
            <Box sx={{ display:'flex', justifyContent:'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {courseDialogTab === 0 && (
                <Box>
                  {courseTeachers.length === 0 ? (
                    <Typography color="textSecondary">No teachers found for this course.</Typography>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>UID</strong></TableCell>
                            <TableCell><strong>Email</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {courseTeachers.map(t => (
                            <TableRow key={t._id}>
                              <TableCell>{t.name}</TableCell>
                              <TableCell>{t.uid || t.teacherId || '—'}</TableCell>
                              <TableCell>{t.email}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {courseDialogTab === 1 && (
                <Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 1, justifyContent:'space-between', alignItems:'center' }}>
                    <Typography variant="subtitle1">Students (page {courseStudentsPage} of {courseStudentsTotalPages})</Typography>
                    <Button size="small" startIcon={<DownloadIcon />} onClick={exportStudentsCsv}>Download CSV (page)</Button>
                  </Stack>
                  {courseStudents.length === 0 ? (
                    <Typography color="textSecondary">No students found for this course.</Typography>
                  ) : (
                    <>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Name</strong></TableCell>
                              <TableCell><strong>Reg No</strong></TableCell>
                              <TableCell><strong>Email</strong></TableCell>
                              <TableCell><strong>Sections</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {courseStudents.map(s => (
                              <TableRow key={s._id}>
                                <TableCell>{s.name}</TableCell>
                                <TableCell>{s.regNo || '—'}</TableCell>
                                <TableCell>{s.email}</TableCell>
                                <TableCell>
                                  {(s.sections || []).length === 0 ? (
                                    <Typography variant="body2" color="textSecondary">—</Typography>
                                  ) : (
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                      {s.sections.map((sec, idx) => (
                                        <Chip key={idx} label={sec} size="small" />
                                      ))}
                                    </Stack>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {courseStudentsTotalPages > 1 && (
                        <Box sx={{ display:'flex', justifyContent:'center', mt: 2 }}>
                          <Pagination
                            count={courseStudentsTotalPages}
                            page={courseStudentsPage}
                            onChange={(e, p) => setCourseStudentsPage(p)}
                            color="primary"
                            size="small"
                          />
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              )}

              {courseDialogTab === 2 && (
                <Box>
                  {courseSections.length === 0 ? (
                    <Typography color="textSecondary">No sections mapped to this course.</Typography>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Section</strong></TableCell>
                            <TableCell><strong>Teacher</strong></TableCell>
                            <TableCell><strong>Students</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {courseSections.map(sec => (
                            <TableRow key={sec._id}>
                              <TableCell>{sec.name}</TableCell>
                              <TableCell>{sec.teacher ? `${sec.teacher.name} (${sec.teacher.uid || sec.teacher.teacherId || sec.teacher.email})` : '—'}</TableCell>
                              <TableCell>{sec.studentsCount || 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HODAnalytics;
