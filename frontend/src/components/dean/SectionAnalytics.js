import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
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
  IconButton,
  Collapse,
  LinearProgress,
  Button
} from '@mui/material';
import {
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';

const SectionAnalytics = () => {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionDetails, setSectionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/dean-section-analytics/sections`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Sections Response:', response.data);
      const sectionsData = response.data.sections || response.data || [];
      console.log('Sections Data:', sectionsData);
      setSections(Array.isArray(sectionsData) ? sectionsData : []);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError(err.response?.data?.message || 'Failed to fetch sections');
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionDetails = async (sectionId) => {
    try {
      setDetailsLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/dean-section-analytics/section/${sectionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Section Details Response:', response.data);
      setSectionDetails(response.data);
      setSelectedSection(sectionId);
    } catch (err) {
      console.error('Error fetching section details:', err);
      setError(err.response?.data?.message || 'Failed to fetch section details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSectionClick = (sectionId) => {
    if (selectedSection === sectionId) {
      setSelectedSection(null);
      setSectionDetails(null);
    } else {
      fetchSectionDetails(sectionId);
    }
  };

  const handleExpandStudent = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const getProgressColor = (color) => {
    switch (color) {
      case 'green':
        return 'success';
      case 'yellow':
        return 'warning';
      case 'red':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (unitMark) => {
    if (!unitMark.attempted) {
      return { text: 'Not Attempted', color: 'default' };
    } else if (unitMark.percentage >= 75) {
      return { text: 'Excellent', color: 'success' };
    } else if (unitMark.percentage >= 50) {
      return { text: 'Good', color: 'warning' };
    } else if (unitMark.percentage >= 33) {
      return { text: 'Needs Improvement', color: 'warning' };
    } else {
      return { text: 'Failed', color: 'error' };
    }
  };

  const exportToCSV = () => {
    if (!sectionDetails) return;

    // Prepare CSV data
    const rows = [];
    
    // Add section header
    rows.push(['Section Analytics Report']);
    rows.push(['Section Name', sectionDetails.section.sectionName]);
    rows.push(['Department', sectionDetails.section.department]);
    rows.push(['Total Students', sectionDetails.section.studentCount]);
    rows.push(['Total Courses', sectionDetails.section.courseCount]);
    rows.push([]);

    // Add courses info
    rows.push(['Courses in Section']);
    rows.push(['Course Code', 'Course Title', 'Teacher']);
    if (sectionDetails.courses && Array.isArray(sectionDetails.courses)) {
      sectionDetails.courses.forEach(course => {
        rows.push([course.courseCode, course.courseTitle, course.teacherName]);
      });
    }
    rows.push([]);

    // Add student performance data
    rows.push(['Student Performance Details']);
    
    if (sectionDetails.students && Array.isArray(sectionDetails.students)) {
      sectionDetails.students.forEach(student => {
      rows.push([]);
      rows.push(['Student Name', student.studentName]);
      rows.push(['Registration No', student.registrationNo]);
      rows.push(['Email', student.email]);
      rows.push([]);

      // Course-wise performance
      if (student.coursePerformance && Array.isArray(student.coursePerformance)) {
        student.coursePerformance.forEach(course => {
        rows.push(['Course', `${course.courseCode} - ${course.courseTitle}`]);
        rows.push(['Teacher', `${course.teacherName} (${course.teacherEmail})`]);
        rows.push(['Videos Watched', `${course.videosWatched}/${course.totalVideos}`]);
        rows.push(['Watch Time', course.watchTimeFormatted || '0s']);
        rows.push(['Progress', `${course.progress}%`]);
        rows.push(['Course Marks', `${course.courseMarks}%`]);
        rows.push([]);

        // Unit-wise marks
        rows.push(['Unit Title', 'Quiz Marks (%)', 'Status']);
        if (course.unitMarks && Array.isArray(course.unitMarks)) {
          course.unitMarks.forEach(unit => {
            const status = getStatusLabel(unit);
            rows.push([
              unit.unitTitle,
              unit.percentage ? unit.percentage.toFixed(2) : '0.00',
              status.text
            ]);
          });
        }
        rows.push([]);
      });
      }
    });
    }

    // Convert to CSV string
    const csvContent = rows.map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${sectionDetails.section.sectionName}_Analytics_Report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Section Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View detailed performance analytics for each section
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Section List */}
      <Grid container spacing={3}>
        {Array.isArray(sections) && sections.map((section) => (
          <Grid item xs={12} md={6} lg={4} key={section.sectionId}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s',
                border: selectedSection === section.sectionId ? '2px solid #1976d2' : '1px solid #e0e0e0',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
              onClick={() => handleSectionClick(section.sectionId)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SchoolIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{section.sectionName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {section.department}
                    </Typography>
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" mt={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Students</Typography>
                    <Typography variant="h6">{section.studentCount}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Courses</Typography>
                    <Typography variant="h6">{section.courseCount}</Typography>
                  </Box>
                </Box>

                {section.courses && Array.isArray(section.courses) && section.courses.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="caption" color="text.secondary">Courses:</Typography>
                    <Box mt={0.5}>
                      {section.courses.slice(0, 2).map((course) => (
                        <Chip
                          key={course.courseId}
                          label={course.courseCode}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                      {section.courses && section.courses.length > 2 && (
                        <Chip
                          label={`+${section.courses.length - 2} more`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Section Details */}
      {detailsLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {sectionDetails && !detailsLoading && (
        <Box mt={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">
                  {sectionDetails.section.sectionName} - Detailed Analytics
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={exportToCSV}
                  color="primary"
                >
                  Export to CSV
                </Button>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">Department</Typography>
                      <Typography variant="h6">{sectionDetails.section.department}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">Total Students</Typography>
                      <Typography variant="h6">{sectionDetails.section.studentCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary" variant="body2">Total Courses</Typography>
                      <Typography variant="h6">{sectionDetails.section.courseCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Courses Info */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Courses in this Section
              </Typography>
              <Grid container spacing={1} sx={{ mb: 3 }}>
                {sectionDetails.courses && Array.isArray(sectionDetails.courses) && sectionDetails.courses.map((course) => (
                  <Grid item xs={12} md={6} key={course.courseId}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1">
                          {course.courseCode} - {course.courseTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <PersonIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                          Teacher: {course.teacherName}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Student Performance Table */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Student Performance
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Student</strong></TableCell>
                      <TableCell align="center"><strong>Reg No</strong></TableCell>
                      <TableCell align="center"><strong>Courses</strong></TableCell>
                      <TableCell align="center"><strong>Details</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sectionDetails.students && Array.isArray(sectionDetails.students) && sectionDetails.students.map((student) => (
                      <React.Fragment key={student.studentId}>
                        <TableRow hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body1">{student.studentName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {student.email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={student.registrationNo} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="center">
                            {student.coursePerformance && student.coursePerformance.length ? student.coursePerformance.length : 0}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleExpandStudent(student.studentId)}
                            >
                              {expandedStudent === student.studentId ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Course Details */}
                        <TableRow>
                          <TableCell colSpan={4} sx={{ p: 0 }}>
                            <Collapse in={expandedStudent === student.studentId} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 3, backgroundColor: '#fafafa' }}>
                                {student.coursePerformance && Array.isArray(student.coursePerformance) && student.coursePerformance.map((course) => (
                                  <Card key={course.courseId} sx={{ mb: 2 }}>
                                    <CardContent>
                                      <Typography variant="h6" gutterBottom>
                                        {course.courseCode} - {course.courseTitle}
                                      </Typography>
                                      
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <PersonIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                        Teacher: {course.teacherName} ({course.teacherEmail})
                                      </Typography>

                                      {/* Course Stats */}
                                      <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
                                        <Grid item xs={6} md={3}>
                                          <Typography variant="caption" color="text.secondary">Videos Watched</Typography>
                                          <Typography variant="body1">
                                            {course.videosWatched}/{course.totalVideos}
                                          </Typography>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                          <Typography variant="caption" color="text.secondary">Watch Time</Typography>
                                          <Box>
                                            <Chip
                                              icon={<ScheduleIcon />}
                                              label={course.watchTimeFormatted || '0s'}
                                              size="small"
                                              color={course.watchTimeSeconds >= 3600 ? 'success' : course.watchTimeSeconds >= 1800 ? 'warning' : 'default'}
                                              variant="outlined"
                                            />
                                          </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                          <Typography variant="caption" color="text.secondary">Progress</Typography>
                                          <Box>
                                            <Chip
                                              label={`${course.progress || 0}%`}
                                              size="small"
                                              color={getProgressColor(course.progressColor)}
                                            />
                                          </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                          <Typography variant="caption" color="text.secondary">Course Marks</Typography>
                                          <Box>
                                            <Chip
                                              label={`${course.courseMarks || 0}%`}
                                              size="small"
                                              color={getProgressColor(course.marksColor)}
                                            />
                                          </Box>
                                        </Grid>
                                      </Grid>

                                      {/* Unit-wise Performance */}
                                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                        Unit-wise Performance
                                      </Typography>
                                      
                                      <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              <TableCell><strong>Unit</strong></TableCell>
                                              <TableCell align="center"><strong>Quiz Marks</strong></TableCell>
                                              <TableCell align="center"><strong>Status</strong></TableCell>
                                              {course.unitMarks && Array.isArray(course.unitMarks) && course.unitMarks.some(u => u.attempted) && (
                                                <TableCell align="center"><strong>Quizzes</strong></TableCell>
                                              )}
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {course.unitMarks && Array.isArray(course.unitMarks) && course.unitMarks.map((unit) => {
                                              const status = getStatusLabel(unit);
                                              return (
                                                <TableRow key={unit.unitId}>
                                                  <TableCell>{unit.unitTitle}</TableCell>
                                                  <TableCell align="center">
                                                    <Box sx={{ minWidth: 100 }}>
                                                      <Box display="flex" alignItems="center" justifyContent="center">
                                                        <Typography variant="body2" sx={{ mr: 1 }}>
                                                          {(unit.percentage || 0).toFixed(1)}%
                                                        </Typography>
                                                      </Box>
                                                      <LinearProgress
                                                        variant="determinate"
                                                        value={unit.percentage || 0}
                                                        color={unit.percentage >= 75 ? 'success' : unit.percentage >= 50 ? 'warning' : 'error'}
                                                        sx={{ mt: 0.5 }}
                                                      />
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell align="center">
                                                    <Chip
                                                      label={status.text}
                                                      size="small"
                                                      color={status.color}
                                                    />
                                                  </TableCell>
                                                  {course.unitMarks.some(u => u.attempted) && (
                                                    <TableCell align="center">
                                                      {unit.attempted ? `${unit.quizzesTaken}/${unit.totalQuizzes}` : '-'}
                                                    </TableCell>
                                                  )}
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    </CardContent>
                                  </Card>
                                ))}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default SectionAnalytics;
