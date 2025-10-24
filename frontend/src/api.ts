import axios from 'axios';

const baseURL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000 
});

// ✅ Use an interceptor to automatically add the token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Add the standard "Bearer" prefix
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;