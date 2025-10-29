import React, { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Alert, CircularProgress, TextField, MenuItem, Button, Paper, Table, TableHead, TableBody, TableRow, TableCell, Chip, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DeanSectionAnalytics = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [deptId, setDeptId] = useState('');
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [analytics, setAnalytics] = useState(null);

  const token = localStorage.getItem('token');

  // Load departments (reuse dean endpoint)
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/dean/departments', { headers: { Authorization: `Bearer ${token}` } });
        setDepartments(res.data?.departments || []);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load departments');
      }
    })();
  }, [token]);

  const loadCourses = async (dept) => {
    setCourses([]);
    setCourseId('');
    setSections([]);
    setSectionId('');
    setAnalytics(null);
    if (!dept) return;
    try {
      const res = await axios.get(`/api/dean/department/${dept}/courses`, { headers: { Authorization: `Bearer ${token}` } });
      setCourses(res.data?.courses || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load courses');
    }
  };

  const loadSections = async (course) => {
    setSections([]);
    setSectionId('');
    setAnalytics(null);
    if (!course) return;
    try {
      const res = await axios.get(`/api/dean/course/${course}/sections`, { headers: { Authorization: `Bearer ${token}` } });
      setSections(res.data?.sections || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load sections');
    }
  };

  const loadAnalytics = async (section) => {
    setAnalytics(null);
    if (!section) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/dean/section/${section}/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      setAnalytics(res.data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async () => {
    if (!sectionId) return;
    try {
      const res = await axios.get(`/api/dean/section/${sectionId}/analytics/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      const href = window.URL.createObjectURL(blob);
      link.href = href;
      const cd = res.headers['content-disposition'];
      let filename = 'section_analytics.csv';
      if (cd) {
        const m = /filename="?([^";]+)"?/i.exec(cd);
        if (m && m[1]) filename = m[1];
      }
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
    } catch (e) {
      alert('Failed to download CSV');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>Section Analytics</Typography>

      <Card sx={{ 
        mb: 3,
        background: '#ffffff',
        border: '1px solid #6497b1',
        boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
        }
      }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Department" size="small" value={deptId} onChange={(e) => { setDeptId(e.target.value); loadCourses(e.target.value); }}>
                {departments.map(d => (
                  <MenuItem key={d._id} value={d._id}>{d.name} ({d.code})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Course" size="small" value={courseId} disabled={!deptId} onChange={(e) => { setCourseId(e.target.value); loadSections(e.target.value); }}>
                {courses.map(c => (
                  <MenuItem key={c._id} value={c._id}>{c.title} ({c.courseCode || ''})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Section" size="small" value={sectionId} disabled={!courseId} onChange={(e) => { setSectionId(e.target.value); loadAnalytics(e.target.value); }}>
                {sections.map(s => (
                  <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {analytics && (
        <Card sx={{
          background: '#ffffff',
          border: '1px solid #6497b1',
          boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
          }
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {analytics.section?.name} {analytics.department ? `- ${analytics.department.name}` : ''}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Courses: {(analytics.courses || []).map(c => `${c.title} (${c.courseCode || ''})`).join(', ')}
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={downloadCsv}>Download CSV</Button>
            </Box>

            {(analytics.students || []).map(st => (
              <Paper key={st._id} sx={{ p: 2, mb: 2 }} variant="outlined">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{st.name}</Typography>
                    <Typography variant="caption" color="textSecondary">{st.regNo} • {st.email}</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                {(st.courses || []).map(course => (
                  <Box key={course.courseId} sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {course.courseTitle} ({course.courseCode})
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Department: {course.departmentName || '-'} • Total Watch Time: {Math.round((course.totalWatchTime||0)/60)} min • Avg Quiz: {course.averageQuiz!==null? `${Math.round(course.averageQuiz)}%` : 'N/A'}
                    </Typography>
                    <Table size="small" sx={{ mt: 1 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Unit</TableCell>
                          <TableCell align="right">Watch Time (min)</TableCell>
                          <TableCell align="right">Videos</TableCell>
                          <TableCell align="right">Quiz %</TableCell>
                          <TableCell align="center">Passed</TableCell>
                          <TableCell align="right">Attempts</TableCell>
                          <TableCell align="center">Blocked</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(course.units || []).map(u => (
                          <TableRow key={u.unitId}>
                            <TableCell>{u.unitTitle}</TableCell>
                            <TableCell align="right">{Math.round((u.watchTime||0)/60)}</TableCell>
                            <TableCell align="right">{u.videosCompleted}/{u.videosWatched}</TableCell>
                            <TableCell align="right">{u.quizPercentage!==null? Math.round(u.quizPercentage) : '-'}</TableCell>
                            <TableCell align="center">{u.quizPassed===null ? '-' : (<Chip size="small" label={u.quizPassed? 'Yes':'No'} color={u.quizPassed? 'success':'default'} />)}</TableCell>
                            <TableCell align="right">{typeof u.attemptsCount === 'number' ? u.attemptsCount : '-'}</TableCell>
                            <TableCell align="center">{u.blocked===null ? '-' : (<Chip size="small" label={u.blocked? 'Yes':'No'} color={u.blocked? 'warning':'default'} />)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ))}
              </Paper>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DeanSectionAnalytics;
