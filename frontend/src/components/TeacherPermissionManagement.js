import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Announcement as AnnouncementIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import axios from 'axios';
import { parseJwt } from '../utils/jwt';

const TeacherPermissionManagement = () => {
  const token = localStorage.getItem('token');
  const user = parseJwt(token);
  
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (user.role === 'hod' || user.role === 'admin') {
      loadTeachers();
    }
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      // This endpoint would need to be created to get teachers in HOD's department
      const response = await axios.get('/api/admin/teachers/department', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data.teachers || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
      // For now, we'll show a placeholder
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacherPermission = async (teacherId) => {
    try {
      setUpdating(prev => ({ ...prev, [teacherId]: true }));
      
      await axios.patch(`/api/announcements/teacher/${teacherId}/permission`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setTeachers(prev => prev.map(teacher => 
        teacher._id === teacherId 
          ? { ...teacher, canAnnounce: !teacher.canAnnounce }
          : teacher
      ));
      
    } catch (error) {
      console.error('Error toggling teacher permission:', error);
      alert(error.response?.data?.message || 'Error updating permission');
    } finally {
      setUpdating(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  if (user.role !== 'hod' && user.role !== 'admin') {
    return (
      <Alert severity="warning">
        Only HODs and Admins can manage teacher announcement permissions.
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader
        avatar={<AnnouncementIcon />}
        title="Teacher Announcement Permissions"
        subheader="Manage which teachers can create announcements"
      />
      <CardContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : teachers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No teachers found in your department
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Teachers will appear here once they are assigned to your department
            </Typography>
          </Paper>
        ) : (
          <List>
            {teachers.map((teacher, index) => (
              <React.Fragment key={teacher._id}>
                <ListItem>
                  <Avatar sx={{ mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {teacher.name}
                        </Typography>
                        {teacher.canAnnounce && (
                          <Chip 
                            label="Can Announce" 
                            color="success" 
                            size="small"
                            icon={<AnnouncementIcon />}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {teacher.email}
                        </Typography>
                        {teacher.teacherId && (
                          <Typography variant="caption" color="text.secondary">
                            ID: {teacher.teacherId}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        {teacher.canAnnounce ? 'Enabled' : 'Disabled'}
                      </Typography>
                      <Switch
                        checked={teacher.canAnnounce || false}
                        onChange={() => toggleTeacherPermission(teacher._id)}
                        disabled={updating[teacher._id]}
                        color="primary"
                      />
                      {updating[teacher._id] && (
                        <CircularProgress size={20} />
                      )}
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < teachers.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Teachers with announcement permission can create announcements 
            for their assigned sections, but all announcements require HOD approval before being published.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TeacherPermissionManagement;