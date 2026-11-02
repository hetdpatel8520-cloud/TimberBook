import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CURRENT_APP_VERSION = '1.0.3';
export const CLOUD_247_URL = process.env.EXPO_PUBLIC_API_URL || 'https://timberbooks-backend.onrender.com/api';
export const PUBLIC_TUNNEL_URL = CLOUD_247_URL;
export const LOCAL_WIFI_URL = 'http://10.241.74.108:5000/api';

// Automatically detect host IP when running in Expo Go or Phone browser, or use 24/7 Cloud Host
const getInitialBaseUrl = () => {
  if (Platform.OS === 'web') return '/api';
  if (__DEV__) {
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
    const host = debuggerHost.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return `http://${host}:5000/api`;
    }
  }
  // Standalone Production APK: always default to permanent 24/7 Render Cloud URL
  return CLOUD_247_URL;
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

// Clear legacy server URL overrides if version changed
export const initApiUrl = async () => {
  try {
    const lastVersion = await AsyncStorage.getItem('@timberbooks_app_version');
    if (lastVersion !== CURRENT_APP_VERSION) {
      await AsyncStorage.removeItem('@timberbooks_server_url');
      await AsyncStorage.setItem('@timberbooks_app_version', CURRENT_APP_VERSION);
      setBaseUrl(CLOUD_247_URL);
      return CLOUD_247_URL;
    }

    if (__DEV__) {
      const saved = await AsyncStorage.getItem('@timberbooks_server_url');
      if (saved) {
        setBaseUrl(saved);
        return saved;
      }
    }
  } catch (e) {
    // ignore
  }
  return currentBaseUrl;
};

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

// 1. Health & Server Info API
export const healthApi = {
  check: async () => {
    const rootUrl = currentBaseUrl.replace(/\/api\/?$/, '');
    const res = await axios.get(`${rootUrl}/health`, { timeout: 8000 });
    return res.data;
  }
};

// 2. Setup API
export const setupApi = {
  getStatus: () => apiClient.get('/setup/status'),
  initialize: (payload) => apiClient.post('/setup/initialize', payload),
  seedDemo: () => apiClient.post('/setup/seed-demo')
};

// 3. Auth & Registration API
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

// 4. Company API
export const companyApi = {
  get: () => apiClient.get('/company'),
  update: (data) => apiClient.put('/company', data)
};

// 5. Ledgers API
export const ledgersApi = {
  list: (params) => apiClient.get('/ledgers', { params }),
  getById: (id) => apiClient.get(`/ledgers/${id}`),
  create: (data) => apiClient.post('/ledgers', data),
  update: (id, data) => apiClient.put(`/ledgers/${id}`, data),
  delete: (id) => apiClient.delete(`/ledgers/${id}`),
  getGroups: () => apiClient.get('/ledgers/groups')
};

// 6. Items API
export const itemsApi = {
  list: (params) => apiClient.get('/items', { params }),
  getById: (id) => apiClient.get(`/items/${id}`),
  create: (data) => apiClient.post('/items', data),
  update: (id, data) => apiClient.put(`/items/${id}`, data),
  delete: (id) => apiClient.delete(`/items/${id}`)
};

// 7. Invoices API
export const invoicesApi = {
  getNextNumber: () => apiClient.get('/invoices/next-number'),
  list: (params) => apiClient.get('/invoices', { params }),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
  cancel: (id) => apiClient.post(`/invoices/${id}/cancel`),
  getPdfUrl: (id) => `${currentBaseUrl}/invoices/${id}/pdf`
};

// 8. Purchases API
export const purchasesApi = {
  list: (params) => apiClient.get('/purchases', { params }),
  getById: (id) => apiClient.get(`/purchases/${id}`),
  create: (data) => apiClient.post('/purchases', data)
};

// 9. Vouchers API
export const vouchersApi = {
  getNextNumber: (type) => apiClient.get(`/vouchers/next-number/${type}`),
  list: (params) => apiClient.get('/vouchers', { params }),
  create: (data) => apiClient.post('/vouchers', data),
  delete: (id) => apiClient.delete(`/vouchers/${id}`)
};

// 10. Reports API
export const reportsApi = {
  getDashboard: () => apiClient.get('/reports/dashboard'),
  getLedgerStatement: (partyId, params) => apiClient.get(`/reports/ledger-statement/${partyId}`, { params }),
  getCashBook: (params) => apiClient.get('/reports/cash-book', { params }),
  getOutstanding: () => apiClient.get('/reports/outstanding'),
  getSalesRegister: (params) => apiClient.get('/reports/sales-register', { params }),
  getPurchaseRegister: (params) => apiClient.get('/reports/purchase-register', { params })
};

// 11. Settings & Backup API
export const settingsApi = {
  get: () => apiClient.get('/settings'),
  update: (data) => apiClient.put('/settings', data),
  exportBackup: () => apiClient.get('/settings/backup'),
  restoreBackup: (data) => apiClient.post('/settings/restore', { data })
};

// 12. Financial Years API
export const financialYearsApi = {
  list: () => apiClient.get('/financial-years'),
  switch: (id) => apiClient.post('/financial-years/switch', { id }),
  create: (data) => apiClient.post('/financial-years', data)
};

// 13. Cloud Sync API
export const syncApi = {
  getStatus: () => apiClient.get('/sync/status')
};

// 14. App Version & Updates API
export const appVersionApi = {
  checkVersion: (params) => apiClient.get('/app-version', { params })
};

export default apiClient;
