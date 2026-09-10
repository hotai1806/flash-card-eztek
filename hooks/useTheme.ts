import { Colors, type ThemeColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

/** Returns the full color palette for the active color scheme. */
export function useTheme(): ThemeColors {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}
