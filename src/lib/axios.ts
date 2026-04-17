import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ? 
    (import.meta.env.VITE_API_BASE_URL.endsWith('/') ? import.meta.env.VITE_API_BASE_URL : `${import.meta.env.VITE_API_BASE_URL}/`) : 
    'http://localhost:5000/api/',
  timeout: 10000,
  // Let Axios handle Content-Type automatically for FormData
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if it exists in localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      const isLoginPage = currentPath.startsWith('/login');
      if (!isLoginPage) {
        localStorage.removeItem('auth_token');
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&reason=session_expired`;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
