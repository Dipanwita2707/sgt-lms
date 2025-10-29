import axios from 'axios';

// Get all discussions for a course
export const getCourseDiscussions = async (courseId, token) => {
  try {
    const response = await axios.get(`/api/discussions/course/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching course discussions:', error);
    throw error;
  }
};

// Get a specific discussion with replies
export const getDiscussion = async (discussionId, token) => {
  try {
    const response = await axios.get(`/api/discussions/${discussionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching discussion:', error);
    throw error;
  }
};

// Create a new discussion
export const createDiscussion = async (discussionData, token) => {
  try {
    // Create FormData object to handle file uploads
    const formData = new FormData();
    
    // Add text fields
    formData.append('courseId', discussionData.courseId);
    formData.append('title', discussionData.title);
    formData.append('content', discussionData.content);
    
    // Add video ID if provided
    if (discussionData.videoId) {
      formData.append('videoId', discussionData.videoId);
    }
    
    // Add image if provided
    if (discussionData.image) {
      formData.append('image', discussionData.image);
    }
    
    const response = await axios.post('/api/discussions/create', formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating discussion:', error);
    throw error;
  }
};

// Add a reply to a discussion
export const addReply = async (discussionId, replyData, token) => {
  try {
    // Create FormData object to handle file uploads
    const formData = new FormData();
    
    // Add content field
    formData.append('content', replyData.content);
    
    // Add image if provided
    if (replyData.image) {
      formData.append('image', replyData.image);
    }
    
    const response = await axios.post(`/api/discussions/${discussionId}/reply`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding reply:', error);
    throw error;
  }
};

// Delete a discussion
export const deleteDiscussion = async (discussionId, token) => {
  try {
    const response = await axios.delete(`/api/discussions/${discussionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting discussion:', error);
    throw error;
  }
};

// Delete a reply
export const deleteReply = async (discussionId, replyId, token) => {
  try {
    const response = await axios.delete(`/api/discussions/${discussionId}/reply/${replyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting reply:', error);
    throw error;
  }
};
