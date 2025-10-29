import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import { io } from 'socket.io-client';

const ChatMonitoringDashboard = () => {
  const [stats, setStats] = useState({
    totalConnections: 0,
    activeRooms: 0,
    serverLoad: 'normal',
    peakConcurrent: 0,
    averageConnectionTime: 0,
    messageRate: 0,
    errorRate: 0
  });

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to monitoring socket
    const monitorSocket = io('/monitoring', {
      auth: { token: localStorage.getItem('token') }
    });

    monitorSocket.on('stats-update', (newStats) => {
      setStats(newStats);
    });

    setSocket(monitorSocket);

    return () => {
      monitorSocket.disconnect();
    };
  }, []);

  const getLoadColor = (load) => {
    switch (load) {
      case 'low': return '#4caf50';
      case 'normal': return '#2196f3';
      case 'high': return '#ff9800';
      case 'overloaded': return '#f44336';
      default: return '#757575';
    }
  };

  const getLoadPercentage = (load) => {
    switch (load) {
      case 'low': return 25;
      case 'normal': return 50;
      case 'high': return 75;
      case 'overloaded': return 100;
      default: return 0;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Chat System Monitoring
      </Typography>
      
      {stats.serverLoad === 'overloaded' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          🚨 Server is overloaded! Consider scaling up resources.
        </Alert>
      )}
      
      {stats.serverLoad === 'high' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ⚠️ Server load is high. Monitor closely.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Connection Stats */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Connections
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.totalConnections.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Peak: {stats.peakConcurrent.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Rooms */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Rooms
              </Typography>
              <Typography variant="h3" color="secondary">
                {stats.activeRooms}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Chat rooms with users
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Server Load */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Server Load
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip 
                  label={stats.serverLoad.toUpperCase()} 
                  sx={{ 
                    backgroundColor: getLoadColor(stats.serverLoad),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getLoadPercentage(stats.serverLoad)}
                sx={{
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getLoadColor(stats.serverLoad)
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Message Rate */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Message Rate
              </Typography>
              <Typography variant="h3" color="success.main">
                {stats.messageRate}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                messages/second
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Avg Connection Time
                  </Typography>
                  <Typography variant="h6">
                    {Math.round(stats.averageConnectionTime / 1000)}s
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Error Rate
                  </Typography>
                  <Typography variant="h6" color={stats.errorRate > 5 ? 'error' : 'success.main'}>
                    {stats.errorRate.toFixed(2)}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Capacity Planning */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Capacity Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Current: {stats.totalConnections} / 50,000 users
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(stats.totalConnections / 50000) * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                {Math.round((1 - stats.totalConnections / 50000) * 100)}% capacity remaining
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChatMonitoringDashboard;