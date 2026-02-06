import Constants from 'expo-constants';

// Get API URL from environment or use default
const getApiUrl = () => {
  // Check if running in Expo Go (development)
  const isDevelopment = __DEV__;

  // Get from app config (set in eas.json)
  const configUrl = Constants.expoConfig?.extra?.apiUrl;

  if (configUrl) {
    return configUrl;
  }

  // Default: Use relative URL for development, production URL for production
  if (isDevelopment) {
    return ''; // Relative URLs work in development
  }

  // REPLACE THIS WITH YOUR PRODUCTION SERVER URL
  return 'https://your-backend-url.com'; // TODO: Update this!
};

export const API_URL = getApiUrl();

console.log('API URL configured:', API_URL);
