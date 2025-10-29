import axios from 'axios';
import { getToken, logoutUser } from './authService';

// Set base URL for all API calls
// Always use the full backend URL to avoid proxy limitations for large uploads
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

console.log('🔧 Axios Configuration:', {
  API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL
});

// Add request interceptor for adding auth token
axios.interceptors.request.use(
  config => {
    // Get token from authService
    const token = getToken();
    
    // If token exists, add it to the request headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Add response interceptor for handling auth errors
axios.interceptors.response.use(
  response => {
    // Log successful responses for debugging
    console.log(`API Response Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  error => {
    // Log all API errors for debugging
    console.group('API Error');
    console.error('Error:', error.message);
    console.error('URL:', error.config?.url);
    console.error('Method:', error.config?.method);
    console.error('Status:', error.response?.status);
    console.error('Response Data:', error.response?.data);
    console.error('Current Path:', window.location.pathname);
    console.groupEnd();
    
    // Special handling for quiz-related endpoints - don't redirect immediately to avoid navigation issues
    const isQuizEndpoint = error.config?.url?.includes('/quiz/');
    const isQuizPage = window.location.pathname.includes('/quiz/');
    
    // If unauthorized or token expired, handle based on context
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Authentication error:', error.response.data);
      
      // If token is invalid or expired
      if (error.response.data.message === 'Token is not valid' || 
          error.response.data.message === 'Token expired') {
          
        // Store current location for redirect after login
        if (!window.location.pathname.includes('/login')) {
          localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        }
        
        // For quiz pages, handle differently to avoid redirect loops
        if (isQuizPage || isQuizEndpoint) {
          console.warn('Auth error on quiz page - handling specially to avoid redirect loop');
          
          // Don't auto-redirect, let the component handle it
          // Just clear the invalid token but keep the redirect info
          localStorage.removeItem('token');
          
          // Add an auth error flag that components can check
          localStorage.setItem('authError', 'true');
          
          // For API calls, still reject the promise so components can handle
          return Promise.reject(error);
        } else {
          // For non-quiz pages, proceed with normal logout and redirect
          logoutUser();
          
          // Delay redirect to allow current code to finish
          setTimeout(() => {
            window.location = '/login';
          }, 100);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default axios;
