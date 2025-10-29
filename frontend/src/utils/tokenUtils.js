// Add this to check if user has stale JWT token
export const checkTokenFreshness = async (userEmail) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { isStale: false };
    
    // Call backend to check if user's roles have been updated
    const response = await fetch(`/api/admin/users/check-token-freshness/${userEmail}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data; // { isStale: boolean, currentRoles: [], primaryRole: '' }
    }
    
    return { isStale: false };
  } catch (error) {
    console.error('Error checking token freshness:', error);
    return { isStale: false };
  }
};

// Show notification if token is stale
export const showTokenRefreshNotification = (currentRoles, newRoles, primaryRole) => {
  const message = `
🎉 Your roles have been updated!

Current JWT: ${currentRoles.join(', ')}
New Roles: ${newRoles.join(', ')}
Primary: ${primaryRole}

Please logout and login again to see your new roles and use the role switcher.
  `;
  
  if (confirm(message + '\n\nWould you like to logout now?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('activeRole');
    window.location.href = '/login';
  }
};