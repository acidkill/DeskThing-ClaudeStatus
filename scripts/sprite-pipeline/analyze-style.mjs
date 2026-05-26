// analyze-style.mjs — detect if Foozle robot is pixel-art (sharp blocks) or vector (smooth AA).
// Read-only. Scans a horizontal stripe and reports colour-change pattern.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  'assets-staging',
  'foozle-original',
  'Foozle_2DC0001_Cute_Robot'
);

const frame = PNG.sync.read(fs.readFileSync(`${ROOT}/Assets/Idle/Armature_Idle_00.png`));

const y = Math.floor(frame.height / 2);
const runs = [];
let prev = null;
let runLen = 0;
for (let x = 0; x < frame.width; x += 1) {
  const i = (y * frame.width + x) * 4;
  const key = `${frame.data[i]},${frame.data[i + 1]},${frame.data[i + 2]},${frame.data[i + 3]}`;
  if (key === prev) {
    runLen += 1;
  } else {
    if (prev !== null) runs.push({ color: prev, length: runLen });
    prev = key;
    runLen = 1;
  }
}
runs.push({ color: prev, length: runLen });

const runsOverFive = runs.filter((r) => r.length > 5).length;
const runsOver50 = runs.filter((r) => r.length > 50).length;
const totalRuns = runs.length;
const longestRun = Math.max(...runs.map((r) => r.length));

console.log(JSON.stringify({
  width: frame.width,
  height: frame.height,
  scan_y: y,
  total_runs: totalRuns,
  runs_over_5px: runsOverFive,
  runs_over_50px: runsOver50,
  longest_run_px: longestRun,
  verdict: runsOver50 > 5 && totalRuns < 30 ? 'pixel_art_scaled' : 'vector_smooth',
  first_8_runs: runs.slice(0, 8),
}, null, 2));
