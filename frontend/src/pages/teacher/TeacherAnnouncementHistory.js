import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import AnnouncementHistory from '../../components/AnnouncementHistory';

const TeacherAnnouncementHistory = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          My Announcements
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          View your announcement history and approval status
        </Typography>
        
        <AnnouncementHistory 
          userRole="teacher" 
          title="Teacher Announcement History"
        />
      </Paper>
    </Box>
  );
};

export default TeacherAnnouncementHistory;