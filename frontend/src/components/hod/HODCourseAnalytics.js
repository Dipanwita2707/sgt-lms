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
import { useLocation } from 'react-router-dom';

const HODCourseAnalytics = () => {
  const location = useLocation();
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
    
    // If courseId is passed from Department Analytics, select it
    if (location.state?.courseId) {
      setSelectedCourse(location.state.courseId);
    }
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchAnalytics();
    }
  }, [selectedCourse, selectedSection]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      // Get all courses in HOD's department
      const response = await axios.get(
        '/api/hod-analytics/department-analytics',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const coursesData = response.data.courses.map(course => ({
        id: course.courseId,
        _id: course.courseId,
        courseCode: course.courseCode,
        code: course.courseCode,
        courseTitle: course.courseTitle,
        title: course.courseTitle
      }));
      
      console.log('HOD Courses:', coursesData);
      setCourses(coursesData);
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

      const response = await axios.get(
        '/api/hod-analytics/course-analytics',
        {
          params,
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('HOD Analytics Response:', response.data);
      
      // Check if there's a message indicating no sections
      if (response.data.message) {
        setError(response.data.message);
      }
      
      // Log the structure to debug
      console.log('Students data:', response.data.students);
      if (response.data.students && response.data.students.length > 0) {
        console.log('First student sample:', response.data.students[0]);
      }
      
      setAnalyticsData(response.data.students || []);
      setCourseInfo(response.data.course);
      setUnits(response.data.units || []);
      
      // Extract unique sections for filtering
      const uniqueSections = [...new Set(
        (response.data.students || []).map(s => s.sectionId).filter(Boolean)
      )];
      setSections(uniqueSections);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (studentId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedRows(newExpanded);
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return '#4caf50'; // Green
    if (progress >= 50) return '#ff9800'; // Yellow
    return '#f44336'; // Red
  };

  const exportToCSV = () => {
    if (!analyticsData || analyticsData.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare CSV headers
    const headers = [
      'Student Name',
      'Registration No',
      'Email',
      'Section',
      'Watch Time',
      'Progress (%)',
      'Course Marks (%)'
    ];

    // Add unit-wise marks columns
    units.forEach(unit => {
      headers.push(`${unit.unitTitle} (%)`);
    });

    // Prepare CSV rows
    const rows = filteredData.map(student => {
      const row = [
        student.studentName || 'N/A',
        student.registrationNo || 'N/A',
        student.email || 'N/A',
        student.sectionName || 'N/A',
        student.watchTimeFormatted || '0s',
        (student.progress || 0).toFixed(2),
        (student.courseMarks || 0).toFixed(2)
      ];

      // Add unit marks
      units.forEach(unit => {
        const unitMark = student.unitMarks?.find(um => um.unitId === unit._id);
        row.push(unitMark && unitMark.percentage !== undefined ? unitMark.percentage.toFixed(2) : '0.00');
      });

      return row;
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const courseName = courseInfo?.courseTitle || 'Course';
    link.setAttribute('href', url);
    link.setAttribute('download', `${courseName}_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter data based on search query
  const filteredData = analyticsData.filter(student => {
    const searchLower = searchQuery.toLowerCase();
    return (
      student.studentName?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.registrationNo?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Course Analytics (HOD View)
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        View detailed analytics for all sections in your department
      </Typography>

      {error && (
        <Alert 
          severity={error.includes('not assigned') || error.includes('Please assign') ? 'warning' : 'error'} 
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Course Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Select Course</InputLabel>
              <Select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                label="Select Course"
              >
                {courses.map((course) => {
                  const courseId = course._id || course.id;
                  const courseCode = course.courseCode || course.code;
                  const courseTitle = course.courseTitle || course.title;
                  
                  return (
                    <MenuItem key={courseId} value={courseId}>
                      {courseCode} - {courseTitle}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Section Filter</InputLabel>
              <Select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                label="Section Filter"
                disabled={!selectedCourse}
              >
                <MenuItem value="all">All Sections</MenuItem>
                {sections.map((sectionId) => {
                  const sectionData = analyticsData.find(s => s.sectionId === sectionId);
                  return (
                    <MenuItem key={sectionId} value={sectionId}>
                      {sectionData?.sectionName || sectionId}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <TextField
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchAnalytics}
              disabled={!selectedCourse}
            >
              Refresh
            </Button>

            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={exportToCSV}
              disabled={!analyticsData || analyticsData.length === 0}
            >
              Export CSV
            </Button>
          </Box>

          {courseInfo && (
            <Box mt={2} display="flex" gap={2} flexWrap="wrap">
              <Chip
                icon={<School />}
                label={`${courseInfo.courseCode} - ${courseInfo.courseTitle}`}
                color="primary"
              />
              <Chip
                icon={<Assessment />}
                label={`${analyticsData.length} Students`}
                color="success"
              />
              <Chip
                icon={<TrendingUp />}
                label={`${units.length} Units`}
                color="info"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Analytics Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : filteredData.length === 0 ? (
        <Alert severity="info">
          {selectedCourse 
            ? 'No student data available for this course' 
            : 'Please select a course to view analytics'}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell><strong>Student Name</strong></TableCell>
                <TableCell><strong>Registration No</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Section</strong></TableCell>
                <TableCell align="center"><strong>Watch Time</strong></TableCell>
                <TableCell align="center"><strong>Progress</strong></TableCell>
                <TableCell align="center"><strong>Course Marks</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((student) => (
                <React.Fragment key={student.studentId}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRow(student.studentId)}
                      >
                        {expandedRows.has(student.studentId) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{student.studentName}</TableCell>
                    <TableCell>{student.registrationNo}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={student.sectionName || 'N/A'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {student.watchTimeFormatted || '0s'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${(student.progress || 0).toFixed(1)}%`}
                        size="small"
                        sx={{
                          backgroundColor: getProgressColor(student.progress || 0),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${(student.courseMarks || 0).toFixed(1)}%`}
                        size="small"
                        sx={{
                          backgroundColor: getProgressColor(student.courseMarks || 0),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row - Unit-wise Details */}
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 0 }}>
                      <Collapse in={expandedRows.has(student.studentId)} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            Unit-wise Performance
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Unit</strong></TableCell>
                                <TableCell align="center"><strong>Quiz Marks</strong></TableCell>
                                <TableCell align="center"><strong>Status</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {units.map((unit) => {
                                const unitMark = student.unitMarks?.find(um => um.unitId === unit._id);
                                const percentage = unitMark?.percentage || 0;
                                const attempted = unitMark?.attempted || false;
                                
                                return (
                                  <TableRow key={unit._id}>
                                    <TableCell>{unit.unitTitle}</TableCell>
                                    <TableCell align="center">
                                      {percentage.toFixed(1)}%
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        label={
                                          !attempted ? 'Not Attempted' :
                                          percentage >= 75 ? 'Excellent' :
                                          percentage >= 50 ? 'Good' :
                                          percentage >= 40 ? 'Needs Improvement' :
                                          'Failed'
                                        }
                                        size="small"
                                        sx={{
                                          backgroundColor: !attempted ? '#9e9e9e' : getProgressColor(percentage),
                                          color: 'white'
                                        }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default HODCourseAnalytics;
