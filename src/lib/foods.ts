import { Platform } from 'react-native';
import type { FoodItem } from '../data/types';
import { round } from './nutrition';

/**
 * Starter foods: always available offline and shown first in search.
 * Values are typical averages per serving.
 */
const STARTER: [string, string, string, number, number, number, number][] = [
  ['oats', 'Rolled oats', '50 g', 190, 7, 32, 3.5],
  ['whey', 'Whey protein', '1 scoop · 30 g', 120, 24, 3, 1.5],
  ['banana', 'Banana', '1 medium', 105, 1.3, 27, 0.4],
  ['pb', 'Peanut butter', '1 tbsp · 16 g', 95, 3.5, 3, 8],
  ['chicken', 'Chicken breast', '150 g cooked', 248, 46, 0, 5.4],
  ['rice', 'White rice', '1 cup cooked', 205, 4.3, 45, 0.4],
  ['avocado', 'Avocado', '½ fruit', 120, 1.5, 6, 11],
  ['greens', 'Mixed salad greens', '1 bowl', 20, 1.5, 3.5, 0.3],
  ['yogurt', 'Greek yogurt 2%', '170 g', 150, 17, 8, 4],
  ['berries', 'Mixed berries', '1 cup', 70, 1, 17, 0.5],
  ['honey', 'Honey', '1 tsp', 21, 0, 6, 0],
  ['salmon', 'Salmon fillet', '150 g', 312, 34, 0, 19],
  ['sweetpotato', 'Sweet potato', '1 medium', 112, 2, 26, 0.1],
  ['broccoli', 'Broccoli', '1 cup', 31, 2.5, 6, 0.3],
  ['eggs', 'Whole eggs', '2 large', 143, 12.6, 0.7, 9.5],
  ['toast', 'Wholegrain toast', '1 slice', 80, 4, 14, 1],
  ['paneer', 'Paneer', '100 g', 265, 18, 1.2, 21],
  ['dal', 'Dal (lentil curry)', '1 cup', 230, 13, 32, 6],
  ['roti', 'Roti / chapati', '1 piece', 120, 3, 18, 3.7],
  ['milk', 'Milk 2%', '250 ml', 122, 8, 12, 4.8],
  ['almonds', 'Almonds', '28 g', 164, 6, 6, 14],
  ['apple', 'Apple', '1 medium', 95, 0.5, 25, 0.3],
  ['pasta', 'Pasta', '1 cup cooked', 220, 8, 43, 1.3],
  ['beef', 'Lean beef mince', '150 g cooked', 330, 39, 0, 19],
  ['tofu', 'Firm tofu', '150 g', 215, 23, 5, 12],
  ['oil', 'Olive oil', '1 tbsp', 119, 0, 0, 13.5],
];

export const STARTER_FOODS: FoodItem[] = STARTER.map(([ref, name, serving, kcal, protein, carbs, fat]) => ({
  source: 'local', ref, name, serving, kcal, protein, carbs, fat,
}));

export function starterFood(ref: string): FoodItem {
  const f = STARTER_FOODS.find((x) => x.ref === ref);
  if (!f) throw new Error(`Unknown starter food: ${ref}`);
  return f;
}

export function searchStarter(q: string): FoodItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return STARTER_FOODS;
  return STARTER_FOODS.filter((f) => f.name.toLowerCase().includes(s));
}

// ---- Open Food Facts (free, no key; packaged foods + barcodes) ----------

const OFF_UA = process.env.EXPO_PUBLIC_OFF_USER_AGENT || 'MuscleX/1.0';
const offHeaders: Record<string, string> = Platform.OS === 'web' ? {} : { 'User-Agent': OFF_UA };

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

export function mapOffProduct(p: OffProduct): FoodItem | null {
  const n = p.nutriments ?? {};
  const name = [p.product_name, p.brands?.split(',')[0]].filter(Boolean).join(' · ');
  if (!name) return null;
  const hasServing = num(n['energy-kcal_serving']) > 0;
  const per = hasServing ? '_serving' : '_100g';
  const kcal = num(n[`energy-kcal${per}`]) || num(n[`energy${per}`]) / 4.184;
  if (!kcal) return null;
  return {
    source: 'off',
    ref: p.code ?? null,
    name,
    serving: hasServing ? (p.serving_size || '1 serving') : '100 g',
    kcal: round(kcal, 0),
    protein: round(num(n[`proteins${per}`]), 1),
    carbs: round(num(n[`carbohydrates${per}`]), 1),
    fat: round(num(n[`fat${per}`]), 1),
  };
}

const OFF_FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments';

export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<FoodItem | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, { headers: offHeaders, signal });
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (json.status !== 1 || !json.product) return null;
  return mapOffProduct({ ...json.product, code });
}

async function searchOff(q: string, signal?: AbortSignal): Promise<FoodItem[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=${OFF_FIELDS}`;
  const res = await fetch(url, { headers: offHeaders, signal });
  if (!res.ok) return [];
  const json = (await res.json()) as { products?: OffProduct[] };
  return (json.products ?? []).map(mapOffProduct).filter((x): x is FoodItem => x !== null);
}

// ---- USDA FoodData Central (free key; generic foods) --------------------

const USDA_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY ?? '';

type UsdaFood = { fdcId: number; description: string; foodNutrients?: { nutrientName?: string; unitName?: string; value?: number }[] };

function mapUsda(f: UsdaFood): FoodItem | null {
  const get = (name: string, unit?: string) =>
    f.foodNutrients?.find((x) => x.nutrientName === name && (!unit || x.unitName === unit))?.value ?? 0;
  const kcal = get('Energy', 'KCAL');
  if (!kcal) return null;
  const name = f.description.charAt(0) + f.description.slice(1).toLowerCase();
  return {
    source: 'usda',
    ref: String(f.fdcId),
    name,
    serving: '100 g',
    kcal: round(kcal, 0),
    protein: round(get('Protein'), 1),
    carbs: round(get('Carbohydrate, by difference'), 1),
    fat: round(get('Total lipid (fat)'), 1),
  };
}

async function searchUsda(q: string, signal?: AbortSignal): Promise<FoodItem[]> {
  if (!USDA_KEY) return [];
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(q)}&pageSize=15&dataType=Foundation,SR%20Legacy`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const json = (await res.json()) as { foods?: UsdaFood[] };
  return (json.foods ?? []).map(mapUsda).filter((x): x is FoodItem => x !== null);
}

/** Online search across USDA (generic) and Open Food Facts (packaged). Never throws. */
export async function searchOnline(q: string, signal?: AbortSignal): Promise<FoodItem[]> {
  if (q.trim().length < 2) return [];
  const [usda, off] = await Promise.all([
    searchUsda(q, signal).catch(() => []),
    searchOff(q, signal).catch(() => []),
  ]);
  return [...usda, ...off];
}
