import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Bar, Card, Chip, ErrorNote, Row, Screen, T } from '../../components/ui';
import { useProfile } from '../../data/ProfileProvider';
import { addEntries, getWater, listEntries } from '../../data/store';
import { SLOTS, totalsOf, type FoodEntry, type PortionedFood, type Slot } from '../../data/types';
import { starterFood } from '../../lib/foods';
import { todayKey } from '../../lib/dates';
import { ACTIVITIES, GOALS, fmtHeight, fmtNum, fmtVolume, fmtWeight, goalOf, targets, waterGoalMl } from '../../lib/nutrition';
import { useTheme } from '../../theme/theme';

/** Suggested meals: share of the daily target and the foods that make them up. */
const PLAN: Record<Slot, { share: number; time: string; foods: string[] }> = {
  breakfast: { share: 0.25, time: '7:30', foods: ['oats', 'whey', 'banana', 'pb'] },
  lunch: { share: 0.35, time: '13:00', foods: ['chicken', 'rice', 'avocado', 'greens'] },
  snack: { share: 0.1, time: '16:30', foods: ['yogurt', 'berries', 'honey'] },
  dinner: { share: 0.3, time: '20:00', foods: ['salmon', 'sweetpotato', 'broccoli'] },
};

function suggestion(slot: Slot, dailyKcal: number): PortionedFood[] {
  const foods = PLAN[slot].foods.map(starterFood);
  const base = foods.reduce((a, f) => a + f.kcal, 0);
  const factor = (dailyKcal * PLAN[slot].share) / base;
  return foods.map((f) => ({ ...f, quantity: Math.max(0.5, Math.round(factor * 4) / 4) }));
}

export default function Meals() {
  const { c, units } = useTheme();
  const { profile, update } = useProfile();
  const today = todayKey();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [water, setWaterMl] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logging, setLogging] = useState<Slot | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, w] = await Promise.all([listEntries(today), getWater(today)]);
      setEntries(e); setWaterMl(w[today] ?? 0); setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load meals');
    }
  }, [today]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!profile) return null;
  const t = targets(profile);
  const g = goalOf(profile.goal);
  const tot = totalsOf(entries);
  const left = t.kcal - tot.kcal;
  const act = ACTIVITIES.find((a) => a.id === profile.activity);
  const waterGoal = waterGoalMl(profile.weight_kg);

  async function logSuggested(slot: Slot) {
    setLogging(slot);
    try { await addEntries(today, slot, suggestion(slot, t.kcal)); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not log that meal'); }
    finally { setLogging(null); }
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="title">Meal plan</T>
          <T v="small" muted>{fmtWeight(profile.weight_kg, units)} · {fmtHeight(profile.height_cm, units)} · {act?.label} · Maintenance ≈ {fmtNum(t.maintenance)} kcal</T>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/food/diary', params: { date: today } })}
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="calendar" size={16} color={c.text} />
          <T v="bodyStrong" style={{ fontSize: 14 }}>History</T>
        </Pressable>
      </Row>
      <ErrorNote message={error} />

      <T v="label" muted>Your goal</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {GOALS.map((x) => <Chip key={x.id} label={x.short} selected={x.id === profile.goal} onPress={() => update({ goal: x.id })} />)}
      </View>

      <Card style={{ borderRadius: 24, padding: 20, gap: 14 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4 }}>
            <T v="label" muted>Daily target</T>
            <T v="display" style={{ fontSize: 46, lineHeight: 50 }}>{fmtNum(t.kcal)} <T muted>kcal</T></T>
          </View>
          <View style={{ backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
            <T v="small" color={c.onAccent} style={{ fontWeight: '700' }}>{g.adj === 0 ? 'Maintenance' : `${g.adj > 0 ? '+' : '−'}${Math.abs(g.adj)} kcal`}</T>
          </View>
        </Row>
        <T v="small" muted>{g.why}</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="bodyStrong" style={{ fontSize: 13 }}>Eaten {fmtNum(tot.kcal)} kcal</T>
          <T v="small" muted>{left >= 0 ? `${fmtNum(left)} left` : `${fmtNum(-left)} over`}</T>
        </Row>
        <Bar value={tot.kcal / t.kcal} color={left >= 0 ? c.accentInk : c.flame} height={10} />
        <Row gap={10}>
          <MacroTile label="Protein" have={tot.protein} goal={t.protein} color={c.accentInk} />
          <MacroTile label="Carbs" have={tot.carbs} goal={t.carbs} color={c.sky} />
          <MacroTile label="Fat" have={tot.fat} goal={t.fat} color={c.flame} />
        </Row>
      </Card>

      <Pressable accessibilityRole="button" accessibilityLabel={`Water, ${fmtVolume(water, units)} of ${fmtVolume(waterGoal, units)}`} onPress={() => router.push('/water')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="water" color={c.sky} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="bodyStrong" style={{ fontSize: 14 }}>Water</T>
              <T v="small" muted>{fmtVolume(water, units)} of {fmtVolume(waterGoal, units)}</T>
            </Row>
            <Bar value={water / waterGoal} color={c.sky} height={6} />
          </View>
          <Icon name="chevron" size={18} color={c.muted} />
        </Card>
      </Pressable>

      <T v="h2">Today’s meals</T>
      {SLOTS.map(({ id, label }) => {
        const logged = entries.filter((e) => e.slot === id);
        const items: PortionedFood[] = logged.length ? logged : suggestion(id, t.kcal);
        const st = totalsOf(items);
        return (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, paddingRight: 10, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${label} details`} style={{ flex: 1, padding: 8, gap: 2 }}
              onPress={() => router.push({ pathname: '/food/meal', params: { date: today, slot: id } })}>
              <T v="small" muted>{label} · {logged.length ? 'Logged' : `Suggested · ${PLAN[id].time}`}</T>
              <T v="bodyStrong" numberOfLines={1}>{items.map((i) => i.name).join(', ')}</T>
              <T v="small" muted>{fmtNum(st.kcal)} kcal · {Math.round(st.protein)} g protein</T>
            </Pressable>
            {logged.length ? (
              <Row gap={4} style={{ backgroundColor: c.accentSoft, paddingHorizontal: 10, height: 36, borderRadius: 10 }}>
                <Icon name="check" size={14} color={c.accentInk} strokeWidth={3} />
                <T v="small" color={c.accentInk} style={{ fontWeight: '700' }}>Logged</T>
              </Row>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={`Log suggested ${label.toLowerCase()}`} disabled={logging !== null} onPress={() => logSuggested(id)}
                style={{ minHeight: 44, minWidth: 64, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <T v="bodyStrong" style={{ fontSize: 14 }}>{logging === id ? '…' : 'Log'}</T>
              </Pressable>
            )}
          </View>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/food/log', params: { date: today, slot: 'snack' } })}
        style={{ minHeight: 52, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="plus" size={16} color={c.text} strokeWidth={2.6} />
        <T v="bodyStrong">Log something else</T>
      </Pressable>
    </Screen>
  );
}

function MacroTile({ label, have, goal, color }: { label: string; have: number; goal: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /><T v="small" muted>{label}</T></Row>
      <T v="number" style={{ fontSize: 17 }}>{Math.round(have)}<T v="small" muted> / {goal} g</T></T>
      <Bar value={have / goal} color={color} height={6} />
    </View>
  );
}
