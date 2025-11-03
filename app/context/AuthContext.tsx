'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextProps {
  isLoggedIn: boolean;
  username: string;
  login: (username: string, token?: string, roleId?: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const router = useRouter();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🧹 Helper: Clear all auth data safely
  const clearAuthStorage = useCallback(() => {
    try {
      localStorage.removeItem('username');
      localStorage.removeItem('access_token');
      localStorage.removeItem('role_id');
      localStorage.removeItem('user_id');
    } catch (err) {
      console.error('Error clearing auth storage:', err);
    }
  }, []);

  // ✅ Logout function
  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUsername('');
    clearAuthStorage();

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    router.push('/');
  }, [clearAuthStorage, router]);

  // ✅ Decode JWT and check expiration
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime > payload.exp;
    } catch (err) {
      console.error('Failed to decode token:', err);
      return true; // if invalid, force logout
    }
  };

  // ✅ Idle timeout handler
  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);


    const idleTimeout = 20 * 60 * 1000;

    idleTimerRef.current = setTimeout(() => {
      alert('You have been logged out due to inactivity.');
      logout();
    }, idleTimeout);
  }, [logout]);

  const resetIdleTimer = useCallback(() => {
    startIdleTimer();
  }, [startIdleTimer]);

  // ✅ Restore login state on page refresh
  useEffect(() => {
    const storedUser = localStorage.getItem('username');
    const token = localStorage.getItem('access_token');

    if (storedUser && token) {
      // If expired, force logout
      if (isTokenExpired(token)) {
        console.warn('Token expired, logging out automatically.');
        logout();
        return;
      }

      setIsLoggedIn(true);
      setUsername(storedUser);
      startIdleTimer();
    } else {
      clearAuthStorage();
    }
  }, [logout, startIdleTimer, clearAuthStorage]);

  // ✅ Login function
  const login = (username: string, token?: string, roleId?: number) => {
    setIsLoggedIn(true);
    setUsername(username);

    localStorage.setItem('username', username);
    if (token) localStorage.setItem('access_token', token);
    if (roleId !== undefined) localStorage.setItem('role_id', String(roleId));

    startIdleTimer();
  };

  // ✅ Listen for user activity to reset idle timer
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    if (isLoggedIn) {
      events.forEach((event) => window.addEventListener(event, handleActivity));
    }

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isLoggedIn, resetIdleTimer]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Hook for easy access to AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
