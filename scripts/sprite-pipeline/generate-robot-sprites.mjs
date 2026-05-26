// generate-robot-sprites.mjs — Emit all 17 robot-mascot JSON sprites.
// Original 20×20 pixel art © DeskThing-ClaudeStatus contributors, Apache-2.0.
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
  withArmsBehind,
  withBodyExpand,
  withBounceUp,
  withEyesClosed,
  withEyesLeft,
  withEyesRight,
  withEyesUp,
  withEyesWide,
  withLeftFootUp,
  withOpenMouth,
  withRightArmAtFace,
  withRightArmScratch,
  withRightArmUp,
  withRightFootUp,
  withShiftLeft1,
  withShiftRight1,
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
  description: 'Robot breathes; chest expands and legs shift weight between breaths.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 480, build: () => cloneGrid(baseGrid) },
    { hold: 320, build: () => withBodyExpand(baseGrid) },
    { hold: 480, build: () => withBodyExpand(baseGrid) },
    { hold: 320, build: () => cloneGrid(baseGrid) },
    { hold: 240, build: () => withLeftFootUp(baseGrid) },     // weight shift
    { hold: 240, build: () => cloneGrid(baseGrid) },
    { hold: 320, build: () => withBodyExpand(baseGrid) },
    { hold: 480, build: () => withBodyExpand(baseGrid) },
    { hold: 320, build: () => cloneGrid(baseGrid) },
    { hold: 240, build: () => withRightFootUp(baseGrid) },    // weight shift other side
    { hold: 240, build: () => cloneGrid(baseGrid) },
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
  description: 'Robot spots a power token, reaches out, picks it up, eats it; antenna sparks.',
  palette: STRAWBERRY_PALETTE,
  frames: [
    // Token visible at distance — arm starts to reach
    { hold: 400, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 11, 15, TOKEN_FULL); return g; } },
    { hold: 280, build: () => { const g = withRightArmUp(baseGrid); drawAt(g, 11, 15, TOKEN_FULL); return g; } },
    // Arm grabs token (arm up, token now beside hand)
    { hold: 220, build: () => { const g = withRightArmUp(baseGrid); drawAt(g, 8, 14, TOKEN_FULL); return g; } },
    // Arm brings token to mouth (arm at face, token at mouth level)
    { hold: 220, build: () => { const g = withRightArmAtFace(baseGrid); drawAt(g, 6, 13, TOKEN_FULL); return g; } },
    // Eat: open mouth, token disappears half-way
    { hold: 220, build: () => { const g = withOpenMouth(withRightArmAtFace(baseGrid)); drawAt(g, 6, 13, TOKEN_HALF); return g; } },
    { hold: 220, build: () => withOpenMouth(withRightArmAtFace(baseGrid)) },
    // Arm lowers, smile
    { hold: 240, build: () => withRightArmUp(baseGrid) },
    { hold: 240, build: () => withSmile(baseGrid) },
    // Antenna sparks
    { hold: 240, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 0, 8, SPARK); return g; } },
    { hold: 500, build: () => withSmile(baseGrid) },
    { hold: 400, build: () => cloneGrid(baseGrid) },
  ],
});

// idle_bubbles → status-ping particles  ← FIXED: arm moves to mouth before blowing
const BUBBLES_PALETTE = [...BASE_PALETTE, '#88c8e8', '#ffffff'];
const PING = ['.5.', '5.5', '.5.'];
const PING_BIG = ['.55.', '5..5', '5..5', '.55.'];
const PING_POP = ['6.6', '...', '6.6'];

const idleBubbles = buildSprite({
  filename: 'idle_bubbles.html',
  name: 'idle bubbles',
  category: 'Idle',
  description: 'Robot raises hand to mouth and blows status-ping bubbles that float up.',
  palette: BUBBLES_PALETTE,
  frames: [
    { hold: 400, build: () => cloneGrid(baseGrid) },
    // Arm raises toward face
    { hold: 220, build: () => withRightArmUp(baseGrid) },
    { hold: 220, build: () => withRightArmAtFace(baseGrid) },
    // Puff: open mouth, arm at face
    { hold: 280, build: () => withOpenMouth(withRightArmAtFace(baseGrid)) },
    // First bubble appears near mouth/hand
    { hold: 220, build: () => { const g = withRightArmAtFace(baseGrid); drawAt(g, 8, 12, PING); return g; } },
    // Bubble floats up
    { hold: 220, build: () => { const g = withRightArmAtFace(baseGrid); drawAt(g, 5, 11, PING); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 3, 10, PING_BIG); return g; } },
    { hold: 220, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 1, 9, PING_BIG); return g; } },
    { hold: 160, build: () => { const g = cloneGrid(baseGrid); drawAt(g, 0, 9, PING_POP); return g; } },
    { hold: 500, build: () => cloneGrid(baseGrid) },
  ],
});

// idle_reading → holographic data panel  ← IMPROVED: right arm holds/points at panel
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
  description: 'Robot holds up a holographic data panel and scans it with its eyes.',
  palette: READING_PALETTE,
  frames: [
    // Arm raises to hold panel
    { hold: 300, build: () => { const g = withRightArmUp(baseGrid); drawAt(g, 6, 14, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesLeft(withRightArmUp(baseGrid)); drawAt(g, 6, 14, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesRight(withRightArmUp(baseGrid)); drawAt(g, 6, 14, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesLeft(withRightArmUp(baseGrid)); drawAt(g, 6, 14, PANEL_B); return g; } },
    { hold: 380, build: () => { const g = withEyesRight(withRightArmUp(baseGrid)); drawAt(g, 6, 14, PANEL_B); return g; } },
    { hold: 260, build: () => { const g = withRightArmUp(baseGrid); drawAt(g, 6, 14, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesLeft(withRightArmUp(baseGrid)); drawAt(g, 6, 14, PANEL_A); return g; } },
    { hold: 380, build: () => { const g = withEyesRight(withRightArmUp(baseGrid)); drawAt(g, 6, 14, PANEL_B); return g; } },
    // Lower arm and blink — reading break
    { hold: 300, build: () => cloneGrid(baseGrid) },
    { hold: 80,  build: () => withEyesClosed(baseGrid) },
    { hold: 80,  build: () => withEyesClosed(baseGrid) },
    { hold: 300, build: () => cloneGrid(baseGrid) },
  ],
});

// ─── NEW idle animations ──────────────────────────────────────────────────────

// idle_scratch_head — robot scratches head then has a lightbulb moment
const SCRATCH_PALETTE = [...BASE_PALETTE, '#FFD700']; // 5 = gold for bulb
const BULB = ['.5.', '555', '555', '.5.']; // small lightbulb shape
const BULB_GLOW = ['.5.', '565', '565', '.5.']; // brighter (5=gold, 6 unused → just brighter gold)
const SCRATCH_MARK = ['2']; // tiny scratch mark pixel near head

const idleScratchHead = buildSprite({
  filename: 'idle_scratch_head.html',
  name: 'idle scratch head',
  category: 'Idle',
  description: 'Robot scratches its head, then gets a lightbulb moment.',
  palette: SCRATCH_PALETTE,
  frames: [
    { hold: 500, build: () => cloneGrid(baseGrid) },
    // Arm starts raising
    { hold: 280, build: () => withRightArmUp(baseGrid) },
    // Arm at head — scratch
    { hold: 180, build: () => { const g = withRightArmScratch(baseGrid); drawAt(g, 2, 11, SCRATCH_MARK); return g; } },
    { hold: 120, build: () => withRightArmScratch(withEyesUp(baseGrid)) },
    { hold: 180, build: () => { const g = withRightArmScratch(baseGrid); drawAt(g, 2, 11, SCRATCH_MARK); return g; } },
    { hold: 120, build: () => withRightArmScratch(withEyesUp(baseGrid)) },
    { hold: 180, build: () => { const g = withRightArmScratch(baseGrid); drawAt(g, 2, 11, SCRATCH_MARK); return g; } },
    // Arm lowers
    { hold: 280, build: () => withRightArmUp(baseGrid) },
    { hold: 300, build: () => cloneGrid(baseGrid) },
    // Lightbulb appears above head (right of antenna)
    { hold: 200, build: () => { const g = withEyesUp(baseGrid); drawAt(g, 0, 12, BULB); return g; } },
    { hold: 400, build: () => { const g = withEyesWide(withSmile(baseGrid)); drawAt(g, 0, 12, BULB); return g; } },
    { hold: 400, build: () => { const g = withSmile(baseGrid); drawAt(g, 0, 12, BULB); return g; } },
    // Lightbulb fades
    { hold: 200, build: () => withSmile(baseGrid) },
    { hold: 600, build: () => cloneGrid(baseGrid) },
  ],
});

// idle_walk — robot folds arms behind back and strolls left then right
const idleWalk = buildSprite({
  filename: 'idle_walk.html',
  name: 'idle walk',
  category: 'Idle',
  description: 'Robot strolls left and right with arms clasped behind its back.',
  palette: BASE_PALETTE,
  frames: [
    { hold: 300, build: () => withArmsBehind(baseGrid) },
    // Walk right: shift right + alternating feet
    { hold: 220, build: () => withShiftRight1(withLeftFootUp(withArmsBehind(baseGrid))) },
    { hold: 220, build: () => withShiftRight1(withShiftRight1(withArmsBehind(baseGrid))) },
    { hold: 220, build: () => withShiftRight1(withRightFootUp(withArmsBehind(baseGrid))) },
    { hold: 280, build: () => withArmsBehind(baseGrid) },
    // Walk left: shift left + alternating feet
    { hold: 220, build: () => withShiftLeft1(withRightFootUp(withArmsBehind(baseGrid))) },
    { hold: 220, build: () => withShiftLeft1(withShiftLeft1(withArmsBehind(baseGrid))) },
    { hold: 220, build: () => withShiftLeft1(withLeftFootUp(withArmsBehind(baseGrid))) },
  ],
});

// idle_jump_rope — robot pulls out a jump rope and skips with it
const ROPE_PALETTE = [...BASE_PALETTE, '#C8A86B']; // 5 = rope straw-yellow
const ROPE_ARC = ['....55555555555.....'];          // rope overhead (1 row wide)
const ROPE_LOW  = ['......5555555.......'];          // rope passing under feet
const HANDLE_R  = ['5', '5'];                        // rope handle in right hand

const idleJumpRope = buildSprite({
  filename: 'idle_jump_rope.html',
  name: 'idle jump rope',
  category: 'Idle',
  description: 'Bored robot produces a jump rope and starts skipping.',
  palette: ROPE_PALETTE,
  frames: [
    { hold: 400, build: () => cloneGrid(baseGrid) },
    // Pull rope from behind — arms raise with handles
    { hold: 300, build: () => withRightArmUp(baseGrid) },
    { hold: 300, build: () => {
        const g = withRightArmUp(baseGrid);
        drawAt(g, 6, 14, HANDLE_R);   // rope handle in raised right hand
        return g;
    }},
    // Rope overhead — robot bounces up
    { hold: 160, build: () => {
        const g = withBounceUp(withRightArmUp(baseGrid));
        drawAt(g, 0, 0, ROPE_ARC);
        drawAt(g, 6, 14, HANDLE_R);
        return g;
    }},
    // Rope swings under feet — robot still up
    { hold: 160, build: () => {
        const g = withBounceUp(withRightArmUp(baseGrid));
        drawAt(g, 19, 0, ROPE_LOW);
        drawAt(g, 6, 14, HANDLE_R);
        return g;
    }},
    // Land — squat
    { hold: 160, build: () => {
        const g = withSquat(withRightArmUp(baseGrid));
        drawAt(g, 6, 14, HANDLE_R);
        return g;
    }},
    // Second jump — rope overhead
    { hold: 160, build: () => {
        const g = withBounceUp(withRightArmUp(baseGrid));
        drawAt(g, 0, 0, ROPE_ARC);
        drawAt(g, 6, 14, HANDLE_R);
        return g;
    }},
    { hold: 160, build: () => {
        const g = withBounceUp(withRightArmUp(baseGrid));
        drawAt(g, 19, 0, ROPE_LOW);
        drawAt(g, 6, 14, HANDLE_R);
        return g;
    }},
    // Land + smile (it's fun!)
    { hold: 180, build: () => {
        const g = withSquat(withSmile(withRightArmUp(baseGrid)));
        drawAt(g, 6, 14, HANDLE_R);
        return g;
    }},
    // Put rope away — arm lowers
    { hold: 300, build: () => withRightArmUp(baseGrid) },
    { hold: 400, build: () => withSmile(baseGrid) },
    { hold: 500, build: () => cloneGrid(baseGrid) },
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

// work_blackboard → REPLACED by work_wand: magic wand wave + sparkles
const WAND_PALETTE = [
  ...BASE_PALETTE,
  '#FFD700', // 5 gold/star
  '#FFFFFF', // 6 white sparkle
];
const WAND_STICK = ['1', '1', '1'];  // 3-px orange handle
const STAR_TIP   = ['656', '666', '656'];  // 3×3 gold+white star burst
const SPARK_CROSS = ['.5.', '555', '.5.']; // cross sparkle
const SPARK_SCATTER = ['5.5', '.5.', '5.5']; // diagonal scatter
const SPARK_SINGLE = ['5'];

// Right arm extended + wand pointing up-right (arm along col 14, wand at col 15-16 rows 3-5)
const withWandArmUp = (g) => {
  const out = withRightArmUp(g);
  drawAt(out, 3, 15, WAND_STICK);  // wand handle above hand
  return out;
};
// Wand sweeping to the right (arm stays, wand tip moves right)
const withWandArmRight = (g) => {
  const out = withRightArmUp(g);
  // wand handle at col 16-17 row 6 (horizontal extension)
  out[6][15] = 1; out[6][16] = 1; out[6][17] = 1;
  return out;
};

const workWand = buildSprite({
  filename: 'work_blackboard.html',  // keep filename for backwards-compat
  name: 'work wand',
  category: 'Work',
  description: 'Robot waves a magic wand; a star bursts at the tip and sparkles scatter.',
  palette: WAND_PALETTE,
  frames: [
    // Wind up — arm raises, wand appears
    { hold: 300, build: () => withRightArmUp(baseGrid) },
    { hold: 300, build: () => withWandArmUp(baseGrid) },
    // Wave sweep right — star trails
    { hold: 180, build: () => { const g = withWandArmRight(baseGrid); drawAt(g, 2, 15, SPARK_SINGLE); return g; } },
    { hold: 160, build: () => { const g = withWandArmRight(baseGrid); drawAt(g, 2, 15, SPARK_CROSS); return g; } },
    // Star burst at wand tip!
    { hold: 180, build: () => { const g = withWandArmRight(baseGrid); drawAt(g, 4, 16, STAR_TIP); return g; } },
    { hold: 240, build: () => { const g = withSmile(withWandArmRight(baseGrid)); drawAt(g, 3, 15, STAR_TIP); return g; } },
    // Sparkles scatter outward
    { hold: 180, build: () => { const g = withSmile(withRightArmUp(baseGrid)); drawAt(g, 2, 15, SPARK_SCATTER); drawAt(g, 4, 17, SPARK_SINGLE); return g; } },
    { hold: 180, build: () => { const g = withSmile(withRightArmUp(baseGrid)); drawAt(g, 1, 13, SPARK_SINGLE); drawAt(g, 3, 17, SPARK_SINGLE); drawAt(g, 5, 16, SPARK_SINGLE); return g; } },
    // Sparkles fade, arm lowers
    { hold: 220, build: () => withSmile(baseGrid) },
    { hold: 400, build: () => cloneGrid(baseGrid) },
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
  idleScratchHead,
  idleWalk,
  idleJumpRope,
  expressionWink,
  expressionSurprise,
  expressionSleep,
  workCoding,
  workWand,
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
