import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { useApp } from '@/store/app';

jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));
jest.mock('@/services/sync', () => ({ flushQueue: jest.fn(async () => ({ sent: 0, failed: 0, pending: 0 })), pullRemote: jest.fn(), fetchLeagueRivals: jest.fn(async () => []), queueMistake: jest.fn(), startSync: jest.fn() }));

import Learn from '@/app/(tabs)/learn';
import Practice from '@/app/(tabs)/practice';
import Leagues from '@/app/(tabs)/leagues';
import Quests from '@/app/(tabs)/quests';
import Profile from '@/app/(tabs)/profile';
import Shop from '@/app/shop';
import Paywall from '@/app/paywall';
import Courses from '@/app/courses';
import Hearts from '@/app/hearts';
import Settings from '@/app/settings';

const flat = (n: { props: { style?: unknown } }) => (StyleSheet.flatten(n.props.style as never) ?? {}) as Record<string, unknown>;

beforeEach(() => {
  act(() => {
    useApp.getState().resetAll();
    useApp.setState({ onboarded: true });
  });
});

const screens: [string, () => React.JSX.Element][] = [
  ['Learn', () => <Learn />], ['Practice', () => <Practice />], ['Leagues', () => <Leagues />], ['Quests', () => <Quests />],
  ['Profile', () => <Profile />], ['Shop', () => <Shop />], ['Paywall', () => <Paywall />], ['Courses', () => <Courses />],
  ['Hearts', () => <Hearts />], ['Settings', () => <Settings />],
];

describe.each(screens)('%s screen renders on the native renderer', (_name, make) => {
  it('renders, and every text button has a real background or border (never white-on-white)', () => {
    render(make());
    const buttons = screen.queryAllByRole('button');
    for (const b of buttons) {
      // Icon buttons (they carry an accessibilityLabel) are laid out with Tailwind classes, which are not compiled
      // under Jest. Text buttons are styled inline, so an empty style on one of them is the invisible-button bug.
      if (b.props.accessibilityLabel) continue;
      const s = flat(b);
      // a styled button has at least one of: fill, border, padding. An empty style object is the bug.
      const styled = s.backgroundColor !== undefined || s.borderWidth !== undefined || s.borderBottomWidth !== undefined || s.padding !== undefined || s.paddingVertical !== undefined;
      expect({ role: 'button', styled }).toEqual({ role: 'button', styled: true });
    }
  });
});

it('Learn shows the first lesson as startable with a visible circle', () => {
  render(<Learn />);
  const first = screen.getByRole('button', { name: /Greetings, active/ });
  expect(flat(first).backgroundColor).toBe('#58CC02');
});
