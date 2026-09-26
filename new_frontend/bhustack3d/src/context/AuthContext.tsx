import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, AuthResponse } from '../types';
import { authService } from '../services/authService';
import { ApiError, clearAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password?: string, preferredRole?: Role) => Promise<AuthResponse | undefined>;
  signup: (data: { email: string; password: string; fullName: string; role: Role; username: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const hadToken = !!getAuthToken();
        if (hadToken) {
          const current = await authService.getCurrentUser();
          setUser(current);
        } else {
          // No token present — visitor is genuinely signed out until they log in.
          setUser(null);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearAuthToken();
          setSessionExpired(true);
        }
        console.warn('Auth initialization fallback:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password?: string, preferredRole: Role = 'Surveyor') => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password, preferredRole);
      setUser(res.user);
      setSessionExpired(false);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: { email: string; password: string; fullName: string; role: Role; username: string }) => {
    setIsLoading(true);
    try {
      const res = await authService.signup(data);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        sessionExpired,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
