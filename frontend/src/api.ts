import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.1.38:5001/api', // Use your computer's IP
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