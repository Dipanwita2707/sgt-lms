// Restore user from token if missing in localStorage
export const restoreUserFromToken = () => {
  const token = getToken();
  if (!token) {
    console.log('No token found, cannot restore user');
    return null;
  }
  
  // Get user from localStorage first
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      console.log('User found in localStorage:', parsedUser?.email || 'No email');
      return parsedUser;
    } catch (e) {
      console.error('Error parsing stored user:', e);
      // Continue to restore from token
    }
  }
  
  // Extract user from token payload
  try {
    console.log('Attempting to restore user from token');
    const decoded = parseJwt(token);
    console.log('Token decoded, payload:', decoded);
    
    if (!decoded) {
      console.error('Failed to decode token');
      return null;
    }
    
    // JWT can have user info in different formats
    // Check common patterns
    let userData = null;
    
    if (decoded.user) {
      userData = decoded.user;
    } else if (decoded.id || decoded._id) {
      // If token has basic user identity info, construct minimal user object
      userData = {
        id: decoded.id || decoded._id,
        email: decoded.email,
        role: decoded.role
      };
    } else if (decoded.sub) {
      // Some JWTs use 'sub' for the user ID
      userData = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      };
    }
    
    if (userData) {
      console.log('User data extracted from token:', userData.email || 'No email');
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }
    
    console.error('No user data found in token payload');
    return null;
  } catch (error) {
    console.error('Error restoring user from token:', error);
    return null;
  }
};
// Authentication service for handling login/logout and token management
import axios from 'axios';

// Helper function to parse JWT token
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Login user and set token in localStorage
export const loginUser = async (email, password) => {
  try {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Login failed. Please try again.' 
    };
  }
};

// Logout user and clear localStorage
export const logoutUser = async () => {
  try {
    // Optional: Call the backend to invalidate the token if you implement token blacklisting
    // await axios.post('/api/auth/logout', {}, { 
    //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
    // });
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear any other app-specific storage
    localStorage.removeItem('dashboardMetrics');
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear localStorage even if the API call fails
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true };
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Check if token is expired
    const decoded = parseJwt(token);
    if (!decoded) return false;
    
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch (error) {
    return false;
  }
};

// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Get auth token
export const getToken = () => {
  return localStorage.getItem('token');
};

// Setup axios interceptors for authentication
export const setupAxiosInterceptors = () => {
  // Request interceptor to add token to all requests
  axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Debug log each request with token
        console.log(`API Request: ${config.method?.toUpperCase() || 'UNKNOWN'} ${config.url} (Auth: ${token ? 'Yes' : 'No'})`);
      } else {
        console.warn(`API Request without token: ${config.method?.toUpperCase() || 'UNKNOWN'} ${config.url}`);
      }
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );
  
  // Response interceptor to handle authentication errors
  axios.interceptors.response.use(
    (response) => {
      // Debug log successful responses
      console.log(`API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error('API Error Response:', error.response?.status, error.response?.config?.url);
      
      // Only handle 401 errors for API calls (not static resources)
      if (error.response && error.response.status === 401 && error.config && error.config.url) {
        console.warn('401 Unauthorized response detected');
        
        // Check if we need to redirect
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          console.warn('Unauthorized access, redirecting to login');
          // Store the current location to redirect back after login
          const currentLocation = window.location.pathname + window.location.search;
          localStorage.setItem('redirectAfterLogin', currentLocation);
          
          // Only clear auth if it's a true authentication failure
          // Don't logout during quiz attempt flow to avoid race conditions
          if (!currentPath.includes('/quiz/')) {
            logoutUser();
          }
          
          // Redirect after a short delay to allow any pending operations to complete
          setTimeout(() => {
            window.location.href = '/login';
          }, 300);
        }
      }
      return Promise.reject(error);
    }
  );
};
