/**
 * Data access for MuscleX.
 *
 * With Supabase configured (see .env.example), everything is stored in the
 * user's account and protected by Row Level Security (supabase/migrations).
 * Without it, the same API stores data on the device so the app can be tried
 * in demo mode.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  DEFAULT_PROFILE,
  type FoodEntry,
  type PortionedFood,
  type Profile,
  type SavedMeal,
  type Slot,
} from './types';

const remote = isSupabaseConfigured && supabase !== null;

// ---- local helpers -------------------------------------------------------

async function readLocal<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeLocal<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function db() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

async function userId(): Promise<string> {
  const { data, error } = await db().auth.getUser();
  if (error || !data.user) throw new Error('Not signed in');
  return data.user.id;
}

const K = {
  profile: 'mx.profile',
  entries: 'mx.entries',
  meals: 'mx.savedMeals',
  water: 'mx.water',
  habits: 'mx.habits',
};

// ---- profile ---------------------------------------------------------------

export async function getProfile(): Promise<Profile | null> {
  if (!remote) return readLocal<Profile | null>(K.profile, null);
  const { data, error } = await db().from('profiles').select('*').eq('id', await userId()).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...DEFAULT_PROFILE, ...data, height_cm: Number(data.height_cm), weight_kg: Number(data.weight_kg), target_kg: Number(data.target_kg) } as Profile;
}

export async function saveProfile(p: Profile): Promise<void> {
  if (!remote) return writeLocal(K.profile, p);
  const { error } = await db().from('profiles').upsert({ id: await userId(), ...p });
  if (error) throw error;
}

// ---- food entries ----------------------------------------------------------

type EntryRow = {
  id: string; eaten_on: string; slot: Slot; source: FoodEntry['source']; ref: string | null;
  name: string; serving: string; kcal: number; protein: number; carbs: number; fat: number; quantity: number;
};

const fromRow = (r: EntryRow): FoodEntry => ({
  id: r.id, date: r.eaten_on, slot: r.slot, source: r.source, ref: r.ref, name: r.name, serving: r.serving,
  kcal: Number(r.kcal), protein: Number(r.protein), carbs: Number(r.carbs), fat: Number(r.fat), quantity: Number(r.quantity),
});

export async function listEntries(from: string, to: string = from): Promise<FoodEntry[]> {
  if (!remote) {
    const all = await readLocal<FoodEntry[]>(K.entries, []);
    return all.filter((e) => e.date >= from && e.date <= to);
  }
  const { data, error } = await db()
    .from('food_entries')
    .select('id,eaten_on,slot,source,ref,name,serving,kcal,protein,carbs,fat,quantity')
    .gte('eaten_on', from).lte('eaten_on', to)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as EntryRow[]).map(fromRow);
}

export async function addEntries(date: string, slot: Slot, items: PortionedFood[]): Promise<void> {
  if (items.length === 0) return;
  if (!remote) {
    const all = await readLocal<FoodEntry[]>(K.entries, []);
    await writeLocal(K.entries, all.concat(items.map((i) => ({ ...i, id: uid(), date, slot }))));
    return;
  }
  const rows = items.map((i) => ({
    eaten_on: date, slot, source: i.source, ref: i.ref ?? null, name: i.name, serving: i.serving,
    kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, quantity: i.quantity,
  }));
  const { error } = await db().from('food_entries').insert(rows);
  if (error) throw error;
}

export async function updateEntryQuantity(id: string, quantity: number): Promise<void> {
  if (!remote) {
    const all = await readLocal<FoodEntry[]>(K.entries, []);
    await writeLocal(K.entries, all.map((e) => (e.id === id ? { ...e, quantity } : e)));
    return;
  }
  const { error } = await db().from('food_entries').update({ quantity }).eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  if (!remote) {
    const all = await readLocal<FoodEntry[]>(K.entries, []);
    await writeLocal(K.entries, all.filter((e) => e.id !== id));
    return;
  }
  const { error } = await db().from('food_entries').delete().eq('id', id);
  if (error) throw error;
}

/** Copies entries (optionally one slot) from one day onto another. Returns how many were copied. */
export async function copyDay(fromDate: string, toDate: string, slot?: Slot): Promise<number> {
  const src = (await listEntries(fromDate)).filter((e) => !slot || e.slot === slot);
  const bySlot = new Map<Slot, PortionedFood[]>();
  for (const e of src) {
    const { id: _id, date: _d, slot: s, ...food } = e;
    bySlot.set(s, [...(bySlot.get(s) ?? []), food]);
  }
  for (const [s, items] of bySlot) await addEntries(toDate, s, items);
  return src.length;
}

/** Distinct foods eaten recently, newest first. */
export async function recentFoods(days = 21, limit = 15): Promise<PortionedFood[]> {
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - days);
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const all = (await listEntries(key(from), key(to))).reverse();
  const seen = new Set<string>();
  const out: PortionedFood[] = [];
  for (const e of all) {
    const k = `${e.source}:${e.ref ?? e.name}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const { id: _i, date: _d, slot: _s, ...food } = e;
    out.push({ ...food, quantity: 1 });
    if (out.length >= limit) break;
  }
  return out;
}

// ---- saved meals -----------------------------------------------------------

export async function listSavedMeals(): Promise<SavedMeal[]> {
  if (!remote) return readLocal<SavedMeal[]>(K.meals, []);
  const { data, error } = await db().from('saved_meals').select('id,name,items').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedMeal[];
}

export async function saveMeal(name: string, items: PortionedFood[]): Promise<void> {
  const clean = items.map(({ source, ref, name: n, serving, kcal, protein, carbs, fat, quantity }) =>
    ({ source, ref: ref ?? null, name: n, serving, kcal, protein, carbs, fat, quantity }));
  if (!remote) {
    const all = await readLocal<SavedMeal[]>(K.meals, []);
    await writeLocal(K.meals, [{ id: uid(), name, items: clean }, ...all]);
    return;
  }
  const { error } = await db().from('saved_meals').insert({ name, items: clean });
  if (error) throw error;
}

export async function deleteSavedMeal(id: string): Promise<void> {
  if (!remote) {
    const all = await readLocal<SavedMeal[]>(K.meals, []);
    await writeLocal(K.meals, all.filter((m) => m.id !== id));
    return;
  }
  const { error } = await db().from('saved_meals').delete().eq('id', id);
  if (error) throw error;
}

// ---- water -----------------------------------------------------------------

export async function getWater(from: string, to: string = from): Promise<Record<string, number>> {
  if (!remote) {
    const all = await readLocal<Record<string, number>>(K.water, {});
    return Object.fromEntries(Object.entries(all).filter(([d]) => d >= from && d <= to));
  }
  const { data, error } = await db().from('water_logs').select('logged_on,ml').gte('logged_on', from).lte('logged_on', to);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r: { logged_on: string; ml: number }) => [r.logged_on, r.ml]));
}

export async function setWater(date: string, ml: number): Promise<void> {
  const v = Math.max(0, Math.round(ml));
  if (!remote) {
    const all = await readLocal<Record<string, number>>(K.water, {});
    await writeLocal(K.water, { ...all, [date]: v });
    return;
  }
  const { error } = await db().from('water_logs').upsert({ user_id: await userId(), logged_on: date, ml: v });
  if (error) throw error;
}

// ---- habits ----------------------------------------------------------------

export async function getHabits(from: string, to: string = from): Promise<Record<string, string[]>> {
  if (!remote) {
    const all = await readLocal<Record<string, string[]>>(K.habits, {});
    return Object.fromEntries(Object.entries(all).filter(([d]) => d >= from && d <= to));
  }
  const { data, error } = await db().from('habit_logs').select('logged_on,habit').gte('logged_on', from).lte('logged_on', to);
  if (error) throw error;
  const out: Record<string, string[]> = {};
  for (const r of (data ?? []) as { logged_on: string; habit: string }[]) (out[r.logged_on] ??= []).push(r.habit);
  return out;
}

export async function setHabit(date: string, habit: string, done: boolean): Promise<void> {
  if (!remote) {
    const all = await readLocal<Record<string, string[]>>(K.habits, {});
    const day = new Set(all[date] ?? []);
    if (done) day.add(habit); else day.delete(habit);
    await writeLocal(K.habits, { ...all, [date]: [...day] });
    return;
  }
  if (done) {
    const { error } = await db().from('habit_logs').upsert({ user_id: await userId(), logged_on: date, habit });
    if (error) throw error;
  } else {
    const { error } = await db().from('habit_logs').delete().eq('logged_on', date).eq('habit', habit);
    if (error) throw error;
  }
}

// ---- account -----------------------------------------------------------------

/** Permanently deletes the account and all its data (or the local demo data). */
export async function deleteAccount(): Promise<void> {
  if (!remote) {
    await AsyncStorage.multiRemove(Object.values(K));
    return;
  }
  const { error } = await db().rpc('delete_my_account');
  if (error) throw error;
  await db().auth.signOut();
}
