import { useState, useEffect } from 'react';
import { api, getToken, removeToken } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, setUser, logout } = useAuthStore();
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    checkAuth();

    // Set up a poll to check auth status every 10 seconds if user is not approved
    const interval = setInterval(() => {
      if (getToken()) {
        checkAuth(true); // silent check
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const checkAuth = async (silent = false) => {
    const token = getToken();
    if (!token) {
      if (!silent) setLoading(false);
      setUser(null);
      return;
    }

    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const signOut = () => {
    logout();
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    checkAuth
  };
}
