import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  CircularProgress,
  Alert,
  Button,
  Collapse,
  IconButton,
  Tooltip,
  TextField
} from '@mui/material';
import {
  BarChart,
  Download,
  ExpandMore,
  ExpandLess,
  FilterList,
  Refresh,
  School,
  TrendingUp,
  Assessment
} from '@mui/icons-material';
import axios from 'axios';

const TeacherCourseAnalytics = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [sections, setSections] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchAnalytics();
    }
  }, [selectedCourse, selectedSection]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/teacher/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Courses response:', response.data);
      
      // Normalize the course data to ensure we have 'id' field
      const coursesData = response.data.courses || response.data;
      const normalizedCourses = coursesData.map(course => ({
        ...course,
        id: course._id || course.id,
        code: course.courseCode || course.code
      }));
      
      console.log('Normalized courses:', normalizedCourses);
      setCourses(normalizedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedCourse) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const params = { courseId: selectedCourse };
      if (selectedSection && selectedSection !== 'all') {
        params.sectionId = selectedSection;
      }

      const response = await axios.get('/api/teacher-analytics/course-analytics', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Analytics response:', response.data);
      
      setAnalyticsData(response.data.analytics || []);
      setCourseInfo(response.data.course);
      setSections(response.data.sections || []);
      setUnits(response.data.units || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
    setSelectedSection('all');
    setAnalyticsData([]);
    setSections([]);
    setExpandedRows(new Set());
  };

  const handleSectionChange = (event) => {
    setSelectedSection(event.target.value);
  };

  const toggleRowExpand = (studentId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedRows(newExpanded);
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return '#4caf50'; // green
    if (progress >= 50) return '#ff9800'; // orange/yellow
    return '#f44336'; // red
  };

  const getProgressLabel = (progress) => {
    if (progress >= 75) return 'Excellent';
    if (progress >= 50) return 'Good';
    return 'Needs Improvement';
  };

  const getMarksColor = (marks) => {
    if (marks >= 75) return 'success';
    if (marks >= 50) return 'warning';
    return 'error';
  };

  // Export analytics data to CSV
  const handleExportCSV = () => {
    if (!analyticsData || analyticsData.length === 0) return;

    // Prepare CSV header
    const headers = [
      'Student Name',
      'Registration No',
      'Email',
      'Section',
      'Watch Time',
      'Videos Watched',
      'Total Videos',
      'Progress (%)',
      'Progress Status',
      'Course Marks (%)',
      'Quizzes Taken',
      'Total Quizzes'
    ];

    // Add unit-wise marks headers if units exist
    if (units && units.length > 0) {
      units.forEach(unit => {
        headers.push(`${unit.title} - Average Marks (%)`);
      });
    }

    // Prepare CSV rows
    const rows = filteredAnalytics.map(student => {
      const row = [
        student.studentName,
        student.registrationNo,
        student.email,
        student.sectionName,
        student.watchTimeFormatted,
        student.videosWatched,
        student.totalVideos,
        student.progress,
        getProgressLabel(student.progress),
        student.courseMarks,
        student.totalQuizzesTaken,
        student.totalQuizzes
      ];

      // Add unit-wise marks
      if (units && units.length > 0) {
        units.forEach(unit => {
          const unitId = unit.id || unit._id;
          const unitData = student.unitWiseMarks?.[unitId];
          row.push(unitData?.averageMarks || '0');
        });
      }

      return row;
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells containing commas or quotes
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${courseInfo.title}_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter analytics data based on search
  const filteredAnalytics = analyticsData.filter(student => 
    student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.registrationNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    totalStudents: filteredAnalytics.length,
    avgProgress: filteredAnalytics.length > 0 
      ? (filteredAnalytics.reduce((sum, s) => sum + s.progress, 0) / filteredAnalytics.length).toFixed(2)
      : 0,
    avgMarks: filteredAnalytics.length > 0
      ? (filteredAnalytics.reduce((sum, s) => sum + s.courseMarks, 0) / filteredAnalytics.length).toFixed(2)
      : 0,
    excellentProgress: filteredAnalytics.filter(s => s.progress >= 75).length,
    needsImprovement: filteredAnalytics.filter(s => s.progress < 50).length
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        p: 3,
        borderRadius: 2,
        color: 'white',
        mb: 3
      }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment />
          Course Analytics
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
          Track student performance, watch time, and quiz results
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Course and Section Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Select Course</InputLabel>
              <Select
                value={selectedCourse}
                onChange={handleCourseChange}
                label="Select Course"
              >
                <MenuItem value="">
                  <em>Select a course</em>
                </MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course.id || course._id} value={course.id || course._id}>
                    {course.title} ({course.code || course.courseCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {sections.length > 0 && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Section</InputLabel>
                <Select
                  value={selectedSection}
                  onChange={handleSectionChange}
                  label="Filter by Section"
                >
                  <MenuItem value="all">All Sections</MenuItem>
                  {sections.map((section) => (
                    <MenuItem key={section.id || section._id} value={section.id || section._id}>
                      {section.name} ({section.studentCount} students)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchAnalytics}
              disabled={!selectedCourse || loading}
            >
              Refresh
            </Button>

            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportCSV}
              disabled={!selectedCourse || analyticsData.length === 0}
            >
              Export CSV
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {courseInfo && analyticsData.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Total Students</Typography>
              <Typography variant="h4">{stats.totalStudents}</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Avg Progress</Typography>
              <Typography variant="h4" sx={{ color: getProgressColor(stats.avgProgress) }}>
                {stats.avgProgress}%
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Avg Course Marks</Typography>
              <Typography variant="h4" sx={{ color: getProgressColor(stats.avgMarks) }}>
                {stats.avgMarks}%
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Excellent Progress</Typography>
              <Typography variant="h4" color="success.main">{stats.excellentProgress}</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Needs Improvement</Typography>
              <Typography variant="h4" color="error.main">{stats.needsImprovement}</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : analyticsData.length > 0 ? (
        <>
          {/* Search Bar */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by name, registration number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Box>

          {/* Analytics Table */}
          <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}></TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Student Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Registration No</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Section</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Watch Time</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Progress</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Course Marks</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Quizzes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAnalytics.map((student) => (
                  <React.Fragment key={student.studentId}>
                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: '#f5f5f5' } }}>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpand(student.studentId)}
                        >
                          {expandedRows.has(student.studentId) ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {student.studentName}
                        </Typography>
                      </TableCell>
                      <TableCell>{student.registrationNo}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {student.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={student.sectionName} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={`${student.videosWatched}/${student.totalVideos} videos watched`}>
                          <Typography variant="body2">
                            {student.watchTimeFormatted}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Chip
                            label={`${student.progress}%`}
                            size="small"
                            sx={{
                              bgcolor: getProgressColor(student.progress),
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            {getProgressLabel(student.progress)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${student.courseMarks}%`}
                          color={getMarksColor(student.courseMarks)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {student.totalQuizzesTaken}/{student.totalQuizzes}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Row - Unit-wise Quiz Marks */}
                    <TableRow>
                      <TableCell colSpan={9} sx={{ p: 0 }}>
                        <Collapse in={expandedRows.has(student.studentId)} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, bgcolor: '#f9f9f9' }}>
                            <Typography variant="h6" gutterBottom>
                              Unit-wise Quiz Performance
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                              {Object.keys(student.unitWiseMarks).map((unitId) => {
                                const unitData = student.unitWiseMarks[unitId];
                                if (unitData.quizzesTaken === 0) return null;

                                return (
                                  <Card key={unitId} variant="outlined">
                                    <CardContent>
                                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        {unitData.unitName}
                                      </Typography>
                                      <Typography variant="h5" color="primary">
                                        {unitData.averageMarks}%
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {unitData.quizzesTaken} quiz(zes) taken
                                      </Typography>

                                      <Box sx={{ mt: 1 }}>
                                        {unitData.quizzes.map((quiz, idx) => (
                                          <Chip
                                            key={idx}
                                            label={`${quiz.percentage}%`}
                                            size="small"
                                            color={quiz.passed ? 'success' : 'error'}
                                            sx={{ mr: 0.5, mt: 0.5 }}
                                          />
                                        ))}
                                      </Box>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : selectedCourse ? (
        <Alert severity="info">
          No student data available for this course.
        </Alert>
      ) : (
        <Alert severity="info">
          Please select a course to view analytics.
        </Alert>
      )}
    </Box>
  );
};

export default TeacherCourseAnalytics;
