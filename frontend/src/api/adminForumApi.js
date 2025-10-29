import axios from 'axios';

// Get all forums with pagination and filters
export const getAdminForums = async (page = 1, limit = 10, filters = {}, token) => {
  const { course, status, sortBy, search } = filters;
  const res = await axios.get(`/api/admin/forums?page=${page}&limit=${limit}&course=${course || 'all'}&status=${status || 'all'}&sort=${sortBy || 'newest'}&search=${search || ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Get flagged forum content
export const getFlaggedForumContent = async (token) => {
  const res = await axios.get('/api/admin/forums/flagged', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Get forum categories
export const getForumCategories = async (token) => {
  const res = await axios.get('/api/admin/forum-categories', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Create a new forum category
export const createForumCategory = async (categoryData, token) => {
  const res = await axios.post('/api/admin/forum-category', categoryData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Delete a forum category
export const deleteForumCategory = async (categoryId, token) => {
  const res = await axios.delete(`/api/admin/forum-category/${categoryId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Update a forum category
export const updateForumCategory = async (categoryId, categoryData, token) => {
  const res = await axios.put(`/api/admin/forum-category/${categoryId}`, categoryData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Get a specific forum with its replies
export const getForumWithReplies = async (forumId, token) => {
  const res = await axios.get(`/api/admin/forum/${forumId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Update forum status (resolved/unresolved)
export const updateForumStatus = async (forumId, isResolved, token) => {
  const res = await axios.patch(`/api/admin/forum/${forumId}/status`, 
    { isResolved },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

// Post a reply to a forum
export const postForumReply = async (forumId, content, token) => {
  const res = await axios.post(`/api/admin/forum/${forumId}/reply`, 
    { content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

// Delete a forum
export const deleteForum = async (forumId, token) => {
  const res = await axios.delete(`/api/admin/forum/${forumId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Delete a forum reply
export const deleteForumReply = async (replyId, token) => {
  const res = await axios.delete(`/api/admin/forum/reply/${replyId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Dismiss flags on a forum post
export const dismissFlags = async (postId, postType, token) => {
  const res = await axios.post(`/api/admin/forums/dismiss-flags`, 
    { postId, postType },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

// Get forum statistics
export const getForumStatistics = async (token) => {
  const res = await axios.get('/api/admin/forums/statistics', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// School, Department, Course, and User management functions
export const getSchools = async (token) => {
  const res = await axios.get('/api/schools', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getDepartmentsBySchool = async (schoolId, token) => {
  const res = await axios.get(`/api/departments/school/${schoolId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCoursesByDepartment = async (departmentId, token) => {
  const res = await axios.get(`/api/admin/courses/department/${departmentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeachers = async (token) => {
  const res = await axios.get('/api/admin/teachers', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getStudents = async (token) => {
  const res = await axios.get('/api/admin/students', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
