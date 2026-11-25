import { buildCourse } from '../builder';
import type { Course, CourseSpec } from '../types';
import { EN_TA_UNITS } from './en-for-ta.units';
import { ES_EN_UNITS } from './es-for-en.units';
import { englishRoleplays, spanishRoleplays } from './roleplays';
import { ENGLISH_TUTOR_FOR_TAMIL, SPANISH_TUTOR_FOR_ENGLISH } from './tutors';

export const EN_FOR_TA_ID = 'en-for-ta';
export const ES_FOR_EN_ID = 'es-for-en';

export const EN_FOR_TA_SPEC: CourseSpec = {
  id: EN_FOR_TA_ID,
  title: 'English for Tamil Speakers',
  flag: '🇬🇧',
  native: { code: 'ta', name: 'Tamil', tts: 'ta-IN' },
  target: { code: 'en', name: 'English', tts: 'en-US', stt: 'en-IN' },
  persona: { name: 'Lily', emoji: '👩🏽‍🏫', color: '#FF9600', role: 'English tutor' },
  units: EN_TA_UNITS,
  roleplays: englishRoleplays(EN_FOR_TA_ID),
  tutor: ENGLISH_TUTOR_FOR_TAMIL,
};

export const ES_FOR_EN_SPEC: CourseSpec = {
  id: ES_FOR_EN_ID,
  title: 'Spanish for English Speakers',
  flag: '🇪🇸',
  native: { code: 'en', name: 'English', tts: 'en-US' },
  target: { code: 'es', name: 'Spanish', tts: 'es-ES', stt: 'es-ES' },
  persona: { name: 'Maya', emoji: '👩🏻‍🏫', color: '#CE82FF', role: 'Spanish tutor' },
  units: ES_EN_UNITS,
  roleplays: spanishRoleplays(ES_FOR_EN_ID),
  tutor: SPANISH_TUTOR_FOR_ENGLISH,
};

export const SEED_COURSES: Course[] = [buildCourse(EN_FOR_TA_SPEC, true), buildCourse(ES_FOR_EN_SPEC, true)];
