'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  authApi,
  clearTokens,
  getRefreshToken,
  setTokens,
  userApi,
  type UserProfile,
} from '@/lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await userApi.getProfile();
      setUser(profile);
    } catch (err) {
      // Access token either missing or expired and refresh also failed
      setUser(null);
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
      }
    }
  }, []);

  // On mount, check if a refresh token exists and silently re-authenticate
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      if (getRefreshToken()) {
        // apiFetch will automatically try to refresh using the stored
        // refresh token; just call getProfile() and let it handle 401→refresh
        await refreshUser();
      }
      setIsLoading(false);
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login({ email, password });
    setTokens(tokens.access_token, tokens.refresh_token);
    const profile = await userApi.getProfile();
    setUser(profile);
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; password: string; phone?: string }) => {
      const tokens = await authApi.register(data);
      setTokens(tokens.access_token, tokens.refresh_token);
      const profile = await userApi.getProfile();
      setUser(profile);
    },
    [],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    // Hard-navigate to home rather than client-side routing so in-memory
    // state (including the access token module variable) is fully reset.
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>. Wrap your root layout with it.');
  }
  return ctx;
}
