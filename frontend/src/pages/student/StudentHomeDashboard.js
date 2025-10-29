import React, { useEffect, useState } from 'react';
import {
  Grid, Typography, Card, CardContent, CircularProgress, Alert, Box, Avatar,
  List, ListItem, ListItemText, ListItemIcon, Chip, Divider,
  CardHeader
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getCurrentUser } from '../../utils/authService';
import SchoolIcon from '@mui/icons-material/School';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import QuizIcon from '@mui/icons-material/Quiz';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';

const StatCard = ({ title, count, description, icon, gradient, textColor = '#333' }) => (
  <Card 
    sx={{ 
      height: { xs: '140px', md: '160px' },
      minHeight: '140px',
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
      p: { xs: 2, md: 2.5 }, 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative'
    }}>
      {/* Icon in top right corner */}
      <Box sx={{ 
        position: 'absolute',
        top: { xs: 12, md: 16 },
        right: { xs: 12, md: 16 },
        opacity: 0.8
      }}>
        <Avatar sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.9)', 
          width: { xs: 40, md: 44 },
          height: { xs: 40, md: 44 },
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.8)'
        }}>
          {icon}
        </Avatar>
      </Box>

      {/* Main content - centered */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        pr: { xs: 6, md: 7 } // Add padding to avoid icon overlap
      }}>
        {/* Count/Value - Main focus */}
        <Typography variant="h3" component="div" sx={{ 
          fontWeight: 700,
          fontSize: { xs: '1.8rem', md: '2.2rem' },
          lineHeight: 1,
          mb: 1,
          color: 'inherit'
        }}>
          {count}
        </Typography>

        {/* Title */}
        <Typography variant="h6" component="div" sx={{ 
          fontWeight: 600,
          fontSize: { xs: '0.9rem', md: '1rem' },
          lineHeight: 1.2,
          mb: 0.5,
          color: 'inherit'
        }}>
          {title}
        </Typography>

        {/* Description */}
        <Typography variant="body2" sx={{ 
          opacity: 0.7,
          fontWeight: 500,
          fontSize: { xs: '0.75rem', md: '0.8rem' },
          lineHeight: 1.3,
          color: 'inherit'
        }}>
          {description}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const StudentHomeDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    courseCount: 0,
    videosWatched: 0,
    totalVideos: 0,
    quizzesCompleted: 0,
    averageScore: 0,
    overallProgress: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch student courses
        const coursesResponse = await axios.get('/api/student/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const courses = coursesResponse.data || [];
        
        // Fetch watch history
        const watchHistoryResponse = await axios.get('/api/student/watch-history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const watchHistory = watchHistoryResponse.data || [];
        
        // Fetch quiz results
        const quizResponse = await axios.get('/api/student/quiz-results', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const quizResults = quizResponse.data;
        
        // Calculate statistics
        const totalVideos = courses.reduce((sum, course) => sum + (course.totalVideos || course.videoCount || 0), 0);
        
        const videosWatched = watchHistory.reduce((total, course) => {
          return total + (course.videos ? course.videos.filter(v => v.timeSpent > 0).length : 0);
        }, 0);
        
        const quizzesCompleted = Array.isArray(quizResults?.attempts) ? 
          quizResults.attempts.length : (Array.isArray(quizResults) ? quizResults.length : 0);
          
        const averageScore = Array.isArray(quizResults?.attempts) && quizResults.attempts.length > 0 ?
          Math.round(quizResults.attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / quizResults.attempts.length) :
          0;

        const overallProgress = courses.length > 0 ? 
          Math.round(courses.reduce((sum, course) => sum + (course.progress || 0), 0) / courses.length) : 0;
        
        setDashboardData({
          courseCount: courses.length,
          videosWatched,
          totalVideos,
          quizzesCompleted,
          averageScore,
          overallProgress
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setDashboardData({
          courseCount: 0,
          videosWatched: 0,
          totalVideos: 0,
          quizzesCompleted: 0,
          averageScore: 0,
          overallProgress: 0
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
        Learning Overview
      </Typography>
      <Typography 
        variant="subtitle1" 
        color="text.secondary" 
        sx={{ mb: 3, fontSize: '1.1rem' }}
      >
        Welcome back, {currentUser?.name || 'Student'}! Here's your learning progress.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard
                title="Enrolled Courses"
                count={dashboardData.courseCount}
                description="active courses"
                icon={<MenuBookIcon sx={{ color: '#1565c0', fontSize: 28 }} />}
                gradient="linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)"
                textColor="#1565c0"
              />
            </Grid>
            
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard
                title="Videos Watched"
                count={dashboardData.videosWatched}
                description={`out of ${dashboardData.totalVideos} videos`}
                icon={<OndemandVideoIcon sx={{ color: '#2e7d32', fontSize: 28 }} />}
                gradient="linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
                textColor="#2e7d32"
              />
            </Grid>
            
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard
                title="Quizzes"
                count={dashboardData.quizzesCompleted}
                description={dashboardData.averageScore > 0 ? `avg: ${dashboardData.averageScore}%` : 'completed'}
                icon={<QuizIcon sx={{ color: '#f57c00', fontSize: 28 }} />}
                gradient="linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)"
                textColor="#f57c00"
              />
            </Grid>
            
            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard
                title="Overall Progress"
                count={`${dashboardData.overallProgress}%`}
                description="course completion"
                icon={<TrendingUpIcon sx={{ color: '#7b1fa2', fontSize: 28 }} />}
                gradient="linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)"
                textColor="#7b1fa2"
              />
            </Grid>

            <Grid item xs={12} md={6} lg={2.4}>
              <StatCard
                title="Academic Status"
                count={dashboardData.overallProgress >= 75 ? 'Excellent' : dashboardData.overallProgress >= 50 ? 'Good' : 'Needs Work'}
                description="performance level"
                icon={<SchoolIcon sx={{ color: '#d32f2f', fontSize: 28 }} />}
                gradient="linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)"
                textColor="#d32f2f"
              />
            </Grid>
          </Grid>

          {/* Quick Actions Section */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={4}>
              <Card sx={{ 
                height: '300px',
                background: '#ffffff',
                border: '1px solid #6497b1',
                boxShadow: '0 6px 20px rgba(0, 91, 150, 0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0, 91, 150, 0.2)'
                }
              }}>
                <CardHeader
                  avatar={
                    <Avatar sx={{ 
                      bgcolor: '#005b96',
                      background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)'
                    }}>
                      <LaunchIcon />
                    </Avatar>
                  }
                  title="Quick Actions"
                  subheader="Jump to your most used features"
                />
                <Divider />
                <CardContent sx={{ p: 0 }}>
                  <List>
                    <ListItem button onClick={() => navigate('/student/courses')}>
                      <ListItemIcon>
                        <MenuBookIcon sx={{ color: '#005b96' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="My Courses" 
                        secondary="View and access your enrolled courses"
                      />
                    </ListItem>
                    <ListItem button onClick={() => navigate('/student/videos')}>
                      <ListItemIcon>
                        <VideoLibraryIcon sx={{ color: '#005b96' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Recent Videos" 
                        secondary="Continue watching your videos"
                      />
                    </ListItem>
                    <ListItem button onClick={() => navigate('/student/quiz-results')}>
                      <ListItemIcon>
                        <QuizIcon sx={{ color: '#005b96' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Quiz Results" 
                        secondary="Check your quiz performance"
                      />
                    </ListItem>
                    <ListItem button onClick={() => navigate('/student/live-classes')}>
                      <ListItemIcon>
                        <PlayCircleOutlineIcon sx={{ color: '#005b96' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Live Classes" 
                        secondary="Join scheduled live sessions"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Progress Summary */}
            <Grid item xs={12} md={6} lg={8}>
              <Card sx={{ 
                height: '300px',
                background: '#ffffff',
                border: '1px solid #6497b1',
                boxShadow: '0 6px 20px rgba(0, 91, 150, 0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0, 91, 150, 0.2)'
                }
              }}>
                <CardHeader
                  avatar={
                    <Avatar sx={{ 
                      bgcolor: '#7b1fa2',
                      background: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)'
                    }}>
                      <TrendingUpIcon />
                    </Avatar>
                  }
                  title="Learning Progress Overview"
                  subheader="Your academic journey at a glance"
                  action={
                    <Chip 
                      label={`${dashboardData.overallProgress}% Complete`}
                      color="primary"
                      variant="outlined"
                    />
                  }
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#005b96', mb: 1 }}>
                          {dashboardData.courseCount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          Active Courses
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32', mb: 1 }}>
                          {dashboardData.videosWatched}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          Videos Completed
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#f57c00', mb: 1 }}>
                          {dashboardData.quizzesCompleted}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          Quizzes Taken
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#7b1fa2', mb: 1 }}>
                          {dashboardData.averageScore}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          Average Score
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default StudentHomeDashboard;