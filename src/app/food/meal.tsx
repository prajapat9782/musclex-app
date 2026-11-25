import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Button, Card, ErrorNote, Field, Header, Row, Screen, Segmented, T } from '../../components/ui';
import { useProfile } from '../../data/ProfileProvider';
import { copyDay, deleteEntry, listEntries, saveMeal, updateEntryQuantity } from '../../data/store';
import { SLOTS, slotLabel, totalsOf, type FoodEntry, type Slot } from '../../data/types';
import { addDays, dayLabel, todayKey } from '../../lib/dates';
import { fmtNum, round, targets } from '../../lib/nutrition';
import { useTheme } from '../../theme/theme';

export default function MealDetail() {
  const { c } = useTheme();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ date?: string; slot?: string }>();
  const today = todayKey();
  const date = params.date ?? today;
  const [slot, setSlot] = useState<Slot>(SLOTS.some((s) => s.id === params.slot) ? (params.slot as Slot) : 'breakfast');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [yesterday, setYesterday] = useState<FoodEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [mealName, setMealName] = useState('');
  const [done, setDone] = useState<Record<string, 'saved' | 'copied'>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, y] = await Promise.all([listEntries(date), listEntries(addDays(date, -1))]);
      setEntries(e); setYesterday(y); setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this meal');
    }
  }, [date]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const list = entries.filter((e) => e.slot === slot);
  const prev = yesterday.filter((e) => e.slot === slot);
  const tot = totalsOf(list);
  const kp = tot.protein * 4, kc = tot.carbs * 4, kf = tot.fat * 9, ks = Math.max(1, kp + kc + kf);
  const pct = (k: number) => (tot.kcal ? Math.round((k / ks) * 100) : 0);
  const key = `${date}:${slot}`;
  const isToday = date === today;
  const copyFromPrev = list.length === 0 || isToday;
  const canCopy = !done[`${key}:copied`] && (copyFromPrev ? prev.length > 0 : true);
  const label = slotLabel(slot);

  async function change(e: FoodEntry, q: number) {
    setEntries((all) => all.map((x) => (x.id === e.id ? { ...x, quantity: q } : x)));
    try { await updateEntryQuantity(e.id, q); } catch { load(); }
  }
  async function remove(e: FoodEntry) {
    setEntries((all) => all.filter((x) => x.id !== e.id));
    try { await deleteEntry(e.id); } catch { load(); }
  }
  async function copy() {
    if (!canCopy) return;
    try {
      if (copyFromPrev) await copyDay(addDays(date, -1), date, slot);
      else await copyDay(date, today, slot);
      setDone((d) => ({ ...d, [`${key}:copied`]: 'copied' }));
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not copy'); }
  }
  async function confirmSave() {
    try {
      await saveMeal(mealName.trim() || `My ${label.toLowerCase()}`, list);
      setSaving(false);
      setDone((d) => ({ ...d, [`${key}:saved`]: 'saved' }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the meal'); }
  }

  const footer = (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.nav }}>
      <Button label={`Add food to ${label.toLowerCase()}`} icon="plus" onPress={() => router.push({ pathname: '/food/log', params: { date, slot } })} />
    </View>
  );

  return (
    <Screen footer={footer}>
      <Header title={label} subtitle={dayLabel(date, 'long')} onBack={() => router.back()} />
      <Segmented label="Meal" value={slot} onChange={(s) => { setSlot(s); setSaving(false); }} options={SLOTS.map((s) => ({ value: s.id, label: s.label }))} />
      <ErrorNote message={error} />

      <Card style={{ borderRadius: 22 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 4 }}>
            <T v="label" muted>Meal total</T>
            <T v="display">{fmtNum(tot.kcal)} <T muted>kcal</T></T>
          </View>
          {profile && <T v="small" muted>{Math.round((tot.kcal / targets(profile).kcal) * 100)}% of your daily target</T>}
        </Row>
        <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, backgroundColor: c.surface2 }}>
          <View style={{ width: `${pct(kp)}%`, backgroundColor: c.accentInk }} />
          <View style={{ width: `${pct(kc)}%`, backgroundColor: c.sky }} />
          <View style={{ width: `${pct(kf)}%`, backgroundColor: c.flame }} />
        </View>
        <Row gap={10}>
          {([['Protein', tot.protein, kp, c.accentInk], ['Carbs', tot.carbs, kc, c.sky], ['Fat', tot.fat, kf, c.flame]] as const).map(([l, g, k, col]) => (
            <View key={l} style={{ flex: 1, gap: 2 }}>
              <Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} /><T v="small" muted>{l}</T></Row>
              <T v="number">{round(g, 1)} g</T>
              <T v="small" muted>{pct(k)}% of kcal</T>
            </View>
          ))}
        </Row>
      </Card>

      {list.length > 0 && (
        <Row gap={10}>
          <Button style={{ flex: 1, minHeight: 48 }} variant="secondary" label={done[`${key}:saved`] ? 'Saved to My meals' : 'Save as my meal'}
            disabled={!!done[`${key}:saved`]} onPress={() => { setSaving(true); setMealName(mealName || `My ${label.toLowerCase()}`); }} />
          <Button style={{ flex: 1, minHeight: 48 }} variant="secondary" disabled={!canCopy} onPress={copy}
            label={done[`${key}:copied`] ? 'Copied' : copyFromPrev ? (prev.length ? `Repeat yesterday’s` : 'Nothing yesterday') : 'Copy to today'} />
        </Row>
      )}
      {list.length === 0 && prev.length > 0 && (
        <Button variant="secondary" disabled={!canCopy} onPress={copy} label={done[`${key}:copied`] ? 'Copied' : `Repeat yesterday’s ${label.toLowerCase()}`} />
      )}
      {saving && (
        <Card highlight>
          <Field label="Name this meal" value={mealName} onChangeText={setMealName} placeholder="e.g. Usual lunch" autoFocus />
          <Row gap={10}>
            <Button style={{ flex: 1, minHeight: 44 }} variant="secondary" label="Cancel" onPress={() => setSaving(false)} />
            <Button style={{ flex: 1, minHeight: 44 }} label="Save" onPress={confirmSave} />
          </Row>
        </Card>
      )}

      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="h2">Foods</T>
        <T v="small" muted>{list.length} {list.length === 1 ? 'food' : 'foods'}</T>
      </Row>
      {list.length === 0 && (
        <View style={{ padding: 24, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', gap: 6 }}>
          <T v="bodyStrong">Nothing logged for {label.toLowerCase()}</T>
          <T v="small" muted>Add foods and the totals update on their own.</T>
        </View>
      )}
      {list.map((e) => (
        <Card key={e.id} style={{ padding: 12, gap: 10 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="bodyStrong">{e.name}</T>
              <T v="small" muted>P {round(e.protein * e.quantity, 1)} g · C {round(e.carbs * e.quantity, 1)} g · F {round(e.fat * e.quantity, 1)} g</T>
            </View>
            <T v="bodyStrong">{fmtNum(e.kcal * e.quantity)} kcal</T>
          </Row>
          <Row gap={8}>
            <Small label={`Less ${e.name}`} onPress={() => change(e, Math.max(0.25, e.quantity - 0.25))}><T v="h2">−</T></Small>
            <T v="small" style={{ flex: 1, textAlign: 'center' }}>{e.quantity} × {e.serving}</T>
            <Small label={`More ${e.name}`} onPress={() => change(e, e.quantity + 0.25)}><T v="h2">+</T></Small>
            <Small label={`Remove ${e.name}`} onPress={() => remove(e)} danger><Icon name="trash" size={18} color={c.flame} /></Small>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

function Small({ label, onPress, children, danger }: { label: string; onPress: () => void; children: React.ReactNode; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: danger ? 0 : 1, borderColor: c.line, backgroundColor: danger ? c.flameSoft : c.surface2 }}>
      {children}
    </Pressable>
  );
}
