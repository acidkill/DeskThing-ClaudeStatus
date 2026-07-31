import { useEffect, useState, type CSSProperties, type FC } from 'react';

import type { Mood } from '../../shared/messages';
import { animationsForMood, type MascotAnimation, type Motion } from './animations';
import { CASING_PATHS, SCREEN_PATHS, VIEW_BOX } from './casing';
import { FACES, LED_COLOR, LED_STROKE_WIDTH, type Expression } from './faces';
import {
  DEFAULT_ROTATE_SEC,
  INITIAL_FACE_CURSOR,
  RESTING_EXPRESSION,
  clipRotationIntervalMs,
  faceStepIndex,
  shouldRunFaceTrack,
  type FaceCursor,
} from './motion';
import { PROPS, type PropDef, type PropPath } from './props';

type Props = {
  mood: Mood;
  size?: number;
  rotateSec?: number;
};

const DEFAULT_SIZE = 360;
const MIN_HOLD_MS = 60;
const FALLBACK_HOLD_MS = 400;
const FALLBACK_EXPRESSION: Expression = 'neutral';

/**
 * Every Motion member maps to a Tailwind utility declared in tailwind.config.js.
 * 'still' deliberately maps to no class.
 */
const MOTION_CLASS: Record<Motion, string> = {
  still: '',
  breathe: 'animate-motion-breathe',
  bob: 'animate-motion-bob',
  walk: 'animate-motion-walk',
  jump: 'animate-motion-jump',
  sway: 'animate-motion-sway',
  bounce: 'animate-motion-bounce',
  shake: 'animate-motion-shake',
  lean: 'animate-motion-lean',
  nod: 'animate-motion-nod',
};

/**
 * SVG groups have no layout box, so the transform pivot has to be pinned to the
 * fill box explicitly — Tailwind's origin-* utilities alone would resolve
 * against the viewport-sized reference box and swing the rig off-canvas.
 */
const PIVOT_AT_FEET: CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: '50% 100%',
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const prefersReducedMotionNow = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
};

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState<boolean>(prefersReducedMotionNow);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (event: MediaQueryListEvent): void => setReduced(event.matches);
    setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
};

const propDefFor = (animation: MascotAnimation): PropDef | undefined =>
  animation.prop === undefined ? undefined : PROPS[animation.prop];

const renderPropPaths = (paths: ReadonlyArray<PropPath>, keyPrefix: string) =>
  paths.map((path, index) => (
    <path
      key={`${keyPrefix}-${index}`}
      d={path.d}
      fill={path.fill}
      stroke={path.stroke}
      strokeWidth={path.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));

export const MascotSprite: FC<Props> = ({
  mood,
  size = DEFAULT_SIZE,
  rotateSec = DEFAULT_ROTATE_SEC,
}) => {
  const candidates = animationsForMood(mood);
  const [animCursor, setAnimCursor] = useState(0);
  const [faceCursor, setFaceCursor] = useState<FaceCursor>(INITIAL_FACE_CURSOR);
  const reducedMotion = usePrefersReducedMotion();

  // Clamped DURING render, not in a post-paint effect. A mood downshift lands a
  // cursor from the previous (longer) candidate list on the commit that already
  // renders the shorter one; an effect-based reset runs too late and the sprite
  // would unmount for a frame, collapsing the surrounding flex layout.
  const animIdx = candidates.length > 0 ? animCursor % candidates.length : 0;
  const animation = candidates[animIdx];
  const steps = animation?.steps;
  const clipId = animation?.id ?? '';

  // Same during-render treatment for the face track's own cursor: a clip swap and
  // the face reset land in the same commit, so resetting in an effect paints one
  // frame of the outgoing clip's step index against the incoming clip's steps.
  const stepIdx = faceStepIndex(faceCursor, clipId, steps?.length ?? 0);

  const rotationMs = clipRotationIntervalMs(candidates.length, rotateSec, reducedMotion);

  useEffect(() => {
    if (rotationMs === null) return;
    const id = window.setInterval(
      () => setAnimCursor((i) => (i + 1) % candidates.length),
      rotationMs,
    );
    return () => window.clearInterval(id);
  }, [candidates.length, rotationMs]);

  useEffect(() => {
    if (steps === undefined) return;
    if (!shouldRunFaceTrack(steps.length, reducedMotion)) return;

    let cancelled = false;
    let timeoutId: number | null = null;
    let idx = 0;

    const tick = (): void => {
      if (cancelled) return;
      const hold = steps[idx]?.hold ?? FALLBACK_HOLD_MS;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        idx = (idx + 1) % steps.length;
        setFaceCursor({ clipId, idx });
        tick();
      }, Math.max(MIN_HOLD_MS, hold));
    };

    tick();
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [steps, reducedMotion, clipId]);

  if (!animation) return null;

  // Under reduce the face holds a mood-characteristic resting expression rather
  // than the clip's step 0 — see RESTING_EXPRESSION for why step 0 is not usable.
  const expression = reducedMotion
    ? RESTING_EXPRESSION[mood]
    : (steps?.[stepIdx]?.expression ?? FALLBACK_EXPRESSION);
  const glyphs = FACES[expression];

  const prop = propDefFor(animation);
  const attachedProp = prop?.attached === true ? prop : undefined;
  const detachedProp = prop !== undefined && !prop.attached ? prop : undefined;
  const behindProp = detachedProp?.layer === 'behind' ? detachedProp : undefined;
  const frontProp = detachedProp?.layer === 'front' ? detachedProp : undefined;
  const attachedBehind = attachedProp?.layer === 'behind' ? attachedProp : undefined;
  const attachedFront = attachedProp?.layer === 'front' ? attachedProp : undefined;

  const motionClass = reducedMotion ? '' : MOTION_CLASS[animation.motion];

  return (
    <svg
      role="img"
      aria-label={`Mascot — ${animation.name}, mood ${mood}`}
      viewBox={VIEW_BOX}
      width={size}
      height={size}
      className="select-none overflow-visible"
    >
      {behindProp ? <g>{renderPropPaths(behindProp.paths, 'prop-behind')}</g> : null}

      <g className={motionClass} style={PIVOT_AT_FEET}>
        {attachedBehind ? renderPropPaths(attachedBehind.paths, 'prop-held-behind') : null}

        {/* Persona lock: casing + screen are emitted verbatim for every animation. */}
        {CASING_PATHS.map((path, index) => (
          <path key={`casing-${index}`} d={path.d} fill={path.fill} />
        ))}
        {SCREEN_PATHS.map((path, index) => (
          <path key={`screen-${index}`} d={path.d} fill={path.fill} />
        ))}

        <g
          fill="none"
          stroke={LED_COLOR}
          strokeWidth={LED_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {glyphs.map((d, index) => (
            <path key={`face-${expression}-${index}`} d={d} />
          ))}
        </g>

        {attachedFront ? renderPropPaths(attachedFront.paths, 'prop-held-front') : null}
      </g>

      {frontProp ? <g>{renderPropPaths(frontProp.paths, 'prop-front')}</g> : null}
    </svg>
  );
};
