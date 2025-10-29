import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Avatar,
  Button,
  Stack,
  alpha,
  Container,
  Fade
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Class as ClassIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterIcon,
  Assessment as AssessmentIcon,
  VideoLibrary as VideoIcon,
  Quiz as QuizIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import axios from 'axios';
import QuizConfigurationDialog from '../../components/common/QuizConfigurationDialog';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#0288d1', '#689f38'];

const DeanCourseAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [courseData, setCourseData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [quizConfigDialogOpen, setQuizConfigDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchCourses(selectedDepartment);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseAnalytics(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/dean/departments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDepartments(response.data.departments || []);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch departments');
      setLoading(false);
    }
  };

  const fetchCourses = async (deptId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/dean/courses/${deptId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourses(response.data.courses || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch courses');
    }
  };

  const fetchCourseAnalytics = async (courseId) => {
    try {
      setAnalyticsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/dean/course-analytics/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourseData(response.data);
      setAnalyticsLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics');
      setAnalyticsLoading(false);
    }
  };

  const handleOpenQuizConfig = (unit) => {
    setSelectedUnit(unit);
    setQuizConfigDialogOpen(true);
  };

  const handleCloseQuizConfig = () => {
    setQuizConfigDialogOpen(false);
    setSelectedUnit(null);
  };

  const exportToCSV = () => {
    if (!courseData) return;

    const csvData = [];
    csvData.push(['Course Analytics Report']);
    csvData.push([]);
    csvData.push(['Course', courseData.course?.title]);
    csvData.push(['Code', courseData.course?.courseCode]);
    csvData.push([]);
    csvData.push(['Student Name', 'Section', 'Video Progress %', 'Quiz Progress %', 'Overall Progress %', 'Performance']);
    
    const studentsToExport = selectedSection === 'all' 
      ? courseData.students 
      : courseData.students.filter(s => s.sectionName === selectedSection);

    studentsToExport?.forEach(student => {
      csvData.push([
        student.name,
        student.sectionName,
        Math.round(student.videoProgress),
        Math.round(student.quizProgress),
        Math.round(student.overallProgress),
        student.performance
      ]);
    });

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getPerformanceColor = (performance) => {
    switch (performance) {
      case 'Excellent': return '#2e7d32';
      case 'Good': return '#1976d2';
      case 'Average': return '#ed6c02';
      case 'Poor': return '#d32f2f';
      default: return '#757575';
    }
  };

  const filteredStudents = courseData?.students?.filter(student => 
    selectedSection === 'all' || student.sectionName === selectedSection
  ) || [];

  const sections = courseData?.sections || [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1a237e' }}>
          📚 Course Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Detailed course performance with student progress tracking
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Selectors */}
      <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Select Department</InputLabel>
                <Select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSelectedCourse('');
                    setCourseData(null);
                  }}
                  label="Select Department"
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!selectedDepartment}>
                <InputLabel>Select Course</InputLabel>
                <Select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  label="Select Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.courseCode} - {course.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={!courseData}
                sx={{ height: 56 }}
              >
                Export Report
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {analyticsLoading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={60} />
        </Box>
      )}

      {courseData && !analyticsLoading && (
        <Fade in={true} timeout={800}>
          <Box>
            {/* Course Info */}
            <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', boxShadow: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="h5" fontWeight={700}>
                      {courseData.course?.title}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, mt: 1 }}>
                      {courseData.course?.courseCode}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, bgcolor: alpha('#fff', 0.2), color: 'white' }}>
                      <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                        Department
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {courseData.course?.departmentName}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: '#1976d2',
                  color: 'white',
                  boxShadow: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Students</Typography>
                        <Typography variant="h3" fontWeight={700} sx={{ mt: 1 }}>
                          {courseData.statistics?.totalStudents || 0}
                        </Typography>
                      </Box>
                      <PeopleIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: '#388e3c',
                  color: 'white',
                  boxShadow: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Sections</Typography>
                        <Typography variant="h3" fontWeight={700} sx={{ mt: 1 }}>
                          {courseData.statistics?.totalSections || 0}
                        </Typography>
                      </Box>
                      <SchoolIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: '#f57c00',
                  color: 'white',
                  boxShadow: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Teachers</Typography>
                        <Typography variant="h3" fontWeight={700} sx={{ mt: 1 }}>
                          {courseData.statistics?.totalTeachers || 0}
                        </Typography>
                      </Box>
                      <PersonIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: '#7b1fa2',
                  color: 'white',
                  boxShadow: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Avg Progress</Typography>
                        <Typography variant="h3" fontWeight={700} sx={{ mt: 1 }}>
                          {Math.round(courseData.statistics?.avgProgress || 0)}%
                        </Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Teachers List */}
            {courseData.teachers && courseData.teachers.length > 0 && (
              <Card sx={{ mb: 4, boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="primary" />
                    Teachers ({courseData.teachers.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {courseData.teachers.map((teacher, idx) => (
                      <Grid item xs={12} sm={6} md={4} key={teacher._id || idx}>
                        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { boxShadow: 3 }, transition: 'box-shadow 0.3s' }}>
                          <Avatar sx={{ bgcolor: COLORS[idx % COLORS.length], width: 50, height: 50 }}>
                            {teacher.name?.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight={600}>
                              {teacher.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              {teacher.email}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip 
                                label={teacher.sectionsCount > 1 
                                  ? `${teacher.sectionsCount} sections: ${teacher.sectionName}`
                                  : teacher.sectionName
                                } 
                                size="small" 
                                color="primary"
                                sx={{ maxWidth: '100%' }}
                              />
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Section Filter */}
            <Card sx={{ mb: 4, boxShadow: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Filter by Section</InputLabel>
                      <Select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        label="Filter by Section"
                      >
                        <MenuItem value="all">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FilterIcon />
                            All Sections
                          </Box>
                        </MenuItem>
                        {sections.map((section) => (
                          <MenuItem key={section} value={section}>
                            {section}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: alpha('#667eea', 0.1) }}>
                      <Typography variant="body2" color="text.secondary">
                        Showing <strong>{filteredStudents.length}</strong> of <strong>{courseData.students?.length || 0}</strong> students
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Students Table */}
            {filteredStudents.length > 0 && (
              <Card sx={{ boxShadow: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon color="primary" />
                    Student Progress ({filteredStudents.length})
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha('#667eea', 0.1) }}>
                          <TableCell><strong>Student</strong></TableCell>
                          <TableCell><strong>Section</strong></TableCell>
                          <TableCell><strong>Video Progress</strong></TableCell>
                          <TableCell><strong>Quiz Progress</strong></TableCell>
                          <TableCell align="center"><strong>Watched Hours</strong></TableCell>
                          <TableCell align="center"><strong>Overall</strong></TableCell>
                          <TableCell align="center"><strong>Performance</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredStudents.map((student, idx) => (
                          <TableRow key={student.studentId} hover sx={{ '&:nth-of-type(odd)': { bgcolor: alpha('#667eea', 0.02) } }}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: COLORS[idx % COLORS.length] }}>
                                  {student.name?.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography fontWeight={600}>{student.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {student.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={student.sectionName} size="small" color="info" />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ minWidth: 120 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={student.videoProgress || 0}
                                  sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                                />
                                <Typography variant="caption">
                                  {Math.round(student.videoProgress || 0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ minWidth: 120 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={student.quizProgress || 0}
                                  color="secondary"
                                  sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                                />
                                <Typography variant="caption">
                                  {Math.round(student.quizProgress || 0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                icon={<VideoIcon />}
                                label={`${student.watchedHours || 0} hrs`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${Math.round(student.overallProgress || 0)}%`}
                                color={student.overallProgress >= 75 ? 'success' : 
                                       student.overallProgress >= 60 ? 'primary' : 
                                       student.overallProgress >= 40 ? 'warning' : 'error'}
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={student.performance}
                                size="small"
                                sx={{ 
                                  bgcolor: getPerformanceColor(student.performance),
                                  color: 'white',
                                  fontWeight: 600
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Unit-wise Performance */}
            {courseData.units && courseData.units.length > 0 && (
              <Card sx={{ boxShadow: 2, mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssessmentIcon color="primary" />
                    Unit-wise Performance
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha('#388e3c', 0.08) }}>
                          <TableCell><strong>Unit Name</strong></TableCell>
                          <TableCell align="center"><strong>Videos</strong></TableCell>
                          <TableCell align="center"><strong>Quizzes</strong></TableCell>
                          <TableCell><strong>Avg Video Progress</strong></TableCell>
                          <TableCell><strong>Avg Quiz Marks</strong></TableCell>
                          <TableCell align="center"><strong>Overall Progress</strong></TableCell>
                          <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {courseData.units.map((unit) => (
                          <TableRow key={unit._id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' } }}>
                            <TableCell>
                              <Typography fontWeight={600}>{unit.name}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={unit.videoCount} size="small" color="primary" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={unit.quizCount} size="small" color="secondary" />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ minWidth: 120 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={unit.videoProgress || 0}
                                  sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                                />
                                <Typography variant="caption" fontWeight={500}>
                                  {Math.round(unit.videoProgress || 0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ minWidth: 120 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={unit.quizMarks || 0}
                                  color="success"
                                  sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                                />
                                <Typography variant="caption" fontWeight={500}>
                                  {Math.round(unit.quizMarks || 0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${Math.round(unit.avgProgress || 0)}%`}
                                color={unit.avgProgress >= 75 ? 'success' : 
                                       unit.avgProgress >= 60 ? 'primary' : 
                                       unit.avgProgress >= 40 ? 'warning' : 'error'}
                                sx={{ fontWeight: 600, minWidth: 70 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<SettingsIcon />}
                                onClick={() => handleOpenQuizConfig(unit)}
                              >
                                Quiz Settings
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Section-wise Performance */}
            {courseData.sectionPerformance && courseData.sectionPerformance.length > 0 && (
              <Card sx={{ boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon color="primary" />
                    Section-wise Performance Comparison
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha('#ed6c02', 0.08) }}>
                          <TableCell><strong>Section</strong></TableCell>
                          <TableCell align="center"><strong>Students</strong></TableCell>
                          <TableCell><strong>Avg Progress</strong></TableCell>
                          <TableCell><strong>Avg Marks</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {courseData.sectionPerformance.map((section, idx) => (
                          <TableRow key={idx} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(0, 0, 0, 0.02)' } }}>
                            <TableCell>
                              <Typography fontWeight={600}>{section.sectionName}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={section.studentCount} size="small" color="info" />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ minWidth: 120 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={section.avgProgress || 0}
                                  sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                                />
                                <Typography variant="caption" fontWeight={500}>
                                  {Math.round(section.avgProgress || 0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ minWidth: 120 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={section.avgMarks || 0}
                                  color="success"
                                  sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                                />
                                <Typography variant="caption" fontWeight={500}>
                                  {Math.round(section.avgMarks || 0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Box>
        </Fade>
      )}

      {!selectedCourse && !loading && (
        <Card sx={{ textAlign: 'center', py: 8, boxShadow: 3 }}>
          <CardContent>
            <ClassIcon sx={{ fontSize: 80, color: '#f093fb', mb: 2 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Select a Course
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Choose a department and course from the dropdowns above to view detailed analytics
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Quiz Configuration Dialog */}
      {selectedUnit && courseData && (
        <QuizConfigurationDialog
          open={quizConfigDialogOpen}
          onClose={handleCloseQuizConfig}
          courseId={selectedCourse}
          unitId={selectedUnit._id}
          unitTitle={selectedUnit.name}
          sections={courseData.sections || []}
          userRole="dean"
        />
      )}
    </Container>
  );
};

export default DeanCourseAnalytics;
