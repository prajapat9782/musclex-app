import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Bar, Card, ErrorNote, Row, Screen, T } from '../../components/ui';
import { useProfile } from '../../data/ProfileProvider';
import { getHabits, getWater, listEntries, setHabit } from '../../data/store';
import { totalsOf } from '../../data/types';
import { addDays, fromKey, mondayOf, todayKey, weekdayLetter } from '../../lib/dates';
import { fmtNum, fmtVolume, goalOf, targets, trainingSplit, waterGoalMl } from '../../lib/nutrition';
import { fonts, useTheme } from '../../theme/theme';

const MANUAL_HABITS = [
  { id: 'workout', name: 'Complete workout', detail: 'Any training session counts' },
  { id: 'sleep', name: 'Sleep 8 hours', detail: 'Tick it when you wake up rested' },
  { id: 'steps', name: '10,000 steps', detail: 'Walk, run or hike' },
];

/** Consecutive active days ending today (or yesterday, if today isn't logged yet). */
function streakFrom(active: Set<string>, today: string): { current: number; best: number } {
  let start = active.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (active.has(start)) { current++; start = addDays(start, -1); }
  let best = 0, run = 0;
  [...active].sort().forEach((d, i, arr) => {
    run = i > 0 && addDays(arr[i - 1], 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return { current, best: Math.max(best, current) };
}

export default function Home() {
  const { c, units } = useTheme();
  const { profile } = useProfile();
  const today = todayKey();
  const [habits, setHabits] = useState<Record<string, string[]>>({});
  const [eaten, setEaten] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const [water, setWaterMl] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [h, e, w] = await Promise.all([getHabits(addDays(today, -120), today), listEntries(today), getWater(today)]);
      setHabits(h); setEaten(totalsOf(e)); setWaterMl(w[today] ?? 0); setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load today');
    }
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!profile) return null;
  const t = targets(profile);
  const waterGoal = waterGoalMl(profile.weight_kg);
  const active = new Set(Object.entries(habits).filter(([, list]) => list.length > 0).map(([d]) => d));
  const { current, best } = streakFrom(active, today);
  const todays = new Set(habits[today] ?? []);
  const name = profile.name || 'Athlete';
  const monday = mondayOf(today);

  async function toggle(id: string) {
    const done = !todays.has(id);
    setHabits((h) => ({ ...h, [today]: done ? [...(h[today] ?? []), id] : (h[today] ?? []).filter((x) => x !== id) }));
    try { await setHabit(today, id, done); } catch { load(); }
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: 4, flex: 1 }}>
          <T v="small" muted>{fromKey(today).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</T>
          <T v="title">Hey, {name}</T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile and settings" onPress={() => router.push('/profile')}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <T v="h2" color={c.onAccent} style={{ fontSize: 16 }}>{name.charAt(0).toUpperCase()}</T>
        </Pressable>
      </Row>
      <ErrorNote message={error} />

      <View style={{ backgroundColor: current > 0 ? c.accent : c.accentSoft, borderRadius: 24, padding: 20, gap: 16, borderWidth: current > 0 ? 0 : 2, borderColor: c.accentInk, borderStyle: current > 0 ? 'solid' : 'dashed' }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <T v="label" color={current > 0 ? c.onAccent : c.text}>{current > 0 ? 'Current streak' : 'Start your streak'}</T>
            <T v="display" color={current > 0 ? c.onAccent : c.text} style={{ fontSize: current > 0 ? 52 : 28, lineHeight: current > 0 ? 56 : 34 }}>
              {current > 0 ? `${current} day${current === 1 ? '' : 's'}` : 'Day 1 starts today'}
            </T>
            <T v="small" color={current > 0 ? c.onAccent : c.text}>
              {current > 0 ? `Best: ${best} days · Tick a habit today to keep it` : 'Tick at least one habit a day to build it.'}
            </T>
          </View>
          <Icon name="flame" size={36} color={current > 0 ? c.onAccent : c.accentInk} />
        </Row>
        <Row gap={6} style={{ justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(monday, i);
            const done = active.has(d);
            const isToday = d === today;
            const ink = current > 0 ? c.onAccent : c.text;
            return (
              <View key={d} style={{ alignItems: 'center', gap: 6 }}>
                <T v="small" color={ink} style={{ fontFamily: fonts.bold, fontSize: 11 }}>{weekdayLetter(d)}</T>
                <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: done ? (current > 0 ? '#0E0F0C' : c.accentInk) : 'transparent',
                  borderWidth: done ? 0 : 2, borderStyle: isToday ? 'dashed' : 'solid', borderColor: isToday ? ink : 'rgba(128,128,128,0.35)' }}>
                  {done && <Icon name="check" size={16} color={current > 0 ? c.accent : c.bg} strokeWidth={3} />}
                </View>
              </View>
            );
          })}
        </Row>
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="label" muted>Today’s workout</T>
          <T v="small" muted>{profile.days_per_week} days/week</T>
        </Row>
        <T v="h2" style={{ fontSize: 22 }}>{trainingSplit(profile.days_per_week)}</T>
        <T v="small" muted>Workout logging arrives in the next build. Tick “Complete workout” below after training.</T>
        <Pressable accessibilityRole="button" onPress={() => Alert.alert('Coming next', 'Live workout logging with sets, reps and a rest timer is part of the next build.')}
          style={{ minHeight: 50, borderRadius: 14, backgroundColor: c.strong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="play" size={18} color={c.onStrong} filled />
          <T v="bodyStrong" color={c.onStrong}>Start workout</T>
        </Pressable>
      </Card>

      <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/meals')}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label" muted>Fuel · {goalOf(profile.goal).short}</T>
            <Icon name="chevron" size={18} color={c.muted} />
          </Row>
          <Row gap={6} style={{ alignItems: 'baseline' }}>
            <T v="title">{fmtNum(eaten.kcal)}</T>
            <T muted>/ {fmtNum(t.kcal)} kcal</T>
          </Row>
          <Bar value={eaten.kcal / t.kcal} color={eaten.kcal > t.kcal * 1.1 ? c.flame : c.accentInk} />
          <T v="small" muted>
            {eaten.kcal <= t.kcal ? `${fmtNum(t.kcal - eaten.kcal)} kcal left` : `${fmtNum(eaten.kcal - t.kcal)} kcal over`} · Protein {Math.round(eaten.protein)} / {t.protein} g
          </T>
        </Card>
      </Pressable>

      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="h2">Daily habits</T>
        <T v="small" muted>{todays.size} of {MANUAL_HABITS.length} ticked</T>
      </Row>
      {MANUAL_HABITS.map((h) => (
        <HabitRow key={h.id} title={h.name} detail={h.detail} done={todays.has(h.id)} onPress={() => toggle(h.id)} streak={countStreak(habits, h.id, today)} />
      ))}
      <HabitRow title={`Drink ${fmtVolume(waterGoal, units)} water`} detail={`${fmtVolume(water, units)} logged · tap to add`} done={water >= waterGoal} auto onPress={() => router.push('/water')} />
      <HabitRow title={`Hit ${t.protein} g protein`} detail={`${Math.round(eaten.protein)} g from food logged today`} done={eaten.protein >= t.protein} auto onPress={() => router.push('/(tabs)/meals')} />
    </Screen>
  );
}

function countStreak(habits: Record<string, string[]>, id: string, today: string): number {
  let d = (habits[today] ?? []).includes(id) ? today : addDays(today, -1);
  let n = 0;
  while ((habits[d] ?? []).includes(id)) { n++; d = addDays(d, -1); }
  return n;
}

function HabitRow({ title, detail, done, onPress, streak, auto }: { title: string; detail: string; done: boolean; onPress: () => void; streak?: number; auto?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={auto ? 'button' : 'checkbox'}
      accessibilityState={auto ? undefined : { checked: done }}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, padding: 12, borderRadius: 16, borderWidth: 1,
        borderColor: done ? c.accentInk : c.line, backgroundColor: done ? c.accentSoft : c.surface }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.accentInk : 'transparent', borderWidth: done ? 0 : 2, borderColor: c.muted }}>
        {done && <Icon name="check" size={16} color={c.bg} strokeWidth={3} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyStrong">{title}</T>
        <T v="small" muted>{detail}</T>
      </View>
      {auto ? <Icon name="chevron" size={18} color={c.muted} /> : streak ? (
        <Row gap={4}><Icon name="flame" size={14} color={c.flame} /><T v="small" color={c.flame} style={{ fontFamily: fonts.bold }}>{streak}</T></Row>
      ) : null}
    </Pressable>
  );
}
