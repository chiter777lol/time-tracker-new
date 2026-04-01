import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5001/api' });

// Перехватчик для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = (data) => api.post('/register', data);
export const login = (data) => api.post('/login', data);
export const getProjects = () => api.get('/projects');
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const startSession = (data) => api.post('/sessions/start', data);
export const stopSession = (id) => api.put(`/sessions/${id}/stop`);
export const getActiveSession = () => api.get('/sessions/active');
export const getSessions = (params) => api.get('/sessions', { params });
export const getStats = (params) => api.get('/sessions/stats', { params });

export default api;
