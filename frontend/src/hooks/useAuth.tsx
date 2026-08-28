import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest, tokenStore } from '@/lib/api';
import { isDeskRole, roleAllowed } from '@/lib/roles';
import type { Role, User } from '@/types';

interface AuthState {
  user: User | null;
  /** True only while the initial "who am I?" request is in flight. */
  initializing: boolean;
  signIn: (email: string, password: string, portal?: 'student' | 'staff') => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  enrollmentNo?: string;
  department?: string;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [initializing, setInitializing] = React.useState(true);
  const queryClient = useQueryClient();

  // On a page refresh the token is still in storage but the user object is not,
  // so the session is restored from the API before anything renders.
  React.useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!tokenStore.get()) {
        setInitializing(false);
        return;
      }
      try {
        const { user: me } = await apiRequest<{ user: User }>('/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = React.useCallback(
    async (email: string, password: string, portal: 'student' | 'staff' = 'student') => {
      const result = await apiRequest<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      const desk = isDeskRole(result.user.role);
      if (portal === 'student' && desk) {
        throw new ApiError(
          403,
          'Staff members sign in through the Staff Portal.',
          'WRONG_PORTAL',
        );
      }
      if (portal === 'staff' && !desk) {
        throw new ApiError(
          403,
          'This portal is for desk staff. Use the student login to continue.',
          'WRONG_PORTAL',
        );
      }

      tokenStore.set(result.token);
      setUser(result.user);
      return result.user;
    },
    [],
  );

  const signUp = React.useCallback(async (input: SignUpInput) => {
    const result = await apiRequest<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: input,
    });
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = React.useCallback(() => {
    tokenStore.clear();
    setUser(null);
    // Drop every cached response so the next person to sign in on this device
    // never sees the previous user's data.
    queryClient.clear();
    void apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
  }, [queryClient]);

  const hasRole = React.useCallback(
    (...roles: Role[]) => (user ? roleAllowed(user.role, roles) : false),
    [user],
  );

  const value = React.useMemo(
    () => ({ user, initializing, signIn, signUp, signOut, hasRole }),
    [user, initializing, signIn, signUp, signOut, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
