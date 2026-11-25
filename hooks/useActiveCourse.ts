import { useMemo } from 'react';
import type { Course } from '@/data/types';
import { useApp } from '@/store/app';
import { useCatalog } from '@/store/catalog';

export function useActiveCourse(): Course {
  const id = useApp((s) => s.courseId);
  const courses = useCatalog((s) => s.courses);
  return useMemo(() => courses.find((c) => c.id === id) ?? courses[0], [courses, id]);
}

export function useCourseCompleted(courseId: string): Set<string> {
  const progress = useApp((s) => s.progress[courseId]);
  return useMemo(() => new Set(Object.keys(progress?.completed ?? {})), [progress]);
}
