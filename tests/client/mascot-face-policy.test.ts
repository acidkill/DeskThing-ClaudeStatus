// Face-policy guards: the mascot's expression must match the state it reports.
//
// The v1 face rhythm was ported literally and read as instability. Measured on
// that catalogue, idle changed expression every 608 ms and cycled through nine
// of the twelve faces, `surprise` and `excited` among them — peak emotions while
// the mascot was meant to be resting.
//
// FACE_POLICY in src/mascot/animations.ts is the corrective contract. These
// tests are what make it a contract rather than a comment: without them nothing
// stops the next edit from putting `excited` back into an idle clip, and the
// build would stay perfectly green while the mascot went manic again.

import { describe, expect, it } from 'vitest';

import {
  ANIMATIONS,
  FACE_POLICY,
  animationsForMood,
  moodsForAnimation,
  type MascotAnimation,
  type MoodFacePolicy,
} from '../../src/mascot/animations';
import type { Mood } from '../../shared/messages';

const MOODS: ReadonlyArray<Mood> = ['idle', 'active', 'busy', 'frantic'];

/**
 * Archive clips are reachable from no mood (v1 behaved the same way), so they
 * have no policy of their own. They are still held to `busy` — the closest state
 * semantically — so an unreachable clip cannot rot into something that would be
 * wrong the moment it were routed somewhere.
 */
const policyFor = (animation: MascotAnimation): MoodFacePolicy => {
  const mood = moodsForAnimation(animation)[0] ?? 'busy';
  return FACE_POLICY[mood];
};

const cycleMs = (animation: MascotAnimation): number =>
  animation.steps.reduce((total, step) => total + step.hold, 0);

const baseSteps = (
  animation: MascotAnimation,
  policy: MoodFacePolicy,
): ReadonlyArray<MascotAnimation['steps'][number]> =>
  animation.steps.filter((step) => !policy.punctuation.includes(step.expression));

describe('face policy: every clip stays inside its mood palette', () => {
  it.each(ANIMATIONS)('$id uses only expressions its mood allows', (animation) => {
    const policy = policyFor(animation);
    const allowed = [...policy.basePalette, ...policy.punctuation];
    for (const step of animation.steps) {
      expect(
        allowed,
        `${animation.id} uses '${step.expression}', which its mood does not allow`,
      ).toContain(step.expression);
    }
  });

  it.each(ANIMATIONS)('$id holds its base face long enough', (animation) => {
    const policy = policyFor(animation);
    for (const step of baseSteps(animation, policy)) {
      expect(
        step.hold,
        `${animation.id} holds '${step.expression}' for only ${step.hold}ms`,
      ).toBeGreaterThanOrEqual(policy.minBaseHoldMs);
    }
  });

  it.each(ANIMATIONS)('$id keeps punctuation brief', (animation) => {
    const policy = policyFor(animation);
    for (const step of animation.steps) {
      if (!policy.punctuation.includes(step.expression)) continue;
      expect(
        step.hold,
        `${animation.id} lingers on '${step.expression}' for ${step.hold}ms — that reads as a mood, not a gesture`,
      ).toBeLessThanOrEqual(policy.maxPunctuationMs);
    }
  });

  it.each(ANIMATIONS)('$id uses no more base faces than its mood permits', (animation) => {
    const policy = policyFor(animation);
    const distinct = new Set(baseSteps(animation, policy).map((step) => step.expression));
    expect(
      distinct.size,
      `${animation.id} cycles ${distinct.size} base faces (${[...distinct].join(', ')})`,
    ).toBeLessThanOrEqual(policy.maxBaseExpressions);
  });
});

describe('face policy: the resting states actually rest', () => {
  it('never changes the base face inside an idle clip', () => {
    // This is the whole point of the rework. In idle the face may blink, but the
    // expression underneath it must not change — that churn is what read as
    // "the mascot is unwell".
    const policy = FACE_POLICY.idle;
    for (const animation of animationsForMood('idle')) {
      const bases = new Set(baseSteps(animation, policy).map((step) => step.expression));
      expect(bases.size, `${animation.id} changes face while idle`).toBe(1);
    }
  });

  it('keeps base-face changes per minute inside the declared budget', () => {
    // Punctuation is excluded on purpose: a blink returns to the same face, so a
    // viewer does not read it as an emotional change. What is counted here is
    // what a viewer actually perceives.
    const budget: Record<Mood, number> = {
      idle: 1, // zero within a clip; only a clip swap can change the face
      active: 1,
      busy: 40,
      frantic: 400, // fast on purpose — this is the alarm state
    };

    for (const mood of MOODS) {
      const policy = FACE_POLICY[mood];
      let changes = 0;
      let totalMs = 0;

      for (const animation of animationsForMood(mood)) {
        totalMs += cycleMs(animation);
        const sequence = baseSteps(animation, policy).map((step) => step.expression);
        for (let i = 0; i < sequence.length; i += 1) {
          if (sequence[i] !== sequence[(i + 1) % sequence.length]) changes += 1;
        }
      }

      const perMinute = changes / (totalMs / 60_000);
      expect(
        perMinute,
        `${mood} changes its base face ${perMinute.toFixed(1)}x/min, over its ${budget[mood]} budget`,
      ).toBeLessThanOrEqual(budget[mood]);
    }
  });

  it('keeps peak-energy faces out of the resting moods', () => {
    // The specific regression this prevents: idle_strawberry ran
    // neutral -> surprise -> happy -> focus -> excited -> happy inside 3.5s.
    const peak = ['excited', 'dizzy'] as const;
    for (const mood of ['idle', 'active', 'busy'] as const) {
      const policy = FACE_POLICY[mood];
      const allowed = [...policy.basePalette, ...policy.punctuation];
      for (const face of peak) {
        expect(allowed, `'${face}' must not be reachable in '${mood}'`).not.toContain(face);
      }
    }
  });

  it('still lets frantic run hot', () => {
    // Guards the opposite failure: calming every mood would flatten the one state
    // the user most needs to notice.
    const policy = FACE_POLICY.frantic;
    expect(policy.basePalette).toContain('excited');
    expect(policy.minBaseHoldMs).toBeLessThan(FACE_POLICY.busy.minBaseHoldMs);
    const fastest = Math.min(
      ...animationsForMood('frantic').flatMap((animation) =>
        animation.steps.map((step) => step.hold),
      ),
    );
    expect(fastest, 'frantic has been slowed to a resting cadence').toBeLessThan(400);
  });
});

describe('face policy: the policy table itself is coherent', () => {
  it.each(MOODS)('%s declares a usable policy', (mood) => {
    const policy = FACE_POLICY[mood];
    expect(policy.basePalette.length).toBeGreaterThan(0);
    expect(policy.maxBaseExpressions).toBeGreaterThanOrEqual(1);
    expect(policy.maxPunctuationMs).toBeLessThan(policy.minBaseHoldMs);
    // A face cannot be both a state and a gesture in the same mood.
    for (const face of policy.punctuation) {
      expect(policy.basePalette, `'${face}' is both base and punctuation in ${mood}`).not.toContain(
        face,
      );
    }
  });

  it('orders the moods from calmest to most urgent', () => {
    expect(FACE_POLICY.idle.minBaseHoldMs).toBeGreaterThan(FACE_POLICY.active.minBaseHoldMs);
    expect(FACE_POLICY.active.minBaseHoldMs).toBeGreaterThan(FACE_POLICY.busy.minBaseHoldMs);
    expect(FACE_POLICY.busy.minBaseHoldMs).toBeGreaterThan(FACE_POLICY.frantic.minBaseHoldMs);
  });
});
