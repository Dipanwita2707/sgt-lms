import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import DualSignatureUpload from '../../components/hod/DualSignatureUpload';
import CertificateActivation from '../../components/hod/CertificateActivation';

const HODCertificates = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHODCourses();
  }, []);

  const fetchHODCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/hod/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('HOD Courses Response:', response.data);

      // Fetch sections for each course using HOD endpoint
      const coursesWithSections = await Promise.all(
        response.data.courses.map(async (course) => {
          try {
            const sectionsResponse = await axios.get(`/api/hod/courses/${course._id}/sections`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Sections for course ${course.title}:`, sectionsResponse.data);
            return {
              ...course,
              sections: sectionsResponse.data.sections || sectionsResponse.data || []
            };
          } catch (err) {
            console.error(`Error fetching sections for course ${course._id}:`, err);
            return {
              ...course,
              sections: []
            };
          }
        })
      );

      console.log('Courses with sections:', coursesWithSections);
      setCourses(coursesWithSections);
    } catch (error) {
      console.error('Error fetching HOD courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#1976d2' }}>
        Certificate Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Signature Upload Section */}
      <DualSignatureUpload />

      {/* Certificate Activation Section */}
      <CertificateActivation courses={courses} />
    </Box>
  );
};

export default HODCertificates;
