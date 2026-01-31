import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Typography } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'display' | 'h1' | 'h2' | 'body' | 'bodyBold' | 'caption' | 'micro';
  color?: 'primary' | 'secondary';
  /** @deprecated Use variant instead */
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  variant,
  color = 'primary',
  type,
  ...rest
}: ThemedTextProps) {
  // Support legacy 'type' prop for backwards compatibility
  const resolvedVariant = variant ?? typeToVariant(type);

  const textColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    color === 'primary' ? 'textPrimary' : 'textSecondary'
  );

  return (
    <Text
      style={[
        { color: textColor },
        resolvedVariant ? styles[resolvedVariant] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

// Helper to map legacy 'type' prop to new 'variant' prop
function typeToVariant(type?: ThemedTextProps['type']): ThemedTextProps['variant'] {
  switch (type) {
    case 'title':
      return 'h1';
    case 'subtitle':
      return 'h2';
    case 'defaultSemiBold':
      return 'bodyBold';
    case 'link':
      return 'body';
    case 'default':
    default:
      return 'body';
  }
}

const styles = StyleSheet.create({
  display: {
    fontSize: Typography.display.fontSize,
    lineHeight: Typography.display.lineHeight,
    fontWeight: Typography.display.fontWeight,
    letterSpacing: Typography.display.letterSpacing,
  },
  h1: {
    fontSize: Typography.h1.fontSize,
    lineHeight: Typography.h1.lineHeight,
    fontWeight: Typography.h1.fontWeight,
    letterSpacing: Typography.h1.letterSpacing,
  },
  h2: {
    fontSize: Typography.h2.fontSize,
    lineHeight: Typography.h2.lineHeight,
    fontWeight: Typography.h2.fontWeight,
    letterSpacing: Typography.h2.letterSpacing,
  },
  body: {
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontWeight: Typography.body.fontWeight,
    letterSpacing: Typography.body.letterSpacing,
  },
  bodyBold: {
    fontSize: Typography.bodyBold.fontSize,
    lineHeight: Typography.bodyBold.lineHeight,
    fontWeight: Typography.bodyBold.fontWeight,
    letterSpacing: Typography.bodyBold.letterSpacing,
  },
  caption: {
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
    fontWeight: Typography.caption.fontWeight,
    letterSpacing: Typography.caption.letterSpacing,
  },
  micro: {
    fontSize: Typography.micro.fontSize,
    lineHeight: Typography.micro.lineHeight,
    fontWeight: Typography.micro.fontWeight,
    letterSpacing: Typography.micro.letterSpacing,
  },
});
