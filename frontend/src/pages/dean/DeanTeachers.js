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
  Alert,
  Avatar
} from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const DeanTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [school, setSchool] = useState(null);
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      
      // Use Dean-specific endpoints instead of admin endpoints
      const response = await axios.get('/api/dean/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setTeachers(response.data.teachers);
        setSchool(response.data.school);
      } else {
        setError(response.data.message || 'Failed to fetch teachers');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      if (error.response?.status === 403) {
        setError('Access denied. Dean role required.');
      } else if (error.response?.status === 400) {
        setError('Dean is not assigned to any school');
      } else {
        setError('Failed to fetch teachers');
      }
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (teacher) => {
    if (teacher.firstName && teacher.lastName) {
      return `${teacher.firstName[0]}${teacher.lastName[0]}`.toUpperCase();
    } else if (teacher.name) {
      const nameParts = teacher.name.split(' ');
      return nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : teacher.name.substring(0, 2).toUpperCase();
    }
    return 'NA';
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
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
        School Teachers
      </Typography>
      
      {school && (
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          {school.name}
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
            All Faculty Members ({teachers.length})
          </Typography>
          
          {teachers.length === 0 ? (
            <Typography color="textSecondary">
              No teachers found in your school.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Teacher</strong></TableCell>
                    <TableCell><strong>Employee ID</strong></TableCell>
                    <TableCell><strong>Department</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getInitials(teacher)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {teacher.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={teacher.teacherId || 'N/A'} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {teacher.department ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {teacher.department.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {teacher.department.code}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No department
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          {teacher.phone && (
                            <Typography variant="body2">
                              {teacher.phone}
                            </Typography>
                          )}
                          <Typography variant="body2" color="textSecondary">
                            {teacher.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={teacher.isActive ? "Active" : "Inactive"}
                          size="small" 
                          color={teacher.isActive ? "success" : "error"}
                        />
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

export default DeanTeachers;
