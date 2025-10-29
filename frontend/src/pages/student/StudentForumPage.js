import React from 'react';
import StudentCentralizedForums from '../../components/student/StudentCentralizedForums';
import { Container, Typography, Box, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const StudentForumPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Typography color="text.primary">Forums</Typography>
      </Breadcrumbs>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Student Forums
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ask questions, get answers, and engage with teachers and other students.
        </Typography>
      </Box>
      
      <StudentCentralizedForums />
    </Container>
  );
};

export default StudentForumPage;
