import axios from 'axios';

const BASE_URL = '/api/forums';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// Get forums with highest upvotes but no answers yet
export const getUnansweredForums = async (limit = 10) => {
  try {
    const res = await axios.get(`${BASE_URL}/unanswered`, {
      params: { limit },
      ...getAuthHeader()
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Get all discussions (admin only)
export const getAllDiscussions = async (page = 1, limit = 10, filters = {}) => {
  const { course, status, sort, search } = filters;
  try {
    const res = await axios.get(`${BASE_URL}/all`, {
      params: { page, limit, course, status, sort, search },
      ...getAuthHeader()
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Get discussions for a specific course
export const getCourseDiscussions = async (courseId, page = 1, limit = 10) => {
  try {
    const res = await axios.get(`${BASE_URL}/course/${courseId}`, {
      params: { page, limit },
      ...getAuthHeader()
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Get a specific discussion with replies
export const getDiscussion = async (discussionId) => {
  try {
    const res = await axios.get(`${BASE_URL}/${discussionId}`, getAuthHeader());
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Create a new discussion
export const createDiscussion = async (data) => {
  try {
    const formData = new FormData();
    for (const key in data) {
      if (key === 'image' && data[key]) {
        formData.append('image', data[key]);
      } else {
        formData.append(key, data[key]);
      }
    }
    
    const res = await axios.post(`${BASE_URL}/create`, formData, {
      ...getAuthHeader(),
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Add a reply to a discussion
export const addReply = async (discussionId, data) => {
  try {
    const formData = new FormData();
    for (const key in data) {
      if (key === 'image' && data[key]) {
        formData.append('image', data[key]);
      } else {
        formData.append(key, data[key]);
      }
    }
    
    const res = await axios.post(`${BASE_URL}/${discussionId}/reply`, formData, {
      ...getAuthHeader(),
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Toggle resolved status of a discussion
export const toggleResolved = async (discussionId, isResolved) => {
  try {
    const res = await axios.patch(
      `${BASE_URL}/${discussionId}/resolve`, 
      { isResolved }, 
      getAuthHeader()
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Toggle pin status of a discussion (admin/teacher only)
export const togglePin = async (discussionId, isPinned) => {
  try {
    const res = await axios.patch(
      `${BASE_URL}/${discussionId}/pin`, 
      { isPinned }, 
      getAuthHeader()
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Mark a reply as an answer (teacher/admin only)
export const markReplyAsAnswer = async (discussionId, replyId, isAnswer) => {
  try {
    const res = await axios.patch(
      `${BASE_URL}/${discussionId}/reply/${replyId}/answer`, 
      { isAnswer }, 
      getAuthHeader()
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Delete a discussion
export const removeDiscussion = async (id) => {
  try {
    const res = await axios.delete(`${BASE_URL}/${id}`, getAuthHeader());
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Delete a reply
export const deleteReply = async (discussionId, replyId) => {
  try {
    const res = await axios.delete(
      `${BASE_URL}/${discussionId}/reply/${replyId}`, 
      getAuthHeader()
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};
