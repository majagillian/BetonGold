// Schlichte Linien-Icons (24×24)
const P: Record<string, string> = {
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  home: 'M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10',
  market: 'M4 7h16l-1.5 9h-13L4 7Zm0 0L3 4H1m6 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  bank: 'M3 9 12 4l9 5M4 10h16M6 10v8m4-8v8m4-8v8m4-8v8M3 20h18',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Zm4 4h4',
  mail: 'M3 6h18v12H3V6Zm0 0 9 7 9-7',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H4a3 3 0 0 0 4 4m8-4h4a3 3 0 0 1-4 4m-4 3v4m-4 3h8',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  gold: 'M4 15h7l-1.5-5h-4L4 15Zm9 0h7l-1.5-5h-4L13 15Zm-4.5-6h7L14 4h-4l-1.5 5ZM3 19h18',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm2.5-11.5a3 3 0 0 0-5 1v3a3 3 0 0 0 5 1M7.5 11h5m-5 2h5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4A7 7 0 0 0 7.8 6.7l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7 7 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z',
  chevron: 'm9 6 6 6-6 6',
  back: 'm15 6-6 6 6 6',
  check: 'm5 12 5 5 9-10',
  lock: 'M6 11h12v9H6v-9Zm2 0V8a4 4 0 1 1 8 0v3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  hammer: 'M14 6 18 10l-2 2-4-4 2-2Zm-2 2-8 8 2 2 8-8M14 6l1-2 5 5-2 1',
  key: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm3-4h10m-3 0v3m-3-3v2',
  sofa: 'M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 12h18v5H3v-5Zm2 5v2m14-2v2',
  paint: 'M4 4h13v5H4V4Zm13 2h3v6h-8v3m-1 0h2v6h-2v-6Z',
  wall: 'M3 5h18v14H3V5Zm0 5h18M3 14h18M9 5v5m6-5v5m-9 4v5m6-5v5m6-5v5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9v.01',
  warn: 'M12 3 2 20h20L12 3Zm0 6v5m0 3v.01',
  flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 1-5.5 1-7.5Z',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m3 15a6 6 0 0 0-4-5.6',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  calendar: 'M4 6h16v14H4V6Zm0 4h16M8 3v4m8-4v4',
  next: 'M5 5v14l9-7-9-7Zm11 0v14',
  wheel: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9 0-9m0 9 7.8 4.5M12 12l-7.8 4.5',
  sound: 'M4 9h4l5-4v14l-5-4H4V9Zm13 0a4 4 0 0 1 0 6',
  mute: 'M4 9h4l5-4v14l-5-4H4V9Zm13 1 4 4m0-4-4 4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  door: 'M6 3h12v18H6V3Zm8 9v.01M3 21h18',
  ruler: 'M3 17 17 3l4 4L7 21l-4-4Zm4-4 2 2m1-5 2 2m1-5 2 2',
  water: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  swords: 'm4 4 9 9m-2 2-2 2-3-3 2-2m10-8-9 9m2 2 2 2 3-3-2-2M4 4h3v3M20 4h-3v3',
  up: 'M12 19V5m-6 6 6-6 6 6',
  down: 'M12 5v14m-6-6 6 6 6-6',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4v.01',
  build: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h12',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
  people: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0',
};

export function Icon({ name, size = 20, class: cls, stroke = 1.8 }: { name: keyof typeof P | string; size?: number; class?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" class={`icon ${cls ?? ''}`} aria-hidden="true">
      <path d={P[name] ?? P.info} />
    </svg>
  );
}

const EVENT_ICONS: Record<string, string> = {
  rohrbruch: 'water', hochwasser: 'water', keller: 'water', sturmflut: 'water', brunnen: 'water',
  heizung: 'bolt', aufzug: 'bolt', schimmel: 'warn', marder: 'warn', laerm: 'users', einbruch: 'shield',
  bauverzoegerung: 'build', pfusch: 'hammer', wurzeln: 'warn', flaute: 'chart', lawine: 'warn', schneelast: 'warn', salz: 'warn',
  zinserhoehung: 'chart', crash: 'down', mietpreisbremse: 'shield', viktor_angebot: 'swords', viktor_bank: 'swords', dennis: 'coin',
  bahnlinie: 'up', studenten: 'people', mietausfall: 'coin', nomaden: 'warn', mangel: 'search', mahnung2: 'warn', denkmal: 'home',
};
export const eventIcon = (id: string) => EVENT_ICONS[id] ?? 'info';
