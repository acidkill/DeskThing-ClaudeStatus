// Scheduling policy for the mascot rig.
//
// These are the two places where `prefers-reduced-motion` has to bite. Gating
// only the CSS body transform is not enough: rotating between clips and stepping
// the LED face track are both motion, and the face track is the worst offender —
// its shortest hold is 110 ms, i.e. a ~9 Hz glyph strobe on the most
// attention-grabbing part of the mascot.
//
// They live outside MascotSprite.tsx so that file exports a component and nothing
// else (react-refresh/only-export-components), and so the policy is unit-testable
// without a DOM.

import type { Mood } from '../../shared/messages';
import type { Expression } from './faces';

/** Shortest clip-rotation period we will honour, in seconds. */
export const MIN_ROTATE_SEC = 2;

/** Default clip-rotation period, in seconds, when no caller supplies one. */
export const DEFAULT_ROTATE_SEC = 8;

/**
 * Milliseconds between clip swaps, or `null` when no rotation timer may be
 * scheduled at all (reduced motion, or nothing to rotate between).
 *
 * Non-finite inputs are treated as "the caller gave us nothing usable" and fall
 * back to the default period. `Math.max(MIN_ROTATE_SEC, NaN)` is NaN, so the
 * floor alone does NOT close this — and `setInterval(fn, NaN)` is coerced to a
 * zero delay, i.e. a busy loop that re-renders the sprite every tick.
 */
export const clipRotationIntervalMs = (
  candidateCount: number,
  rotateSec: number,
  reducedMotion: boolean,
): number | null => {
  if (reducedMotion) return null;
  if (!Number.isFinite(candidateCount) || candidateCount < 2) return null;
  const seconds = Number.isFinite(rotateSec) ? rotateSec : DEFAULT_ROTATE_SEC;
  return Math.max(MIN_ROTATE_SEC, seconds) * 1000;
};

/**
 * Whether the LED face track may advance. Under reduced motion it must not — the
 * mascot holds a single static expression.
 */
export const shouldRunFaceTrack = (stepCount: number, reducedMotion: boolean): boolean =>
  !reducedMotion && stepCount >= 2;

/**
 * The expression the LED face settles on when nothing may animate.
 *
 * Deliberately NOT "whatever the clip's step 0 happens to be". Step 0 is a
 * choreography detail: it belongs to whichever clip animationsForMood returns
 * first, so it drifts whenever a clip is retimed, reordered or added. That is
 * harmless while something is moving, but under reduced motion it is the only
 * frame the user ever sees — and if two moods land on the same opening
 * expression the splash mascot silently stops carrying the one signal it exists
 * to carry. That regression shipped once already: freezing on step 0 collapsed
 * idle, active and frantic onto a single byte-identical sprite.
 *
 * Pinning a characteristic resting face per mood makes that distinctness a
 * property of this table instead of a lucky consequence of clip ordering: calm
 * eyes for idle, a smile for active, narrowed concentration for busy, wide eyes
 * for frantic. The reduced-motion suite asserts both that the four stay distinct
 * and that they differ from the step-0 expressions, so this constant cannot
 * decay into a no-op unnoticed.
 */
export const RESTING_EXPRESSION: Record<Mood, Expression> = {
  idle: 'neutral',
  active: 'happy',
  busy: 'focus',
  frantic: 'excited',
};

/** State of the LED face track: which clip it belongs to, and how far it has run. */
export type FaceCursor = { readonly clipId: string; readonly idx: number };

export const INITIAL_FACE_CURSOR: FaceCursor = { clipId: '', idx: 0 };

/**
 * The step index to paint THIS render.
 *
 * A cursor left over from another clip must resolve to 0 during render, not in a
 * post-paint effect: the clip swap and the face reset land in the same commit, so
 * an effect-based reset paints one frame of the previous clip's step index
 * against the new clip's step list (idle_jump_rope -> idle_breathe painted
 * 'neutral' where 'happy' belongs). The length check is belt-and-braces for a
 * swap onto a shorter clip.
 */
export const faceStepIndex = (cursor: FaceCursor, clipId: string, stepCount: number): number =>
  cursor.clipId === clipId && cursor.idx >= 0 && cursor.idx < stepCount ? cursor.idx : 0;
