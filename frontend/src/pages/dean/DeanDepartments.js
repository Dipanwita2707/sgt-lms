import React, { useState, useEffect } from 'react';
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
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';

const DeanDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/dean/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(res.data.departments || []);
      setSchool(res.data.school || null);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError(error.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>Departments Overview</Typography>
      {school && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          School: {school.name} ({school.code})
        </Typography>
      )}
      
      <Card sx={{
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
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Departments in Your School
          </Typography>
          
          {departments.length === 0 ? (
            <Typography color="textSecondary">
              No departments found in your school.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Department Name</strong></TableCell>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>HOD</strong></TableCell>
                    <TableCell align="center"><strong>Courses</strong></TableCell>
                    <TableCell align="center"><strong>Teachers</strong></TableCell>
                    <TableCell align="center"><strong>Students</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                      {departments.map((dept) => (
                    <TableRow key={dept._id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {dept.name}
                          </Typography>
                          {dept.description && (
                            <Typography variant="body2" color="textSecondary">
                              {dept.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={dept.code} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {dept.hod ? (
                          <Box>
                            <Typography variant="body2">{dept.hod.name}</Typography>
                            <Typography variant="caption" color="textSecondary">{dept.hod.email}</Typography>
                            {dept.hod.uid && (
                              <Typography variant="caption" color="textSecondary" display="block">UID: {dept.hod.uid}</Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">No HOD assigned</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={dept.counts?.courses ?? 0} size="small" color="secondary" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={dept.counts?.teachers ?? 0} size="small" color="info" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={dept.counts?.students ?? 0} size="small" color="success" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DeanDepartments;
