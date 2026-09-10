/**
 * Colors used across the app, defined for light and dark mode.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#4cc2e6';

export const Colors = {
  light: {
    text: '#11181C',
    textMuted: '#687076',
    background: '#f4f6f8',
    surface: '#ffffff',
    border: '#e1e5e9',
    tint: tintColorLight,
    primary: '#0a7ea4',
    onPrimary: '#ffffff',
    success: '#2e9e5b',
    warning: '#d98c00',
    danger: '#d64545',
    cardBack: '#0a7ea4',
    onCardBack: '#ffffff',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    background: '#0f1214',
    surface: '#1b1f22',
    border: '#2c3237',
    tint: tintColorDark,
    primary: '#2fa6cc',
    onPrimary: '#ffffff',
    success: '#3fbf72',
    warning: '#e8a63a',
    danger: '#e26363',
    cardBack: '#1f6f8b',
    onCardBack: '#ffffff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export type ThemeColors = typeof Colors.light;
