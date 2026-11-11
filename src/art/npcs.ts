import { DEFAULT_AVATAR } from '../game/avatarOptions';
import type { AvatarConfig, NpcId } from '../game/types';

const base = DEFAULT_AVATAR;

export const NPC_AVATARS: Record<NpcId, AvatarConfig> = {
  hilde: {
    ...base, gender: 'frau', age: 'aelter', skin: '#f1c19f', hair: 'dutt', hairColor: '#e9e9e9', top: 'pullover', topColor: '#9b5d8a',
    bottom: 'rock', bottomColor: '#3a3d46', glasses: 'rund', mouth: 'schmunzeln', eyes: 'freundlich', blush: true, earrings: 'stecker', necklace: true, faceShape: 'rund',
  },
  krause: {
    ...base, gender: 'mann', age: 'erwachsen', skin: '#e6a97f', hair: 'seitenscheitel', hairColor: '#5a3a24', top: 'anzug', topColor: '#2b4c7e',
    glasses: 'eckig', mouth: 'neutral', beard: 'schnurrbart', faceShape: 'eckig', blush: false, eyes: 'rund',
  },
  jenny: {
    ...base, gender: 'frau', skin: '#a8693d', hair: 'puffs', hairColor: '#1f1a17', top: 'blazer', topColor: '#e05a4f', lipColor: '#9c3b54',
    earrings: 'ringe', mouth: 'grinsen', eyes: 'mandel', faceShape: 'herz', blush: true,
  },
  bruno: {
    ...base, gender: 'mann', skin: '#d4945f', hair: 'buzz', hairColor: '#3b2a20', top: 'latzhose', topColor: '#2f8f83', beard: 'vollbart',
    body: 'kraeftig', mouth: 'grinsen', headwear: 'cap', headwearColor: '#f2c94c', faceShape: 'rund', blush: false,
  },
  viktor: {
    ...base, gender: 'mann', age: 'aelter', skin: '#fde7d6', hair: 'seitenscheitel', hairColor: '#cfcfcf', top: 'anzug', topColor: '#1e1f24',
    glasses: 'rund', mouth: 'schmunzeln', beard: 'kinnbart', faceShape: 'eckig', eyes: 'schmal', brows: 'buschig', blush: false, headwear: 'none',
  },
  dennis: {
    ...base, gender: 'mann', age: 'jung', skin: '#c07e4c', hair: 'locken', hairColor: '#1f1a17', top: 'hoodie', topColor: '#6b4fa0',
    glasses: 'sonnenbrille', mouth: 'grinsen', headwear: 'beanie', headwearColor: '#3fae6a', faceShape: 'oval',
  },
  system: {
    ...base, gender: 'keine', skin: '#e6a97f', hair: 'kurz', hairColor: '#7b4f2c', top: 'hemd', topColor: '#4a86c5', mouth: 'neutral',
  },
  mieter: {
    ...base, gender: 'nonbinaer', skin: '#8d5532', hair: 'locs', hairColor: '#3b2a20', top: 'tshirt', topColor: '#f2c94c', mouth: 'neutral',
  },
};
