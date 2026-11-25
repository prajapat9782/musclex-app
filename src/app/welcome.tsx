import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { Icon, type IconName } from '../components/Icon';
import { Button, Row, T } from '../components/ui';
import { fonts, useTheme } from '../theme/theme';

const FEATURES: { icon: IconName; text: string; tone: 'flame' | 'accent' | 'sky' }[] = [
  { icon: 'flame', text: 'Build habits and keep your streak alive', tone: 'flame' },
  { icon: 'meals', text: 'Calories and meals built for your goal', tone: 'accent' },
  { icon: 'users', text: 'Follow athletes and fitness news', tone: 'sky' },
];

export default function Welcome() {
  const { c } = useTheme();
  const { demo } = useAuth();
  const start = () => (demo ? router.push('/onboarding') : router.push({ pathname: '/sign-in', params: { mode: 'signup' } }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, justifyContent: 'space-between' }}>
        <Row gap={10}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" color={c.onAccent} size={24} strokeWidth={3.2} />
          </View>
          <T v="h2" style={{ fontSize: 24 }}>MuscleX</T>
        </Row>

        <View style={{ gap: 28 }}>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 54, letterSpacing: -2, color: c.text }}>
            Show up.{'\n'}Track it.{'\n'}<Text style={{ color: c.accentInk }}>Get stronger.</Text>
          </Text>
          <View style={{ gap: 12 }}>
            {FEATURES.map((f) => (
              <Row key={f.text} gap={14}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={f.icon} color={f.tone === 'flame' ? c.flame : f.tone === 'sky' ? c.sky : c.accentInk} />
                </View>
                <T v="bodyStrong" style={{ flex: 1 }}>{f.text}</T>
              </Row>
            ))}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Button label="Get started" onPress={start} />
          {demo ? (
            <T v="small" muted style={{ textAlign: 'center' }}>Demo mode — no account needed. Your data stays on this device.</T>
          ) : (
            <Button label="I already have an account" variant="secondary" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'login' } })} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
