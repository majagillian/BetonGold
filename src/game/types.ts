// Zentrale Typen für Betongold

export type RegionId =
  | 'kleeweiler'
  | 'muehlental'
  | 'lumenhafen'
  | 'pilzhain'
  | 'wolkenspitz'
  | 'sonnenkueste'
  | 'kronstadt'
  | 'neuwerk';

export type Terrain = 'meadow' | 'river' | 'harbor' | 'forest' | 'mountain' | 'coast' | 'city' | 'plain';

export type HouseStyle =
  | 'fachwerk'
  | 'bauernhof'
  | 'reihenhaus'
  | 'muehle'
  | 'altbau'
  | 'speicher'
  | 'mfh'
  | 'pilz'
  | 'baumhaus'
  | 'chalet'
  | 'villa'
  | 'leuchtturm'
  | 'penthouse'
  | 'hochhaus'
  | 'gruenderzeit'
  | 'neubau_efh'
  | 'neubau_mfh'
  | 'wohnanlage'
  | 'quartier'
  | 'grundstueck';

export type RoomType = 'flur' | 'wohnen' | 'kueche' | 'wohnkueche' | 'bad' | 'wc' | 'schlafen' | 'kind' | 'arbeiten' | 'essen';
export type FloorId = 'teppich_alt' | 'linoleum' | 'dielen_alt' | 'laminat' | 'vinyl_beton' | 'fliesen_hell' | 'fliesen_dunkel' | 'parkett_eiche' | 'fischgraet' | 'marmor';
export type WallId = 'tapete_alt' | 'weiss' | 'grau' | 'salbei' | 'taupe' | 'nachtblau' | 'terrakotta' | 'altrosa' | 'ocker' | 'anthrazit';
export type KitchenId = 'alt' | 'pantry' | 'landhaus' | 'modern' | 'industrial' | 'insel';
export type BathId = 'alt' | 'basic' | 'modern' | 'spa';
export type FurnStyle = 'skandi' | 'industrial' | 'landhaus' | 'luxus';
export type DefectType = 'schimmel' | 'feuchte' | 'elektrik' | 'holzwurm' | 'riss' | 'dach' | 'asbest' | 'wasserschaden' | 'bleirohre';
export type LayoutId = 'durchbruch' | 'teilen' | 'wc' | 'balkon' | 'dach' | 'ankleide';

export interface Room {
  id: string;
  type: RoomType;
  size: number;
  floor: FloorId;
  wall: WallId;
  kitchen?: KitchenId;
  bath?: BathId;
}

export interface Defect {
  id: string;
  type: DefectType;
  roomId: string;
  cost: number;
  main: boolean;
  found: boolean;
  fixed: boolean;
  spot: [number, number]; // Position auf der Wand (0..1)
}

export interface RenoPlan {
  rooms: Record<string, { floor?: FloorId; wall?: WallId; kitchen?: KitchenId; bath?: BathId }>;
  layout: { id: LayoutId; roomId?: string }[];
  fix: string[];
  elektrik?: Tier;
  fassade?: Tier;
  facadeColor?: string;
}

export type Feature = 'bad' | 'kueche' | 'boden' | 'elektrik' | 'fassade';
export type Tier = 0 | 1 | 2 | 3; // marode, Basic, Standard, Premium

export interface AvatarConfig {
  gender: 'frau' | 'mann' | 'nonbinaer' | 'keine';
  pronouns: string;
  body: 'schmal' | 'mittel' | 'kraeftig';
  height: 'klein' | 'mittel' | 'gross';
  age: 'jung' | 'erwachsen' | 'aelter';
  skin: string;
  faceShape: 'oval' | 'rund' | 'eckig' | 'herz';
  eyes: 'rund' | 'mandel' | 'schmal' | 'freundlich';
  eyeColor: string;
  brows: 'fein' | 'kraeftig' | 'buschig' | 'gerade';
  mouth: 'laecheln' | 'grinsen' | 'neutral' | 'schmunzeln';
  lipColor: string; // 'none' oder Farbe
  blush: boolean;
  freckles: boolean;
  vitiligo: boolean;
  mole: boolean;
  beard: 'none' | 'stoppeln' | 'schnurrbart' | 'kinnbart' | 'vollbart' | 'lang';
  hair:
    | 'glatze'
    | 'buzz'
    | 'kurz'
    | 'seitenscheitel'
    | 'pixie'
    | 'undercut'
    | 'irokese'
    | 'locken'
    | 'afro'
    | 'puffs'
    | 'locs'
    | 'braids'
    | 'zopf'
    | 'dutt'
    | 'bob'
    | 'wellig'
    | 'lang';
  hairColor: string;
  top: 'tshirt' | 'tanktop' | 'hoodie' | 'hemd' | 'bluse' | 'pullover' | 'blazer' | 'anzug' | 'kleid' | 'latzhose';
  topColor: string;
  bottom: 'jeans' | 'stoffhose' | 'jogger' | 'shorts' | 'rock';
  bottomColor: string;
  shoes: 'sneaker' | 'schuhe' | 'stiefel' | 'sandalen';
  shoeColor: string;
  glasses: 'none' | 'rund' | 'eckig' | 'cateye' | 'sonnenbrille';
  headwear: 'none' | 'cap' | 'beanie' | 'hut' | 'bandana' | 'hijab' | 'turban' | 'kippa';
  headwearColor: string;
  earrings: 'none' | 'stecker' | 'ringe';
  necklace: boolean;
  hearingAid: boolean;
  mobility: 'none' | 'rollstuhl' | 'gehstock' | 'prothese';
}

export interface Tenant {
  name: string;
  job: string;
  income: number;
  schufa: 'A' | 'B' | 'C';
  avatar: AvatarConfig;
  payMoral: number; // Wahrscheinlichkeit pünktlicher Zahlung
  nomad: boolean;
  notes: string[]; // sichtbare Hinweise (inkl. Warnzeichen)
  satisfaction: number; // 0..100
  monthsStayed: number;
  paidStreak: number;
  missed: number;
  rentFactor: number; // vereinbarte Miethöhe relativ zur Marktmiete
  noticeMonths: number; // >0 = hat gekündigt, zieht in X Monaten aus
  stopsPaying: boolean;
  minderung: number; // Mietminderung in Prozent (0..1)
  minderungMonths: number;
}

export interface Unit {
  size: number;
  tenant: Tenant | null;
  listed: boolean; // Inserat aktiv
  applicants: Tenant[];
  vacantMonths: number;
  rentLevel: 0.9 | 1 | 1.15;
  furnished?: FurnStyle | null;
}

export interface Property {
  id: string;
  name: string;
  style: HouseStyle;
  region: RegionId;
  size: number; // Wohnfläche gesamt
  plotSize?: number;
  tiers: Record<Feature, Tier>;
  staging: boolean;
  status: 'idle' | 'renovating' | 'building' | 'forSale' | 'plot';
  busyMonths: number;
  pendingTiers?: Partial<Record<Feature, Tier>>;
  purchasePrice: number;
  invested: number; // Kaufpreis + Nebenkosten + Renovierung
  units: Unit[];
  saleFactor: number;
  hiddenDefect: number; // 0 = keiner, sonst Kosten
  defectKnown: boolean;
  fromAuction: boolean;
  built: boolean;
  buildType?: BuildTypeId;
  buildCost?: number;
  acquiredMonth: number;
  rooms?: Room[];
  defects?: Defect[];
  extras?: string[];
  facadeColor?: string;
  stagingStyle?: FurnStyle;
  pendingPlan?: RenoPlan;
  seed?: number;
}

export type BuildTypeId = 'efh' | 'mfh' | 'wohnanlage' | 'quartier';

export interface Offer {
  id: string;
  kind: 'kauf' | 'auktion' | 'grundstueck';
  property: Property;
  price: number;
  inspected: boolean;
  hot?: boolean;
  toured?: boolean;
  negotiated?: boolean;
}

export type LoanType = 'renovierung' | 'hypothek' | 'bau' | 'investor';

export interface Loan {
  id: string;
  type: LoanType;
  label: string;
  principal: number; // Restschuld
  original: number;
  rate: number; // Jahreszins
  monthsLeft: number;
  payment: number; // Monatsrate
  propertyId?: string;
}

export interface Message {
  id: string;
  month: number;
  from: NpcId;
  title: string;
  text: string;
  read: boolean;
  tone?: 'good' | 'bad' | 'info';
}

export type NpcId = 'hilde' | 'krause' | 'jenny' | 'bruno' | 'viktor' | 'dennis' | 'system' | 'mieter';

export interface ActiveEvent {
  uid: string;
  defId: string;
  propertyId?: string;
  unitIndex?: number;
  monthsLeft: number;
  data: Record<string, number>;
}

export interface Stats {
  profitableFlips: number;
  auctionRenovated: number;
  builtRented: number;
  crashMonths: number;
  viktorMonths: number;
  bestFlipProfit: number;
  totalRentCollected: number;
  usedDispo: boolean;
  gotDunning: boolean;
}

export interface MonthReport {
  month: number;
  rent: number;
  sales: number;
  costs: number;
  loanPayments: number;
  interest: number;
  lines: string[];
}

export interface GameState {
  version: number;
  playerName: string;
  avatar: AvatarConfig;
  cash: number;
  month: number;
  level: number;
  score: number; // Bonität 0..100
  properties: Property[];
  offers: Offer[];
  loans: Loan[];
  messages: Message[];
  events: ActiveEvent[];
  marketIndex: Record<RegionId, number>;
  dunning: number; // 0..5
  insurance: { gebaeude: boolean; mietausfall: boolean; rechtsschutz: boolean };
  hausverwaltung: boolean;
  gmbh: boolean;
  stats: Stats;
  levelStats: Stats;
  snapshots: Record<number, string>; // JSON-Snapshot zu Levelbeginn
  lastReport: MonthReport | null;
  crashHappened: boolean;
  won: boolean;
  demotions: number;
  pendingLevelUp: number | null;
  pendingDemotion: number | null;
  idCounter: number;
  flags: Record<string, number>;
  xp?: number;
  gold?: number;
  achievements?: string[];
  quests?: Quest[];
  questMonth?: number;
  counters?: Record<string, number>;
  daily?: { last: string; streak: number };
  rival?: { wealth: number; won: number; lost: number; snatched: number };
  duel?: Duel | null;
  rivals?: { name: string; wealth: number; growth: number }[];
  pendingRewards?: Reward[];
  settings?: { sound: boolean };
}

export interface Quest {
  id: string;
  key: string;
  title: string;
  target: number;
  progress: number;
  reward: { cash: number; xp: number; gold: number };
  claimed: boolean;
}

export interface Duel {
  offerId: string;
  playerBid: number;
  rivalBid: number;
  rivalMax: number;
  round: number;
  log: { who: 'du' | 'viktor'; amount: number; text?: string }[];
  status: 'running' | 'won' | 'lost';
  spied?: boolean;
}

export interface Reward {
  title: string;
  text: string;
  cash?: number;
  xp?: number;
  gold?: number;
  kind: 'achievement' | 'rank' | 'quest' | 'daily';
}
