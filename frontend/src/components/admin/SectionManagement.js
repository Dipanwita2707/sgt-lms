import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import { 
  Add as AddIcon, 
  People as PeopleIcon, 
  School as SchoolIcon,
  Info as InfoIcon,
  PersonAdd as PersonAddIcon,
  LibraryBooks as LibraryBooksIcon,
  Close as CloseIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import * as sectionApi from '../../api/sectionApi';
import { teacherAssignmentApi } from '../../api/teacherAssignmentApi';
import { 
  getAllSchools,
  getDepartmentsBySchool,
  getCoursesByDepartment,
  getTeachersByDepartment,
  getStudentsBySchool,
  createSectionWithCourses
} from '../../api/hierarchyApi';
import { useNavigate } from 'react-router-dom';
import BulkAssignCourses from './BulkAssignCourses';
import BulkAssignTeachers from './BulkAssignTeachers';
import BulkUploadSections from './BulkUploadSections';
import axios from 'axios';

const SectionManagement = ({ user, token }) => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openStudentAssignDialog, setOpenStudentAssignDialog] = useState(false);
  const [openCourseAssignDialog, setOpenCourseAssignDialog] = useState(false);
  const [openTeacherAssignDialog, setOpenTeacherAssignDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [detailsTab, setDetailsTab] = useState(0);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [selectedStudentsToAssign, setSelectedStudentsToAssign] = useState([]);
  const [selectedCoursesToAssign, setSelectedCoursesToAssign] = useState([]);
  const [selectedTeacherToAssign, setSelectedTeacherToAssign] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Course-Teacher Assignment state
  const [courseTeacherAssignments, setCourseTeacherAssignments] = useState([]);
  const [unassignedCourses, setUnassignedCourses] = useState([]);
  const [openCourseTeacherDialog, setOpenCourseTeacherDialog] = useState(false);
  const [selectedCourseForTeacher, setSelectedCourseForTeacher] = useState('');
  const [selectedTeacherForCourse, setSelectedTeacherForCourse] = useState('');
  
  // New state for school-wise filtering
  const [selectedSchoolForView, setSelectedSchoolForView] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    schoolId: '',
    departmentId: '',
    courseId: '', // Changed from courseIds to courseId to match the form
    teacherId: '',
    studentIds: [],
    capacity: 80,
    semester: 'Fall',
    year: new Date().getFullYear()
  });

  // Helper function to count teachers in a section
  const getSectionTeachersCount = (section) => {
    if (!section || !section.courses) return 0;
    // Count unique teachers across all courses in this section
    const teacherIds = new Set();
    section.courses.forEach(course => {
      if (course.assignedTeachers && course.assignedTeachers.length > 0) {
        course.assignedTeachers.forEach(teacher => {
          teacherIds.add(teacher._id);
        });
      }
    });
    return teacherIds.size;
  };

  // Fetch initial data
  useEffect(() => {
    fetchSchools();
    fetchAllSections();
  }, []);

  // Filter sections when selected school changes
  useEffect(() => {
    if (selectedSchoolForView) {
      const filtered = allSections.filter(section => section.school?._id === selectedSchoolForView);
      setSections(filtered);
    } else {
      setSections(allSections);
    }
  }, [selectedSchoolForView, allSections]);

  // Fetch students when school changes
  useEffect(() => {
    if (formData.schoolId) {
      fetchStudents();
    }
  }, [formData.schoolId]);

  const fetchSchools = async () => {
    try {
      const data = await getAllSchools();
      setSchools(data);
    } catch (err) {
      setError('Failed to fetch schools');
    }
  };

  const fetchAllSections = async () => {
    try {
      console.log('Fetching sections...');
      const currentToken = token || localStorage.getItem('token');
      console.log('Using token:', currentToken ? 'Token exists' : 'No token');
      const data = await sectionApi.getAllSections();
      console.log('Sections received:', data);
      setAllSections(data);
      setSections(data);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError('Failed to fetch sections: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchStudents = async () => {
    try {
      if (formData.schoolId) {
        const data = await getStudentsBySchool(formData.schoolId);
        setStudents(data);
      }
    } catch (err) {
      setError('Failed to fetch students');
    }
  };

  // Fetch available students for assignment (not already in any section)
  const fetchAvailableStudents = async (schoolId) => {
    try {
      if (!schoolId) return;
      
      const available = await sectionApi.getAvailableStudents(schoolId);
      setAvailableStudents(available);
    } catch (err) {
      console.error('Error fetching available students:', err);
      setError('Failed to fetch available students: ' + (err.response?.data?.message || err.message));
    }
  };

  // Fetch available courses for assignment
  const fetchAvailableCourses = async (schoolId, departmentId) => {
    try {
      if (!schoolId) return;
      
      let courses = [];
      if (departmentId) {
        courses = await getCoursesByDepartment(departmentId);
      } else {
        // Get all courses for the school
        const schools = await getAllSchools();
        const school = schools.find(s => s._id === schoolId);
        if (school && school.departments) {
          for (const dept of school.departments) {
            const deptCourses = await getCoursesByDepartment(dept._id);
            courses.push(...deptCourses);
          }
        }
      }
      
      setAvailableCourses(courses);
    } catch (err) {
      setError('Failed to fetch available courses');
    }
  };

  // Fetch available teachers for assignment
  const fetchAvailableTeachers = async (departmentId) => {
    try {
      if (!departmentId) return;
      
      // Use new teacher assignment API to get teachers with proper role validation
      const response = await teacherAssignmentApi.getAvailableTeachers(departmentId);
      if (response.success) {
        setAvailableTeachers(response.teachers || []);
      } else {
        // Fallback to old method if new API is not available
        const teachers = await getTeachersByDepartment(departmentId);
        // Filter only teachers with 'teacher' role
        const validTeachers = teachers.filter(teacher => {
          return (teacher.roles && teacher.roles.includes('teacher')) || teacher.role === 'teacher';
        });
        setAvailableTeachers(validTeachers);
      }
    } catch (err) {
      console.error('Error fetching available teachers:', err);
      // Fallback to old method
      try {
        const teachers = await getTeachersByDepartment(departmentId);
        const validTeachers = teachers.filter(teacher => {
          return (teacher.roles && teacher.roles.includes('teacher')) || teacher.role === 'teacher';
        });
        setAvailableTeachers(validTeachers);
      } catch (fallbackErr) {
        setError('Failed to fetch available teachers: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const fetchDepartmentsBySchool = async (schoolId) => {
    try {
      const data = await getDepartmentsBySchool(schoolId);
      setDepartments(data);
    } catch (err) {
      setError('Failed to fetch departments');
    }
  };

  const fetchCoursesByDepartment = async (departmentId) => {
    try {
      const data = await getCoursesByDepartment(departmentId);
      setCourses(data);
    } catch (err) {
      setError('Failed to fetch courses');
    }
  };

  const fetchTeachersByDepartment = async (departmentId) => {
    try {
      const data = await getTeachersByDepartment(departmentId);
      setTeachers(data);
    } catch (err) {
      setError('Failed to fetch teachers');
    }
  };

  const fetchSectionsByCourse = async (courseId) => {
    try {
      const data = await sectionApi.getSectionsByCourse(courseId);
      setSections(data);
    } catch (err) {
      setError('Failed to fetch sections');
    }
  };

  const handleSchoolChange = (schoolId) => {
    setFormData({ ...formData, schoolId, departmentId: '', courseId: '', teacherId: '', studentIds: [] });
    setDepartments([]);
    setCourses([]);
    setTeachers([]);
    setStudents([]);
    if (schoolId) {
      fetchDepartmentsBySchool(schoolId);
      fetchStudents(); // Fetch students when school is selected
    }
  };

  const handleDepartmentChange = (departmentId) => {
    setFormData({ ...formData, departmentId, courseId: '', teacherId: '' });
    setCourses([]);
    setTeachers([]);
    if (departmentId) {
      fetchCoursesByDepartment(departmentId);
      fetchTeachersByDepartment(departmentId);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      const sectionData = {
        name: formData.name,
        schoolId: formData.schoolId,
        departmentId: formData.departmentId,
        courseIds: formData.courseId ? [formData.courseId] : [], // Convert single course to array
        teacherId: formData.teacherId,
        studentIds: formData.studentIds,
        capacity: formData.capacity,
        semester: formData.semester,
        year: formData.year
      };
      
      // Use section API for section creation
      await sectionApi.createSection(sectionData);
      setSuccess('Section created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        schoolId: '',
        departmentId: '',
        courseId: '',
        teacherId: '',
        studentIds: [],
        capacity: 80,
        semester: 'Fall',
        year: new Date().getFullYear()
      });
      setOpenDialog(false);
      
      // Refresh sections list
      fetchAllSections();
    } catch (err) {
      setError(err.message || 'Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  // Assignment handlers for section details
  const handleAssignStudent = async (studentId) => {
    try {
      setLoading(true);
      setError('');
      
      await sectionApi.assignStudentToSection(selectedSection._id, studentId);
      setSuccess('Student assigned successfully!');
      
      // Refresh sections and update selected section
      await fetchAllSections();
      const updatedSection = await sectionApi.getAllSections();
      const updated = updatedSection.find(s => s._id === selectedSection._id);
      setSelectedSection(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign student');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      setLoading(true);
      setError('');
      
      await sectionApi.removeStudentFromSection(selectedSection._id, studentId);
      setSuccess('Student removed successfully!');
      
      // Refresh sections and update selected section
      await fetchAllSections();
      const updatedSections = await sectionApi.getAllSections();
      const updated = updatedSections.find(s => s._id === selectedSection._id);
      setSelectedSection(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove student');
    } finally {
      setLoading(false);
    }
  };

  // Handle remove teacher
  const handleRemoveTeacher = async () => {
    try {
      setLoading(true);
      setError('');
      
      await sectionApi.removeTeacherFromSection(selectedSection._id);
      setSuccess('Teacher removed successfully!');
      
      // Refresh sections and update selected section
      await fetchAllSections();
      const updatedSections = await sectionApi.getAllSections();
      const updated = updatedSections.find(s => s._id === selectedSection._id);
      setSelectedSection(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCourses = async (courseIds) => {
    try {
      setLoading(true);
      setError('');
      
      await sectionApi.assignCoursesToSection(selectedSection._id, courseIds);
      setSuccess('Courses assigned successfully!');
      
      // Refresh sections and update selected section
      await fetchAllSections();
      const updatedSections = await sectionApi.getAllSections();
      const updated = updatedSections.find(s => s._id === selectedSection._id);
      setSelectedSection(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign courses');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCourse = async (courseId) => {
    try {
      setLoading(true);
      setError('');
      
      await sectionApi.removeCoursesFromSection(selectedSection._id, [courseId]);
      setSuccess('Course removed successfully!');
      
      // Refresh sections and update selected section
      await fetchAllSections();
      const updatedSections = await sectionApi.getAllSections();
      const updated = updatedSections.find(s => s._id === selectedSection._id);
      setSelectedSection(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove course');
    } finally {
      setLoading(false);
    }
  };

  // Open student assignment dialog
  const openStudentAssignment = async () => {
    if (!selectedSection) return;
    
    await fetchAvailableStudents(selectedSection.school._id);
    setSelectedStudentsToAssign([]);
    setOpenStudentAssignDialog(true);
  };

  // Open course assignment dialog
  const openCourseAssignment = async () => {
    if (!selectedSection) return;
    
    await fetchAvailableCourses(selectedSection.school._id, selectedSection.department?._id);
    setSelectedCoursesToAssign([]);
    setOpenCourseAssignDialog(true);
  };

  // Open teacher assignment dialog
  const openTeacherAssignment = async () => {
    if (!selectedSection) return;
    
    await fetchAvailableTeachers(selectedSection.department?._id);
    setSelectedTeacherToAssign('');
    setOpenTeacherAssignDialog(true);
  };

  // Handle bulk student assignment
  const handleBulkStudentAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      
      for (const studentId of selectedStudentsToAssign) {
        await sectionApi.assignStudentToSection(selectedSection._id, studentId);
      }
      
      setSuccess(`${selectedStudentsToAssign.length} students assigned successfully!`);
      setOpenStudentAssignDialog(false);
      
      // Refresh sections and update selected section
      await fetchAllSections();
      const updatedSections = await sectionApi.getAllSections();
      const updated = updatedSections.find(s => s._id === selectedSection._id);
      setSelectedSection(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign students');
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk course assignment
  const handleBulkCourseAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      
      await sectionApi.assignCoursesToSection(selectedSection._id, selectedCoursesToAssign);
      setSuccess(`${selectedCoursesToAssign.length} courses assigned successfully!`);
      setOpenCourseAssignDialog(false);
      
      // Refresh sections and update selected section
      await fetchAllSections();
      const updatedSections = await sectionApi.getAllSections();
      const updated = updatedSections.find(s => s._id === selectedSection._id);
      setSelectedSection(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign courses');
    } finally {
      setLoading(false);
    }
  };

  // Handle teacher assignment
  const handleTeacherAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      
      await sectionApi.assignTeacherToSection(selectedSection._id, selectedTeacherToAssign);
      setSuccess('Teacher assigned successfully!');
      setOpenTeacherAssignDialog(false);
      
      // Refresh sections and update selected section
      await fetchAllSections();
      const updatedSections = await sectionApi.getAllSections();
      const updated = updatedSections.find(s => s._id === selectedSection._id);
      setSelectedSection(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign teacher');
    } finally {
      setLoading(false);
    }
  };

  // ============ BULK UPLOAD FUNCTIONS ============

  // Handle bulk section upload
  const handleBulkSectionUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/section/bulk-upload`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Refresh sections
    await fetchAllSections();
    return response.data;
  };

  // ============ COURSE-TEACHER ASSIGNMENT FUNCTIONS ============

  // Handle bulk course upload
  const handleBulkCourseUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/section/bulk-course-assignment`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Refresh sections
    await fetchAllSections();
    return response.data;
  };

  // Handle bulk teacher upload
  const handleBulkTeacherUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/section/bulk-teacher-assignment`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    // Refresh sections
    await fetchAllSections();
    return response.data;
  };

  // Fetch course-teacher assignments for a section
  const fetchCourseTeacherAssignments = async (sectionId) => {
    try {
      // Use new teacher assignment API
      const response = await teacherAssignmentApi.getSectionAssignments(sectionId);
      setCourseTeacherAssignments(response.assignments || []);
    } catch (err) {
      console.error('Failed to fetch course-teacher assignments:', err);
      // If new API fails, try to show helpful message about migration
      if (err.response?.status === 410) {
        setError('Teacher assignment system has been updated. Please refresh the page.');
      }
      setCourseTeacherAssignments([]);
    }
  };

  // Fetch unassigned courses for a section
  const fetchUnassignedCourses = async (sectionId) => {
    try {
      // Get section details to find unassigned courses
      const section = allSections.find(s => s._id === sectionId);
      if (!section) return;
      
      // Get assignments for this section
      const assignmentsResponse = await teacherAssignmentApi.getSectionAssignments(sectionId);
      const assignedCourseIds = (assignmentsResponse.assignments || []).map(a => a.course?._id).filter(Boolean);
      
      // Filter section courses to find unassigned ones
      const unassigned = (section.courses || []).filter(course => 
        !assignedCourseIds.includes(course._id)
      );
      
      console.log('Unassigned courses with department info:', unassigned);
      setUnassignedCourses(unassigned);
    } catch (err) {
      console.error('Failed to fetch unassigned courses:', err);
      if (err.response?.status === 410) {
        setError('Teacher assignment system has been updated. Please refresh the page.');
      }
      setUnassignedCourses([]);
    }
  };

  // Open course-teacher assignment dialog
  const openCourseTeacherAssignment = async () => {
    if (!selectedSection) return;
    
    // Only fetch assignments and unassigned courses initially
    // Teachers will be fetched when a course is selected
    await Promise.all([
      fetchCourseTeacherAssignments(selectedSection._id),
      fetchUnassignedCourses(selectedSection._id)
    ]);
    
    setSelectedCourseForTeacher('');
    setSelectedTeacherForCourse('');
    setAvailableTeachers([]); // Clear teachers until a course is selected
    setOpenCourseTeacherDialog(true);
  };

  // Load teachers when a course is selected (enhanced with section context)
  useEffect(() => {
    const loadTeachersForSelectedCourse = async () => {
      if (!selectedCourseForTeacher || !unassignedCourses.length || !selectedSection) return;
      
      try {
        // Use enhanced API that filters by department and excludes already assigned teachers
        const response = await sectionApi.getAvailableTeachersForSectionCourse(
          selectedCourseForTeacher, 
          selectedSection._id,
          localStorage.getItem('token')
        );
        
        console.log(`Loaded ${response.teachers.length} available teachers from ${response.course.department?.name} department`);
        setAvailableTeachers(response.teachers || []);
        
        // Show department info to user
        const selectedCourse = unassignedCourses.find(course => course._id === selectedCourseForTeacher);
        if (selectedCourse && response.course.department) {
          console.log(`Course: ${response.course.title}, Department: ${response.course.department.name}`);
        }
      } catch (err) {
        console.error('Failed to load teachers for course:', err);
        setError(`Failed to load teachers: ${err.response?.data?.message || err.message}`);
        setAvailableTeachers([]);
      }
    };
    
    loadTeachersForSelectedCourse();
  }, [selectedCourseForTeacher, unassignedCourses, selectedSection]);

  // Handle course-teacher assignment
  const handleCourseTeacherAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!selectedCourseForTeacher || !selectedTeacherForCourse) {
        setError('Please select both a course and a teacher');
        return;
      }
      
      // Use HOD section-course assignment API
      const response = await teacherAssignmentApi.assignTeacherToSectionCourse(
        selectedSection._id,
        selectedCourseForTeacher,
        selectedTeacherForCourse
      );
      
      if (response.success) {
        setSuccess('Teacher assigned to course successfully!');
        
        // Refresh the assignments and unassigned courses
        await Promise.all([
          fetchCourseTeacherAssignments(selectedSection._id),
          fetchUnassignedCourses(selectedSection._id)
        ]);
        
        // Reset form
        setSelectedCourseForTeacher('');
        setSelectedTeacherForCourse('');
      } else {
        setError(response.message || 'Failed to assign teacher to course');
      }
      
    } catch (err) {
      console.error('Assignment error:', err);
      if (err.response?.status === 410) {
        setError('Teacher assignment system has been updated. The old method is no longer available. Please refresh the page to use the new system.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to assign teacher to course');
      }
    } finally {
      setLoading(false);
    }
  };

  // Remove course-teacher assignment
  const handleRemoveCourseTeacher = async (courseId) => {
    try {
      setLoading(true);
      setError('');
      
      // Find the assignment to remove
      const assignmentToRemove = courseTeacherAssignments.find(
        assignment => assignment.course?._id === courseId
      );
      
      if (!assignmentToRemove) {
        setError('Assignment not found');
        return;
      }
      
      // Use new teacher assignment API
      const response = await teacherAssignmentApi.removeAssignment({
        teacherId: assignmentToRemove.teacher._id,
        sectionId: selectedSection._id,
        courseId: courseId
      });
      
      if (response.success) {
        setSuccess('Teacher assignment removed successfully!');
        
        // Refresh the assignments and unassigned courses
        await Promise.all([
          fetchCourseTeacherAssignments(selectedSection._id),
          fetchUnassignedCourses(selectedSection._id)
        ]);
      } else {
        setError(response.message || 'Failed to remove teacher assignment');
      }
      
    } catch (err) {
      console.error('Remove assignment error:', err);
      if (err.response?.status === 410) {
        setError('Teacher assignment system has been updated. Please refresh the page to use the new system.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to remove teacher assignment');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Section Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage school sections, assign teachers and students to create organized learning groups.
        </Typography>

        {/* Debug Info */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Debug: {sections.length} sections loaded, {allSections.length} total sections
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Create Section
          </Button>
          <Button
            variant="outlined"
            onClick={fetchAllSections}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {/* School-wise Section Filter */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              View Sections by School
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Filter by School</InputLabel>
                  <Select
                    value={selectedSchoolForView}
                    onChange={(e) => setSelectedSchoolForView(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Schools</em>
                    </MenuItem>
                    {schools.map((school) => (
                      <MenuItem key={school._id} value={school._id}>
                        {school.name} ({school.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {selectedSchoolForView 
                    ? `Showing ${sections.length} sections from ${schools.find(s => s._id === selectedSchoolForView)?.name || 'selected school'}`
                    : `Showing all ${sections.length} sections`
                  }
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Bulk Section Upload */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Bulk Section Creation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create multiple sections at once using CSV file
          </Typography>
          
          <BulkUploadSections onUpload={handleBulkSectionUpload} />
        </Box>

        {/* Bulk Operations Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Bulk Course & Teacher Assignment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Assign courses and teachers to sections in bulk using CSV files
          </Typography>
          
          {/* Bulk Assign Courses */}
          <BulkAssignCourses onUpload={handleBulkCourseUpload} />
          
          {/* Bulk Assign Teachers */}
          <BulkAssignTeachers onUpload={handleBulkTeacherUpload} />
        </Box>

        {/* Sections Display */}
        <Grid container spacing={3}>
          {sections.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No sections found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSchoolForView 
                      ? 'No sections created for the selected school yet.'
                      : 'No sections have been created yet. Click "Create Section" to get started.'
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            sections.map((section) => (
              <Grid item xs={12} md={6} lg={4} key={section._id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {section.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      School: {section.school?.name || 'Not specified'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Department: {section.department?.name || 'School-wide'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Teachers: {getSectionTeachersCount(section)} assigned
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PeopleIcon sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="body2">
                        {section.students?.length || 0}/{section.capacity || 80} students
                      </Typography>
                    </Box>
                    {section.courses?.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Courses:
                        </Typography>
                        {section.courses.slice(0, 2).map((course) => (
                          <Chip
                            key={course._id}
                            label={course.title || course.courseCode}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                        {section.courses.length > 2 && (
                          <Chip
                            label={`+${section.courses.length - 2} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                    {section.students?.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Students:
                        </Typography>
                        {section.students.slice(0, 3).map((student) => (
                          <Chip
                            key={student._id}
                            label={student.name}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                        {section.students.length > 3 && (
                          <Chip
                            label={`+${section.students.length - 3} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<InfoIcon />}
                      onClick={() => {
                        console.log('Details button clicked for section:', section);
                        setSelectedSection(section);
                        setOpenDetailsDialog(true);
                      }}
                    >
                      Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>

        {/* Section Details Dialog */}
        <Dialog 
          open={openDetailsDialog} 
          onClose={() => setOpenDetailsDialog(false)} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Section Details: {selectedSection?.name}
              </Typography>
              <IconButton onClick={() => setOpenDetailsDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedSection && (
              <Box>
                <Tabs value={detailsTab} onChange={(e, newValue) => setDetailsTab(newValue)}>
                  <Tab label="Overview" />
                  <Tab label="Students" />
                  <Tab label="Courses" />
                  <Tab label="Course Teachers" />
                  <Tab label="Management" />
                </Tabs>
                
                {/* Overview Tab */}
                {detailsTab === 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Basic Information</Typography>
                          <Typography><strong>Name:</strong> {selectedSection.name}</Typography>
                          <Typography><strong>School:</strong> {selectedSection.school?.name || 'Not specified'}</Typography>
                          <Typography><strong>Department:</strong> {selectedSection.department?.name || 'School-wide'}</Typography>
                          <Typography><strong>Academic Year:</strong> {selectedSection.academicYear || 'Not specified'}</Typography>
                          <Typography><strong>Semester:</strong> {selectedSection.semester || 'Not specified'}</Typography>
                          <Typography><strong>Capacity:</strong> {selectedSection.capacity || 80}</Typography>
                          <Typography><strong>Status:</strong> {selectedSection.isActive ? 'Active' : 'Inactive'}</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Statistics</Typography>
                          <Box display="flex" alignItems="center" mb={1}>
                            <PeopleIcon sx={{ mr: 1 }} />
                            <Typography>
                              <strong>Students:</strong> {selectedSection.students?.length || 0}/{selectedSection.capacity || 80}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" mb={1}>
                            <LibraryBooksIcon sx={{ mr: 1 }} />
                            <Typography>
                              <strong>Courses:</strong> {selectedSection.courses?.length || 0}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" mb={1}>
                            <SchoolIcon sx={{ mr: 1 }} />
                            <Typography>
                              <strong>Course Assignments:</strong> See "Course Teachers" tab for details
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Students Tab */}
                {detailsTab === 1 && (
                  <Box sx={{ mt: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Students ({selectedSection.students?.length || 0}/{selectedSection.capacity || 80})
                      </Typography>
                      <Box>
                        <Button
                          startIcon={<PersonAddIcon />}
                          variant="outlined"
                          size="small"
                          sx={{ mr: 1 }}
                          onClick={openStudentAssignment}
                        >
                          Assign Students
                        </Button>
                      </Box>
                    </Box>
                    <List>
                      {selectedSection.students?.length > 0 ? (
                        selectedSection.students.map((student) => (
                          <ListItem key={student._id}>
                            <ListItemText
                              primary={student.name}
                              secondary={`${student.email} • Reg No: ${student.regNo || 'N/A'}`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton 
                                edge="end" 
                                aria-label="remove"
                                onClick={() => handleRemoveStudent(student._id)}
                                color="error"
                                size="small"
                              >
                                <CloseIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))
                      ) : (
                        <Typography color="text.secondary">No students assigned to this section</Typography>
                      )}
                    </List>
                  </Box>
                )}

                {/* Courses Tab */}
                {detailsTab === 2 && (
                  <Box sx={{ mt: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Courses ({selectedSection.courses?.length || 0})
                      </Typography>
                      <Button
                        startIcon={<LibraryBooksIcon />}
                        variant="outlined"
                        size="small"
                        onClick={openCourseAssignment}
                      >
                        Assign Courses
                      </Button>
                    </Box>
                    <List>
                      {selectedSection.courses?.length > 0 ? (
                        selectedSection.courses.map((course) => (
                          <ListItem key={course._id}>
                            <ListItemText
                              primary={course.title}
                              secondary={`Course Code: ${course.courseCode || 'N/A'}`}
                            />
                            <ListItemSecondaryAction>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<ChatIcon />}
                                  onClick={() => navigate(`/group-chat/${course._id}/${selectedSection._id}`)}
                                  sx={{ 
                                    bgcolor: '#395a7f',
                                    '&:hover': { bgcolor: '#6e9fc1' },
                                    mr: 1
                                  }}
                                >
                                  Group Chat
                                </Button>
                                <IconButton 
                                  edge="end" 
                                  aria-label="remove"
                                  onClick={() => handleRemoveCourse(course._id)}
                                  color="error"
                                  size="small"
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Box>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))
                      ) : (
                        <Typography color="text.secondary">No courses assigned to this section</Typography>
                      )}
                    </List>
                  </Box>
                )}

                {/* Course Teachers Tab */}
                {detailsTab === 3 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Course-Teacher Assignments</Typography>
                      <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={openCourseTeacherAssignment}
                        disabled={!selectedSection?.courses?.length}
                      >
                        Assign Teacher to Course
                      </Button>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Assign different teachers to different courses within this section. Now uses enhanced teacher assignment system with role validation.
                    </Typography>

                    {/* Current Assignments */}
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Current Assignments ({courseTeacherAssignments.length})
                    </Typography>
                    
                    {courseTeacherAssignments.length > 0 ? (
                      <Grid container spacing={2}>
                        {courseTeacherAssignments.map((assignment) => (
                          <Grid item xs={12} md={6} key={assignment._id}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  {assignment.course?.title || 'Unknown Course'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Code: {assignment.course?.courseCode || 'N/A'}
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 1 }}>
                                  Teacher: {assignment.teacher?.name || 'Unknown Teacher'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Email: {assignment.teacher?.email || 'N/A'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                  Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                                </Typography>
                              </CardContent>
                              <CardActions>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveCourseTeacher(assignment.course._id)}
                                  disabled={loading}
                                >
                                  Remove
                                </Button>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Alert severity="info">
                        No course-teacher assignments yet. Use the "Assign Teacher to Course" button to create assignments.
                      </Alert>
                    )}

                    {/* Unassigned Courses */}
                    {unassignedCourses.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Unassigned Courses ({unassignedCourses.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {unassignedCourses.map((course) => (
                            <Chip
                              key={course._id}
                              label={`${course.title} (${course.courseCode})`}
                              variant="outlined"
                              color="warning"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Management Tab */}
                {detailsTab === 4 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>Section Management</Typography>
                    
                    {/* Group Chat Section */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: '#e9ecee', borderRadius: 2 }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ color: '#395a7f', fontWeight: 600 }}>
                        Group Chat for Section Courses
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Access group chats for all courses in this section
                      </Typography>
                      {selectedSection?.courses?.map((course) => (
                        <Button
                          key={course._id}
                          variant="contained"
                          size="small"
                          startIcon={<ChatIcon />}
                          onClick={() => navigate(`/group-chat/${course._id}/${selectedSection._id}`)}
                          sx={{ 
                            mr: 1, 
                            mb: 1,
                            bgcolor: '#395a7f',
                            '&:hover': { bgcolor: '#6e9fc1' }
                          }}
                        >
                          {course.courseCode} Chat
                        </Button>
                      ))}
                      {(!selectedSection?.courses || selectedSection.courses.length === 0) && (
                        <Typography variant="body2" color="text.secondary">
                          No courses assigned to this section yet
                        </Typography>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<PersonAddIcon />}
                          sx={{ mb: 1 }}
                          onClick={() => {
                            console.log('Assign Teacher clicked');
                            openTeacherAssignment();
                          }}
                        >
                          Assign Teacher
                        </Button>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<PeopleIcon />}
                          sx={{ mb: 1 }}
                          onClick={() => {
                            console.log('Manage Students clicked');
                            openStudentAssignment();
                          }}
                        >
                          Manage Students
                        </Button>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<LibraryBooksIcon />}
                          sx={{ mb: 1 }}
                          onClick={() => {
                            console.log('Manage Courses clicked');
                            openCourseAssignment();
                          }}
                        >
                          Manage Courses
                        </Button>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<SchoolIcon />}
                          sx={{ mb: 1 }}
                          onClick={() => {
                            console.log('Course Teachers clicked');
                            openCourseTeacherAssignment();
                          }}
                        >
                          Course Teachers
                        </Button>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Section Rules:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Each student can only be assigned to one section
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Section capacity is limited to {selectedSection.capacity || 80} students
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Multiple courses can be assigned to a section
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* Student Assignment Dialog */}
        <Dialog 
          open={openStudentAssignDialog} 
          onClose={() => setOpenStudentAssignDialog(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>Assign Students to {selectedSection?.name}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select students to assign to this section. Available capacity: {selectedSection ? (selectedSection.capacity - (selectedSection.students?.length || 0)) : 0} students
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Available Students</InputLabel>
              <Select
                multiple
                value={selectedStudentsToAssign}
                onChange={(e) => {
                  const selected = e.target.value;
                  const remainingCapacity = selectedSection ? (selectedSection.capacity - (selectedSection.students?.length || 0)) : 0;
                  if (selected.length <= remainingCapacity) {
                    setSelectedStudentsToAssign(selected);
                  }
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const student = availableStudents.find(s => s._id === value);
                      return (
                        <Chip key={value} label={student?.name || value} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {availableStudents.map((student) => (
                  <MenuItem key={student._id} value={student._id}>
                    {student.name} ({student.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {availableStudents.length === 0 && (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                No available students. All students are already assigned to sections.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenStudentAssignDialog(false)}>Cancel</Button>
            <Button
              onClick={handleBulkStudentAssignment}
              variant="contained"
              disabled={loading || selectedStudentsToAssign.length === 0}
            >
              {loading ? 'Assigning...' : `Assign ${selectedStudentsToAssign.length} Students`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Course Assignment Dialog */}
        <Dialog 
          open={openCourseAssignDialog} 
          onClose={() => setOpenCourseAssignDialog(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>Assign Courses to {selectedSection?.name}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select courses to assign to this section. Multiple courses can be assigned.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Available Courses</InputLabel>
              <Select
                multiple
                value={selectedCoursesToAssign}
                onChange={(e) => setSelectedCoursesToAssign(e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const course = availableCourses.find(c => c._id === value);
                      return (
                        <Chip key={value} label={course?.title || value} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {availableCourses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.title} ({course.courseCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {availableCourses.length === 0 && (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                No available courses found for this school/department.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCourseAssignDialog(false)}>Cancel</Button>
            <Button
              onClick={handleBulkCourseAssignment}
              variant="contained"
              disabled={loading || selectedCoursesToAssign.length === 0}
            >
              {loading ? 'Assigning...' : `Assign ${selectedCoursesToAssign.length} Courses`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Teacher Assignment Dialog */}
        <Dialog 
          open={openTeacherAssignDialog} 
          onClose={() => setOpenTeacherAssignDialog(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>Assign Teacher to {selectedSection?.name}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select a teacher to assign to this section.
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Available Teachers</InputLabel>
              <Select
                value={selectedTeacherToAssign}
                onChange={(e) => setSelectedTeacherToAssign(e.target.value)}
              >
                {availableTeachers.map((teacher) => (
                  <MenuItem key={teacher._id} value={teacher._id}>
                    {teacher.name} ({teacher.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {availableTeachers.length === 0 && (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                No available teachers in this department.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTeacherAssignDialog(false)}>Cancel</Button>
            <Button
              onClick={handleTeacherAssignment}
              variant="contained"
              disabled={loading || !selectedTeacherToAssign}
            >
              {loading ? 'Assigning...' : 'Assign Teacher'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Course-Teacher Assignment Dialog */}
        <Dialog 
          open={openCourseTeacherDialog} 
          onClose={() => setOpenCourseTeacherDialog(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>Assign Teacher to Course in {selectedSection?.name}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Assign a teacher to a specific course within this section.
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Course</InputLabel>
                  <Select
                    value={selectedCourseForTeacher}
                    onChange={(e) => setSelectedCourseForTeacher(e.target.value)}
                  >
                    {unassignedCourses.map((course) => (
                      <MenuItem key={course._id} value={course._id}>
                        {course.title} ({course.courseCode})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {unassignedCourses.length === 0 && (
                  <Typography color="text.secondary" sx={{ mt: 1, fontSize: '0.875rem' }}>
                    All courses in this section already have assigned teachers.
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Teacher</InputLabel>
                  <Select
                    value={selectedTeacherForCourse}
                    onChange={(e) => setSelectedTeacherForCourse(e.target.value)}
                  >
                    {availableTeachers.map((teacher) => (
                      <MenuItem key={teacher._id} value={teacher._id}>
                        {teacher.name} ({teacher.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {availableTeachers.length === 0 && (
                  <Typography color="text.secondary" sx={{ mt: 1, fontSize: '0.875rem' }}>
                    No available teachers in this department.
                  </Typography>
                )}
              </Grid>
            </Grid>

            {/* Current Assignments Preview */}
            {courseTeacherAssignments.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Assignments:
                </Typography>
                <List dense>
                  {courseTeacherAssignments.map((assignment) => (
                    <ListItem key={assignment._id}>
                      <ListItemText
                        primary={`${assignment.course?.title} (${assignment.course?.courseCode})`}
                        secondary={`Assigned to: ${assignment.teacher?.name}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveCourseTeacher(assignment.course._id)}
                          disabled={loading}
                          size="small"
                        >
                          <CloseIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCourseTeacherDialog(false)}>Close</Button>
            <Button
              onClick={handleCourseTeacherAssignment}
              variant="contained"
              disabled={loading || !selectedCourseForTeacher || !selectedTeacherForCourse}
            >
              {loading ? 'Assigning...' : 'Assign Teacher to Course'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Section Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create New Section</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Section Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Section A, Morning Batch, etc."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>School *</InputLabel>
                  <Select
                    value={formData.schoolId}
                    onChange={(e) => handleSchoolChange(e.target.value)}
                    required
                  >
                    {schools.map((school) => (
                      <MenuItem key={school._id} value={school._id}>
                        {school.name} ({school.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Department (Optional)</InputLabel>
                  <Select
                    value={formData.departmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    disabled={!formData.schoolId}
                  >
                    <MenuItem value="">
                      <em>School-wide Section</em>
                    </MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Course (Optional)</InputLabel>
                  <Select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    disabled={!formData.departmentId}
                  >
                    <MenuItem value="">
                      <em>No Course Assigned</em>
                    </MenuItem>
                    {courses.map((course) => (
                      <MenuItem key={course._id} value={course._id}>
                        {course.title} ({course.courseCode})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Teacher (Optional)</InputLabel>
                  <Select
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    disabled={!formData.departmentId}
                  >
                    <MenuItem value="">
                      <em>No Teacher Assigned</em>
                    </MenuItem>
                    {teachers.map((teacher) => (
                      <MenuItem key={teacher._id} value={teacher._id}>
                        {teacher.name} ({teacher.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 80 })}
                  InputProps={{ inputProps: { min: 1, max: 100 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  >
                    <MenuItem value="Fall">Fall</MenuItem>
                    <MenuItem value="Spring">Spring</MenuItem>
                    <MenuItem value="Summer">Summer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Academic Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  InputProps={{ inputProps: { min: 2020, max: 2030 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Students (Optional - Select up to {formData.capacity})</InputLabel>
                  <Select
                    multiple
                    value={formData.studentIds}
                    onChange={(e) => {
                      const selected = e.target.value;
                      if (selected.length <= formData.capacity) {
                        setFormData({ ...formData, studentIds: selected });
                      }
                    }}
                    disabled={!formData.schoolId}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.slice(0, 5).map((value) => {
                          const student = students.find(s => s._id === value);
                          return (
                            <Chip key={value} label={student?.name || value} size="small" />
                          );
                        })}
                        {selected.length > 5 && (
                          <Chip label={`+${selected.length - 5} more`} size="small" variant="outlined" />
                        )}
                      </Box>
                    )}
                  >
                    {students.map((student) => (
                      <MenuItem key={student._id} value={student._id}>
                        {student.name} ({student.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">
                  Selected: {formData.studentIds.length}/{formData.capacity} students
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || !formData.name || !formData.schoolId}
            >
              {loading ? 'Creating...' : 'Create Section'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SectionManagement;

