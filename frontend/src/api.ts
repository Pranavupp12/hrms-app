import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.1.67:5001/api',
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