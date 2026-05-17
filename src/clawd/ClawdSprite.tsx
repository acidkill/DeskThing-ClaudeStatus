import { useEffect, useRef, useState, type FC } from 'react';

import type { Mood } from '../../shared/messages';
import { spritesForMood, type Sprite } from './sprites';

type Props = {
  mood: Mood;
  size?: number;
  rotateSec?: number;
};

const drawFrame = (ctx: CanvasRenderingContext2D, sprite: Sprite, frameIdx: number, pixel: number): void => {
  const frame = sprite.frames[frameIdx];
  if (!frame) return;
  const { grid } = frame;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  ctx.clearRect(0, 0, cols * pixel, rows * pixel);
  for (let y = 0; y < rows; y += 1) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < cols; x += 1) {
      const idx = row[x] ?? 0;
      if (idx === 0) continue;
      const color = sprite.palette[idx];
      if (!color || color === 'transparent') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
    }
  }
};

export const ClawdSprite: FC<Props> = ({ mood, size = 360, rotateSec = 8 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const candidates = spritesForMood(mood);
  const [spriteIdx, setSpriteIdx] = useState(0);

  useEffect(() => {
    setSpriteIdx(0);
  }, [mood, candidates.length]);

  useEffect(() => {
    if (candidates.length < 2) return;
    const id = window.setInterval(
      () => setSpriteIdx((i) => (i + 1) % candidates.length),
      Math.max(2, rotateSec) * 1000,
    );
    return () => window.clearInterval(id);
  }, [candidates.length, rotateSec]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sprite = candidates[spriteIdx];
    if (!sprite) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rows = sprite.frames[0]?.grid.length ?? 20;
    const cols = sprite.frames[0]?.grid[0]?.length ?? 20;
    const pixel = Math.max(1, Math.floor(size / Math.max(rows, cols)));
    const pxW = cols * pixel;
    const pxH = rows * pixel;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = pxW * dpr;
    canvas.height = pxH * dpr;
    canvas.style.width = `${pxW}px`;
    canvas.style.height = `${pxH}px`;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let frameIdx = 0;
    let timeoutId: number | null = null;
    let cancelled = false;
    const tick = (): void => {
      if (cancelled) return;
      drawFrame(ctx, sprite, frameIdx, pixel);
      const hold = sprite.frames[frameIdx]?.hold ?? 100;
      frameIdx = (frameIdx + 1) % sprite.frames.length;
      timeoutId = window.setTimeout(tick, Math.max(30, hold));
    };
    tick();
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [candidates, spriteIdx, size]);

  const sprite = candidates[spriteIdx];
  if (!sprite) return null;

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Clawd sprite — ${sprite.name}, mood ${mood}`}
      className="select-none [image-rendering:pixelated]"
    />
  );
};
