// Super Family. With Supabase configured the group is real (see supabase/schema.sql).
// Without it, joining is simulated locally so the screens can be tested in the APK.
import { useApp, type FamilyMember } from '@/store/app';
import { hashString } from '@/lib/rng';
import { supabase } from './supabase';

const EMOJIS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '🐙', '🦉'];

export function isRealFamily(): boolean {
  return !!supabase && !!useApp.getState().userId;
}

export async function createFamily(): Promise<void> {
  useApp.getState().ensureFamily();
  const s = useApp.getState();
  if (!isRealFamily() || !s.family) return;
  try {
    await supabase!.from('family_groups').upsert({ code: s.family.code, owner_id: s.userId }, { onConflict: 'code' });
  } catch {
    /* stays local until the next try */
  }
}

export async function joinFamilyByCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(clean)) return { ok: false, error: 'A family code has 6 letters or numbers.' };
  if (isRealFamily()) {
    const { error } = await supabase!.rpc('join_family', { p_code: clean });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // guest mode: simulate a member so the UI can be tested
  const st = useApp.getState();
  st.ensureFamily();
  const h = hashString(clean);
  st.upsertFamilyMember({
    id: `sim-${clean}`,
    name: `Member ${clean.slice(0, 3)}`,
    emoji: EMOJIS[h % EMOJIS.length],
    streak: 1 + (h % 40),
    xp: 120 + (h % 900),
    active: true,
    simulated: true,
  });
  return { ok: true };
}

export async function refreshFamilyMembers(): Promise<void> {
  const s = useApp.getState();
  if (!s.family || !isRealFamily()) return;
  try {
    const { data, error } = await supabase!.rpc('family_members', { p_code: s.family.code });
    if (error || !data) return;
    const rows = data as { user_id: string; display_name: string; streak: number; xp: number }[];
    const prev = new Map(s.family.members.map((m) => [m.id, m]));
    const members: FamilyMember[] = rows
      .filter((r) => r.user_id !== s.userId)
      .slice(0, 5)
      .map((r) => ({
        id: r.user_id,
        name: r.display_name || 'Member',
        emoji: EMOJIS[hashString(r.user_id) % EMOJIS.length],
        streak: r.streak,
        xp: r.xp,
        active: prev.get(r.user_id)?.active ?? true,
        simulated: false,
      }));
    useApp.setState({ family: { code: s.family.code, members } });
  } catch {
    /* offline */
  }
}
