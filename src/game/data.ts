import type { BuildTypeId, Feature, HouseStyle, NpcId, RegionId, Terrain } from './types';

export const START_CASH = 1_000_000;

export interface Region {
  id: RegionId;
  name: string;
  type: string;
  unlockLevel: number;
  pricePerSqm: number;
  rentPerSqm: number;
  demand: number; // 0..1 – wie schnell Mieter/Käufer kommen
  idealTier: 1 | 2 | 3; // ab hier lohnt sich Ausstattung kaum noch
  terrain: Terrain;
  palette: { sky: string; sky2: string; ground: string; accent: string };
  description: string;
  season?: 'sommer' | 'winter';
  eventIds: string[];
}

export const REGIONS: Region[] = [
  {
    id: 'kleeweiler',
    name: 'Kleeweiler',
    type: 'Ländliches Dorf',
    unlockLevel: 1,
    pricePerSqm: 1100,
    rentPerSqm: 6,
    demand: 0.35,
    idealTier: 2,
    terrain: 'meadow',
    palette: { sky: '#bfe6ff', sky2: '#fff3d1', ground: '#8fcf6b', accent: '#f2c14e' },
    description: 'Fachwerk, Strohdächer und der Duft frischer Brötchen. Günstig, aber Mieter sind rar.',
    eventIds: ['marder', 'brunnen'],
  },
  {
    id: 'muehlental',
    name: 'Mühlental',
    type: 'Kleinstadt am Fluss',
    unlockLevel: 2,
    pricePerSqm: 2000,
    rentPerSqm: 9,
    demand: 0.55,
    idealTier: 2,
    terrain: 'river',
    palette: { sky: '#c8e4f5', sky2: '#fde9c9', ground: '#9bc97a', accent: '#5aa0d8' },
    description: 'Steinbrücken, Wasserräder und schmucke Reihenhäuser. Solide Nachfrage.',
    eventIds: ['hochwasser', 'denkmal'],
  },
  {
    id: 'lumenhafen',
    name: 'Lumenhafen',
    type: 'Hafenstadt',
    unlockLevel: 3,
    pricePerSqm: 3200,
    rentPerSqm: 13,
    demand: 0.75,
    idealTier: 2,
    terrain: 'harbor',
    palette: { sky: '#ffd6b0', sky2: '#a9c8e8', ground: '#c98e6a', accent: '#ff9a3d' },
    description: 'Backsteinspeicher und schwebende Laternen über dem Hafen. Hier wohnen alle gern.',
    eventIds: ['keller', 'studenten'],
  },
  {
    id: 'pilzhain',
    name: 'Pilzhain',
    type: 'Verwunschener Wald',
    unlockLevel: 5,
    pricePerSqm: 1800,
    rentPerSqm: 11,
    demand: 0.6,
    idealTier: 2,
    terrain: 'forest',
    palette: { sky: '#d9c8f2', sky2: '#c5ecd7', ground: '#5f9e6e', accent: '#b47be0' },
    description: 'Riesenpilze und leuchtendes Moos. Ferienvermietung – im Sommer brummt es.',
    season: 'sommer',
    eventIds: ['wurzeln', 'flaute'],
  },
  {
    id: 'wolkenspitz',
    name: 'Wolkenspitz',
    type: 'Bergregion & Kurort',
    unlockLevel: 6,
    pricePerSqm: 4000,
    rentPerSqm: 16,
    demand: 0.6,
    idealTier: 3,
    terrain: 'mountain',
    palette: { sky: '#cfe8ff', sky2: '#ffffff', ground: '#e8f2f5', accent: '#3d8f6b' },
    description: 'Chalets, Seilbahnen und Thermalbäder. Im Winter ausgebucht.',
    season: 'winter',
    eventIds: ['lawine', 'schneelast'],
  },
  {
    id: 'sonnenkueste',
    name: 'Sonnenküste',
    type: 'Küste',
    unlockLevel: 7,
    pricePerSqm: 5500,
    rentPerSqm: 18,
    demand: 0.7,
    idealTier: 3,
    terrain: 'coast',
    palette: { sky: '#9fdcff', sky2: '#fff2c2', ground: '#f3dfa6', accent: '#1fb5b5' },
    description: 'Weiße Villen, Leuchttürme und Palmen. Teuer, begehrt – und sturmgefährdet.',
    eventIds: ['sturmflut', 'salz'],
  },
  {
    id: 'kronstadt',
    name: 'Kronstadt',
    type: 'Hauptstadt & Metropole',
    unlockLevel: 8,
    pricePerSqm: 7500,
    rentPerSqm: 25,
    demand: 0.9,
    idealTier: 3,
    terrain: 'city',
    palette: { sky: '#2c3566', sky2: '#e9a86a', ground: '#6b6f80', accent: '#f2c94c' },
    description: 'Gründerzeitfassaden und Glastürme. Höchste Mieten, höchste Einsätze.',
    eventIds: ['bieterkampf', 'mietpreisbremse'],
  },
  {
    id: 'neuwerk',
    name: 'Neuwerk',
    type: 'Brachland am Stadtrand',
    unlockLevel: 10,
    pricePerSqm: 3000,
    rentPerSqm: 15,
    demand: 0.8,
    idealTier: 2,
    terrain: 'plain',
    palette: { sky: '#ffe2c4', sky2: '#c7d9ff', ground: '#c9b48a', accent: '#e3a72f' },
    description: 'Alte Fabrikhallen und viel Platz. Hier entsteht dein eigenes Stadtquartier.',
    eventIds: ['bieterkampf'],
  },
];

export const regionById = (id: RegionId): Region => REGIONS.find((r) => r.id === id)!;

export interface PropertyTemplate {
  style: HouseStyle;
  names: string[];
  size: [number, number];
  units: number;
  regions: RegionId[];
}

export const TEMPLATES: PropertyTemplate[] = [
  { style: 'fachwerk', names: ['Fachwerkhaus am Anger', 'Altes Fachwerkhaus', 'Fachwerkhäuschen'], size: [90, 140], units: 1, regions: ['kleeweiler', 'muehlental'] },
  { style: 'bauernhof', names: ['Bauernhof mit Scheune', 'Resthof', 'Hof am Feldrand'], size: [160, 240], units: 1, regions: ['kleeweiler'] },
  { style: 'fachwerk', names: ['Wohnung über dem Bäcker'], size: [55, 75], units: 1, regions: ['kleeweiler'] },
  { style: 'reihenhaus', names: ['Reihenhaus am Fluss', 'Reihenmittelhaus', 'Reihenendhaus'], size: [100, 130], units: 1, regions: ['muehlental'] },
  { style: 'muehle', names: ['Alte Wassermühle'], size: [150, 220], units: 1, regions: ['muehlental'] },
  { style: 'altbau', names: ['Altbauwohnung', 'Altbau mit Stuck', 'Wohnung am Marktplatz'], size: [60, 95], units: 1, regions: ['muehlental', 'lumenhafen'] },
  { style: 'altbau', names: ['Zweifamilienhaus', 'Stadthaus mit zwei Wohnungen'], size: [150, 190], units: 2, regions: ['muehlental'] },
  { style: 'speicher', names: ['Speicherloft', 'Loft am Kai', 'Lagerhaus-Loft'], size: [80, 140], units: 1, regions: ['lumenhafen'] },
  { style: 'mfh', names: ['Mehrfamilienhaus (4 WE)', 'Hafenhaus mit 4 Wohnungen'], size: [260, 320], units: 4, regions: ['lumenhafen'] },
  { style: 'mfh', names: ['Dreifamilienhaus'], size: [200, 240], units: 3, regions: ['lumenhafen', 'muehlental'] },
  { style: 'pilz', names: ['Pilzhaus', 'Fliegenpilz-Cottage', 'Pilzhaus am Moosweg'], size: [60, 100], units: 1, regions: ['pilzhain'] },
  { style: 'baumhaus', names: ['Baumhaus-Chalet', 'Wipfelhaus'], size: [45, 70], units: 1, regions: ['pilzhain'] },
  { style: 'chalet', names: ['Chalet mit Bergblick', 'Ferienchalet', 'Almhütte'], size: [90, 160], units: 1, regions: ['wolkenspitz'] },
  { style: 'chalet', names: ['Kurpension (3 Wohnungen)'], size: [220, 280], units: 3, regions: ['wolkenspitz'] },
  { style: 'villa', names: ['Strandvilla', 'Villa mit Meerblick'], size: [180, 260], units: 1, regions: ['sonnenkueste'] },
  { style: 'villa', names: ['Ferienhaus am Strand'], size: [90, 130], units: 1, regions: ['sonnenkueste'] },
  { style: 'leuchtturm', names: ['Leuchtturm zum Umbauen'], size: [80, 110], units: 1, regions: ['sonnenkueste'] },
  { style: 'gruenderzeit', names: ['Gründerzeit-Altbauwohnung', 'Prachtwohnung mit Stuck'], size: [85, 140], units: 1, regions: ['kronstadt'] },
  { style: 'gruenderzeit', names: ['Gründerzeithaus (6 WE)'], size: [480, 560], units: 6, regions: ['kronstadt'] },
  { style: 'penthouse', names: ['Penthouse über der Stadt'], size: [140, 220], units: 1, regions: ['kronstadt'] },
  { style: 'hochhaus', names: ['Apartment im Glasturm', 'Cityapartment'], size: [45, 70], units: 1, regions: ['kronstadt'] },
];

export interface BuildType {
  id: BuildTypeId;
  name: string;
  style: HouseStyle;
  size: number;
  units: number;
  months: number;
  minLevel: number;
  plotSize: number;
  regions?: RegionId[];
}

export const BUILD_TYPES: BuildType[] = [
  { id: 'efh', name: 'Einfamilienhaus', style: 'neubau_efh', size: 140, units: 1, months: 4, minLevel: 5, plotSize: 500 },
  { id: 'mfh', name: 'Mehrfamilienhaus (6 Wohnungen)', style: 'neubau_mfh', size: 480, units: 6, months: 6, minLevel: 5, plotSize: 900 },
  { id: 'wohnanlage', name: 'Wohnanlage (12 Wohnungen)', style: 'wohnanlage', size: 960, units: 12, months: 8, minLevel: 8, plotSize: 1600 },
  { id: 'quartier', name: 'Quartiersblock (24 Wohnungen)', style: 'quartier', size: 1920, units: 24, months: 10, minLevel: 10, plotSize: 3000, regions: ['neuwerk'] },
];

export const buildTypeById = (id: BuildTypeId) => BUILD_TYPES.find((b) => b.id === id)!;

export const FEATURES: { id: Feature; name: string; weight: number; icon: string }[] = [
  { id: 'bad', name: 'Bad', weight: 0.25, icon: '🛁' },
  { id: 'kueche', name: 'Küche', weight: 0.2, icon: '🍳' },
  { id: 'boden', name: 'Böden & Wände', weight: 0.2, icon: '🪵' },
  { id: 'elektrik', name: 'Elektrik & Heizung', weight: 0.15, icon: '⚡' },
  { id: 'fassade', name: 'Fassade & Dach', weight: 0.2, icon: '🏠' },
];

export const TIER_NAMES = ['marode', 'Basic', 'Standard', 'Premium'];
export const TIER_VALUE = [0, 0.6, 0.85, 1];
export const TIER_COST_PER_SQM = [0, 150, 300, 550];

export const NPCS: Record<NpcId, { name: string; role: string }> = {
  hilde: { name: 'Oma Hilde', role: 'Mentorin' },
  krause: { name: 'Herr Krause', role: 'Bankberater' },
  jenny: { name: 'Jenny', role: 'Maklerin' },
  bruno: { name: 'Bruno', role: 'Handwerker' },
  viktor: { name: 'Viktor von Hohenstein', role: 'Rivale' },
  dennis: { name: 'Dennis', role: 'Kumpel' },
  system: { name: 'Betongold', role: 'System' },
  mieter: { name: 'Mieter', role: 'Mieter' },
};

export const FIRST_NAMES = [
  'Aylin', 'Ben', 'Chiara', 'Deniz', 'Elif', 'Finn', 'Grace', 'Hamid', 'Ida', 'Jonas', 'Kemal', 'Lea', 'Malik', 'Nora',
  'Olu', 'Paula', 'Quentin', 'Rana', 'Sami', 'Tara', 'Uwe', 'Valentina', 'Wei', 'Xenia', 'Yusuf', 'Zoe', 'Amara', 'Bilal',
  'Carla', 'Dmitri', 'Emre', 'Fatima', 'Gustav', 'Hana', 'Igor', 'Jana', 'Kofi', 'Luca', 'Mei', 'Nikolai', 'Priya', 'Robin',
  'Sven', 'Thu', 'Ulla', 'Vincent', 'Wanda', 'Kim', 'Alex', 'Sascha',
];
export const LAST_NAMES = [
  'Albers', 'Bauer', 'Çelik', 'Diallo', 'Engel', 'Fischer', 'Gonzales', 'Hoffmann', 'Ivanova', 'Jansen', 'Kaya', 'Lehmann',
  'Mensah', 'Nguyen', 'Okafor', 'Peters', 'Quast', 'Rossi', 'Schmidt', 'Tanaka', 'Usman', 'Vogel', 'Wagner', 'Yilmaz', 'Zimmermann',
  'Novak', 'Haddad', 'Kowalski', 'Becker', 'Sato',
];

export interface Job {
  name: string;
  income: [number, number];
  regions?: RegionId[];
}

export const JOBS: Job[] = [
  { name: 'Landwirtin', income: [2200, 3200], regions: ['kleeweiler'] },
  { name: 'Rentner', income: [1600, 2600], regions: ['kleeweiler', 'muehlental', 'wolkenspitz', 'sonnenkueste'] },
  { name: 'Bäcker', income: [2200, 2900], regions: ['kleeweiler', 'muehlental'] },
  { name: 'Lehrerin', income: [3600, 4600] },
  { name: 'Pflegekraft', income: [2800, 3600] },
  { name: 'Student', income: [900, 1400], regions: ['lumenhafen', 'kronstadt', 'muehlental'] },
  { name: 'Hafenarbeiterin', income: [2600, 3400], regions: ['lumenhafen'] },
  { name: 'Softwareentwickler', income: [4500, 7000], regions: ['lumenhafen', 'kronstadt', 'neuwerk'] },
  { name: 'Ärztin', income: [6000, 9000] },
  { name: 'Kellner', income: [1900, 2500] },
  { name: 'Grafikdesignerin', income: [2800, 4200] },
  { name: 'Busfahrer', income: [2600, 3200] },
  { name: 'Start-up-Gründerin', income: [3000, 9000], regions: ['kronstadt', 'neuwerk', 'lumenhafen'] },
  { name: 'Skilehrer', income: [2400, 3800], regions: ['wolkenspitz'] },
  { name: 'Feriengäste-Familie', income: [3500, 6000], regions: ['pilzhain', 'wolkenspitz', 'sonnenkueste'] },
  { name: 'Musiker', income: [1200, 3500] },
  { name: 'Anwalt', income: [5500, 10000], regions: ['kronstadt', 'muehlental', 'lumenhafen'] },
  { name: 'Elektrikerin', income: [3000, 3900] },
  { name: 'Influencer', income: [500, 12000], regions: ['kronstadt', 'sonnenkueste'] },
  { name: 'Fischer', income: [2200, 3000], regions: ['lumenhafen', 'sonnenkueste'] },
  { name: 'Försterin', income: [2900, 3600], regions: ['pilzhain'] },
];

export const POSITIVE_NOTES = [
  'Bringt eine Mappe mit allen Unterlagen mit',
  'Vorvermieter schreibt eine sehr gute Referenz',
  'Möchte langfristig bleiben',
  'Fragt interessiert nach der Hausordnung',
  'Unbefristeter Arbeitsvertrag',
  'Nichtraucher, keine Haustiere',
  'Hat eine kleine, ruhige Katze',
  'Arbeitet im Homeoffice, sehr ruhig',
];

export const WARNING_NOTES = [
  'Möchte die Kaution unbedingt bar zahlen',
  'Keine Vorvermieterbescheinigung dabei',
  'Will sofort einziehen – egal wie',
  'Gehaltsnachweis wirkt nachbearbeitet',
  'Ist in zwei Jahren viermal umgezogen',
  'Weicht Fragen zum Arbeitgeber aus',
];

export const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const LEVEL_TITLES = [
  '',
  'Der Lottogewinner',
  'Erste Mieter',
  'Der Kleinvermieter',
  'Problemfälle',
  'Der Bauherr',
  'Gründer',
  'Krisenfest',
  'Investor',
  'Der Rivale',
  'Der Mogul',
];

export const LEVEL_STORY: string[] = [
  '',
  'Eine Million im Lotto! Oma Hilde rät: „Fang klein an, Kind. In Kleeweiler gibt es Häuser, die nur auf dich warten. Kaufen, herrichten, gewinnbringend verkaufen – so lernst du das Geschäft.“',
  'Mühlental ruft! Hilde: „Ein Haus verkaufen ist schön – aber eine Wohnung, die jeden Monat Miete bringt, ist schöner. Such dir gute Mieter und halte sie sechs Monate.“ Herr Krause von der Bank bietet dir jetzt auch Renovierungskredite an.',
  'Lumenhafen öffnet die Tore. Herr Krause: „Mit einer Hypothek können Sie Ihr Eigenkapital hebeln.“ Ziel: drei vermietete Wohnungen mit zusammen 3.000 € Netto-Miete im Monat.',
  'Nicht jeder Mieter meint es gut. Jetzt gibt es Zwangsversteigerungen – und Mietnomaden. Ersteigere ein Objekt und bring es auf Standard. Tipp: Eine Hausverwaltung nimmt dir Arbeit ab.',
  'Der Pilzhain ist erreichbar! Ab jetzt kannst du Grundstücke kaufen und selbst bauen. Bruno freut sich: „Endlich mal ein Neubau!“ Baue ein Haus und vermiete es.',
  'Zeit für eine eigene Firma. Gründe eine GmbH (günstigere Zinsen!) und erreiche ein Vermögen von 5 Millionen €. Wolkenspitz mit seinen Chalets ist jetzt offen.',
  'Die Sonnenküste glänzt – doch am Horizont ziehen Wolken auf. Herr Krause warnt vor einer Blase. Überstehe den kommenden Immobiliencrash zwölf Monate lang ohne Insolvenz.',
  'Kronstadt, die Hauptstadt! Investoren klopfen an. Baue eine Wohnanlage mit mindestens 12 Wohnungen.',
  'Viktor von Hohenstein will dich schlucken: „Ihr kleines Imperium passt hervorragend in mein Portfolio.“ Halte sechs Monate am Stück eine Eigenkapitalquote von mindestens 40 % und 250.000 € Rücklage.',
  'Das Brachland Neuwerk gehört der Zukunft – und dir? Baue zwei Quartiersblöcke und vermiete dort 40 Wohnungen. Dann bist du der Mogul von Aurelien.',
];
