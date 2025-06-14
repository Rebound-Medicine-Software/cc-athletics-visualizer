
/**
 * Format date to DD/MM/YYYY format
 * @param dateString - Date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format date to DD/MM/YYYY HH:mm format
 * @param dateString - Date string or Date object
 * @returns Formatted date and time string
 */
export const formatDateTime = (dateString: string | Date): string => {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};
