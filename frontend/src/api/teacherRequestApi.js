import axios from 'axios';

export const createTeacherRequest = async (message, token) => {
  const res = await axios.post('/api/teacher-requests', { message }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeacherRequests = async (token) => {
  const res = await axios.get('/api/teacher-requests', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
