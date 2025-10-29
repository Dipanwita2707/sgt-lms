import React from 'react';
import { Box, Typography } from '@mui/material';

const TestQuizResults = () => {
  console.log('TestQuizResults: Component is rendering successfully!');
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎯 Quiz Results Test Page
      </Typography>
      <Typography variant="body1">
        If you can see this message, the routing is working correctly!
      </Typography>
      <Typography variant="body2" sx={{ mt: 2, color: 'success.main' }}>
        ✅ Route: /student/quiz-results is accessible
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Current URL: {window.location.pathname}
      </Typography>
    </Box>
  );
};

export default TestQuizResults;