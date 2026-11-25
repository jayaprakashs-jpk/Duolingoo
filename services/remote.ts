// Optional remote curriculum from Supabase (`courses.spec` holds the same JSON the Curriculum Studio imports).
import type { Course } from '@/data/types';
import { parseCourseJson } from './validate';
import { supabase } from './supabase';

export async function fetchRemoteCourses(): Promise<Course[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('courses').select('id, spec').eq('published', true);
    if (error || !data) return [];
    const out: Course[] = [];
    for (const row of data as { id: string; spec: unknown }[]) {
      const res = parseCourseJson(JSON.stringify(row.spec));
      if (res.course) out.push({ ...res.course, id: row.id });
    }
    return out;
  } catch {
    return [];
  }
}
