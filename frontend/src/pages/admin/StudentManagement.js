
import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Paper, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Box, 
  Tabs, 
  Tab 
} from '@mui/material';
import { StudentAnalytics, ExportAnalyticsButtons } from '../../components/admin/AnalyticsWidgets';
import BulkUploadStudents from '../../components/admin/BulkUploadStudents';
import AssignCourseForm from '../../components/admin/AssignCourseForm';
import StudentTable from '../../components/admin/StudentTable';
import EditStudentDialog from '../../components/admin/EditStudentDialog';
import CreateStudentForm from '../../components/admin/CreateStudentForm';
import {
  getStudents,
  createStudent,
  bulkUploadStudents,
  assignCourseToStudent,
  editStudent,
  removeStudent
} from '../../api/studentApi';

// TabPanel component for tabbed interface
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-tabpanel-${index}`}
      aria-labelledby={`student-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, student: null });
  const [tabValue, setTabValue] = useState(0);
  const token = localStorage.getItem('token');

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStudents(token);
      setStudents(data);
    } catch (err) {
      setError('Failed to fetch students');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBulkUpload = async (file) => {
    try {
      const result = await bulkUploadStudents(file, token);
      setSnackbar('Bulk upload completed');
      fetchStudents();
      return result; // Return the result so BulkUploadStudents can access it
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error; // Re-throw so BulkUploadStudents can handle the error
    }
  };

  const handleCreateStudent = async (studentData) => {
    await createStudent(studentData, token);
    setSnackbar('Student created successfully');
    fetchStudents();
  };

  const handleAssignCourse = async (regNo, courseId) => {
    await assignCourseToStudent(regNo, courseId, token);
    setSnackbar('Course assigned successfully');
    fetchStudents();
  };

  const handleEdit = (student) => {
    setEditDialog({ open: true, student });
  };

  const handleEditSubmit = async (updates) => {
    await editStudent(editDialog.student._id, updates, token);
    setSnackbar('Student updated');
    setEditDialog({ open: false, student: null });
    fetchStudents();
  };

  const handleRemove = async (id) => {
    await removeStudent(id, token);
    setSnackbar('Student removed');
    fetchStudents();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Manage Students</Typography>
      <ExportAnalyticsButtons />
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="student management tabs"
        >
          <Tab label="Student List" id="student-tab-0" />
          <Tab label="Create Student" id="student-tab-1" />
          <Tab label="Bulk Upload" id="student-tab-2" />
          <Tab label="Assign Courses" id="student-tab-3" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        {loading ? <CircularProgress /> :
          <>
            <StudentTable
              students={students}
              onEdit={handleEdit}
              onRemove={handleRemove}
            />
            {/* Show analytics for each student */}
            {students.map(s => (
              <StudentAnalytics key={s._id} studentId={s._id} />
            ))}
          </>
        }
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <CreateStudentForm onStudentCreated={handleCreateStudent} />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <BulkUploadStudents onUpload={handleBulkUpload} />
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <AssignCourseForm onAssign={handleAssignCourse} />
      </TabPanel>
      
      <EditStudentDialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, student: null })}
        student={editDialog.student}
        onSubmit={handleEditSubmit}
      />
      
      <Snackbar 
        open={!!snackbar} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" elevation={6} variant="filled">
          {snackbar}
        </Alert>
      </Snackbar>
      
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Paper>
  );
};

export default StudentManagement;
