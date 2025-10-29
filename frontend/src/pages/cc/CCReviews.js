import React, { useEffect, useState } from 'react';
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
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import axios from 'axios';

const CCReviews = () => {
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [flagDialog, setFlagDialog] = useState({ open: false, reviewId: null, note: '' });

  useEffect(() => {
    fetchAssignedCourses();
  }, []);

  useEffect(() => {
    fetchPendingReviews();
  }, [selectedCourse]);

  const fetchAssignedCourses = async () => {
    try {
      const res = await axios.get('/api/cc/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data?.courses || res.data || [];
      setCourses(list);
      if (list.length > 0 && !selectedCourse) {
        setSelectedCourse(list[0]._id || list[0].courseId || '');
      }
    } catch (e) {
      // non-fatal
    }
  };

  const fetchPendingReviews = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/cc/reviews/pending';
      let params = {};
      if (selectedCourse) params.courseId = selectedCourse;
      let res;
      try {
        res = await axios.get(url, { params, headers: { Authorization: `Bearer ${token}` } });
      } catch (primaryErr) {
        // fallback to teacher endpoint if CC endpoint not found
        res = await axios.get('/api/teacher/question-reviews/pending', {
          params: { course: selectedCourse },
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      const items = res.data?.items || res.data?.reviews || res.data || [];
      setReviews(items);
    } catch (e) {
      setError('Failed to fetch pending reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const approveReview = async (reviewId) => {
    try {
      await axios.post(`/api/cc/reviews/${reviewId}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Review approved');
      fetchPendingReviews();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to approve');
    }
  };

  const flagReview = async () => {
    const { reviewId, note } = flagDialog;
    try {
      await axios.post(`/api/cc/reviews/${reviewId}/flag`, { note }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Review flagged to HOD');
      setFlagDialog({ open: false, reviewId: null, note: '' });
      fetchPendingReviews();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to flag review');
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Pending Reviews</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box display="flex" gap={2} mb={2}>
        <FormControl sx={{ minWidth: 260 }}>
          <InputLabel>Course</InputLabel>
          <Select label="Course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
            {courses.map((c) => (
              <MenuItem key={c._id || c.courseId} value={c._id || c.courseId}>
                {c.title || c.courseTitle} ({c.courseCode})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={fetchPendingReviews}>Refresh</Button>
      </Box>

      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
          ) : reviews.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" py={3}>No pending reviews.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Uploaded By</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell sx={{ maxWidth: 480 }}>
                        <Typography variant="body2">{r.snapshot?.questionText || r.question?.questionText || '—'}</Typography>
                        <Box mt={0.5}>
                          {(r.snapshot?.options || r.question?.options || []).map((opt, idx) => (
                            <Typography key={idx} variant="caption" color={idx === (r.snapshot?.correctOption ?? r.question?.correctOption) ? 'success.main' : 'textSecondary'} display="block">
                              {String.fromCharCode(65 + idx)}. {opt}
                            </Typography>
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>{r.course?.title} ({r.course?.courseCode})</TableCell>
                      <TableCell>{r.unit?.title || '—'}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'action.active' }} />
                          <Typography variant="body2">{r.uploader?.name || 'Unknown'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Approve">
                          <IconButton color="success" size="small" onClick={() => approveReview(r._id)}>
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Flag to HOD">
                          <IconButton color="warning" size="small" onClick={() => setFlagDialog({ open: true, reviewId: r._id, note: '' })}>
                            <FlagIcon />
                          </IconButton>
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

      <Dialog open={flagDialog.open} onClose={() => setFlagDialog({ open: false, reviewId: null, note: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Flag Review to HOD</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Flag note"
            multiline
            rows={4}
            value={flagDialog.note}
            onChange={(e) => setFlagDialog((d) => ({ ...d, note: e.target.value }))}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlagDialog({ open: false, reviewId: null, note: '' })}>Cancel</Button>
          <Button variant="contained" onClick={flagReview} disabled={!flagDialog.note.trim()}>Flag</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CCReviews;
