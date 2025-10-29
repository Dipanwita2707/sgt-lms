// Decode a JWT token (without verifying signature)
export function parseJwt(token) {
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
}

export const isTokenExpired = (token) => {
  try {
    const decoded = parseJwt(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const getTokenRoles = (token) => {
  try {
    const decoded = parseJwt(token);
    if (!decoded) return [];
    
    // Support both legacy single role and new multi-role system
    if (decoded.roles && Array.isArray(decoded.roles)) {
      return decoded.roles;
    } else if (decoded.role) {
      return [decoded.role];
    }
    return [];
  } catch (error) {
    console.error('Error getting token roles:', error);
    return [];
  }
};
