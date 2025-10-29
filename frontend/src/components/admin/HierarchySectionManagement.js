import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Avatar,
  FormHelperText,
  Checkbox,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  School as SchoolIcon,
  Domain as DepartmentIcon,
  Book as CourseIcon,
  Group as SectionIcon,
  Person as PersonIcon,
  Groups as StudentsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import {
  createSectionWithCourses,
  assignStudentsToSection,
  assignTeacherToSection,
  getAllSchools,
  getDepartmentsBySchool,
  getCoursesByDepartment,
  getTeachersByDepartment,
  getStudentsBySchool
} from '../../api/hierarchyApi';

const HierarchySectionManagement = () => {
  const [sections, setSections] = useState([]);
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [createSectionDialog, setCreateSectionDialog] = useState(false);
  const [assignStudentsDialog, setAssignStudentsDialog] = useState(false);
  const [assignTeacherDialog, setAssignTeacherDialog] = useState(false);
  
  // Form states
  const [sectionForm, setSectionForm] = useState({
    name: '',
    school: '',
    department: '',
    courses: [],
    teacher: '',
    capacity: 80,
    academicYear: new Date().getFullYear().toString(),
    semester: 'Fall'
  });
  
  const [selectedSectionForStudents, setSelectedSectionForStudents] = useState('');
  const [selectedSectionForTeacher, setSelectedSectionForTeacher] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (sectionForm.school) {
      loadDepartments(sectionForm.school);
      loadStudents(sectionForm.school);
    }
  }, [sectionForm.school]);

  useEffect(() => {
    if (sectionForm.department) {
      loadCourses(sectionForm.department);
      loadTeachers(sectionForm.department);
    }
  }, [sectionForm.department]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const schoolsData = await getAllSchools();
      setSchools(schoolsData);
      // Load existing sections would go here
    } catch (err) {
      setError('Failed to load initial data');
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async (schoolId) => {
    try {
      const departmentsData = await getDepartmentsBySchool(schoolId);
      setDepartments(departmentsData);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const loadCourses = async (departmentId) => {
    try {
      const coursesData = await getCoursesByDepartment(departmentId);
      setCourses(coursesData);
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  };

  const loadTeachers = async (departmentId) => {
    try {
      const teachersData = await getTeachersByDepartment(departmentId);
      setTeachers(teachersData);
    } catch (err) {
      console.error('Error loading teachers:', err);
    }
  };

  const loadStudents = async (schoolId) => {
    try {
      const studentsData = await getStudentsBySchool(schoolId);
      setStudents(studentsData);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const handleCreateSection = async () => {
    if (!sectionForm.name || !sectionForm.school) {
      setError('Section name and school are required');
      return;
    }

    try {
      setActionLoading(true);
      const sectionData = {
        name: sectionForm.name,
        schoolId: sectionForm.school,
        departmentId: sectionForm.department || null,
        courseIds: sectionForm.courses,
        teacherId: sectionForm.teacher || null,
        capacity: parseInt(sectionForm.capacity),
        academicYear: sectionForm.academicYear,
        semester: sectionForm.semester
      };

      await createSectionWithCourses(sectionData);
      setSuccess('Section created successfully');
      setCreateSectionDialog(false);
      resetSectionForm();
      // Reload sections list
    } catch (err) {
      setError(err.message || 'Failed to create section');
      console.error('Error creating section:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignStudents = async () => {
    if (!selectedSectionForStudents || selectedStudents.length === 0) {
      setError('Please select a section and at least one student');
      return;
    }

    try {
      setActionLoading(true);
      await assignStudentsToSection(selectedSectionForStudents, selectedStudents);
      setSuccess('Students assigned successfully');
      setAssignStudentsDialog(false);
      setSelectedSectionForStudents('');
      setSelectedStudents([]);
    } catch (err) {
      setError(err.message || 'Failed to assign students');
      console.error('Error assigning students:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedSectionForTeacher || !selectedTeacher) {
      setError('Please select a section and teacher');
      return;
    }

    try {
      setActionLoading(true);
      await assignTeacherToSection(selectedSectionForTeacher, selectedTeacher);
      setSuccess('Teacher assigned successfully');
      setAssignTeacherDialog(false);
      setSelectedSectionForTeacher('');
      setSelectedTeacher('');
    } catch (err) {
      setError(err.message || 'Failed to assign teacher');
      console.error('Error assigning teacher:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const resetSectionForm = () => {
    setSectionForm({
      name: '',
      school: '',
      department: '',
      courses: [],
      teacher: '',
      capacity: 80,
      academicYear: new Date().getFullYear().toString(),
      semester: 'Fall'
    });
    setDepartments([]);
    setCourses([]);
    setTeachers([]);
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SectionIcon color="primary" />
          Section Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateSectionDialog(true)}
          >
            Create Section
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssignIcon />}
            onClick={() => setAssignStudentsDialog(true)}
          >
            Assign Students
          </Button>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={() => setAssignTeacherDialog(true)}
          >
            Assign Teacher
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Create Section Dialog */}
      <Dialog 
        open={createSectionDialog} 
        onClose={() => setCreateSectionDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Create New Section</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Section Name"
                value={sectionForm.name}
                onChange={(e) => setSectionForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>School</InputLabel>
                <Select
                  value={sectionForm.school}
                  label="School"
                  onChange={(e) => setSectionForm(prev => ({ ...prev, school: e.target.value, department: '', courses: [] }))}
                >
                  {schools.map((school) => (
                    <MenuItem key={school._id} value={school._id}>
                      {school.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department (Optional)</InputLabel>
                <Select
                  value={sectionForm.department}
                  label="Department (Optional)"
                  onChange={(e) => setSectionForm(prev => ({ ...prev, department: e.target.value, courses: [] }))}
                  disabled={!sectionForm.school}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Leave empty for school-wide sections</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={sectionForm.teacher}
                  label="Teacher"
                  onChange={(e) => setSectionForm(prev => ({ ...prev, teacher: e.target.value }))}
                  disabled={!sectionForm.department}
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher._id} value={teacher._id}>
                      {teacher.name} ({teacher.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Courses</InputLabel>
                <Select
                  multiple
                  value={sectionForm.courses}
                  label="Courses"
                  onChange={(e) => setSectionForm(prev => ({ ...prev, courses: e.target.value }))}
                  disabled={!sectionForm.department}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const course = courses.find(c => c._id === value);
                        return <Chip key={value} label={course?.title || value} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.title} ({course.code})
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select multiple courses for this section</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Capacity"
                type="number"
                value={sectionForm.capacity}
                onChange={(e) => setSectionForm(prev => ({ ...prev, capacity: e.target.value }))}
                inputProps={{ min: 1, max: 200 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Academic Year"
                value={sectionForm.academicYear}
                onChange={(e) => setSectionForm(prev => ({ ...prev, academicYear: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Semester</InputLabel>
                <Select
                  value={sectionForm.semester}
                  label="Semester"
                  onChange={(e) => setSectionForm(prev => ({ ...prev, semester: e.target.value }))}
                >
                  <MenuItem value="Fall">Fall</MenuItem>
                  <MenuItem value="Spring">Spring</MenuItem>
                  <MenuItem value="Summer">Summer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSectionDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateSection}
            variant="contained"
            disabled={!sectionForm.name || !sectionForm.school || actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            Create Section
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Students Dialog */}
      <Dialog 
        open={assignStudentsDialog} 
        onClose={() => setAssignStudentsDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Assign Students to Section</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
            <InputLabel>Select Section</InputLabel>
            <Select
              value={selectedSectionForStudents}
              label="Select Section"
              onChange={(e) => setSelectedSectionForStudents(e.target.value)}
            >
              {/* Sections would be loaded here */}
            </Select>
          </FormControl>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Available Students ({students.length})
          </Typography>
          
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {students.map((student) => (
              <ListItem key={student._id} button onClick={() => handleStudentSelection(student._id)}>
                <ListItemIcon>
                  <Checkbox
                    checked={selectedStudents.includes(student._id)}
                    onChange={() => handleStudentSelection(student._id)}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={student.name}
                  secondary={`${student.email} | Student ID: ${student.studentId}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignStudentsDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAssignStudents}
            variant="contained"
            disabled={!selectedSectionForStudents || selectedStudents.length === 0 || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : `Assign ${selectedStudents.length} Students`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog 
        open={assignTeacherDialog} 
        onClose={() => setAssignTeacherDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Assign Teacher to Section</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Select Section</InputLabel>
            <Select
              value={selectedSectionForTeacher}
              label="Select Section"
              onChange={(e) => setSelectedSectionForTeacher(e.target.value)}
            >
              {/* Sections would be loaded here */}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Select Teacher</InputLabel>
            <Select
              value={selectedTeacher}
              label="Select Teacher"
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              {teachers.map((teacher) => (
                <MenuItem key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTeacherDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAssignTeacher}
            variant="contained"
            disabled={!selectedSectionForTeacher || !selectedTeacher || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Assign Teacher'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sections List */}
      <Paper sx={{ mt: 3, p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Existing Sections
        </Typography>
        
        {/* Section cards would be rendered here */}
        <Typography variant="body1" color="textSecondary">
          No sections found. Create your first section using the "Create Section" button above.
        </Typography>
      </Paper>
    </Box>
  );
};

export default HierarchySectionManagement;