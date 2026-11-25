import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Card, ErrorNote, Field, IconButton, OptionCard, Row, Screen, Segmented, Stepper, T } from '../components/ui';
import { useProfile } from '../data/ProfileProvider';
import { DEFAULT_PROFILE, NEWS_TOPICS, type Profile } from '../data/types';
import {
  ACTIVITIES, CM_PER_IN, GOALS, KG_PER_LB, fmtHeight, fmtNum, fmtWeight, goalOf, targets, timeline, trainingSplit, waterGoalMl, fmtVolume,
} from '../lib/nutrition';
import { fonts, useTheme } from '../theme/theme';

const STEPS = 6;

export default function Onboarding() {
  const { c, units, setUnits } = useTheme();
  const { profile, save } = useProfile();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [p, setP] = useState<Profile>(() => ({ ...DEFAULT_PROFILE, ...(profile ?? {}), units }));
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const imp = units === 'imperial';

  const t = targets(p);
  const h = p.height_cm / 100;
  const bmi = (p.weight_kg / (h * h)).toFixed(1);
  const diff = p.target_kg - p.weight_kg;

  async function finish() {
    setSaving(true); setError(null);
    try {
      await save({ ...p, units, name: p.name.trim() });
      if (edit) router.back(); else router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your plan. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const back = () => (step === 1 ? router.back() : setStep(step - 1));

  const weightStepper = (label: string, key: 'weight_kg' | 'target_kg') => (
    <Stepper
      label={label}
      value={imp ? String(Math.round(p[key] / KG_PER_LB)) : p[key].toFixed(1)}
      unit={imp ? 'lb' : 'kg'}
      onDec={() => set({ [key]: clamp(Math.round((p[key] - (imp ? KG_PER_LB : 0.5)) * 100) / 100, 35, 250) })}
      onInc={() => set({ [key]: clamp(Math.round((p[key] + (imp ? KG_PER_LB : 0.5)) * 100) / 100, 35, 250) })}
    />
  );

  const footer = (
    <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28, backgroundColor: c.bg, gap: 8 }}>
      <ErrorNote message={error} />
      {step < STEPS
        ? <Button label="Continue" onPress={() => setStep(step + 1)} />
        : <Button label={edit ? 'Save changes' : 'Start training'} onPress={finish} loading={saving} />}
    </View>
  );

  return (
    <Screen footer={footer}>
      <Row>
        <IconButton icon="back" label="Back" onPress={back} />
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityLabel={`Step ${step} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < step ? c.accentInk : c.line }} />
          ))}
        </View>
        <T v="small" muted>{step} / {STEPS}</T>
      </Row>

      {step === 1 && (
        <>
          <Intro title="Let’s get to know you" sub="We use this to calculate your calories. You can change it anytime." />
          <Field label="What should we call you?" value={p.name} onChangeText={(name) => set({ name })} placeholder="Your first name" autoComplete="given-name" />
          <T v="small" muted style={{ fontFamily: fonts.semibold }}>Sex (for the calorie formula)</T>
          <Segmented label="Sex" value={p.sex} onChange={(sex) => set({ sex })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
          <Stepper label="Age" value={String(p.age)} unit="years" onDec={() => set({ age: clamp(p.age - 1, 14, 90) })} onInc={() => set({ age: clamp(p.age + 1, 14, 90) })} />
        </>
      )}

      {step === 2 && (
        <>
          <Intro title="Your body today" sub="Your starting point. Progress is measured from here." />
          <Segmented label="Units" value={units} onChange={setUnits} options={[{ value: 'metric', label: 'Metric · kg, cm' }, { value: 'imperial', label: 'Imperial · lb, ft' }]} />
          <Stepper
            label="Height"
            value={imp ? fmtHeight(p.height_cm, 'imperial') : String(Math.round(p.height_cm))}
            unit={imp ? undefined : 'cm'}
            onDec={() => set({ height_cm: clamp(Math.round((p.height_cm - (imp ? CM_PER_IN : 1)) * 100) / 100, 120, 230) })}
            onInc={() => set({ height_cm: clamp(Math.round((p.height_cm + (imp ? CM_PER_IN : 1)) * 100) / 100, 120, 230) })}
          />
          {weightStepper('Current weight', 'weight_kg')}
          {weightStepper('Target weight', 'target_kg')}
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: c.accentSoft }}>
            <T>BMI <T v="bodyStrong">{bmi}</T> · {Math.abs(diff) < 0.05 ? 'Target equals current weight' : `${diff > 0 ? '+' : '−'}${fmtWeight(Math.abs(diff), units)} to your target`}</T>
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Intro title="What’s your goal?" sub="This sets your calories, protein and training focus." />
          {GOALS.map((g) => <OptionCard key={g.id} title={g.label} desc={g.desc} selected={p.goal === g.id} onPress={() => set({ goal: g.id })} />)}
        </>
      )}

      {step === 4 && (
        <>
          <Intro title="How do you train?" sub="Your daily activity outside the gym matters too." />
          <T v="small" muted style={{ fontFamily: fonts.semibold }}>Daily activity</T>
          {ACTIVITIES.map((a) => <OptionCard key={a.id} title={a.label} desc={a.desc} selected={p.activity === a.id} onPress={() => set({ activity: a.id })} />)}
          <T v="small" muted style={{ fontFamily: fonts.semibold }}>Experience</T>
          <Segmented label="Experience" value={p.level} onChange={(level) => set({ level })}
            options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
          <T v="small" muted style={{ fontFamily: fonts.semibold }}>Workouts per week</T>
          <Segmented label="Workouts per week" value={String(p.days_per_week)} onChange={(d) => set({ days_per_week: Number(d) })}
            options={['2', '3', '4', '5', '6', '7'].map((d) => ({ value: d, label: d }))} />
        </>
      )}

      {step === 5 && (
        <>
          <Intro title="Stay in the know" sub="Pick the gym & health news you care about. We’ll save it for your feed." />
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="small" muted>{p.news_topics.length} selected</T>
            <Pressable accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}
              onPress={() => set({ news_topics: p.news_topics.length === NEWS_TOPICS.length ? [] : [...NEWS_TOPICS] })}>
              <T v="bodyStrong" color={c.accentInk}>{p.news_topics.length === NEWS_TOPICS.length ? 'Clear all' : 'Select all'}</T>
            </Pressable>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {NEWS_TOPICS.map((topic) => {
              const on = p.news_topics.includes(topic);
              return (
                <Pressable key={topic} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  onPress={() => set({ news_topics: on ? p.news_topics.filter((x) => x !== topic) : [...p.news_topics, topic] })}
                  style={{ width: '48%', minHeight: 56, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    borderWidth: on ? 2 : 1, borderColor: on ? c.accentInk : c.line, backgroundColor: on ? c.accentSoft : c.surface }}>
                  <T v="bodyStrong">{topic}</T>
                  <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.accentInk : 'transparent', borderWidth: on ? 0 : 2, borderColor: c.muted }}>
                    {on && <Icon name="check" size={14} color={c.bg} strokeWidth={3.4} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {step === 6 && (
        <>
          <Intro title={p.name.trim() ? `${p.name.trim()}, your plan is ready` : 'Your plan is ready'} sub="Built from your answers. Adjust anytime in Profile." />
          <View style={{ backgroundColor: c.accent, borderRadius: 24, padding: 20, gap: 6 }}>
            <T v="label" color={c.onAccent}>Daily calories · {goalOf(p.goal).label}</T>
            <T v="display" color={c.onAccent} style={{ fontSize: 52, lineHeight: 56 }}>{fmtNum(t.kcal)}</T>
            <T v="small" color={c.onAccent}>Maintenance {fmtNum(t.maintenance)} kcal · BMR {fmtNum(t.bmr)} kcal</T>
          </View>
          <Row gap={10}>
            <Macro label="Protein" grams={t.protein} />
            <Macro label="Carbs" grams={t.carbs} />
            <Macro label="Fat" grams={t.fat} />
          </Row>
          <Card>
            <Line icon="clock" text={timeline(p, units)} />
            <Line icon="dumbbell" text={`${p.days_per_week} workouts a week · ${trainingSplit(p.days_per_week)} · ${p.level} program`} />
            <Line icon="water" text={`Daily habits: ${fmtVolume(waterGoalMl(p.weight_kg), units)} water, 8 h sleep, ${t.protein} g protein, 10,000 steps`} />
          </Card>
          <T v="small" muted>Calories use the Mifflin-St Jeor formula. This is general guidance, not medical advice.</T>
        </>
      )}
    </Screen>
  );
}

function Intro({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <T v="title" style={{ fontSize: 30 }}>{title}</T>
      <T muted>{sub}</T>
    </View>
  );
}

function Macro({ label, grams }: { label: string; grams: number }) {
  return (
    <Card style={{ flex: 1, gap: 2, padding: 14 }}>
      <T v="small" muted>{label}</T>
      <T v="number">{grams} g</T>
    </Card>
  );
}

function Line({ icon, text }: { icon: 'clock' | 'dumbbell' | 'water'; text: string }) {
  const { c } = useTheme();
  return (
    <Row gap={12} style={{ alignItems: 'flex-start' }}>
      <Icon name={icon} size={20} color={c.accentInk} />
      <T style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}
