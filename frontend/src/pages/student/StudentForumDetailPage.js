import React from 'react';
import { useParams } from 'react-router-dom';
import StudentForumDetail from '../../components/student/StudentForumDetail';
import { Container, Typography, Box, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const StudentForumDetailPage = () => {
  const { forumId } = useParams();
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/forums" color="inherit">
          Forums
        </Link>
        <Typography color="text.primary">Forum Detail</Typography>
      </Breadcrumbs>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Forum Discussion
        </Typography>
      </Box>
      
      <StudentForumDetail />
    </Container>
  );
};

export default StudentForumDetailPage;
