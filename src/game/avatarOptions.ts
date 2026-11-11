import type { AvatarConfig } from './types';

export const SKIN_TONES = [
  '#fde7d6', '#f8d5bd', '#f1c19f', '#e6a97f', '#d4945f', '#c07e4c',
  '#a8693d', '#8d5532', '#744427', '#5c341e', '#47271a', '#352017',
];
export const HAIR_COLORS = [
  '#1f1a17', '#3b2a20', '#5a3a24', '#7b4f2c', '#a46a3a', '#c98b4b', '#e8c27a', '#f3dfa8',
  '#b5452f', '#d9653b', '#9a9a9a', '#e9e9e9', '#e86fa8', '#6b78e8', '#3fb8a6', '#9b5de5',
];
export const EYE_COLORS = ['#3b2414', '#6b4423', '#8a6a3a', '#3f7a4b', '#4a86c5', '#7b8f9c', '#5b4a8a'];
export const LIP_COLORS = ['none', '#c4495e', '#e0607e', '#9c3b54', '#b8705e', '#7a2d3d', '#d98b8b'];
export const CLOTH_COLORS = [
  '#e3a72f', '#e05a4f', '#f08a5d', '#f2c94c', '#3fae6a', '#2f8f83', '#4a86c5', '#2b4c7e', '#6b4fa0',
  '#c86ab0', '#f4f1ea', '#d6d0c4', '#8a8f99', '#3a3d46', '#1e1f24', '#8b5a3c', '#c7a27a', '#9fd3c7',
];

export interface Opt<T> {
  value: T;
  label: string;
}

const o = <T,>(value: T, label: string): Opt<T> => ({ value, label });

export const OPTIONS = {
  gender: [o('frau', 'Frau'), o('mann', 'Mann'), o('nonbinaer', 'Nicht-binär'), o('keine', 'Keine Angabe')] as Opt<AvatarConfig['gender']>[],
  pronouns: ['sie/ihr', 'er/ihm', 'they/them', 'dey/denen', 'xier', 'keine Pronomen'],
  body: [o('schmal', 'Schmal'), o('mittel', 'Mittel'), o('kraeftig', 'Kräftig')] as Opt<AvatarConfig['body']>[],
  height: [o('klein', 'Klein'), o('mittel', 'Mittel'), o('gross', 'Groß')] as Opt<AvatarConfig['height']>[],
  age: [o('jung', 'Jung'), o('erwachsen', 'Erwachsen'), o('aelter', 'Älter')] as Opt<AvatarConfig['age']>[],
  faceShape: [o('oval', 'Oval'), o('rund', 'Rund'), o('eckig', 'Kantig'), o('herz', 'Herzförmig')] as Opt<AvatarConfig['faceShape']>[],
  eyes: [o('rund', 'Rund'), o('mandel', 'Mandel'), o('schmal', 'Schmal'), o('freundlich', 'Lachend')] as Opt<AvatarConfig['eyes']>[],
  brows: [o('fein', 'Fein'), o('kraeftig', 'Kräftig'), o('buschig', 'Buschig'), o('gerade', 'Gerade')] as Opt<AvatarConfig['brows']>[],
  mouth: [o('laecheln', 'Lächeln'), o('grinsen', 'Grinsen'), o('schmunzeln', 'Schmunzeln'), o('neutral', 'Neutral')] as Opt<AvatarConfig['mouth']>[],
  beard: [o('none', 'Kein Bart'), o('stoppeln', 'Stoppeln'), o('schnurrbart', 'Schnurrbart'), o('kinnbart', 'Kinnbart'), o('vollbart', 'Vollbart'), o('lang', 'Langer Bart')] as Opt<AvatarConfig['beard']>[],
  hair: [
    o('glatze', 'Glatze'), o('buzz', 'Buzzcut'), o('kurz', 'Kurz'), o('seitenscheitel', 'Seitenscheitel'), o('pixie', 'Pixie'),
    o('undercut', 'Undercut'), o('irokese', 'Irokese'), o('locken', 'Locken'), o('afro', 'Afro'), o('puffs', 'Afro-Puffs'),
    o('locs', 'Locs'), o('braids', 'Braids'), o('zopf', 'Pferdeschwanz'), o('dutt', 'Dutt'), o('bob', 'Bob'),
    o('wellig', 'Wellig'), o('lang', 'Lang'),
  ] as Opt<AvatarConfig['hair']>[],
  top: [
    o('tshirt', 'T-Shirt'), o('tanktop', 'Tanktop'), o('hoodie', 'Hoodie'), o('hemd', 'Hemd'), o('bluse', 'Bluse'),
    o('pullover', 'Pullover'), o('blazer', 'Blazer'), o('anzug', 'Anzug'), o('kleid', 'Kleid'), o('latzhose', 'Latzhose'),
  ] as Opt<AvatarConfig['top']>[],
  bottom: [o('jeans', 'Jeans'), o('stoffhose', 'Stoffhose'), o('jogger', 'Jogginghose'), o('shorts', 'Shorts'), o('rock', 'Rock')] as Opt<AvatarConfig['bottom']>[],
  shoes: [o('sneaker', 'Sneaker'), o('schuhe', 'Halbschuhe'), o('stiefel', 'Stiefel'), o('sandalen', 'Sandalen')] as Opt<AvatarConfig['shoes']>[],
  glasses: [o('none', 'Keine'), o('rund', 'Rund'), o('eckig', 'Eckig'), o('cateye', 'Cat-Eye'), o('sonnenbrille', 'Sonnenbrille')] as Opt<AvatarConfig['glasses']>[],
  headwear: [
    o('none', 'Nichts'), o('cap', 'Cap'), o('beanie', 'Mütze'), o('hut', 'Hut'), o('bandana', 'Bandana'),
    o('hijab', 'Hidschab'), o('turban', 'Turban'), o('kippa', 'Kippa'),
  ] as Opt<AvatarConfig['headwear']>[],
  earrings: [o('none', 'Keine'), o('stecker', 'Stecker'), o('ringe', 'Creolen')] as Opt<AvatarConfig['earrings']>[],
  mobility: [o('none', 'Keine'), o('rollstuhl', 'Rollstuhl'), o('gehstock', 'Gehstock'), o('prothese', 'Beinprothese')] as Opt<AvatarConfig['mobility']>[],
};

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;

export const DEFAULT_AVATAR: AvatarConfig = {
  gender: 'keine',
  pronouns: 'keine Pronomen',
  body: 'mittel',
  height: 'mittel',
  age: 'erwachsen',
  skin: SKIN_TONES[4],
  faceShape: 'oval',
  eyes: 'rund',
  eyeColor: EYE_COLORS[1],
  brows: 'kraeftig',
  mouth: 'laecheln',
  lipColor: 'none',
  blush: true,
  freckles: false,
  vitiligo: false,
  mole: false,
  beard: 'none',
  hair: 'locken',
  hairColor: HAIR_COLORS[1],
  top: 'hoodie',
  topColor: '#e3a72f',
  bottom: 'jeans',
  bottomColor: '#2b4c7e',
  shoes: 'sneaker',
  shoeColor: '#f4f1ea',
  glasses: 'none',
  headwear: 'none',
  headwearColor: '#6b4fa0',
  earrings: 'none',
  necklace: false,
  hearingAid: false,
  mobility: 'none',
};

export function randomAvatar(): AvatarConfig {
  const gender = pick(['frau', 'mann', 'nonbinaer', 'frau', 'mann'] as const);
  const age = pick(['jung', 'erwachsen', 'erwachsen', 'aelter'] as const);
  const skin = pick(SKIN_TONES);
  const darkSkin = SKIN_TONES.indexOf(skin) >= 6;
  let hair = pick(OPTIONS.hair).value;
  if (darkSkin && chance(0.45)) hair = pick(['afro', 'puffs', 'locs', 'braids', 'buzz', 'locken'] as const);
  let hairColor = pick(HAIR_COLORS.slice(0, 10));
  if (age === 'aelter') hairColor = pick(['#9a9a9a', '#e9e9e9', '#cfcfcf']);
  if (chance(0.06)) hairColor = pick(HAIR_COLORS.slice(12));
  const top = gender === 'frau' && chance(0.25) ? 'kleid' : pick(OPTIONS.top.filter((t) => t.value !== 'kleid')).value;
  const headwear = chance(0.75) ? 'none' : pick(OPTIONS.headwear).value;
  return {
    gender,
    pronouns: gender === 'frau' ? 'sie/ihr' : gender === 'mann' ? 'er/ihm' : pick(['they/them', 'dey/denen', 'keine Pronomen']),
    body: pick(OPTIONS.body).value,
    height: pick(OPTIONS.height).value,
    age,
    skin,
    faceShape: pick(OPTIONS.faceShape).value,
    eyes: pick(OPTIONS.eyes).value,
    eyeColor: pick(EYE_COLORS),
    brows: pick(OPTIONS.brows).value,
    mouth: pick(OPTIONS.mouth).value,
    lipColor: chance(0.3) ? pick(LIP_COLORS.slice(1)) : 'none',
    blush: chance(0.5),
    freckles: chance(0.15),
    vitiligo: chance(0.04),
    mole: chance(0.12),
    beard: gender === 'mann' && chance(0.5) ? pick(OPTIONS.beard.slice(1)).value : chance(0.03) ? 'stoppeln' : 'none',
    hair,
    hairColor,
    top,
    topColor: pick(CLOTH_COLORS),
    bottom: pick(OPTIONS.bottom).value,
    bottomColor: pick(CLOTH_COLORS),
    shoes: pick(OPTIONS.shoes).value,
    shoeColor: pick(CLOTH_COLORS),
    glasses: chance(0.3) ? pick(OPTIONS.glasses.slice(1, 4)).value : 'none',
    headwear,
    headwearColor: pick(CLOTH_COLORS),
    earrings: chance(0.35) ? pick(['stecker', 'ringe'] as const) : 'none',
    necklace: chance(0.2),
    hearingAid: chance(0.05),
    mobility: chance(0.06) ? pick(['rollstuhl', 'gehstock', 'prothese'] as const) : 'none',
  };
}
