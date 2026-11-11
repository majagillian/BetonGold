import { useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import { regionById } from '../game/data';
import type { RegionId } from '../game/types';
import { nextId, shade } from './color';

const mini = (x: number, y: number, w: number, h: number, wall: string, roof: string, key: string, flat = false): JSX.Element => (
  <g key={key}>
    <rect x={x} y={y - h} width={w} height={h} fill={wall} />
    {flat ? (
      <rect x={x - 2} y={y - h - 4} width={w + 4} height={5} fill={roof} />
    ) : (
      <path d={`M${x - 3} ${y - h + 1} L${x + w / 2} ${y - h - w * 0.45} L${x + w + 3} ${y - h + 1} Z`} fill={roof} />
    )}
    <rect x={x + w * 0.2} y={y - h * 0.7} width={w * 0.22} height={h * 0.25} fill="#ffe7a3" />
    <rect x={x + w * 0.58} y={y - h * 0.7} width={w * 0.22} height={h * 0.25} fill="#ffe7a3" />
  </g>
);

export function RegionScene({ region, locked, class: cls }: { region: RegionId; locked?: boolean; class?: string }) {
  const id = useMemo(() => nextId('rs'), []);
  const r = regionById(region);
  const p = r.palette;
  const els: JSX.Element[] = [];
  const night = region === 'kronstadt';

  switch (r.terrain) {
    case 'meadow':
      els.push(<path key="h1" d="M0 96 Q80 70 160 92 T320 86 L320 150 L0 150 Z" fill={shade(p.ground, 0.15)} />);
      els.push(<path key="h2" d="M0 112 Q100 94 200 110 T320 104 L320 150 L0 150 Z" fill={p.ground} />);
      els.push(mini(60, 112, 30, 22, '#f4e7c9', '#b9533c', 'a'));
      els.push(mini(120, 108, 26, 20, '#f4e7c9', '#9a4a34', 'b'));
      els.push(mini(220, 110, 40, 22, '#b8443a', '#6b4a3a', 'c'));
      els.push(<circle key="t1" cx={180} cy={100} r={12} fill="#4f9d5d" />);
      els.push(<circle key="t2" cx={282} cy={102} r={10} fill="#4f9d5d" />);
      [30, 100, 170, 250].forEach((x) => els.push(<circle key={`fl${x}`} cx={x} cy={132} r={2.5} fill="#fff1a8" />));
      break;
    case 'river':
      els.push(<path key="h1" d="M0 90 Q120 70 320 88 L320 150 L0 150 Z" fill={shade(p.ground, 0.12)} />);
      els.push(<path key="riv" d="M0 128 Q90 112 160 126 T320 120 L320 140 Q240 136 160 144 T0 146 Z" fill={p.accent} />);
      els.push(<path key="bridge" d="M120 128 Q160 100 200 126" stroke="#b9ad9b" stroke-width={7} fill="none" />);
      els.push(mini(30, 112, 24, 26, '#ead8b8', '#8a4b3a', 'a'));
      els.push(mini(56, 112, 24, 26, '#f1d2c0', '#8a4b3a', 'b'));
      els.push(mini(230, 108, 34, 30, '#cfc6b8', '#7a4b3a', 'c'));
      els.push(<circle key="wheel" cx={272} cy={112} r={12} fill="none" stroke="#6b4a2a" stroke-width={3} />);
      break;
    case 'harbor':
      els.push(<rect key="sea" x={0} y={112} width={320} height={40} fill="#4f86b8" />);
      els.push(<rect key="kai" x={0} y={104} width={210} height={10} fill="#8c7a6a" />);
      els.push(mini(14, 104, 34, 46, '#b5523b', '#4a4a52', 'a', true));
      els.push(mini(52, 104, 34, 54, '#a8473a', '#4a4a52', 'b', true));
      els.push(mini(90, 104, 34, 40, '#c2613f', '#4a4a52', 'c', true));
      els.push(mini(130, 104, 30, 34, '#f1d9a6', '#4f5d75', 'd', true));
      els.push(<path key="boat" d="M236 118 L292 118 L282 130 L244 130 Z" fill="#f4f1ea" />);
      els.push(<path key="mast" d="M262 118 L262 84 L282 112 Z" fill="#fff8ec" stroke="#6b4a2a" stroke-width={1.5} />);
      [40, 110, 180, 250].forEach((x, i) => els.push(<circle key={`lan${x}`} cx={x} cy={30 + (i % 2) * 14} r={5} fill="#ffb347" opacity={0.85} />));
      break;
    case 'forest':
      els.push(<path key="h1" d="M0 104 Q160 86 320 104 L320 150 L0 150 Z" fill={p.ground} />);
      [10, 52, 250, 292].forEach((x, i) =>
        els.push(<path key={`tr${x}`} d={`M${x} 110 L${x + 18} ${44 + (i % 2) * 14} L${x + 36} 110 Z`} fill={shade(p.ground, -0.2 - (i % 2) * 0.1)} />),
      );
      els.push(<path key="pstem" d="M132 116 L136 92 L164 92 L168 116 Z" fill="#f6ead2" />);
      els.push(<path key="pcap" d="M118 94 Q124 54 150 54 Q176 54 182 94 Q150 100 118 94 Z" fill="#e0473f" />);
      [[136, 72], [158, 66], [168, 84]].forEach(([x, y], i) => els.push(<circle key={`pd${i}`} cx={x} cy={y} r={4} fill="#fff6ea" />));
      els.push(<path key="pstem2" d="M206 118 L208 104 L222 104 L224 118 Z" fill="#f6ead2" />);
      els.push(<path key="pcap2" d="M198 106 Q202 86 215 86 Q228 86 232 106 Z" fill="#b47be0" />);
      [[100, 60], [230, 50], [60, 80], [280, 70]].forEach(([x, y], i) => els.push(<circle key={`gl${i}`} cx={x} cy={y} r={2.5} fill="#e7fbff" />));
      break;
    case 'mountain':
      els.push(<path key="m1" d="M0 120 L70 40 L130 110 L190 30 L260 100 L320 50 L320 150 L0 150 Z" fill="#9fb3c8" />);
      els.push(<path key="snow1" d="M58 54 L70 40 L84 56 L76 52 L70 58 Z M176 46 L190 30 L206 48 L196 44 L190 50 Z M308 62 L320 50 L320 64 Z" fill="#ffffff" />);
      els.push(<path key="h2" d="M0 120 Q160 104 320 118 L320 150 L0 150 Z" fill={p.ground} />);
      els.push(mini(70, 122, 40, 22, '#8b5a3c', '#5a3a2a', 'a'));
      els.push(mini(200, 120, 34, 20, '#9a6a48', '#5a3a2a', 'b'));
      els.push(<path key="cable" d="M0 40 L320 20" stroke="#4a4a52" stroke-width={1.2} />);
      els.push(<rect key="gondola" x={150} y={30} width={14} height={11} rx={2} fill="#e05a4f" />);
      [30, 140, 270].forEach((x) => els.push(<path key={`fir${x}`} d={`M${x} 128 L${x + 8} 104 L${x + 16} 128 Z`} fill={p.accent} />));
      break;
    case 'coast':
      els.push(<rect key="sea" x={0} y={96} width={320} height={60} fill="#38b6d8" />);
      els.push(<path key="beach" d="M0 150 L0 116 Q120 100 220 120 Q280 130 320 120 L320 150 Z" fill={p.ground} />);
      els.push(mini(40, 118, 44, 28, '#fbfaf5', '#e9e4d8', 'a', true));
      els.push(mini(100, 114, 36, 24, '#fbfaf5', '#e9e4d8', 'b', true));
      els.push(<path key="lt" d="M262 120 L266 60 L278 60 L282 120 Z" fill="#fbfaf5" />);
      els.push(<rect key="ltb" x={264} y={78} width={16} height={12} fill="#d9443b" />);
      els.push(<rect key="ltl" x={265} y={50} width={14} height={10} fill="#ffe08a" />);
      els.push(<path key="palm" d="M180 120 Q176 96 184 76" stroke="#8b6a3c" stroke-width={4} fill="none" />);
      els.push(<path key="leaves" d="M184 76 Q170 70 160 80 M184 76 Q198 68 208 78 M184 76 Q184 62 176 58 M184 76 Q194 62 200 60" stroke="#3e9b5a" stroke-width={4} fill="none" stroke-linecap="round" />);
      break;
    case 'city': {
      const towers = [[10, 60, 34], [48, 90, 28], [80, 50, 40], [124, 104, 30], [158, 70, 36], [198, 120, 26], [228, 80, 40], [272, 64, 38]];
      towers.forEach(([x, h, w], i) => {
        els.push(<rect key={`tw${i}`} x={x} y={140 - h} width={w} height={h} fill={i % 2 ? '#3d4675' : '#4a5488'} />);
        for (let yy = 140 - h + 8; yy < 136; yy += 10)
          for (let xx = x + 5; xx < x + w - 5; xx += 9) if ((xx + yy + i) % 3) els.push(<rect key={`wn${i}-${xx}-${yy}`} x={xx} y={yy} width={4} height={5} fill="#ffd66b" opacity={0.85} />);
      });
      els.push(<path key="dome" d="M126 36 Q139 14 152 36 Z" fill={p.accent} />);
      els.push(<rect key="ground" x={0} y={138} width={320} height={14} fill="#2a2f45" />);
      break;
    }
    case 'plain':
    default:
      els.push(<path key="g" d="M0 106 Q160 96 320 106 L320 150 L0 150 Z" fill={p.ground} />);
      els.push(<rect key="hall" x={40} y={76} width={80} height={34} fill="#9a8a78" />);
      els.push(<path key="saw" d="M40 76 L56 62 L56 76 L72 62 L72 76 L88 62 L88 76 L104 62 L104 76 L120 62 L120 76 Z" fill="#7a6a5a" />);
      els.push(<rect key="chim" x={128} y={40} width={10} height={70} fill="#8a5a4a" />);
      els.push(<path key="crane" d="M240 112 L240 30 M200 34 L290 34" stroke={p.accent} stroke-width={5} />);
      els.push(<rect key="fence" x={170} y={104} width={130} height={4} fill="#c9a46a" />);
      break;
  }

  return (
    <svg viewBox="0 0 320 150" class={cls} preserveAspectRatio="xMidYMid slice" role="img" aria-label={r.name}>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={p.sky} />
          <stop offset="1" stop-color={p.sky2} />
        </linearGradient>
      </defs>
      <rect width="320" height="150" fill={`url(#${id}sky)`} />
      {night ? <circle cx={270} cy={30} r={12} fill="#fff4d0" /> : <circle cx={268} cy={30} r={16} fill="#fff6c9" opacity={0.9} />}
      <ellipse cx={70} cy={30} rx={26} ry={8} fill="#ffffff" opacity={night ? 0.15 : 0.7} />
      <ellipse cx={180} cy={22} rx={20} ry={6} fill="#ffffff" opacity={night ? 0.1 : 0.55} />
      {els}
      {locked && (
        <g>
          <rect width="320" height="150" fill="#2b2140" opacity={0.55} />
          <ellipse cx={80} cy={70} rx={90} ry={30} fill="#ffffff" opacity={0.18} />
          <ellipse cx={240} cy={90} rx={100} ry={34} fill="#ffffff" opacity={0.15} />
        </g>
      )}
    </svg>
  );
}
