// Geometric guards on the prop layer.
//
// Two prop defects shipped: `thought`'s trailing dots were sited inside the
// head's right profile, and the DJ headphone band crossed the temples. Both are
// persona-lock violations rather than cosmetic ones — every prop pixel that lands
// on the head is locked casing repainted in a prop's colour.
//
// The check is numeric, not raster: each prop path is flattened to a polyline,
// inflated by its stroke radius, and measured against (a) the face screen rect
// and (b) the head shell. A raster diff would need rsvg-convert/ImageMagick,
// which are not dependencies of this repo.

import { describe, expect, it } from 'vitest';

import { CASING_PATHS, SCREEN, type CasingPath } from '../../src/mascot/casing';
import { PROPS, type PropDef, type PropId, type PropPath } from '../../src/mascot/props';
import {
  boundsOf,
  distanceToRect,
  flattenPath,
  signedClearance,
  type Polyline,
  type Rect,
} from './svg-geometry';

const CASING_FILL = '#D97757';
const EAR_LENS_FILL = '#4A90E2';

const SCREEN_RECT: Rect = {
  x: SCREEN.x,
  y: SCREEN.y,
  width: SCREEN.width,
  height: SCREEN.height,
};

const areaOf = (rect: Rect): number => rect.width * rect.height;

const ringsWithFill = (fill: string): ReadonlyArray<Polyline> =>
  CASING_PATHS.filter((path: CasingPath) => path.fill === fill).flatMap((path) => [
    ...flattenPath(path.d),
  ]);

/**
 * The head shell: the largest casing-orange path. Selected by fill + area rather
 * than by index so reordering casing.ts (which is generated) cannot silently
 * point this at a knuckle.
 *
 * "Casing" is the orange shell specifically — props.ts and the rig brief both
 * define the palette that way (`const CASING = '#D97757'`). The ear lenses are a
 * separate element and are handled by HEAD_WITH_EARS below.
 */
const headShell = ((): ReadonlyArray<Polyline> => {
  const candidates = CASING_PATHS.filter((path: CasingPath) => path.fill === CASING_FILL)
    .map((path) => flattenPath(path.d))
    .map((rings) => ({ rings, area: areaOf(boundsOf(rings)) }));
  const best = candidates.reduce(
    (winner, entry) => (entry.area > winner.area ? entry : winner),
    candidates[0] ?? { rings: [] as ReadonlyArray<Polyline>, area: 0 },
  );
  return best.rings;
})();

/** Shell plus the two side-mounted ear lenses. */
const headWithEars: ReadonlyArray<Polyline> = [...headShell, ...ringsWithFill(EAR_LENS_FILL)];

type Sample = {
  readonly pathIndex: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** fill: 'none' — the path is a drawn line, not a filled body. */
  readonly strokeOnly: boolean;
};

/** Every flattened point of a prop, carrying its own stroke radius. */
const samplesOf = (def: PropDef): ReadonlyArray<Sample> => {
  const out: Sample[] = [];
  def.paths.forEach((path: PropPath, pathIndex) => {
    const r = (path.strokeWidth ?? 0) / 2;
    const strokeOnly = path.fill === 'none';
    for (const ring of flattenPath(path.d)) {
      for (const point of ring) out.push({ pathIndex, x: point.x, y: point.y, r, strokeOnly });
    }
  });
  return out;
};

/** Worst (most negative) clearance of a prop against a region, with its sample. */
const worstClearance = (
  samples: ReadonlyArray<Sample>,
  region: ReadonlyArray<Polyline>,
): { readonly clearance: number; readonly at: Sample | null } => {
  let clearance = Number.POSITIVE_INFINITY;
  let at: Sample | null = null;
  for (const sample of samples) {
    const value = signedClearance({ x: sample.x, y: sample.y }, region) - sample.r;
    if (value < clearance) {
      clearance = value;
      at = sample;
    }
  }
  return { clearance, at };
};

const PROP_IDS = Object.keys(PROPS) as ReadonlyArray<PropId>;

describe('prop geometry: the head shell is resolved before anything is measured', () => {
  it('picks the head, not a detail path', () => {
    expect(headShell.length).toBeGreaterThan(0);
    const bounds = boundsOf(headShell);
    // Documented head band from the rig brief: x 400..1648, y 215..1340.
    expect(bounds.x).toBeGreaterThan(390);
    expect(bounds.x).toBeLessThan(410);
    expect(bounds.y).toBeGreaterThan(205);
    expect(bounds.y).toBeLessThan(225);
    expect(bounds.x + bounds.width).toBeGreaterThan(1630);
    expect(bounds.x + bounds.width).toBeLessThan(1660);
    expect(bounds.y + bounds.height).toBeGreaterThan(1320);
    expect(bounds.y + bounds.height).toBeLessThan(1350);
  });

  it('resolves both ear lenses', () => {
    const ears = ringsWithFill(EAR_LENS_FILL);
    expect(ears.length).toBeGreaterThan(0);
    const bounds = boundsOf(ears);
    expect(bounds.width, 'the ear lenses should straddle the head').toBeGreaterThan(1400);
    expect(headWithEars.length).toBeGreaterThan(headShell.length);
  });

  it('flattens every prop into measurable geometry', () => {
    expect(PROP_IDS.length).toBe(9);
    for (const id of PROP_IDS) {
      expect(samplesOf(PROPS[id]).length, id).toBeGreaterThan(50);
    }
  });
});

describe('prop geometry: nothing may cover the face screen', () => {
  it.each(PROP_IDS)('%s clears the screen rect', (id) => {
    let worst = Number.POSITIVE_INFINITY;
    let worstAt: Sample | null = null;

    for (const sample of samplesOf(PROPS[id])) {
      const clearance = distanceToRect({ x: sample.x, y: sample.y }, SCREEN_RECT) - sample.r;
      if (clearance < worst) {
        worst = clearance;
        worstAt = sample;
      }
    }

    expect(
      worst,
      `prop '${id}' path[${worstAt?.pathIndex}] reaches within ${worst.toFixed(1)} units of the ` +
        `face screen (${SCREEN.x}..${SCREEN.x + SCREEN.width} x ${SCREEN.y}..${SCREEN.y + SCREEN.height})`,
    ).toBeGreaterThan(0);
  });
});

describe('prop geometry: a front-layer prop may not overpaint the head casing', () => {
  const frontIds = PROP_IDS.filter((id) => PROPS[id].layer === 'front');

  it('there are front-layer props to check', () => {
    expect(frontIds.length).toBeGreaterThanOrEqual(5);
  });

  it.each(frontIds)('%s stays outside the head shell', (id) => {
    const { clearance, at } = worstClearance(samplesOf(PROPS[id]), headShell);
    expect(
      clearance,
      `prop '${id}' path[${at?.pathIndex}] overlaps the head casing by ` +
        `${(-clearance).toFixed(1)} units at (${at?.x.toFixed(0)}, ${at?.y.toFixed(0)})`,
    ).toBeGreaterThanOrEqual(0);
  });

  // A stroked line laid across the head is never intentional — that is exactly how
  // the DJ headphone band shipped, arcing down over the temples and ears. A filled
  // prop body may legitimately sit on a head feature (an earcup covering an ear is
  // the whole point of an earcup), so the stricter shell+ears region is applied
  // only to fill:'none' paths.
  it.each(frontIds)('%s draws no line across the head or its ear lenses', (id) => {
    const strokes = samplesOf(PROPS[id]).filter((sample) => sample.strokeOnly);
    if (strokes.length === 0) return;

    const { clearance, at } = worstClearance(strokes, headWithEars);
    expect(
      clearance,
      `prop '${id}' path[${at?.pathIndex}] draws a line ${(-clearance).toFixed(1)} units into the ` +
        `head at (${at?.x.toFixed(0)}, ${at?.y.toFixed(0)})`,
    ).toBeGreaterThan(0);
  });

  it('behind-layer props are exempt by construction', () => {
    // Not an oversight: a behind-layer prop is painted under CASING_PATHS, so the
    // casing wins every overlapping pixel and the persona lock is unaffected.
    const behind = PROP_IDS.filter((id) => PROPS[id].layer === 'behind');
    expect(behind.length).toBeGreaterThan(0);
    for (const id of behind) expect(PROPS[id].attached).toBe(false);
  });
});

describe('prop geometry: props stay in the locked palette', () => {
  const PALETTE: ReadonlyArray<string> = ['#D97757', '#1F1F1F', '#7FD8F5', '#4A90E2', '#FFFFFF', 'none'];

  it.each(PROP_IDS)('%s introduces no new hue', (id) => {
    for (const path of PROPS[id].paths) {
      expect(PALETTE, `${id} fill`).toContain(path.fill);
      if (path.stroke !== undefined) expect(PALETTE, `${id} stroke`).toContain(path.stroke);
    }
  });
});
