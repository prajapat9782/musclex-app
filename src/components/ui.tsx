import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, useTheme } from '../theme/theme';
import { Icon, type IconName } from './Icon';

// ---- text ------------------------------------------------------------------

type Variant = 'display' | 'title' | 'h2' | 'body' | 'bodyStrong' | 'small' | 'label' | 'number';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 40, letterSpacing: -1.2, lineHeight: 44 },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.5, lineHeight: 34 },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  number: { fontFamily: fonts.display, fontSize: 20 },
};

export function T({ v = 'body', muted, color, style, children, numberOfLines }: {
  v?: Variant; muted?: boolean; color?: string; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number;
}) {
  const { c } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[variants[v], { color: color ?? (muted ? c.muted : c.text) }, style]}>
      {children}
    </Text>
  );
}

// ---- layout ----------------------------------------------------------------

export function Screen({ children, scroll = true, footer, padded = true }: {
  children: ReactNode; scroll?: boolean; footer?: ReactNode; padded?: boolean;
}) {
  const { c } = useTheme();
  const pad = padded ? { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 } : undefined;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: highlight ? c.accentInk : c.line, borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 }, style]}>
      {children}
    </View>
  );
}

export function Row({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <Row style={{ marginBottom: 4 }}>
      {onBack && <IconButton icon="back" label="Back" onPress={onBack} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T v={onBack ? 'h2' : 'title'}>{title}</T>
        {subtitle ? <T v="small" muted>{subtitle}</T> : null}
      </View>
      {right}
    </Row>
  );
}

// ---- controls ----------------------------------------------------------------

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style }: {
  label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'strong' | 'ghost' | 'danger';
  disabled?: boolean; loading?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = { primary: c.accent, secondary: c.surface, strong: c.strong, ghost: 'transparent', danger: c.flameSoft }[variant];
  const fg = { primary: c.onAccent, secondary: c.text, strong: c.onStrong, ghost: c.accentInk, danger: c.flame }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: off && variant === 'primary' ? c.surface2 : bg, borderColor: variant === 'secondary' ? c.line : 'transparent', opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Icon name={icon} size={18} color={off && variant === 'primary' ? c.muted : fg} strokeWidth={2.4} />}
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: off && variant === 'primary' ? c.muted : fg }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, filled }: { icon: IconName; label: string; onPress?: () => void; filled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: filled ? c.accent : c.surface, borderColor: filled ? 'transparent' : c.line, opacity: pressed ? 0.8 : 1 }]}
    >
      <Icon name={icon} size={20} color={filled ? c.onAccent : c.text} strokeWidth={2.2} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, style }: { label: string; selected: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? c.accent : c.surface, borderColor: selected ? 'transparent' : c.line }, style]}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: selected ? c.onAccent : c.text }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string>({ options, value, onChange, label }: {
  options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string;
}) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: c.surface, borderColor: c.line }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, { backgroundColor: on ? c.strong : 'transparent' }]}
          >
            <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 13, color: on ? c.onStrong : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function OptionCard({ title, desc, selected, onPress }: { title: string; desc?: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, { borderColor: selected ? c.accentInk : c.line, borderWidth: selected ? 2 : 1, backgroundColor: selected ? c.accentSoft : c.surface }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyStrong">{title}</T>
        {desc ? <T v="small" muted>{desc}</T> : null}
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 7 : 2, borderColor: selected ? c.accentInk : c.muted }} />
    </Pressable>
  );
}

export function Stepper({ label, value, unit, onDec, onInc }: { label: string; value: string; unit?: string; onDec: () => void; onInc: () => void }) {
  const { c } = useTheme();
  const btn = [styles.stepBtn, { borderColor: c.line, backgroundColor: c.surface2 }];
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
      <View style={{ gap: 2 }}>
        <T v="small" muted>{label}</T>
        <T v="title">{value}{unit ? <T v="body" muted> {unit}</T> : null}</T>
      </View>
      <Row gap={8}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label.toLowerCase()}`} onPress={onDec} style={btn}>
          <Text style={{ fontSize: 22, color: c.text, fontFamily: fonts.semibold }}>−</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label.toLowerCase()}`} onPress={onInc} style={btn}>
          <Text style={{ fontSize: 22, color: c.text, fontFamily: fonts.semibold }}>+</Text>
        </Pressable>
      </Row>
    </Card>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6, flex: props.style ? undefined : undefined }}>
      <T v="small" muted style={{ fontFamily: fonts.semibold }}>{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.text }, props.style]}
      />
    </View>
  );
}

export function Bar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color ?? c.accentInk }} />
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center', alignItems: value ? 'flex-end' : 'flex-start', backgroundColor: value ? c.accentInk : c.line }}
    >
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF' }} />
    </Pressable>
  );
}

export function Loading() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator color={c.accentInk} />
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  const { c } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ padding: 12, borderRadius: 12, backgroundColor: c.flameSoft }}>
      <T v="small" color={c.flame}>{message}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, gap: 4 },
  segment: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, minHeight: 64, borderRadius: 14 },
  stepBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, fontSize: 16, fontFamily: fonts.body },
});
