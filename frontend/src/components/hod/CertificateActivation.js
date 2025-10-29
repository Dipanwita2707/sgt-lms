import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Lock,
  LockOpen,
  Download,
  Info,
  Warning
} from '@mui/icons-material';
import axios from 'axios';

const CertificateActivation = ({ courses }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [certificateStatus, setCertificateStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [hasRegistrarSignature, setHasRegistrarSignature] = useState(false);

  useEffect(() => {
    checkSignatureStatus();
    if (courses && courses.length > 0) {
      courses.forEach(course => {
        course.sections?.forEach(section => {
          fetchCertificateStatus(course._id, section._id);
        });
      });
    }
  }, [courses]);

  const checkSignatureStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/certificates/signature/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHasSignature(response.data.hasSignature);
      setHasRegistrarSignature(response.data.hasRegistrarSignature);
    } catch (error) {
      console.error('Error checking signature status:', error);
    }
  };

  const fetchCertificateStatus = async (courseId, sectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/certificates/status', {
        params: { courseId, sectionId },
        headers: { Authorization: `Bearer ${token}` }
      });

      setCertificateStatus(prev => ({
        ...prev,
        [`${courseId}-${sectionId}`]: response.data
      }));
    } catch (error) {
      console.error('Error fetching certificate status:', error);
    }
  };

  const handleActivateClick = (course, section) => {
    if (!hasSignature) {
      setMessage({ 
        type: 'error', 
        text: 'Please upload your HOD digital signature before activating certificates' 
      });
      return;
    }

    if (!hasRegistrarSignature) {
      setMessage({ 
        type: 'error', 
        text: 'Please upload the Sub-Register (Exam) signature before activating certificates' 
      });
      return;
    }

    setSelectedCourse({ course, section });
    setDialogOpen(true);
  };

  const handleConfirmActivation = async () => {
    if (!selectedCourse) return;

    setActivating(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/certificates/activate',
        {
          courseId: selectedCourse.course._id,
          sectionId: selectedCourse.section._id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage({ type: 'success', text: response.data.message });
      
      // Refresh status
      await fetchCertificateStatus(selectedCourse.course._id, selectedCourse.section._id);
      
      setDialogOpen(false);
      setSelectedCourse(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to activate certificates'
      });
    } finally {
      setActivating(false);
    }
  };

  const getCertificateStatusForSection = (courseId, sectionId) => {
    return certificateStatus[`${courseId}-${sectionId}`] || {
      totalStudents: 0,
      activatedCount: 0,
      downloadedCount: 0,
      isActivated: false
    };
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          p: 2,
          mb: 3,
          borderRadius: 1,
          color: 'white'
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle />
            Certificate Activation
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Activate certificates for completed courses. Once activated, student progress will be locked.
          </Typography>
        </Box>

        {!hasSignature && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
            <strong>Action Required:</strong> Please upload your HOD digital signature before activating certificates.
          </Alert>
        )}

        {!hasRegistrarSignature && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
            <strong>Action Required:</strong> Please upload the Sub-Register (Exam) signature before activating certificates.
          </Alert>
        )}

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        {courses && courses.length > 0 ? (
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Course</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Section</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Students</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Downloads</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.map(course => 
                  course.sections?.map(section => {
                    const status = getCertificateStatusForSection(course._id, section._id);
                    return (
                      <TableRow 
                        key={`${course._id}-${section._id}`}
                        sx={{ '&:nth-of-type(odd)': { bgcolor: '#f5f5f5' } }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {course.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {course.courseCode}
                          </Typography>
                        </TableCell>
                        <TableCell>{section.name}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={status.totalStudents || section.students?.length || 0} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {status.isActivated ? (
                            <Chip 
                              icon={<LockOpen />}
                              label="Activated" 
                              color="success" 
                              size="small"
                            />
                          ) : (
                            <Chip 
                              icon={<Lock />}
                              label="Locked" 
                              color="default" 
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <Download fontSize="small" color="action" />
                            <Typography variant="body2">
                              {status.downloadedCount} / {status.activatedCount}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant={status.isActivated ? "outlined" : "contained"}
                            color={status.isActivated ? "success" : "primary"}
                            size="small"
                            onClick={() => handleActivateClick(course, section)}
                            disabled={status.isActivated || !hasSignature || !hasRegistrarSignature}
                            startIcon={status.isActivated ? <CheckCircle /> : <LockOpen />}
                          >
                            {status.isActivated ? 'Activated' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info" icon={<Info />}>
            No courses assigned yet.
          </Alert>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={dialogOpen} onClose={() => !activating && setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white' }}>
            Confirm Certificate Activation
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {selectedCourse && (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Warning:</strong> This action cannot be undone!
                </Alert>
                
                <Typography variant="body1" gutterBottom>
                  You are about to activate certificates for:
                </Typography>
                
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Course:</strong> {selectedCourse.course.title} ({selectedCourse.course.courseCode})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Section:</strong> {selectedCourse.section.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Students:</strong> {selectedCourse.section.students?.length || 0}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  After activation:
                </Typography>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>
                    <Typography variant="body2">Student progress will be locked</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Marks will be calculated from unit quizzes</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">Students can download their certificates</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">This action cannot be reversed</Typography>
                  </li>
                </ul>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={activating}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmActivation}
              variant="contained"
              color="primary"
              disabled={activating}
              startIcon={activating ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              {activating ? 'Activating...' : 'Confirm Activation'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CertificateActivation;
