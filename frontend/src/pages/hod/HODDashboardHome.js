import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  Snackbar,
  Alert as MuiAlert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Group as GroupIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';
import { useUserRole } from '../../contexts/UserRoleContext';
import { useNavigate } from 'react-router-dom';

const HODDashboardHome = () => {
  const { activeRole, getRoleInfo } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    departments: [],
    school: null,
    teachers: 0,
    courses: 0,
    students: 0,
    sections: 0,
    pendingApprovals: 0
  });
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [courseCoordinators, setCourseCoordinators] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await axios.get('/api/hod/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(res.data || []);
    } catch (e) {
      setTeachers([]);
    }
  };
  const openAssignDialog = (course) => {
    setSelectedCourse(course);
    setSelectedTeacher(null);
    setAssignDialogOpen(true);
  };

  const handleAssignCC = async () => {
    if (!selectedCourse || !selectedTeacher) return;
    setBusy(true);
    try {
      await axios.post('/api/hod/courses/cc/assign', {
        courseId: selectedCourse._id,
        userId: selectedTeacher._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnack({ open: true, severity: 'success', message: 'Coordinator assigned/updated successfully' });
      setAssignDialogOpen(false);
      await fetchDashboardData();
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e.response?.data?.message || 'Failed to assign coordinator' });
    } finally {
      setBusy(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('� Making HOD dashboard API call directly...');
      
      // Fetch HOD dashboard data directly
      const dashboardRes = await axios.get('/api/hod/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ HOD Dashboard API Response:', dashboardRes.data);
      console.log('📊 Statistics received:', dashboardRes.data.statistics);
      
      // Extract department information from the response
      const department = dashboardRes.data.department;
      const userDepartments = department ? [department] : [];
      
      setStats({
        departments: userDepartments,
        school: department?.school,
        teachers: dashboardRes.data.statistics.teachers,
        courses: dashboardRes.data.statistics.courses,
        students: dashboardRes.data.statistics.students,
        sections: dashboardRes.data.statistics.sections,
        pendingApprovals: dashboardRes.data.statistics.pendingApprovals
      });
      setCourseCoordinators(dashboardRes.data.courseCoordinators || []);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, gradientColors, iconBgColor }) => (
    <Card sx={{ 
      borderRadius: '16px', 
      boxShadow: `0 8px 16px rgba(${iconBgColor}, 0.12)`,
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: `0 12px 20px rgba(${iconBgColor}, 0.2)`
      }
    }}>
      <CardContent sx={{ 
        p: 2.5,
        height: '100%',
        background: 'transparent'
      }}>
        <Box display="flex" alignItems="center">
          <Box 
            sx={{ 
              bgcolor: `rgba(${iconBgColor}, 0.8)`, 
              borderRadius: '12px', 
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 8px rgba(${iconBgColor}, 0.25)`,
              mr: 2
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 36, color: 'white' } })}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: `rgb(${iconBgColor})` }}>
              {value}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 500 }}>
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome back, {getRoleInfo(activeRole || 'hod').name} {currentUser.name}
        </Typography>
        
        {/* Multiple Departments Display */}
        {stats.departments && stats.departments.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
              Managing Department{stats.departments.length > 1 ? 's' : ''}:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {stats.departments.map((dept, index) => (
                <Box key={dept._id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" color="primary" sx={{ fontWeight: 500 }}>
                    {dept.name}
                  </Typography>
                  <Chip 
                    label={dept.code} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                  {index < stats.departments.length - 1 && (
                    <Typography variant="body2" color="textSecondary">•</Typography>
                  )}
                </Box>
              ))}
            </Box>
            {stats.school && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                School: {stats.school.name}
              </Typography>
            )}
          </Box>
        )}

        {/* Department Selector for Multi-Department HODs */}
        {stats.departments && stats.departments.length > 1 && (
          <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">Department View</Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Select Department</InputLabel>
                  <Select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    label="Select Department"
                  >
                    <MenuItem value="all">All Departments</MenuItem>
                    {stats.departments.map((dept) => (
                      <MenuItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {selectedDepartment === 'all' 
                  ? 'Showing aggregated data from all your departments' 
                  : `Showing data for ${stats.departments.find(d => d._id === selectedDepartment)?.name}`}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Teachers"
            value={stats.teachers}
            icon={<GroupIcon />}
            gradientColors={['#c8e6c9', '#e8f5e9']}
            iconBgColor="56, 142, 60"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Courses"
            value={stats.courses}
            icon={<BookIcon />}
            gradientColors={['#ffe082', '#fff8e1']}
            iconBgColor="237, 108, 2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Students"
            value={stats.students}
            icon={<GroupIcon />}
            gradientColors={['#bbdefb', '#e3f2fd']}
            iconBgColor="25, 118, 210"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Sections"
            value={stats.sections}
            icon={<AssignmentIcon />}
            gradientColors={['#e1bee7', '#f3e5f5']}
            iconBgColor="156, 39, 176"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            icon={<TrendingUpIcon />}
            gradientColors={['#ffcdd2', '#ffebee']}
            iconBgColor="211, 47, 47"
          />
        </Grid>
      </Grid>

      {/* Quick Actions & Department Info */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="outlined" fullWidth onClick={() => navigate('/hod/teachers')}>
                  Manage Teachers
                </Button>
                <Button variant="outlined" fullWidth onClick={() => navigate('/hod/courses')}>
                  View Courses
                </Button>
                <Button variant="outlined" fullWidth onClick={() => navigate('/hod/analytics')}>
                  Department Analytics
                </Button>
                <Button variant="contained" fullWidth onClick={() => navigate('/hod/announcements')} sx={{ bgcolor: '#1976d2' }}>
                  Create Announcement
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Department Information
              </Typography>
              {stats.departments && stats.departments.length > 0 ? (
                <Box>
                  {stats.departments.length === 1 ? (
                    // Single department view
                    <Box>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Department:</strong> {stats.departments[0].name}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Code:</strong> {stats.departments[0].code}
                      </Typography>
                      {stats.school && (
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>School:</strong> {stats.school.name}
                        </Typography>
                      )}
                      {stats.departments[0].description && (
                        <Typography variant="body2" color="textSecondary">
                          {stats.departments[0].description}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    // Multiple departments view
                    <Box>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Departments:</strong> {stats.departments.length} departments
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        {stats.departments.map((dept, index) => (
                          <Box key={dept._id} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              {index + 1}. {dept.name} ({dept.code})
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                      {stats.school && (
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <strong>School:</strong> {stats.school.name}
                        </Typography>
                      )}
                      <Chip 
                        label={`Multi-Department HOD`} 
                        color="secondary" 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography color="textSecondary">
                  No departments assigned to your account.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Course Coordinators Table */}
      <Box sx={{ mt: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Course Coordinators
            </Typography>
            {courseCoordinators.length === 0 ? (
              <Typography color="textSecondary">No course coordinators assigned yet.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Course</th>
                      <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Course Code</th>
                      <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Coordinator Name</th>
                      <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>UID</th>
                      <th style={{ padding: 8, border: '1px solid #eee', textAlign: 'left' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseCoordinators.map(course => {
                      const hasCC = course.coordinators && course.coordinators.length > 0;
                      return hasCC ? (
                        course.coordinators.map((cc, idx) => (
                          <tr key={course._id + '-' + cc._id}>
                            <td style={{ padding: 8, border: '1px solid #eee' }}>{course.title}</td>
                            <td style={{ padding: 8, border: '1px solid #eee' }}>{course.courseCode}</td>
                            <td style={{ padding: 8, border: '1px solid #eee' }}>{cc.name}</td>
                            <td style={{ padding: 8, border: '1px solid #eee' }}>{cc.email}</td>
                            <td style={{ padding: 8, border: '1px solid #eee' }}>{cc.uid || cc.teacherId}</td>
                            <td style={{ padding: 8, border: '1px solid #eee' }}>
                              <Button size="small" variant="outlined" onClick={() => openAssignDialog(course)}>
                                Update
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr key={course._id + '-none'}>
                          <td style={{ padding: 8, border: '1px solid #eee' }}>{course.title}</td>
                          <td style={{ padding: 8, border: '1px solid #eee' }}>{course.courseCode}</td>
                          <td style={{ padding: 8, border: '1px solid #eee' }} colSpan={3}><em>No coordinator assigned</em></td>
                          <td style={{ padding: 8, border: '1px solid #eee' }}>
                            <Button size="small" variant="contained" onClick={() => openAssignDialog(course)}>
                              Assign
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Assign/Update Coordinator Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => !busy && setAssignDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign/Update Course Coordinator</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedCourse ? `Course: ${selectedCourse.title} (${selectedCourse.courseCode})` : ''}
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
            ⚠️ Assigning a new CC will replace any existing coordinator for this course.
          </Typography>
          <Autocomplete
            options={teachers}
            getOptionLabel={(opt) => `${opt.name || ''} (${opt.uid || opt.teacherId || opt.email || ''})`}
            onChange={(_, val) => setSelectedTeacher(val)}
            renderInput={(params) => <TextField {...params} label="Select Teacher" placeholder="Search teachers" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleAssignCC} disabled={!selectedTeacher || busy} variant="contained">Assign</Button>
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

export default HODDashboardHome;
