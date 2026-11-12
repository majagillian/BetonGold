// Innenausbau: Räume, Materialien, Grundriss, Möblierung, Mängel
import type {
  BathId, Defect, DefectType, FloorId, FurnStyle, KitchenId, LayoutId, Property, RegionId, RenoPlan, Room, RoomType, Tier, WallId,
} from './types';

export const ROOM_NAMES: Record<RoomType, string> = {
  flur: 'Flur',
  wohnen: 'Wohnzimmer',
  kueche: 'Küche',
  wohnkueche: 'Offene Wohnküche',
  bad: 'Badezimmer',
  wc: 'Gäste-WC',
  schlafen: 'Schlafzimmer',
  kind: 'Kinderzimmer',
  arbeiten: 'Arbeitszimmer',
  essen: 'Esszimmer',
};

export interface FloorDef { id: FloorId; name: string; tier: Tier; cost: number; appeal: number; wet: boolean; dry: boolean; tags: string[] }
export const FLOORS: FloorDef[] = [
  { id: 'teppich_alt', name: 'Alter Teppich', tier: 0, cost: 0, appeal: 0, wet: false, dry: true, tags: [] },
  { id: 'dielen_alt', name: 'Abgenutzte Dielen', tier: 0, cost: 0, appeal: 0.1, wet: false, dry: true, tags: [] },
  { id: 'linoleum', name: 'Linoleum', tier: 1, cost: 25, appeal: 0.25, wet: true, dry: true, tags: ['retro'] },
  { id: 'laminat', name: 'Laminat Eiche hell', tier: 1, cost: 30, appeal: 0.4, wet: false, dry: true, tags: ['natur', 'modern'] },
  { id: 'vinyl_beton', name: 'Vinyl Betonoptik', tier: 2, cost: 45, appeal: 0.6, wet: true, dry: true, tags: ['modern', 'industrial'] },
  { id: 'fliesen_hell', name: 'Feinsteinzeug hell', tier: 2, cost: 60, appeal: 0.6, wet: true, dry: true, tags: ['modern', 'mediterran'] },
  { id: 'fliesen_dunkel', name: 'Feinsteinzeug anthrazit', tier: 2, cost: 65, appeal: 0.6, wet: true, dry: true, tags: ['modern', 'industrial'] },
  { id: 'parkett_eiche', name: 'Eichen-Landhausdiele', tier: 3, cost: 95, appeal: 0.85, wet: false, dry: true, tags: ['natur', 'landhaus', 'klassisch'] },
  { id: 'fischgraet', name: 'Fischgrät-Parkett', tier: 3, cost: 120, appeal: 0.95, wet: false, dry: true, tags: ['klassisch', 'luxus'] },
  { id: 'marmor', name: 'Marmor', tier: 3, cost: 160, appeal: 0.95, wet: true, dry: true, tags: ['luxus', 'mediterran'] },
];

export interface WallDef { id: WallId; name: string; hex: string; appeal: number; tags: string[] }
export const WALLS: WallDef[] = [
  { id: 'tapete_alt', name: 'Alte Blümchentapete', hex: '#c9b48a', appeal: 0, tags: [] },
  { id: 'weiss', name: 'Reinweiß', hex: '#f3f1ec', appeal: 0.55, tags: ['modern', 'natur', 'mediterran'] },
  { id: 'grau', name: 'Kieselgrau', hex: '#c9c6c0', appeal: 0.55, tags: ['modern', 'industrial'] },
  { id: 'salbei', name: 'Salbeigrün', hex: '#a9b79a', appeal: 0.7, tags: ['natur', 'landhaus'] },
  { id: 'taupe', name: 'Taupe', hex: '#b5a596', appeal: 0.65, tags: ['klassisch', 'natur'] },
  { id: 'nachtblau', name: 'Nachtblau', hex: '#34435e', appeal: 0.7, tags: ['luxus', 'klassisch'] },
  { id: 'terrakotta', name: 'Terrakotta', hex: '#c27a5a', appeal: 0.65, tags: ['mediterran', 'landhaus'] },
  { id: 'altrosa', name: 'Altrosa', hex: '#d8b2a8', appeal: 0.6, tags: ['klassisch'] },
  { id: 'ocker', name: 'Ocker', hex: '#d2a65a', appeal: 0.6, tags: ['landhaus', 'retro'] },
  { id: 'anthrazit', name: 'Anthrazit', hex: '#4a4c50', appeal: 0.65, tags: ['industrial', 'luxus'] },
];
export const WALL_COST_PER_SQM = 18;

export interface KitchenDef { id: KitchenId; name: string; tier: Tier; cost: number; appeal: number; tags: string[]; minSize?: number }
export const KITCHENS: KitchenDef[] = [
  { id: 'alt', name: 'Alte Einbauküche (1978)', tier: 0, cost: 0, appeal: 0, tags: [] },
  { id: 'pantry', name: 'Pantryküche weiß', tier: 1, cost: 3500, appeal: 0.35, tags: ['modern'] },
  { id: 'landhaus', name: 'Landhausküche Creme', tier: 2, cost: 9000, appeal: 0.7, tags: ['landhaus', 'klassisch'] },
  { id: 'modern', name: 'Grifflos Hochglanz weiß', tier: 2, cost: 11000, appeal: 0.75, tags: ['modern'] },
  { id: 'industrial', name: 'Industrial Eiche dunkel', tier: 3, cost: 16000, appeal: 0.85, tags: ['industrial', 'luxus'] },
  { id: 'insel', name: 'Designerküche mit Kochinsel', tier: 3, cost: 24000, appeal: 1, tags: ['luxus', 'modern'], minSize: 18 },
];

export interface BathDef { id: BathId; name: string; tier: Tier; cost: number; appeal: number; tags: string[] }
export const BATHS: BathDef[] = [
  { id: 'alt', name: 'Altbad mit Avocado-Wanne', tier: 0, cost: 0, appeal: 0, tags: [] },
  { id: 'basic', name: 'Basic weiß mit Wanne', tier: 1, cost: 6000, appeal: 0.4, tags: ['modern'] },
  { id: 'modern', name: 'Walk-in-Dusche & Feinsteinzeug', tier: 2, cost: 12000, appeal: 0.75, tags: ['modern', 'industrial'] },
  { id: 'spa', name: 'Spa-Bad mit freistehender Wanne', tier: 3, cost: 22000, appeal: 1, tags: ['luxus', 'klassisch'] },
];

export interface FurnDef { id: FurnStyle; name: string; costPerSqm: number; rentBonus: number; desc: string; tags: string[] }
export const FURN_STYLES: FurnDef[] = [
  { id: 'skandi', name: 'Skandinavisch', costPerSqm: 70, rentBonus: 0.2, desc: 'Helles Holz, Weiß, Grau – beliebt bei Studierenden und Pendlern.', tags: ['modern', 'natur'] },
  { id: 'landhaus', name: 'Landhaus', costPerSqm: 75, rentBonus: 0.18, desc: 'Warmes Holz und Leinen – passt aufs Land und in die Berge.', tags: ['landhaus', 'klassisch'] },
  { id: 'industrial', name: 'Industrial', costPerSqm: 85, rentBonus: 0.22, desc: 'Dunkles Holz, Metall und Leder – perfekt für Lofts.', tags: ['industrial', 'modern'] },
  { id: 'luxus', name: 'Luxus', costPerSqm: 160, rentBonus: 0.35, desc: 'Samt, Walnuss und Messing – für zahlungskräftige Expats.', tags: ['luxus', 'klassisch'] },
];

/** Welche Stile die Leute in einer Region mögen */
export const REGION_TASTE: Record<RegionId, string[]> = {
  kleeweiler: ['landhaus', 'natur'],
  muehlental: ['klassisch', 'landhaus'],
  lumenhafen: ['industrial', 'modern'],
  pilzhain: ['natur', 'landhaus'],
  wolkenspitz: ['landhaus', 'luxus'],
  sonnenkueste: ['mediterran', 'luxus'],
  kronstadt: ['luxus', 'klassisch', 'modern'],
  neuwerk: ['modern', 'industrial'],
};

export interface DefectDef { type: DefectType; name: string; desc: string; costPerSqm: number; min: number; rooms: RoomType[]; decal: 'schimmel' | 'riss' | 'wasser' | 'kabel' | 'holzwurm' | 'asbest' | 'rost'; where: 'wand' | 'decke' | 'boden'; blocks: boolean }
export const DEFECTS: DefectDef[] = [
  { type: 'schimmel', name: 'Schimmelbefall', desc: 'Schwarzer Schimmel hinter dem Schrank – Ursache: Wärmebrücke.', costPerSqm: 45, min: 2500, rooms: ['bad', 'schlafen', 'kind'], decal: 'schimmel', where: 'wand', blocks: true },
  { type: 'feuchte', name: 'Feuchte Wand', desc: 'Aufsteigende Feuchtigkeit, der Putz blüht aus.', costPerSqm: 60, min: 4000, rooms: ['flur', 'wohnen', 'kueche', 'essen'], decal: 'wasser', where: 'wand', blocks: true },
  { type: 'elektrik', name: 'Lebensgefährliche Elektrik', desc: 'Stoffummantelte Leitungen von 1955, keine Sicherungen.', costPerSqm: 55, min: 5000, rooms: ['kueche', 'flur', 'arbeiten', 'wohnen'], decal: 'kabel', where: 'wand', blocks: true },
  { type: 'holzwurm', name: 'Holzwurm im Gebälk', desc: 'Feine Bohrlöcher und Holzmehl – der Holzwurm frisst die Balken.', costPerSqm: 50, min: 6000, rooms: ['schlafen', 'wohnen', 'arbeiten'], decal: 'holzwurm', where: 'decke', blocks: true },
  { type: 'riss', name: 'Setzungsriss', desc: 'Ein Riss quer durch die tragende Wand – Statiker nötig.', costPerSqm: 80, min: 8000, rooms: ['wohnen', 'flur', 'essen', 'schlafen'], decal: 'riss', where: 'wand', blocks: true },
  { type: 'dach', name: 'Undichtes Dach', desc: 'Wasserfleck an der Decke – es regnet rein.', costPerSqm: 70, min: 7000, rooms: ['schlafen', 'kind', 'arbeiten'], decal: 'wasser', where: 'decke', blocks: true },
  { type: 'asbest', name: 'Asbestplatten', desc: 'Alte Eternit-Verkleidung – Sanierung nur durch Fachfirma.', costPerSqm: 90, min: 9000, rooms: ['bad', 'kueche', 'flur'], decal: 'asbest', where: 'wand', blocks: true },
  { type: 'wasserschaden', name: 'Alter Wasserschaden', desc: 'Der Boden ist aufgequollen, darunter ist alles nass.', costPerSqm: 40, min: 3000, rooms: ['kueche', 'bad', 'flur', 'wohnen'], decal: 'wasser', where: 'boden', blocks: true },
  { type: 'bleirohre', name: 'Bleirohre', desc: 'Die Trinkwasserleitungen sind aus Blei – gesundheitsschädlich.', costPerSqm: 35, min: 3500, rooms: ['bad', 'kueche'], decal: 'rost', where: 'wand', blocks: true },
];
export const defectDef = (t: DefectType) => DEFECTS.find((d) => d.type === t)!;

export interface LayoutDef { id: LayoutId; name: string; desc: string; cost: (p: Property) => number; months: number; can: (p: Property) => string | null; appeal: number }
const has = (p: Property, t: RoomType) => (p.rooms ?? []).some((r) => r.type === t);
export const LAYOUTS: LayoutDef[] = [
  {
    id: 'durchbruch',
    name: 'Wand durchbrechen: offene Wohnküche',
    desc: 'Küche und Wohnzimmer werden zu einem großen, hellen Raum. Statiker inklusive.',
    cost: () => 9000,
    months: 1,
    can: (p) => (has(p, 'kueche') && has(p, 'wohnen') ? null : 'Braucht Küche und Wohnzimmer'),
    appeal: 0.12,
  },
  {
    id: 'teilen',
    name: 'Großes Zimmer teilen',
    desc: 'Eine Trockenbauwand macht aus einem großen Raum zwei Zimmer – ein Zimmer mehr bringt mehr Miete.',
    cost: () => 6500,
    months: 1,
    can: (p) => ((p.rooms ?? []).some((r) => ['wohnen', 'schlafen', 'essen'].includes(r.type) && r.size >= 24) ? null : 'Kein Zimmer ab 24 m²'),
    appeal: 0.08,
  },
  {
    id: 'wc',
    name: 'Gäste-WC einbauen',
    desc: 'Ein zweites WC im Flur – Familien lieben das.',
    cost: () => 8500,
    months: 1,
    can: (p) => (has(p, 'wc') ? 'Gibt es schon' : (p.rooms ?? []).some((r) => r.type === 'flur' && r.size >= 6) ? null : 'Flur zu klein (ab 6 m²)'),
    appeal: 0.07,
  },
  {
    id: 'balkon',
    name: 'Balkon anbauen',
    desc: 'Vorgestellter Stahlbalkon mit Glasgeländer.',
    cost: () => 14000,
    months: 1,
    can: (p) => ((p.extras ?? []).includes('balkon') ? 'Gibt es schon' : ['pilz', 'baumhaus', 'leuchtturm', 'grundstueck'].includes(p.style) ? 'Bei diesem Haus nicht möglich' : null),
    appeal: 0.08,
  },
  {
    id: 'dach',
    name: 'Dachgeschoss ausbauen',
    desc: 'Aus dem Dachboden wird ein helles Zimmer mit Gauben (+ ca. 25 m² Wohnfläche).',
    cost: () => 38000,
    months: 2,
    can: (p) =>
      (p.extras ?? []).includes('dach')
        ? 'Schon ausgebaut'
        : ['fachwerk', 'bauernhof', 'reihenhaus', 'muehle', 'chalet', 'neubau_efh'].includes(p.style) && p.units.length === 1
          ? null
          : 'Nur bei Häusern mit Satteldach',
    appeal: 0.06,
  },
];

// ---------- Erzeugung ----------
const seeded = (seed: number) => {
  let s = Math.abs(seed) % 2147483646 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export function generateRooms(p: Property, tiers = p.tiers): Room[] {
  const unitSize = p.units.length ? p.size / p.units.length : p.size;
  const R = seeded((p.seed ?? 1) * 31 + Math.round(unitSize));
  const old = (t: number) => t <= 0;
  const floorFor = (wet: boolean): FloorId => {
    const t = tiers.boden;
    if (wet) return t >= 3 ? 'marmor' : t >= 2 ? 'fliesen_hell' : t >= 1 ? 'linoleum' : 'linoleum';
    return t >= 3 ? 'parkett_eiche' : t >= 2 ? 'vinyl_beton' : t >= 1 ? 'laminat' : R() < 0.5 ? 'teppich_alt' : 'dielen_alt';
  };
  const wall: WallId = old(tiers.boden) ? 'tapete_alt' : 'weiss';
  const kitchen: KitchenId = (['alt', 'pantry', 'modern', 'industrial'] as KitchenId[])[tiers.kueche];
  const bath: BathId = (['alt', 'basic', 'modern', 'spa'] as BathId[])[tiers.bad];
  const types: RoomType[] = ['flur', 'wohnen', 'kueche', 'bad', 'schlafen'];
  if (unitSize >= 70) types.push('kind');
  if (unitSize >= 95) types.push('arbeiten');
  if (unitSize >= 115) types.push('essen');
  if (unitSize >= 135) types.push('wc');
  if (unitSize >= 160) types.push('kind');
  const weights: Record<RoomType, number> = { flur: 0.6, wohnen: 1.7, kueche: 0.8, wohnkueche: 2.3, bad: 0.55, wc: 0.2, schlafen: 1.1, kind: 0.9, arbeiten: 0.8, essen: 1 };
  const total = types.reduce((a, t) => a + weights[t], 0);
  return types.map((t, i) => ({
    id: `r${i}`,
    type: t,
    size: Math.max(t === 'wc' ? 3 : 5, Math.round((unitSize * weights[t]) / total)),
    floor: floorFor(t === 'bad' || t === 'wc' || t === 'kueche'),
    wall: t === 'bad' || t === 'wc' ? 'weiss' : wall,
    kitchen: t === 'kueche' ? kitchen : undefined,
    bath: t === 'bad' || t === 'wc' ? bath : undefined,
  }));
}

export function generateDefects(p: Property, rooms: Room[], idPrefix: string): Defect[] {
  const R = seeded((p.seed ?? 3) * 7 + rooms.length);
  const q = (p.tiers.bad + p.tiers.kueche + p.tiers.boden + p.tiers.elektrik + p.tiers.fassade) / 15;
  const count = 1 + (q < 0.25 ? (R() < 0.6 ? 1 : 0) + (R() < 0.3 ? 1 : 0) : R() < 0.3 ? 1 : 0);
  const out: Defect[] = [];
  const used = new Set<DefectType>();
  const unitFactor = Math.max(1, p.units.length);
  for (let i = 0; i < count; i++) {
    const options = DEFECTS.filter((d) => !used.has(d.type) && rooms.some((r) => d.rooms.includes(r.type)));
    if (!options.length) break;
    const d = options[Math.floor(R() * options.length)];
    used.add(d.type);
    const candidates = rooms.filter((r) => d.rooms.includes(r.type));
    const room = candidates[Math.floor(R() * candidates.length)];
    const sizeFactor = p.size * (i === 0 ? 1 : 0.5);
    const cost = Math.round(Math.max(d.min * Math.sqrt(unitFactor), (sizeFactor * d.costPerSqm) / 2) / 100) * 100;
    out.push({ id: `${idPrefix}d${i}`, type: d.type, roomId: room.id, cost, main: i === 0, found: false, fixed: false, spot: [0.2 + R() * 0.6, 0.3 + R() * 0.4] });
  }
  return out;
}

export function ensureInterior(p: Property) {
  if (p.status === 'plot' || p.style === 'grundstueck') return;
  if (p.seed === undefined) p.seed = Math.floor(Math.random() * 1e6);
  if (!p.rooms || !p.rooms.length) p.rooms = generateRooms(p);
  if (!p.defects) p.defects = p.built ? [] : generateDefects(p, p.rooms, p.id);
  if (!p.extras) p.extras = [];
  for (const u of p.units) if (u.furnished === undefined) u.furnished = null;
}

// ---------- Bewertung ----------
export const floorDef = (id: FloorId) => FLOORS.find((f) => f.id === id)!;
export const wallDef = (id: WallId) => WALLS.find((w) => w.id === id)!;
export const kitchenDef = (id: KitchenId) => KITCHENS.find((k) => k.id === id)!;
export const bathDef = (id: BathId) => BATHS.find((b) => b.id === id)!;
export const furnDef = (id: FurnStyle) => FURN_STYLES.find((f) => f.id === id)!;

/** Leitet die Ausstattungsstufen aus den Räumen ab */
export function deriveTiers(p: Property) {
  const rooms = p.rooms ?? [];
  if (!rooms.length) return;
  const sum = rooms.reduce((a, r) => a + r.size, 0) || 1;
  const fl = rooms.reduce((a, r) => a + floorDef(r.floor).tier * r.size, 0) / sum;
  const walls = rooms.filter((r) => r.wall === 'tapete_alt').length / rooms.length;
  p.tiers.boden = Math.max(0, Math.min(3, Math.round(fl - walls * 0.6))) as Tier;
  const k = rooms.find((r) => r.kitchen);
  if (k?.kitchen) p.tiers.kueche = kitchenDef(k.kitchen).tier;
  const baths = rooms.filter((r) => r.bath && r.type === 'bad');
  if (baths.length) p.tiers.bad = Math.min(...baths.map((b) => bathDef(b.bath!).tier)) as Tier;
}

/** Gestaltungs-Attraktivität 0..1 inkl. regionalem Geschmack und Grundriss */
export function appeal(p: Property) {
  const rooms = p.rooms ?? [];
  if (!rooms.length) return 0.5;
  const taste = REGION_TASTE[p.region];
  let score = 0;
  let n = 0;
  for (const r of rooms) {
    const f = floorDef(r.floor);
    const w = wallDef(r.wall);
    let s = f.appeal * 0.5 + w.appeal * 0.5;
    if (f.tags.some((t) => taste.includes(t))) s += 0.08;
    if (w.tags.some((t) => taste.includes(t))) s += 0.06;
    if (r.kitchen) {
      const k = kitchenDef(r.kitchen);
      s = s * 0.4 + k.appeal * 0.6 + (k.tags.some((t) => taste.includes(t)) ? 0.08 : 0);
    }
    if (r.bath) {
      const b = bathDef(r.bath);
      s = s * 0.4 + b.appeal * 0.6 + (b.tags.some((t) => taste.includes(t)) ? 0.08 : 0);
    }
    score += Math.min(1.1, s) * (r.type === 'wohnen' || r.type === 'wohnkueche' || r.kitchen || r.bath ? 1.5 : 1);
    n += r.type === 'wohnen' || r.type === 'wohnkueche' || r.kitchen || r.bath ? 1.5 : 1;
  }
  let a = score / n;
  // Farbharmonie: max. 3 verschiedene Wandfarben
  const colors = new Set(rooms.map((r) => r.wall));
  if (colors.size > 3) a -= 0.05 * (colors.size - 3);
  if (rooms.some((r) => r.type === 'wohnkueche')) a += 0.06;
  if ((p.extras ?? []).includes('balkon')) a += 0.05;
  if (rooms.some((r) => r.type === 'wc')) a += 0.03;
  return Math.max(0, Math.min(1, a));
}

export function roomCount(p: Property) {
  return (p.rooms ?? []).filter((r) => ['wohnen', 'wohnkueche', 'schlafen', 'kind', 'arbeiten', 'essen'].includes(r.type)).length;
}

export const openDefects = (p: Property) => (p.defects ?? []).filter((d) => !d.fixed);
export const blockingDefects = (p: Property) => (p.defects ?? []).filter((d) => !d.fixed && defectDef(d.type).blocks && d.main);

// ---------- Renovierungsplan ----------
export const emptyPlan = (): RenoPlan => ({ rooms: {}, layout: [], fix: [] });

export function planCost(p: Property, plan: RenoPlan, factor: number): { total: number; lines: { label: string; cost: number }[]; months: number } {
  const lines: { label: string; cost: number }[] = [];
  const units = Math.max(1, p.units.length);
  let months = 0;
  for (const r of p.rooms ?? []) {
    const ch = plan.rooms[r.id];
    if (!ch) continue;
    const name = ROOM_NAMES[r.type];
    if (ch.floor && ch.floor !== r.floor) lines.push({ label: `${name}: ${floorDef(ch.floor).name}`, cost: (floorDef(ch.floor).cost + 15) * r.size * units * factor });
    if (ch.wall && ch.wall !== r.wall) lines.push({ label: `${name}: ${wallDef(ch.wall).name}`, cost: WALL_COST_PER_SQM * r.size * units * factor * (r.wall === 'tapete_alt' ? 1.6 : 1) });
    if (ch.kitchen && ch.kitchen !== r.kitchen) lines.push({ label: `${name}: ${kitchenDef(ch.kitchen).name}`, cost: kitchenDef(ch.kitchen).cost * units * factor });
    if (ch.bath && ch.bath !== r.bath) lines.push({ label: `${name}: ${bathDef(ch.bath).name}`, cost: bathDef(ch.bath).cost * (r.type === 'wc' ? 0.4 : 1) * units * factor });
  }
  for (const l of plan.layout) {
    const d = LAYOUTS.find((x) => x.id === l.id)!;
    lines.push({ label: d.name, cost: d.cost(p) * (l.id === 'balkon' ? Math.min(units, 6) : units) * factor });
    months = Math.max(months, d.months);
  }
  for (const id of plan.fix) {
    const d = (p.defects ?? []).find((x) => x.id === id);
    if (d) lines.push({ label: `Mangel beheben: ${defectDef(d.type).name}`, cost: d.cost });
  }
  const tierCost = [0, 150, 300, 550];
  if (plan.elektrik !== undefined && plan.elektrik > p.tiers.elektrik) lines.push({ label: 'Elektrik & Heizung', cost: p.size * tierCost[plan.elektrik] * 0.15 * factor * 1.6 });
  if (plan.fassade !== undefined && plan.fassade > p.tiers.fassade) lines.push({ label: 'Fassade & Dach', cost: p.size * tierCost[plan.fassade] * 0.2 * factor * 1.6 });
  if (plan.facadeColor && plan.facadeColor !== p.facadeColor) lines.push({ label: 'Fassade streichen', cost: p.size * 12 * factor });
  const total = Math.round(lines.reduce((a, l) => a + l.cost, 0) / 100) * 100;
  if (lines.length) months = Math.max(months, p.size > 300 ? 2 : 1);
  lines.forEach((l) => (l.cost = Math.round(l.cost / 100) * 100));
  return { total, lines, months };
}

/** Wendet einen Plan auf das Objekt an (beim Abschluss der Renovierung oder zur Vorschau) */
export function applyPlan(p: Property, plan: RenoPlan) {
  const rooms = (p.rooms ?? []).map((r) => ({ ...r, ...(plan.rooms[r.id] ?? {}) }));
  p.rooms = rooms;
  for (const l of plan.layout) {
    if (l.id === 'durchbruch') {
      const k = rooms.find((r) => r.type === 'kueche');
      const w = rooms.find((r) => r.type === 'wohnen');
      if (k && w) {
        w.type = 'wohnkueche';
        w.size += k.size;
        w.kitchen = k.kitchen;
        p.rooms = rooms.filter((r) => r !== k);
        p.defects?.forEach((d) => d.roomId === k.id && (d.roomId = w.id));
      }
    } else if (l.id === 'teilen') {
      const big = [...(p.rooms ?? [])].filter((r) => ['wohnen', 'schlafen', 'essen'].includes(r.type) && r.size >= 24).sort((a, b) => b.size - a.size)[0];
      if (big) {
        const half = Math.floor(big.size / 2);
        big.size -= half;
        p.rooms!.push({ ...big, id: `r${Date.now() % 100000}${p.rooms!.length}`, type: 'schlafen', size: half, kitchen: undefined, bath: undefined });
      }
    } else if (l.id === 'wc') {
      const fl = p.rooms!.find((r) => r.type === 'flur');
      if (fl) fl.size = Math.max(4, fl.size - 2);
      const bath = p.rooms!.find((r) => r.type === 'bad');
      p.rooms!.push({ id: `rwc${p.rooms!.length}`, type: 'wc', size: 3, floor: 'fliesen_hell', wall: 'weiss', bath: bath?.bath && bath.bath !== 'alt' ? bath.bath : 'basic' });
    } else if (l.id === 'balkon') {
      p.extras = [...(p.extras ?? []), 'balkon'];
    } else if (l.id === 'dach') {
      p.extras = [...(p.extras ?? []), 'dach'];
      p.size += 25;
      if (p.units[0]) p.units[0].size += 25;
      p.rooms!.push({ id: `rdach${p.rooms!.length}`, type: 'arbeiten', size: 25, floor: 'parkett_eiche', wall: 'weiss' });
    }
  }
  for (const id of plan.fix) {
    const d = (p.defects ?? []).find((x) => x.id === id);
    if (d) {
      d.fixed = true;
      d.found = true;
    }
  }
  if (plan.elektrik !== undefined && plan.elektrik > p.tiers.elektrik) p.tiers.elektrik = plan.elektrik;
  if (plan.fassade !== undefined && plan.fassade > p.tiers.fassade) p.tiers.fassade = plan.fassade;
  if (plan.facadeColor) p.facadeColor = plan.facadeColor;
  deriveTiers(p);
}

export const FACADE_COLORS = ['#efe4cc', '#f4f3ef', '#e6d6bb', '#d9b48a', '#c9d3c0', '#b8c7d6', '#e3bf72', '#d8a28e', '#9aa3ab'];
