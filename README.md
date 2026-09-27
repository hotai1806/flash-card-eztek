# Flashcards · Memory Garden

Picture flashcards with spaced repetition, where every word you learn is a plant
that grows when you review it and wilts when the forgetting curve says you are
about to lose it. One code base runs on iOS, Android and the web (installable as
a PWA). Built with [Expo](https://expo.dev) and Expo Router.

## What makes it different

- **Memory Garden.** The deck is a garden. Growth stage (seed → sprout → sapling →
  tree → bloom) follows the scheduled review interval; droop and fading follow the
  estimated retention from the forgetting curve. A water drop marks words that are
  due. Reviewing is "watering". The home screen shows garden health, the thirstiest
  plants and a daily goal; sessions end with the words you watered and how they grew.
- **Three ways to practise, mixed automatically.** *Recognise* (word + picture →
  meaning), *Recall* (picture + meaning → produce the word yourself) and *Listen*
  (hear the word first, then reveal). Recall and listening are much stronger
  memory tests than recognition alone. New words always start in recognise mode.
- **Pronunciation on every card** through the device's text-to-speech (English,
  Chinese, Vietnamese), including on the web.
- **Streaks and a daily goal**, with a 7-day strip on the home screen and a 14-day
  history in Stats.
- **Guided first run** that asks what you are learning, what you speak and how you
  want to practise, then plants a 30-word starter garden.

## Features

- **Multilingual.** The UI, the words and the translations all support English,
  Chinese and Vietnamese. Pick the language you are learning and your main
  language in Settings. Adding another language is a matter of extending `Lang`
  in `lib/types.ts` and adding a dictionary in `lib/i18n/translations.ts`.
- **Automatic pictures.** Every new word gets a picture generated for it, with no
  API key to configure. Two keyless providers are supported (Settings → Picture):
  - *AI* – an illustration generated from the word (`image.pollinations.ai`)
  - *Photo* – a real photo tagged with the word (`loremflickr.com`)
  You can also paste your own image URL or ask for a different picture.
- **Word + picture on the front, translation on the back.** Tap the card to flip
  it. The back shows the translation in your main language, plus an optional
  note or example sentence.
- **Automatic translation.** Leave the translation empty and the app fills it in
  (free MyMemory API, no key). It also stores translations for the other
  supported languages so you can switch your main language later.
- **Spaced repetition based on the forgetting curve.** Scheduling uses the SM-2
  algorithm (the same family as Anki): *Again / Hard / Good / Easy* set the next
  interval, a lapse brings the card back in 10 minutes, and each success stretches
  the interval so cards are reviewed right before they would be forgotten. The
  Stats tab shows an estimated retention (`R = e^(-t/S)`) for each card and the
  cards most at risk.
- **Swipe to grade.** Swipe left = forgot, swipe right = remembered; or use the
  four buttons.
- **Offline first.** Cards and progress are stored on the device
  (AsyncStorage / localStorage). On the web a service worker caches the app shell
  and any pictures you have already seen.

## Project layout

```
app/
  _layout.tsx          providers (store, i18n, theme) and service worker registration
  +html.tsx            web root HTML: PWA manifest, theme colour, mobile meta tags
  onboarding.tsx       first-run setup (languages, practice modes, starter garden)
  study.tsx            full-screen study session (modes, flip / swipe, grading, summary)
  (tabs)/index.tsx     Today: garden health, daily goal, streak, thirsty plants
  (tabs)/cards.tsx     Garden grid + list view, add / edit / delete, search
  (tabs)/stats.tsx     14-day activity, streaks, garden counts, cards most at risk
  (tabs)/settings.tsx  Languages, practice modes, speech, daily goal, pictures, reset
components/
  FlashCard.tsx        the flip + swipe card (recognise / recall / listen fronts)
  PlantTile.tsx        one plant in the garden
  CardForm.tsx         add / edit modal with auto translate and auto picture
lib/
  srs.ts               SM-2 scheduling, retention estimate, session builder
  garden.ts            plant stage, wilt and garden summary from review state
  stats.ts             daily review log, streaks
  speech.ts            text-to-speech helper
  store.tsx            persisted app state (cards, settings, review log)
  i18n/                UI dictionaries (en, zh, vi) and the `useI18n` hook
  images.ts            picture URL builders
  translate.ts         auto translation client
  pwa.ts               service worker registration (web only)
public/
  manifest.json, sw.js, icons/   copied to the web build root
constants/seedCards.ts starter vocabulary in all three languages
```

## Get started

```bash
npm install
npx expo start          # then press i / a / w, or scan the QR code with Expo Go
```

Useful scripts:

```bash
npm run web                          # dev server for the web
npx expo export --platform web       # static PWA build in dist/ (serve it over HTTPS to install)
npm test                             # unit tests (spaced-repetition engine)
npx tsc --noEmit                     # type check
```

## Notes

- Picture and translation providers are free public services with rate limits and
  no uptime guarantee. Both are isolated in `lib/images.ts` and `lib/translate.ts`
  so they can be swapped for a paid API if needed.
- The service worker is only registered in production builds (`expo export`), not
  in the Metro dev server.
