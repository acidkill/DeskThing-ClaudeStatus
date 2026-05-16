import type { FC } from 'react';

import type { Mood } from '../../shared/messages';

type MoodVisuals = {
  body: string;
  gauge: string;
  blink: string;
  mouth: 'flat' | 'smile' | 'oh' | 'jagged';
  cheekOpacity: number;
};

const MOOD_VISUALS: Record<Mood, MoodVisuals> = {
  idle: {
    body: 'animate-mood-idle',
    gauge: 'animate-gauge-slow',
    blink: 'animate-blink-slow',
    mouth: 'flat',
    cheekOpacity: 0,
  },
  active: {
    body: 'animate-mood-active',
    gauge: 'animate-gauge-active',
    blink: 'animate-blink-slow',
    mouth: 'smile',
    cheekOpacity: 0.35,
  },
  busy: {
    body: 'animate-mood-busy',
    gauge: 'animate-gauge-busy',
    blink: 'animate-blink-fast',
    mouth: 'oh',
    cheekOpacity: 0.6,
  },
  frantic: {
    body: 'animate-mood-frantic',
    gauge: 'animate-gauge-frantic',
    blink: 'animate-blink-fast',
    mouth: 'jagged',
    cheekOpacity: 0.85,
  },
};

const Mouth: FC<{ kind: MoodVisuals['mouth'] }> = ({ kind }) => {
  switch (kind) {
    case 'flat':
      return <line x1="86" y1="128" x2="114" y2="128" stroke="#0b0d10" strokeWidth="4" strokeLinecap="round" />;
    case 'smile':
      return (
        <path d="M 84 124 Q 100 138 116 124" fill="none" stroke="#0b0d10" strokeWidth="4" strokeLinecap="round" />
      );
    case 'oh':
      return <ellipse cx="100" cy="130" rx="9" ry="7" fill="#0b0d10" />;
    case 'jagged':
      return (
        <polyline
          points="82,128 90,134 96,124 104,134 110,124 118,130"
          fill="none"
          stroke="#0b0d10"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
  }
};

type Props = {
  mood: Mood;
  size?: number;
};

export const MeterMascot: FC<Props> = ({ mood, size = 240 }) => {
  const visuals = MOOD_VISUALS[mood];
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`Pip mascot, mood ${mood}`}
      className="select-none"
    >
      <ellipse cx="100" cy="184" rx="58" ry="6" fill="#000" opacity="0.35" />
      <g className={`origin-bottom ${visuals.body}`}>
        <ellipse cx="74" cy="172" rx="14" ry="6" fill="#2a8f9b" />
        <ellipse cx="126" cy="172" rx="14" ry="6" fill="#2a8f9b" />
        <path
          d="M 36 96 C 36 50 164 50 164 96 L 164 150 C 164 178 36 178 36 150 Z"
          fill="#3fb6c4"
          stroke="#1e6f7a"
          strokeWidth="3"
        />
        <ellipse cx="100" cy="74" rx="58" ry="22" fill="#54c8d6" />
        <circle cx="76" cy="144" r="9" fill="#f59ab2" opacity={visuals.cheekOpacity} />
        <circle cx="124" cy="144" r="9" fill="#f59ab2" opacity={visuals.cheekOpacity} />
        <g className={`origin-center ${visuals.blink}`}>
          <circle cx="80" cy="98" r="9" fill="#0b0d10" />
          <circle cx="120" cy="98" r="9" fill="#0b0d10" />
          <circle cx="83" cy="95" r="2.6" fill="#e6e8eb" />
          <circle cx="123" cy="95" r="2.6" fill="#e6e8eb" />
        </g>
        <Mouth kind={visuals.mouth} />
        <g transform="translate(100 155)">
          <circle r="14" fill="#0b0d10" stroke="#1e6f7a" strokeWidth="2" />
          <g className={visuals.gauge} style={{ transformOrigin: '0 0' }}>
            <line x1="0" y1="0" x2="0" y2="-10" stroke="#f59ab2" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <circle r="2" fill="#54c8d6" />
        </g>
      </g>
    </svg>
  );
};
