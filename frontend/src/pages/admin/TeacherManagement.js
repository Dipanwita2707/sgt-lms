import React, { useState, useEffect } from 'react';
import { Paper, Typography, Snackbar, Alert, CircularProgress } from '@mui/material';
import { getTeachers, addTeacher, bulkUploadTeachers, resetTeacherPassword, deactivateTeacher } from '../../api/teacherApi';
import { TeacherPerformance, ExportAnalyticsButtons } from '../../components/admin/AnalyticsWidgets';
import AddTeacherForm from '../../components/admin/AddTeacherForm';
import BulkUploadTeachers from '../../components/admin/BulkUploadTeachers';
import TeacherTable from '../../components/admin/TeacherTable';
import ResetPasswordDialog from '../../components/admin/ResetPasswordDialog';
import AssignCourseDialog from '../../components/admin/AssignCourseDialog';

// Helper to check permission
function hasPermission(user, perm) {
  if (!user) return false;
  
  // Check if user has admin role in roles array (new format)
  if (user.roles && user.roles.includes('admin')) return true;
  
  // Check legacy role field
  if (user.role === 'admin') return true;
  
  // Check specific permissions
  if (Array.isArray(user.permissions) && (user.permissions.includes('*') || user.permissions.includes(perm))) return true;
  
  return false;
}

const TeacherManagement = ({ currentUser }) => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [resetDialog, setResetDialog] = useState({ open: false, teacherId: null });
  const [assignCourseDialog, setAssignCourseDialog] = useState({ open: false, teacher: null });
  const token = localStorage.getItem('token');

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTeachers(token);
      setTeachers(data);
    } catch (err) {
      setError('Failed to fetch teachers');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!hasPermission(currentUser, 'manage_teachers')) return;
    fetchTeachers();
    // eslint-disable-next-line
  }, [currentUser]);

  const handleAddTeacher = async (form) => {
    try {
      await addTeacher(form, token);
      setSnackbar('Teacher added successfully');
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add teacher');
    }
  };

  const handleBulkUpload = async (file) => {
    try {
      await bulkUploadTeachers(file, token);
      setSnackbar('Bulk upload successful');
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk upload failed');
    }
  };

  const handleResetPassword = (teacherId) => {
    setResetDialog({ open: true, teacherId });
  };

  const handleResetPasswordSubmit = async (password) => {
    try {
      await resetTeacherPassword(resetDialog.teacherId, password, token);
      setSnackbar('Password reset successfully');
      setResetDialog({ open: false, teacherId: null });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeactivate = async (teacherId) => {
    try {
      await deactivateTeacher(teacherId, token);
      setSnackbar('Teacher deactivated');
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate teacher');
    }
  };

  const handleAssignCourse = (teacher) => {
    setAssignCourseDialog({ open: true, teacher });
  };

  const handleAssignCourseSubmit = async (courseId) => {
    setError('Direct course assignment has been deprecated. Teachers are now only connected to courses through sections. Please use Section Management to assign teachers to specific courses within sections.');
    setAssignCourseDialog({ open: false, teacher: null });
  };

  if (!hasPermission(currentUser, 'manage_teachers')) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" color="error">You do not have permission to manage teachers.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Manage Teachers</Typography>
      <ExportAnalyticsButtons />
      <AddTeacherForm onAdd={handleAddTeacher} />
      <BulkUploadTeachers onUpload={handleBulkUpload} />
      {loading ? <CircularProgress /> :
        <>
          <TeacherTable
            teachers={teachers}
            onResetPassword={handleResetPassword}
            onDeactivate={handleDeactivate}
            onAssignCourse={handleAssignCourse}
          />
          {/* Show performance for each teacher */}
          {teachers.map(t => (
            <TeacherPerformance key={t._id} teacherId={t._id} />
          ))}
        </>
      }
      <ResetPasswordDialog
        open={resetDialog.open}
        onClose={() => setResetDialog({ open: false, teacherId: null })}
        onSubmit={handleResetPasswordSubmit}
      />
      <AssignCourseDialog
        open={assignCourseDialog.open}
        teacher={assignCourseDialog.teacher}
        onClose={() => setAssignCourseDialog({ open: false, teacher: null })}
        onSubmit={handleAssignCourseSubmit}
      />
      <Snackbar 
        open={!!snackbar} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSnackbar('')}>{snackbar}</Alert>
      </Snackbar>
      {error && (
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Snackbar>
      )}
    </Paper>
  );
};

export default TeacherManagement;
