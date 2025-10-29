import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import StudentDashboard from '../components/student/StudentDashboard';
import WatchHistory from '../components/student/WatchHistory';
import RecentVideos from '../components/student/RecentVideos';
import CourseProgress from '../components/student/CourseProgress';
import VideoPlayer from '../components/student/VideoPlayer';
import CourseList from '../components/student/CourseList';
import CourseVideos from '../components/student/CourseVideos';
import StudentCourseUnits from '../pages/student/StudentCourseUnits';
import StudentUnitVideo from '../pages/student/StudentUnitVideo';
import StudentQuizPage from '../pages/student/StudentQuizPage';
import QuizLauncher from '../pages/student/QuizLauncher';
import SecureQuizPage from '../pages/student/SecureQuizPage';
// Live class imports removed - moved to independent video call module
import NotFound from '../components/common/NotFound';

const StudentRoutes = ({ user, token }) => {
  if (!user || !(user.roles ? user.roles.includes('student') : user.role === 'student')) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      <Routes>
        <Route path="/" element={<StudentDashboard user={user} />} />
        <Route path="/watch-history" element={<WatchHistory token={token} />} />
        <Route path="/recent-videos" element={<RecentVideos token={token} />} />
        <Route path="/courses" element={<CourseList token={token} />} />
        {/* Live class routes removed - moved to independent video call module */}
        <Route path="/course/:courseId/progress" element={<CourseProgress token={token} />} />
        
  {/* Units and videos routes */}
  <Route path="/course/:courseId/units" element={<StudentCourseUnits />} />
  <Route path="/course/:courseId/unit/:unitId/video/:videoId" element={<StudentUnitVideo />} />

  {/* Quiz routes - Secure quiz launcher with briefing */}
  <Route 
    path="/course/:courseId/quiz/:quizId" 
    element={<QuizLauncher user={user} token={token} />} 
  />
  
  {/* Direct secure quiz route */}
  <Route 
    path="/secure-quiz/:attemptId" 
    element={<SecureQuizPage user={user} token={token} />} 
  />

  {/* Legacy quiz route - needs to be last to avoid conflicts */}
  <Route 
    path="/quiz/:quizId" 
    element={
      <StudentQuizPage 
        user={user} 
        token={token} 
      />
    } 
  />

  {/* Legacy non-unit video routes (maintained for backward compatibility) */}
        <Route path="/course/:courseId/videos" element={<CourseVideos token={token} />} />
        <Route path="/course/:courseId/video/:videoId" element={<VideoPlayer token={token} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Box>
  );
};

export default StudentRoutes;
