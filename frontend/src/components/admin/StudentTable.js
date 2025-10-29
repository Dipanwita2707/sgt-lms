
import React, { useState, useEffect } from 'react';
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
  Typography,
  TextField,
  InputAdornment,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getCourses } from '../../api/courseApi';

const StudentTable = ({ students, onEdit, onRemove }) => {
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch courses to display course names instead of IDs
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        const coursesData = await getCourses(token);
        setCourses(coursesData);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Map course IDs to course names
  const getCourseNameById = (course) => {
    // Handle both populated course objects and course IDs
    if (typeof course === 'object' && course.courseCode && course.title) {
      return `${course.courseCode}: ${course.title}`;
    } else if (typeof course === 'string') {
      const foundCourse = courses.find(c => c._id === course);
      return foundCourse ? `${foundCourse.code}: ${foundCourse.title}` : course;
    }
    return course;
  };

  const getCourseCode = (course) => {
    // Handle both populated course objects and course IDs
    if (typeof course === 'object' && course.courseCode) {
      return course.courseCode;
    } else if (typeof course === 'string') {
      const foundCourse = courses.find(c => c._id === course);
      return foundCourse ? foundCourse.code : (course.length > 8 ? course.substring(0, 8) + '...' : course);
    }
    return String(course);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    student.email.toLowerCase().includes(search.toLowerCase()) ||
    (student.regNo && student.regNo.toLowerCase().includes(search.toLowerCase())) ||
    (student.school?.name && student.school.name.toLowerCase().includes(search.toLowerCase())) ||
    (student.school?.code && student.school.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Box sx={{ mt: 2 }}>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder="Search by name, email, reg no, or school"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />
      <TableContainer component={Paper} sx={{ maxHeight: 600, boxShadow: 2 }}>
        <Table stickyHeader aria-label="student table">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Reg No</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>School</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Courses</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow 
                key={student._id}
                sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
              >
                <TableCell>{student.regNo}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>
                  {student.school ? (
                    <Chip 
                      label={`${student.school.name} (${student.school.code})`} 
                      size="small" 
                      color="secondary" 
                      variant="outlined" 
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No School Assigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {student.coursesAssigned && student.coursesAssigned.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {student.coursesAssigned.map((course, index) => (
                        <Tooltip 
                          key={index} 
                          title={getCourseNameById(course)}
                          arrow
                        >
                          <Chip
                            label={getCourseCode(course)}
                            size="small"
                            sx={{ 
                              backgroundColor: 'rgba(25, 118, 210, 0.08)',
                              borderRadius: 1,
                              '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.12)' }
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No courses assigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={student.isActive ? 'Active' : 'Inactive'} 
                    size="small"
                    color={student.isActive ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => onEdit(student)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    color="error" 
                    onClick={() => onRemove(student._id)}
                  >
                    Remove
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

export default StudentTable;
