/**
 * Utility functions for handling permissions across the application
 */

import { hasRole } from './roleUtils';

/**
 * Checks if a user has a specific permission
 * Handles both formats: snake_case (manage_videos) and Title Case (Manage Videos)
 * 
 * @param {Object} user - The user object from JWT token
 * @param {String} permission - The permission to check in snake_case format
 * @returns {Boolean} - Whether the user has the permission
 */
export function hasPermission(user, permission) {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) {
    return false;
  }
  
  // Admin has all permissions (supports multi-role)
  if (hasRole(user, 'admin')) {
    return true;
  }
  
  // Check for wildcard
  if (user.permissions.includes('*')) {
    return true;
  }
  
  // Direct match in snake_case (e.g., manage_videos)
  if (user.permissions.includes(permission)) {
    return true;
  }
  
  // Try matching Title Case version (e.g., Manage Videos)
  const titleCasePermission = permission
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  if (user.permissions.includes(titleCasePermission)) {
    return true;
  }
  
  // If permission is already in Title Case, try snake_case version
  if (permission.includes(' ')) {
    const snakeCasePermission = permission
      .toLowerCase()
      .replace(/\s+/g, '_');
    
    return user.permissions.includes(snakeCasePermission);
  }
  
  return false;
}

/**
 * Gets a list of all permissions the user has access to
 * 
 * @param {Object} user - The user object from JWT token
 * @returns {Array} - Array of permission objects with key and label
 */
export function getUserPermissions(user) {
  const allPermissions = [
    { key: 'manage_teachers', label: 'Manage Teachers' },
    { key: 'manage_students', label: 'Manage Students' },
    { key: 'manage_courses', label: 'Manage Courses' },
    { key: 'manage_videos', label: 'Manage Videos' },
    { key: 'view_analytics', label: 'View Analytics' }
  ];
  
  if (!user || !user.permissions) {
    return [];
  }
  
  return allPermissions.filter(p => hasPermission(user, p.key));
}
