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
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download,
  CheckCircle,
  Lock,
  Info,
  EmojiEvents
} from '@mui/icons-material';
import axios from 'axios';

const StudentCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/certificates/my-certificates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificates(response.data.certificates);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load certificates'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificateId, courseName) => {
    setDownloading(certificateId);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/certificates/download/${certificateId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate-${courseName.replace(/\s+/g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setMessage({
        type: 'success',
        text: 'Certificate downloaded successfully!'
      });

      // Refresh certificate list
      await fetchCertificates();
    } catch (error) {
      console.error('Error downloading certificate:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to download certificate'
      });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)',
          p: 2,
          mb: 3,
          borderRadius: 1,
          color: 'white'
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEvents />
            My Certificates
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Download your course completion certificates
          </Typography>
        </Box>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {certificates.length > 0 ? (
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f57c00' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Course</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>Section</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Marks</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Issue Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow 
                    key={cert._id}
                    sx={{ '&:nth-of-type(odd)': { bgcolor: '#f5f5f5' } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {cert.course.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {cert.course.courseCode}
                      </Typography>
                    </TableCell>
                    <TableCell>{cert.section.name}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={`${cert.marksPercentage}%`} 
                        color={cert.marksPercentage >= 75 ? 'success' : cert.marksPercentage >= 50 ? 'primary' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {cert.status === 'downloaded' ? (
                        <Chip 
                          icon={<CheckCircle />}
                          label="Downloaded" 
                          color="success" 
                          size="small"
                        />
                      ) : (
                        <Chip 
                          label="Available" 
                          color="primary" 
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleDownload(cert._id, cert.course.title)}
                        disabled={downloading === cert._id}
                        startIcon={downloading === cert._id ? <CircularProgress size={16} /> : <Download />}
                      >
                        {downloading === cert._id ? 'Downloading...' : 'Download'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info" icon={<Info />}>
            <Typography variant="body2">
              No certificates available yet. Certificates will appear here once your HOD activates them for completed courses.
            </Typography>
          </Alert>
        )}

        {certificates.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Note:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Certificates are generated based on your unit quiz performance</li>
                <li>Once a certificate is activated, your progress for that course is locked</li>
                <li>You can download your certificate multiple times</li>
                <li>Certificates include digital signatures from HOD, Dean, and AAST Registrar</li>
              </ul>
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentCertificates;
