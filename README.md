# Flash-card app

A vocabulary flash-card app built with [Expo](https://expo.dev). Words are grouped into sections. Each section has one big picture cut into tiles; every word owns one tile, and getting a word right reveals it. When all the words in a section are learned, the whole picture and the section's sentence are shown.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

## Editing content

Everything the app teaches lives in one file, `content/sections.ts`, plus one picture
per section in `assets/sections/`. To add or replace a section, add or edit one entry in
that file and drop its PNG into `assets/sections/`.

Rules (checked by `npm run test:ci`, and shown as a red error box in development):

1. A section's word count must equal `cols × rows`. Every tile is earned by one word.
   With 2 to 4 columns the practical counts are 4, 6, 8, 9, 10 and 12.
2. Word order is tile order: top-left first, reading left to right, top to bottom.
3. The picture must have the same shape as the grid (width / height = cols / rows), for
   example 900×900 for 3×3 or 1200×600 for 4×2. It is drawn stretched, so a mismatched
   shape distorts the picture. Keep pictures under 2000 px on the long side.
4. Section and word ids are unique, lowercase and never renamed. Renaming a word id
   forgets that word's saved progress. Section ids match the PNG file name; word ids are
   the lowercase English word.

To swap in real art: overwrite `assets/sections/<id>.png` with a picture of the same
shape as the grid, then reorder the section's `words` so each word sits on the cell it
depicts. No code changes are needed.

The shipped pictures are placeholders drawn by `scripts/make-placeholder-art.py`. To
regenerate them (for example after changing a grid), run from the repo root:

```bash
python3 scripts/make-placeholder-art.py
```

It needs Python 3 and Pillow. The script keeps its own copy of the word list; update it
by hand when the content file changes.

## Checks

```bash
npm run test:ci
```

```bash
npx tsc --noEmit
```

Both must pass after a content edit. The test suite validates the content file against
the rules above and the type check catches missing or misspelled fields.
