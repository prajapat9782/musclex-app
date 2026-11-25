import { Tabs } from 'expo-router/tabs';
import { Icon, type IconName } from '../../components/Icon';
import { fonts, useTheme } from '../../theme/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'progress', title: 'Progress', icon: 'chart' },
  { name: 'community', title: 'Community', icon: 'users' },
  { name: 'meals', title: 'Meals', icon: 'meals' },
  { name: 'news', title: 'News', icon: 'news' },
];

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accentInk,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.nav, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color }) => <Icon name={t.icon} color={String(color)} /> }}
        />
      ))}
    </Tabs>
  );
}
