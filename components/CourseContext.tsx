import React, { createContext, useContext, type ReactNode } from 'react';
import type { Course } from '@/data/types';

const Ctx = createContext<Course | null>(null);

export function CourseProvider({ course, children }: { course: Course; children: ReactNode }) {
  return <Ctx.Provider value={course}>{children}</Ctx.Provider>;
}

export function useCourseCtx(): Course {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCourseCtx must be used inside <CourseProvider>');
  return c;
}
