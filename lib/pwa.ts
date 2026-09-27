/**
 * Registers the service worker that makes the web build installable and
 * available offline. Only meaningful on web; no-op elsewhere.
 * The worker itself lives in public/sw.js and is copied to the site root by
 * `expo export`.
 */
export function registerServiceWorker(): void {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  const win = globalThis as { addEventListener?: Window['addEventListener'] };
  if (!nav || !('serviceWorker' in nav) || typeof win.addEventListener !== 'function') return;
  // Skip during local development: Metro serves fresh bundles and a cached shell
  // would only get in the way. Registration still happens in production builds.
  if (__DEV__) return;

  win.addEventListener('load', () => {
    nav.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.warn('Service worker registration failed', err);
    });
  });
}
