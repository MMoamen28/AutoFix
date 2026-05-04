import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  token: string | null;
  user: any | null;
  role: 'Owner' | 'Admin' | 'Mechanic' | 'Customer' | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<any | null>(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser(decoded);
        // Keycloak roles are usually in 'realm_access.roles' or 'roles'
        const roles = decoded.roles || decoded.realm_access?.roles || [];
        if (roles.includes('Owner')) setRole('Owner');
        else if (roles.includes('Admin')) setRole('Admin');
        else if (roles.includes('Mechanic')) setRole('Mechanic');
        else if (roles.includes('Customer')) setRole('Customer');
      } catch (e) {
        logout();
      }
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, role, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
