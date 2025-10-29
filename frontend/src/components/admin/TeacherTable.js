
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
  Tooltip
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

const TeacherTable = ({ teachers, onResetPassword, onDeactivate, onAssignCourse }) => {
  const [search, setSearch] = useState('');

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(search.toLowerCase()) ||
    teacher.email.toLowerCase().includes(search.toLowerCase()) ||
    (teacher.uid && teacher.uid.toLowerCase().includes(search.toLowerCase())) ||
    (teacher.teacherId && teacher.teacherId.toLowerCase().includes(search.toLowerCase()))
  );
  
  // Format school
  const formatSchool = (school) => {
    if (!school) return <span style={{ color: '#999' }}>No School</span>;
    return typeof school === 'object' ? school.name : school;
  };
  
  // Format department
  const formatDepartment = (department) => {
    if (!department) return <span style={{ color: '#999' }}>No Department</span>;
    return typeof department === 'object' ? department.name : department;
  };
  
  // Format sections - show section names
  const formatSections = (sections) => {
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return <span style={{ color: '#999' }}>No sections</span>;
    };
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {sections.slice(0, 3).map((section, index) => (
          <Tooltip 
            key={index} 
            title={typeof section === 'object' ? section.name : section}
          >
            <Chip 
              label={typeof section === 'object' ? section.name : section} 
              size="small" 
              color="secondary"
              variant="outlined"
              sx={{ margin: '2px' }} 
            />
          </Tooltip>
        ))}
        {sections.length > 3 && (
          <Chip 
            label={`+${sections.length - 3}`} 
            size="small" 
            color="secondary"
            variant="filled"
          />
        )}
      </Box>
    );
  };
  
  // Format assigned courses - show from section-course assignments
  const formatCourses = (courses) => {
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return <span style={{ color: '#999' }}>No courses</span>;
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {courses.slice(0, 3).map((course, index) => (
          <Tooltip 
            key={index} 
            title={course.title || (typeof course === 'string' ? course : 'Unknown')}
          >
            <Chip 
              label={course.courseCode || course.code || (typeof course === 'string' ? 'Course' : 'Unknown')} 
              size="small" 
              color="primary"
              variant="outlined"
              sx={{ margin: '2px' }} 
            />
          </Tooltip>
        ))}
        {courses.length > 3 && (
          <Chip 
            label={`+${courses.length - 3}`} 
            size="small" 
            color="primary"
            variant="filled"
          />
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <input
        type="text"
        placeholder="Search by UID, name, or email"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 8, padding: 6, width: '100%', maxWidth: 300 }}
      />
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="teacher table" size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>UID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>School</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Sections</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Courses</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 280 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTeachers.map((teacher) => (
              <TableRow key={teacher._id} hover>
                <TableCell>{teacher.uid || teacher.teacherId || 'N/A'}</TableCell>
                <TableCell>{teacher.name}</TableCell>
                <TableCell sx={{ fontSize: '0.875rem' }}>{teacher.email}</TableCell>
                <TableCell>{formatSchool(teacher.school)}</TableCell>
                <TableCell>{formatDepartment(teacher.department)}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>{formatSections(teacher.sections)}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>{formatCourses(teacher.coursesAssigned)}</TableCell>
                <TableCell>
                  <Chip 
                    label={teacher.isActive ? 'Active' : 'Inactive'} 
                    color={teacher.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => onResetPassword(teacher._id)}
                    >
                      Reset Password
                    </Button>
                    <Button 
                      size="small" 
                      color="error" 
                      variant="outlined"
                      onClick={() => onDeactivate(teacher._id)}
                      disabled={!teacher.isActive}
                    >
                      Deactivate
                    </Button>
                    <Button 
                      size="small" 
                      color="primary"
                      variant="contained"
                      startIcon={<AssignmentIcon />} 
                      onClick={() => onAssignCourse(teacher)}
                      disabled={!teacher.isActive}
                    >
                      Assign
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TeacherTable;
