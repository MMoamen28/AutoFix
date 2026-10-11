import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import signalRService from '../services/signalRService';
import axiosClient from '../services/axiosClient';

interface AuthContextType {
  token: string | null;
  user: any | null;
  userId: string | null;
  role: 'Owner' | 'Admin' | 'Mechanic' | 'Technician' | 'Reception' | 'Accountant' | 'Customer' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  dataDirectory: string;
  isFallbackDirectory: boolean;
  login: (token: string, dataDir?: string, isFallback?: boolean) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<any | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [dataDirectory, setDataDirectory] = useState<string>(localStorage.getItem('dataDir') || 'C:\\AutoFixData');
  const [isFallbackDirectory, setIsFallbackDirectory] = useState<boolean>(localStorage.getItem('isFallbackDir') === 'true');
  const [isLoading, setIsLoading] = useState(true);

  const parseUserToken = (rawToken: string) => {
    const decoded: any = jwtDecode(rawToken);
    setUser(decoded);
    setUserId(decoded.sub || decoded.nameid || null);

    const roles = Array.isArray(decoded.roles) 
      ? decoded.roles 
      : [decoded.role || decoded.roles || decoded.realm_access?.roles || []].flat();

    if (roles.includes('Owner') || roles.includes('Admin')) setRole('Admin');
    else if (roles.includes('Technician') || roles.includes('Mechanic')) setRole('Mechanic');
    else if (roles.includes('Reception')) setRole('Reception');
    else if (roles.includes('Accountant')) setRole('Accountant');
    else if (roles.includes('Customer')) setRole('Customer');
    else setRole(roles[0] || 'Customer');

    const flag = decoded.must_change_password === true || decoded.must_change_password === 'true';
    setMustChangePassword(flag);
  };

  const refreshUserData = async () => {
    try {
      const res = await axiosClient.get('/auth/me');
      if (res.data) {
        if (res.data.dataDirectory) {
          setDataDirectory(res.data.dataDirectory);
          localStorage.setItem('dataDir', res.data.dataDirectory);
        }
        setIsFallbackDirectory(!!res.data.isFallbackDirectory);
        localStorage.setItem('isFallbackDir', String(!!res.data.isFallbackDirectory));
        setMustChangePassword(!!res.data.mustChangePassword);
      }
    } catch {
      // Ignored if offline or unauthenticated
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          parseUserToken(savedToken);
          setToken(savedToken);
          await refreshUserData();
          signalRService.connect();
        } catch (e) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, dataDir?: string, isFallback?: boolean) => {
    setIsLoading(true);
    try {
      localStorage.setItem('token', newToken);
      setToken(newToken);
      parseUserToken(newToken);
      
      if (dataDir) {
        setDataDirectory(dataDir);
        localStorage.setItem('dataDir', dataDir);
      }
      if (typeof isFallback === 'boolean') {
        setIsFallbackDirectory(isFallback);
        localStorage.setItem('isFallbackDir', String(isFallback));
      }

      signalRService.connect();
      refreshUserData();
    } catch (e) {
      console.error("Login failed: Invalid token", e);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setUserId(null);
    setRole(null);
    setMustChangePassword(false);
    signalRService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ 
      token, user, userId, role, isAuthenticated: !!token, isLoading, 
      mustChangePassword, dataDirectory, isFallbackDirectory, login, logout, refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
