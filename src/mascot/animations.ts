// Declarative animation catalogue for the v2 vector mascot.
//
// An animation never touches the casing: CASING_PATHS / SCREEN_PATHS are emitted
// identically for every entry. Only three things vary — the LED face track
// (`steps`), the body motion transform (`motion`) and an optional prop layer
// (`prop`). That is what keeps the mascot's persona intact across all 20 clips.
//
// Ids, names and categories are carried over unchanged from the v1 pixel sprites
// in assets/mascot/, and each `description` preserves the depicted subject of the
// v1 sprite it replaces.
//
// FACE TRACKS: one base expression, punctuated.
//
// The v1 rhythm was ported literally and it read badly. Measured on the previous
// catalogue, idle changed expression every 608 ms and cycled through nine of the
// twelve faces — including `surprise` and `excited`, i.e. peak emotions while the
// mascot was supposed to be resting. idle_strawberry alone ran
// neutral → surprise → happy → focus → excited → happy inside 3.5 s. The mascot
// read as unstable rather than alive.
//
// The rule now is: a clip holds ONE base expression, long, and only punctuation
// interrupts it. Punctuation is a gesture, not a mood — a blink, a wink, a brief
// startle — and it returns to the same base, so it does not read as an emotional
// change. Personality is carried by the prop and the body motion instead of by
// the face. FACE_POLICY below states the allowed palette, the minimum base hold
// and the maximum number of base expressions per mood, and the client tests
// enforce all three, so this cannot decay back into a carousel.
//
// `frantic` deliberately keeps fast, wide-ranging faces: at 90%+ utilisation the
// high-energy read IS the correct signal, and calming it would flatten the one
// state the user most needs to notice.
//
// Cycle length is no longer capped near the rotation window. A clip now runs
// 2.8-8.7 s and `splashRotateSec` (default 20 s) lets it loop two or three times
// before the next clip. A clip that does not finish its loop is fine — every
// frame of it is on-state by construction.
//
// DISTINCT OPENINGS: MascotSprite restarts the face track from step 0 on every
// clip swap and the motion transform is a CSS animation that begins at identity,
// so the only thing visible at the instant of a swap is
// (step-0 expression, prop, motion). An earlier pass forced a unique step-0
// EXPRESSION on every clip to make swaps visible; that maximised face variety
// inside a mood and is exactly what made idle feel manic. The contract is now the
// weaker, sufficient one — the (expression, prop, motion) triple is unique — so
// rotation stays visible while several clips share a calm base face.
//
// A description states only what this rig can actually render — the LED face,
// the prop layer and the body transform. v1 posed arms and legs frame by frame;
// here the limbs live inside the frozen casing, so no description may promise a
// limb action (a hand raised, a head scratched, a key tapped). For the same
// reason nothing references an antenna: the v1 robot had one, the v2 casing does
// not — it has two side-mounted ear lenses instead.

import type { Mood } from '../../shared/messages';
import type { Expression } from './faces';
import type { PropId } from './props';

export type Category = 'Idle' | 'Expressions' | 'Work' | 'Dance' | 'Archive';

export type Motion =
  | 'still'
  | 'breathe'
  | 'bob'
  | 'walk'
  | 'jump'
  | 'sway'
  | 'bounce'
  | 'shake'
  | 'lean'
  | 'nod';

/** One beat of the LED face track. `hold` is milliseconds. */
export type Step = { readonly expression: Expression; readonly hold: number };

export type MascotAnimation = {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  readonly description: string;
  readonly motion: Motion;
  readonly prop?: PropId;
  /**
   * Explicit mood routing. Omitted for every clip whose v1 category already
   * places it correctly (see CATEGORY_MOODS); set only where the category and
   * the mood the clip actually belongs to disagree.
   */
  readonly moods?: ReadonlyArray<Mood>;
  readonly steps: ReadonlyArray<Step>;
};

/**
 * What a mood is allowed to put on the mascot's face, and for how long.
 *
 * This is a contract, not documentation: the client tests check every clip
 * against the policy of each mood it can be shown in.
 */
export type MoodFacePolicy = {
  /** Expressions that may be HELD as a clip's resting face in this mood. */
  readonly basePalette: ReadonlyArray<Expression>;
  /** Brief gestures that interrupt the base and return to it; exempt from minBaseHoldMs. */
  readonly punctuation: ReadonlyArray<Expression>;
  /** Floor for any non-punctuation hold, in milliseconds. */
  readonly minBaseHoldMs: number;
  /** Ceiling for any punctuation hold, in milliseconds. */
  readonly maxPunctuationMs: number;
  /** How many DISTINCT base expressions one clip may use. */
  readonly maxBaseExpressions: number;
};

export const FACE_POLICY: Record<Mood, MoodFacePolicy> = {
  // Resting. One calm face, held for seconds, blinking. Nothing else.
  idle: {
    basePalette: ['neutral', 'happy', 'focus', 'sleep'],
    punctuation: ['blink'],
    minBaseHoldMs: 3500,
    maxPunctuationMs: 200,
    maxBaseExpressions: 1,
  },
  // Light work. Still calm, but a wink or a brief start is in character.
  active: {
    basePalette: ['happy', 'neutral', 'focus'],
    punctuation: ['blink', 'wink', 'surprise'],
    minBaseHoldMs: 2000,
    maxPunctuationMs: 500,
    maxBaseExpressions: 2,
  },
  // Heads-down work. Concentration, and it may shift between two faces.
  busy: {
    basePalette: ['focus', 'think', 'neutral'],
    punctuation: ['blink'],
    minBaseHoldMs: 900,
    maxPunctuationMs: 200,
    maxBaseExpressions: 2,
  },
  // Near the limit. Fast and wide-ranging ON PURPOSE — this is the alarm state.
  frantic: {
    basePalette: [
      'excited',
      'happy',
      'focus',
      'dizzy',
      'wink',
      'surprise',
      'lookLeft',
      'lookRight',
      'neutral',
    ],
    punctuation: ['blink'],
    minBaseHoldMs: 140,
    // Must stay under minBaseHoldMs: at this cadence a 200ms "blink" would
    // outlast the faces around it and stop reading as punctuation at all.
    maxPunctuationMs: 130,
    maxBaseExpressions: 9,
  },
};

export const ANIMATIONS: ReadonlyArray<MascotAnimation> = [
  // ---------------------------------------------------------------- Idle ---
  {
    id: 'idle_breathe',
    name: 'idle breathe',
    category: 'Idle',
    description: 'Robot stands and breathes; the whole body swells and settles between beats.',
    motion: 'breathe',
    steps: [
      { expression: 'happy', hold: 4200 },
      { expression: 'blink', hold: 110 },
      { expression: 'happy', hold: 3800 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'idle_blink',
    name: 'idle blink',
    category: 'Idle',
    description: 'Robot stands still, eye-LEDs steady; they blink off momentarily.',
    motion: 'still',
    steps: [
      { expression: 'neutral', hold: 3600 },
      { expression: 'blink', hold: 110 },
      { expression: 'neutral', hold: 3600 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'idle_look_around',
    name: 'idle look around',
    category: 'Idle',
    description: 'Robot sways slowly from side to side, taking the room in.',
    motion: 'sway',
    steps: [
      { expression: 'neutral', hold: 4000 },
      { expression: 'blink', hold: 110 },
      { expression: 'neutral', hold: 3700 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'idle_strawberry',
    name: 'idle strawberry',
    category: 'Idle',
    description: 'Robot leans towards a power token at its side, content to have it there.',
    motion: 'lean',
    prop: 'strawberry',
    steps: [
      { expression: 'happy', hold: 4000 },
      { expression: 'blink', hold: 110 },
      { expression: 'happy', hold: 3600 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'idle_bubbles',
    name: 'idle bubbles',
    category: 'Idle',
    description: 'Robot puffs out status-ping bubbles that float up past its right ear.',
    motion: 'breathe',
    prop: 'bubbles',
    steps: [
      { expression: 'happy', hold: 3800 },
      { expression: 'blink', hold: 110 },
      { expression: 'happy', hold: 4200 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'idle_reading',
    name: 'idle reading',
    category: 'Idle',
    description: 'Robot holds an open data panel and reads it, eye-LEDs settled on the page.',
    motion: 'still',
    prop: 'book',
    steps: [
      { expression: 'focus', hold: 4200 },
      { expression: 'blink', hold: 110 },
      { expression: 'focus', hold: 3800 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'idle_scratch_head',
    name: 'idle scratch head',
    category: 'Idle',
    description: 'Robot shakes its head over a puzzle, eye-LEDs narrowed in thought.',
    motion: 'shake',
    steps: [
      { expression: 'focus', hold: 3600 },
      { expression: 'blink', hold: 110 },
      { expression: 'focus', hold: 4000 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'idle_walk',
    name: 'idle walk',
    category: 'Idle',
    description: 'Robot strolls left and right, rocking with each step.',
    motion: 'walk',
    steps: [
      { expression: 'happy', hold: 3500 },
      { expression: 'blink', hold: 110 },
      { expression: 'happy', hold: 3500 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'idle_jump_rope',
    name: 'idle jump rope',
    category: 'Idle',
    description: 'Bored robot produces a jump rope and starts skipping.',
    motion: 'jump',
    prop: 'rope',
    steps: [
      { expression: 'happy', hold: 3700 },
      { expression: 'blink', hold: 110 },
      { expression: 'happy', hold: 3900 },
      { expression: 'blink', hold: 110 },
    ],
  },

  // --------------------------------------------------------- Expressions ---
  {
    id: 'expression_wink',
    name: 'expression wink',
    category: 'Expressions',
    description: 'Robot holds a steady smile and winks now and then.',
    motion: 'nod',
    steps: [
      { expression: 'happy', hold: 2800 },
      { expression: 'wink', hold: 280 },
      { expression: 'happy', hold: 2600 },
      { expression: 'wink', hold: 280 },
    ],
  },
  {
    id: 'expression_surprise',
    name: 'expression surprise',
    category: 'Expressions',
    description: 'Robot jolts with a brief wide-eyed start, then settles back.',
    motion: 'shake',
    steps: [
      { expression: 'neutral', hold: 2600 },
      { expression: 'surprise', hold: 420 },
      { expression: 'neutral', hold: 2400 },
      { expression: 'blink', hold: 130 },
    ],
  },
  {
    id: 'expression_sleep',
    name: 'expression sleep',
    category: 'Expressions',
    // v1 filed this under Expressions, which routes to the `active` mood — so an
    // actively-working session could show a SLEEPING mascot, inverting the one
    // signal the splash screen exists to carry. The category is kept for v1
    // parity; the routing is corrected here.
    moods: ['idle'],
    description: 'Robot dozes; eye-LEDs droop shut and the body breathes slowly.',
    motion: 'breathe',
    steps: [
      { expression: 'sleep', hold: 4400 },
      { expression: 'blink', hold: 140 },
      { expression: 'sleep', hold: 4000 },
      { expression: 'blink', hold: 140 },
    ],
  },

  // ---------------------------------------------------------------- Work ---
  {
    id: 'work_coding',
    name: 'work coding',
    category: 'Work',
    description: 'Robot works at an open laptop, head bobbing steadily over the keys.',
    motion: 'bob',
    prop: 'laptop',
    steps: [
      { expression: 'focus', hold: 1400 },
      { expression: 'blink', hold: 110 },
      { expression: 'focus', hold: 1200 },
      { expression: 'blink', hold: 110 },
    ],
  },
  {
    id: 'work_blackboard',
    name: 'work wand',
    category: 'Work',
    description: 'Robot waves a magic wand; a star bursts at the tip and sparkles scatter.',
    motion: 'sway',
    prop: 'blackboard',
    steps: [
      { expression: 'think', hold: 1300 },
      { expression: 'focus', hold: 1000 },
      { expression: 'think', hold: 1200 },
      { expression: 'blink', hold: 120 },
    ],
  },

  // --------------------------------------------------------------- Dance ---
  {
    id: 'dance_bounce',
    name: 'dance bounce',
    category: 'Dance',
    description: 'Robot bounces up and down to the beat, hitting the downbeat wide-eyed.',
    motion: 'bounce',
    steps: [
      { expression: 'excited', hold: 200 },
      { expression: 'happy', hold: 160 },
      { expression: 'excited', hold: 200 },
      { expression: 'happy', hold: 160 },
      { expression: 'excited', hold: 190 },
      { expression: 'happy', hold: 170 },
      { expression: 'excited', hold: 220 },
      { expression: 'blink', hold: 120 },
    ],
  },
  {
    id: 'dance_sway',
    name: 'dance sway',
    category: 'Dance',
    description: 'Robot sways left and right to the beat, eye-LEDs spiralling on the first beat.',
    motion: 'sway',
    steps: [
      { expression: 'dizzy', hold: 320 },
      { expression: 'lookLeft', hold: 220 },
      { expression: 'happy', hold: 290 },
      { expression: 'lookRight', hold: 220 },
      { expression: 'happy', hold: 320 },
      { expression: 'lookLeft', hold: 220 },
      { expression: 'happy', hold: 290 },
      { expression: 'lookRight', hold: 220 },
    ],
  },
  {
    id: 'dance_bounce_dj',
    name: 'dance bounce dj',
    category: 'Dance',
    description: 'Robot bounces with DJ headphones on.',
    motion: 'bounce',
    prop: 'djheadphones',
    steps: [
      { expression: 'excited', hold: 210 },
      { expression: 'focus', hold: 150 },
      { expression: 'excited', hold: 210 },
      { expression: 'happy', hold: 160 },
      { expression: 'excited', hold: 200 },
      { expression: 'focus', hold: 150 },
      { expression: 'excited', hold: 220 },
      { expression: 'happy', hold: 160 },
    ],
  },
  {
    id: 'dance_sway_dj',
    name: 'dance sway dj',
    category: 'Dance',
    description: 'Robot opens with a wink, then sways side-to-side with DJ headphones on.',
    motion: 'sway',
    prop: 'djheadphones',
    steps: [
      { expression: 'wink', hold: 330 },
      { expression: 'happy', hold: 230 },
      { expression: 'excited', hold: 330 },
      { expression: 'happy', hold: 230 },
      { expression: 'excited', hold: 310 },
      { expression: 'happy', hold: 160 },
    ],
  },
  {
    id: 'dance_djmix',
    name: 'dance djmix',
    category: 'Dance',
    description: 'Robot DJs at the turntable in headphones, head shaking over the platters.',
    motion: 'shake',
    prop: 'djdeck',
    steps: [
      { expression: 'focus', hold: 200 },
      { expression: 'excited', hold: 150 },
      { expression: 'focus', hold: 200 },
      { expression: 'dizzy', hold: 140 },
      { expression: 'excited', hold: 220 },
      { expression: 'happy', hold: 170 },
      { expression: 'excited', hold: 200 },
      { expression: 'wink', hold: 140 },
    ],
  },

  // ------------------------------------------------------------- Archive ---
  {
    id: 'work_think',
    name: 'work think',
    category: 'Archive',
    description: 'Robot pauses to compute; a thought bubble hangs by its head. Archived sprite.',
    motion: 'still',
    prop: 'thought',
    steps: [
      { expression: 'think', hold: 1400 },
      { expression: 'blink', hold: 120 },
      { expression: 'think', hold: 1200 },
      { expression: 'focus', hold: 1000 },
    ],
  },
];

/**
 * Which mood each v1 category belongs to. `Archive` maps to nothing: v1 reached
 * it from no mood either, and that is preserved deliberately.
 */
const CATEGORY_MOODS: Record<Category, ReadonlyArray<Mood>> = {
  Idle: ['idle'],
  Expressions: ['active'],
  Work: ['busy'],
  Dance: ['frantic'],
  Archive: [],
};

/** The moods a clip may actually be shown in — its override, or its category's default. */
export const moodsForAnimation = (animation: MascotAnimation): ReadonlyArray<Mood> =>
  animation.moods ?? CATEGORY_MOODS[animation.category];

export const animationsForMood = (mood: Mood): ReadonlyArray<MascotAnimation> => {
  const hits = ANIMATIONS.filter((animation) => moodsForAnimation(animation).includes(mood));
  return hits.length > 0 ? hits : ANIMATIONS;
};
