import axios from 'axios';

export const getTeachers = async (token) => {
  const res = await axios.get('/api/admin/teachers', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const addTeacher = async (data, token) => {
  const res = await axios.post('/api/admin/teacher', data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const bulkUploadTeachers = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/api/admin/teacher/bulk', formData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const resetTeacherPassword = async (teacherId, newPassword, token) => {
  const res = await axios.post('/api/admin/teacher/reset-password', { teacherId, newPassword }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const deactivateTeacher = async (teacherId, token) => {
  const res = await axios.patch(`/api/admin/teacher/${teacherId}/deactivate`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// REMOVED: Direct course-teacher assignment - teachers are only connected through sections
// Use teacherAssignmentApi.assignTeacherToCourses instead

// Teacher dashboard API functions
export const getTeacherCourses = async (token) => {
  const res = await axios.get('/api/teacher/courses', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseDetails = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/course/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseStudents = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/course/${courseId}/students`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseVideos = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/course/${courseId}/videos`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// New API functions for teacher functionality
export const uploadCourseVideo = async (courseId, videoData, token) => {
  const formData = new FormData();
  formData.append('video', videoData.file);
  formData.append('title', videoData.title);
  formData.append('description', videoData.description);
  
  // Include video duration if extracted from file
  if (videoData.file.videoDuration) {
    formData.append('duration', videoData.file.videoDuration);
  }
  
  // Include unitId if provided
  if (videoData.unitId) {
    formData.append('unitId', videoData.unitId);
  }
  
  const res = await axios.post(`/api/teacher/course/${courseId}/video`, formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const requestVideoRemoval = async (videoId, reason, token) => {
  const res = await axios.post(`/api/teacher/video/${videoId}/removal-request`, { reason }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getVideoRemovalRequests = async (token) => {
  const res = await axios.get('/api/teacher/video-removal-requests', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Quiz Pool API functions for teachers
export const createQuizPool = async (quizPoolData, token) => {
  const res = await axios.post('/api/quiz-pools', quizPoolData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseQuizPools = async (courseId, token) => {
  const res = await axios.get(`/api/quiz-pools/course/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getQuizPoolDetails = async (quizPoolId, token) => {
  const res = await axios.get(`/api/quiz-pools/${quizPoolId}/details`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const addQuizToPool = async (quizPoolId, quizId, token) => {
  const res = await axios.post(`/api/quiz-pools/${quizPoolId}/add-quiz`, { quizId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const removeQuizFromPool = async (quizPoolId, quizId, token) => {
  const res = await axios.delete(`/api/quiz-pools/${quizPoolId}/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getQuizPoolAnalytics = async (quizPoolId, token) => {
  const res = await axios.get(`/api/quiz-pools/${quizPoolId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Analytics API functions for teachers
export const getTeacherAnalyticsOverview = async (token) => {
  const res = await axios.get('/api/teacher/analytics/overview', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeacherEnrollmentTrends = async (period, token) => {
  const res = await axios.get(`/api/teacher/analytics/trends?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeacherCourseAnalytics = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/analytics/course/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getStudentByRegNo = async (regNo, token) => {
  const res = await axios.get(`/api/teacher/analytics/student?regNo=${regNo}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getStudentDetailedAnalytics = async (studentId, token) => {
  const res = await axios.get(`/api/teacher/analytics/student/${studentId}/detailed`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Unit management API functions for teachers
export const createUnitForCourse = async (courseId, unitData, token) => {
  const res = await axios.post(`/api/teacher/course/${courseId}/unit`, {
    ...unitData,
    courseId: courseId
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeacherUnitsByCourse = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/course/${courseId}/units`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeacherUnitDetails = async (unitId, token) => {
  const res = await axios.get(`/api/teacher/unit/${unitId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const updateTeacherUnit = async (unitId, unitData, token) => {
  const res = await axios.put(`/api/teacher/unit/${unitId}`, unitData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const deleteTeacherUnit = async (unitId, token) => {
  const res = await axios.delete(`/api/teacher/unit/${unitId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Forum-related functions (placeholder implementations)
export const getCourseForums = async (courseId, token) => {
  // Placeholder implementation - replace with actual API call when forums are implemented
  console.warn('getCourseForums: Forum functionality not yet implemented');
  return { forums: [] };
};

export const getForumDiscussion = async (forumId, token) => {
  // Placeholder implementation - replace with actual API call when forums are implemented
  console.warn('getForumDiscussion: Forum functionality not yet implemented');
  return { discussion: { posts: [] } };
};

export const postForumReply = async (forumId, replyData, token) => {
  // Placeholder implementation - replace with actual API call when forums are implemented
  console.warn('postForumReply: Forum functionality not yet implemented');
  return { success: true, message: 'Forum functionality not yet implemented' };
};

export const getTeacherForums = async (token) => {
  // Placeholder implementation - replace with actual API call when forums are implemented
  console.warn('getTeacherForums: Forum functionality not yet implemented');
  return { forums: [] };
};
