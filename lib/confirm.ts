import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog. `Alert.alert` is a no-op on web, so we
 * fall back to `window.confirm` there.
 */
export function confirmAsync(
  title: string,
  message: string,
  labels: { confirm: string; cancel: string }
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const w = globalThis as unknown as { confirm?: (text: string) => boolean };
    return Promise.resolve(w.confirm ? w.confirm(`${title}\n\n${message}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: labels.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: labels.confirm, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** Cross-platform informational message. */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const w = globalThis as unknown as { alert?: (text: string) => void };
    w.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
