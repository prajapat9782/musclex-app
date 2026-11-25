import type { Profile } from '../data/types';
import type { Units } from '../theme/theme';

export type Goal = Profile['goal'];
export type Activity = Profile['activity'];

export const GOALS: { id: Goal; label: string; short: string; desc: string; adj: number; proteinPerKg: number; ratePerWeek: number; why: string }[] = [
  { id: 'lose', label: 'Lose weight', short: 'Lose weight', desc: 'Burn fat with a steady calorie deficit.', adj: -500, proteinPerKg: 2.2, ratePerWeek: 0.5,
    why: 'A 500 kcal daily deficit targets about 0.5 kg of fat loss per week. High protein protects your muscle while you cut.' },
  { id: 'gain', label: 'Gain weight', short: 'Gain weight', desc: 'Add healthy mass with a calorie surplus.', adj: 500, proteinPerKg: 1.8, ratePerWeek: 0.5,
    why: 'A 500 kcal surplus supports steady gain of roughly 0.5 kg per week. Prioritise whole-food calories.' },
  { id: 'muscle', label: 'Build muscle', short: 'Build muscle', desc: 'Lean bulk — grow muscle, limit fat gain.', adj: 300, proteinPerKg: 2.0, ratePerWeek: 0.25,
    why: 'A lean 300 kcal surplus fuels muscle growth while keeping fat gain low. Pair it with progressive overload.' },
  { id: 'maintain', label: 'Maintain', short: 'Maintain', desc: 'Hold your weight and keep performing.', adj: 0, proteinPerKg: 1.6, ratePerWeek: 0,
    why: 'Eat at maintenance to hold your weight steady while you keep training and performing.' },
  { id: 'recomp', label: 'Body recomposition', short: 'Recomp', desc: 'Lose fat and build muscle at the same time.', adj: -200, proteinPerKg: 2.2, ratePerWeek: 0,
    why: 'A small deficit with very high protein lets you lose fat and build muscle at the same time.' },
];

export const ACTIVITIES: { id: Activity; label: string; desc: string; factor: number }[] = [
  { id: 'sedentary', label: 'Mostly sitting', desc: 'Desk job, little walking', factor: 1.2 },
  { id: 'light', label: 'Lightly active', desc: 'Some walking, on your feet at times', factor: 1.375 },
  { id: 'moderate', label: 'Moderately active', desc: 'On your feet most of the day', factor: 1.55 },
  { id: 'very', label: 'Very active', desc: 'Physical job or lots of movement', factor: 1.725 },
  { id: 'athlete', label: 'Athlete', desc: 'Twice-a-day training or heavy labour', factor: 1.9 },
];

export function goalOf(id: Goal) {
  return GOALS.find((g) => g.id === id) ?? GOALS[2];
}

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'height_cm' | 'weight_kg'>): number {
  return 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

export function tdee(p: Pick<Profile, 'sex' | 'age' | 'height_cm' | 'weight_kg' | 'activity'>): number {
  const f = ACTIVITIES.find((a) => a.id === p.activity)?.factor ?? 1.55;
  return bmr(p) * f;
}

export type Targets = { kcal: number; protein: number; carbs: number; fat: number; maintenance: number; bmr: number };

export function targets(p: Profile, goalOverride?: Goal): Targets {
  const goal = goalOf(goalOverride ?? p.goal);
  const maintenance = tdee(p);
  const floor = p.sex === 'male' ? 1500 : 1200;
  const kcal = Math.max(floor, Math.round((maintenance + goal.adj) / 10) * 10);
  const protein = Math.round(goal.proteinPerKg * p.weight_kg);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, maintenance: Math.round(maintenance), bmr: Math.round(bmr(p)) };
}

/** Daily water goal in ml: ~35 ml per kg body weight, rounded to a glass, min 1.5 L. */
export function waterGoalMl(weightKg: number): number {
  return Math.max(1500, Math.round((weightKg * 35) / 250) * 250);
}

export function trainingSplit(days: number): string {
  if (days <= 3) return 'Full body';
  if (days === 4) return 'Upper / Lower split';
  if (days === 5) return 'Push / Pull / Legs + Upper / Lower';
  if (days === 6) return 'Push / Pull / Legs ×2';
  return 'Push / Pull / Legs ×2 + active recovery';
}

export function timeline(p: Profile, units: Units): string {
  const g = goalOf(p.goal);
  const diff = Math.round((p.target_kg - p.weight_kg) * 10) / 10;
  if (g.ratePerWeek === 0) {
    return g.id === 'maintain'
      ? `Hold around ${fmtWeight(p.weight_kg, units)} while you build strength.`
      : 'Expect scale weight to stay similar while body fat drops — track photos and measurements.';
  }
  const wrongWay = (g.id === 'lose' && diff >= 0) || (g.id !== 'lose' && diff <= 0);
  if (wrongWay) return 'Your target weight doesn’t match this goal yet — adjust it for a timeline.';
  const weeks = Math.ceil(Math.abs(diff) / g.ratePerWeek);
  return `Reach ${fmtWeight(p.target_kg, units)} in about ${weeks} weeks at ${fmtWeight(g.ratePerWeek, units)} per week.`;
}

// ---- units --------------------------------------------------------------

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function fmtWeight(kg: number, units: Units, digits = 1): string {
  if (units === 'imperial') return `${round(kg / KG_PER_LB, digits)} lb`;
  return `${round(kg, digits)} kg`;
}

export function fmtHeight(cm: number, units: Units): string {
  if (units === 'imperial') {
    const inches = Math.round(cm / CM_PER_IN);
    return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
  }
  return `${Math.round(cm)} cm`;
}

export function fmtVolume(ml: number, units: Units): string {
  if (units === 'imperial') return `${Math.round(ml * 0.033814)} oz`;
  return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 1 : 2)} L`;
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString();
}
