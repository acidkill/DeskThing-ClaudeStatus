// Minimal SVG path geometry, written for the mascot guard tests.
//
// Nothing here is a general-purpose SVG engine: it supports exactly the command
// set the mascot art uses (M/L/C/Q/Z plus circular/elliptical arcs) and throws on
// anything else, so a new command sneaking into casing.ts or props.ts fails the
// suite loudly instead of being silently skipped and measured as "clear".

export type Point = { readonly x: number; readonly y: number };
export type Polyline = ReadonlyArray<Point>;
export type Rect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

const COMMAND = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
const NUMBER = /-?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;

/** Flattening resolution, in viewBox units. Curves are sampled at least this fine. */
const MAX_SEGMENT = 1.5;
const MIN_SAMPLES = 12;
const MAX_SAMPLES = 2048;

const readNumbers = (chunk: string): number[] => {
  const out: number[] = [];
  for (const match of chunk.matchAll(NUMBER)) out.push(Number(match[0]));
  return out;
};

const dist = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);

const sampleCount = (roughLength: number): number =>
  Math.min(MAX_SAMPLES, Math.max(MIN_SAMPLES, Math.ceil(roughLength / MAX_SEGMENT)));

const cubicAt = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + e * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + e * p3.y,
  };
};

const quadAt = (p0: Point, p1: Point, p2: Point, t: number): Point => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
};

const pushCubic = (out: Point[], p0: Point, p1: Point, p2: Point, p3: Point): void => {
  const n = sampleCount(dist(p0, p1) + dist(p1, p2) + dist(p2, p3));
  for (let i = 1; i <= n; i += 1) out.push(cubicAt(p0, p1, p2, p3, i / n));
};

const pushQuad = (out: Point[], p0: Point, p1: Point, p2: Point): void => {
  const n = sampleCount(dist(p0, p1) + dist(p1, p2));
  for (let i = 1; i <= n; i += 1) out.push(quadAt(p0, p1, p2, i / n));
};

/**
 * Endpoint -> centre parameterisation, per the SVG 1.1 implementation notes
 * (F.6.5 / F.6.6). The mascot only uses circular arcs, but doing the general
 * ellipse keeps the helper honest if the art ever changes.
 */
const pushArc = (
  out: Point[],
  p0: Point,
  rxIn: number,
  ryIn: number,
  xAxisDeg: number,
  largeArc: boolean,
  sweep: boolean,
  p1: Point,
): void => {
  if (rxIn === 0 || ryIn === 0 || (p0.x === p1.x && p0.y === p1.y)) {
    out.push(p1);
    return;
  }
  const phi = (xAxisDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx2 = (p0.x - p1.x) / 2;
  const dy2 = (p0.y - p1.y) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }

  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * (rx * y1p)) / ry;
  const cyp = (coef * -(ry * x1p)) / rx;
  const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number): number => {
    const sign = ux * vy - uy * vx < 0 ? -1 : 1;
    const dot = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    return sign * Math.acos(Math.min(1, Math.max(-1, dot)));
  };

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaTheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
  if (sweep && deltaTheta < 0) deltaTheta += 2 * Math.PI;

  const n = sampleCount(Math.abs(deltaTheta) * Math.max(rx, ry));
  for (let i = 1; i <= n; i += 1) {
    const theta = theta1 + (deltaTheta * i) / n;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    out.push({
      x: cosPhi * rx * cosT - sinPhi * ry * sinT + cx,
      y: sinPhi * rx * cosT + cosPhi * ry * sinT + cy,
    });
  }
};

const at = (values: ReadonlyArray<number>, index: number): number => {
  const value = values[index];
  if (value === undefined) throw new Error(`path: missing argument ${index}`);
  return value;
};

/**
 * Flatten a path's `d` into one polyline per subpath. Closed subpaths keep their
 * closing point, so callers can treat every returned polyline as a ring.
 */
export const flattenPath = (d: string): ReadonlyArray<Polyline> => {
  const subpaths: Point[][] = [];
  let current: Point[] | null = null;
  let cursor: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };

  for (const match of d.matchAll(COMMAND)) {
    const command = match[1] ?? '';
    const args = readNumbers(match[2] ?? '');
    const relative = command === command.toLowerCase();
    const rel = (x: number, y: number): Point =>
      relative ? { x: cursor.x + x, y: cursor.y + y } : { x, y };

    switch (command.toUpperCase()) {
      case 'M': {
        for (let i = 0; i < args.length; i += 2) {
          const next = rel(at(args, i), at(args, i + 1));
          if (i === 0) {
            current = [next];
            subpaths.push(current);
            start = next;
          } else {
            current?.push(next);
          }
          cursor = next;
        }
        break;
      }
      case 'L': {
        for (let i = 0; i < args.length; i += 2) {
          const next = rel(at(args, i), at(args, i + 1));
          current?.push(next);
          cursor = next;
        }
        break;
      }
      case 'C': {
        for (let i = 0; i < args.length; i += 6) {
          const c1 = rel(at(args, i), at(args, i + 1));
          const c2 = rel(at(args, i + 2), at(args, i + 3));
          const end = rel(at(args, i + 4), at(args, i + 5));
          if (current !== null) pushCubic(current, cursor, c1, c2, end);
          cursor = end;
        }
        break;
      }
      case 'Q': {
        for (let i = 0; i < args.length; i += 4) {
          const c1 = rel(at(args, i), at(args, i + 1));
          const end = rel(at(args, i + 2), at(args, i + 3));
          if (current !== null) pushQuad(current, cursor, c1, end);
          cursor = end;
        }
        break;
      }
      case 'A': {
        for (let i = 0; i < args.length; i += 7) {
          const end = rel(at(args, i + 5), at(args, i + 6));
          if (current !== null) {
            pushArc(
              current,
              cursor,
              at(args, i),
              at(args, i + 1),
              at(args, i + 2),
              at(args, i + 3) !== 0,
              at(args, i + 4) !== 0,
              end,
            );
          }
          cursor = end;
        }
        break;
      }
      case 'Z': {
        current?.push(start);
        cursor = start;
        break;
      }
      default:
        throw new Error(`path: unsupported command '${command}'`);
    }
  }

  return subpaths.filter((points) => points.length > 1);
};

const distanceToSegment = (p: Point, a: Point, b: Point): number => {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lengthSq = vx * vx + vy * vy;
  if (lengthSq === 0) return dist(p, a);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * vx + (p.y - a.y) * vy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
};

/** Shortest distance from a point to any edge of the rings. */
export const distanceToRings = (p: Point, rings: ReadonlyArray<Polyline>): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const ring of rings) {
    for (let i = 0; i + 1 < ring.length; i += 1) {
      const a = ring[i];
      const b = ring[i + 1];
      if (a === undefined || b === undefined) continue;
      const d = distanceToSegment(p, a, b);
      if (d < best) best = d;
    }
  }
  return best;
};

/** Even-odd ray cast against every ring, each implicitly closed. */
export const isPointInRings = (p: Point, rings: ReadonlyArray<Polyline>): boolean => {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (a === undefined || b === undefined) continue;
      if (a.y > p.y !== b.y > p.y) {
        const xAt = a.x + ((p.y - a.y) / (b.y - a.y)) * (b.x - a.x);
        if (p.x < xAt) inside = !inside;
      }
    }
  }
  return inside;
};

/**
 * Signed clearance from a point to a filled region: positive outside (distance to
 * the nearest edge), negative inside (depth past the nearest edge).
 */
export const signedClearance = (p: Point, rings: ReadonlyArray<Polyline>): number => {
  const d = distanceToRings(p, rings);
  return isPointInRings(p, rings) ? -d : d;
};

/** Distance from a point to a rect: 0 when the point is inside it. */
export const distanceToRect = (p: Point, rect: Rect): number => {
  const dx = Math.max(rect.x - p.x, 0, p.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - p.y, 0, p.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
};

export const boundsOf = (rings: ReadonlyArray<Polyline>): Rect => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const ring of rings) {
    for (const p of ring) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};
