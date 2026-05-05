import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import signalRService from '../services/signalRService';

interface AuthContextType {
  token: string | null;
  user: any | null;
  userId: string | null;
  role: 'Owner' | 'Admin' | 'Mechanic' | 'Customer' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const decoded: any = jwtDecode(savedToken);
          setToken(savedToken);
          setUser(decoded);
          setUserId(decoded.sub || null);
          const roles = decoded.roles || decoded.realm_access?.roles || [];
          if (roles.includes('Owner')) setRole('Owner');
          else if (roles.includes('Admin')) setRole('Admin');
          else if (roles.includes('Mechanic')) setRole('Mechanic');
          else if (roles.includes('Customer')) setRole('Customer');
        } catch (e) {
          localStorage.removeItem('token');
          setToken(null);
        }
        signalRService.connect();
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string) => {
    setIsLoading(true);
    try {
      const decoded: any = jwtDecode(newToken);
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(decoded);
      setUserId(decoded.sub || null);
      const roles = decoded.roles || decoded.realm_access?.roles || [];
      if (roles.includes('Owner')) setRole('Owner');
      else if (roles.includes('Admin')) setRole('Admin');
      else if (roles.includes('Mechanic')) setRole('Mechanic');
      else if (roles.includes('Customer')) setRole('Customer');
      signalRService.connect();
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
    signalRService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ 
      token, user, userId, role, isAuthenticated: !!token, isLoading, login, logout 
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
