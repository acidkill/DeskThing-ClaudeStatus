// Animation props. These are the ONLY vector layers besides the LED face that
// an animation may add — the casing and screen from casing.ts are emitted
// identically in every frame of every animation (persona lock).
//
// All geometry is authored on the shared viewBox '0 0 2048 2048':
//   head        x  400..1648   y  215..1340
//   screen      x  525..1525   y  374..1245   <- must stay clear in every prop
//   torso+limbs x  613..1434   y 1340..1856
//   ground line y ~1856
//
// Palette is locked to the master art: casing #D97757, outline/screen #1F1F1F,
// LED #7FD8F5, ear lens #4A90E2, gloss #FFFFFF. No new hues.

export type PropId =
  | 'strawberry'
  | 'bubbles'
  | 'book'
  | 'rope'
  | 'laptop'
  | 'blackboard'
  | 'thought'
  | 'djheadphones'
  | 'djdeck';

export type PropPath = {
  readonly d: string;
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
};

export type PropDef = {
  /** behind = drawn under the character, front = drawn over it */
  readonly layer: 'behind' | 'front';
  /** true = the prop is held/worn and must inherit the character's motion transform */
  readonly attached: boolean;
  readonly paths: ReadonlyArray<PropPath>;
};

const CASING = '#D97757';
const OUTLINE = '#1F1F1F';
const LED = '#7FD8F5';
const GLOSS = '#FFFFFF';
const NONE = 'none';

/** Bold master-art outline weight; thin variant for interior detail. */
const OUTLINE_W = 20;
const DETAIL_W = 14;

/**
 * DJ headphones: band + earcups, nothing else. This is the whole prop for
 * `dance_bounce_dj` and `dance_sway_dj` — the two v1 sprites whose descriptions
 * say only "with DJ headphones on" (assets/mascot/dance_bounce_dj.json,
 * dance_sway_dj.json). `djdeck` appends the console on top for `dance_djmix`,
 * the one v1 clip that is actually "at a turntable".
 *
 * The band is WORN, so it is routed along the skull, not around it. It seats on
 * the crown (apex y180, ~39 units above the crown at y219 — one hairline of dark
 * outline, which is what "resting on" looks like), then tracks the shell's own
 * profile down the temples and plugs into the earcups. Earlier art arced the band
 * to y130 and out to x1868, which read as a hoop hovering around the mascot
 * rather than headphones on it.
 *
 * The band is a stroke, and a stroke laid across the casing reads as a scar on the
 * silhouette rather than as a worn object, so its centreline is offset to keep the
 * whole 64-unit outline just clear of the shell (worst margin ~7 units at the
 * crown) — close enough to touch at render scale. The earcups are filled bodies
 * and behave differently: they sit ON the ear pods (x1641..1746 / x304..406) and
 * cover the ear lenses (x1750..1796 / x252..298) completely, because covering the
 * ear is the entire function of an earcup. Cup centres are 1786/262 at y790 — the
 * ear-lens band — with rx126 ry170 so the cup reads taller than wide the way a
 * real can does.
 *
 * Cup order matters: the band is emitted first so the cup paints over its end and
 * the band appears to enter the cup rather than stop beside it.
 */
const DJ_BAND_D =
  'M 288 640 C 326 626 364 604 380 548 C 396 450 448 362 518 300 ' +
  'C 618 220 798 180 1024 180 C 1250 180 1430 220 1530 300 ' +
  'C 1600 362 1652 450 1668 548 C 1684 604 1722 626 1760 640';

const DJ_HEADPHONE_PATHS: ReadonlyArray<PropPath> = [
  {
    d: DJ_BAND_D,
    fill: NONE,
    stroke: OUTLINE,
    strokeWidth: 64,
  },
  {
    d: DJ_BAND_D,
    fill: NONE,
    stroke: CASING,
    strokeWidth: 42,
  },
  // Gloss along the band's upper edge over the left shoulder. Without it the
  // band and the shell read as one thick casing edge at small sizes.
  {
    d: 'M 592 246 C 664 210 776 184 894 174',
    fill: NONE,
    stroke: GLOSS,
    strokeWidth: 14,
  },
  {
    d: 'M 1660 790 a 126 170 0 1 0 252 0 a 126 170 0 1 0 -252 0 M 136 790 a 126 170 0 1 0 252 0 a 126 170 0 1 0 -252 0',
    fill: CASING,
    stroke: OUTLINE,
    strokeWidth: OUTLINE_W,
  },
  {
    d: 'M 1708 790 a 78 116 0 1 0 156 0 a 78 116 0 1 0 -156 0 M 184 790 a 78 116 0 1 0 156 0 a 78 116 0 1 0 -156 0',
    fill: OUTLINE,
  },
  {
    d: 'M 1732 722 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0 M 250 722 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0',
    fill: GLOSS,
  },
];

/** Turntable/mixer console in front of the torso — `dance_djmix` only. */
const DJ_CONSOLE_PATHS: ReadonlyArray<PropPath> = [
  {
    d: 'M 620 1576 L 1430 1576 Q 1470 1576 1470 1616 L 1470 1790 Q 1470 1830 1430 1830 L 620 1830 Q 580 1830 580 1790 L 580 1616 Q 580 1576 620 1576 Z',
    fill: CASING,
    stroke: OUTLINE,
    strokeWidth: 22,
  },
  {
    d: 'M 670 1700 a 92 92 0 1 0 184 0 a 92 92 0 1 0 -184 0 M 1196 1700 a 92 92 0 1 0 184 0 a 92 92 0 1 0 -184 0',
    fill: OUTLINE,
  },
  {
    d: 'M 748 1700 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0 M 1274 1700 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0',
    fill: GLOSS,
  },
  {
    d: 'M 916 1618 L 1132 1618 L 1132 1794 L 916 1794 Z',
    fill: OUTLINE,
  },
  {
    d: 'M 950 1652 L 950 1760 M 1024 1652 L 1024 1760 M 1098 1652 L 1098 1760',
    fill: NONE,
    stroke: GLOSS,
    strokeWidth: 10,
  },
  {
    d: 'M 930 1690 L 970 1690 M 1004 1722 L 1044 1722 M 1078 1674 L 1118 1674',
    fill: NONE,
    stroke: LED,
    strokeWidth: 26,
  },
];

export const PROPS: Record<PropId, PropDef> = {
  // Power token held out at the right hand. Sat outboard of the torso edge
  // (x1434) so roughly half the berry silhouettes against the background
  // instead of vanishing into the same-coloured belly.
  strawberry: {
    layer: 'front',
    attached: true,
    paths: [
      {
        d: 'M 1408 1332 L 1408 1420',
        fill: NONE,
        stroke: OUTLINE,
        strokeWidth: 26,
      },
      {
        d: 'M 1408 1700 C 1318 1654 1266 1568 1282 1486 C 1295 1416 1348 1376 1408 1376 C 1468 1376 1521 1416 1534 1486 C 1550 1568 1498 1654 1408 1700 Z',
        fill: CASING,
        stroke: OUTLINE,
        strokeWidth: OUTLINE_W,
      },
      {
        d: 'M 1408 1416 C 1366 1376 1320 1364 1288 1378 C 1314 1426 1360 1440 1408 1432 C 1456 1440 1502 1426 1528 1378 C 1496 1364 1450 1376 1408 1416 Z',
        fill: OUTLINE,
      },
      {
        d: 'M 1354 1478 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 M 1428 1512 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 M 1372 1570 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 M 1448 1440 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0',
        fill: GLOSS,
      },
      {
        d: 'M 1326 1494 C 1318 1554 1336 1608 1372 1648',
        fill: NONE,
        stroke: GLOSS,
        strokeWidth: 18,
      },
    ],
  },

  // Status-ping bubbles rising up the right side. Placed outboard of the right
  // ear (x1640..1800, y584..1000) so the stack stays readable behind the head.
  bubbles: {
    layer: 'behind',
    attached: false,
    paths: [
      {
        d: 'M 1548 1470 a 52 52 0 1 0 104 0 a 52 52 0 1 0 -104 0',
        fill: LED,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1646 1330 a 74 74 0 1 0 148 0 a 74 74 0 1 0 -148 0',
        fill: LED,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1638 1180 a 42 42 0 1 0 84 0 a 42 42 0 1 0 -84 0',
        fill: LED,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1722 1060 a 88 88 0 1 0 176 0 a 88 88 0 1 0 -176 0',
        fill: LED,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1826 900 a 54 54 0 1 0 108 0 a 54 54 0 1 0 -108 0',
        fill: LED,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1820 760 a 36 36 0 1 0 72 0 a 36 36 0 1 0 -72 0',
        fill: LED,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1686 1300 a 20 20 0 1 0 40 0 a 20 20 0 1 0 -40 0 M 1766 1024 a 24 24 0 1 0 48 0 a 24 24 0 1 0 -48 0 M 1848 878 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0',
        fill: GLOSS,
      },
    ],
  },

  // Open book held in front of the torso: casing-orange cover with two gloss
  // pages and stroked text lines.
  book: {
    layer: 'front',
    attached: true,
    paths: [
      {
        d: 'M 770 1470 C 862 1454 956 1470 1025 1512 C 1094 1470 1188 1454 1280 1470 L 1280 1712 C 1188 1696 1094 1712 1025 1754 C 956 1712 862 1696 770 1712 Z',
        fill: CASING,
        stroke: OUTLINE,
        strokeWidth: OUTLINE_W,
      },
      {
        d: 'M 792 1492 C 868 1482 950 1496 1012 1530 L 1012 1730 C 950 1696 868 1682 792 1692 Z',
        fill: GLOSS,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1258 1492 C 1182 1482 1100 1496 1038 1530 L 1038 1730 C 1100 1696 1182 1682 1258 1692 Z',
        fill: GLOSS,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 830 1546 L 976 1572 M 830 1608 L 976 1634 M 830 1670 L 950 1692 M 1074 1572 L 1220 1546 M 1074 1634 L 1220 1608 M 1100 1692 L 1220 1670',
        fill: NONE,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1025 1512 L 1025 1754',
        fill: NONE,
        stroke: OUTLINE,
        strokeWidth: OUTLINE_W,
      },
    ],
  },

  // Skipping rope: one continuous loop that sweeps around the whole character
  // (over the head, under the feet) plus two handles held out at hand height.
  // The loop is swung wide enough to clear both ear lenses before it passes
  // behind the head. Stroked in casing orange, not outline black — a behind
  // layer is seen against the dark UI, where #1F1F1F would disappear.
  rope: {
    layer: 'behind',
    attached: false,
    paths: [
      {
        d: 'M 570 1470 C -300 1160 188 84 1024 90 C 1860 84 2348 1160 1478 1470 C 1860 1600 1820 1890 1024 1918 C 228 1890 188 1600 570 1470 Z',
        fill: NONE,
        stroke: CASING,
        strokeWidth: 32,
      },
      {
        d: 'M 538 1404 L 602 1404 Q 618 1404 618 1420 L 618 1520 Q 618 1536 602 1536 L 538 1536 Q 522 1536 522 1520 L 522 1420 Q 522 1404 538 1404 Z',
        fill: CASING,
        stroke: OUTLINE,
        strokeWidth: 16,
      },
      {
        d: 'M 1446 1404 L 1510 1404 Q 1526 1404 1526 1420 L 1526 1520 Q 1526 1536 1510 1536 L 1446 1536 Q 1430 1536 1430 1520 L 1430 1420 Q 1430 1404 1446 1404 Z',
        fill: CASING,
        stroke: OUTLINE,
        strokeWidth: 16,
      },
    ],
  },

  // Open laptop in front of the torso, screen facing away: we see the back of
  // the lid (casing orange, gloss badge) sitting behind the dark keyboard deck.
  laptop: {
    layer: 'front',
    attached: true,
    paths: [
      {
        d: 'M 790 1432 L 1260 1432 L 1296 1662 L 754 1662 Z',
        fill: CASING,
        stroke: OUTLINE,
        strokeWidth: OUTLINE_W,
      },
      {
        d: 'M 985 1546 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0',
        fill: GLOSS,
      },
      {
        d: 'M 706 1662 L 1344 1662 L 1378 1744 L 672 1744 Z',
        fill: OUTLINE,
        stroke: CASING,
        strokeWidth: 18,
      },
      {
        d: 'M 742 1700 L 1308 1700',
        fill: NONE,
        stroke: CASING,
        strokeWidth: 16,
      },
      {
        d: 'M 690 1756 L 1360 1756',
        fill: NONE,
        stroke: CASING,
        strokeWidth: DETAIL_W,
      },
    ],
  },

  // Magic wand held out at the right hand, star bursting at the tip, sparkles
  // scattered around it. This is what the v1 sprite depicts — see the "work
  // wand" name and description on assets/mascot/work_blackboard.json. The
  // PropId keeps the v1 *animation id* (`work_blackboard`) the way the v1 name
  // and id already disagreed; the drawing follows the name, not the id.
  //
  // v1 painted the star gold (#FFD700). The v2 palette is locked to the master
  // art, so the burst is gloss white with an LED-blue core instead of a new hue.
  // Everything sits right of x1560 and below the ear lens, so no head casing and
  // no part of the screen is covered.
  blackboard: {
    layer: 'front',
    attached: true,
    paths: [
      {
        d: 'M 1404 1508 L 1690 1198',
        fill: NONE,
        stroke: OUTLINE,
        strokeWidth: 46,
      },
      {
        d: 'M 1404 1508 L 1690 1198',
        fill: NONE,
        stroke: CASING,
        strokeWidth: 26,
      },
      {
        d: 'M 1730 1015 L 1752 1106 L 1833 1058 L 1784 1138 L 1875 1160 L 1784 1182 L 1833 1263 L 1752 1214 L 1730 1305 L 1708 1214 L 1628 1263 L 1676 1182 L 1585 1160 L 1676 1138 L 1628 1058 L 1708 1106 Z',
        fill: GLOSS,
        stroke: OUTLINE,
        strokeWidth: OUTLINE_W,
      },
      {
        d: 'M 1690 1160 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0',
        fill: LED,
      },
      {
        d: 'M 1560 1374 Q 1560 1420 1606 1420 Q 1560 1420 1560 1466 Q 1560 1420 1514 1420 Q 1560 1420 1560 1374 Z M 1904 1304 Q 1904 1362 1962 1362 Q 1904 1362 1904 1420 Q 1904 1362 1846 1362 Q 1904 1362 1904 1304 Z M 1928 930 Q 1928 974 1972 974 Q 1928 974 1928 1018 Q 1928 974 1884 974 Q 1928 974 1928 930 Z M 1836 1426 Q 1836 1462 1872 1462 Q 1836 1462 1836 1498 Q 1836 1462 1800 1462 Q 1836 1462 1836 1426 Z',
        fill: LED,
      },
    ],
  },

  // Thought bubble up and to the right of the head, with two trailing dots
  // descending from it back down towards the character.
  //
  // The dots are the part that has to be placed carefully. `thought` is a
  // layer:'front' prop, so anything it covers is painted OVER the locked casing
  // — a persona-lock violation, not just a cosmetic one. The head's right
  // profile is not a straight edge: it runs x1580 at y400, x1644 at y560, then
  // flares out to x1708 at y600 and x1810 at y800 where the ear sits. Both dots
  // therefore sit right of x1660 and stay above the ear flare, and each one
  // drifts further right as it descends to track the widening profile.
  // Measured at 1024px against the eroded silhouette: 0 pixels inside.
  thought: {
    layer: 'front',
    attached: false,
    paths: [
      {
        d: 'M 1640 380 Q 1560 372 1562 300 Q 1500 250 1566 200 Q 1570 130 1650 140 Q 1700 84 1780 118 Q 1850 76 1900 136 Q 1976 150 1962 226 Q 2000 288 1930 320 Q 1920 388 1840 372 Q 1760 412 1700 384 Q 1668 400 1640 380 Z',
        fill: GLOSS,
        stroke: OUTLINE,
        strokeWidth: OUTLINE_W,
      },
      {
        d: 'M 1668 250 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0 M 1748 250 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0 M 1828 250 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0',
        fill: OUTLINE,
      },
      {
        d: 'M 1660 452 a 46 46 0 1 0 92 0 a 46 46 0 1 0 -92 0',
        fill: GLOSS,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
      {
        d: 'M 1750 556 a 30 30 0 1 0 60 0 a 30 30 0 1 0 -60 0',
        fill: GLOSS,
        stroke: OUTLINE,
        strokeWidth: DETAIL_W,
      },
    ],
  },

  // Headphones alone — dance_bounce_dj and dance_sway_dj. v1's #FFB400 gold is
  // re-voiced in the locked palette.
  djheadphones: {
    layer: 'front',
    attached: true,
    paths: DJ_HEADPHONE_PATHS,
  },

  // Headphones plus the turntable/mixer console — dance_djmix only.
  djdeck: {
    layer: 'front',
    attached: true,
    paths: [...DJ_HEADPHONE_PATHS, ...DJ_CONSOLE_PATHS],
  },
};
