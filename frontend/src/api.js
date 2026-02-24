import axios from 'axios';

const getBaseURL = () => {
  const env = import.meta.env;
  if (env.VITE_API_URL) return env.VITE_API_URL;
  if (env.MODE === 'development') return '/api';
  return '/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export async function getMe() {
  const { data } = await api.get('/me');
  return data;
}

export async function chat(messages) {
  const { data } = await api.post('/chat', { messages });
  return data;
}

export async function zentraScore(income, expenses, savings, debt) {
  const { data } = await api.post('/zentra-score', { income, expenses, savings, debt });
  return data;
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
