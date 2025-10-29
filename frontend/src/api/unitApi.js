import axios from 'axios';

// Get all units for a course
export const getUnitsByCourse = async (courseId, token) => {
  try {
    // Try the direct units API first
    const res = await axios.get(`/api/units/course/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error('Error fetching units:', err);
    return [];
  }
};

// Create a new unit for a course
export const createUnit = async (courseId, data, token) => {
  try {
    // Try both admin and direct unit API endpoints
    let res;
    try {
      // First try with admin endpoint
      res = await axios.post(`/api/admin/course/${courseId}/unit`, {
        ...data,
        courseId: courseId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (adminErr) {
      console.log('Admin unit endpoint failed, trying direct unit API');
      // If admin endpoint fails, try the direct unit API
      res = await axios.post(`/api/units`, {
        ...data,
        courseId: courseId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    
    return res.data;
  } catch (err) {
    console.error('Error creating unit:', err);
    if (err.response && err.response.data && err.response.data.message) {
      // If the server provided a specific error message, use it
      throw new Error(err.response.data.message);
    } else {
      throw new Error('Failed to create unit. Please try again later.');
    }
  }
};

// Recalculate unit access for all students in a course
export const recalculateUnitAccess = async (courseId, token) => {
  try {
    const res = await axios.post(`/api/unit/recalculate-access/${courseId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error('Error recalculating unit access:', err);
    if (err.response && err.response.data && err.response.data.message) {
      throw new Error(err.response.data.message);
    } else {
      throw new Error('Failed to recalculate unit access. Please try again later.');
    }
  }
};
