
import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Grid, 
  Card, 
  CardContent, 
  Divider, 
  IconButton, 
  Tooltip as MuiTooltip,
  CardHeader,
  Avatar,
  Switch,
  FormControlLabel,
  FormGroup,
  useTheme
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import axios from 'axios';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import { MdVideoLibrary } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { parseJwt } from '../../utils/jwt';

// Enhanced color palette
const COLORS = ['#4361ee', '#f72585', '#7209b7', '#3a0ca3', '#4cc9f0', '#ff9e00', '#38b000'];

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleMetrics, setVisibleMetrics] = useState(() => {
    // Default: all metrics visible, persisted in localStorage
    const saved = localStorage.getItem('dashboardMetrics');
    return saved ? JSON.parse(saved) : {
      totalStudents: true,
      activeStudents: true,
      totalCourses: true,
      totalVideos: true,
    };
  });
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Handle metric toggle
  const handleMetricToggle = (key) => {
    setVisibleMetrics(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('dashboardMetrics', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [o, t, h] = await Promise.all([
          axios.get('/api/admin/analytics/overview', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/admin/analytics/trends', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/admin/analytics/heatmap', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setOverview(o.data);
        setTrends(t.data);
        setHeatmap(h.data);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading || !overview) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress color="primary" size={60} thickness={4} />
      </Box>
    );
  }

  // Prepare trend data for recharts with enhanced styling - with null checks
  const trendData = Array.isArray(trends) ? trends.map(t => {
    // Add null checks to handle potential undefined values
    if (!t || !t._id) {
      return { name: 'Unknown', Enrollments: 0 };
    }
    return {
      name: t._id.year && t._id.period ? `${t._id.year}/${t._id.period}` : 'Unknown',
      Enrollments: t.count || 0,
    };
  }) : [];

  // Prepare heatmap data for recharts (flattened for demo) - with null checks
  const heatmapData = Array.isArray(heatmap) ? heatmap.map(h => {
    // Add null checks to handle potential undefined values
    if (!h || !h._id) {
      return { day: 'Unknown', hour: 0, count: 0 };
    }
    return {
      day: h._id.day || 'Unknown',
      hour: h._id.hour || 0,
      count: h.count || 0,
    };
  }) : [];

  // Generate heat colors based on count
  const getHeatColor = (count) => {
    if (!Array.isArray(heatmapData) || heatmapData.length === 0) {
      return `rgba(247, 37, 133, 0.2)`;
    }
    const maxCount = Math.max(...heatmapData.map(d => d.count || 0));
    if (maxCount === 0) {
      return `rgba(247, 37, 133, 0.2)`;
    }
    const intensity = Math.min(Math.floor((count / maxCount) * 255), 255);
    return `rgba(247, 37, 133, ${0.2 + (count / maxCount) * 0.8})`;
  };

  return (
    <Box sx={{ px: 1, py: 2, bgcolor: 'transparent' }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        color="primary" 
        sx={{ 
          mb: 3, 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <TimelineIcon sx={{ mr: 1, fontSize: 36 }} />
        Analytics Dashboard
      </Typography>
      
      {/* Custom dashboard metric toggles - Redesigned */}
      <Card 
        elevation={2} 
        sx={{ 
          mb: 4, 
          p: 2, 
          borderRadius: 2,
          background: '#ffffff',
          border: '1px solid #6497b1',
          boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)'
        }}
      >
        <CardHeader
          title="Dashboard Customization"
          titleTypographyProps={{ variant: 'h6', fontWeight: 500 }}
          subheader="Toggle metrics visibility to customize your dashboard view"
          sx={{ pb: 1 }}
        />
        <Divider sx={{ mb: 2 }} />
        <FormGroup row sx={{ px: 2, gap: 3, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch 
                checked={visibleMetrics.totalStudents} 
                onChange={() => handleMetricToggle('totalStudents')}
                color="primary"
              />
            }
            label="Total Students"
          />
          <FormControlLabel
            control={
              <Switch 
                checked={visibleMetrics.activeStudents} 
                onChange={() => handleMetricToggle('activeStudents')}
                color="success"
              />
            }
            label="Active Students"
          />
          <FormControlLabel
            control={
              <Switch 
                checked={visibleMetrics.totalCourses} 
                onChange={() => handleMetricToggle('totalCourses')}
                color="warning"
              />
            }
            label="Total Courses"
          />
          <FormControlLabel
            control={
              <Switch 
                checked={visibleMetrics.totalVideos} 
                onChange={() => handleMetricToggle('totalVideos')}
                color="secondary"
              />
            }
            label="Total Videos"
          />
        </FormGroup>
      </Card>
      
      {/* Stats Cards - Enhanced with shadows and transitions */}
      <Grid container spacing={3}>
        {visibleMetrics.totalStudents && (
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={2} 
              sx={{ 
                height: '100%',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 16px rgba(67, 97, 238, 0.2)',
                }
              }}
            >
              <CardContent sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: 1,
                p: 3
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  width: '100%',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: '#4361ee', mr: 2 }}>
                      <PeopleIcon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={500}>Students</Typography>
                  </Box>
                  <MuiTooltip title="View all students">
                    <IconButton 
                      color="primary" 
                      onClick={() => navigate('/admin/students')} 
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.6)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                    >
                      <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                  </MuiTooltip>
                </Box>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#1565c0',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  {overview?.totalStudents || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Total registered students
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {visibleMetrics.activeStudents && (
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={2} 
              sx={{ 
                height: '100%',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 16px rgba(56, 176, 0, 0.2)',
                }
              }}
            >
              <CardContent sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: 1,
                p: 3
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  width: '100%',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: '#38b000', mr: 2 }}>
                      <PersonAddIcon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={500}>Active</Typography>
                  </Box>
                  <MuiTooltip title="View active students">
                    <IconButton 
                      color="success" 
                      onClick={() => navigate('/admin/students')} 
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.6)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                    >
                      <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                  </MuiTooltip>
                </Box>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#2e7d32',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  {overview?.activeStudents || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Active students (last 10 min)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {visibleMetrics.totalCourses && (
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={2} 
              sx={{ 
                height: '100%',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 16px rgba(255, 158, 0, 0.2)',
                }
              }}
            >
              <CardContent sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: 1,
                p: 3
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  width: '100%',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: '#ff9e00', mr: 2 }}>
                      <MenuBookIcon />
                    </Avatar>
                    <Typography variant="h6" fontWeight={500}>Courses</Typography>
                  </Box>
                  <MuiTooltip title="View all courses">
                    <IconButton 
                      color="warning" 
                      onClick={() => navigate('/admin/courses')} 
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.6)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                    >
                      <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                  </MuiTooltip>
                </Box>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#ed6c02',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  {overview?.totalCourses || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Total available courses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {visibleMetrics.totalVideos && (
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={2} 
              sx={{ 
                height: '100%',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 16px rgba(114, 9, 183, 0.2)',
                }
              }}
            >
              <CardContent sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: 1,
                p: 3
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  width: '100%',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: '#7209b7', mr: 2 }}>
                      <MdVideoLibrary style={{ fontSize: 24 }} />
                    </Avatar>
                    <Typography variant="h6" fontWeight={500}>Videos</Typography>
                  </Box>
                </Box>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#9c27b0',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  {overview?.totalVideos || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Total uploaded videos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Enhanced Charts Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card 
            elevation={3} 
            sx={{ 
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              border: '1px solid #6497b1',
              boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
              '&:hover': {
                boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)',
              }
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <ShowChartIcon />
                </Avatar>
              }
              title="Student Enrollment Trend"
              titleTypographyProps={{ variant: 'h6', fontWeight: 500 }}
              sx={{ bgcolor: 'rgba(244, 247, 252, 0.7)' }}
            />
            <Divider />
            <CardContent sx={{ p: 3 }}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart 
                  data={trendData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#666', fontSize: 12 }}
                    axisLine={{ stroke: '#ccc' }}
                  />
                  <YAxis 
                    tick={{ fill: '#666', fontSize: 12 }}
                    axisLine={{ stroke: '#ccc' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: 8,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                      border: 'none',
                      padding: 12
                    }}
                    itemStyle={{ color: '#333' }}
                    labelStyle={{ color: '#666', fontWeight: 600, marginBottom: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Enrollments" 
                    stroke="#4361ee" 
                    strokeWidth={3}
                    dot={{ 
                      fill: '#fff', 
                      stroke: '#4361ee', 
                      strokeWidth: 2, 
                      r: 5 
                    }}
                    activeDot={{ 
                      fill: '#4361ee', 
                      stroke: '#fff', 
                      strokeWidth: 2, 
                      r: 7 
                    }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card 
            elevation={3} 
            sx={{ 
              height: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              border: '1px solid #6497b1',
              boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
              '&:hover': {
                boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)',
              }
            }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  <PieChartIcon />
                </Avatar>
              }
              title="Top Courses"
              titleTypographyProps={{ variant: 'h6', fontWeight: 500 }}
              sx={{ bgcolor: 'rgba(244, 247, 252, 0.7)' }}
            />
            <Divider />
            <CardContent sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Array.isArray(overview?.topCourses) ? overview.topCourses : []}
                      dataKey="enrollments"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={4}
                      fill="#8884d8"
                      label={({ name, percent }) => `${name || 'Unknown'}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                      animationDuration={1500}
                      animationBegin={200}
                    >
                      {Array.isArray(overview?.topCourses) && overview.topCourses.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [`${value} students`, props.payload.name]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 8,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        border: 'none',
                        padding: 12
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Enhanced Heatmap Section */}
      <Card 
        elevation={3} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          border: '1px solid #6497b1',
          boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
          '&:hover': {
            boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)',
          }
        }}
      >
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: '#f72585' }}>
              <TimelineIcon />
            </Avatar>
          }
          title="Student Activity Heatmap"
          subheader="Activity by day and hour"
          titleTypographyProps={{ variant: 'h6', fontWeight: 500 }}
          sx={{ bgcolor: 'rgba(244, 247, 252, 0.7)' }}
        />
        <Divider />
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ 
            overflowX: 'auto', 
            display: 'flex',
            justifyContent: 'center',
            p: 2
          }}>
            <table 
              style={{ 
                minWidth: 500, 
                borderCollapse: 'separate',
                borderSpacing: '3px',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                width: '100%',
                maxWidth: 800,
                margin: '0 auto'
              }}
            >
              <thead>
                <tr>
                  <th style={{ 
                    backgroundColor: '#f3f4f6', 
                    padding: 12,
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#444',
                    textAlign: 'center',
                    borderRadius: '8px 0 0 0'
                  }}>
                    Day
                  </th>
                  <th style={{ 
                    backgroundColor: '#f3f4f6', 
                    padding: 12,
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#444',
                    textAlign: 'center'
                  }}>
                    Hour
                  </th>
                  <th style={{ 
                    backgroundColor: '#f3f4f6', 
                    padding: 12,
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#444',
                    textAlign: 'center',
                    borderRadius: '0 8px 0 0'
                  }}>
                    Active Students
                  </th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ 
                      padding: 12, 
                      textAlign: 'center',
                      backgroundColor: '#f9fafc',
                      fontWeight: 500,
                      color: '#555',
                      borderBottom: '1px solid #eee'
                    }}>
                      {row.day}
                    </td>
                    <td style={{ 
                      padding: 12, 
                      textAlign: 'center',
                      backgroundColor: '#f9fafc',
                      fontWeight: 500,
                      color: '#555',
                      borderBottom: '1px solid #eee'
                    }}>
                      {row.hour}:00
                    </td>
                    <td style={{ 
                      padding: 12, 
                      textAlign: 'center',
                      backgroundColor: getHeatColor(row.count),
                      fontWeight: 600,
                      color: row.count > 10 ? '#fff' : '#333',
                      borderBottom: '1px solid #eee'
                    }}>
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
