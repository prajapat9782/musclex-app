import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getProfile, saveProfile } from './store';
import type { Profile } from './types';

type ProfileCtx = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  save: (p: Profile) => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<void>;
};

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { signedIn, session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!signedIn) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    try {
      setProfile(await getProfile());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile');
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!authLoading) reload();
  }, [authLoading, reload, session?.user?.id]);

  const save = useCallback(async (p: Profile) => {
    await saveProfile(p);
    setProfile(p);
  }, []);

  const update = useCallback(async (patch: Partial<Profile>) => {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    await saveProfile(next);
  }, [profile]);

  const value = useMemo(() => ({ profile, loading: loading || authLoading, error, reload, save, update }), [profile, loading, authLoading, error, reload, save, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProfile must be used inside ProfileProvider');
  return v;
}
