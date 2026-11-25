import Svg, { Circle, Path, Rect } from 'react-native-svg';

const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  users: 'M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-1.5-5-4-5.7',
  meals: 'M4 3v8a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 0-3 3-3 6s1 4 3 4v8',
  news: 'M7 8h10M7 12h10M7 16h6',
  flame: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z',
  check: 'm5 12 5 5 9-10',
  back: 'M15 6l-6 6 6 6',
  chevron: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  search: 'm20 20-3.5-3.5',
  calendar: 'M8 2v4M16 2v4M3 10h18',
  water: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  scan: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M14 8v8M17 8v8',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3',
  torch: 'M7 3h10l-2 6v12H9V9zM12 13v3',
  dumbbell: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  play: 'M7 4v16l13-8z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z',
  clock: 'M12 7v5l3 2',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
} as const;

export type IconName = keyof typeof PATHS;

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number; filled?: boolean };

export function Icon({ name, size = 22, color, strokeWidth = 2, filled }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'users' && <Circle cx={9} cy={8} r={4} stroke={color} strokeWidth={strokeWidth} />}
      {name === 'news' && <Rect x={3} y={4} width={18} height={16} rx={2} stroke={color} strokeWidth={strokeWidth} />}
      {name === 'search' && <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={strokeWidth} />}
      {name === 'calendar' && <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={strokeWidth} />}
      {name === 'copy' && <Rect x={8} y={8} width={13} height={13} rx={2} stroke={color} strokeWidth={strokeWidth} />}
      {name === 'eye' && <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={strokeWidth} />}
      {name === 'clock' && <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />}
      <Path
        d={PATHS[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}
