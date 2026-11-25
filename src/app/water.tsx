import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from '../components/Icon';
import { Card, ErrorNote, Header, Row, Screen, T } from '../components/ui';
import { useProfile } from '../data/ProfileProvider';
import { getWater, setWater } from '../data/store';
import { addDays, todayKey, weekdayLetter } from '../lib/dates';
import { fmtVolume, waterGoalMl } from '../lib/nutrition';
import { useTheme } from '../theme/theme';

const R = 96;
const CIRC = 2 * Math.PI * R;

export default function Water() {
  const { c, units } = useTheme();
  const { profile } = useProfile();
  const today = todayKey();
  const from = addDays(today, -6);
  const [days, setDays] = useState<Record<string, number>>({});
  const [undo, setUndo] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    getWater(from, today).then(setDays).catch((e) => setError(e instanceof Error ? e.message : 'Could not load water'));
  }, [from, today]));

  const goal = waterGoalMl(profile?.weight_kg ?? 72);
  const ml = days[today] ?? 0;
  const pct = Math.min(1, ml / goal);
  const small = (v: number) => (units === 'imperial' ? `${Math.round(v * 0.033814)} oz` : `${v} ml`);

  async function change(delta: number) {
    const next = Math.max(0, ml + delta);
    setDays((d) => ({ ...d, [today]: next }));
    try { await setWater(today, next); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save'); }
  }

  const week = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const hit = week.filter((d) => (days[d] ?? 0) >= goal).length;

  return (
    <Screen>
      <Header title="Water" subtitle="Today · goal based on your body weight" onBack={() => router.back()} />
      <ErrorNote message={error} />
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <View style={{ width: 220, height: 220 }} accessible accessibilityLabel={`${fmtVolume(ml, units)} of ${fmtVolume(goal, units)} today`}>
          <Svg width={220} height={220} viewBox="0 0 220 220">
            <Circle cx={110} cy={110} r={R} stroke={c.surface2} strokeWidth={18} fill="none" />
            <Circle cx={110} cy={110} r={R} stroke={c.sky} strokeWidth={18} fill="none" strokeLinecap="round"
              strokeDasharray={`${CIRC}`} strokeDashoffset={CIRC * (1 - pct)} transform="rotate(-90 110 110)" />
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Icon name="water" size={26} color={c.sky} />
            <T v="display">{fmtVolume(ml, units)}</T>
            <T v="small" muted>of {fmtVolume(goal, units)}</T>
          </View>
        </View>
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: ml >= goal ? c.accentSoft : c.surface }}>
          <T v="bodyStrong" color={ml >= goal ? c.accentInk : c.text}>{ml >= goal ? 'Goal reached — nice work' : `${fmtVolume(goal - ml, units)} to go`}</T>
        </View>
      </View>

      <Row gap={10}>
        {([[250, 'Glass'], [500, 'Bottle'], [750, 'Shaker']] as const).map(([v, name]) => (
          <Pressable key={v} accessibilityRole="button" accessibilityLabel={`Add ${small(v)} ${name.toLowerCase()}`}
            onPress={() => { setUndo((u) => [...u, v]); change(v); }}
            style={{ flex: 1, height: 84, borderRadius: 18, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <T v="number">+{small(v)}</T>
            <T v="small" muted>{name}</T>
          </Pressable>
        ))}
      </Row>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: undo.length === 0 }} disabled={undo.length === 0}
        onPress={() => { const last = undo[undo.length - 1]; setUndo((u) => u.slice(0, -1)); change(-last); }}
        style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: undo.length ? 1 : 0.4 }}>
        <T v="bodyStrong" style={{ fontSize: 14 }}>Undo last{undo.length ? ` (−${small(undo[undo.length - 1])})` : ''}</T>
      </Pressable>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">Last 7 days</T>
          <T v="small" muted>Goal hit {hit} of 7 days</T>
        </Row>
        <View style={{ height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          {week.map((d) => {
            const v = days[d] ?? 0;
            const ok = v >= goal;
            return (
              <View key={d} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{ width: '100%', height: Math.max(4, Math.min(108, (v / goal) * 90)), borderRadius: 6, backgroundColor: ok ? c.sky : c.surface2,
                  borderWidth: d === today && !ok ? 2 : 0, borderColor: c.sky }} />
                <T v="small" muted style={{ fontSize: 11 }}>{d === today ? 'Today' : weekdayLetter(d)}</T>
              </View>
            );
          })}
        </View>
        <T v="small" muted>Full bar = daily goal of {fmtVolume(goal, units)}</T>
      </Card>
    </Screen>
  );
}
