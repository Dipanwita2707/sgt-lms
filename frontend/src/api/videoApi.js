import axios from 'axios';

export const uploadVideo = async (data, token, progressCallback) => {
  const formData = new FormData();
  
  // Explicitly handle each field to ensure unitId is included
  formData.append('file', data.file);
  formData.append('title', data.title);
  formData.append('description', data.description || '');
  formData.append('courseId', data.courseId);
  
  // Include video duration if extracted from file
  if (data.file.videoDuration) {
    formData.append('duration', data.file.videoDuration);
  }
  
  // Include unitId if it exists
  if (data.unitId) {
    formData.append('unitId', data.unitId);
  }
  
  const res = await axios.post('/api/admin/video/upload', formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
    timeout: 0, // No timeout for large video uploads
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    onUploadProgress: progressEvent => {
      if (progressCallback) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        progressCallback(percentCompleted);
      }
    }
  });
  
  return res.data;
};

export const getVideoAnalytics = async (videoId, token) => {
  const res = await axios.get(`/api/admin/video/${videoId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const removeVideo = async (id, token) => {
  const res = await axios.delete(`/api/admin/video/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const warnVideo = async (id, token) => {
  const res = await axios.patch(`/api/admin/video/${id}/warn`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
