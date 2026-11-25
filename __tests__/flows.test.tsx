import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, act } from '@testing-library/react-native';
import Onboarding from '@/app/onboarding';
import Auth from '@/app/auth';
import { useApp } from '@/store/app';

const router = (global as unknown as { __router: Record<string, jest.Mock> }).__router;
const setParams = (p: Record<string, string>) => ((global as unknown as { __params: unknown }).__params = p);
const style = (n: { props: { style?: unknown } }) => (StyleSheet.flatten(n.props.style as never) ?? {}) as Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  setParams({});
  act(() => { useApp.getState().resetAll(); });
});

describe('fresh install: onboarding', () => {
  it('step 1 ("What should we call you?") shows a visible CONTINUE button', () => {
    render(<Onboarding />);
    expect(screen.getByText('What should we call you?')).toBeTruthy();
    const cont = screen.getByRole('button', { name: 'Continue' });
    // visible = it has a real background, not white on white
    expect(style(cont).backgroundColor).toBe('#58CC02');
  });

  it('walks launch -> 4 steps -> Learn tab with a name, using only the bottom button', () => {
    render(<Onboarding />);
    fireEvent.changeText(screen.getByTestId('name-input'), 'Ravi');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' })); // -> language
    expect(screen.getByText('I speak...')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' })); // -> goal
    expect(screen.getByText('What is your daily goal?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' })); // -> level
    expect(screen.getByText(/How much English do you know/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Start learning' }));
    expect(useApp.getState().onboarded).toBe(true);
    expect(useApp.getState().displayName).toBe('Ravi');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/learn');
  });

  it('pressing the keyboard Next/Done key on the name field moves on', () => {
    render(<Onboarding />);
    fireEvent(screen.getByTestId('name-input'), 'submitEditing');
    expect(screen.getByText('I speak...')).toBeTruthy();
  });

  it('works with no name typed, and "Find my level" goes to the placement test', () => {
    render(<Onboarding />);
    for (let i = 0; i < 3; i++) fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.press(screen.getByText('🎯 Find my level'));
    fireEvent.press(screen.getByRole('button', { name: 'Start learning' }));
    expect(useApp.getState().displayName).toBe('Learner');
    expect(router.replace).toHaveBeenCalledWith('/placement');
  });

  it('"I already have an account" opens the sign-in screen', () => {
    render(<Onboarding />);
    fireEvent.press(screen.getByRole('button', { name: 'I already have an account' }));
    expect(router.push).toHaveBeenCalledWith('/auth');
  });

  it('can start at the language step (?step=1) and go back', () => {
    setParams({ step: '1' });
    render(<Onboarding />);
    expect(screen.getByText('I speak...')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('What should we call you?')).toBeTruthy();
  });
});

describe('sign-in screen: continue as guest', () => {
  it('is visible and styled, and goes to onboarding step 1 on a fresh install', () => {
    render(<Auth />);
    const guest = screen.getByRole('button', { name: 'Continue as guest' });
    expect(style(guest).backgroundColor).toBe('#58CC02');
    fireEvent.press(guest);
    expect(router.replace).toHaveBeenCalledWith('/onboarding?step=1');
    expect(useApp.getState().userId).toBeNull();
  });

  it('goes straight to the Learn tab if onboarding is already done', () => {
    act(() => { useApp.setState({ onboarded: true }); });
    render(<Auth />);
    fireEvent.press(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/learn');
  });
});

describe('full chain from the bug report', () => {
  it('launch -> "I already have an account" -> "Continue as guest" -> onboarding -> Learn', () => {
    const first = render(<Onboarding />);
    fireEvent.press(screen.getByRole('button', { name: 'I already have an account' }));
    expect(router.push).toHaveBeenCalledWith('/auth');
    first.unmount();

    render(<Auth />);
    fireEvent.press(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(router.replace).toHaveBeenCalledWith('/onboarding?step=1');

    setParams({ step: '1' });
    render(<Onboarding />);
    expect(screen.getByText('I speak...')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.press(screen.getByRole('button', { name: 'Start learning' }));
    expect(router.replace).toHaveBeenLastCalledWith('/(tabs)/learn');
  });
});
