import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  Snackbar,
  Alert as MuiAlert
} from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const HODTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState(null);
  const [deptSections, setDeptSections] = useState([]);
  const [sectionCourses, setSectionCourses] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [actingTeacher, setActingTeacher] = useState(null);
  const [selectedSectionCourse, setSelectedSectionCourse] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      // Get HOD department from HOD dashboard (accessible to HOD)
      let departmentId = null;
      try {
        const dashRes = await axios.get(`/api/hod/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dashRes?.data?.department) {
          setDepartment(dashRes.data.department);
          departmentId = dashRes.data.department._id || dashRes.data.department.id;
        }
      } catch (e) {
        // If dashboard fails, continue; teachers list may still load
        console.warn('HOD dashboard fetch failed (continuing):', e.response?.data?.message || e.message);
      }
      // Preload department sections and section-courses if department known (non-fatal)
      if (departmentId) {
        try {
          const sectionsRes = await axios.get(`/api/hod/sections`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          setDeptSections(sectionsRes.data?.sections || []);
          
          // Load section-courses for assignment
          const sectionCoursesRes = await axios.get(`/api/hod/section-courses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSectionCourses(sectionCoursesRes.data?.sectionCourses || []);
        } catch (e) {
          console.warn('Preloading dept sections/courses failed (non-fatal):', e.response?.data?.message || e.message);
        }
      }
      // Use HOD endpoint for teachers (includes populated sections/courses)
      const response = await axios.get(`/api/hod/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to fetch teachers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openAssignDialog = (teacher) => {
    setActingTeacher(teacher);
    setSelectedSectionCourse(null);
    setAssignOpen(true);
  };

  const confirmAssignTeacher = async () => {
    if (!actingTeacher || !selectedSectionCourse) return;
    setBusy(true);
    try {
      await axios.post(`/api/hod/assign-teacher-to-section-course`, {
        sectionId: selectedSectionCourse.section._id,
        courseId: selectedSectionCourse.course._id,
        teacherId: actingTeacher._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnack({ open: true, severity: 'success', message: 'Teacher assigned to section course' });
      setAssignOpen(false);
      await fetchTeachers();
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e.response?.data?.message || 'Failed to assign teacher' });
    } finally {
      setBusy(false);
    }
  };

  const removeSectionCourse = async (teacherId, sectionId, courseId) => {
    try {
      if (!window.confirm('Remove this teacher from the section course?')) return;
      await axios.post(`/api/hod/remove-teacher-from-section-course`, {
        sectionId,
        courseId,
        teacherId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnack({ open: true, severity: 'success', message: 'Teacher removed from section course' });
      await fetchTeachers();
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e.response?.data?.message || 'Failed to remove teacher' });
    }
  };

  const openSectionDialog = (teacher) => {
    setActingTeacher(teacher);
    setSelectedSection(null);
    setSectionOpen(true);
  };

  const confirmChangeSection = async () => {
    if (!actingTeacher || !selectedSection) return;
    setBusy(true);
    try {
      await axios.patch(`/api/hod/teachers/${actingTeacher._id}/section`, { toSectionId: selectedSection._id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnack({ open: true, severity: 'success', message: 'Teacher section updated' });
      setSectionOpen(false);
      await fetchTeachers();
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e.response?.data?.message || 'Failed to change section' });
    } finally {
      setBusy(false);
    }
  };

  const getInitials = (firstName, lastName, fallbackName) => {
    if (firstName || lastName) return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    const name = fallbackName || '';
    const parts = String(name).trim().split(' ');
    return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
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
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
        Department Teachers
      </Typography>
      {department && (
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          {department.name} Department
        </Typography>
      )}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Faculty Members ({teachers.length})
          </Typography>
          {teachers.length === 0 ? (
            <Typography color="textSecondary">No teachers found in your department.</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Teacher</strong></TableCell>
                    <TableCell><strong>UID</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell><strong>Section-Course Assignments</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getInitials(teacher.firstName, teacher.lastName, teacher.name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {teacher.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={teacher.uid || teacher.teacherId || 'N/A'} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{teacher.phone || '—'}</Typography>
                        <Typography variant="caption" color="textSecondary">{teacher.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="column" spacing={1}>
                          {(teacher.sectionCourseAssignments || []).length === 0 ? (
                            <Typography variant="body2" color="textSecondary">No assignments</Typography>
                          ) : (
                            (teacher.sectionCourseAssignments || []).map(assignment => (
                              <Card key={`${assignment.sectionId}-${assignment.courseId}`} variant="outlined" sx={{ p: 1, minWidth: 200 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                                      {assignment.sectionName}
                                    </Typography>
                                    <Typography variant="body2">
                                      {assignment.courseCode} - {assignment.courseTitle}
                                    </Typography>
                                  </Box>
                                  <Button
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => removeSectionCourse(teacher._id, assignment.sectionId, assignment.courseId)}
                                    sx={{ minWidth: 'auto', p: 0.5 }}
                                  >
                                    ✕
                                  </Button>
                                </Box>
                              </Card>
                            ))
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" onClick={() => openAssignDialog(teacher)}>
                            Assign to Section Course
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => openSectionDialog(teacher)}>
                            Change Section
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

    {/* Assign Teacher to Section Course Dialog */}
    <Dialog open={assignOpen} onClose={() => !busy && setAssignOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Assign Teacher to Section Course</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {actingTeacher ? `Teacher: ${actingTeacher.name || actingTeacher.email}` : ''}
        </Typography>
        <Autocomplete
          options={sectionCourses}
          getOptionLabel={(opt) => `${opt.section?.name || 'Section'} - ${opt.course?.courseCode || ''} ${opt.course?.title || ''}`.trim()}
          onChange={(_, val) => setSelectedSectionCourse(val)}
          renderInput={(params) => <TextField {...params} label="Select Section Course" placeholder="Search section courses" />}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {option.section?.name || 'Unknown Section'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {option.course?.courseCode || ''} - {option.course?.title || ''}
                </Typography>
              </Box>
            </Box>
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAssignOpen(false)} disabled={busy}>Cancel</Button>
        <Button onClick={confirmAssignTeacher} disabled={!selectedSectionCourse || busy} variant="contained">
          Assign Teacher
        </Button>
      </DialogActions>
    </Dialog>

    {/* Change Section Dialog */}
    <Dialog open={sectionOpen} onClose={() => !busy && setSectionOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Change Section</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {actingTeacher ? `Teacher: ${actingTeacher.name || actingTeacher.email}` : ''}
        </Typography>
        <Autocomplete
          options={deptSections}
          getOptionLabel={(opt) => opt.name || ''}
          onChange={(_, val) => setSelectedSection(val)}
          renderInput={(params) => <TextField {...params} label="Select Section" placeholder="Search sections" />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSectionOpen(false)} disabled={busy}>Cancel</Button>
        <Button onClick={confirmChangeSection} disabled={!selectedSection || busy} variant="contained">Update</Button>
      </DialogActions>
    </Dialog>

    <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
      <MuiAlert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.severity} elevation={6} variant="filled">
        {snack.message}
      </MuiAlert>
    </Snackbar>
    </Box>
  );
};

export default HODTeachers;
