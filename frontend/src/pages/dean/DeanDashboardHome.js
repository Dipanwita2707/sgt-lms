import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Button
} from '@mui/material';
import {
  School as SchoolIcon,
  Group as GroupIcon,
  Book as BookIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const DeanDashboardHome = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    school: null,
    departments: 0,
    teachers: 0,
    courses: 0,
    students: 0
  });
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get dean's school info
      const userRes = await axios.get(`/api/admin/users/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const schoolId = userRes.data.school;
      
      if (schoolId) {
        // Get school details
        const schoolRes = await axios.get(`/api/schools/${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get departments in this school
        const deptRes = await axios.get(`/api/departments?school=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get teachers in this school
        const teacherRes = await axios.get(`/api/admin/teachers?school=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get courses in this school
        const courseRes = await axios.get(`/api/admin/courses?school=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStats({
          school: schoolRes.data,
          departments: deptRes.data.length,
          teachers: teacherRes.data.length,
          courses: courseRes.data.length,
          students: 0 // TODO: Implement student count
        });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
          Welcome back, Dean {currentUser.firstName} {currentUser.lastName}
        </Typography>
        {stats.school && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" color="textSecondary">
              {stats.school.name}
            </Typography>
            <Chip 
              label={stats.school.code} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Departments"
            value={stats.departments}
            icon={<SchoolIcon />}
            gradientColors={['#bbdefb', '#e3f2fd']}
            iconBgColor="25, 118, 210"
          />
        </Grid>
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
            title="Growth"
            value="+12%"
            icon={<TrendingUpIcon />}
            gradientColors={['#e1bee7', '#f3e5f5']}
            iconBgColor="156, 39, 176"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: '#ffffff',
            border: '1px solid #6497b1',
            boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="outlined" fullWidth sx={{ 
                  borderColor: '#6497b1', 
                  color: '#005b96',
                  '&:hover': {
                    borderColor: '#005b96',
                    backgroundColor: 'rgba(0, 91, 150, 0.04)'
                  }
                }}>
                  View All Departments
                </Button>
                <Button variant="outlined" fullWidth sx={{ 
                  borderColor: '#6497b1', 
                  color: '#005b96',
                  '&:hover': {
                    borderColor: '#005b96',
                    backgroundColor: 'rgba(0, 91, 150, 0.04)'
                  }
                }}>
                  Manage Teachers
                </Button>
                <Button variant="outlined" fullWidth sx={{ 
                  borderColor: '#6497b1', 
                  color: '#005b96',
                  '&:hover': {
                    borderColor: '#005b96',
                    backgroundColor: 'rgba(0, 91, 150, 0.04)'
                  }
                }}>
                  Course Overview
                </Button>
                <Button variant="outlined" fullWidth sx={{ 
                  borderColor: '#6497b1', 
                  color: '#005b96',
                  '&:hover': {
                    borderColor: '#005b96',
                    backgroundColor: 'rgba(0, 91, 150, 0.04)'
                  }
                }}>
                  Analytics Report
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: '#ffffff',
            border: '1px solid #6497b1',
            boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                School Information
              </Typography>
              {stats.school ? (
                <Box>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Name:</strong> {stats.school.name}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Code:</strong> {stats.school.code}
                  </Typography>
                  {stats.school.description && (
                    <Typography variant="body2" color="textSecondary">
                      {stats.school.description}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography color="textSecondary">
                  No school assigned to your account.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DeanDashboardHome;
