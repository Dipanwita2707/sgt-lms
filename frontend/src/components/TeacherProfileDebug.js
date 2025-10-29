import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';

const TeacherProfileDebug = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

  const token = localStorage.getItem('token');

  const fetchProfile = async (forceNoCache = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = { Authorization: `Bearer ${token}` };
      
      if (forceNoCache) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      
      const response = await axios.get('/api/teacher/profile', { headers });
      
      console.log('Raw API Response:', response.data);
      setRawResponse(JSON.stringify(response.data, null, 2));
      setProfile(response.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithTimestamp = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const timestamp = Date.now();
      const response = await axios.get(`/api/teacher/profile?_t=${timestamp}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Raw API Response with timestamp:', response.data);
      setRawResponse(JSON.stringify(response.data, null, 2));
      setProfile(response.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Teacher Profile Debug Tool
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => fetchProfile(false)} disabled={loading}>
          Fetch Profile (Normal)
        </Button>
        <Button variant="contained" color="secondary" onClick={() => fetchProfile(true)} disabled={loading}>
          Fetch Profile (No Cache)
        </Button>
        <Button variant="contained" color="success" onClick={fetchWithTimestamp} disabled={loading}>
          Fetch with Timestamp
        </Button>
        <Button variant="outlined" onClick={() => { setProfile(null); setRawResponse(null); setError(null); }}>
          Clear Results
        </Button>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading...</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {profile && (
        <Box>
          {/* Statistics Display */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Parsed Statistics Display
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {profile.statistics?.totalSections ?? 'undefined'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Sections
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="secondary">
                    {profile.statistics?.totalStudents ?? 'undefined'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Students
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {profile.statistics?.totalCourses ?? 'undefined'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Courses
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="info.main">
                    {profile.statistics?.directStudents ?? 'undefined'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Direct Students
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Assigned Sections:</strong> {profile.assignedSections?.length ?? 'undefined'} sections
              </Typography>
            </CardContent>
          </Card>

          {/* Raw Response */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Raw API Response
              </Typography>
              <Box 
                component="pre" 
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  p: 2, 
                  borderRadius: 1, 
                  overflow: 'auto',
                  fontSize: '0.875rem',
                  maxHeight: '500px'
                }}
              >
                {rawResponse}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default TeacherProfileDebug;