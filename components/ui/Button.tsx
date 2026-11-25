import React, { type ReactNode } from 'react';
import { ActivityIndicator, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptic } from '@/services/sound';
import { Press } from '@/components/ui/Press';

export type Variant = 'green' | 'blue' | 'red' | 'gray' | 'white' | 'gold' | 'purple' | 'orange';

const PALETTE: Record<Variant, { bg: string; edge: string; text: string }> = {
  green: { bg: '#58CC02', edge: '#58A700', text: '#FFFFFF' },
  blue: { bg: '#1CB0F6', edge: '#1899D6', text: '#FFFFFF' },
  red: { bg: '#FF4B4B', edge: '#EA2B2B', text: '#FFFFFF' },
  gold: { bg: '#FFC800', edge: '#E5B400', text: '#4B3B00' },
  purple: { bg: '#CE82FF', edge: '#A568CC', text: '#FFFFFF' },
  orange: { bg: '#FF9600', edge: '#CC7800', text: '#FFFFFF' },
  gray: { bg: '#E5E5E5', edge: '#CFCFCF', text: '#AFAFAF' },
  white: { bg: '#FFFFFF', edge: '#E5E5E5', text: '#1CB0F6' },
};

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** override the colors, e.g. unit theme colors */
  color?: { bg: string; edge: string; text?: string };
}

export function Button({ title, onPress, variant = 'green', disabled, loading, small, icon, style, color }: Props) {
  const p = disabled ? PALETTE.gray : PALETTE[variant];
  const bg = !disabled && color ? color.bg : p.bg;
  const edge = !disabled && color ? color.edge : p.edge;
  const text = !disabled && color?.text ? color.text : p.text;
  const border = variant === 'white' && !disabled ? 2 : 0;
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        haptic('light');
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: 16,
          paddingVertical: small ? 10 : 15,
          paddingHorizontal: small ? 16 : 22,
          borderBottomWidth: pressed ? 2 : 4,
          borderBottomColor: edge,
          borderWidth: border,
          borderColor: border ? edge : undefined,
          marginTop: pressed ? 2 : 0,
          marginBottom: pressed ? 2 : 0,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={text} /> : icon}
      <Text style={{ color: text, fontWeight: '800', fontSize: small ? 14 : 16, letterSpacing: 0.6, textTransform: 'uppercase' }}>{title}</Text>
    </Press>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}
