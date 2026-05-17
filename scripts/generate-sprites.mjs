// Generates custom Clawd sprites that aren't part of the upstream Clawdmeter
// pack. All sprites share a Clawd base pose plus overlay primitives so the
// pixel-art stays consistent across animations.
//
// Outputs (all under assets-proprietary/clawd/):
//   * idle_strawberry  — Clawd nibbles a strawberry, then beams happily
//   * idle_bubbles     — Clawd holds a wand and blows soap bubbles
//   * idle_reading     — Clawd reads an open book, page turns occasionally
//   * work_blackboard  — Clawd writes physics formulas on a blackboard
//
// Re-runnable; safe to overwrite existing files. Run with:
//   node scripts/generate-sprites.mjs

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'assets-proprietary', 'clawd');

// Base Clawd pose copied from idle_breathe frame 0 — same body, eyes at
// (6,7)/(6,13) and (7,7)/(7,12), legs at rows 14–16.
const BASE = [
  '....................',
  '....................',
  '....................',
  '....................',
  '.....11111111111....',
  '.....11111111111....',
  '.....11211111211....',
  '...111121111121111..',
  '...111111111111111..',
  '...111111111111111..',
  '...1.11111111111.1..',
  '.....11111111111....',
  '.....11111111111....',
  '.....11111111111....',
  '.....1..1...1..1....',
  '.....1..1...1..1....',
  '.....1..1...1..1....',
  '....................',
  '....................',
  '....................',
];

const parseGrid = (lines) =>
  lines.map((line) => {
    if (line.length !== 20) throw new Error(`row width ${line.length}, expected 20: "${line}"`);
    return line.split('').map((ch) => (ch === '.' ? 0 : Number(ch)));
  });

const cloneGrid = (g) => g.map((row) => row.slice());

const drawAt = (grid, r0, c0, shape) => {
  for (let r = 0; r < shape.length; r += 1) {
    const row = shape[r];
    for (let c = 0; c < row.length; c += 1) {
      const ch = row[c];
      if (ch === '.') continue;
      const rr = r0 + r;
      const cc = c0 + c;
      if (rr >= 0 && rr < 20 && cc >= 0 && cc < 20) {
        grid[rr][cc] = Number(ch);
      }
    }
  }
};

// Open mouth (eating) — 3 dark pixels in the lower face.
const withOpenMouth = (g) => {
  const out = cloneGrid(g);
  out[11][9] = 2;
  out[11][10] = 2;
  out[11][11] = 2;
  out[12][10] = 2;
  return out;
};

// Soft smile — gentle dark arc.
const withSmile = (g) => {
  const out = cloneGrid(g);
  out[12][8] = 2;
  out[12][9] = 2;
  out[12][10] = 2;
  out[12][11] = 2;
  out[12][12] = 2;
  return out;
};

// Closed/curved-eye happy expression — replaces the dot eyes with arcs.
const withHappyEyes = (g) => {
  const out = cloneGrid(g);
  out[6][7] = 1;
  out[6][13] = 1;
  out[7][7] = 1;
  out[7][12] = 1;
  out[6][6] = 2;
  out[6][7] = 2;
  out[6][12] = 2;
  out[6][13] = 2;
  return out;
};

// ─── idle_strawberry ─────────────────────────────────────────────────────────
// Palette: 0 transparent, 1 body, 2 dark, 3 red, 4 leaf green, 5 seed white
const STRAWBERRY_PALETTE = ['transparent', '#CD7F6A', '#0f0f0f', '#d63846', '#4ea84a', '#ffffff'];

const STRAWBERRY_FULL = ['.4..', '4434', '3333', '3535', '.33.'];
const STRAWBERRY_BITE = ['.4..', '4434', '333.', '353.', '.33.'];
const STRAWBERRY_HALF = ['.4..', '4.4.', '33..', '3...', '....'];
const STRAWBERRY_STEM = ['.4..', '.44.', '....', '....', '....'];
const STRAWBERRY_CRUMB = ['...', '.3.', '...'];

const baseGrid = parseGrid(BASE);

const buildStrawberryFrames = () => [
  { hold: 700, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 8, 15, STRAWBERRY_FULL); return g; } },
  { hold: 180, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 8, 12, STRAWBERRY_FULL); return g; } },
  { hold: 220, build: () => { const g = withOpenMouth(baseGrid); drawAt(g, 9, 11, STRAWBERRY_FULL); return g; } },
  { hold: 320, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 9, 11, STRAWBERRY_BITE); return g; } },
  { hold: 220, build: () => { const g = withOpenMouth(baseGrid); drawAt(g, 9, 11, STRAWBERRY_HALF); return g; } },
  { hold: 280, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 9, 11, STRAWBERRY_STEM); return g; } },
  { hold: 600, build: () => withSmile(withHappyEyes(baseGrid)) },
  { hold: 350, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 13, 9, STRAWBERRY_CRUMB); return g; } },
];

// ─── idle_bubbles ────────────────────────────────────────────────────────────
// Palette: 0 transparent, 1 body, 2 dark, 3 bubble blue, 4 shine white, 5 wand brown
const BUBBLES_PALETTE = ['transparent', '#CD7F6A', '#0f0f0f', '#88c8e8', '#ffffff', '#c8a878'];

const WAND_LOOP = ['.3.', '3.3', '.3.', '.5.'];
const WAND_STICK = ['.3.', '.3.', '.5.', '.5.'];
const TINY_BUBBLE = ['.3.', '3.3', '.3.'];
const BIG_BUBBLE = ['.33.', '3..3', '3.43', '.33.'];
const SMALL_BUBBLE = ['33', '34'];
const POPPED = ['.3.', '3.3', '.3.'];
const POP_SPARKS = ['3.3', '...', '3.3'];

const buildBubblesFrames = () => [
  { hold: 500, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 8, 16, WAND_STICK); return g; } },
  { hold: 220, build: () => {
    const g = cloneGrid(baseGrid);
    drawAt(g, 8, 16, WAND_LOOP);
    drawAt(g, 7, 16, SMALL_BUBBLE);
    return g;
  } },
  { hold: 220, build: () => {
    const g = cloneGrid(baseGrid);
    drawAt(g, 9, 16, WAND_LOOP);
    drawAt(g, 5, 16, TINY_BUBBLE);
    return g;
  } },
  { hold: 240, build: () => {
    const g = cloneGrid(baseGrid);
    drawAt(g, 9, 16, WAND_STICK);
    drawAt(g, 3, 15, BIG_BUBBLE);
    return g;
  } },
  { hold: 260, build: () => {
    const g = cloneGrid(baseGrid);
    drawAt(g, 8, 16, WAND_LOOP);
    drawAt(g, 7, 17, SMALL_BUBBLE);
    drawAt(g, 1, 13, BIG_BUBBLE);
    return g;
  } },
  { hold: 260, build: () => {
    const g = cloneGrid(baseGrid);
    drawAt(g, 8, 16, WAND_LOOP);
    drawAt(g, 5, 16, TINY_BUBBLE);
    drawAt(g, 0, 10, POPPED);
    return g;
  } },
  { hold: 180, build: () => {
    const g = cloneGrid(baseGrid);
    drawAt(g, 9, 16, WAND_STICK);
    drawAt(g, 3, 14, TINY_BUBBLE);
    drawAt(g, 0, 8, POP_SPARKS);
    return g;
  } },
  { hold: 600, build: () => {
    const g = withSmile(baseGrid);
    drawAt(g, 9, 16, WAND_STICK);
    return g;
  } },
];

// ─── idle_reading ────────────────────────────────────────────────────────────
// Palette: 0 transparent, 1 body, 2 dark, 3 page cream, 4 text line, 5 cover brown
const READING_PALETTE = ['transparent', '#CD7F6A', '#0f0f0f', '#f0e6d2', '#3a2e22', '#6b3e2a'];

// Closed-mouth gaze + glance direction. Replaces eyes at (6,7) / (6,13) /
// (7,7) / (7,12). Use these to animate "reading" (eyes track left/right).
const withEyesLeft = (g) => {
  const out = cloneGrid(g);
  out[6][7] = 1; out[6][13] = 1; out[7][7] = 1; out[7][12] = 1;
  out[6][6] = 2; out[7][6] = 2; out[6][11] = 2; out[7][11] = 2;
  return out;
};

const withEyesRight = (g) => {
  const out = cloneGrid(g);
  out[6][7] = 1; out[6][13] = 1; out[7][7] = 1; out[7][12] = 1;
  out[6][8] = 2; out[7][8] = 2; out[6][14] = 2; out[7][14] = 2;
  return out;
};

// Open book (two pages with text lines), wider than tall.
// 10 cols × 6 rows. Drawn at (r0, c0) where the book's top-left corner lands.
const BOOK_OPEN_A = [
  '5555555555',
  '5333335333',
  '5344335433',
  '5333335333',
  '5344335433',
  '5555555555',
];
const BOOK_OPEN_B = [
  '5555555555',
  '5333335333',
  '5343335344',
  '5344435334',
  '5333335344',
  '5555555555',
];
const BOOK_TURNING = [
  '5555555555',
  '5333344443',
  '5333334443',
  '5333344443',
  '5333334443',
  '5555555555',
];
const BOOK_TURNED = [
  '5555555555',
  '5333335333',
  '5333345334',
  '5333335344',
  '5333345334',
  '5555555555',
];

const buildReadingFrames = () => [
  // F0 — open book, eyes left (start of line)
  { hold: 380, build: () => {
    const g = withEyesLeft(baseGrid);
    drawAt(g, 10, 5, BOOK_OPEN_A);
    return g;
  } },
  // F1 — eyes scan right (mid-line)
  { hold: 380, build: () => {
    const g = withEyesRight(baseGrid);
    drawAt(g, 10, 5, BOOK_OPEN_A);
    return g;
  } },
  // F2 — eyes back to left (next line)
  { hold: 380, build: () => {
    const g = withEyesLeft(baseGrid);
    drawAt(g, 10, 5, BOOK_OPEN_B);
    return g;
  } },
  // F3 — eyes right again
  { hold: 380, build: () => {
    const g = withEyesRight(baseGrid);
    drawAt(g, 10, 5, BOOK_OPEN_B);
    return g;
  } },
  // F4 — page turning (look down at the page)
  { hold: 220, build: () => {
    const g = cloneGrid(baseGrid);
    drawAt(g, 10, 5, BOOK_TURNING);
    return g;
  } },
  // F5 — page turned, fresh page
  { hold: 280, build: () => {
    const g = withEyesLeft(baseGrid);
    drawAt(g, 10, 5, BOOK_TURNED);
    return g;
  } },
  // F6 — start reading new page
  { hold: 400, build: () => {
    const g = withEyesLeft(baseGrid);
    drawAt(g, 10, 5, BOOK_OPEN_A);
    return g;
  } },
];

// ─── work_blackboard ────────────────────────────────────────────────────────
// Palette: 0 transparent, 1 body, 2 dark, 3 board green, 4 chalk white,
//          5 wood frame, 6 chalk in hand (white)
const BLACKBOARD_PALETTE = [
  'transparent',
  '#CD7F6A',
  '#0f0f0f',
  '#1f3a26',
  '#f5f5e8',
  '#8b6a3a',
  '#ffffff',
];

// Compact blackboard with a formula area. 17 cols × 7 rows, drawn at c0=2 so
// it sits at grid cols 2–18, leaving symmetric cols 0,1,19 transparent. The
// 5s form a 1-cell-thick wood frame; the 3s are the chalkboard surface; the
// 4s are chalk marks rendered per frame.
//
// Interior is 15 cols wide (grid cols 3–17) × 5 rows (grid rows 1–5), giving
// 5 rows × 15 cols = 75 cells for chalk. Glyphs are 3-cells wide with 1-cell
// gaps, so e.g. "F=ma" = 3+1+3+1+3+1+3 = 15 cols (fits exactly).
const BLACKBOARD_EMPTY = [
  '55555555555555555',
  '53333333333333335',
  '53333333333333335',
  '53333333333333335',
  '53333333333333335',
  '53333333333333335',
  '55555555555555555',
];

// "F=ma" — written across rows 2–4 (out of the 5-row interior, rows 1–5):
//   F (cols 3–5)  = (cols 7–9)  m (cols 11–13)  a (cols 15–17)
// All glyphs use 3×3 cells.
const BLACKBOARD_FMA = [
  '55555555555555555',
  '53333333333333335',
  '53444333444334445',
  '53433334434433435',
  '53433334434334445',
  '53333333333333335',
  '55555555555555555',
];

// "E=mc²" — E (3–5), = (7–9), m (11–13), c (15–17 row 3), ² (col 17 row 2)
const BLACKBOARD_EMC = [
  '55555555555555555',
  '53333333333333345',
  '53444333444333445',
  '53443334434334335',
  '53433334434334445',
  '53444333333333335',
  '55555555555555555',
];

// Sine wave + delta triangle (Δ) — abstract physics scribble
const BLACKBOARD_WAVE = [
  '55555555555555555',
  '53334333333334335',
  '53343433333344345',
  '53333343333343435',
  '53333343333434345',
  '53333344444344445',
  '55555555555555555',
];

// Mid-erase smudge — chalk dust scattered, content fading
const BLACKBOARD_ERASE = [
  '55555555555555555',
  '53343333333343335',
  '53333334333334335',
  '53333333333333335',
  '53334333343333335',
  '53333333333333335',
  '55555555555555555',
];

// Compact Clawd: shifted down 4 rows so the head clears the blackboard. Uses
// a "short" body (head + 2 rows of body + arms + tiny legs) so everything
// fits in rows 8–19.
const compactClawd = () => parseGrid([
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '.....11111111111....',
  '.....11211111211....',
  '...111121111121111..',
  '...111111111111111..',
  '...1.11111111111.1..',
  '.....11111111111....',
  '.....11111111111....',
  '.....11111111111....',
  '.....1..1...1..1....',
  '.....1..1...1..1....',
  '.....1..1...1..1....',
  '....................',
]);

// Chalk highlight in the hand on the writing side (right hand, row 12 col 17).
const withChalk = (g) => {
  const out = cloneGrid(g);
  out[12][17] = 6;
  return out;
};

const buildBlackboardFrames = () => {
  const base = compactClawd();
  return [
    // F0 — empty board, Clawd standing with chalk
    { hold: 500, build: () => {
      const g = withChalk(base);
      drawAt(g, 0, 2, BLACKBOARD_EMPTY);
      return g;
    } },
    // F1 — writing F=ma
    { hold: 600, build: () => {
      const g = withChalk(base);
      drawAt(g, 0, 2, BLACKBOARD_FMA);
      return g;
    } },
    // F2 — still F=ma, eyes scan (no chalk overlay - hand "rests")
    { hold: 400, build: () => {
      const g = cloneGrid(base);
      drawAt(g, 0, 2, BLACKBOARD_FMA);
      return g;
    } },
    // F3 — erase smudge mid-state
    { hold: 220, build: () => {
      const g = withChalk(base);
      drawAt(g, 0, 2, BLACKBOARD_ERASE);
      return g;
    } },
    // F4 — fresh board, chalk poised
    { hold: 260, build: () => {
      const g = withChalk(base);
      drawAt(g, 0, 2, BLACKBOARD_EMPTY);
      return g;
    } },
    // F5 — E=mc²
    { hold: 600, build: () => {
      const g = withChalk(base);
      drawAt(g, 0, 2, BLACKBOARD_EMC);
      return g;
    } },
    // F6 — wave + delta (abstract physics)
    { hold: 500, build: () => {
      const g = withChalk(base);
      drawAt(g, 0, 2, BLACKBOARD_WAVE);
      return g;
    } },
    // F7 — admiring the work, no chalk
    { hold: 700, build: () => {
      const g = withSmile(base);
      drawAt(g, 0, 2, BLACKBOARD_WAVE);
      return g;
    } },
  ];
};

// ─── Emit JSON ───────────────────────────────────────────────────────────────

const buildSprite = ({ filename, name, category, description, palette, frames }) => ({
  filename,
  name,
  category,
  description,
  palette,
  frame_count: frames.length,
  frames: frames.map(({ hold, build }) => ({ hold, grid: build() })),
});

const strawberry = buildSprite({
  filename: 'idle_strawberry.html',
  name: 'idle strawberry',
  category: 'Idle',
  description: 'Clawd nibbles a strawberry: holds, bites, finishes, beams happily.',
  palette: STRAWBERRY_PALETTE,
  frames: buildStrawberryFrames(),
});

const bubbles = buildSprite({
  filename: 'idle_bubbles.html',
  name: 'idle bubbles',
  category: 'Idle',
  description: 'Clawd blows soap bubbles with a wand; bubbles drift up and pop.',
  palette: BUBBLES_PALETTE,
  frames: buildBubblesFrames(),
});

const reading = buildSprite({
  filename: 'idle_reading.html',
  name: 'idle reading',
  category: 'Idle',
  description: 'Clawd reads an open book; eyes scan left-to-right and pages turn occasionally.',
  palette: READING_PALETTE,
  frames: buildReadingFrames(),
});

const blackboard = buildSprite({
  filename: 'work_blackboard.html',
  name: 'work blackboard',
  category: 'Work',
  description: 'Clawd writes physics formulas (F=ma, E=mc², wave + delta) on a blackboard.',
  palette: BLACKBOARD_PALETTE,
  frames: buildBlackboardFrames(),
});

writeFileSync(resolve(OUT_DIR, 'idle_strawberry.json'), JSON.stringify(strawberry, null, 2) + '\n');
writeFileSync(resolve(OUT_DIR, 'idle_bubbles.json'), JSON.stringify(bubbles, null, 2) + '\n');
writeFileSync(resolve(OUT_DIR, 'idle_reading.json'), JSON.stringify(reading, null, 2) + '\n');
writeFileSync(resolve(OUT_DIR, 'work_blackboard.json'), JSON.stringify(blackboard, null, 2) + '\n');

// eslint-disable-next-line no-console
console.log(
  `wrote ${strawberry.frame_count}-frame strawberry, ${bubbles.frame_count}-frame bubbles, ` +
  `${reading.frame_count}-frame reading, ${blackboard.frame_count}-frame blackboard to ${OUT_DIR}`,
);
