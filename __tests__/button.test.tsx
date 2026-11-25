import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';
import { Tile } from '@/components/ui/Tile';

// Regression: on Android, NativeWind drops function-style Pressables, which made green buttons invisible
// (white text on a missing background). These run on the native renderer, not the web one.
const styleOf = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

it('primary Button keeps its green background, padding and border on native', () => {
  render(<Button title="Get started" onPress={() => {}} />);
  const s = styleOf(screen.getByRole('button'));
  expect(s.backgroundColor).toBe('#58CC02');
  expect(s.borderBottomColor).toBe('#58A700');
  expect(s.paddingVertical).toBeGreaterThan(8);
});

it('white Button and disabled Button are styled too', () => {
  render(
    <>
      <Button title="White one" variant="white" onPress={() => {}} />
      <Button title="Off" disabled onPress={() => {}} />
    </>
  );
  expect(styleOf(screen.getByRole('button', { name: 'White one' })).backgroundColor).toBe('#FFFFFF');
  expect(styleOf(screen.getByRole('button', { name: 'Off' })).backgroundColor).toBe('#E5E5E5');
});

it('Tile keeps its border and fill on native', () => {
  render(<Tile label="hello" state="selected" onPress={() => {}} />);
  const s = styleOf(screen.getByText('hello').parent!.parent!.parent ?? screen.getByText('hello'));
  expect(JSON.stringify(s) + JSON.stringify(styleOf(screen.getByText('hello').parent!))).toContain('#84D8FF');
});
