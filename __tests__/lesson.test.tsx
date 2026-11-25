import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { LessonRunner } from '@/components/LessonRunner';
import { SEED_COURSES } from '@/data/seed';
import { useApp } from '@/store/app';

jest.mock('@/services/sync', () => ({ queueMistake: jest.fn(), flushQueue: jest.fn(), pullRemote: jest.fn(), startSync: jest.fn() }));

const course = SEED_COURSES[0];
const lesson = course.units[0].lessons[0];
const flat = (n: { props: { style?: unknown } }) => (StyleSheet.flatten(n.props.style as never) ?? {}) as Record<string, unknown>;

beforeEach(() => {
  act(() => {
    useApp.getState().resetAll();
    useApp.setState({ onboarded: true });
  });
});

function renderRunner(onDone = jest.fn()) {
  return render(<LessonRunner course={course} exercises={lesson.exercises} lessonId={lesson.id} useHearts onQuit={jest.fn()} onDone={onDone} />);
}

it('first exercise: options are tappable cards, Check is disabled until you choose', () => {
  renderRunner();
  const ex = lesson.exercises[0];
  if (ex.type !== 'MULTIPLE_CHOICE') throw new Error('expected a multiple choice first');
  const check = screen.getByRole('button', { name: 'Check' });
  expect(check.props.accessibilityState?.disabled).toBe(true);
  fireEvent.press(screen.getByText(ex.options[ex.correct].text));
  expect(screen.getByRole('button', { name: 'Check' }).props.accessibilityState?.disabled).toBeFalsy();
  expect(flat(screen.getByRole('button', { name: 'Check' })).backgroundColor).toBe('#58CC02');
});

it('right answer: green feedback with a styled Continue; wrong answer costs a heart and shows the solution', () => {
  const ex = lesson.exercises[0];
  if (ex.type !== 'MULTIPLE_CHOICE') throw new Error('expected a multiple choice first');
  const { unmount } = renderRunner();
  fireEvent.press(screen.getByText(ex.options[ex.correct].text));
  fireEvent.press(screen.getByRole('button', { name: 'Check' }));
  const cont = screen.getByRole('button', { name: 'Continue' });
  expect(flat(cont).backgroundColor).toBe('#58CC02');
  expect(useApp.getState().hearts).toBe(5);
  unmount();

  renderRunner();
  const wrong = ex.options.findIndex((_, i) => i !== ex.correct);
  fireEvent.press(screen.getByText(ex.options[wrong].text));
  fireEvent.press(screen.getByRole('button', { name: 'Check' }));
  expect(screen.getByText('Correct solution:')).toBeTruthy();
  expect(flat(screen.getByRole('button', { name: 'Continue' })).backgroundColor).toBe('#FF4B4B');
  expect(useApp.getState().hearts).toBe(4);
});
