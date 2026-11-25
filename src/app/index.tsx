import { Redirect } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { Loading } from '../components/ui';
import { useProfile } from '../data/ProfileProvider';

/** Decides where the app starts: welcome → setup → home. */
export default function Gate() {
  const { signedIn, loading, demo } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (loading || profileLoading) return <Loading />;
  if (!signedIn) return <Redirect href="/welcome" />;
  if (!profile) return <Redirect href={demo ? '/welcome' : '/onboarding'} />;
  return <Redirect href="/(tabs)" />;
}
