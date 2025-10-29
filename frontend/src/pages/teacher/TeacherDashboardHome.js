import React, { useEffect, useState } from 'react';
import { Grid, Typography, Card, CardContent, CircularProgress, Alert, Box, Avatar } from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import ClassIcon from '@mui/icons-material/Class';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import QuizIcon from '@mui/icons-material/Quiz';

const StatCard = ({ title, count, description, icon, gradient, textColor = '#333' }) => (
  <Card 
    sx={{ 
      height: '100%',
      background: gradient,
      color: textColor,
      border: '1px solid #6497b1',
      borderRadius: 2,
      boxShadow: '0 4px 12px rgba(0, 91, 150, 0.15)',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 16px rgba(0, 91, 150, 0.25)',
      }
    }}
  >
    <CardContent sx={{ 
      p: 3, 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.9)', 
          mr: 2,
          width: 56,
          height: 56,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.8)'
        }}>
          {icon}
        </Avatar>
        <Typography variant="h4" component="div" sx={{ 
          fontWeight: 700,
          fontSize: { xs: '1.8rem', md: '2.2rem' }
        }}>
          {count}
        </Typography>
      </Box>
      <Typography variant="h6" component="div" sx={{ 
        fontWeight: 600,
        mb: 0.5,
        fontSize: '1.1rem'
      }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ 
        opacity: 0.8,
        fontWeight: 500
      }}>
        {description}
      </Typography>
    </CardContent>
  </Card>
);

const TeacherDashboardHome = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    courseCount: 0,
    studentCount: 0,
    videoCount: 0,
    sectionCount: 0,
    quizCount: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Add cache-busting timestamp to ensure fresh data
        const timestamp = Date.now();
        const cacheHeaders = {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        
        // Fetch overview data
        const overviewResponse = await axios.get(`/api/teacher/analytics/overview?_t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}`, ...cacheHeaders }
        });
        
        setDashboardData(overviewResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        // Use some default data in case of error
        setDashboardData({
          courseCount: 0,
          studentCount: 0,
          videoCount: 0,
          sectionCount: 0,
          quizCount: 0
        });
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{ 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #011f4b 0%, #005b96 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1
        }}
      >
        Teaching Overview
      </Typography>
      <Typography 
        variant="subtitle1" 
        gutterBottom 
        sx={{ 
          color: 'text.secondary',
          fontWeight: 500,
          mb: 4
        }}
      >
        Welcome back, {currentUser?.name || 'Teacher'}! Here's your teaching summary.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={2.4}>
            <StatCard
              title="Courses"
              count={dashboardData.courseCount}
              description="assigned courses"
              icon={<ClassIcon sx={{ color: '#4361ee', fontSize: 28 }} />}
              gradient="linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)"
              textColor="#1565c0"
            />
          </Grid>
          
          <Grid item xs={12} md={6} lg={2.4}>
            <StatCard
              title="Students"
              count={dashboardData.studentCount}
              description="across all courses"
              icon={<SchoolIcon sx={{ color: '#2e7d32', fontSize: 28 }} />}
              gradient="linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
              textColor="#2e7d32"
            />
          </Grid>
          
          <Grid item xs={12} md={6} lg={2.4}>
            <StatCard
              title="Sections"
              count={dashboardData.sectionCount || 0}
              description="teaching sections"
              icon={<PeopleIcon sx={{ color: '#f57c00', fontSize: 28 }} />}
              gradient="linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)"
              textColor="#f57c00"
            />
          </Grid>
          
          <Grid item xs={12} md={6} lg={2.4}>
            <StatCard
              title="Videos"
              count={dashboardData.videoCount}
              description="uploaded videos"
              icon={<VideoLibraryIcon sx={{ color: '#7b1fa2', fontSize: 28 }} />}
              gradient="linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)"
              textColor="#7b1fa2"
            />
          </Grid>

          <Grid item xs={12} md={6} lg={2.4}>
            <StatCard
              title="Quizzes"
              count={dashboardData.quizCount || 0}
              description="created quizzes"
              icon={<QuizIcon sx={{ color: '#d32f2f', fontSize: 28 }} />}
              gradient="linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)"
              textColor="#d32f2f"
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default TeacherDashboardHome;