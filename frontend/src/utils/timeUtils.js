/**
 * Formats seconds into a human-readable time string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "2h 15m 30s")
 */
export const formatTime = (seconds) => {
  if (seconds === undefined || seconds === null) return '0s';
  
  // Convert to number if it's a string
  const secondsNum = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  
  // Handle very small values (less than 1 second)
  if (secondsNum < 1 && secondsNum > 0) {
    // Display one decimal place for values less than 1 second
    return `${secondsNum.toFixed(1)}s`;
  }
  
  // Handle zero case
  if (secondsNum === 0) return '0s';
  
  const hours = Math.floor(secondsNum / 3600);
  const minutes = Math.floor((secondsNum % 3600) / 60);
  const remainingSeconds = Math.floor(secondsNum % 60);
  
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  if (remainingSeconds > 0 || result === '') result += `${remainingSeconds}s`;
  
  return result.trim();
};
