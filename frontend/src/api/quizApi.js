import axios from 'axios';

// Get quiz template for teachers
export const getQuizTemplate = async (token) => {
  const response = await axios.get('/api/quizzes/template', {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  });
  
  // Create a URL for the blob
  const url = window.URL.createObjectURL(new Blob([response.data]));
  
  // Create a link and click it to download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'quiz_template.csv');
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Upload a quiz (CSV file)
export const uploadQuiz = async (formData, token) => {
  const response = await axios.post('/api/quizzes/upload', formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Get quizzes for a course
export const getCourseQuizzes = async (courseId, token) => {
  const response = await axios.get(`/api/quizzes/course/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz analytics for teachers
export const getQuizAnalytics = async (quizId, token) => {
  const response = await axios.get(`/api/quizzes/analytics/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz pools for teacher
export const getTeacherQuizPools = async (token) => {
  const response = await axios.get('/api/quizzes/teacher/pools', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get unit quiz for student
export const getUnitQuizForStudent = async (unitId, token) => {
  const response = await axios.get(`/api/quizzes/unit/${unitId}/student`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Submit quiz pool attempt
export const submitQuizPoolAttempt = async (quizPoolId, answers, timeSpent, token) => {
  const response = await axios.post(`/api/quizzes/pool/${quizPoolId}/submit`, 
    { answers, timeSpent },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// Get student quiz results
export const getStudentQuizResults = async (studentId, token) => {
  const response = await axios.get(`/api/quizzes/student/${studentId}/results`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Create a new quiz pool
export const createQuizPool = async (poolData, token) => {
  const response = await axios.post('/api/quizzes/pool/create', poolData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Add a quiz to a pool
export const addQuizToPool = async (quizPoolId, quizId, token) => {
  const response = await axios.post(`/api/quizzes/pool/${quizPoolId}/add-quiz`, 
    { quizId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// Remove a quiz from a pool
export const removeQuizFromPool = async (quizPoolId, quizId, token) => {
  const response = await axios.delete(`/api/quizzes/pool/${quizPoolId}/quiz/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz pools for a course
export const getCourseQuizPools = async (courseId, token) => {
  const response = await axios.get(`/api/quizzes/pool/course/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz pool details
export const getQuizPoolDetails = async (quizPoolId, token) => {
  const response = await axios.get(`/api/quizzes/pool/${quizPoolId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz pool analytics
export const getQuizPoolAnalytics = async (quizPoolId, token) => {
  const response = await axios.get(`/api/quizzes/pool/${quizPoolId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
