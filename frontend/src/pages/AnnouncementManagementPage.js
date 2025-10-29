import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import {
  Announcement as AnnouncementIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Approval as ApprovalIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import HierarchicalAnnouncementBoard from '../components/HierarchicalAnnouncementBoard';
import TeacherPermissionManagement from '../components/TeacherPermissionManagement';
import HODApprovalDashboard from '../components/HODApprovalDashboard';
import HODApprovalHistory from '../components/HODApprovalHistory';
import { parseJwt } from '../utils/jwt';

const AnnouncementManagementPage = ({ currentRole }) => {
  const token = localStorage.getItem('token');
  const user = parseJwt(token);
  const [activeTab, setActiveTab] = useState(0);

  const canManagePermissions = (user.roles ? user.roles.some(role => ['hod', 'admin'].includes(role)) : ['hod', 'admin'].includes(user.role));
  const canApproveAnnouncements = (user.roles ? user.roles.some(role => ['hod', 'admin'].includes(role)) : ['hod', 'admin'].includes(user.role));
  const canViewApprovalHistory = canApproveAnnouncements; // same roles

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <HierarchicalAnnouncementBoard user={user} currentRole={currentRole} />;
      case 1:
        return canApproveAnnouncements ? (
          <HODApprovalDashboard />
        ) : (
          <Typography>Access denied</Typography>
        );
      case 2:
        return canManagePermissions ? (
          <TeacherPermissionManagement />
        ) : (
          <Typography>Access denied</Typography>
        );
      case 3:
        return canViewApprovalHistory ? (
          <HODApprovalHistory />
        ) : (
          <Typography>Access denied</Typography>
        );
      default:
        return <HierarchicalAnnouncementBoard user={user} />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          <AnnouncementIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Announcement Management
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Create and manage hierarchical announcements across your organization
        </Typography>
      </Box>

      {/* Role-based info */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
        <Typography variant="body1" color="primary.main">
          <strong>Your Role: {(user.primaryRole || user.role || (user.roles && user.roles[0]))?.toUpperCase()}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          {(user.roles ? user.roles.includes('admin') : user.role === 'admin') || (user.roles ? user.roles.includes('superadmin') : user.role === 'superadmin')
            ? 'You can create announcements for all users and manage all permissions.'
            : (user.roles ? user.roles.includes('dean') : user.role === 'dean')
            ? 'You can create announcements for your school, departments, and manage HODs.'
            : (user.roles ? user.roles.includes('hod') : user.role === 'hod')
            ? 'You can create announcements for your department, approve teacher announcements, and manage teacher permissions.'
            : (user.roles ? user.roles.includes('teacher') : user.role === 'teacher')
            ? 'You can create announcements for your assigned sections (requires HOD approval).'
            : 'You can view announcements targeted to you.'
          }
        </Typography>
      </Paper>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<DashboardIcon />} 
            label="Announcements" 
            iconPosition="start"
          />
          {canApproveAnnouncements && (
            <Tab 
              icon={<ApprovalIcon />} 
              label="Approve Teacher Announcements" 
              iconPosition="start"
            />
          )}
          {canManagePermissions && (
            <Tab 
              icon={<SettingsIcon />} 
              label="Teacher Permissions" 
              iconPosition="start"
            />
          )}
          {canViewApprovalHistory && (
            <Tab 
              icon={<HistoryIcon />} 
              label="Approval History" 
              iconPosition="start"
            />
          )}
        </Tabs>
      </Box>

      {/* Content */}
      <Box>
        {renderTabContent()}
      </Box>

      {/* Help Section */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Announcement Hierarchy Guide
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Admin/Super Admin:
            </Typography>
            <Typography variant="body2" paragraph>
              • Can announce to all users<br/>
              • Can target specific roles, schools, departments<br/>
              • Can approve/reject all announcements<br/>
              • Can manage all permissions
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Dean:
            </Typography>
            <Typography variant="body2" paragraph>
              • Can announce to entire school/university<br/>
              • Can target HODs and teachers in school<br/>
              • Can target departments under their school<br/>
              • Announcements are published immediately
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              HOD:
            </Typography>
            <Typography variant="body2" paragraph>
              • Can announce to teachers in department<br/>
              • Can announce to students via course sections<br/>
              • Can approve/reject teacher announcements<br/>
              • Can grant announcement permissions to teachers
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Teacher:
            </Typography>
            <Typography variant="body2" paragraph>
              • Can announce to assigned sections only<br/>
              • Requires HOD permission to create announcements<br/>
              • All announcements need HOD approval<br/>
              • Can target students and teachers in sections
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default AnnouncementManagementPage;