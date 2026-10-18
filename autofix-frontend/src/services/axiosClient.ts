import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token & Device Name
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const deviceName = localStorage.getItem('autofix_device_name') || 'جهاز الورشة';
    config.headers['X-Device-Name'] = encodeURIComponent(deviceName);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401/PIN session
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized or PIN required');
      window.dispatchEvent(new CustomEvent('autofix-pin-required'));
    }
    if (error.response && error.response.status === 409 && !error.response.data?.requiresConfirmation) {
      const msg = error.response.data?.message || 'تم تعديل هذا السجل من جهاز آخر، أعد التحميل';
      window.dispatchEvent(new CustomEvent('autofix-concurrency-conflict', { detail: { message: msg } }));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
