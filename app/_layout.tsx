import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { SECTIONS } from '@/content/sections';
import { useColorScheme } from '@/hooks/useColorScheme';
import { progressStore } from '@/lib/progressStore';
import { validateSections } from '@/lib/sections';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// A broken content file shows up as one red box listing every problem.
if (__DEV__) {
  const problems = validateSections(SECTIONS);
  if (problems.length) throw new Error(problems.join('\n'));
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    progressStore.hydrate().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (loaded && ready) {
      SplashScreen.hideAsync();
    }
  }, [loaded, ready]);

  if (!loaded || !ready) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Sections' }} />
        <Stack.Screen name="study/[sectionId]" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
