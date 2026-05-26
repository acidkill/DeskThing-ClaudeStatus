// inspect.mjs — read source PNG dimensions + unique colour counts.
// Pure read-only. Output: JSON to stdout (no files written).

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

function readPng(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

function dims(p) {
  const png = readPng(p);
  return { w: png.width, h: png.height };
}

function uniqueColours(p, max = 64) {
  const png = readPng(p);
  const set = new Set();
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3];
    if (a === 0) continue;
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    set.add(`#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}@${a}`);
    if (set.size > max) break;
  }
  return { count: set.size, sample: [...set].slice(0, 16) };
}

const samples = {
  idle_frame_0: {
    ...dims(`${ROOT}/Assets/Idle/Armature_Idle_00.png`),
    colours: uniqueColours(`${ROOT}/Assets/Idle/Armature_Idle_00.png`),
  },
  sheet_idle: dims(`${ROOT}/Assets/SpriteSheets/Idle.png`),
  sheet_walk: dims(`${ROOT}/Assets/SpriteSheets/Walk.png`),
  sheet_walk02: dims(`${ROOT}/Assets/SpriteSheets/Walk02.png`),
  sheet_jump: dims(`${ROOT}/Assets/SpriteSheets/Jump.png`),
  part_body_512: dims(`${ROOT}/Assets/GameAssetsSource/Robot(512px)/Body.png`),
  part_head_512: dims(`${ROOT}/Assets/GameAssetsSource/Robot(512px)/Head.png`),
  part_eye_left_512: dims(`${ROOT}/Assets/GameAssetsSource/Robot(512px)/LeftEye.png`),
};

console.log(JSON.stringify(samples, null, 2));
