import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, companyApi, setAuthToken, setActiveCompanyId } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [owner, setOwner] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
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
      setCompanies(res.companies || (res.company ? [res.company] : []));
      setActiveCompanyId(res.company?._id || res.owner?.activeCompanyId);
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
      setCompanies(res.companies || (res.company ? [res.company] : []));
      setActiveCompanyId(res.company?._id || res.owner?.activeCompanyId);
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
      setCompanies(res.companies || (res.company ? [res.company] : []));
      setActiveCompanyId(res.company?._id);
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
      setCompanies(res.companies || (res.company ? [res.company] : []));
      setActiveCompanyId(res.company?._id);
      setFinancialYear(res.financialYear);
      setIsLocked(false);
      return true;
    }
    return false;
  };

  // Switch Active Company
  const switchCompany = async (targetCompanyId) => {
    try {
      setIsLoading(true);
      const res = await companyApi.switchCompany(targetCompanyId);
      if (res.success) {
        if (res.token) {
          setAuthToken(res.token);
          setToken(res.token);
        }
        setCompany(res.company);
        setActiveCompanyId(res.company._id);
        if (res.currentFY) {
          setFinancialYear(res.currentFY);
        }
        await refreshCompanies();
        return res;
      }
      throw new Error(res.message || 'Could not switch company.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create an additional company under current owner
  const createNewCompany = async (companyData) => {
    try {
      setIsLoading(true);
      const res = await companyApi.createCompany(companyData);
      if (res.success) {
        if (res.token) {
          setAuthToken(res.token);
          setToken(res.token);
        }
        setCompany(res.company);
        setActiveCompanyId(res.company._id);
        if (res.financialYear) {
          setFinancialYear(res.financialYear);
        }
        await refreshCompanies();
        return res;
      }
      throw new Error(res.message || 'Could not create company.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all companies belonging to owner
  const refreshCompanies = async () => {
    try {
      const res = await companyApi.getMyCompanies();
      if (res.success && Array.isArray(res.companies)) {
        setCompanies(res.companies);
        if (res.activeCompanyId) {
          const matched = res.companies.find((c) => String(c._id) === String(res.activeCompanyId));
          if (matched) setCompany(matched);
        }
        return res.companies;
      }
    } catch (err) {
      console.warn('Failed to refresh companies list:', err.message);
    }
    return [];
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
    setActiveCompanyId(null);
    setToken(null);
    setOwner(null);
    setCompany(null);
    setCompanies([]);
    setIsLocked(false);
  };

  const refreshCompany = async () => {
    try {
      const res = await companyApi.get();
      if (res.company) {
        setCompany(res.company);
        setActiveCompanyId(res.company._id);
      }
    } catch (err) {
      console.warn('Failed to refresh company info', err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        owner,
        company,
        companies,
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
        switchCompany,
        createNewCompany,
        refreshCompanies,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
