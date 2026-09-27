/**
 * Colors used across the app, defined for light and dark mode.
 * Warm paper background, deep indigo primary, coral accent, garden greens.
 */

export const Colors = {
  light: {
    text: '#1c1a2e',
    textMuted: '#6d6a80',
    background: '#f6f2ea',
    surface: '#ffffff',
    surfaceAlt: '#efe9dd',
    border: '#e6e0d3',
    tint: '#4f46e5',
    primary: '#4f46e5',
    primaryDark: '#3730a3',
    onPrimary: '#ffffff',
    accent: '#ff6b4a',
    success: '#2f9e63',
    warning: '#e0a300',
    danger: '#e5484d',
    cardBack: '#4f46e5',
    cardBackAlt: '#7c3aed',
    onCardBack: '#ffffff',
    garden: '#dff1d8',
    gardenDeep: '#2f9e63',
    soil: '#c9b79c',
    icon: '#6d6a80',
    tabIconDefault: '#9a97ad',
    tabIconSelected: '#4f46e5',
  },
  dark: {
    text: '#f1efff',
    textMuted: '#9c99b5',
    background: '#121020',
    surface: '#1c1930',
    surfaceAlt: '#262242',
    border: '#2f2b4c',
    tint: '#a5b4fc',
    primary: '#6366f1',
    primaryDark: '#4338ca',
    onPrimary: '#ffffff',
    accent: '#ff7d5c',
    success: '#3fbf72',
    warning: '#f0b429',
    danger: '#ef6a6f',
    cardBack: '#4338ca',
    cardBackAlt: '#6d28d9',
    onCardBack: '#ffffff',
    garden: '#1d2e22',
    gardenDeep: '#3fbf72',
    soil: '#4a3f33',
    icon: '#9c99b5',
    tabIconDefault: '#6f6c8a',
    tabIconSelected: '#a5b4fc',
  },
};

export type ThemeColors = typeof Colors.light;
