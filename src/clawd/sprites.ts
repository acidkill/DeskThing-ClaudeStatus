import type { Mood } from '../../shared/messages';

export type SpriteFrame = {
  hold: number;
  grid: number[][];
};

export type Sprite = {
  filename: string;
  name: string;
  category: string;
  description?: string;
  palette: string[];
  frame_count: number;
  frames: SpriteFrame[];
};

const RAW = import.meta.glob<Sprite>('/assets-proprietary/clawd/*.json', {
  eager: true,
  import: 'default',
});

const ALL: ReadonlyArray<Sprite> = Object.entries(RAW)
  .filter(([path]) => !path.endsWith('/_index.json'))
  .map(([, mod]) => mod)
  .filter((s): s is Sprite => !!s && Array.isArray((s as Sprite).frames) && (s as Sprite).frames.length > 0);

const byCategory = (category: string): ReadonlyArray<Sprite> =>
  ALL.filter((s) => s.category.toLowerCase() === category.toLowerCase());

const MOOD_CATEGORIES: Record<Mood, ReadonlyArray<string>> = {
  idle: ['Idle'],
  active: ['Expressions', 'Idle'],
  busy: ['Work'],
  frantic: ['Dance'],
};

export const hasClawdSprites = (): boolean => ALL.length > 0;

export const spritesForMood = (mood: Mood): ReadonlyArray<Sprite> => {
  const cats = MOOD_CATEGORIES[mood];
  for (const cat of cats) {
    const hits = byCategory(cat);
    if (hits.length > 0) return hits;
  }
  return ALL;
};
