import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  TextField,
  Pagination
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import SchoolIcon from '@mui/icons-material/School';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

const DeanSchoolManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [hodCandidates, setHodCandidates] = useState([]);
  const [expandedDept, setExpandedDept] = useState(null);
  const [coursesByDept, setCoursesByDept] = useState({});
  const [coursesLoading, setCoursesLoading] = useState({});
  const [relationsByCourse, setRelationsByCourse] = useState({});
  const [relationsLoading, setRelationsLoading] = useState({});
  const [savingHod, setSavingHod] = useState({});
  const [teacherDialog, setTeacherDialog] = useState({ open: false, loading: false, data: null });
  const [studentDialog, setStudentDialog] = useState({ open: false, loading: false, data: null });
  // Filters/Search
  const [deptFilter, setDeptFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [peopleFilter, setPeopleFilter] = useState('');
  // Pagination per course for students
  const [studentPages, setStudentPages] = useState({}); // { [courseId]: { page, totalPages, limit } }

  // Load initial options: departments + HOD candidates
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/dean/school-management/options');
        const depts = (res.data.departments || []).map(d => ({
          _id: d._id,
          name: d.name,
          code: d.code,
          hod: d.hod ? { _id: d.hod._id, name: d.hod.name, email: d.hod.email, uid: d.hod.teacherId } : null
        }));
        setDepartments(depts);
        setHodCandidates(res.data.hodCandidates || []);
        setError('');
      } catch (err) {
        console.error('Failed to load school management options', err);
        setError(err.response?.data?.message || 'Failed to load school management options');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExpandDept = (deptId) => (event, isExpanded) => {
    setExpandedDept(isExpanded ? deptId : null);
    if (isExpanded && !coursesByDept[deptId]) {
      loadDepartmentCourses(deptId);
    }
  };

  const loadDepartmentCourses = async (deptId) => {
    try {
      setCoursesLoading(prev => ({ ...prev, [deptId]: true }));
      const res = await axios.get(`/api/dean/department/${deptId}/courses`);
      setCoursesByDept(prev => ({ ...prev, [deptId]: res.data.courses || [] }));
    } catch (err) {
      console.error('Failed to load department courses', err);
      setError(err.response?.data?.message || 'Failed to load department courses');
    } finally {
      setCoursesLoading(prev => ({ ...prev, [deptId]: false }));
    }
  };

  const loadCourseRelations = async (courseId, page = 1, limit = 25) => {
    try {
      setRelationsLoading(prev => ({ ...prev, [courseId]: true }));
      const res = await axios.get(`/api/dean/course/${courseId}/relations`, { params: { page, limit } });
      setRelationsByCourse(prev => ({ ...prev, [courseId]: res.data }));
      const p = res.data.pagination || { page: 1, totalPages: 1, limit };
      setStudentPages(prev => ({ ...prev, [courseId]: p }));
    } catch (err) {
      console.error('Failed to load course relations', err);
      setError(err.response?.data?.message || 'Failed to load course relations');
    } finally {
      setRelationsLoading(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const updateDepartmentHod = async (deptId, hodId) => {
    try {
      setSavingHod(prev => ({ ...prev, [deptId]: true }));
      const res = await axios.put(`/api/dean/department/${deptId}/hod`, { hodId });
      // Update local departments list
      setDepartments(prev => prev.map(d => d._id === deptId ? {
        ...d,
        hod: res.data.department?.hod || null
      } : d));
    } catch (err) {
      console.error('Failed to set department HOD', err);
      setError(err.response?.data?.message || 'Failed to set department HOD');
    } finally {
      setSavingHod(prev => ({ ...prev, [deptId]: false }));
    }
  };

  const openTeacherDialog = async (teacherId) => {
    try {
      setTeacherDialog({ open: true, loading: true, data: null });
      const res = await axios.get(`/api/dean/teacher/${teacherId}/details`);
      setTeacherDialog({ open: true, loading: false, data: res.data });
    } catch (err) {
      console.error('Failed to load teacher details', err);
      setError(err.response?.data?.message || 'Failed to load teacher details');
      setTeacherDialog({ open: false, loading: false, data: null });
    }
  };

  const openStudentDialog = async (studentId) => {
    try {
      setStudentDialog({ open: true, loading: true, data: null });
      const res = await axios.get(`/api/dean/student/${studentId}/details`);
      setStudentDialog({ open: true, loading: false, data: res.data });
    } catch (err) {
      console.error('Failed to load student details', err);
      setError(err.response?.data?.message || 'Failed to load student details');
      setStudentDialog({ open: false, loading: false, data: null });
    }
  };

  const closeTeacherDialog = () => setTeacherDialog({ open: false, loading: false, data: null });
  const closeStudentDialog = () => setStudentDialog({ open: false, loading: false, data: null });

  const HODSelector = ({ dept }) => {
    const currentHodId = dept.hod?._id || '';
    const [value, setValue] = useState(currentHodId);
    useEffect(() => { setValue(currentHodId); }, [currentHodId]);
    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel id={`hod-select-${dept._id}`}>Assign HOD</InputLabel>
          <Select
            labelId={`hod-select-${dept._id}`}
            label="Assign HOD"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {hodCandidates.map(h => (
              <MenuItem key={h._id} value={h._id}>
                {h.name} ({h.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          disabled={savingHod[dept._id] || value === currentHodId}
          onClick={() => updateDepartmentHod(dept._id, value || null)}
        >
          {savingHod[dept._id] ? 'Saving...' : 'Save'}
        </Button>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon /> School Management
      </Typography>

      {/* Filters */}
      <Card variant="outlined" sx={{ 
        mb: 2,
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
              <TextField
                fullWidth
                size="small"
                label="Filter departments"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Filter courses"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Filter people (teachers/students)"
                value={peopleFilter}
                onChange={(e) => setPeopleFilter(e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          {departments
            .filter(d => !deptFilter || d.name.toLowerCase().includes(deptFilter.toLowerCase()) || (d.code || '').toLowerCase().includes(deptFilter.toLowerCase()))
            .map((dept) => (
            <Accordion key={dept._id} expanded={expandedDept === dept._id} onChange={handleExpandDept(dept._id)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{dept.name}</Typography>
                    <Typography variant="body2" color="textSecondary">Code: {dept.code}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SupervisorAccountIcon fontSize="small" />
                    <Typography variant="body2">
                      HOD: {dept.hod ? `${dept.hod.name} (${dept.hod.uid || dept.hod.email})` : 'Not assigned'}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Card variant="outlined" sx={{ 
                  mb: 2,
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
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Assign / Change HOD</Typography>
                    <HODSelector dept={dept} />
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ClassIcon />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Courses in {dept.name}</Typography>
                      <IconButton size="small" onClick={() => loadDepartmentCourses(dept._id)} title="Refresh courses">
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    {coursesLoading[dept._id] ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={22} />
                      </Box>
                    ) : (
                      <List dense>
                        {(coursesByDept[dept._id] || [])
                          .filter(c => !courseFilter || c.title.toLowerCase().includes(courseFilter.toLowerCase()) || (c.courseCode||'').toLowerCase().includes(courseFilter.toLowerCase()))
                          .map((course) => {
                          const rel = relationsByCourse[course._id];
                          const relLoad = relationsLoading[course._id];
                          return (
                            <Box key={course._id} sx={{ mb: 2 }}>
                              <ListItem
                                secondaryAction={
                                  <Button size="small" variant="outlined" onClick={() => loadCourseRelations(course._id)}>
                                    {relLoad ? 'Loading...' : 'View details'}
                                  </Button>
                                }
                              >
                                <ListItemText
                                  primary={`${course.title} (${course.courseCode || ''})`}
                                  secondary={rel ? `${(rel.teachers || []).length} teacher(s), ${(rel.students || []).length} student(s)` : ' '}
                                />
                              </ListItem>
                              {rel && (
                                <Box sx={{ pl: 2, pr: 2, pb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PeopleIcon fontSize="small" /> Teachers
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                    {(rel.teachers || [])
                                      .filter(t => !peopleFilter || (t.name||'').toLowerCase().includes(peopleFilter.toLowerCase()) || (t.teacherId||'').toLowerCase().includes(peopleFilter.toLowerCase()) || (t.email||'').toLowerCase().includes(peopleFilter.toLowerCase()))
                                      .map(t => (
                                        <Chip key={t._id} label={`${t.name} (${t.teacherId || t.email})`} onClick={() => openTeacherDialog(t._id)} clickable />
                                      ))}
                                    {(rel.teachers || []).length === 0 && (<Typography variant="body2" color="textSecondary">No teachers</Typography>)}
                                  </Box>
                                  <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PersonIcon fontSize="small" /> Students
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {(rel.students || [])
                                      .filter(s => !peopleFilter || (s.name||'').toLowerCase().includes(peopleFilter.toLowerCase()) || (s.regNo||'').toLowerCase().includes(peopleFilter.toLowerCase()) || (s.email||'').toLowerCase().includes(peopleFilter.toLowerCase()))
                                      .map(s => (
                                        <Chip key={s._id} label={`${s.name} (${s.regNo || s.email})`} onClick={() => openStudentDialog(s._id)} clickable variant="outlined" />
                                      ))}
                                    {(rel.students || []).length === 0 && (<Typography variant="body2" color="textSecondary">No students</Typography>)}
                                  </Box>
                                  {/* Pagination for students */}
                                  {studentPages[course._id] && studentPages[course._id].totalPages > 1 && (
                                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                      <Pagination
                                        size="small"
                                        count={studentPages[course._id].totalPages}
                                        page={studentPages[course._id].page}
                                        onChange={(e, p) => loadCourseRelations(course._id, p, studentPages[course._id].limit)}
                                      />
                                    </Box>
                                  )}
                                  <Divider sx={{ mt: 2 }} />
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                        {(coursesByDept[dept._id] || []).length === 0 && (
                          <Typography variant="body2" color="textSecondary" sx={{ pl: 2 }}>No courses</Typography>
                        )}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>
      </Grid>

      {/* Teacher Details Dialog */}
      <Dialog open={teacherDialog.open} onClose={closeTeacherDialog} fullWidth maxWidth="md">
        <DialogTitle>Teacher Details</DialogTitle>
        <DialogContent dividers>
          {teacherDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : teacherDialog.data ? (
            <Box>
              <Typography variant="h6">{teacherDialog.data.teacher?.name}</Typography>
              <Typography variant="body2" color="textSecondary">Email: {teacherDialog.data.teacher?.email}</Typography>
              <Typography variant="body2" color="textSecondary">Teacher ID: {teacherDialog.data.teacher?.teacherId}</Typography>
              {teacherDialog.data.teacher?.department && (
                <Typography variant="body2" color="textSecondary">Department: {teacherDialog.data.teacher.department.name} ({teacherDialog.data.teacher.department.code})</Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Courses</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(teacherDialog.data.courses || []).map(c => (
                  <Chip key={c._id} label={`${c.title} (${c.courseCode || ''})`} />
                ))}
                {(teacherDialog.data.courses || []).length === 0 && (<Typography variant="body2" color="textSecondary">No courses</Typography>)}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Assigned Sections</Typography>
              <List dense>
                {(teacherDialog.data.sections || []).map(s => (
                  <ListItem key={s._id}>
                    <ListItemText primary={s.name} secondary={(s.courses || []).map(c => c.title).join(', ')} />
                  </ListItem>
                ))}
                {(teacherDialog.data.sections || []).length === 0 && (<Typography variant="body2" color="textSecondary">No sections</Typography>)}
              </List>
            </Box>
          ) : (
            <Alert severity="warning">No data</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTeacherDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={studentDialog.open} onClose={closeStudentDialog} fullWidth maxWidth="md">
        <DialogTitle>Student Details</DialogTitle>
        <DialogContent dividers>
          {studentDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : studentDialog.data ? (
            <Box>
              <Typography variant="h6">{studentDialog.data.student?.name}</Typography>
              <Typography variant="body2" color="textSecondary">Email: {studentDialog.data.student?.email}</Typography>
              <Typography variant="body2" color="textSecondary">Reg No: {studentDialog.data.student?.regNo}</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Courses</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(studentDialog.data.courses || []).map(c => (
                  <Chip key={c._id} label={`${c.title} (${c.courseCode || ''})`} />
                ))}
                {(studentDialog.data.courses || []).length === 0 && (<Typography variant="body2" color="textSecondary">No courses</Typography>)}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Sections</Typography>
              <List dense>
                {(studentDialog.data.sections || []).map(s => (
                  <ListItem key={s._id}>
                    <ListItemText primary={s.name} secondary={(s.courses || []).map(c => c.title).join(', ')} />
                  </ListItem>
                ))}
                {(studentDialog.data.sections || []).length === 0 && (<Typography variant="body2" color="textSecondary">No sections</Typography>)}
              </List>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Course-wise Performance (Total Watch Time)</Typography>
              <List dense>
                {(studentDialog.data.coursePerformance || []).map(cp => (
                  <ListItem key={cp._id}>
                    <ListItemText primary={`${cp.title} (${cp.courseCode || ''})`} secondary={`Total watch time: ${cp.totalWatchTime} sec`} />
                  </ListItem>
                ))}
                {(studentDialog.data.coursePerformance || []).length === 0 && (<Typography variant="body2" color="textSecondary">No performance data</Typography>)}
              </List>
            </Box>
          ) : (
            <Alert severity="warning">No data</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStudentDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeanSchoolManagement;
