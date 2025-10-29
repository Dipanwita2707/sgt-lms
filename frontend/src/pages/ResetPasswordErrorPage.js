import React from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Container, Box, Typography, Button, Alert } from '@mui/material';

const ResetPasswordErrorPage = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  let errorMessage = 'An error occurred with your password reset request.';
  
  if (reason === 'invalid') {
    errorMessage = 'The password reset link is invalid or has expired. Please request a new link.';
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, p: 4, bgcolor: 'white', borderRadius: 2, boxShadow: 2 }}>
        <Typography variant="h5" mb={2} align="center">Password Reset Error</Typography>
        <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>
        <Button 
          component={RouterLink} 
          to="/forgot-password" 
          variant="contained" 
          color="primary" 
          fullWidth
        >
          Request New Reset Link
        </Button>
      </Box>
    </Container>
  );
};

export default ResetPasswordErrorPage;
