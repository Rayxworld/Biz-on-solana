import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    let sessionId = window.localStorage.getItem('bizmart_session_id');
    if (!sessionId) {
      if (window.crypto?.randomUUID) {
        sessionId = window.crypto.randomUUID();
      } else {
        sessionId = `bizmart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
      window.localStorage.setItem('bizmart_session_id', sessionId);
    }
    config.headers = {
      ...config.headers,
      'X-Session-Id': sessionId,
    };
  }
  return config;
});
