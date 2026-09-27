import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML for every web page during static rendering. This is where the PWA
 * manifest, theme colour and mobile web-app meta tags are declared.
 * Runs only in Node.js during export; it has no access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Flashcards</title>
        <meta name="description" content="Picture flashcards with spaced repetition." />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a7ea4" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f1214" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Flashcards" />
        <link rel="apple-touch-icon" href="/icons/icon.png" />
        <link rel="icon" href="/favicon.ico" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #f4f6f8;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #0f1214;
  }
}`;
