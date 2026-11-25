import { create } from 'zustand';
import { SEED_COURSES } from '@/data/seed';
import type { Course } from '@/data/types';
import { deleteCustomCourse, listCustomCourses, saveCustomCourse } from '@/services/db';

interface CatalogState {
  courses: Course[];
  ready: boolean;
  load: () => Promise<void>;
  add: (c: Course) => Promise<void>;
  remove: (id: string) => Promise<void>;
  mergeRemote: (cs: Course[]) => void;
}

const byId = (list: Course[]) => new Map(list.map((c) => [c.id, c]));

export const useCatalog = create<CatalogState>((set, get) => ({
  courses: SEED_COURSES,
  ready: false,
  load: async () => {
    try {
      const custom = await listCustomCourses();
      const m = byId(SEED_COURSES);
      for (const c of custom) if (!m.has(c.id) || !m.get(c.id)!.builtin) m.set(c.id, c);
      set({ courses: Array.from(m.values()), ready: true });
    } catch {
      set({ ready: true });
    }
  },
  add: async (c) => {
    await saveCustomCourse(c);
    const m = byId(get().courses);
    m.set(c.id, c);
    set({ courses: Array.from(m.values()) });
  },
  remove: async (id) => {
    await deleteCustomCourse(id);
    set({ courses: get().courses.filter((c) => c.id !== id || c.builtin) });
  },
  mergeRemote: (cs) => {
    const m = byId(get().courses);
    for (const c of cs) if (!m.has(c.id)) m.set(c.id, c);
    set({ courses: Array.from(m.values()) });
  },
}));

export const getCourseById = (id: string): Course => useCatalog.getState().courses.find((c) => c.id === id) ?? SEED_COURSES[0];
