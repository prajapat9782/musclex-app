import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Button, Card, ErrorNote, Field, Header, IconButton, Row, Screen, Segmented, T } from '../../components/ui';
import { addEntries, listSavedMeals, recentFoods } from '../../data/store';
import { SLOTS, slotLabel, totalsOf, type FoodItem, type PortionedFood, type SavedMeal, type Slot } from '../../data/types';
import { searchOnline, searchStarter } from '../../lib/foods';
import { dayLabel, todayKey } from '../../lib/dates';
import { fmtNum, round } from '../../lib/nutrition';
import { fonts, useTheme } from '../../theme/theme';

type Tab = 'search' | 'recent' | 'meals' | 'quick';

export default function LogFood() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ date?: string; slot?: string }>();
  const date = params.date ?? todayKey();
  const [slot, setSlot] = useState<Slot>(SLOTS.some((s) => s.id === params.slot) ? (params.slot as Slot) : 'snack');
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [online, setOnline] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<PortionedFood[]>([]);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<{ name: string; kcal: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quick, setQuick] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });

  useFocusEffect(useCallback(() => {
    recentFoods().then(setRecent).catch(() => {});
    listSavedMeals().then(setMeals).catch(() => {});
  }, []));

  // Debounced online search (USDA + Open Food Facts).
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => {
    ctrl.current?.abort();
    if (tab !== 'search' || q.trim().length < 2) { setOnline([]); setSearching(false); return; }
    const ac = new AbortController();
    ctrl.current = ac;
    setSearching(true);
    const timer = setTimeout(() => {
      searchOnline(q, ac.signal).then((r) => { if (!ac.signal.aborted) setOnline(r); }).finally(() => { if (!ac.signal.aborted) setSearching(false); });
    }, 400);
    return () => { clearTimeout(timer); ac.abort(); };
  }, [q, tab]);

  const list: FoodItem[] = useMemo(() => {
    if (tab === 'recent') return recent;
    return [...searchStarter(q), ...online];
  }, [tab, q, online, recent]);

  async function add(items: PortionedFood[], name: string) {
    setError(null);
    try {
      await addEntries(date, slot, items);
      setAdded((a) => [...a, { name, kcal: totalsOf(items).kcal }]);
      setOpen(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that food');
      return false;
    }
  }

  const n = (s: string) => { const v = parseFloat(s.replace(',', '.')); return Number.isFinite(v) && v > 0 ? v : 0; };
  const fromMacros = Math.round(n(quick.protein) * 4 + n(quick.carbs) * 4 + n(quick.fat) * 9);
  const typedKcal = quick.kcal.trim() ? Math.round(n(quick.kcal)) : null;
  const quickKcal = typedKcal ?? fromMacros;
  const quickNote = typedKcal !== null && fromMacros > 0 && Math.abs(typedKcal - fromMacros) > 25
    ? `Your macros add up to ${fromMacros} kcal — check your numbers`
    : typedKcal !== null ? 'Using the calories you entered' : 'Calories from macros: 4 per g of protein and carbs, 9 per g of fat';

  const addedKcal = added.reduce((a, x) => a + x.kcal, 0);
  const footer = added.length > 0 ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.nav }}>
      <View style={{ flex: 1 }}>
        <T v="bodyStrong" style={{ fontSize: 14 }}>{added.length} {added.length === 1 ? 'item' : 'items'} added · {fmtNum(addedKcal)} kcal</T>
        <T v="small" muted numberOfLines={1}>{added.map((a) => a.name).join(', ')}</T>
      </View>
      <Button label="Done" onPress={() => router.back()} style={{ minHeight: 48 }} />
    </View>
  ) : undefined;

  return (
    <Screen footer={footer}>
      <Header title="Log food" subtitle={`${dayLabel(date)} · adding to ${slotLabel(slot)}`} onBack={() => router.back()}
        right={<IconButton icon="scan" label="Scan a barcode" onPress={() => router.push({ pathname: '/food/scan', params: { date, slot } })} />} />
      <Row gap={6}>
        {SLOTS.map((s) => (
          <Pressable key={s.id} accessibilityRole="button" accessibilityState={{ selected: s.id === slot }} onPress={() => setSlot(s.id)}
            style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
              borderColor: s.id === slot ? 'transparent' : c.line, backgroundColor: s.id === slot ? c.accent : c.surface }}>
            <T v="small" color={s.id === slot ? c.onAccent : c.text} style={{ fontFamily: fonts.semibold }}>{s.label}</T>
          </Pressable>
        ))}
      </Row>
      <Segmented label="How to add" value={tab} onChange={(v) => { setTab(v); setOpen(null); }}
        options={[{ value: 'search', label: 'Search' }, { value: 'recent', label: 'Recent' }, { value: 'meals', label: 'My meals' }, { value: 'quick', label: 'Quick add' }]} />
      <ErrorNote message={error} />

      {tab === 'search' && (
        <Row style={{ minHeight: 50, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }} gap={10}>
          <Icon name="search" size={18} color={c.muted} />
          <TextInput accessibilityLabel="Search foods" value={q} onChangeText={(v) => { setQ(v); setOpen(null); }} placeholder="Search foods, e.g. rice, paneer"
            placeholderTextColor={c.muted} returnKeyType="search" style={{ flex: 1, color: c.text, fontSize: 15, fontFamily: fonts.body, minHeight: 48 }} />
          {searching && <ActivityIndicator color={c.muted} />}
        </Row>
      )}

      {(tab === 'search' || tab === 'recent') && (
        <View style={{ gap: 8 }}>
          <T v="label" muted>{tab === 'recent' ? 'Recently eaten' : q.trim() ? `${list.length} results` : 'Common foods'}</T>
          {list.map((f, i) => {
            const key = `${f.source}:${f.ref ?? f.name}:${i}`;
            const isOpen = open === key;
            return (
              <Card key={key} highlight={isOpen} style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => { setOpen(isOpen ? null : key); setQty(1); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="bodyStrong" numberOfLines={2}>{f.name}</T>
                    <T v="small" muted>{f.serving} · {f.protein} g protein{f.source === 'off' ? ' · Open Food Facts' : f.source === 'usda' ? ' · USDA' : ''}</T>
                  </View>
                  <T v="bodyStrong" style={{ fontSize: 14 }}>{fmtNum(f.kcal)} kcal</T>
                </Pressable>
                {isOpen && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T v="small" muted>Servings</T>
                      <Row gap={8}>
                        <QtyButton label="Fewer servings" sign="−" onPress={() => setQty(Math.max(0.25, qty - 0.25))} />
                        <T v="number" style={{ minWidth: 48, textAlign: 'center' }}>{qty}</T>
                        <QtyButton label="More servings" sign="+" onPress={() => setQty(Math.min(20, qty + 0.25))} />
                      </Row>
                    </Row>
                    <Row style={{ backgroundColor: c.surface2, borderRadius: 12, padding: 10 }}>
                      {[['kcal', f.kcal], ['protein g', f.protein], ['carbs g', f.carbs], ['fat g', f.fat]].map(([l, v]) => (
                        <View key={l as string} style={{ flex: 1, alignItems: 'center' }}>
                          <T v="bodyStrong">{l === 'kcal' ? Math.round((v as number) * qty) : round((v as number) * qty, 1)}</T>
                          <T v="small" muted style={{ fontSize: 11 }}>{l}</T>
                        </View>
                      ))}
                    </Row>
                    <Button label={`Add to ${slotLabel(slot)}`} onPress={() => add([{ ...f, quantity: qty }], f.name)} style={{ minHeight: 48 }} />
                  </View>
                )}
              </Card>
            );
          })}
          {tab === 'search' && q.trim().length >= 2 && !searching && list.length === 0 && (
            <Card style={{ alignItems: 'center' }}>
              <T muted style={{ textAlign: 'center' }}>No match for “{q}”. Add it with your own numbers.</T>
              <Button label={`Quick add “${q}”`} variant="strong" onPress={() => { setQuick((x) => ({ ...x, name: q })); setTab('quick'); }} style={{ minHeight: 44 }} />
            </Card>
          )}
          {tab === 'recent' && list.length === 0 && <T muted>Foods you log will show up here.</T>}
        </View>
      )}

      {tab === 'meals' && (
        <View style={{ gap: 10 }}>
          <T v="small" muted>Meals you eat often — add the whole thing in one tap. Save new ones from Meal details.</T>
          {meals.length === 0 && (
            <View style={{ padding: 20, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line }}>
              <T muted style={{ textAlign: 'center' }}>No saved meals yet. Open any meal and tap “Save as my meal”.</T>
            </View>
          )}
          {meals.map((m) => {
            const tt = totalsOf(m.items);
            const done = added.some((a) => a.name === m.name);
            return (
              <Card key={m.id}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="bodyStrong">{m.name}</T>
                    <T v="small" muted>{m.items.map((i) => i.name).join(', ')}</T>
                  </View>
                  <T v="bodyStrong">{fmtNum(tt.kcal)} kcal</T>
                </Row>
                <Row>
                  <T v="small" muted style={{ flex: 1 }}>P {Math.round(tt.protein)} g · C {Math.round(tt.carbs)} g · F {Math.round(tt.fat)} g</T>
                  <Button label={done ? 'Added' : 'Add all'} variant={done ? 'secondary' : 'primary'} onPress={() => add(m.items, m.name)} style={{ minHeight: 44 }} />
                </Row>
              </Card>
            );
          })}
        </View>
      )}

      {tab === 'quick' && (
        <View style={{ gap: 12 }}>
          <T v="small" muted>Know the numbers from a label or your own recipe? Enter them. Leave calories empty and we’ll work them out from the macros.</T>
          <Field label="Food name" value={quick.name} onChangeText={(name) => setQuick({ ...quick, name })} placeholder="e.g. Home-made chicken biryani" />
          <Row gap={10}>
            <View style={{ flex: 1 }}><Field label="Calories" value={quick.kcal} onChangeText={(kcal) => setQuick({ ...quick, kcal })} placeholder="optional" keyboardType="decimal-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Protein (g)" value={quick.protein} onChangeText={(protein) => setQuick({ ...quick, protein })} placeholder="0" keyboardType="decimal-pad" /></View>
          </Row>
          <Row gap={10}>
            <View style={{ flex: 1 }}><Field label="Carbs (g)" value={quick.carbs} onChangeText={(carbs) => setQuick({ ...quick, carbs })} placeholder="0" keyboardType="decimal-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Fat (g)" value={quick.fat} onChangeText={(fat) => setQuick({ ...quick, fat })} placeholder="0" keyboardType="decimal-pad" /></View>
          </Row>
          <Row style={{ padding: 14, borderRadius: 16, backgroundColor: c.accentSoft, justifyContent: 'space-between' }}>
            <View>
              <T v="label" color={c.accentInk}>Total</T>
              <T v="number" style={{ fontSize: 22 }}>{quickKcal} kcal</T>
            </View>
            <T v="small" style={{ flex: 1, textAlign: 'right' }}>{quickNote}</T>
          </Row>
          <Button label={`Add to ${slotLabel(slot)}`} disabled={quickKcal <= 0} onPress={async () => {
            const name = quick.name.trim() || 'Quick add';
            const ok = await add([{ source: 'custom', ref: null, name, serving: 'Custom', kcal: quickKcal, protein: n(quick.protein), carbs: n(quick.carbs), fat: n(quick.fat), quantity: 1 }], name);
            if (ok) setQuick({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
          }} />
        </View>
      )}
    </Screen>
  );
}

function QtyButton({ label, sign, onPress }: { label: string; sign: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <T v="h2">{sign}</T>
    </Pressable>
  );
}
