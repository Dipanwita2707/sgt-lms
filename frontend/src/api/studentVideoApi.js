import axios from 'axios';

// Get videos for a course with watch history
export const getCourseVideos = async (courseId, token) => {
  try {
    const response = await axios.get(`/api/student/course/${courseId}/videos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching course videos:', error);
    throw error;
  }
};

// Get course units with progress for student
export const getCourseUnits = async (courseId, token) => {
  try {
    const response = await axios.get(`/api/unit/student/course/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching course units:', error);
    throw error;
  }
};

// Update watch history for a video
export const updateWatchHistory = async (videoId, timeData, token) => {
  if (!token) {
    console.error('Token is missing for updateWatchHistory call');
    throw new Error('Authentication token is required');
  }
  
  if (!videoId) {
    console.error('Video ID is missing for updateWatchHistory call');
    throw new Error('Video ID is required');
  }
  
  try {
    console.log(`Sending watch history update for video ${videoId}:`, timeData);
    
    // Make sure duration is at least 0.1 to pass validation
    const sanitizedData = {
      ...timeData,
      duration: Math.max(0.1, timeData.duration || 0.1)
    };
    
    const response = await axios.post(`/api/student/video/${videoId}/watch`, sanitizedData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Watch history update response for video ${videoId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error updating watch history for video ${videoId}:`, error);
    console.error('Request data was:', timeData);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
};

// Get student's watch history across all courses
export const getWatchHistory = async (token) => {
  try {
    const response = await axios.get('/api/student/watch-history', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching watch history:', error);
    throw error;
  }
};

// Get detailed progress for a specific course
export const getCourseProgress = async (courseId, token) => {
  try {
    const response = await axios.get(`/api/student/course/${courseId}/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching course progress:', error);
    throw error;
  }
};

// Get all courses assigned to the student with progress information
export const getStudentCourses = async (token) => {
  try {
    const response = await axios.get('/api/student/courses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching student courses:', error);
    throw error;
  }
};

// Get student's quiz results for all courses or a specific course
export const getStudentQuizResults = async (courseId, token) => {
  try {
    const url = courseId ? `/api/student/quiz-results/${courseId}` : '/api/student/quiz-results';
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching student quiz results:', error);
    throw error;
  }
};

// Get deadline warnings for a course
export const getDeadlineWarnings = async (courseId, token) => {
  try {
    const response = await axios.get(`/api/student/course/${courseId}/deadline-warnings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching deadline warnings:', error);
    throw error;
  }
};

// Mark deadline warning as seen
export const markDeadlineWarningSeen = async (courseId, unitId, token) => {
  try {
    const response = await axios.post(`/api/student/course/${courseId}/unit/${unitId}/deadline-warning-seen`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error marking deadline warning as seen:', error);
    throw error;
  }
};

// Get all deadline warnings across all courses for the student
export const getAllDeadlineWarnings = async (token) => {
  try {
    const response = await axios.get('/api/student/deadline-warnings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all deadline warnings:', error);
    throw error;
  }
};

// Get video resume position for a student
export const getVideoResumePosition = async (videoId, token) => {
  try {
    const response = await axios.get(`/api/student/video/${videoId}/resume-position`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting video resume position:', error);
    throw error;
  }
};
