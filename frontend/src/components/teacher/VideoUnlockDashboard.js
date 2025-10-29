import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Stack,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const VideoUnlockDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Form state for creating new request
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('medium');
  const [unlockDuration, setUnlockDuration] = useState(48);
  const [teacherComments, setTeacherComments] = useState('');
  
  // Data for dropdowns
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [videos, setVideos] = useState([]);

  // Fetch teacher's unlock requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/video-unlock/teacher/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching unlock requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch students in teacher's sections
  const fetchStudents = async () => {
    try {
      const response = await axios.get('/api/video-unlock/teacher/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  // Fetch courses for selected student
  const fetchCourses = async (studentId) => {
    if (!studentId) {
      setCourses([]);
      return;
    }
    try {
      const response = await axios.get(`/api/video-unlock/student/${studentId}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    }
  };

  // Fetch units for selected course
  const fetchUnits = async (courseId) => {
    if (!courseId) {
      setUnits([]);
      return;
    }
    try {
      const response = await axios.get(`/api/video-unlock/course/${courseId}/units`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnits(response.data.units || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      setUnits([]);
    }
  };

  // Fetch videos for selected unit
  const fetchVideos = async (unitId) => {
    if (!unitId) {
      setVideos([]);
      return;
    }
    try {
      const response = await axios.get(`/api/video-unlock/unit/${unitId}/videos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(response.data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
    }
  };

  // Create unlock request
  const handleCreateRequest = async () => {
    if (!selectedStudent || !selectedVideo || !reason.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitLoading(true);
      
      const requestData = {
        studentId: selectedStudent,
        videoId: selectedVideo,
        unitId: selectedUnit,
        courseId: selectedCourse,
        reason: reason.trim(),
        priority,
        unlockDuration: parseInt(unlockDuration),
        teacherComments: teacherComments.trim()
      };

      await axios.post('/api/video-unlock/request', requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form and close dialog
      setSelectedStudent('');
      setSelectedCourse('');
      setSelectedUnit('');
      setSelectedVideo('');
      setReason('');
      setPriority('medium');
      setUnlockDuration(48);
      setTeacherComments('');
      setCreateDialogOpen(false);
      
      // Refresh requests
      fetchRequests();
      
      alert('Unlock request submitted successfully!');
    } catch (error) {
      console.error('Error creating unlock request:', error);
      alert(error.response?.data?.message || 'Failed to create unlock request');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    
    const query = searchQuery.toLowerCase();
    return requests.filter(request =>
      request.student?.name?.toLowerCase().includes(query) ||
      request.student?.email?.toLowerCase().includes(query) ||
      request.student?.regNo?.toLowerCase().includes(query) ||
      request.course?.name?.toLowerCase().includes(query) ||
      request.unit?.title?.toLowerCase().includes(query) ||
      request.video?.title?.toLowerCase().includes(query) ||
      request.reason?.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  // Priority color mapping
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStudents();
  }, []);

  // Handle student selection change
  useEffect(() => {
    if (selectedStudent) {
      fetchCourses(selectedStudent);
      setSelectedCourse('');
      setSelectedUnit('');
      setSelectedVideo('');
    }
  }, [selectedStudent]);

  // Handle course selection change
  useEffect(() => {
    if (selectedCourse) {
      fetchUnits(selectedCourse);
      setSelectedUnit('');
      setSelectedVideo('');
    }
  }, [selectedCourse]);

  // Handle unit selection change
  useEffect(() => {
    if (selectedUnit) {
      fetchVideos(selectedUnit);
      setSelectedVideo('');
    }
  }, [selectedUnit]);

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader
          avatar={<Avatar sx={{ bgcolor: '#1976d2' }}><VideoLibraryIcon /></Avatar>}
          title="Video Unlock Requests"
          subheader="Request video unlocks for students with HOD approval"
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ mr: 1 }}
              >
                New Request
              </Button>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchRequests} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          {/* Search */}
          <TextField
            fullWidth
            placeholder="Search by student name, reg no, course, unit, video, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="warning.main">
                    {requests.filter(r => r.status === 'pending').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="success.main">
                    {requests.filter(r => r.status === 'approved').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="error.main">
                    {requests.filter(r => r.status === 'rejected').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary.main">
                    {requests.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Requests Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredRequests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                {searchQuery ? 'No requests match your search' : 'No unlock requests yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {!searchQuery && 'Click "New Request" to create your first video unlock request'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Video</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Requested</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {request.student?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.student?.regNo} • {request.student?.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {request.video?.title || 'Unknown Video'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Unit: {request.unit?.title || 'Unknown Unit'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {request.course?.name || 'Unknown Course'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={request.status}
                          color={getStatusColor(request.status)}
                          icon={
                            request.status === 'pending' ? <PendingActionsIcon /> :
                            request.status === 'approved' ? <CheckCircleIcon /> :
                            request.status === 'rejected' ? <CancelIcon /> : null
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={request.priority}
                          color={getPriorityColor(request.priority)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {request.unlockDurationHours}h
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={request.reason}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {request.reason}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Request Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create Video Unlock Request
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              {/* Student Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Student *</InputLabel>
                  <Select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    label="Student *"
                  >
                    {students.map((student) => (
                      <MenuItem key={student._id} value={student._id}>
                        {student.name} ({student.regNo})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Course Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!selectedStudent}>
                  <InputLabel>Course *</InputLabel>
                  <Select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    label="Course *"
                  >
                    {courses.map((course) => (
                      <MenuItem key={course._id} value={course._id}>
                        {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Unit Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!selectedCourse}>
                  <InputLabel>Unit *</InputLabel>
                  <Select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    label="Unit *"
                  >
                    {units.map((unit) => (
                      <MenuItem key={unit._id} value={unit._id}>
                        {unit.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Video Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!selectedUnit}>
                  <InputLabel>Video *</InputLabel>
                  <Select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    label="Video *"
                  >
                    {videos.map((video) => (
                      <MenuItem key={video._id} value={video._id}>
                        {video.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Priority */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    label="Priority"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Unlock Duration */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Unlock Duration (hours)"
                  type="number"
                  value={unlockDuration}
                  onChange={(e) => setUnlockDuration(e.target.value)}
                  inputProps={{ min: 1, max: 168 }}
                />
              </Grid>

              {/* Reason */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason *"
                  multiline
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this student needs video unlock access..."
                />
              </Grid>

              {/* Teacher Comments */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Comments"
                  multiline
                  rows={2}
                  value={teacherComments}
                  onChange={(e) => setTeacherComments(e.target.value)}
                  placeholder="Any additional information for the HOD..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateRequest}
            variant="contained"
            disabled={submitLoading || !selectedStudent || !selectedVideo || !reason.trim()}
          >
            {submitLoading ? <CircularProgress size={20} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoUnlockDashboard;