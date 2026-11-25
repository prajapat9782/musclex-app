import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthCtx = {
  /** True when no Supabase project is configured: no sign-in, data stays on the device. */
  demo: boolean;
  loading: boolean;
  session: Session | null;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns true if the user must confirm their email before signing in. */
  signUp: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    demo: !isSupabaseConfigured,
    loading,
    session,
    signedIn: !isSupabaseConfigured || session !== null,
    async signIn(email, password) {
      if (!supabase) return;
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    async signUp(email, password) {
      if (!supabase) return false;
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      return data.session === null;
    },
    async resetPassword(email) {
      if (!supabase) return;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
    },
    async signOut() {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
  }), [loading, session]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
