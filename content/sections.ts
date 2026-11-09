/**
 * THE content file. Edit this file (and drop a PNG into assets/sections/) to change
 * what the app teaches. Rules, checked by `npm run test:ci` and by a red box in dev:
 *
 * 1. `words.length` must equal `cols * rows` (every tile is earned). Any cols × rows
 *    with both >= 1 works; with 2–4 columns the practical counts are 4, 6, 8, 9, 10, 12.
 * 2. Word order is tile order: top-left first, reading left to right, top to bottom.
 * 3. The picture must have the same shape as the grid (width / height = cols / rows),
 *    e.g. 900×900 for 3×3 or 1200×600 for 4×2. It is drawn stretched, so a mismatched
 *    shape distorts the picture. Keep it under 2000 px on the long side.
 * 4. Section and word ids are unique, lowercase, non-empty and never renamed (renaming
 *    forgets that word's saved progress). Section ids match the PNG file name; word ids
 *    are the lowercase English word.
 *
 * The Vietnamese meanings below are common dictionary forms written by an assistant,
 * not a native speaker. Please review them (regional variants: thìa/muỗng, cốc/ly, ô/dù).
 */
import type { Section } from '@/lib/sections';

export const SECTIONS: Section[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    image: require('@/assets/sections/kitchen.png'),
    cols: 3,
    rows: 3,
    sentence:
      'I set a fork, a spoon and a knife beside the plate, filled a cup, put the pot and the pan on the stove, and washed up at the sink.',
    words: [
      { id: 'fork', word: 'fork', meaning: 'cái nĩa', example: 'Pass me the fork, please.', pronunciation: '/fɔːrk/' },
      { id: 'spoon', word: 'spoon', meaning: 'cái thìa', example: 'I eat soup with a spoon.', pronunciation: '/spuːn/' },
      { id: 'knife', word: 'knife', meaning: 'con dao', example: 'Cut the bread with a knife.', pronunciation: '/naɪf/' },
      { id: 'plate', word: 'plate', meaning: 'cái đĩa', example: 'Put the food on the plate.', pronunciation: '/pleɪt/' },
      { id: 'cup', word: 'cup', meaning: 'cái cốc', example: 'A cup of hot tea.', pronunciation: '/kʌp/' },
      { id: 'pot', word: 'pot', meaning: 'cái nồi', example: 'The soup is in the pot.', pronunciation: '/pɒt/' },
      { id: 'pan', word: 'pan', meaning: 'cái chảo', example: 'Fry the eggs in a pan.', pronunciation: '/pæn/' },
      { id: 'stove', word: 'stove', meaning: 'bếp', example: 'Turn off the stove.', pronunciation: '/stoʊv/' },
      { id: 'sink', word: 'sink', meaning: 'bồn rửa', example: 'Wash the dishes in the sink.', pronunciation: '/sɪŋk/' },
    ],
  },
  {
    id: 'beach',
    name: 'Beach',
    image: require('@/assets/sections/beach.png'),
    cols: 3,
    rows: 2,
    sentence:
      'Under the umbrella I sat on the warm sand in the sun, watching a crab run from a wave and picking up a shell.',
    words: [
      { id: 'sand', word: 'sand', meaning: 'cát', example: 'The sand is warm.', pronunciation: '/sænd/' },
      { id: 'wave', word: 'wave', meaning: 'sóng', example: 'A big wave hit the shore.', pronunciation: '/weɪv/' },
      { id: 'shell', word: 'shell', meaning: 'vỏ sò', example: 'I found a pretty shell.', pronunciation: '/ʃel/' },
      { id: 'sun', word: 'sun', meaning: 'mặt trời', example: 'The sun is very hot today.', pronunciation: '/sʌn/' },
      { id: 'crab', word: 'crab', meaning: 'con cua', example: 'A crab ran across the sand.', pronunciation: '/kræb/' },
      { id: 'umbrella', word: 'umbrella', meaning: 'cái ô', example: 'We sat under the umbrella.', pronunciation: '/ʌmˈbrelə/' },
    ],
  },
  {
    id: 'classroom',
    name: 'Classroom',
    image: require('@/assets/sections/classroom.png'),
    cols: 4,
    rows: 2,
    sentence:
      'I took a book, a pencil, a ruler and scissors from my backpack, sat on my chair, spun the globe, and watched the clock.',
    words: [
      { id: 'book', word: 'book', meaning: 'quyển sách', example: 'Open your book to page ten.', pronunciation: '/bʊk/' },
      { id: 'pencil', word: 'pencil', meaning: 'bút chì', example: 'Write with a pencil.', pronunciation: '/ˈpensəl/' },
      { id: 'chair', word: 'chair', meaning: 'cái ghế', example: 'Sit on the chair.', pronunciation: '/tʃeər/' },
      { id: 'clock', word: 'clock', meaning: 'đồng hồ', example: 'The clock says nine.', pronunciation: '/klɒk/' },
      { id: 'backpack', word: 'backpack', meaning: 'ba lô', example: 'My books are in my backpack.', pronunciation: '/ˈbækpæk/' },
      { id: 'ruler', word: 'ruler', meaning: 'cái thước', example: 'Draw a line with a ruler.', pronunciation: '/ˈruːlər/' },
      { id: 'globe', word: 'globe', meaning: 'quả địa cầu', example: 'Find Vietnam on the globe.', pronunciation: '/ɡloʊb/' },
      { id: 'scissors', word: 'scissors', meaning: 'cái kéo', example: 'Cut the paper with scissors.', pronunciation: '/ˈsɪzərz/' },
    ],
  },
];
