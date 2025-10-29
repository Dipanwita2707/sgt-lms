/**
 * Utility functions for handling user roles in multi-role system (Backend)
 */

/**
 * Checks if a user has a specific role
 * Works with both legacy single role and new multi-role system
 * 
 * @param {Object} user - The user object
 * @param {string} targetRole - The role to check for
 * @returns {boolean} - Whether the user has the role
 */
function hasRole(user, targetRole) {
  if (!user) return false;
  
  // Check multi-role system first
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.includes(targetRole);
  }
  
  // Fallback to legacy single role system
  if (user.role) {
    return user.role === targetRole;
  }
  
  return false;
}

/**
 * Checks if a user has any of the specified roles
 * 
 * @param {Object} user - The user object
 * @param {string[]} targetRoles - Array of roles to check for
 * @returns {boolean} - Whether the user has any of the roles
 */
function hasAnyRole(user, targetRoles) {
  if (!user || !targetRoles || !Array.isArray(targetRoles)) return false;
  
  return targetRoles.some(role => hasRole(user, role));
}

/**
 * Checks if a user has all of the specified roles
 * 
 * @param {Object} user - The user object
 * @param {string[]} targetRoles - Array of roles to check for
 * @returns {boolean} - Whether the user has all of the roles
 */
function hasAllRoles(user, targetRoles) {
  if (!user || !targetRoles || !Array.isArray(targetRoles)) return false;
  
  return targetRoles.every(role => hasRole(user, role));
}

/**
 * Gets all roles for a user (returns array for consistency)
 * 
 * @param {Object} user - The user object
 * @returns {string[]} - Array of user roles
 */
function getUserRoles(user) {
  if (!user) return [];
  
  // Multi-role system
  if (user.roles && Array.isArray(user.roles)) {
    return [...user.roles]; // Return copy to prevent mutations
  }
  
  // Legacy single role system
  if (user.role) {
    return [user.role];
  }
  
  return [];
}

/**
 * Gets the primary role for display purposes
 * 
 * @param {Object} user - The user object
 * @returns {string|null} - Primary role or null if no roles
 */
function getPrimaryRole(user) {
  if (!user) return null;
  
  // Multi-role system with explicit primary role
  if (user.primaryRole) {
    return user.primaryRole;
  }
  
  // Multi-role system - return first role
  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles[0];
  }
  
  // Legacy single role system
  if (user.role) {
    return user.role;
  }
  
  return null;
}

/**
 * Checks if user is an admin (has admin role)
 */
function isAdmin(user) {
  return hasRole(user, 'admin');
}

/**
 * Checks if user is a teacher (has teacher role)
 */
function isTeacher(user) {
  return hasRole(user, 'teacher');
}

/**
 * Checks if user is a student (has student role)
 */
function isStudent(user) {
  return hasRole(user, 'student');
}

/**
 * Checks if user is a dean (has dean role)
 */
function isDean(user) {
  return hasRole(user, 'dean');
}

/**
 * Checks if user is an HOD (has hod role)
 */
function isHOD(user) {
  return hasRole(user, 'hod');
}

/**
 * Creates MongoDB query for finding users with specific roles
 * Handles both legacy and multi-role systems
 * 
 * @param {string|string[]} roles - Single role or array of roles
 * @returns {Object} - MongoDB query object
 */
function createRoleQuery(roles) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return {
    $or: [
      { roles: { $in: roleArray } },      // Multi-role system
      { role: { $in: roleArray } }        // Legacy single role system
    ]
  };
}

module.exports = {
  hasRole,
  hasAnyRole,
  hasAllRoles,
  getUserRoles,
  getPrimaryRole,
  isAdmin,
  isTeacher,
  isStudent,
  isDean,
  isHOD,
  createRoleQuery
};