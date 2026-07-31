// LED face glyphs. Every path is stroked, never filled, so a single stroke
// width keeps the whole set visually consistent. Coordinates sit on the SCREEN
// grid from casing.ts — the face is the only layer allowed to vary between
// animations.

export type Expression =
  | 'happy'
  | 'neutral'
  | 'blink'
  | 'wink'
  | 'surprise'
  | 'sleep'
  | 'focus'
  | 'think'
  | 'excited'
  | 'lookLeft'
  | 'lookRight'
  | 'dizzy';

export const LED_COLOR = '#7FD8F5';
export const LED_STROKE_WIDTH = 48;

const SMILE = 'M 800 940 Q 1025 1100 1250 940';
const FLAT_MOUTH = 'M 875 990 L 1175 990';

export const FACES: Record<Expression, ReadonlyArray<string>> = {
  happy: ['M 665 748 Q 790 618 915 748', 'M 1130 748 Q 1255 618 1380 748', SMILE],
  neutral: ['M 790 645 L 790 775', 'M 1255 645 L 1255 775', FLAT_MOUTH],
  blink: ['M 680 710 L 900 710', 'M 1145 710 L 1365 710', SMILE],
  wink: ['M 665 748 Q 790 618 915 748', 'M 1145 730 L 1365 730', SMILE],
  surprise: [
    'M 718 710 a 72 72 0 1 0 144 0 a 72 72 0 1 0 -144 0',
    'M 1183 710 a 72 72 0 1 0 144 0 a 72 72 0 1 0 -144 0',
    'M 965 985 a 60 60 0 1 0 120 0 a 60 60 0 1 0 -120 0',
  ],
  sleep: [
    'M 680 690 Q 790 790 900 690',
    'M 1145 690 Q 1255 790 1365 690',
    'M 950 1000 L 1100 1000',
  ],
  focus: ['M 680 700 L 900 730', 'M 1145 730 L 1365 700', 'M 900 1000 L 1150 1000'],
  think: ['M 760 640 L 760 720', 'M 1225 640 L 1225 720', 'M 940 1000 L 1080 975'],
  excited: [
    'M 680 745 L 790 640 L 900 745',
    'M 1145 745 L 1255 640 L 1365 745',
    'M 780 930 Q 1025 1130 1270 930',
  ],
  lookLeft: ['M 700 645 L 700 775', 'M 1165 645 L 1165 775', FLAT_MOUTH],
  lookRight: ['M 880 645 L 880 775', 'M 1345 645 L 1345 775', FLAT_MOUTH],
  dizzy: [
    'M 715 640 L 865 780 M 865 640 L 715 780',
    'M 1180 640 L 1330 780 M 1330 640 L 1180 780',
    'M 880 985 q 48 -45 96 0 q 48 45 96 0 q 48 -45 96 0',
  ],
};
