'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserFromToken, isAuthenticated } from '@/lib/auth';

interface UserInfo {
  id: number;
  email: string;
  role: string;
}

interface AuthContextType {
  user: UserInfo | null;
  isLoggedIn: boolean;
  updateUser: () => void;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const updateUser = () => {
    if (isAuthenticated()) {
      const userInfo = getUserFromToken();
      if (userInfo) {
        setUser(userInfo);
        setIsLoggedIn(true);
      }
    } else {
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const clearUser = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  useEffect(() => {
    updateUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, updateUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
