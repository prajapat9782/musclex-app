import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Row, Screen, T } from '../../components/ui';
import { useProfile } from '../../data/ProfileProvider';
import { getWater, listEntries } from '../../data/store';
import { totalsOf, type FoodEntry } from '../../data/types';
import { addDays, todayKey, weekdayLetter } from '../../lib/dates';
import { fmtNum, fmtWeight, targets, waterGoalMl } from '../../lib/nutrition';
import { useTheme } from '../../theme/theme';

/** First version of Progress: the last 7 days of food and water. Weight, PRs and photos come next. */
export default function Progress() {
  const { c, units } = useTheme();
  const { profile } = useProfile();
  const today = todayKey();
  const from = addDays(today, -6);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [water, setWater] = useState<Record<string, number>>({});

  useFocusEffect(useCallback(() => {
    Promise.all([listEntries(from, today), getWater(from, today)])
      .then(([e, w]) => { setEntries(e); setWater(w); })
      .catch(() => {});
  }, [from, today]));

  if (!profile) return null;
  const t = targets(profile);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const kcal = days.map((d) => totalsOf(entries.filter((e) => e.date === d)).kcal);
  const logged = kcal.filter((k) => k > 0);
  const onTarget = kcal.filter((k) => k > 0 && Math.abs(k - t.kcal) <= t.kcal * 0.1).length;
  const wGoal = waterGoalMl(profile.weight_kg);
  const waterHit = days.filter((d) => (water[d] ?? 0) >= wGoal).length;
  const max = Math.max(t.kcal * 1.3, ...kcal);

  return (
    <Screen>
      <T v="title">Your journey</T>
      <Row gap={10}>
        <Stat label="Weight" value={fmtWeight(profile.weight_kg, units)} sub={`Goal ${fmtWeight(profile.target_kg, units)}`} />
        <Stat label="On target" value={`${onTarget}/7`} sub="days this week" />
        <Stat label="Water goal" value={`${waterHit}/7`} sub="days hit" />
      </Row>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/food/diary', params: { date: today } })}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h2">Calories · last 7 days</T>
            <T v="small" muted>avg {logged.length ? fmtNum(logged.reduce((a, b) => a + b, 0) / logged.length) : 0}</T>
          </Row>
          <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            {days.map((d, i) => {
              const ok = kcal[i] > 0 && Math.abs(kcal[i] - t.kcal) <= t.kcal * 0.1;
              return (
                <View key={d} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View style={{ width: '100%', height: Math.max(4, (kcal[i] / max) * 112), borderRadius: 6, backgroundColor: kcal[i] === 0 ? c.surface2 : ok ? c.accentInk : c.flame }} />
                  <T v="small" muted style={{ fontSize: 11 }}>{d === today ? 'Today' : weekdayLetter(d)}</T>
                </View>
              );
            })}
          </View>
          <T v="small" muted>Lime = within 10% of {fmtNum(t.kcal)} kcal · orange = under or over. Tap for the full diary.</T>
        </Card>
      </Pressable>
      <Card>
        <T v="h2">Coming in the next build</T>
        <T muted>Weight check-ins and chart, personal records from your workouts, streak calendar and progress photos.</T>
      </Card>
    </Screen>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card style={{ flex: 1, padding: 14, gap: 2 }}>
      <T v="small" muted style={{ fontSize: 11 }}>{label}</T>
      <T v="number">{value}</T>
      <T v="small" muted style={{ fontSize: 11 }}>{sub}</T>
    </Card>
  );
}
