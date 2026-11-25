import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { Button, Row, T } from '../../components/ui';
import { addEntries } from '../../data/store';
import { SLOTS, slotLabel, type FoodItem, type Slot } from '../../data/types';
import { lookupBarcode } from '../../lib/foods';
import { todayKey } from '../../lib/dates';
import { round } from '../../lib/nutrition';
import { fonts, useTheme } from '../../theme/theme';

type Phase = 'scanning' | 'looking' | 'found' | 'notfound' | 'added';

export default function Scan() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ date?: string; slot?: string }>();
  const date = params.date ?? todayKey();
  const slot: Slot = SLOTS.some((s) => s.id === params.slot) ? (params.slot as Slot) : 'snack';
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [food, setFood] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  async function lookup(barcode: string) {
    if (busy.current) return;
    busy.current = true;
    setPhase('looking'); setCode(barcode); setError(null);
    try {
      const f = await lookupBarcode(barcode);
      setFood(f); setQty(1);
      setPhase(f ? 'found' : 'notfound');
    } catch {
      setError('Could not reach the food database. Check your connection.');
      setPhase('notfound');
    }
  }

  function onScanned(r: BarcodeScanningResult) {
    if (phase === 'scanning' && !busy.current) lookup(r.data);
  }

  function rescan() {
    busy.current = false;
    setFood(null); setCode(''); setManual(false); setPhase('scanning');
  }

  async function add() {
    if (!food) return;
    try { await addEntries(date, slot, [{ ...food, quantity: qty }]); setPhase('added'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not add it'); }
  }

  const sheetOpen = phase === 'found' || phase === 'notfound' || phase === 'added' || phase === 'looking';

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0C0A' }}>
      {permission?.granted && !manual && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={phase === 'scanning' ? onScanned : undefined}
        />
      )}
      <SafeAreaView style={{ flex: 1 }}>
        <Row style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close scanner" onPress={() => router.back()} style={styles.round}>
            <Icon name="close" size={18} color="#F2F2EE" strokeWidth={2.4} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T v="h2" color="#F2F2EE">Scan barcode</T>
            <T v="small" color="#B7BAB0">Adding to {slotLabel(slot)}</T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Flashlight" accessibilityState={{ selected: torch }} onPress={() => setTorch(!torch)}
            style={[styles.round, torch && { backgroundColor: c.accent }]}>
            <Icon name="torch" size={20} color={torch ? c.onAccent : '#F2F2EE'} />
          </Pressable>
        </Row>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 20 }}>
          {!permission ? <ActivityIndicator color="#F2F2EE" /> : !permission.granted && !manual ? (
            <View style={{ alignItems: 'center', gap: 14 }}>
              <T color="#F2F2EE" style={{ textAlign: 'center' }}>MuscleX needs your camera to scan food barcodes.</T>
              <Button label="Allow camera" onPress={requestPermission} />
            </View>
          ) : manual ? (
            <View style={{ width: '100%', gap: 12 }}>
              <T color="#D5D8CE" style={{ textAlign: 'center' }}>Type the number printed under the barcode</T>
              <Row gap={8}>
                <TextInput accessibilityLabel="Barcode number" value={code} onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Barcode number" placeholderTextColor="#8A8D84"
                  style={{ flex: 1, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', color: '#F2F2EE', fontSize: 16 }} />
                <Button label="Look up" disabled={code.length < 8} onPress={() => lookup(code)} style={{ minHeight: 52 }} />
              </Row>
            </View>
          ) : (
            <>
              <View style={{ width: 300, height: 190 }} accessibilityLabel="Barcode frame">
                {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
                  <View key={k} style={{ position: 'absolute', width: 36, height: 36, borderColor: c.accent,
                    [k[0] === 't' ? 'top' : 'bottom']: 0, [k[1] === 'l' ? 'left' : 'right']: 0,
                    [k[0] === 't' ? 'borderTopWidth' : 'borderBottomWidth']: 4, [k[1] === 'l' ? 'borderLeftWidth' : 'borderRightWidth']: 4,
                    [`border${k[0] === 't' ? 'Top' : 'Bottom'}${k[1] === 'l' ? 'Left' : 'Right'}Radius`]: 14 }} />
                ))}
              </View>
              <T color="#D5D8CE" style={{ textAlign: 'center' }}>Line up the barcode inside the frame</T>
            </>
          )}
        </View>

        <View style={{ paddingBottom: 28, alignItems: 'center' }}>
          <Pressable accessibilityRole="button" onPress={() => { setManual(!manual); busy.current = false; }}
            style={{ minHeight: 48, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', justifyContent: 'center' }}>
            <T v="bodyStrong" color="#F2F2EE" style={{ fontSize: 14 }}>{manual ? 'Use camera instead' : 'Enter barcode manually'}</T>
          </Pressable>
        </View>
      </SafeAreaView>

      {sheetOpen && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }]}>
          <View accessibilityViewIsModal style={{ backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, gap: 14 }}>
            {phase === 'looking' && <Row style={{ justifyContent: 'center', paddingVertical: 24 }}><ActivityIndicator color={c.accentInk} /><T muted>Looking up {code}…</T></Row>}
            {phase === 'notfound' && (
              <>
                <T v="h2">Product not found</T>
                <T muted>{error ?? `Barcode ${code} isn’t in Open Food Facts yet. You can add it with Quick add.`}</T>
                <Row gap={10}>
                  <Button style={{ flex: 1 }} variant="secondary" label="Scan again" onPress={rescan} />
                  <Button style={{ flex: 1 }} label="Quick add" onPress={() => router.replace({ pathname: '/food/log', params: { date, slot } })} />
                </Row>
              </>
            )}
            {(phase === 'found' || phase === 'added') && food && (
              <>
                <View style={{ gap: 2 }}>
                  <T v="label" color={c.accentInk}>{phase === 'added' ? 'Added' : 'Product found'}</T>
                  <T v="h2">{food.name}</T>
                  <T v="small" muted>Barcode {code} · per {food.serving}</T>
                </View>
                <Row style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
                  {[['kcal', food.kcal], ['protein g', food.protein], ['carbs g', food.carbs], ['fat g', food.fat]].map(([l, v]) => (
                    <View key={l as string} style={{ flex: 1, alignItems: 'center' }}>
                      <T v="number" style={{ fontSize: 18 }}>{l === 'kcal' ? Math.round((v as number) * qty) : round((v as number) * qty, 1)}</T>
                      <T v="small" muted style={{ fontSize: 11 }}>{l}</T>
                    </View>
                  ))}
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T muted>Servings</T>
                  <Row gap={8}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Fewer servings" onPress={() => setQty(Math.max(0.5, qty - 0.5))} style={[styles.qty, { borderColor: c.line, backgroundColor: c.surface2 }]}><T v="h2">−</T></Pressable>
                    <T v="number" style={{ minWidth: 44, textAlign: 'center', fontFamily: fonts.display }}>{qty}</T>
                    <Pressable accessibilityRole="button" accessibilityLabel="More servings" onPress={() => setQty(qty + 0.5)} style={[styles.qty, { borderColor: c.line, backgroundColor: c.surface2 }]}><T v="h2">+</T></Pressable>
                  </Row>
                </Row>
                <Row gap={10}>
                  <Button style={{ flex: 1 }} variant="secondary" label={phase === 'added' ? 'Scan another' : 'Not right? Rescan'} onPress={rescan} />
                  {phase === 'added'
                    ? <Button style={{ flex: 1 }} label="Done" onPress={() => router.back()} />
                    : <Button style={{ flex: 1 }} label={`Add to ${slotLabel(slot)}`} onPress={add} />}
                </Row>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  qty: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
