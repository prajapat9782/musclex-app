export type Slot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const SLOTS: { id: Slot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'snack', label: 'Snacks' },
  { id: 'dinner', label: 'Dinner' },
];

export function slotLabel(slot: Slot): string {
  return SLOTS.find((s) => s.id === slot)?.label ?? 'Meal';
}

/** A food with nutrition for ONE serving. */
export type FoodItem = {
  source: 'local' | 'off' | 'usda' | 'custom';
  ref?: string | null;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type PortionedFood = FoodItem & { quantity: number };

export type FoodEntry = PortionedFood & {
  id: string;
  date: string;
  slot: Slot;
};

export type SavedMeal = {
  id: string;
  name: string;
  items: PortionedFood[];
};

export type Profile = {
  name: string;
  sex: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  target_kg: number;
  goal: 'lose' | 'gain' | 'muscle' | 'maintain' | 'recomp';
  activity: 'sedentary' | 'light' | 'moderate' | 'very' | 'athlete';
  level: 'beginner' | 'intermediate' | 'advanced';
  days_per_week: number;
  units: 'metric' | 'imperial';
  news_topics: string[];
  is_public: boolean;
};

export const NEWS_TOPICS = ['Training', 'Nutrition', 'Research', 'Recovery', 'Supplements', 'Events', 'Gear', 'Mindset'];

export const DEFAULT_PROFILE: Profile = {
  name: '',
  sex: 'male',
  age: 26,
  height_cm: 178,
  weight_kg: 72,
  target_kg: 68,
  goal: 'muscle',
  activity: 'moderate',
  level: 'intermediate',
  days_per_week: 4,
  units: 'metric',
  news_topics: [...NEWS_TOPICS],
  is_public: true,
};

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };

export function totalsOf(items: PortionedFood[]): Totals {
  return items.reduce(
    (a, e) => ({
      kcal: a.kcal + e.kcal * e.quantity,
      protein: a.protein + e.protein * e.quantity,
      carbs: a.carbs + e.carbs * e.quantity,
      fat: a.fat + e.fat * e.quantity,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
