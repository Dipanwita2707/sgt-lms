import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  Container,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getCourseStudents } from '../../api/teacherApi';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

const CourseStudents = ({ token, user }) => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const data = await getCourseStudents(courseId, token);
        setStudents(data.students || []);
        setFilteredStudents(data.students || []);
        setCourseTitle(data.courseTitle || 'Course');
        setError(null);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    
    if (courseId && token) {
      fetchStudents();
    }
  }, [courseId, token]);
  
  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(student => {
        const searchValue = searchTerm.toLowerCase();
        return (
          (student.name && student.name.toLowerCase().includes(searchValue)) ||
          (student.email && student.email.toLowerCase().includes(searchValue)) ||
          (student.studentId && student.studentId.toLowerCase().includes(searchValue))
        );
      });
      setFilteredStudents(filtered);
      setPage(0); // Reset to first page when filtering
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const clearSearch = () => {
    setSearchTerm('');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {courseTitle}: Students
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          View and manage students enrolled in this course
        </Typography>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by name, email, or student ID"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton onClick={clearSearch} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>
      
      {filteredStudents.length === 0 ? (
        <Alert severity="info">
          {searchTerm 
            ? 'No students match your search criteria' 
            : 'No students are enrolled in this course yet'}
        </Alert>
      ) : (
        <Paper sx={{ width: '100%' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Enrollment Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((student) => (
                    <TableRow key={student._id}>
                      <TableCell>{student.studentId || 'N/A'}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        {student.progress ? `${student.progress}%` : 'Not started'}
                      </TableCell>
                      <TableCell>
                        {student.enrollmentDate 
                          ? new Date(student.enrollmentDate).toLocaleDateString() 
                          : 'N/A'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredStudents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}
    </Container>
  );
};

export default CourseStudents;
