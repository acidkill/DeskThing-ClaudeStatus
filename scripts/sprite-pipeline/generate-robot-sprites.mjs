// generate-robot-sprites.mjs — Emit all 17 robot-mascot JSON sprites.
// Original 20×20 pixel art © DeskThing-ClawdMeter-app contributors, Apache-2.0.
// Anatomy reference: Foozle "Cute Platformer Robot" (CC0).
//
// Output: assets/mascot/*.json + updated _index.json
// Re-runnable; overwrites previous output.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BASE_PALETTE,
  baseGrid,
  cloneGrid,
  drawAt,
  parseGrid,
  withAntennaDim,
  withAntennaLeft,
  withAntennaRight,
  withBodyExpand,
  withBounceUp,
  withEyesClosed,
  withEyesLeft,
  withEyesRight,
  withEyesUp,
  withEyesWide,
  withOpenMouth,
  withSmile,
  withSquat,
  withSwayLeft,
  withSwayRight,
  withWink,
} from './robot-base.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', '..', 'assets', 'mascot');

const buildSprite = ({ filename, name, category, description, palette, frames }) => ({
  filename,
  name,
  category,
  description,
  palette,
  frame_count: frames.length,
  frames: frames.map(({ hold, build }) => ({ hold, grid: build() })),
});

// ─── IDLE category ───────────────────────────────────────────────────────────

const idleBreathe = buildSprite({
  filename: 'idle_breathe.html',
  name: 'idle breathe',
  category: 'Idle',
  description: 'Robot stands at ease; chassis subtly expands and contracts.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 480, build: () => cloneGrid(baseGrid) },
    { hold: 320, build: () => withBodyExpand(baseGrid) },
    { hold: 480, build: () => withBodyExpand(baseGrid) },
    { hold: 320, build: () => cloneGrid(baseGrid) },
    { hold: 480, build: () => cloneGrid(baseGrid) },
    { hold: 320, build: () => withBodyExpand(baseGrid) },
    { hold: 480, build: () => withBodyExpand(baseGrid) },
    { hold: 320, build: () => cloneGrid(baseGrid) },
  ],
});

const idleBlink = buildSprite({
  filename: 'idle_blink.html',
  name: 'idle blink',
  category: 'Idle',
  description: 'Robot stands still; eye-LEDs blink off momentarily.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 1200, build: () => cloneGrid(baseGrid) },
    { hold: 80,   build: () => withEyesClosed(baseGrid) },
    { hold: 80,   build: () => withEyesClosed(baseGrid) },
    { hold: 1600, build: () => cloneGrid(baseGrid) },
    { hold: 80,   build: () => withEyesClosed(baseGrid) },
    { hold: 80,   build: () => withEyesClosed(baseGrid) },
    { hold: 900,  build: () => cloneGrid(baseGrid) },
    { hold: 80,   build: () => withEyesClosed(baseGrid) },
  ],
});

const idleLookAround = buildSprite({
  filename: 'idle_look_around.html',
  name: 'idle look around',
  category: 'Idle',
  description: 'Eye-LEDs pan left, centre, right; antenna sways with curiosity.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 500, build: () => cloneGrid(baseGrid) },
    { hold: 300, build: () => withEyesLeft(baseGrid) },
    { hold: 600, build: () => withAntennaLeft(withEyesLeft(baseGrid)) },
    { hold: 300, build: () => withEyesLeft(baseGrid) },
    { hold: 200, build: () => cloneGrid(baseGrid) },
    { hold: 300, build: () => withEyesRight(baseGrid) },
    { hold: 600, build: () => withAntennaRight(withEyesRight(baseGrid)) },
    { hold: 300, build: () => withEyesRight(baseGrid) },
    { hold: 500, build: () => cloneGrid(baseGrid) },
  ],
});

// idle_strawberry → idle "power token" (battery icon)
const STRAWBERRY_PALETTE = [...BASE_PALETTE, '#ffffff'];
const TOKEN_FULL = ['.4.', '444', '.4.'];
const TOKEN_HALF = ['.4.', '4..', '...'];
const SPARK = ['5.5', '.5.', '5.5'];

const idleStrawberry = buildSprite({
  filename: 'idle_strawberry.html',
  name: 'idle strawberry',
  category: 'Idle',
  description: 'Robot absorbs a power token; antenna sparks brightly afterwards.',
  palette: STRAWBERRY_PALETTE,
  frames: [
    { hold: 600, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 11, 15, TOKEN_FULL); return g; } },
    { hold: 300, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 10, 13, TOKEN_FULL); return g; } },
    { hold: 220, build: () => { const g = withOpenMouth(baseGrid); drawAt(g, 9, 11, TOKEN_FULL); return g; } },
    { hold: 280, build: () => { const g = withOpenMouth(baseGrid); drawAt(g, 9, 11, TOKEN_HALF); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 9, 11, TOKEN_HALF); return g; } },
    { hold: 240, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 0, 8, SPARK); return g; } },
    { hold: 500, build: () => withSmile(baseGrid) },
    { hold: 400, build: () => cloneGrid(baseGrid) },
  ],
});

// idle_bubbles → status-ping particles
const BUBBLES_PALETTE = [...BASE_PALETTE, '#88c8e8', '#ffffff'];
const PING = ['.5.', '5.5', '.5.'];
const PING_BIG = ['.55.', '5..5', '5..5', '.55.'];
const PING_POP = ['6.6', '...', '6.6'];

const idleBubbles = buildSprite({
  filename: 'idle_bubbles.html',
  name: 'idle bubbles',
  category: 'Idle',
  description: 'Robot emits status-ping particles that float up and dissipate.',
  palette: BUBBLES_PALETTE,
  frames: [
    { hold: 500, build: () => cloneGrid(baseGrid) },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 8, 9, PING); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 6, 9, PING); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 4, 9, PING_BIG); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 2, 8, PING_BIG); return g; } },
    { hold: 160, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 1, 8, PING_POP); return g; } },
    { hold: 600, build: () => cloneGrid(baseGrid) },
  ],
});

// idle_reading → holographic data panel
const READING_PALETTE = [...BASE_PALETTE, '#3a2e22', '#f0e6d2'];
const PANEL_A = [
  '555555',
  '566656',
  '565556',
  '566656',
  '555555',
];
const PANEL_B = [
  '555555',
  '565556',
  '566656',
  '565556',
  '555555',
];

const idleReading = buildSprite({
  filename: 'idle_reading.html',
  name: 'idle reading',
  category: 'Idle',
  description: 'Robot studies a hovering data-panel; eyes scan as content scrolls.',
  palette: READING_PALETTE,
  frames: [
    { hold: 380, build: () => { const g = withEyesLeft(baseGrid); drawAt(g, 11, 13, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesRight(baseGrid); drawAt(g, 11, 13, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesLeft(baseGrid); drawAt(g, 11, 13, PANEL_B); return g; } },
    { hold: 380, build: () => { const g = withEyesRight(baseGrid); drawAt(g, 11, 13, PANEL_B); return g; } },
    { hold: 260, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 11, 13, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesLeft(baseGrid); drawAt(g, 11, 13, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesRight(baseGrid); drawAt(g, 11, 13, PANEL_B); return g; } },
  ],
});

// ─── EXPRESSIONS category ───────────────────────────────────────────────────

const expressionWink = buildSprite({
  filename: 'expression_wink.html',
  name: 'expression wink',
  category: 'Expressions',
  description: 'Single-eye playful wink with smile.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 600, build: () => cloneGrid(baseGrid) },
    { hold: 120, build: () => withWink(baseGrid) },
    { hold: 360, build: () => withSmile(withWink(baseGrid)) },
    { hold: 120, build: () => withWink(baseGrid) },
    { hold: 600, build: () => cloneGrid(baseGrid) },
    { hold: 120, build: () => withWink(baseGrid) },
    { hold: 360, build: () => withSmile(withWink(baseGrid)) },
    { hold: 120, build: () => withWink(baseGrid) },
  ],
});

const expressionSurprise = buildSprite({
  filename: 'expression_surprise.html',
  name: 'expression surprise',
  category: 'Expressions',
  description: 'Wide eye-LEDs + open mouth + antenna ping on surprise.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 600, build: () => cloneGrid(baseGrid) },
    { hold: 120, build: () => withEyesWide(withOpenMouth(baseGrid)) },
    { hold: 320, build: () => withEyesWide(withOpenMouth(withAntennaDim(baseGrid))) },
    { hold: 320, build: () => withEyesWide(withOpenMouth(baseGrid)) },
    { hold: 200, build: () => withOpenMouth(baseGrid) },
    { hold: 600, build: () => cloneGrid(baseGrid) },
  ],
});

const Z_PALETTE = [...BASE_PALETTE, '#aaaaaa'];
const Z_SMALL = ['5'];
const Z_MED = ['55'];
const Z_BIG = ['555'];

const expressionSleep = buildSprite({
  filename: 'expression_sleep.html',
  name: 'expression sleep',
  category: 'Expressions',
  description: 'Robot dozes; eye-LEDs dim, Z-particles drift up from the antenna.',
  palette: Z_PALETTE,
  frames: [
    { hold: 700, build: () => withEyesClosed(withAntennaDim(baseGrid)) },
    { hold: 220, build: () => { const g = withEyesClosed(withAntennaDim(baseGrid)); drawAt(g, 0, 12, Z_SMALL); return g; } },
    { hold: 220, build: () => { const g = withEyesClosed(withAntennaDim(baseGrid)); drawAt(g, 0, 13, Z_MED); return g; } },
    { hold: 240, build: () => { const g = withEyesClosed(withAntennaDim(baseGrid)); drawAt(g, 0, 14, Z_BIG); return g; } },
    { hold: 320, build: () => withEyesClosed(withAntennaDim(baseGrid)) },
    { hold: 700, build: () => withEyesClosed(withAntennaDim(baseGrid)) },
    { hold: 220, build: () => { const g = withEyesClosed(withAntennaDim(baseGrid)); drawAt(g, 0, 5, Z_SMALL); return g; } },
    { hold: 220, build: () => { const g = withEyesClosed(withAntennaDim(baseGrid)); drawAt(g, 0, 4, Z_MED); return g; } },
    { hold: 240, build: () => { const g = withEyesClosed(withAntennaDim(baseGrid)); drawAt(g, 0, 3, Z_BIG); return g; } },
    { hold: 800, build: () => withEyesClosed(withAntennaDim(baseGrid)) },
  ],
});

// ─── WORK category ──────────────────────────────────────────────────────────

const CODING_PALETTE = [
  ...BASE_PALETTE,
  '#5C8A5C', // 5 keyboard base
  '#9CB89C', // 6 key highlight
  '#FFFFFF', // 7 caret bright
];

const KEYBOARD = [
  '5555555555',
  '5666666665',
  '5555555555',
];

const SCREEN_LINE_A = ['7777'];
const SCREEN_LINE_B = ['77.7'];

const workCoding = buildSprite({
  filename: 'work_coding.html',
  name: 'work coding',
  category: 'Work',
  description: 'Robot taps a keyboard; face-screen pulses with code lines.',
  palette: CODING_PALETTE,
  frames: [
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 12, 5, KEYBOARD); drawAt(g, 6, 8, SCREEN_LINE_A); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 12, 5, KEYBOARD); drawAt(g, 6, 8, SCREEN_LINE_B); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 12, 5, KEYBOARD); drawAt(g, 6, 8, SCREEN_LINE_A); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 12, 5, KEYBOARD); drawAt(g, 6, 8, SCREEN_LINE_B); return g; } },
    { hold: 320, build: () => { const g = withSmile(baseGrid); drawAt(g, 12, 5, KEYBOARD); drawAt(g, 6, 8, SCREEN_LINE_A); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 12, 5, KEYBOARD); drawAt(g, 6, 8, SCREEN_LINE_B); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 12, 5, KEYBOARD); drawAt(g, 6, 8, SCREEN_LINE_A); return g; } },
    { hold: 480, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 12, 5, KEYBOARD); return g; } },
  ],
});

// work_blackboard
const BLACKBOARD_PALETTE = [
  ...BASE_PALETTE,
  '#1F3A26', // 5 board green
  '#F5F5E8', // 6 chalk white
  '#8B6A3A', // 7 frame brown
];

const BOARD_EMPTY = [
  '77777777777777',
  '75555555555557',
  '75555555555557',
  '75555555555557',
  '75555555555557',
  '77777777777777',
];

const BOARD_FMA = [
  '77777777777777',
  '75555555555557',
  '76555655566557',
  '76555655555557',
  '76555655566657',
  '77777777777777',
];

const BOARD_EMC = [
  '77777777777777',
  '75555555555557',
  '76665666555557',
  '76555655555557',
  '76665655565557',
  '77777777777777',
];

const compactRobot = () => parseGrid([
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '.......111111.......',
  '......11333311......',
  '......13233231......',
  '......13333331......',
  '......11333311......',
  '.......111111.......',
  '........1111........',
  '...11111111111111...',
  '...11111111111111...',
  '......11111111......',
  '......11111111......',
  '.......111111.......',
  '......222.222.......',
]);

const workBlackboard = buildSprite({
  filename: 'work_blackboard.html',
  name: 'work blackboard',
  category: 'Work',
  description: 'Robot writes physics formulas (F=ma, E=mc²) on a blackboard.',
  palette: BLACKBOARD_PALETTE,
  frames: [
    { hold: 500, build: () => { const g = compactRobot(); drawAt(g, 0, 3, BOARD_EMPTY); return g; } },
    { hold: 600, build: () => { const g = compactRobot(); drawAt(g, 0, 3, BOARD_FMA); return g; } },
    { hold: 400, build: () => { const g = compactRobot(); drawAt(g, 0, 3, BOARD_FMA); return g; } },
    { hold: 220, build: () => { const g = compactRobot(); drawAt(g, 0, 3, BOARD_EMPTY); return g; } },
    { hold: 600, build: () => { const g = compactRobot(); drawAt(g, 0, 3, BOARD_EMC); return g; } },
    { hold: 700, build: () => { const g = withSmile(compactRobot()); drawAt(g, 0, 3, BOARD_EMC); return g; } },
  ],
});

// ─── DANCE category ─────────────────────────────────────────────────────────

const danceBounce = buildSprite({
  filename: 'dance_bounce.html',
  name: 'dance bounce',
  category: 'Dance',
  description: 'Robot bounces up and down to the beat.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 180, build: () => cloneGrid(baseGrid) },
    { hold: 160, build: () => withBounceUp(baseGrid) },
    { hold: 160, build: () => withBounceUp(baseGrid) },
    { hold: 180, build: () => cloneGrid(baseGrid) },
    { hold: 180, build: () => withSquat(baseGrid) },
    { hold: 180, build: () => cloneGrid(baseGrid) },
    { hold: 160, build: () => withBounceUp(baseGrid) },
    { hold: 180, build: () => cloneGrid(baseGrid) },
  ],
});

const danceSway = buildSprite({
  filename: 'dance_sway.html',
  name: 'dance sway',
  category: 'Dance',
  description: 'Robot sways left and right, antenna following.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 280, build: () => withSwayLeft(withAntennaLeft(baseGrid)) },
    { hold: 240, build: () => cloneGrid(baseGrid) },
    { hold: 280, build: () => withSwayRight(withAntennaRight(baseGrid)) },
    { hold: 240, build: () => cloneGrid(baseGrid) },
    { hold: 280, build: () => withSwayLeft(withAntennaLeft(baseGrid)) },
    { hold: 240, build: () => cloneGrid(baseGrid) },
    { hold: 280, build: () => withSwayRight(withAntennaRight(baseGrid)) },
    { hold: 240, build: () => cloneGrid(baseGrid) },
  ],
});

const DJ_PALETTE = [...BASE_PALETTE, '#222222', '#FFB400'];
const HEADPHONES_LEFT = ['55', '55'];
const HEADPHONES_RIGHT = ['55', '55'];

const withHeadphones = (g) => {
  const out = cloneGrid(g);
  drawAt(out, 4, 4, HEADPHONES_LEFT);
  drawAt(out, 4, 14, HEADPHONES_RIGHT);
  out[3][4] = 5;
  out[3][15] = 5;
  return out;
};

const danceBounceDj = buildSprite({
  filename: 'dance_bounce_dj.html',
  name: 'dance bounce dj',
  category: 'Dance',
  description: 'Robot bounces with DJ headphones on.',
  palette: DJ_PALETTE,
  frames: [
    { hold: 180, build: () => withHeadphones(baseGrid) },
    { hold: 160, build: () => withBounceUp(withHeadphones(baseGrid)) },
    { hold: 180, build: () => withHeadphones(baseGrid) },
    { hold: 180, build: () => withSquat(withHeadphones(baseGrid)) },
    { hold: 180, build: () => withHeadphones(baseGrid) },
    { hold: 160, build: () => withBounceUp(withHeadphones(baseGrid)) },
    { hold: 180, build: () => withHeadphones(baseGrid) },
    { hold: 180, build: () => withSquat(withHeadphones(baseGrid)) },
  ],
});

const danceSwayDj = buildSprite({
  filename: 'dance_sway_dj.html',
  name: 'dance sway dj',
  category: 'Dance',
  description: 'Robot sways side-to-side with DJ headphones on.',
  palette: DJ_PALETTE,
  frames: [
    { hold: 280, build: () => withSwayLeft(withHeadphones(baseGrid)) },
    { hold: 240, build: () => withHeadphones(baseGrid) },
    { hold: 280, build: () => withSwayRight(withHeadphones(baseGrid)) },
    { hold: 240, build: () => withHeadphones(baseGrid) },
    { hold: 280, build: () => withSwayLeft(withHeadphones(baseGrid)) },
    { hold: 240, build: () => withHeadphones(baseGrid) },
  ],
});

const TURNTABLE = ['66666', '65556', '65556', '66666'];

const danceDjmix = buildSprite({
  filename: 'dance_djmix.html',
  name: 'dance djmix',
  category: 'Dance',
  description: 'Robot DJs at a turntable: bounces, sways, and scratches records.',
  palette: DJ_PALETTE,
  frames: [
    { hold: 180, build: () => { const g = withHeadphones(baseGrid); drawAt(g, 15, 0, TURNTABLE); drawAt(g, 15, 15, TURNTABLE); return g; } },
    { hold: 160, build: () => { const g = withBounceUp(withHeadphones(baseGrid)); drawAt(g, 15, 0, TURNTABLE); drawAt(g, 15, 15, TURNTABLE); return g; } },
    { hold: 180, build: () => { const g = withSwayLeft(withHeadphones(baseGrid)); drawAt(g, 15, 0, TURNTABLE); drawAt(g, 15, 15, TURNTABLE); return g; } },
    { hold: 160, build: () => { const g = withBounceUp(withHeadphones(baseGrid)); drawAt(g, 15, 0, TURNTABLE); drawAt(g, 15, 15, TURNTABLE); return g; } },
    { hold: 180, build: () => { const g = withSwayRight(withHeadphones(baseGrid)); drawAt(g, 15, 0, TURNTABLE); drawAt(g, 15, 15, TURNTABLE); return g; } },
    { hold: 160, build: () => { const g = withBounceUp(withHeadphones(baseGrid)); drawAt(g, 15, 0, TURNTABLE); drawAt(g, 15, 15, TURNTABLE); return g; } },
    { hold: 180, build: () => { const g = withHeadphones(baseGrid); drawAt(g, 15, 0, TURNTABLE); drawAt(g, 15, 15, TURNTABLE); return g; } },
    { hold: 180, build: () => { const g = withSquat(withHeadphones(baseGrid)); drawAt(g, 15, 0, TURNTABLE); drawAt(g, 15, 15, TURNTABLE); return g; } },
  ],
});

// ─── ARCHIVE (work_think kept for parity) ───────────────────────────────────

const workThink = buildSprite({
  filename: 'work_think.html',
  name: 'work think',
  category: 'Archive',
  description: 'Robot pauses to compute; antenna pulses slowly. Archived sprite.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 600, build: () => cloneGrid(baseGrid) },
    { hold: 400, build: () => withAntennaDim(baseGrid) },
    { hold: 600, build: () => cloneGrid(baseGrid) },
    { hold: 300, build: () => withEyesUp(baseGrid) },
    { hold: 600, build: () => withEyesUp(baseGrid) },
    { hold: 300, build: () => cloneGrid(baseGrid) },
    { hold: 400, build: () => withAntennaDim(baseGrid) },
    { hold: 600, build: () => cloneGrid(baseGrid) },
  ],
});

// ─── Emit all ────────────────────────────────────────────────────────────────

const ALL = [
  idleBreathe,
  idleBlink,
  idleLookAround,
  idleStrawberry,
  idleBubbles,
  idleReading,
  expressionWink,
  expressionSurprise,
  expressionSleep,
  workCoding,
  workBlackboard,
  danceBounce,
  danceSway,
  danceBounceDj,
  danceSwayDj,
  danceDjmix,
  workThink,
];

for (const sprite of ALL) {
  const outPath = resolve(OUT_DIR, sprite.filename.replace(/\.html$/, '.json'));
  writeFileSync(outPath, JSON.stringify(sprite, null, 2) + '\n');
}

// Rebuild _index.json (preserves the existing schema in assets/mascot/_index.json)
const indexEntries = ALL.map((s) => ({
  filename: s.filename,
  name: s.name,
  category: s.category,
  frame_count: s.frame_count,
  palette_size: s.palette.length,
}));
writeFileSync(resolve(OUT_DIR, '_index.json'), JSON.stringify(indexEntries, null, 2) + '\n');

// eslint-disable-next-line no-console
console.log(`Wrote ${ALL.length} robot sprites + _index.json to ${OUT_DIR}`);
for (const s of ALL) {
  // eslint-disable-next-line no-console
  console.log(`  ${s.category.padEnd(12)} ${s.filename.padEnd(28)} ${s.frame_count} frames, palette ${s.palette.length}`);
}
