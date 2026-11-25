import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Card, ErrorNote, Header, Row, Screen, Segmented, T, Toggle } from '../components/ui';
import { useProfile } from '../data/ProfileProvider';
import { deleteAccount } from '../data/store';
import { NEWS_TOPICS } from '../data/types';
import { fmtWeight, goalOf } from '../lib/nutrition';
import { ACCENTS, fonts, useTheme, type Mode, type Units } from '../theme/theme';

export default function ProfileScreen() {
  const { c, mode, setMode, accent, setAccent, units, setUnits } = useTheme();
  const { profile, update, reload } = useProfile();
  const { demo, signOut, session } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;
  const name = profile.name || 'Athlete';

  const changeUnits = (u: Units) => { setUnits(u); update({ units: u }).catch(() => {}); };

  function confirmDelete() {
    Alert.alert(
      demo ? 'Reset demo data?' : 'Delete your account?',
      demo ? 'This removes your profile and every log from this device.' : 'This permanently deletes your account and all of your logs. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: demo ? 'Reset' : 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteAccount(); await reload(); router.replace('/'); }
          catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the account'); }
        } },
      ],
    );
  }

  return (
    <Screen>
      <Header title="Profile" onBack={() => router.back()} />
      <ErrorNote message={error} />
      <Card style={{ borderRadius: 22 }}>
        <Row gap={14}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <T v="title" color={c.onAccent}>{name.charAt(0).toUpperCase()}</T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h2">{name}</T>
            <T v="small" muted>{goalOf(profile.goal).short} · {fmtWeight(profile.weight_kg, units)}</T>
            <T v="small" muted>{demo ? 'Demo mode · saved on this device' : session?.user?.email}</T>
          </View>
        </Row>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })}
          style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <T v="bodyStrong">Edit profile & goals</T>
        </Pressable>
      </Card>

      <Section title="Appearance">
        <T v="bodyStrong">Theme</T>
        <Segmented<Mode> label="Theme" value={mode} onChange={setMode}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]} />
        <T v="bodyStrong">Accent colour</T>
        <View accessibilityRole="radiogroup" accessibilityLabel="Accent colour" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ACCENTS.map((a) => {
            const on = a.hex.toLowerCase() === accent.toLowerCase();
            return (
              <Pressable key={a.hex} accessibilityRole="radio" accessibilityLabel={a.name} accessibilityState={{ selected: on }} onPress={() => setAccent(a.hex)}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: a.hex, borderWidth: on ? 3 : 0, borderColor: c.text }} />
            );
          })}
        </View>
        <T v="small" muted>Default: Volt lime. Applies across the app.</T>
        <T v="bodyStrong">Units</T>
        <Segmented<Units> label="Units" value={units} onChange={changeUnits}
          options={[{ value: 'metric', label: 'Metric · kg, cm' }, { value: 'imperial', label: 'Imperial · lb, ft' }]} />
      </Section>

      <Section title="Privacy">
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bodyStrong">Public progress</T>
            <T v="small" muted>Others can see your journey and streak in Community</T>
          </View>
          <Toggle label="Public progress" value={profile.is_public} onChange={(v) => update({ is_public: v })} />
        </Row>
      </Section>

      <Section title={`News topics · ${profile.news_topics.length} saved`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {NEWS_TOPICS.map((t) => {
            const on = profile.news_topics.includes(t);
            return (
              <Pressable key={t} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                onPress={() => update({ news_topics: on ? profile.news_topics.filter((x) => x !== t) : [...profile.news_topics, t] })}
                style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', borderWidth: on ? 0 : 1, borderColor: c.line, backgroundColor: on ? c.accent : c.surface }}>
                <T v="bodyStrong" color={on ? c.onAccent : c.text} style={{ fontSize: 14 }}>{t}</T>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Account">
        {!demo && (
          <Pressable accessibilityRole="button" onPress={async () => { await signOut(); router.replace('/'); }} style={{ minHeight: 48, justifyContent: 'center' }}>
            <T v="bodyStrong">Log out</T>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={confirmDelete} style={{ minHeight: 48, justifyContent: 'center' }}>
          <T v="bodyStrong" color={c.flame}>{demo ? 'Reset demo data' : 'Delete account'}</T>
        </Pressable>
      </Section>
      <T v="small" muted style={{ textAlign: 'center', fontFamily: fonts.body }}>MuscleX gives general fitness guidance, not medical advice.</T>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <T v="label" muted>{title}</T>
      <Card>{children}</Card>
    </View>
  );
}
