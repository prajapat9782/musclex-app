import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Button, ErrorNote, Field, Header, Screen, Segmented, T } from '../components/ui';
import { useTheme } from '../theme/theme';

export default function SignIn() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signup' | 'login'>(params.mode === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  async function submit() {
    setBusy(true); setError(null); setInfo(null);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        router.replace('/');
      } else {
        const needsConfirm = await signUp(email, password);
        if (needsConfirm) setInfo('Check your inbox and tap the link to confirm your email, then log in.');
        else router.replace('/');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter your email first.'); return; }
    try {
      await resetPassword(email);
      setInfo('If that email has an account, a reset link is on its way.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header title={mode === 'login' ? 'Welcome back' : 'Create your account'} subtitle={mode === 'login' ? 'Log in to keep your streak going.' : 'Start your journey in under two minutes.'} onBack={() => router.back()} />
        <Segmented label="Account" value={mode} onChange={setMode} options={[{ value: 'signup', label: 'Sign up' }, { value: 'login', label: 'Log in' }]} />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} textContentType={mode === 'login' ? 'password' : 'newPassword'} />
        {mode === 'login' && (
          <Pressable accessibilityRole="button" onPress={forgot} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}>
            <T v="bodyStrong" color={c.accentInk}>Forgot password?</T>
          </Pressable>
        )}
        <ErrorNote message={error} />
        {info ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.accentSoft }}><T v="small">{info}</T></View> : null}
        <Button label={mode === 'login' ? 'Log in' : 'Create account'} onPress={submit} disabled={!valid} loading={busy} />
        <T v="small" muted style={{ textAlign: 'center' }}>By continuing you agree to the MuscleX Terms and Privacy Policy.</T>
      </Screen>
    </KeyboardAvoidingView>
  );
}
