// Catalogue guards: mood routing and v1 parity.
//
// The v2 vector rig replaced 20 v1 pixel sprites. assets/mascot/_index.json is
// the surviving manifest of that set, so it is the fixture: every v1 id must
// still exist in ANIMATIONS under the same name and category. Losing one would
// not break a build — it would quietly shrink a mood's rotation, and a mood that
// lost its whole category would fall through to "every animation is eligible".

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ANIMATIONS,
  animationsForMood,
  moodsForAnimation,
  type Category,
} from '../../src/mascot/animations';
import { FACES } from '../../src/mascot/faces';
import { PROPS } from '../../src/mascot/props';
import { DEFAULT_SETTINGS, type Mood } from '../../shared/messages';

type V1Entry = { readonly id: string; readonly name: string; readonly category: string };

const loadV1Index = (): ReadonlyArray<V1Entry> => {
  const raw: unknown = JSON.parse(
    readFileSync(new URL('../../assets/mascot/_index.json', import.meta.url), 'utf8'),
  );
  if (!Array.isArray(raw)) throw new Error('_index.json is not an array');

  return raw.map((entry, index) => {
    if (entry === null || typeof entry !== 'object') {
      throw new Error(`_index.json[${index}] is not an object`);
    }
    const record = entry as Record<string, unknown>;
    const { filename, name, category } = record;
    if (typeof filename !== 'string' || typeof name !== 'string' || typeof category !== 'string') {
      throw new Error(`_index.json[${index}] is missing filename/name/category`);
    }
    return { id: filename.replace(/\.html$/, ''), name, category };
  });
};

const V1 = loadV1Index();
const MOODS: ReadonlyArray<Mood> = ['idle', 'active', 'busy', 'frantic'];

describe('mood coverage', () => {
  it.each(MOODS)('%s resolves to a non-empty candidate set', (mood) => {
    const candidates = animationsForMood(mood);
    expect(candidates.length).toBeGreaterThan(0);
    for (const animation of candidates) expect(ANIMATIONS).toContain(animation);
  });

  it('gives every mood a distinct, non-degenerate rotation', () => {
    const byMood = new Map(MOODS.map((mood) => [mood, animationsForMood(mood)]));

    // A mood that resolved to nothing falls through to the whole catalogue. That
    // fallback existing is fine; a mood actually hitting it is not — it would mean
    // a category was renamed or emptied.
    for (const [mood, candidates] of byMood) {
      expect(candidates.length, `${mood} fell through to the full catalogue`).toBeLessThan(
        ANIMATIONS.length,
      );
      // Routing is explicit per clip, not implied by category: a clip may be
      // filed under one v1 category and shown in a different mood. So the check
      // is that every candidate genuinely claims this mood, not that they all
      // share a category.
      for (const animation of candidates) {
        expect(
          moodsForAnimation(animation),
          `${animation.id} is offered to '${mood}' but does not claim it`,
        ).toContain(mood);
      }
    }

    expect(byMood.get('idle')?.length).toBe(10);
    expect(byMood.get('active')?.length).toBe(2);
    expect(byMood.get('busy')?.length).toBe(2);
    expect(byMood.get('frantic')?.length).toBe(5);
  });

  it('routes the sleeping clip to idle, never to active', () => {
    // v1 filed expression_sleep under Expressions, which maps to `active` — an
    // actively-working session could therefore show a sleeping mascot, inverting
    // the signal the splash screen exists to carry.
    const sleeping = ANIMATIONS.find((animation) => animation.id === 'expression_sleep');
    expect(sleeping).toBeDefined();
    expect(sleeping?.category, 'v1 category must stay untouched for parity').toBe('Expressions');
    expect(animationsForMood('active')).not.toContain(sleeping);
    expect(animationsForMood('idle')).toContain(sleeping);
  });

  it('gives each mood a visibly distinct opening per clip', () => {
    // At the instant of a clip swap the face track is back at step 0 and the CSS
    // motion transform is at identity, so the whole visible difference is the
    // (expression, prop, motion) triple. Clips sharing it swap invisibly.
    for (const mood of MOODS) {
      const openings = animationsForMood(mood).map(
        (animation) =>
          `${animation.steps[0]?.expression ?? '?'}|${animation.prop ?? '-'}|${animation.motion}`,
      );
      expect(new Set(openings).size, `${mood} has clips that swap invisibly`).toBe(openings.length);
    }
  });
});

describe('v1 parity: every sprite in assets/mascot/_index.json survived the port', () => {
  it('reads all 20 v1 entries', () => {
    expect(V1.length).toBe(20);
    expect(ANIMATIONS.length).toBe(20);
  });

  it.each(V1)('$id kept its name and category', (entry) => {
    const match = ANIMATIONS.find((animation) => animation.id === entry.id);
    expect(match, `v1 sprite '${entry.id}' has no v2 animation`).toBeDefined();
    expect(match?.name, `${entry.id} name`).toBe(entry.name);
    expect(match?.category as string, `${entry.id} category`).toBe(entry.category);
  });

  it('adds no animation the v1 manifest does not list', () => {
    const v1Ids = new Set(V1.map((entry) => entry.id));
    for (const animation of ANIMATIONS) expect(v1Ids, animation.id).toContain(animation.id);
  });

  it('uses unique ids', () => {
    expect(new Set(ANIMATIONS.map((animation) => animation.id)).size).toBe(ANIMATIONS.length);
  });
});

describe('catalogue integrity', () => {
  it('references only declared expressions and props', () => {
    for (const animation of ANIMATIONS) {
      expect(animation.steps.length, `${animation.id} has no steps`).toBeGreaterThan(0);
      for (const step of animation.steps) {
        expect(Object.keys(FACES), `${animation.id}`).toContain(step.expression);
        expect(step.hold, `${animation.id} hold`).toBeGreaterThan(0);
      }
      if (animation.prop !== undefined) {
        expect(Object.keys(PROPS), `${animation.id} prop`).toContain(animation.prop);
      }
    }
  });

  it('leaves no prop unused', () => {
    const used = new Set(
      ANIMATIONS.flatMap((animation) => (animation.prop === undefined ? [] : [animation.prop])),
    );
    for (const id of Object.keys(PROPS)) expect(used, `prop '${id}' is dead weight`).toContain(id);
  });

  it('keeps every clip inside the wired rotation window', () => {
    // The old guard capped every cycle under MascotSprite's 8s FALLBACK so each
    // clip finished a loop even at that cadence. Calming the idle faces pushed
    // those cycles to ~8.7s and the cap had to go: a clip that does not finish
    // its loop is fine now, because every frame of it is on-state by
    // construction. What still matters is the WIRED cadence — the mascot must
    // not be swapped away mid-first-pass at the setting users actually run.
    for (const animation of ANIMATIONS) {
      const cycle = animation.steps.reduce((total, step) => total + step.hold, 0);
      expect(
        cycle,
        `${animation.id} cycle ${cycle}ms outruns the default splashRotateSec`,
      ).toBeLessThan(DEFAULT_SETTINGS.splashRotateSec * 1000);
    }
  });

  it('uses only known categories', () => {
    const known: ReadonlyArray<Category> = ['Idle', 'Expressions', 'Work', 'Dance', 'Archive'];
    for (const animation of ANIMATIONS) expect(known).toContain(animation.category);
  });
});
