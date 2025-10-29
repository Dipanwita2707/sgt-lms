import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  VideoLibrary as VideoIcon,
  School as SchoolIcon,
  Business as DepartmentIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';

const HODVideoUnlockApproval = ({ token, user }) => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, request: null, action: null });
  const [hodComments, setHodComments] = useState('');
  const [unlockDuration, setUnlockDuration] = useState(72);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    console.log('🚀 HODVideoUnlockApproval component mounted, fetching departments...');
    fetchUserDepartments();
  }, []);

  useEffect(() => {
    console.log('🔄 Department/selection changed:', { departments: departments.length, selectedDepartment, loading });
    
    if (departments.length > 0) {
      console.log('✅ Departments found, fetching pending requests...');
      fetchPendingRequests();
    } else if (departments.length === 0 && !loading) {
      // If no departments found, still set loading to false to show UI
      setLoading(false);
      console.log('⚠️ No departments found for HOD user');
    }
  }, [departments, selectedDepartment]);

  const fetchUserDepartments = async () => {
    try {
      console.log('🏢 Fetching HOD departments for user:', user);
      
      // Use the user prop that's already passed in - it should have department info
      if (user) {
        let userDepartments = [];
        
        // Handle both single department (legacy) and multiple departments (new)
        if (user.departments && Array.isArray(user.departments)) {
          userDepartments = user.departments;
        } else if (user.department) {
          userDepartments = [user.department];
        }
        
        console.log('📋 User departments from props:', userDepartments);
        
        // If no departments in user object, try fetching from profile API
        if (userDepartments.length === 0) {
          console.log('🔄 No departments in user props, fetching from profile API...');
          const profileRes = await axios.get('/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const profileData = profileRes.data.user;
          if (profileData.departments && Array.isArray(profileData.departments)) {
            userDepartments = profileData.departments;
          } else if (profileData.department) {
            userDepartments = [profileData.department];
          }
        }
        
        console.log('✅ Final departments:', userDepartments);
        setDepartments(userDepartments);
        
        if (userDepartments.length === 1) {
          setSelectedDepartment(userDepartments[0]._id);
        }
      } else {
        console.log('⚠️ No user prop provided');
        setDepartments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching user departments:', error);
      showSnackbar('Failed to load departments', 'error');
      // Set empty departments to prevent infinite loading
      setDepartments([]);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedDepartment && selectedDepartment !== 'all') {
        params.append('departmentId', selectedDepartment);
      }
      
      const response = await axios.get(`/api/video-unlock/hod/pending?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📋 Fetched requests:', response.data);
      setRequests(response.data.requests || []);
      
      // Calculate stats
      const pending = response.data.requests?.filter(r => r.status === 'pending').length || 0;
      const approved = response.data.requests?.filter(r => r.status === 'approved').length || 0;
      const rejected = response.data.requests?.filter(r => r.status === 'rejected').length || 0;
      setStats({ pending, approved, rejected });
      
    } catch (error) {
      console.error('❌ Error fetching requests:', error);
      showSnackbar('Failed to load unlock requests', 'error');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async () => {
    try {
      const { request, action } = approvalDialog;
      const endpoint = action === 'approve' 
        ? `/api/video-unlock/request/${request._id}/approve`
        : `/api/video-unlock/request/${request._id}/reject`;
      
      const data = { hodComments };
      if (action === 'approve') {
        data.unlockDuration = unlockDuration;
      }
      
      await axios.patch(endpoint, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showSnackbar(
        `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 
        'success'
      );
      
      setApprovalDialog({ open: false, request: null, action: null });
      setHodComments('');
      setUnlockDuration(72);
      fetchPendingRequests();
      
    } catch (error) {
      console.error(`❌ Error ${approvalDialog.action}ing request:`, error);
      showSnackbar(
        error.response?.data?.message || `Failed to ${approvalDialog.action} request`, 
        'error'
      );
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const filteredRequests = requests.filter(request => {
    switch (tabValue) {
      case 0: return request.status === 'pending';
      case 1: return request.status === 'approved';
      case 2: return request.status === 'rejected';
      default: return true;
    }
  });

  if (loading && departments.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          Video Unlock Requests
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Review and approve video unlock requests from teachers in your department{departments.length > 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Department Selector for Multi-Department HODs */}
      {departments.length > 1 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DepartmentIcon color="primary" />
              <Typography variant="h6">Select Department</Typography>
            </Box>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="Department"
              >
                <MenuItem value="all">All My Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name} ({dept.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      )}

      {/* Department Info */}
      {departments.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Managing departments:</strong> {departments.map(d => d.name).join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#fff3e0', border: '1px solid #ffcc02' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#ff9800' }}>
                  <TimeIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.pending}
                  </Typography>
                  <Typography variant="body2">Pending Requests</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#e8f5e8', border: '1px solid #4caf50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#4caf50' }}>
                  <ApproveIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.approved}
                  </Typography>
                  <Typography variant="body2">Approved</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#ffebee', border: '1px solid #f44336' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#f44336' }}>
                  <RejectIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.rejected}
                  </Typography>
                  <Typography variant="body2">Rejected</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Pending (${stats.pending})`} />
          <Tab label={`Approved (${stats.approved})`} />
          <Tab label={`Rejected (${stats.rejected})`} />
        </Tabs>
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {tabValue === 0 ? 'Pending Requests' : tabValue === 1 ? 'Approved Requests' : 'Rejected Requests'}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchPendingRequests} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        
        <Divider />
        
        {/* Requests Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Teacher</TableCell>
                <TableCell>Video</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Status</TableCell>
                {tabValue === 0 && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={tabValue === 0 ? 10 : 9} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tabValue === 0 ? 10 : 9} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No {tabValue === 0 ? 'pending' : tabValue === 1 ? 'approved' : 'rejected'} requests found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {request.student?.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {request.student?.regNo}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {request.teacher?.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {request.teacher?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VideoIcon fontSize="small" />
                        <Box>
                          <Typography variant="body2">
                            {request.video?.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {request.unit?.title}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {request.course?.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {request.course?.courseCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={request.department?.name || 'N/A'}
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={request.priority}
                        color={getPriorityColor(request.priority)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {request.reason}
                      </Typography>
                      {request.teacherComments && (
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          Note: {request.teacherComments}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(request.requestedAt)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Duration: {request.unlockDuration}h
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={request.status}
                        color={getStatusColor(request.status)}
                      />
                      {request.reviewedAt && (
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          {formatDate(request.reviewedAt)}
                        </Typography>
                      )}
                    </TableCell>
                    {tabValue === 0 && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => setApprovalDialog({ open: true, request, action: 'approve' })}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() => setApprovalDialog({ open: true, request, action: 'reject' })}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Approval/Rejection Dialog */}
      <Dialog 
        open={approvalDialog.open} 
        onClose={() => setApprovalDialog({ open: false, request: null, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'} Video Unlock Request
        </DialogTitle>
        <DialogContent>
          {approvalDialog.request && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Student:</strong> {approvalDialog.request.student?.name} ({approvalDialog.request.student?.regNo})
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Video:</strong> {approvalDialog.request.video?.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Course:</strong> {approvalDialog.request.course?.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Reason:</strong> {approvalDialog.request.reason}
              </Typography>
            </Box>
          )}
          
          {approvalDialog.action === 'approve' && (
            <TextField
              fullWidth
              type="number"
              label="Unlock Duration (hours)"
              value={unlockDuration}
              onChange={(e) => setUnlockDuration(Number(e.target.value))}
              sx={{ mb: 2 }}
              helperText="How long should the video remain unlocked?"
            />
          )}
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="HOD Comments"
            value={hodComments}
            onChange={(e) => setHodComments(e.target.value)}
            placeholder={`Add your comments for ${approvalDialog.action}ing this request...`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog({ open: false, request: null, action: null })}>
            Cancel
          </Button>
          <Button 
            onClick={handleApproveReject}
            variant="contained"
            color={approvalDialog.action === 'approve' ? 'success' : 'error'}
          >
            {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HODVideoUnlockApproval;