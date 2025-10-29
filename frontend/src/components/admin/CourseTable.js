
import React, { useState } from 'react';
import { 
  Button, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  Tooltip, 
  Typography,
  Link,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';

const CourseTable = ({ courses, onEdit, onDelete, onViewDetails }) => {
  const [search, setSearch] = useState('');

  const formatTeachers = (teachers) => {
    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return '-';
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {teachers.map((teacher, index) => (
          <Tooltip key={index} title={`${teacher.name} (${teacher.email})`}>
            <Chip 
              label={teacher.teacherId || teacher.name} 
              size="small" 
              sx={{ margin: '2px' }} 
            />
          </Tooltip>
        ))}
      </Box>
    );
  };

  const filteredCourses = courses.filter(course => {
    const searchLower = search.toLowerCase();
    return (
      (course.courseCode && course.courseCode.toLowerCase().includes(searchLower)) ||
      course.title.toLowerCase().includes(searchLower) ||
      (course.teachers && Array.isArray(course.teachers) && 
        course.teachers.some(teacher => 
          (teacher.name && teacher.name.toLowerCase().includes(searchLower)) ||
          (teacher.email && teacher.email.toLowerCase().includes(searchLower)) ||
          (teacher.teacherId && teacher.teacherId.toLowerCase().includes(searchLower))
        )
      )
    );
  });

  return (
    <Box sx={{ mt: 2 }}>
      <TextField
        placeholder="Search by course code, title or teacher"
        value={search}
        onChange={e => setSearch(e.target.value)}
        variant="outlined"
        size="small"
        sx={{ marginBottom: 2, width: '100%', maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      <TableContainer component={Paper} sx={{ maxHeight: 600, boxShadow: 3 }}>
        <Table stickyHeader aria-label="course table">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Course Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Teachers</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCourses.map((course) => (
              <TableRow 
                key={course._id}
                sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" color="primary">
                    {course.courseCode || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => onViewDetails(course._id)}
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'primary.main',
                      fontWeight: 'medium',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {course.title}
                  </Link>
                </TableCell>
                <TableCell>{course.description}</TableCell>
                <TableCell>{formatTeachers(course.teachers)}</TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => onViewDetails(course._id)}
                    sx={{ mr: 1 }}
                  >
                    Details
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => onEdit(course)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    color="error" 
                    onClick={() => onDelete(course._id)}
                  >
                    Delete
                  </Button>

                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CourseTable;
