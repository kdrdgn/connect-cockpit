import { color, radius, space, text } from '@cockpit/tokens';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, StyleSheet, Text } from 'react-native';

export const c = color.light;

/** Apple's minimum touch target; every tappable control is at least this big (design M8). */
export const MIN_TOUCH = 44;

export const type = {
  sm: { fontSize: text.sm[0], lineHeight: text.sm[1] },
  md: { fontSize: text.md[0], lineHeight: text.md[1] },
  lg: { fontSize: text.lg[0], lineHeight: text.lg[1] },
  xl: { fontSize: text.xl[0], lineHeight: text.xl[1] },
} as const;

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** Spoken name when the visible label alone is ambiguous, e.g. "Retry StubHub". */
  accessibilityLabel?: string;
  variant?: 'default' | 'primary' | 'ghost';
  icon?: ReactNode;
};

export function Button({ label, variant = 'default', disabled, icon, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...rest}
    >
      {icon}
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
  },
  primary: { backgroundColor: c.accent, borderColor: c.accent },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  label: { ...type.md, fontWeight: '600', color: c.ink },
  primaryLabel: { color: c.surface },
});
