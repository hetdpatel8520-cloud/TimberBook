import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, companyApi, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [owner, setOwner] = useState(null);
  const [company, setCompany] = useState(null);
  const [financialYear, setFinancialYear] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Login with Mobile or Email or Username + Password
  const login = async (identifier, password) => {
    const res = await authApi.login({ identifier, password });
    if (res.success) {
      setAuthToken(res.token);
      setToken(res.token);
      setOwner(res.owner);
      setCompany(res.company);
      setFinancialYear(res.financialYear);
      setIsLocked(false);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  // Login with Quick PIN
  const loginWithPin = async (pin, identifier) => {
    const res = await authApi.verifyPin({ pin, identifier });
    if (res.success) {
      setAuthToken(res.token);
      setToken(res.token);
      setOwner(res.owner);
      setCompany(res.company);
      setFinancialYear(res.financialYear);
      setIsLocked(false);
      return res;
    }
    throw new Error(res.message || 'PIN login failed');
  };

  // Register New Company & Owner
  const registerCompany = async (registrationPayload) => {
    const res = await authApi.register(registrationPayload);
    if (res.success) {
      setAuthToken(res.token);
      setToken(res.token);
      setOwner(res.owner);
      setCompany(res.company);
      setFinancialYear(res.financialYear);
      setIsLocked(false);
      return res;
    }
    throw new Error(res.message || 'Company registration failed');
  };

  // Check duplicate mobile, email, or GSTIN
  const checkDuplicate = async (data) => {
    return await authApi.checkDuplicate(data);
  };

  // Send Mobile / Email OTP
  const sendOtp = async (data) => {
    return await authApi.sendOtp(data);
  };

  // Verify OTP
  const verifyOtp = async (data) => {
    return await authApi.verifyOtp(data);
  };

  // Forgot password OTP request
  const forgotPassword = async (identifier) => {
    return await authApi.forgotPassword({ identifier });
  };

  // Reset password & PIN with OTP
  const resetPassword = async (payload) => {
    return await authApi.resetPassword(payload);
  };

  const unlockWithPin = async (pin) => {
    const res = await authApi.verifyPin({ pin });
    if (res.success) {
      setAuthToken(res.token);
      setToken(res.token);
      setOwner(res.owner);
      setCompany(res.company);
      setFinancialYear(res.financialYear);
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const switchActiveFY = async (fy) => {
    setFinancialYear(fy);
  };

  const lockApp = () => {
    if (owner?.biometricEnabled || owner?.hasPin) {
      setIsLocked(true);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setOwner(null);
    setCompany(null);
    setIsLocked(false);
  };

  const refreshCompany = async () => {
    try {
      const res = await companyApi.get();
      if (res.company) setCompany(res.company);
    } catch (err) {
      console.warn('Failed to refresh company info', err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        owner,
        company,
        financialYear,
        token,
        isAuthenticated: !!token,
        isLoading,
        isLocked,
        login,
        loginWithPin,
        registerCompany,
        checkDuplicate,
        sendOtp,
        verifyOtp,
        forgotPassword,
        resetPassword,
        unlockWithPin,
        lockApp,
        logout,
        refreshCompany,
        setCompany,
        switchActiveFY
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
