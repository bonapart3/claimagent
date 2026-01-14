// src/lib/hooks/useAuth.ts
// Authentication hook

'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useMemo, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ADJUSTER' | 'SUPERVISOR' | 'VIEWER';
  avatar?: string;
  permissions: string[];
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.permissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRole,
  }), [user, isLoading, login, logout, hasPermission, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Permission constants
export const PERMISSIONS = {
  // Claims
  CLAIMS_VIEW: 'claims:view',
  CLAIMS_CREATE: 'claims:create',
  CLAIMS_EDIT: 'claims:edit',
  CLAIMS_DELETE: 'claims:delete',
  CLAIMS_APPROVE: 'claims:approve',
  CLAIMS_REJECT: 'claims:reject',

  // Documents
  DOCUMENTS_VIEW: 'documents:view',
  DOCUMENTS_UPLOAD: 'documents:upload',
  DOCUMENTS_DELETE: 'documents:delete',

  // Fraud
  FRAUD_VIEW: 'fraud:view',
  FRAUD_INVESTIGATE: 'fraud:investigate',
  FRAUD_OVERRIDE: 'fraud:override',

  // Admin
  USERS_MANAGE: 'users:manage',
  SETTINGS_MANAGE: 'settings:manage',
  AUDIT_VIEW: 'audit:view',
} as const;

// Role permission mappings
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: Object.values(PERMISSIONS),
  SUPERVISOR: [
    PERMISSIONS.CLAIMS_VIEW,
    PERMISSIONS.CLAIMS_CREATE,
    PERMISSIONS.CLAIMS_EDIT,
    PERMISSIONS.CLAIMS_APPROVE,
    PERMISSIONS.CLAIMS_REJECT,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.FRAUD_VIEW,
    PERMISSIONS.FRAUD_INVESTIGATE,
    PERMISSIONS.AUDIT_VIEW,
  ],
  ADJUSTER: [
    PERMISSIONS.CLAIMS_VIEW,
    PERMISSIONS.CLAIMS_CREATE,
    PERMISSIONS.CLAIMS_EDIT,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.FRAUD_VIEW,
  ],
  VIEWER: [
    PERMISSIONS.CLAIMS_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
  ],
};

