/**
 * Formats a video URL to ensure it's properly accessible
 * @param {string} videoUrl - The video URL from the backend
 * @returns {string} Properly formatted video URL
 */
export const formatVideoUrl = (videoUrl) => {
  if (!videoUrl) return '';
  
  // If the URL already starts with http, return it as is
  if (videoUrl.startsWith('http')) {
    return videoUrl;
  }
  
  // Get API base URL from environment variables
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Otherwise prepend the backend URL
  // Ensure the URL is properly formatted (handle both /uploads/file.mp4 and uploads/file.mp4 formats)
  const formattedUrl = videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`;
  return `${API_BASE_URL}${formattedUrl}`;
};

/**
 * Formats duration in seconds to a readable time format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  // Handle edge cases
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return '0:00';
  }
  
  // Ensure we have a positive number
  const duration = Math.max(0, parseFloat(seconds));
  
  // For longer videos, include hours
  if (duration >= 3600) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const remainingSeconds = Math.floor(duration % 60);
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
  
  // Standard minutes:seconds format
  const minutes = Math.floor(duration / 60);
  const remainingSeconds = Math.floor(duration % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};
