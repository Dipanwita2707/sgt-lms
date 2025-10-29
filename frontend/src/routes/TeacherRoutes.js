import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { getCurrentUser } from '../utils/authService';
import { useUserRole } from '../contexts/UserRoleContext';
import TeacherDashboard from '../components/teacher/TeacherDashboard';
import CourseList from '../components/teacher/CourseList';
import NotFound from '../components/common/NotFound';
import ContentUpload from '../components/teacher/ContentUpload';
import CourseVideos from '../components/teacher/CourseVideos';
import CourseStudents from '../components/teacher/CourseStudents';
import VideoRemovalRequest from '../components/teacher/VideoRemovalRequest';
import CourseForums from '../components/teacher/CourseForums';
import ForumsList from '../components/teacher/ForumsList';
import ForumDiscussion from '../components/teacher/ForumDiscussion';
import TeacherStudents from '../pages/teacher/TeacherStudents';
import TeacherEnhancedAnalytics from '../pages/teacher/TeacherEnhancedAnalytics';
import TeacherAnalyticsFixed from '../components/teacher/TeacherAnalyticsFixed';
import TeacherProfile from '../components/TeacherProfile';
// Live class imports removed - moved to independent video call module
import TeacherSections from '../components/teacher/TeacherSections';
import TeacherSectionAnalytics from '../components/teacher/TeacherSectionAnalytics';
import AnnouncementPage from '../pages/AnnouncementPage';
import TeacherAnnouncementHistory from '../components/teacher/TeacherAnnouncementHistory';
import TeacherQuizzes from '../pages/teacher/TeacherQuizzes';
import QuizUnlockDashboard from '../components/teacher/QuizUnlockDashboard';
import TeacherCCManagement from '../pages/teacher/TeacherCCManagement';

const TeacherRoutes = () => {
  const { user: contextUser } = useUserRole();
  const currentUser = getCurrentUser();
  const user = contextUser || currentUser;
  const token = localStorage.getItem('token');

  const hasRequiredRole = user && (user.roles 
    ? user.roles.some(role => ['teacher', 'cc', 'admin', 'superadmin'].includes(role))
    : ['teacher', 'cc', 'admin', 'superadmin'].includes(user.role));
  
  if (!hasRequiredRole) {
    return <Navigate to="/login" replace />;
  }

  // Check if route is accessible based on user permissions
  const hasAccess = (requiredPermission) => {
    if (!requiredPermission) return true; // No permission required
    return user.permissions && user.permissions.includes(requiredPermission);
  };

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      <Routes>
        <Route path="/" element={<TeacherDashboard user={user} />} />
        <Route path="/dashboard" element={<TeacherDashboard user={user} />} />
        <Route path="/courses" element={<CourseList token={token} />} />
        <Route path="/profile" element={<TeacherProfile token={token} user={user} />} />
        
        {/* Content management routes */}
        <Route 
          path="/videos/upload" 
          element={
            hasAccess('Manage Videos') 
              ? <ContentUpload token={token} user={user} /> 
              : <Navigate to="/teacher" replace />
          } 
        />
        <Route path="/course/:courseId/videos" element={<CourseVideos token={token} user={user} />} />
        <Route path="/video/:videoId/remove-request" element={<VideoRemovalRequest token={token} user={user} />} />
        
        {/* Student management routes */}
        <Route 
          path="/course/:courseId/students" 
          element={
            hasAccess('Manage Students') 
              ? <CourseStudents token={token} user={user} /> 
              : <Navigate to="/teacher" replace />
          }
        />
        <Route path="/students" element={<TeacherStudents token={token} user={user} />} />
        
        {/* Forum routes */}
        <Route path="/forums" element={<ForumsList token={token} user={user} />} />
        <Route path="/course/:courseId/forums" element={<CourseForums token={token} user={user} />} />
        <Route path="/forum/:forumId" element={<ForumDiscussion token={token} user={user} />} />
        
        {/* Live class routes removed - moved to independent video call module */}
        
        {/* Sections routes */}
        <Route path="/sections" element={<TeacherSections token={token} user={user} />} />
        <Route path="/section-analytics" element={<TeacherSectionAnalytics token={token} user={user} />} />
        
        {/* Announcement routes */}
        <Route path="/announcements" element={<AnnouncementPage token={token} user={user} />} />
        <Route path="/announcements/history" element={<TeacherAnnouncementHistory token={token} user={user} />} />
        
        {/* Quiz routes */}
        <Route path="/quizzes" element={<TeacherQuizzes token={token} user={user} />} />
        <Route path="/unlock-requests" element={<QuizUnlockDashboard token={token} user={user} />} />
        <Route path="/video-unlock-requests" element={<QuizUnlockDashboard token={token} user={user} />} />
        
        {/* CC Management route */}
        <Route path="/cc-management" element={<TeacherCCManagement token={token} user={user} />} />
        
        {/* Analytics route - Using fixed analytics as the main analytics page */}
        <Route 
          path="/analytics" 
          element={
            hasAccess('View Analytics') 
              ? <TeacherAnalyticsFixed token={token} user={user} /> 
              : <Navigate to="/teacher" replace />
          } 
        />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Box>
  );
};

export default TeacherRoutes;
