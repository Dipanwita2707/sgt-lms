import axios from 'axios';

// Create a new quiz pool
export const createQuizPool = async (poolData, token) => {
  const response = await axios.post('/api/quiz-pools', poolData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Add a quiz to a pool
export const addQuizToPool = async (quizPoolId, quizId, token) => {
  const response = await axios.post(`/api/quiz-pools/${quizPoolId}/add-quiz`, 
    { quizId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// Remove a quiz from a pool
export const removeQuizFromPool = async (quizPoolId, quizId, token) => {
  const response = await axios.delete(`/api/quiz-pools/${quizPoolId}/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz pools for a course
export const getCourseQuizPools = async (courseId, token) => {
  const response = await axios.get(`/api/quiz-pools/course/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz pool details
export const getQuizPoolDetails = async (quizPoolId, token) => {
  const response = await axios.get(`/api/quiz-pools/${quizPoolId}/details`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz pool questions with answers
export const getQuizPoolQuestions = async (quizPoolId, token) => {
  const response = await axios.get(`/api/quiz-pools/${quizPoolId}/questions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get quiz pool analytics
export const getQuizPoolAnalytics = async (quizPoolId, token) => {
  const response = await axios.get(`/api/quiz-pools/${quizPoolId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get teacher's quiz pools
export const getTeacherQuizPools = async (token) => {
  const response = await axios.get('/api/teacher/quiz-pools', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get unit quiz for student
export const getUnitQuizForStudent = async (unitId, token) => {
  const response = await axios.get(`/api/quiz-pools/${unitId}/student`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Submit quiz pool attempt
export const submitQuizPoolAttempt = async (quizPoolId, answers, timeSpent, token) => {
  const response = await axios.post(`/api/quiz-pools/${quizPoolId}/submit`, 
    { answers, timeSpent },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// Get standalone quiz (non-pool) detailed info with questions & attempts
export const getQuizDetails = async (quizId, token) => {
  const response = await axios.get(`/api/quizzes/details/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
