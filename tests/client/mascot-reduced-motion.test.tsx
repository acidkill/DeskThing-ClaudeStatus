import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANIMATIONS, animationsForMood } from '../../src/mascot/animations';
import { CASING_PATHS, SCREEN_PATHS } from '../../src/mascot/casing';
import { FACES } from '../../src/mascot/faces';
import { MascotSprite } from '../../src/mascot/MascotSprite';
import {
  DEFAULT_ROTATE_SEC,
  MIN_ROTATE_SEC,
  RESTING_EXPRESSION,
  clipRotationIntervalMs,
  faceStepIndex,
  shouldRunFaceTrack,
} from '../../src/mascot/motion';
import type { Mood } from '../../shared/messages';

type MediaStub = {
  matches: boolean;
  addEventListener: () => void;
  removeEventListener: () => void;
};
type WindowStub = { matchMedia: (query: string) => MediaStub };

const setReduceMotion = (matches: boolean): void => {
  const stub: WindowStub = {
    matchMedia: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  };
  (globalThis as unknown as { window?: WindowStub }).window = stub;
};

afterEach(() => {
  delete (globalThis as unknown as { window?: WindowStub }).window;
  vi.useRealTimers();
});

const MOODS: ReadonlyArray<Mood> = ['idle', 'active', 'busy', 'frantic'];

// ---------------------------------------------------------------------------
// Why this file no longer spies on setInterval/setTimeout.
//
// It used to assert that "a full render under reduce touches no timer API".
// That assertion was vacuous: vitest.config.ts pins environment:'node', no DOM
// library is installed, and renderToStaticMarkup never runs useEffect — so the
// two timer call sites in MascotSprite are unreachable from this suite and the
// spies stayed clean with motion fully ENABLED too. It could not fail.
//
// The reduced-motion policy is entirely encoded in two pure functions in
// motion.ts, which need no DOM. Those get exhaustive coverage below. What
// renderToStaticMarkup CAN honestly prove — the static markup the component
// emits under reduce — is asserted separately.
// ---------------------------------------------------------------------------

/** Values a caller could realistically reach these functions with, plus the nasty ones. */
const ROTATE_SECS: ReadonlyArray<number> = [
  Number.NEGATIVE_INFINITY,
  Number.NaN,
  -1,
  0,
  0.5,
  MIN_ROTATE_SEC,
  DEFAULT_ROTATE_SEC,
  20,
  600,
  Number.POSITIVE_INFINITY,
];

const CANDIDATE_COUNTS: ReadonlyArray<number> = [
  Number.NEGATIVE_INFINITY,
  Number.NaN,
  -1,
  0,
  1,
  2,
  3,
  9,
  20,
  Number.POSITIVE_INFINITY,
];

const STEP_COUNTS: ReadonlyArray<number> = [Number.NaN, -1, 0, 1, 2, 3, 8, 20];

describe('motion policy: clipRotationIntervalMs', () => {
  it('returns null for EVERY input combination once reducedMotion is set', () => {
    // The whole point of the flag. Dropping the `if (reducedMotion) return null`
    // term makes 80 of these 100 cases return a number.
    for (const count of CANDIDATE_COUNTS) {
      for (const rotateSec of ROTATE_SECS) {
        expect(
          clipRotationIntervalMs(count, rotateSec, true),
          `count=${count} rotateSec=${rotateSec}`,
        ).toBeNull();
      }
    }
  });

  it('does schedule without reduce, so the null above is not trivially true', () => {
    // Control arm: at least one of those same inputs must produce a real interval
    // when the user has NOT asked for reduced motion.
    const scheduled = CANDIDATE_COUNTS.flatMap((count) =>
      ROTATE_SECS.map((rotateSec) => clipRotationIntervalMs(count, rotateSec, false)),
    ).filter((ms): ms is number => ms !== null);
    expect(scheduled.length).toBeGreaterThan(0);
    for (const ms of scheduled) {
      expect(Number.isFinite(ms)).toBe(true);
      expect(ms).toBeGreaterThanOrEqual(MIN_ROTATE_SEC * 1000);
    }
  });

  it('refuses to rotate a list that is not a finite count of at least two', () => {
    // A non-finite count is "the caller gave us nothing usable" — rotating on it
    // would call `i % Infinity` forever on the same clip.
    for (const count of [
      Number.NEGATIVE_INFINITY,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -1,
      0,
      1,
    ]) {
      expect(clipRotationIntervalMs(count, 20, false), `count=${count}`).toBeNull();
    }
    for (const count of [2, 3, 9, 20]) {
      expect(clipRotationIntervalMs(count, 20, false), `count=${count}`).toBe(20_000);
    }
  });

  it('floors, defaults, and never yields a non-finite delay', () => {
    expect(clipRotationIntervalMs(9, DEFAULT_ROTATE_SEC, false)).toBe(DEFAULT_ROTATE_SEC * 1000);
    expect(clipRotationIntervalMs(9, 20, false)).toBe(20_000);
    expect(clipRotationIntervalMs(9, 600, false)).toBe(600_000);
    // Finite but below the floor -> clamped up. setInterval(fn, 0) is a busy loop.
    for (const tooFast of [-1, 0, 0.5, MIN_ROTATE_SEC]) {
      expect(clipRotationIntervalMs(9, tooFast, false), `rotateSec=${tooFast}`).toBe(
        MIN_ROTATE_SEC * 1000,
      );
    }
    // Non-finite -> the default period, never NaN (Math.max(2, NaN) is NaN and
    // setInterval coerces NaN to a zero delay). -Infinity goes here rather than to
    // the floor: it is not a "too fast" number, it is not a number at all.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(clipRotationIntervalMs(9, bad, false), `rotateSec=${bad}`).toBe(
        DEFAULT_ROTATE_SEC * 1000,
      );
    }
    for (const count of CANDIDATE_COUNTS) {
      for (const rotateSec of ROTATE_SECS) {
        const ms = clipRotationIntervalMs(count, rotateSec, false);
        if (ms !== null) expect(Number.isFinite(ms), `count=${count} rotateSec=${rotateSec}`).toBe(true);
      }
    }
  });

  it('is monotonic in rotateSec above the floor', () => {
    const above = [MIN_ROTATE_SEC, 3, DEFAULT_ROTATE_SEC, 20, 600];
    for (let i = 1; i < above.length; i += 1) {
      const previous = clipRotationIntervalMs(9, above[i - 1] ?? 0, false) ?? 0;
      const current = clipRotationIntervalMs(9, above[i] ?? 0, false) ?? 0;
      expect(current).toBeGreaterThan(previous);
    }
  });
});

describe('motion policy: shouldRunFaceTrack', () => {
  it('is false for every step count under reduce, and its full truth table otherwise', () => {
    for (const steps of STEP_COUNTS) {
      expect(shouldRunFaceTrack(steps, true), `steps=${steps} reduced`).toBe(false);
      expect(shouldRunFaceTrack(steps, false), `steps=${steps}`).toBe(steps >= 2);
    }
  });

  it('covers every real clip in both states', () => {
    for (const anim of ANIMATIONS) {
      expect(shouldRunFaceTrack(anim.steps.length, true), anim.id).toBe(false);
      expect(shouldRunFaceTrack(anim.steps.length, false), anim.id).toBe(anim.steps.length >= 2);
    }
    // Control: the suite would be worthless if no clip animated its face at all.
    expect(ANIMATIONS.some((anim) => shouldRunFaceTrack(anim.steps.length, false))).toBe(true);
  });
});

describe('MascotSprite: static output under reduce', () => {
  it('drops the body motion class for every mood under reduce and keeps it otherwise', () => {
    for (const mood of MOODS) {
      setReduceMotion(true);
      expect(
        renderToStaticMarkup(<MascotSprite mood={mood} />),
        `${mood} under reduce`,
      ).not.toContain('animate-motion-');

      setReduceMotion(false);
      const first = animationsForMood(mood)[0];
      expect(first).toBeDefined();
      const full = renderToStaticMarkup(<MascotSprite mood={mood} />);
      if (first !== undefined && first.motion !== 'still') {
        expect(full, `${mood} without reduce`).toContain(`animate-motion-${first.motion}`);
      }
    }
    // Control: reduce is suppressing something that is otherwise there.
    setReduceMotion(false);
    expect(
      MOODS.some((mood) =>
        renderToStaticMarkup(<MascotSprite mood={mood} />).includes('animate-motion-'),
      ),
    ).toBe(true);
  });
});

describe('MascotSprite: a stale clip cursor never blanks a frame', () => {
  it('clamps a cursor from the longest candidate list into every smaller one', () => {
    // The exact per-mood sizes are pinned once, in mascot-catalogue.test.ts. This
    // test only needs idle to be the longest list, so its cursor can overrun the
    // shorter ones — which is the condition that produced the blank frame.
    const idle = animationsForMood('idle');
    for (const mood of MOODS) {
      expect(idle.length, `idle must not be shorter than ${mood}`).toBeGreaterThanOrEqual(
        animationsForMood(mood).length,
      );
    }
    for (const mood of MOODS) {
      const next = animationsForMood(mood);
      for (let cursor = 0; cursor < idle.length; cursor += 1) {
        const clamped = next.length > 0 ? cursor % next.length : 0;
        expect(next[clamped]).toBeDefined();
      }
    }
  });

  it('renders a non-empty svg for every mood', () => {
    setReduceMotion(false);
    for (const mood of MOODS) {
      const html = renderToStaticMarkup(<MascotSprite mood={mood} />);
      expect(html.startsWith('<svg')).toBe(true);
      expect(html.length).toBeGreaterThan(1000);
    }
  });
});

describe('MascotSprite: persona lock', () => {
  it('emits one identical casing+screen block across all moods, reduced or not', () => {
    // Exact expected block, built from the generated constants with the same JSX
    // shape MascotSprite uses, so the comparison cannot drift with prop layers.
    const expected = renderToStaticMarkup(
      <g>
        {CASING_PATHS.map((path, index) => (
          <path key={`casing-${index}`} d={path.d} fill={path.fill} />
        ))}
        {SCREEN_PATHS.map((path, index) => (
          <path key={`screen-${index}`} d={path.d} fill={path.fill} />
        ))}
      </g>,
    ).replace(/^<g>|<\/g>$/g, '');
    expect(expected.length).toBeGreaterThan(1000);

    // The block must be EXTRACTED from what the component actually rendered.
    // Hashing `expected` here instead would be a tautology: it is loop-invariant,
    // so the set collapses to one entry no matter what MascotSprite emitted.
    const lockedPaths = new Set(
      [...CASING_PATHS, ...SCREEN_PATHS].map((path) => `${path.d} ${path.fill}`),
    );
    // Tag-level match: React serialises <path> with a closing tag, not as a void
    // element, and attribute order is not part of the contract.
    const extractLockedBlock = (html: string): ReadonlyArray<string> =>
      [...html.matchAll(/<path\b[^>]*>/g)]
        .map(([tag]) => {
          const d = /\sd="([^"]*)"/.exec(tag)?.[1] ?? '';
          const fill = /\sfill="([^"]*)"/.exec(tag)?.[1] ?? '';
          return `${d} ${fill}`;
        })
        .filter((path) => lockedPaths.has(path));

    const hashes = new Set<string>();
    for (const reduce of [true, false]) {
      setReduceMotion(reduce);
      for (const mood of MOODS) {
        const html = renderToStaticMarkup(<MascotSprite mood={mood} size={360} />);
        expect(html).toContain(expected);
        const extracted = extractLockedBlock(html);
        // Every locked path must survive into the render, in order.
        expect(extracted).toHaveLength(CASING_PATHS.length + SCREEN_PATHS.length);
        hashes.add(createHash('sha256').update(extracted.join('\n')).digest('hex'));
      }
    }
    expect(hashes.size).toBe(1);
  });
});

describe('MascotSprite: rotateSec stays optional with its 8s default', () => {
  it('MascotSprite keeps rotateSec optional with its 8s default', () => {
    expect(clipRotationIntervalMs(9, 8, false)).toBe(8_000);
    expect(clipRotationIntervalMs(9, 20, false)).toBe(20_000);
    // floor still enforced
    expect(clipRotationIntervalMs(9, 0.5, false)).toBe(2_000);
  });

  it('never yields a non-finite interval, whatever the caller passes', () => {
    // Math.max(MIN_ROTATE_SEC, NaN) is NaN and setInterval(fn, NaN) is a zero-delay
    // busy loop, so the floor alone does not close this.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const ms = clipRotationIntervalMs(9, bad, false);
      expect(ms).toBe(DEFAULT_ROTATE_SEC * 1000);
      expect(Number.isFinite(ms)).toBe(true);
    }
    expect(clipRotationIntervalMs(Number.NaN, 20, false)).toBeNull();
    expect(MIN_ROTATE_SEC).toBeLessThan(DEFAULT_ROTATE_SEC);
  });
});

describe('MascotSprite: reduced motion still carries the mood signal', () => {
  it('gives every mood a distinct resting expression with real glyphs', () => {
    const expressions = MOODS.map((mood) => RESTING_EXPRESSION[mood]);
    expect(new Set(expressions).size).toBe(MOODS.length);
    for (const expression of expressions) {
      expect(FACES[expression]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('renders four visually distinct sprites under reduce', () => {
    setReduceMotion(true);
    // The aria-label carries the mood as text; strip it so this compares the
    // DRAWN sprite, which is what a reduced-motion user actually reads.
    const drawn = MOODS.map((mood) =>
      createHash('sha256')
        .update(
          renderToStaticMarkup(<MascotSprite mood={mood} />).replace(/aria-label="[^"]*"/, ''),
        )
        .digest('hex'),
    );
    expect(new Set(drawn).size).toBe(MOODS.length);
  });

  it('does not fall back to the clip step-0 expression', () => {
    // The original defect was that three of the four moods opened on the same
    // expression, so holding step 0 collapsed them onto one sprite. That
    // particular collapse is gone — every clip now opens on a distinct
    // (expression, prop) pair so clip rotation is visible — but step 0 is a
    // rotation-authoring concern that is free to change again, and reduced motion
    // must not be coupled to it. Assert the decoupling directly: at least one mood
    // rests on an expression its own first candidate does NOT open with, and every
    // mood renders its resting glyphs.
    const stepZero = MOODS.map((mood) => animationsForMood(mood)[0]?.steps[0]?.expression);
    const resting = MOODS.map((mood) => RESTING_EXPRESSION[mood]);
    expect(
      MOODS.some((_, i) => stepZero[i] !== resting[i]),
      'RESTING_EXPRESSION is indistinguishable from step 0 — this test proves nothing',
    ).toBe(true);

    setReduceMotion(true);
    for (const mood of MOODS) {
      const html = renderToStaticMarkup(<MascotSprite mood={mood} />);
      for (const d of FACES[RESTING_EXPRESSION[mood]]) expect(html).toContain(d);
    }
  });
});

describe('MascotSprite: the face cursor resets during render, not after paint', () => {
  it('a cursor from another clip resolves to step 0', () => {
    const from = ANIMATIONS.find((a) => a.id === 'idle_jump_rope');
    const to = ANIMATIONS.find((a) => a.id === 'idle_breathe');
    expect(from).toBeDefined();
    expect(to).toBeDefined();
    if (from === undefined || to === undefined) return;

    // The concrete report: 7-step clip -> 4-step clip, stale idx 1 painted
    // 'neutral' where 'happy' belongs.
    const stale = { clipId: from.id, idx: 1 };
    expect(to.steps[stale.idx]?.expression).not.toBe(to.steps[0]?.expression);
    expect(faceStepIndex(stale, to.id, to.steps.length)).toBe(0);
    expect(to.steps[faceStepIndex(stale, to.id, to.steps.length)]?.expression).toBe(
      to.steps[0]?.expression,
    );
  });

  it('keeps a matching cursor, and rejects out-of-range or negative ones', () => {
    for (const anim of ANIMATIONS) {
      for (let idx = 0; idx < anim.steps.length; idx += 1) {
        expect(faceStepIndex({ clipId: anim.id, idx }, anim.id, anim.steps.length)).toBe(idx);
      }
      expect(faceStepIndex({ clipId: anim.id, idx: anim.steps.length }, anim.id, anim.steps.length)).toBe(0);
      expect(faceStepIndex({ clipId: anim.id, idx: -1 }, anim.id, anim.steps.length)).toBe(0);
    }
  });
});
