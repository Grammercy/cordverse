import axios from 'axios';

// Create a configured axios instance
const api = axios.create({
  // Base config can go here if needed
});

// Set the base URL for all requests
api.defaults.baseURL = '/';

// Helper to set the master token
export const setMasterToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  localStorage.setItem('cordverse_master_token', token);
};

// Helper to clear the master token
export const clearMasterToken = () => {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('cordverse_master_token');
};

// Initialize from storage on load
const storedToken = localStorage.getItem('cordverse_master_token');
if (storedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

export default api;
