export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 4 * 60 * 60 * 1000;
export const CANT_SPEAK_MS = 15 * 60 * 1000;
export const LEAGUE_SIZE = 30;
export const PROMOTION_ZONE = 7;
export const DEMOTION_ZONE = 5;

export const PRICES = {
  streakFreeze: 200,
  heartRefill: 350,
  wager: 50,
  timerBoost: 60,
  xpBoost: 100,
  legendaryAttempt: 100,
} as const;

export const DAILY_GOALS = [
  { id: 'casual', label: 'Casual', xp: 10, note: '1 lesson a day' },
  { id: 'regular', label: 'Regular', xp: 20, note: '2 lessons a day' },
  { id: 'serious', label: 'Serious', xp: 30, note: '3 lessons a day' },
  { id: 'intense', label: 'Intense', xp: 50, note: '4 to 5 lessons a day' },
] as const;

export const STREAK_MILESTONES: { days: number; gems: number; title: string }[] = [
  { days: 7, gems: 30, title: 'Week Warrior' },
  { days: 30, gems: 100, title: 'Monthly Master' },
  { days: 100, gems: 300, title: 'Centurion' },
  { days: 365, gems: 1000, title: 'Year Legend' },
];

export const C = {
  feather: '#58CC02',
  featherDark: '#58A700',
  macaw: '#1CB0F6',
  macawDark: '#1899D6',
  cardinal: '#FF4B4B',
  cardinalDark: '#EA2B2B',
  bee: '#FFC800',
  beeDark: '#E5B400',
  fox: '#FF9600',
  foxDark: '#E08600',
  beetle: '#CE82FF',
  eel: '#4B4B4B',
  wolf: '#777777',
  hare: '#AFAFAF',
  swan: '#E5E5E5',
  polar: '#F7F7F7',
  snow: '#FFFFFF',
  correctBg: '#D7FFB8',
  correctText: '#58A700',
  wrongBg: '#FFDFE0',
  wrongText: '#EA2B2B',
  gold: '#FFC800',
  goldDark: '#C99A00',
} as const;
