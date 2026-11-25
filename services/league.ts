// Weekly league board: seeded rival bots + (optionally) real Supabase users.
import { BOT_AVATARS, BOT_NAMES } from '@/data/league';
import { DEMOTION_ZONE, LEAGUE_SIZE, PROMOTION_ZONE } from '@/lib/constants';
import { weekProgress } from '@/lib/date';
import { hashString, mulberry32 } from '@/lib/rng';

export interface BoardRow {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  isYou?: boolean;
  real?: boolean;
}

export type Zone = 'promotion' | 'safe' | 'demotion';

/**
 * Bots get a weekly target XP that grows with the league. Their XP at time t is target * progress(t),
 * with per-bot jitter, so the board moves while you watch it but is the same for every launch.
 */
export function buildBoard(
  weekId: string,
  tierIdx: number,
  youXp: number,
  youName: string,
  real: BoardRow[],
  progress: number = weekProgress()
): BoardRow[] {
  const rows: BoardRow[] = [{ id: 'you', name: youName || 'You', avatar: '😀', xp: youXp, isYou: true }];
  const used = new Set<string>([youName.toLowerCase()]);
  for (const r of real) {
    if (rows.length >= LEAGUE_SIZE) break;
    if (r.isYou) continue;
    rows.push({ ...r, real: true });
    used.add(r.name.toLowerCase());
  }
  const rnd = mulberry32(hashString(`${weekId}:${tierIdx}`));
  let i = 0;
  while (rows.length < LEAGUE_SIZE && i < 200) {
    i++;
    const name = BOT_NAMES[Math.floor(rnd() * BOT_NAMES.length)];
    const key = name.toLowerCase();
    const r1 = rnd();
    const r2 = rnd();
    const r3 = rnd();
    if (used.has(key)) continue;
    used.add(key);
    const lo = 20 + tierIdx * 25;
    const hi = 520 + tierIdx * 90;
    const target = lo + Math.pow(r1, 1.5) * (hi - lo);
    const p = Math.min(1, Math.max(0, progress + (r2 - 0.5) * 0.06));
    rows.push({
      id: `bot-${i}`,
      name,
      avatar: BOT_AVATARS[Math.floor(r3 * BOT_AVATARS.length)],
      xp: Math.round(target * Math.pow(p, 0.9)),
    });
  }
  // stable sort: xp desc, then name so ties do not flicker
  rows.sort((a, b) => b.xp - a.xp || (a.isYou ? -1 : b.isYou ? 1 : a.name.localeCompare(b.name)));
  return rows;
}

export function zoneFor(rank: number, total: number, tierIdx: number, topTier: number): Zone {
  if (rank <= PROMOTION_ZONE && tierIdx < topTier) return 'promotion';
  if (rank > total - DEMOTION_ZONE && tierIdx > 0) return 'demotion';
  return 'safe';
}

export function gemsForRank(rank: number): number {
  if (rank === 1) return 60;
  if (rank === 2) return 40;
  if (rank === 3) return 20;
  return 0;
}
