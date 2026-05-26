// robot-base.mjs — Shared anatomy/palette/composers for the Anthropic-orange robot mascot.
// Style reference: Foozle "Cute Platformer Robot" CC0 (anatomy: antenna, square head, screen-eyes, arms, legs).
// All sprites here = original 20×20 pixel art = our own work, fully redistributable.
//
// Palette indices (every sprite extends this base with extra colours for props):
//   0  transparent
//   1  body-orange  #D97757  (Anthropic primary)
//   2  dark         #1F1F1F  (outlines, joints, mouth)
//   3  screen-blue  #4A90E2  (face screen background)
//   4  antenna-red  #E64A4A  (antenna tip + status accent)

export const BASE_PALETTE = [
  'transparent', // 0
  '#D97757',     // 1 body-orange (Anthropic primary)
  '#1F1F1F',     // 2 dark
  '#4A90E2',     // 3 screen-blue
  '#E64A4A',     // 4 antenna-red
];

// Neutral standing pose, eyes open, arms at sides+shoulders. 20×20.
export const BASE_NEUTRAL = [
  '....................', // 0
  '.........4..........', // 1 antenna tip
  '.........2..........', // 2 antenna stem
  '.......111111.......', // 3 head top
  '......11333311......', // 4 head with screen
  '......13233231......', // 5 eyes (dark 2 at cols 8 and 11, screen 3 elsewhere)
  '......13333331......', // 6 screen middle
  '......11333311......', // 7 screen bottom
  '.......111111.......', // 8 head bottom
  '........1111........', // 9 neck
  '...11111111111111...', // 10 shoulders+arms (cols 3-16, 14 wide)
  '...11111111111111...', // 11 arms wide
  '......11111111......', // 12 body
  '......11111111......', // 13 body
  '.......111111.......', // 14 waist
  '.......11.11........', // 15 legs split (cols 7-8, 10-11)
  '.......11.11........', // 16 legs
  '.......11.11........', // 17 legs
  '......222.222.......', // 18 feet (dark)
  '....................', // 19
];

// Helpers ────────────────────────────────────────────────────────────────────

export const parseGrid = (lines) =>
  lines.map((line) => {
    if (line.length !== 20) throw new Error(`row width ${line.length}, expected 20: "${line}"`);
    return line.split('').map((ch) => (ch === '.' ? 0 : Number(ch)));
  });

export const cloneGrid = (g) => g.map((row) => row.slice());

export const drawAt = (grid, r0, c0, shape) => {
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

// Memoised BASE_NEUTRAL parsed once.
export const baseGrid = parseGrid(BASE_NEUTRAL);

// Expression composers — mutate the screen-face area (rows 4-7, cols 6-13).
// Default eye positions in BASE_NEUTRAL: row 5 col 8, row 5 col 11. Drawn as dark 2 on screen 3.

export const withEyesClosed = (g) => {
  const out = cloneGrid(g);
  // Clear default eyes (set back to screen colour 3)
  out[5][8] = 3; out[5][11] = 3;
  // Draw closed-eye horizontal dashes one row below (between eye and screen-bottom)
  out[5][8] = 2; out[5][9] = 2; out[5][10] = 2; out[5][11] = 2;
  return out;
};

export const withEyesWide = (g) => {
  const out = cloneGrid(g);
  // Larger eyes spanning 2 rows
  out[4][8] = 2; out[4][11] = 2;
  out[5][8] = 2; out[5][11] = 2;
  return out;
};

export const withEyesLeft = (g) => {
  const out = cloneGrid(g);
  out[5][8] = 3; out[5][11] = 3; // wipe defaults
  out[5][7] = 2; out[5][10] = 2; // shift left by 1
  return out;
};

export const withEyesRight = (g) => {
  const out = cloneGrid(g);
  out[5][8] = 3; out[5][11] = 3;
  out[5][9] = 2; out[5][12] = 2;
  return out;
};

export const withEyesUp = (g) => {
  const out = cloneGrid(g);
  out[5][8] = 3; out[5][11] = 3;
  out[4][8] = 2; out[4][11] = 2;
  return out;
};

export const withWink = (g) => {
  const out = cloneGrid(g);
  // Left eye stays open; right becomes closed dash
  out[5][11] = 3;        // wipe right eye
  out[5][10] = 2; out[5][11] = 2; out[5][12] = 2; // wink dash
  return out;
};

export const withSmile = (g) => {
  const out = cloneGrid(g);
  out[6][9] = 2; out[6][10] = 2;
  return out;
};

export const withFrown = (g) => {
  const out = cloneGrid(g);
  out[7][9] = 2; out[7][10] = 2;
  return out;
};

export const withOpenMouth = (g) => {
  const out = cloneGrid(g);
  out[6][9] = 2; out[6][10] = 2;
  out[7][9] = 2; out[7][10] = 2;
  return out;
};

// Antenna animation states
export const withAntennaLeft = (g) => {
  const out = cloneGrid(g);
  out[1][9] = 0;
  out[2][9] = 0;
  out[1][8] = 4;
  out[2][8] = 2;
  return out;
};

export const withAntennaRight = (g) => {
  const out = cloneGrid(g);
  out[1][9] = 0;
  out[2][9] = 0;
  out[1][10] = 4;
  out[2][10] = 2;
  return out;
};

export const withAntennaDim = (g) => {
  const out = cloneGrid(g);
  out[1][9] = 1; // antenna tip dimmed (body-colour, not red)
  return out;
};

// Body breathing — slight expand on rows 12-13
export const withBodyExpand = (g) => {
  const out = cloneGrid(g);
  out[12][5] = 1;
  out[12][14] = 1;
  out[13][5] = 1;
  out[13][14] = 1;
  return out;
};

// Sway left: redraw body shifted 1 col left
export const withSwayLeft = (g) => {
  const out = cloneGrid(g);
  for (let r = 10; r <= 14; r += 1) {
    out[r] = parseGrid(['....................'])[0];
  }
  out[10] = parseGrid(['..11111111111111....'])[0];
  out[11] = parseGrid(['..11111111111111....'])[0];
  out[12] = parseGrid(['.....11111111.......'])[0];
  out[13] = parseGrid(['.....11111111.......'])[0];
  out[14] = parseGrid(['......111111........'])[0];
  return out;
};

export const withSwayRight = (g) => {
  const out = cloneGrid(g);
  for (let r = 10; r <= 14; r += 1) {
    out[r] = parseGrid(['....................'])[0];
  }
  out[10] = parseGrid(['....11111111111111..'])[0];
  out[11] = parseGrid(['....11111111111111..'])[0];
  out[12] = parseGrid(['.......11111111.....'])[0];
  out[13] = parseGrid(['.......11111111.....'])[0];
  out[14] = parseGrid(['........111111......'])[0];
  return out;
};

// Bounce: shift entire frame up by 1 row
export const withBounceUp = (g) => {
  const out = Array.from({ length: 20 }, () => Array(20).fill(0));
  for (let r = 1; r < 19; r += 1) {
    for (let c = 0; c < 20; c += 1) {
      out[r - 1][c] = g[r][c];
    }
  }
  return out;
};

// Squat: shift body parts down by 1 row (head stays, body compresses)
export const withSquat = (g) => {
  const out = cloneGrid(g);
  // Move rows 9-18 down by 1 (overwrite row 19, shift down)
  for (let r = 18; r >= 9; r -= 1) {
    for (let c = 0; c < 20; c += 1) {
      if (r + 1 < 20) out[r + 1][c] = g[r][c];
    }
  }
  // Clear row 9 (now duplicated)
  for (let c = 0; c < 20; c += 1) out[9][c] = 0;
  return out;
};

// Right arm raised alongside the head (elbow bent up, forearm vertical)
// Removes shoulder arm pixels, draws arm going up along right side (col 14-15)
export const withRightArmUp = (g) => {
  const out = cloneGrid(g);
  out[10][14] = 0; out[10][15] = 0; out[10][16] = 0;
  out[11][14] = 0; out[11][15] = 0; out[11][16] = 0;
  out[9][14] = 1; out[9][15] = 1;  // upper arm at neck level
  out[8][14] = 1; out[8][15] = 1;  // forearm at head-bottom
  out[7][14] = 1; out[7][15] = 1;  // forearm at head-mid
  out[6][14] = 1;                   // wrist at eye level
  return out;
};

// Right arm fully raised, hand touching top of head (scratch position)
export const withRightArmScratch = (g) => {
  const out = withRightArmUp(g);
  out[5][14] = 1;                   // arm higher (beside eyes)
  out[4][14] = 1;                   // arm at head-top level
  out[3][13] = 1; out[3][14] = 1;  // hand at top of head
  out[2][13] = 1;                   // finger touching head top
  return out;
};

// Right arm angled toward face (for eating / blowing bubbles)
// Arm elbow bends inward — hand arrives near col 13-14 at mouth height
export const withRightArmAtFace = (g) => {
  const out = cloneGrid(g);
  out[10][14] = 0; out[10][15] = 0; out[10][16] = 0;
  out[11][14] = 0; out[11][15] = 0; out[11][16] = 0;
  out[9][14] = 1; out[9][15] = 1;  // upper arm
  out[8][13] = 1; out[8][14] = 1;  // elbow angling in
  out[7][13] = 1; out[7][14] = 1;  // forearm
  out[6][13] = 1;                   // hand/wrist near face
  return out;
};

// Arms tucked behind back: remove shoulder extensions, show arms peeking at lower sides
export const withArmsBehind = (g) => {
  const out = cloneGrid(g);
  out[10][3] = 0; out[10][4] = 0; out[10][5] = 0;
  out[10][14] = 0; out[10][15] = 0; out[10][16] = 0;
  out[11][3] = 0; out[11][4] = 0; out[11][5] = 0;
  out[11][14] = 0; out[11][15] = 0; out[11][16] = 0;
  // Arms visible from behind at lower-body sides
  out[12][5] = 1; out[12][14] = 1;
  out[13][4] = 1; out[13][5] = 1; out[13][13] = 1; out[13][14] = 1;
  out[14][4] = 1; out[14][5] = 1; out[14][12] = 1; out[14][13] = 1;
  return out;
};

// Shift entire robot 1 col left (for walking animation)
export const withShiftLeft1 = (g) => {
  const out = Array.from({ length: 20 }, () => Array(20).fill(0));
  for (let r = 0; r < 20; r += 1) {
    for (let c = 1; c < 20; c += 1) {
      out[r][c - 1] = g[r][c];
    }
  }
  return out;
};

// Shift entire robot 1 col right
export const withShiftRight1 = (g) => {
  const out = Array.from({ length: 20 }, () => Array(20).fill(0));
  for (let r = 0; r < 20; r += 1) {
    for (let c = 0; c < 19; c += 1) {
      out[r][c + 1] = g[r][c];
    }
  }
  return out;
};

// Lift left foot one row (simulates step / weight shift)
// Left foot lives at row 18, cols 6-8 (dark/2)
export const withLeftFootUp = (g) => {
  const out = cloneGrid(g);
  out[18][6] = 0; out[18][7] = 0; out[18][8] = 0;
  out[17][6] = 2; out[17][7] = 2;
  return out;
};

// Lift right foot one row
// Right foot lives at row 18, cols 10-12 (dark/2)
export const withRightFootUp = (g) => {
  const out = cloneGrid(g);
  out[18][10] = 0; out[18][11] = 0; out[18][12] = 0;
  out[17][11] = 2; out[17][12] = 2;
  return out;
};
