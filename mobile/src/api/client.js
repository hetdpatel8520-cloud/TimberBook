import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const PUBLIC_TUNNEL_URL = 'https://thereby-atmosphere-bicycle-nightlife.trycloudflare.com/api';
export const LOCAL_WIFI_URL = 'http://10.241.74.108:5000/api';

// Automatically detect host IP when running in Expo Go or Phone browser, or use Public Cloud Tunnel
const getInitialBaseUrl = () => {
  if (Platform.OS === 'web') return '/api';
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
  const host = debuggerHost.split(':')[0];
  if (host && host !== '127.0.0.1' && host !== 'localhost') {
    return `http://${host}:5000/api`;
  }
  // Standalone APK: default to public HTTPS tunnel so it works on 5G mobile data immediately
  return PUBLIC_TUNNEL_URL;
};

const DEFAULT_URL = getInitialBaseUrl();

let authToken = null;
let currentBaseUrl = DEFAULT_URL;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const setBaseUrl = (url) => {
  currentBaseUrl = url;
  apiClient.defaults.baseURL = url;
};

export const getBaseUrl = () => currentBaseUrl;

const apiClient = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Network error occurred';
    return Promise.reject(new Error(message));
  }
);

// 1. Setup API
export const setupApi = {
  getStatus: () => apiClient.get('/setup/status'),
  initialize: (payload) => apiClient.post('/setup/initialize', payload),
  seedDemo: () => apiClient.post('/setup/seed-demo')
};

// 2. Auth & Registration API
export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  verifyPin: (payload) => apiClient.post('/auth/verify-pin', typeof payload === 'object' ? payload : { pin: payload }),
  checkDuplicate: (payload) => apiClient.post('/auth/register-check', payload),
  sendOtp: (payload) => apiClient.post('/auth/send-otp', payload),
  verifyOtp: (payload) => apiClient.post('/auth/verify-otp', payload),
  register: (payload) => apiClient.post('/auth/register', payload),
  forgotPassword: (payload) => apiClient.post('/auth/forgot-password', payload),
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload),
  getMe: () => apiClient.get('/auth/me'),
  updateSecurity: (payload) => apiClient.post('/auth/security', payload)
};

// 3. Company API
export const companyApi = {
  get: () => apiClient.get('/company'),
  update: (data) => apiClient.put('/company', data)
};

// 4. Ledgers API
export const ledgersApi = {
  list: (params) => apiClient.get('/ledgers', { params }),
  getById: (id) => apiClient.get(`/ledgers/${id}`),
  create: (data) => apiClient.post('/ledgers', data),
  update: (id, data) => apiClient.put(`/ledgers/${id}`, data),
  delete: (id) => apiClient.delete(`/ledgers/${id}`),
  getGroups: () => apiClient.get('/ledgers/groups')
};

// 5. Items API
export const itemsApi = {
  list: (params) => apiClient.get('/items', { params }),
  getById: (id) => apiClient.get(`/items/${id}`),
  create: (data) => apiClient.post('/items', data),
  update: (id, data) => apiClient.put(`/items/${id}`, data),
  delete: (id) => apiClient.delete(`/items/${id}`)
};

// 6. Invoices API
export const invoicesApi = {
  getNextNumber: () => apiClient.get('/invoices/next-number'),
  list: (params) => apiClient.get('/invoices', { params }),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
  cancel: (id) => apiClient.post(`/invoices/${id}/cancel`),
  getPdfUrl: (id) => `${currentBaseUrl}/invoices/${id}/pdf`
};

// 7. Purchases API
export const purchasesApi = {
  list: (params) => apiClient.get('/purchases', { params }),
  getById: (id) => apiClient.get(`/purchases/${id}`),
  create: (data) => apiClient.post('/purchases', data)
};

// 8. Vouchers API
export const vouchersApi = {
  getNextNumber: (type) => apiClient.get(`/vouchers/next-number/${type}`),
  list: (params) => apiClient.get('/vouchers', { params }),
  create: (data) => apiClient.post('/vouchers', data),
  delete: (id) => apiClient.delete(`/vouchers/${id}`)
};

// 9. Reports API
export const reportsApi = {
  getDashboard: () => apiClient.get('/reports/dashboard'),
  getLedgerStatement: (partyId, params) => apiClient.get(`/reports/ledger-statement/${partyId}`, { params }),
  getCashBook: (params) => apiClient.get('/reports/cash-book', { params }),
  getOutstanding: () => apiClient.get('/reports/outstanding'),
  getSalesRegister: (params) => apiClient.get('/reports/sales-register', { params }),
  getPurchaseRegister: (params) => apiClient.get('/reports/purchase-register', { params })
};

// 10. Settings & Backup API
export const settingsApi = {
  get: () => apiClient.get('/settings'),
  update: (data) => apiClient.put('/settings', data),
  exportBackup: () => apiClient.get('/settings/backup'),
  restoreBackup: (data) => apiClient.post('/settings/restore', { data })
};

// 11. Financial Years API
export const financialYearsApi = {
  list: () => apiClient.get('/financial-years'),
  switch: (id) => apiClient.post('/financial-years/switch', { id }),
  create: (data) => apiClient.post('/financial-years', data)
};

// 12. Cloud Sync API
export const syncApi = {
  getStatus: () => apiClient.get('/sync/status')
};

export default apiClient;

