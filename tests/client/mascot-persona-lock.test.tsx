// Component-level guards for the mascot rig.
//
// The user's hard requirement is that every animation and every frame keeps the
// mascot's persona: "pamietaj, ze kazda animacja i grafika ma zachowywac
// 'persone' maskotki". Mechanically that means CASING_PATHS + SCREEN_PATHS come
// out of MascotSprite byte-identical no matter which of the 20 clips is playing,
// which expression the face track is on, or whether the prop layer is drawn.
// Until now nothing enforced that automatically.
//
// MascotSprite picks its clip from `animationsForMood` and exposes no prop to
// force one, so the module is mocked: `stub.list` overrides the candidate list
// when set, and falls through to the real resolver when null. That lets a single
// clip — real or synthesised — be driven through the component's actual render
// path, rather than re-implementing the draw order in the test.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Mood } from '../../shared/messages';
import type { MascotAnimation, Motion } from '../../src/mascot/animations';
import { FACES, type Expression } from '../../src/mascot/faces';

const stub = vi.hoisted(() => ({ list: null as ReadonlyArray<MascotAnimation> | null }));

vi.mock('../../src/mascot/animations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/mascot/animations')>();
  return {
    ...actual,
    animationsForMood: (mood: Mood): ReadonlyArray<MascotAnimation> =>
      stub.list ?? actual.animationsForMood(mood),
  };
});

const { ANIMATIONS, animationsForMood } = await import('../../src/mascot/animations');
const { CASING_PATHS, SCREEN_PATHS } = await import('../../src/mascot/casing');
const { MascotSprite } = await import('../../src/mascot/MascotSprite');

type MediaStub = {
  matches: boolean;
  addEventListener: () => void;
  removeEventListener: () => void;
};
type WindowStub = { matchMedia: (query: string) => MediaStub };

const setReduceMotion = (matches: boolean): void => {
  const window: WindowStub = {
    matchMedia: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  };
  (globalThis as unknown as { window?: WindowStub }).window = window;
};

afterEach(() => {
  stub.list = null;
  delete (globalThis as unknown as { window?: WindowStub }).window;
});

const MOODS: ReadonlyArray<Mood> = ['idle', 'active', 'busy', 'frantic'];

/** Render one specific clip through the real component. */
const renderClip = (animation: MascotAnimation, mood: Mood = 'idle'): string => {
  stub.list = [animation];
  return renderToStaticMarkup(<MascotSprite mood={mood} />);
};

/**
 * The locked block, rebuilt from the generated constants with the same JSX shape
 * MascotSprite emits. Comparing against a reconstruction rather than against a
 * slice of the first render means a change to casing.ts is picked up as a change
 * everywhere at once instead of silently rebasing the expectation.
 */
const LOCKED_BLOCK = renderToStaticMarkup(
  <g>
    {CASING_PATHS.map((path, index) => (
      <path key={`casing-${index}`} d={path.d} fill={path.fill} />
    ))}
    {SCREEN_PATHS.map((path, index) => (
      <path key={`screen-${index}`} d={path.d} fill={path.fill} />
    ))}
  </g>,
).replace(/^<g>|<\/g>$/g, '');

const occurrences = (haystack: string, needle: string): number => {
  let count = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    count += 1;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return count;
};

const sha = (value: string): string => createHash('sha256').update(value).digest('hex');

// ---------------------------------------------------------------------------
// Extraction, not reconstruction.
//
// The previous version of the lock hashed LOCKED_BLOCK inside the render loop.
// LOCKED_BLOCK is a module-level constant, so the hash set could only ever hold
// one entry — the assertion passed regardless of what the component emitted. It
// proved nothing.
//
// What follows pulls the casing+screen markup OUT of each render and compares
// those extractions against each other. The selector is structural, not
// content-based, so it cannot smuggle the expected answer in: MascotSprite emits
// casing and screen paths as `<path d fill>` and nothing else that way — face
// glyphs carry `d` alone (stroke lives on their parent <g>), and every prop path
// goes through renderPropPaths, which always adds strokeLinecap/strokeLinejoin.
// The per-render count assertion re-verifies that invariant on every clip, so if
// a future prop is ever authored without a stroke the guard fails loudly instead
// of quietly widening.
// ---------------------------------------------------------------------------

type SvgPath = { readonly raw: string; readonly attrs: ReadonlyMap<string, string> };

const pathTags = (html: string): ReadonlyArray<SvgPath> =>
  [...html.matchAll(/<path\b[^>]*>/g)].map((match) => {
    const raw = match[0];
    const attrs = new Map<string, string>();
    for (const attr of raw.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attrs.set(attr[1] ?? '', attr[2] ?? '');
    }
    return { raw, attrs };
  });

const isLockedPath = (path: SvgPath): boolean => [...path.attrs.keys()].join(',') === 'd,fill';

const LOCKED_COUNT = CASING_PATHS.length + SCREEN_PATHS.length;

/** The casing+screen paths as MascotSprite actually rendered them. */
const extractLocked = (html: string, label: string): ReadonlyArray<SvgPath> => {
  const locked = pathTags(html).filter(isLockedPath);
  expect(
    locked.length,
    `${label}: rendered ${locked.length} locked <path d fill> elements, expected ${LOCKED_COUNT}`,
  ).toBe(LOCKED_COUNT);
  return locked;
};

const extractedBlockHash = (html: string, label: string): string =>
  sha(
    extractLocked(html, label)
      .map((path) => path.raw)
      .join(''),
  );

describe('persona lock: the casing + screen block is byte-identical everywhere', () => {
  it('reconstructs a non-trivial block from the generated constants', () => {
    expect(CASING_PATHS.length).toBeGreaterThan(0);
    expect(SCREEN_PATHS.length).toBeGreaterThan(0);
    expect(LOCKED_BLOCK.length).toBeGreaterThan(1000);
  });

  it('extracts the generated casing then screen paths, in order, from a real render', () => {
    // Anchors the structural selector to the generated art: if this drifts, every
    // cross-render comparison below is comparing the wrong thing.
    setReduceMotion(false);
    const base = ANIMATIONS[0];
    expect(base).toBeDefined();
    if (base === undefined) return;

    const locked = extractLocked(renderClip(base), 'reference render');
    const expected = [...CASING_PATHS, ...SCREEN_PATHS];
    expect(locked.map((path) => path.attrs.get('d'))).toEqual(expected.map((path) => path.d));
    expect(locked.map((path) => path.attrs.get('fill'))).toEqual(expected.map((path) => path.fill));
  });

  it('emits one identical EXTRACTED block for all 20 clips, reduced or not', () => {
    expect(ANIMATIONS.length).toBe(20);

    const hashes = new Map<string, string[]>();
    let renders = 0;

    for (const reduce of [false, true]) {
      setReduceMotion(reduce);
      for (const animation of ANIMATIONS) {
        const label = `${animation.id} (reduce=${reduce})`;
        const hash = extractedBlockHash(renderClip(animation), label);
        hashes.set(hash, [...(hashes.get(hash) ?? []), label]);
        renders += 1;
      }
    }

    expect(renders).toBe(40);
    expect(
      [...hashes.values()].map((labels) => labels.slice(0, 3)),
      'the casing+screen markup branches per animation — the persona lock is broken',
    ).toHaveLength(1);
  });

  it('emits the same extracted block on every frame of the face track', () => {
    setReduceMotion(false);
    const base = ANIMATIONS[0];
    expect(base).toBeDefined();
    if (base === undefined) return;

    const expressions = Object.keys(FACES) as ReadonlyArray<Expression>;
    expect(expressions.length).toBe(12);

    const hashes = new Set<string>();
    for (const expression of expressions) {
      const html = renderClip({ ...base, steps: [{ expression, hold: 400 }] });
      hashes.add(extractedBlockHash(html, `frame '${expression}'`));
      expect(occurrences(html, LOCKED_BLOCK), `frame '${expression}'`).toBe(1);
      // The face layer is the only thing allowed to differ, and it must actually
      // differ — otherwise this test would pass on a rig that never draws a face.
      const glyphs = FACES[expression];
      expect(glyphs.length).toBeGreaterThan(0);
      for (const d of glyphs) expect(html).toContain(`d="${d}"`);
    }
    expect(hashes.size, 'the face track moved the casing').toBe(1);
  });

  it('emits the same extracted block for every prop-carrying clip', () => {
    setReduceMotion(false);
    const withProps = ANIMATIONS.filter((animation) => animation.prop !== undefined);
    expect(withProps.length).toBeGreaterThanOrEqual(8);

    const hashes = new Set<string>();
    for (const animation of withProps) {
      hashes.add(extractedBlockHash(renderClip(animation), `${animation.id} with prop`));
    }
    expect(hashes.size, 'a prop layer changed the casing markup').toBe(1);
  });
});

describe('motion table: every Motion maps to a utility that exists in tailwind.config.js', () => {
  // Compile-time exhaustiveness. Adding a member to the Motion union without
  // listing it here fails `tsc`, which is one of the gates.
  const MOTION_MEMBERS: Record<Motion, true> = {
    still: true,
    breathe: true,
    bob: true,
    walk: true,
    jump: true,
    sway: true,
    bounce: true,
    shake: true,
    lean: true,
    nod: true,
  };
  const ALL_MOTIONS = Object.keys(MOTION_MEMBERS) as ReadonlyArray<Motion>;

  type TailwindConfig = {
    readonly content?: ReadonlyArray<string>;
    readonly theme?: {
      readonly extend?: {
        readonly animation?: Record<string, string>;
        readonly keyframes?: Record<string, unknown>;
      };
    };
  };

  const loadTailwindConfig = async (): Promise<TailwindConfig> => {
    // Non-literal specifier on purpose: tailwind.config.js is plain JS outside the
    // typechecked project, so a static import would need `allowJs`.
    const specifier = new URL('../../tailwind.config.js', import.meta.url).href;
    const module: unknown = await import(/* @vite-ignore */ specifier);
    const exported = (module as { default?: unknown }).default;
    if (exported === null || typeof exported !== 'object') {
      throw new Error('tailwind.config.js has no default-exported object');
    }
    return exported as TailwindConfig;
  };

  const spriteSource = readFileSync(
    new URL('../../src/mascot/MascotSprite.tsx', import.meta.url),
    'utf8',
  );

  /** The class the component actually puts on the motion group for this Motion. */
  const renderedMotionClasses = (motion: Motion): ReadonlyArray<string> => {
    setReduceMotion(false);
    const base = ANIMATIONS[0];
    if (base === undefined) throw new Error('ANIMATIONS is empty');
    const html = renderClip({ ...base, motion });
    return [...html.matchAll(/class="([^"]*)"/g)]
      .map((match) => match[1] ?? '')
      .flatMap((value) => value.split(/\s+/))
      .filter((name) => name.startsWith('animate-'));
  };

  it('covers every Motion union member', () => {
    expect(ALL_MOTIONS.length).toBe(10);
    const used = new Set(ANIMATIONS.map((animation) => animation.motion));
    for (const motion of used) expect(ALL_MOTIONS).toContain(motion);
  });

  it('resolves each non-still Motion to a declared tailwind animation + keyframe', async () => {
    const config = await loadTailwindConfig();
    const animations = config.theme?.extend?.animation ?? {};
    const keyframes = config.theme?.extend?.keyframes ?? {};
    expect(Object.keys(animations).length).toBeGreaterThan(0);
    expect(Object.keys(keyframes).length).toBeGreaterThan(0);

    for (const motion of ALL_MOTIONS) {
      const classes = renderedMotionClasses(motion);

      if (motion === 'still') {
        expect(classes, "'still' deliberately maps to no utility").toEqual([]);
        continue;
      }

      expect(classes, `motion '${motion}' rendered no animate-* class`).toHaveLength(1);
      const className = classes[0] ?? '';
      const utility = className.slice('animate-'.length);

      const declaration = animations[utility];
      expect(
        declaration,
        `'${className}' is not declared in tailwind.config.js theme.extend.animation`,
      ).toBeDefined();
      expect(typeof declaration).toBe('string');

      const keyframeName = (declaration ?? '').trim().split(/\s+/)[0] ?? '';
      expect(
        Object.keys(keyframes),
        `animation '${utility}' references keyframe '${keyframeName}', which is not declared`,
      ).toContain(keyframeName);

      // A class assembled at runtime would resolve here but be purged from the
      // built CSS, because Tailwind only scans source text.
      expect(
        spriteSource.includes(className),
        `'${className}' must appear as a literal in MascotSprite.tsx or Tailwind purges it`,
      ).toBe(true);
    }
  });

  it('keeps MascotSprite.tsx inside the tailwind content globs', async () => {
    const config = await loadTailwindConfig();
    expect(config.content ?? []).toContain('./src/**/*.{js,ts,jsx,tsx}');
  });
});

describe('reduced motion: the rig stops moving, it does not just slow down', () => {
  it('drops the body motion class for every clip under reduce, and keeps it otherwise', () => {
    for (const animation of ANIMATIONS) {
      setReduceMotion(true);
      expect(renderClip(animation), `${animation.id} under reduce`).not.toContain('animate-motion-');

      setReduceMotion(false);
      const full = renderClip(animation);
      if (animation.motion === 'still') {
        expect(full, `${animation.id} is 'still'`).not.toContain('animate-motion-');
      } else {
        expect(full, `${animation.id} without reduce`).toContain(`animate-motion-${animation.motion}`);
      }
    }
  });

  it('schedules no repeating timer for any clip or mood under reduce', async () => {
    const { clipRotationIntervalMs, shouldRunFaceTrack } = await import('../../src/mascot/motion');

    for (const mood of MOODS) {
      const count = animationsForMood(mood).length;
      for (const rotateSec of [1, 8, 20, 600]) {
        expect(clipRotationIntervalMs(count, rotateSec, true), `${mood} @${rotateSec}s`).toBeNull();
      }
      expect(clipRotationIntervalMs(count, 8, false)).toBe(8000);
    }

    for (const animation of ANIMATIONS) {
      expect(shouldRunFaceTrack(animation.steps.length, true), animation.id).toBe(false);
      // Control: the same clip does animate when the user has not asked for reduce.
      expect(shouldRunFaceTrack(animation.steps.length, false), animation.id).toBe(
        animation.steps.length >= 2,
      );
    }
  });

  it('renders a complete sprite under reduce — reduce must not blank the rig', () => {
    setReduceMotion(true);
    for (const mood of MOODS) {
      const html = renderToStaticMarkup(<MascotSprite mood={mood} />);
      expect(html.startsWith('<svg')).toBe(true);
      expect(html).toContain(LOCKED_BLOCK);
    }
  });
});

describe('no blank frame: a mood downshift never renders null', () => {
  it('never resolves a mood to an empty candidate list', () => {
    for (const mood of MOODS) {
      expect(animationsForMood(mood).length, mood).toBeGreaterThan(0);
    }
  });

  it('clamps a cursor carried from any mood into any other mood', () => {
    // The defect: the cursor lived in state and was reset by a post-paint effect,
    // so the commit that first rendered the shorter list still used the old index
    // and `candidates[i]` came back undefined -> `return null` -> one blank frame.
    // The fix clamps during render; this asserts the arithmetic for every pair.
    // Deliberately not an exact count. The per-mood sizes are pinned once, in
    // mascot-catalogue.test.ts; duplicating them here only made this test go red
    // whenever the catalogue legitimately changed. What this test actually needs
    // is that the moods differ in length, so a cursor CAN overrun a shorter list.
    const lengths = MOODS.map((mood) => animationsForMood(mood).length);
    const longest = Math.max(...lengths);
    expect(
      longest,
      'every mood is the same length — a stale cursor could never overrun, so this proves nothing',
    ).toBeGreaterThan(Math.min(...lengths));

    for (const from of MOODS) {
      const fromList = animationsForMood(from);
      for (const to of MOODS) {
        const toList = animationsForMood(to);
        for (let cursor = 0; cursor < fromList.length; cursor += 1) {
          const clamped = toList.length > 0 ? cursor % toList.length : 0;
          expect(toList[clamped], `${from}[${cursor}] -> ${to}`).toBeDefined();
        }
      }
    }
  });

  it('renders a non-empty svg for every mood and every candidate-list length', () => {
    setReduceMotion(false);
    for (const mood of MOODS) {
      const html = renderToStaticMarkup(<MascotSprite mood={mood} />);
      expect(html.startsWith('<svg'), mood).toBe(true);
      expect(html).toContain(LOCKED_BLOCK);
    }

    for (let length = 1; length <= ANIMATIONS.length; length += 1) {
      stub.list = ANIMATIONS.slice(0, length);
      const html = renderToStaticMarkup(<MascotSprite mood="frantic" />);
      expect(html.startsWith('<svg'), `candidate list of ${length}`).toBe(true);
    }
  });
});
