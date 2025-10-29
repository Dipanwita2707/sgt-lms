import axios from 'axios';

export const getCourses = async (token) => {
  const res = await axios.get('/api/admin/courses', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseDetails = async (courseId, token) => {
  const res = await axios.get(`/api/admin/course/${courseId}/details`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseVideos = async (courseId, token) => {
  const res = await axios.get(`/api/admin/course/${courseId}/videos`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseStudents = async (courseId, token) => {
  const res = await axios.get(`/api/admin/course/${courseId}/students`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const createCourse = async (data, token) => {
  const res = await axios.post('/api/admin/course', data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const editCourse = async (id, updates, token) => {
  const res = await axios.patch(`/api/admin/course/${id}`, updates, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const deleteCourse = async (id, token) => {
  const res = await axios.delete(`/api/admin/course/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// REMOVED: Direct course-teacher assignment - teachers are only connected through sections
// Use teacherAssignmentApi.assignTeacherToCourses instead

export const bulkAssignCourses = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/api/admin/course/bulk-assign', formData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const bulkUploadCourses = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/api/admin/course/bulk', formData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeachersBySearch = async (searchQuery, token) => {
  const res = await axios.get(`/api/admin/teachers/search?q=${encodeURIComponent(searchQuery)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
