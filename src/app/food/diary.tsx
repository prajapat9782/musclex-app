import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Bar, Card, ErrorNote, Header, IconButton, Row, Screen, T } from '../../components/ui';
import { useProfile } from '../../data/ProfileProvider';
import { copyDay, getWater, listEntries } from '../../data/store';
import { SLOTS, totalsOf, type FoodEntry } from '../../data/types';
import { addDays, dayLabel, fromKey, mondayOf, todayKey, weekdayLetter } from '../../lib/dates';
import { fmtNum, fmtVolume, targets, waterGoalMl } from '../../lib/nutrition';
import { fonts, useTheme } from '../../theme/theme';

export default function Diary() {
  const { c, units } = useTheme();
  const { profile } = useProfile();
  const today = todayKey();
  const params = useLocalSearchParams<{ date?: string }>();
  const [sel, setSel] = useState(params.date && params.date <= today ? params.date : today);
  const [anchor, setAnchor] = useState(mondayOf(sel));
  const [week, setWeek] = useState<FoodEntry[]>([]);
  const [prevDay, setPrevDay] = useState<FoodEntry[]>([]);
  const [water, setWater] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const end = addDays(anchor, 6);
      const [w, p, wat] = await Promise.all([listEntries(anchor, end), listEntries(addDays(sel, -1)), getWater(anchor, end)]);
      setWeek(w); setPrevDay(p); setWater(wat); setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your diary');
    }
  }, [anchor, sel]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!profile) return null;
  const t = targets(profile);
  const dayEntries = week.filter((e) => e.date === sel);
  const tot = totalsOf(dayEntries);
  const diff = Math.round(tot.kcal - t.kcal);
  const within = Math.abs(diff) <= t.kcal * 0.1;
  const status = dayEntries.length === 0 ? 'Not logged' : within ? 'On target' : diff < 0 ? `${fmtNum(-diff)} under` : `${fmtNum(diff)} over`;
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const loggedDays = days.filter((d) => d <= today && week.some((e) => e.date === d));
  const avg = loggedDays.length ? loggedDays.reduce((a, d) => a + totalsOf(week.filter((e) => e.date === d)).kcal, 0) / loggedDays.length : 0;
  const noNext = addDays(anchor, 7) > today;
  const canCopy = prevDay.length > 0 && copied !== sel;

  async function copyPrev() {
    if (!canCopy) return;
    try { await copyDay(addDays(sel, -1), sel); setCopied(sel); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not copy'); }
  }

  return (
    <Screen>
      <Header title="Food diary" onBack={() => router.back()} right={
        <Pressable accessibilityRole="button" onPress={() => { setSel(today); setAnchor(mondayOf(today)); }}
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, justifyContent: 'center' }}>
          <T v="bodyStrong" style={{ fontSize: 14 }}>Today</T>
        </Pressable>
      } />
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="back" label="Previous week" onPress={() => { const a = addDays(anchor, -7); setAnchor(a); setSel(addDays(a, 6)); }} />
        <T v="bodyStrong" style={{ fontSize: 14 }}>
          {fromKey(anchor).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {fromKey(addDays(anchor, 6)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </T>
        <View style={{ opacity: noNext ? 0.3 : 1 }} pointerEvents={noNext ? 'none' : 'auto'}>
          <IconButton icon="chevron" label="Next week" onPress={() => { const a = addDays(anchor, 7); setAnchor(a); setSel(a > today ? today : a); }} />
        </View>
      </Row>
      <Row gap={6}>
        {days.map((d) => {
          const future = d > today, on = d === sel;
          const list = week.filter((e) => e.date === d);
          const pct = totalsOf(list).kcal / t.kcal;
          const dot = list.length === 0 ? 'transparent' : pct >= 0.9 && pct <= 1.1 ? c.accentInk : c.flame;
          return (
            <Pressable key={d} disabled={future} onPress={() => setSel(d)} accessibilityRole="button" accessibilityState={{ selected: on, disabled: future }}
              accessibilityLabel={fromKey(d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              style={{ flex: 1, height: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2, opacity: future ? 0.35 : 1,
                backgroundColor: on ? c.strong : c.surface, borderWidth: on ? 0 : 1, borderColor: c.line }}>
              <T v="small" color={on ? c.onStrong : c.muted} style={{ fontSize: 11 }}>{weekdayLetter(d)}</T>
              <T v="number" color={on ? c.onStrong : c.text} style={{ fontSize: 17 }}>{fromKey(d).getDate()}</T>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
            </Pressable>
          );
        })}
      </Row>
      <ErrorNote message={error} />

      <Card style={{ borderRadius: 22 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4, flex: 1 }}>
            <T v="label" muted>{dayLabel(sel, 'long')}</T>
            <T v="title" style={{ fontSize: 32 }}>{fmtNum(tot.kcal)} <T v="small" muted>/ {fmtNum(t.kcal)} kcal</T></T>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: dayEntries.length === 0 ? c.surface2 : within ? c.accentSoft : c.flameSoft }}>
            <T v="small" color={dayEntries.length === 0 ? c.muted : within ? c.accentInk : c.flame} style={{ fontFamily: fonts.bold }}>{status}</T>
          </View>
        </Row>
        <Bar value={tot.kcal / t.kcal} color={within ? c.accentInk : c.flame} height={10} />
        <Row gap={10}>
          {[['Protein', tot.protein, t.protein], ['Carbs', tot.carbs, t.carbs], ['Fat', tot.fat, t.fat]].map(([l, h, g]) => (
            <View key={l as string} style={{ flex: 1, gap: 4 }}>
              <T v="small" muted>{l}</T>
              <T v="bodyStrong">{Math.round(h as number)}<T v="small" muted> / {g} g</T></T>
              <Bar value={(h as number) / (g as number)} height={5} />
            </View>
          ))}
        </Row>
        <T v="small" muted>{loggedDays.length ? `Week average ${fmtNum(avg)} kcal · ${loggedDays.length} of 7 days logged` : 'No days logged this week'}</T>
      </Card>

      <Row gap={10}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/water')} style={{ flex: 1 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
            <Icon name="water" color={c.sky} />
            <View style={{ flex: 1 }}>
              <T v="small" muted>Water</T>
              <T v="bodyStrong">{fmtVolume(water[sel] ?? 0, units)} / {fmtVolume(waterGoalMl(profile.weight_kg), units)}</T>
            </View>
          </Card>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canCopy }} onPress={copyPrev} style={{ flex: 1 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: canCopy ? c.surface : c.surface2 }}>
            <Icon name="copy" color={canCopy ? c.text : c.muted} size={20} />
            <View style={{ flex: 1 }}>
              <T v="small" muted>{prevDay.length ? `${fmtNum(totalsOf(prevDay).kcal)} kcal day before` : 'Nothing the day before'}</T>
              <T v="bodyStrong" color={canCopy ? c.text : c.muted}>{copied === sel ? 'Copied' : 'Copy previous day'}</T>
            </View>
          </Card>
        </Pressable>
      </Row>

      {SLOTS.map(({ id, label }) => {
        const list = dayEntries.filter((e) => e.slot === id);
        return (
          <Card key={id} style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${label} details`} onPress={() => router.push({ pathname: '/food/meal', params: { date: sel, slot: id } })}
              style={{ minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.line }}>
              <T v="bodyStrong" style={{ fontSize: 16 }}>{label}</T>
              <Row gap={6}><T v="bodyStrong" style={{ fontSize: 14 }}>{fmtNum(totalsOf(list).kcal)} kcal</T><Icon name="chevron" size={16} color={c.muted} /></Row>
            </Pressable>
            {list.length === 0 ? <T v="small" muted style={{ paddingHorizontal: 16, paddingTop: 12 }}>Nothing logged</T> : list.map((e) => (
              <Row key={e.id} style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="small" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{e.name}</T>
                  <T v="small" muted>{e.quantity !== 1 ? `${e.quantity} × ` : ''}{e.serving}</T>
                </View>
                <T v="small" muted>{fmtNum(e.kcal * e.quantity)} kcal</T>
              </Row>
            ))}
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/food/log', params: { date: sel, slot: id } })}
              style={{ minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="plus" size={16} color={c.accentInk} strokeWidth={2.6} />
              <T v="bodyStrong" color={c.accentInk} style={{ fontSize: 14 }}>Add food</T>
            </Pressable>
          </Card>
        );
      })}
    </Screen>
  );
}
