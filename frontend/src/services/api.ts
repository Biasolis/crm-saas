import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  // Se rodando no navegador, localhost:3000 é onde o backend está exposto
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;