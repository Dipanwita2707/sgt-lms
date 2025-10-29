import React from 'react';
import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const CCDashboardHome = () => {
  const navigate = useNavigate();
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>CC Dashboard</Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Welcome</Typography>
          <Typography color="textSecondary" paragraph>
            As a Course Coordinator, you can review teacher-submitted questions and flag them for HOD approval when needed.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/cc/reviews')}>Go to Pending Reviews</Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CCDashboardHome;
