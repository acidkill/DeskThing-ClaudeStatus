// Generates two extra idle sprites for the Clawd mascot:
//   * idle_strawberry — Clawd holds a strawberry, takes bites, then beams
//   * idle_bubbles    — Clawd holds a wand, blows soap bubbles that drift up
// Output: assets-proprietary/clawd/idle_{strawberry,bubbles}.json
// Re-runnable; safe to overwrite.

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

writeFileSync(resolve(OUT_DIR, 'idle_strawberry.json'), JSON.stringify(strawberry, null, 2) + '\n');
writeFileSync(resolve(OUT_DIR, 'idle_bubbles.json'), JSON.stringify(bubbles, null, 2) + '\n');

// eslint-disable-next-line no-console
console.log(`wrote ${strawberry.frame_count}-frame strawberry + ${bubbles.frame_count}-frame bubbles to ${OUT_DIR}`);
