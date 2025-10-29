import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Button,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';
import { styled } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

const Section = styled(Card)(({ theme }) => ({
  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
  borderRadius: 12,
}));

const HODCCManagement = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [courseCoordinators, setCourseCoordinators] = useState([]);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError('');
        setSuccess('');
        // Fetch HOD department teachers and courses
        const [teachersRes, coursesRes] = await Promise.all([
          axios.get('/api/hod/teachers', { headers: authHeaders }),
          axios.get('/api/hod/courses', { headers: authHeaders }),
        ]);

        setTeachers(teachersRes.data || []);
        // courses endpoint returns { department, courses }
        setCourses(coursesRes.data?.courses || []);
      } catch (e) {
        console.error('Failed to load HOD CC data', e);
        setError(e.response?.data?.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [authHeaders]);

  // Load current coordinators when course changes
  useEffect(() => {
    const loadCoordinators = async () => {
      if (!selectedCourse) {
        setCourseCoordinators([]);
        return;
      }
      try {
        const res = await axios.get(`/api/hod/courses/${selectedCourse._id}/coordinators`, {
          headers: authHeaders,
        });
        setCourseCoordinators(res.data || []);
      } catch (e) {
        console.warn('Could not fetch course coordinators', e);
        setCourseCoordinators([]);
      }
    };
    loadCoordinators();
  }, [selectedCourse, authHeaders]);

  const assignCoordinator = async () => {
    if (!selectedCourse || !selectedTeacher) {
      setError('Please select both a course and a teacher.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await axios.post(
        '/api/hod/courses/cc/assign',
        { courseId: selectedCourse._id, userId: selectedTeacher._id },
        { headers: authHeaders }
      );
      setSuccess('Coordinator assigned successfully.');
      // Refresh coordinators list
      const res = await axios.get(`/api/hod/courses/${selectedCourse._id}/coordinators`, {
        headers: authHeaders,
      });
      setCourseCoordinators(res.data || []);
    } catch (e) {
      console.error('Assign CC failed', e);
      setError(e.response?.data?.message || 'Failed to assign coordinator.');
    } finally {
      setSaving(false);
    }
  };

  const removeCoordinator = async (userId) => {
    if (!selectedCourse) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await axios.post(
        '/api/hod/courses/cc/remove',
        { courseId: selectedCourse._id, userId },
        { headers: authHeaders }
      );
      setSuccess('Coordinator removed successfully.');
      setCourseCoordinators((prev) => prev.filter((u) => u._id !== userId));
    } catch (e) {
      console.error('Remove CC failed', e);
      setError(e.response?.data?.message || 'Failed to remove coordinator.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser || currentUser.role !== 'hod') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Only HODs can access this page.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 'bold' }}>
        Course Coordinator Management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Assign or remove Course Coordinators (CC) for courses in your department. <strong>RULE: One course = One CC, One teacher = One course</strong>. Assigning will automatically replace existing coordinators.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Section>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Select Course and Teacher
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Stack spacing={2}>
                    <Autocomplete
                      options={courses}
                      value={selectedCourse}
                      onChange={(e, v) => setSelectedCourse(v)}
                      getOptionLabel={(o) => (o?.title ? `${o.title} ${o.courseCode ? `(${o.courseCode})` : ''}` : '')}
                      renderInput={(params) => <TextField {...params} label="Course" placeholder="Search course..." />}
                      isOptionEqualToValue={(o, v) => o._id === v._id}
                    />

                    <Autocomplete
                      options={teachers}
                      value={selectedTeacher}
                      onChange={(e, v) => setSelectedTeacher(v)}
                      getOptionLabel={(o) => (o?.name ? `${o.name} ${o.uid || o.teacherId ? `(${o.uid || o.teacherId})` : ''}` : o?.email || '')}
                      renderInput={(params) => <TextField {...params} label="Teacher" placeholder="Search teacher..." />}
                      isOptionEqualToValue={(o, v) => o._id === v._id}
                    />

                    <Box>
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={saving || !selectedCourse || !selectedTeacher}
                        onClick={assignCoordinator}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                      >
                        {saving ? 'Assigning...' : 'Assign as Coordinator'}
                      </Button>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Current Coordinators for Selected Course
                  </Typography>
                  {!selectedCourse ? (
                    <Typography variant="body2" color="text.secondary">
                      Select a course to view its current coordinators.
                    </Typography>
                  ) : courseCoordinators.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No coordinators assigned yet.
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {courseCoordinators.map((u) => (
                        <Chip
                          key={u._id}
                          label={`${u.name || u.email}`}
                          onDelete={() => removeCoordinator(u._id)}
                          color="secondary"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Stack>
                  )}
                </>
              )}
            </CardContent>
          </Section>
        </Grid>

        <Grid item xs={12} md={5}>
          <Section>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
                How it works
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                • <strong>One Course = One CC:</strong> Each course can have only ONE Course Coordinator.<br />
                • <strong>One Teacher = One Course:</strong> Each teacher can be CC for only ONE course at a time.<br />
                • Assigning a new CC to a course will automatically remove the previous CC from that course.<br />
                • Assigning a teacher to a new course will automatically remove them from their previous CC assignment.<br />
                • You can remove a coordinator using the chips shown for the selected course.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Quick tips
              </Typography>
              <Typography variant="body2" color="text.secondary">
                - Use search in the Course or Teacher fields to quickly find items.<br />
                - After assigning, refresh coordinators list updates automatically.
              </Typography>
            </CardContent>
          </Section>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HODCCManagement;
