import { useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import type { HouseStyle, RegionId } from '../game/types';
import { regionById } from '../game/data';
import { mix, nextId, shade } from './color';

export interface HouseProps {
  style: HouseStyle;
  region: RegionId;
  quality: number; // 0..1 (roh)
  lit?: boolean;
  state?: 'idle' | 'renovating' | 'building' | 'forSale' | 'plot';
  size?: number | string;
  class?: string;
  seed?: string;
}

type RoofType = 'gable' | 'chalet' | 'flat' | 'mansard' | 'stepgable' | 'hip';

interface Spec {
  w: number;
  floors: number;
  fh: number;
  wall: string;
  roof: string;
  roofType: RoofType;
  timber?: boolean;
  brick?: boolean;
  wood?: boolean;
  ornate?: boolean;
  balconies?: boolean;
  glass?: boolean;
  modern?: boolean;
}

const SPECS: Partial<Record<HouseStyle, Spec>> = {
  fachwerk: { w: 116, floors: 2, fh: 34, wall: '#f4e7c9', roof: '#b9533c', roofType: 'gable', timber: true },
  bauernhof: { w: 164, floors: 1, fh: 46, wall: '#b8443a', roof: '#6b4a3a', roofType: 'gable', wood: true },
  reihenhaus: { w: 74, floors: 2, fh: 32, wall: '#ead8b8', roof: '#8a4b3a', roofType: 'gable' },
  altbau: { w: 112, floors: 3, fh: 30, wall: '#eccaa8', roof: '#6f6a78', roofType: 'mansard', ornate: true },
  speicher: { w: 112, floors: 4, fh: 27, wall: '#b5523b', roof: '#4a4a52', roofType: 'stepgable', brick: true },
  mfh: { w: 124, floors: 3, fh: 28, wall: '#f1d9a6', roof: '#4f5d75', roofType: 'flat', balconies: true },
  chalet: { w: 136, floors: 2, fh: 30, wall: '#8b5a3c', roof: '#5a3a2a', roofType: 'chalet', wood: true, balconies: true },
  villa: { w: 156, floors: 2, fh: 32, wall: '#fbfaf5', roof: '#e9e4d8', roofType: 'flat', glass: true, modern: true },
  gruenderzeit: { w: 124, floors: 4, fh: 27, wall: '#ecc66d', roof: '#5f6b7a', roofType: 'mansard', ornate: true },
  neubau_efh: { w: 112, floors: 2, fh: 30, wall: '#f6f3ec', roof: '#3f4a5a', roofType: 'gable', modern: true },
  neubau_mfh: { w: 144, floors: 3, fh: 28, wall: '#efe8dc', roof: '#555f6e', roofType: 'flat', balconies: true, modern: true },
  penthouse: { w: 96, floors: 6, fh: 21, wall: '#c9d6e3', roof: '#3a4252', roofType: 'flat', glass: true, modern: true },
  hochhaus: { w: 84, floors: 7, fh: 20, wall: '#a9c3db', roof: '#3a4252', roofType: 'flat', glass: true, modern: true },
};

const GROUND = 178;

export function House({ style, region, quality, lit, state = 'idle', size, class: cls }: HouseProps) {
  const id = useMemo(() => nextId('h'), []);
  const r = regionById(region);
  const cond = quality < 0.3 ? 'marode' : quality < 0.7 ? 'ok' : 'top';
  const wear = (c: string) => (cond === 'marode' ? mix(c, '#8d8a85', 0.45) : c);
  const winFill = lit ? '#ffd66b' : cond === 'marode' ? '#5e6a72' : '#a8d2ef';
  const els: JSX.Element[] = [];

  const window = (x: number, y: number, w = 14, h = 18, arch = false, k = 0) => {
    const boarded = cond === 'marode' && (k * 7 + Math.round(x)) % 3 === 0;
    els.push(
      <g key={`w${x}-${y}`}>
        {arch ? (
          <path d={`M${x} ${y + h} L${x} ${y + w / 2} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + w / 2} L${x + w} ${y + h} Z`} fill={winFill} stroke="#ffffff" stroke-width={2} />
        ) : (
          <rect x={x} y={y} width={w} height={h} rx={2} fill={winFill} stroke="#ffffff" stroke-width={2} />
        )}
        {!lit && cond !== 'marode' && <path d={`M${x + 3} ${y + h - 4} L${x + w - 4} ${y + 3}`} stroke="#ffffff" stroke-width={1.5} opacity={0.6} />}
        <path d={`M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h / 2} L${x + w} ${y + h / 2}`} stroke="#ffffff" stroke-width={1.3} opacity={0.85} />
        {lit && <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={5} fill="#ffd66b" opacity={0.18} />}
        {boarded && <path d={`M${x - 2} ${y + 4} L${x + w + 2} ${y + h - 4} M${x - 2} ${y + h - 4} L${x + w + 2} ${y + 4}`} stroke="#7a5536" stroke-width={4} stroke-linecap="round" />}
        {cond === 'top' && y + h < GROUND - 10 && (
          <g>
            <rect x={x - 2} y={y + h} width={w + 4} height={5} rx={1} fill="#8b5a3c" />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={x + 2 + i * (w / 2 - 1)} cy={y + h - 1} r={2.6} fill={i % 2 ? '#ff7aa2' : '#ffcf4d'} />
            ))}
          </g>
        )}
      </g>,
    );
  };

  const door = (cx: number, color = r.palette.accent, w = 18, h = 28) => {
    els.push(
      <g key={`d${cx}`}>
        <rect x={cx - w / 2 - 3} y={GROUND - h - 3} width={w + 6} height={h + 3} rx={3} fill={shade(color, -0.35)} />
        <rect x={cx - w / 2} y={GROUND - h} width={w} height={h} rx={w / 2 > 8 ? 3 : 2} fill={wear(color)} />
        <circle cx={cx + w / 2 - 4} cy={GROUND - h / 2} r={1.6} fill="#f2d16b" />
        {lit && <circle cx={cx} cy={GROUND - h - 8} r={3} fill="#ffe08a" />}
      </g>,
    );
  };

  const groundPatch = (
    <g key="ground">
      <ellipse cx={120} cy={GROUND + 6} rx={112} ry={16} fill={r.palette.ground} />
      <ellipse cx={120} cy={GROUND + 4} rx={92} ry={8} fill="#000000" opacity={0.1} />
    </g>
  );

  const bushes = (xs: number[]) =>
    xs.forEach((x, i) =>
      els.push(
        <g key={`b${x}`}>
          <circle cx={x} cy={GROUND - 4} r={9} fill={cond === 'marode' ? '#8d8f5a' : '#4f9d5d'} />
          <circle cx={x + 8} cy={GROUND - 2} r={7} fill={cond === 'marode' ? '#7a7c4c' : '#5fb36c'} />
          {cond === 'top' && <circle cx={x + 2} cy={GROUND - 9} r={2.2} fill={i % 2 ? '#ff7aa2' : '#fff1a8'} />}
        </g>,
      ),
    );

  const cracks = (x: number, y: number) => {
    if (cond !== 'marode') return;
    els.push(<path key={`c${x}${y}`} d={`M${x} ${y} l6 8 l-4 6 l7 9 l-3 7`} stroke="#5a4a40" stroke-width={1.5} fill="none" opacity={0.7} />);
  };

  const weeds = () => {
    if (cond !== 'marode') return;
    [40, 70, 160, 196].forEach((x) =>
      els.push(<path key={`wd${x}`} d={`M${x} ${GROUND + 2} l-3 -12 M${x} ${GROUND + 2} l2 -14 M${x} ${GROUND + 2} l6 -9`} stroke="#7e8a3a" stroke-width={2} stroke-linecap="round" />),
    );
  };

  const roof = (s: Spec, x: number, w: number, topY: number) => {
    const rc = wear(s.roof);
    const cx = x + w / 2;
    switch (s.roofType) {
      case 'gable': {
        const h = w * 0.4;
        els.push(<path key="roof" d={`M${x - 8} ${topY + 2} L${cx} ${topY - h} L${x + w + 8} ${topY + 2} Z`} fill={rc} />);
        els.push(<path key="roofsh" d={`M${cx} ${topY - h} L${x + w + 8} ${topY + 2} L${cx} ${topY + 2} Z`} fill="#000000" opacity={0.12} />);
        for (let i = 1; i < 4; i++) {
          const yy = topY - h + (h * i) / 4;
          const half = ((w / 2 + 8) * i) / 4;
          els.push(<path key={`rl${i}`} d={`M${cx - half} ${yy} L${cx + half} ${yy}`} stroke={shade(rc, -0.2)} stroke-width={1.2} opacity={0.6} />);
        }
        els.push(<rect key="chimney" x={x + w * 0.68} y={topY - h * 0.7} width={10} height={h * 0.5} fill={shade(rc, -0.25)} />);
        if (cond === 'top' && !s.modern) els.push(<circle key="smoke" cx={x + w * 0.68 + 5} cy={topY - h * 0.85} r={5} fill="#ffffff" opacity={0.6} />);
        if (cond === 'marode') els.push(<path key="hole" d={`M${cx - 18} ${topY - h * 0.35} l10 -6 l8 7 l-6 6 Z`} fill="#3a2f2a" />);
        // Giebelfenster
        window(cx - 7, topY - h * 0.55, 14, 14, true, 9);
        if (region === 'wolkenspitz') els.push(<path key="snow" d={`M${x - 8} ${topY + 2} L${cx} ${topY - h} L${x + w + 8} ${topY + 2} L${x + w} ${topY - 2} L${cx} ${topY - h + 6} L${x} ${topY - 2} Z`} fill="#ffffff" opacity={0.9} />);
        break;
      }
      case 'chalet': {
        const h = w * 0.26;
        els.push(<path key="roof" d={`M${x - 18} ${topY + 6} L${cx} ${topY - h} L${x + w + 18} ${topY + 6} Z`} fill={rc} />);
        els.push(<path key="snow" d={`M${x - 18} ${topY + 6} L${cx} ${topY - h} L${x + w + 18} ${topY + 6} L${x + w + 10} ${topY} L${cx} ${topY - h + 7} L${x - 10} ${topY} Z`} fill="#ffffff" />);
        els.push(<path key="beam" d={`M${cx} ${topY - h + 8} L${cx} ${topY + 4}`} stroke={shade(rc, -0.2)} stroke-width={3} />);
        break;
      }
      case 'mansard': {
        els.push(<path key="roof" d={`M${x - 6} ${topY + 2} L${x + 10} ${topY - 26} L${x + w - 10} ${topY - 26} L${x + w + 6} ${topY + 2} Z`} fill={rc} />);
        els.push(<rect key="roofcap" x={x + 8} y={topY - 30} width={w - 16} height={5} rx={2} fill={shade(rc, -0.2)} />);
        const n = Math.max(2, Math.floor(w / 40));
        for (let i = 0; i < n; i++) {
          const wx = x + 18 + (i * (w - 36)) / Math.max(1, n - 1) - 7;
          els.push(<rect key={`dorm${i}`} x={wx - 3} y={topY - 21} width={20} height={20} rx={3} fill={shade(rc, 0.15)} />);
          window(wx, topY - 18, 14, 14, true, 20 + i);
        }
        break;
      }
      case 'stepgable': {
        const steps = 4;
        const sw = w / (steps * 2);
        let d = `M${x} ${topY}`;
        for (let i = 0; i < steps; i++) d += ` L${x + i * sw} ${topY - (i + 1) * 9} L${x + (i + 1) * sw} ${topY - (i + 1) * 9}`;
        for (let i = steps; i > 0; i--) d += ` L${x + w - i * sw} ${topY - i * 9} L${x + w - (i - 1) * sw} ${topY - (i - 1) * 9}`;
        els.push(<path key="roof" d={d + ' Z'} fill={wear(s.wall)} />);
        els.push(<path key="hoist" d={`M${x + w / 2} ${topY - 40} L${x + w / 2} ${topY - 26} M${x + w / 2 - 10} ${topY - 40} L${x + w / 2 + 10} ${topY - 40}`} stroke="#3a3a3a" stroke-width={3} />);
        window(x + w / 2 - 7, topY - 28, 14, 16, true, 30);
        break;
      }
      case 'flat':
      default: {
        els.push(<rect key="roof" x={x - 4} y={topY - 8} width={w + 8} height={10} rx={2} fill={rc} />);
        if (s.modern && cond !== 'marode') {
          els.push(<rect key="green" x={x + 6} y={topY - 14} width={w - 12} height={6} rx={3} fill="#6fbf73" />);
        }
        break;
      }
    }
  };

  const building = (s: Spec, x: number, key = 'main') => {
    const w = s.w;
    const height = s.floors * s.fh;
    const topY = GROUND - height;
    const wall = wear(s.wall);
    els.push(<rect key={`${key}wall`} x={x} y={topY} width={w} height={height} fill={wall} />);
    els.push(<rect key={`${key}sh`} x={x + w * 0.62} y={topY} width={w * 0.38} height={height} fill="#000000" opacity={0.07} />);
    if (s.brick) {
      for (let yy = topY + 8; yy < GROUND; yy += 8)
        els.push(<path key={`${key}br${yy}`} d={`M${x} ${yy} L${x + w} ${yy}`} stroke={shade(wall, -0.15)} stroke-width={1} opacity={0.6} />);
    }
    if (s.wood) {
      for (let xx = x + 8; xx < x + w; xx += 9)
        els.push(<path key={`${key}wd${xx}`} d={`M${xx} ${topY} L${xx} ${GROUND}`} stroke={shade(wall, -0.18)} stroke-width={1.2} opacity={0.6} />);
    }
    if (s.ornate) {
      for (let f = 1; f < s.floors; f++)
        els.push(<rect key={`${key}orn${f}`} x={x - 3} y={topY + f * s.fh - 3} width={w + 6} height={4} fill={shade(wall, 0.3)} />);
      els.push(<rect key={`${key}corn`} x={x - 5} y={topY - 4} width={w + 10} height={6} fill={shade(wall, 0.35)} />);
    }
    const cols = Math.max(2, Math.floor(w / 30));
    for (let f = 0; f < s.floors; f++) {
      const fy = topY + f * s.fh + (s.fh - 18) / 2;
      for (let i = 0; i < cols; i++) {
        const wx = x + 10 + (i * (w - 34)) / (cols - 1);
        const isDoor = f === s.floors - 1 && i === Math.floor(cols / 2);
        if (isDoor) continue;
        if (s.glass) {
          els.push(<rect key={`${key}g${f}${i}`} x={wx - 2} y={fy - 2} width={18} height={s.fh - 6} rx={1} fill={lit ? '#ffe9a6' : wear('#8fc3e6')} opacity={0.95} />);
          els.push(<path key={`${key}gl${f}${i}`} d={`M${wx} ${fy + s.fh - 10} L${wx + 12} ${fy}`} stroke="#ffffff" stroke-width={1.2} opacity={0.5} />);
        } else window(wx, fy, 14, Math.min(18, s.fh - 10), s.ornate && f > 0, f * 10 + i);
      }
      if (s.balconies && f < s.floors - 1) {
        els.push(<rect key={`${key}bal${f}`} x={x + w * 0.2} y={topY + (f + 1) * s.fh - 6} width={w * 0.6} height={5} fill={shade(wall, -0.3)} />);
        els.push(<path key={`${key}rail${f}`} d={`M${x + w * 0.2} ${topY + (f + 1) * s.fh - 14} L${x + w * 0.8} ${topY + (f + 1) * s.fh - 14}`} stroke={shade(wall, -0.3)} stroke-width={2} />);
        if (cond === 'top') els.push(<circle key={`${key}pl${f}`} cx={x + w * 0.24} cy={topY + (f + 1) * s.fh - 12} r={4} fill="#5fb36c" />);
      }
    }
    if (s.timber) {
      const tc = '#5a3a24';
      els.push(<rect key={`${key}tb`} x={x} y={topY} width={w} height={height} fill="none" stroke={tc} stroke-width={4} />);
      for (let f = 1; f < s.floors; f++) els.push(<path key={`${key}tf${f}`} d={`M${x} ${topY + f * s.fh} L${x + w} ${topY + f * s.fh}`} stroke={tc} stroke-width={4} />);
      for (let i = 0; i <= 3; i++) {
        const xx = x + (i * w) / 3;
        els.push(<path key={`${key}tv${i}`} d={`M${xx} ${topY} L${xx} ${GROUND}`} stroke={tc} stroke-width={3} />);
        if (i < 3) els.push(<path key={`${key}td${i}`} d={`M${xx} ${topY + s.fh} L${xx + w / 3} ${topY}`} stroke={tc} stroke-width={2.5} />);
      }
    }
    roof(s, x, w, topY);
    door(x + 10 + (Math.floor(cols / 2) * (w - 34)) / (cols - 1) + 7, s.modern ? '#3f4a5a' : r.palette.accent);
    cracks(x + 12, topY + 10);
    cracks(x + w - 24, topY + height * 0.5);
    return topY;
  };

  els.push(groundPatch);

  const special = (): boolean => {
    switch (style) {
      case 'grundstueck': {
        els.push(<rect key="plot" x={40} y={GROUND - 22} width={160} height={30} rx={6} fill={shade(r.palette.ground, -0.08)} />);
        for (let i = 0; i < 9; i++) els.push(<path key={`f${i}`} d={`M${44 + i * 19} ${GROUND - 26} L${44 + i * 19} ${GROUND + 6}`} stroke="#c9a46a" stroke-width={3} />);
        els.push(<path key="fr" d={`M40 ${GROUND - 18} L200 ${GROUND - 18}`} stroke="#c9a46a" stroke-width={2.5} />);
        els.push(<rect key="sign" x={98} y={GROUND - 74} width={60} height={34} rx={4} fill="#fff8ec" stroke="#8b5a3c" stroke-width={2} />);
        els.push(<path key="post" d={`M128 ${GROUND - 40} L128 ${GROUND}`} stroke="#8b5a3c" stroke-width={4} />);
        els.push(<text key="t" x={128} y={GROUND - 52} text-anchor="middle" font-size={11} font-weight={800} fill="#8b5a3c">BAULAND</text>);
        bushes([30, 196]);
        return true;
      }
      case 'muehle': {
        const wall = wear('#cfc6b8');
        els.push(<rect key="mw" x={70} y={GROUND - 96} width={88} height={96} fill={wall} />);
        for (let yy = GROUND - 88; yy < GROUND; yy += 12) els.push(<path key={`st${yy}`} d={`M70 ${yy} L158 ${yy}`} stroke={shade(wall, -0.15)} stroke-width={1} />);
        els.push(<path key="mr" d={`M62 ${GROUND - 94} L114 ${GROUND - 134} L166 ${GROUND - 94} Z`} fill={wear('#7a4b3a')} />);
        window(86, GROUND - 82, 14, 18, true, 1);
        window(128, GROUND - 82, 14, 18, true, 2);
        door(114, r.palette.accent);
        els.push(<circle key="wheel" cx={176} cy={GROUND - 30} r={34} fill="none" stroke="#6b4a2a" stroke-width={6} />);
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          els.push(<path key={`sp${a}`} d={`M176 ${GROUND - 30} L${176 + Math.cos(ang) * 34} ${GROUND - 30 + Math.sin(ang) * 34}`} stroke="#6b4a2a" stroke-width={4} />);
        }
        els.push(<path key="water" d={`M150 ${GROUND + 4} Q176 ${GROUND - 4} 214 ${GROUND + 6}`} stroke="#5aa0d8" stroke-width={7} fill="none" />);
        cracks(80, GROUND - 70);
        bushes([44]);
        return true;
      }
      case 'pilz': {
        const stem = wear('#f6ead2');
        const cap = wear('#e0473f');
        els.push(<path key="stem" d={`M84 ${GROUND} L90 ${GROUND - 70} L150 ${GROUND - 70} L156 ${GROUND} Z`} fill={stem} />);
        els.push(<path key="cap" d={`M52 ${GROUND - 64} Q60 ${GROUND - 150} 120 ${GROUND - 152} Q180 ${GROUND - 150} 188 ${GROUND - 64} Q120 ${GROUND - 50} 52 ${GROUND - 64} Z`} fill={cap} />);
        [[86, -112, 9], [120, -132, 11], [152, -108, 8], [104, -88, 6], [140, -84, 7], [70, -80, 5]].forEach(([x, y, rr], i) =>
          els.push(<ellipse key={`dot${i}`} cx={x} cy={GROUND + y} rx={rr} ry={rr * 0.8} fill="#fff6ea" />),
        );
        window(98, GROUND - 50, 16, 16, true, 1);
        window(130, GROUND - 50, 16, 16, true, 2);
        els.push(<path key="pd" d={`M110 ${GROUND} L110 ${GROUND - 22} Q120 ${GROUND - 34} 130 ${GROUND - 22} L130 ${GROUND} Z`} fill={wear(r.palette.accent)} />);
        els.push(<circle key="moss1" cx={64} cy={GROUND - 4} r={8} fill="#7ed9a0" opacity={0.9} />);
        els.push(<circle key="glow" cx={190} cy={GROUND - 10} r={4} fill="#c9f7ff" />);
        els.push(<circle key="glow2" cx={40} cy={GROUND - 30} r={3} fill="#f9d6ff" />);
        if (cond !== 'marode') bushes([170]);
        weeds();
        return true;
      }
      case 'baumhaus': {
        els.push(<path key="trunk" d={`M106 ${GROUND} Q100 ${GROUND - 60} 110 ${GROUND - 92} L134 ${GROUND - 92} Q142 ${GROUND - 60} 136 ${GROUND} Z`} fill="#7a5233" />);
        els.push(<circle key="crown1" cx={120} cy={GROUND - 150} r={46} fill="#4f9d5d" />);
        els.push(<circle key="crown2" cx={82} cy={GROUND - 128} r={30} fill="#5fb36c" />);
        els.push(<circle key="crown3" cx={162} cy={GROUND - 126} r={30} fill="#5fb36c" />);
        const wall = wear('#c58b5a');
        els.push(<rect key="th" x={78} y={GROUND - 130} width={84} height={46} rx={4} fill={wall} />);
        els.push(<path key="thr" d={`M70 ${GROUND - 128} L120 ${GROUND - 160} L170 ${GROUND - 128} Z`} fill={wear('#7a4b8a')} />);
        els.push(<rect key="deck" x={70} y={GROUND - 86} width={100} height={6} fill="#6b4a2a" />);
        window(88, GROUND - 120, 14, 16, false, 1);
        window(138, GROUND - 120, 14, 16, false, 2);
        els.push(<rect key="tdoor" x={113} y={GROUND - 116} width={14} height={30} rx={3} fill={wear(r.palette.accent)} />);
        els.push(<path key="ladder" d={`M150 ${GROUND - 80} L150 ${GROUND} M162 ${GROUND - 80} L162 ${GROUND}`} stroke="#6b4a2a" stroke-width={3} />);
        for (let yy = GROUND - 72; yy < GROUND; yy += 12) els.push(<path key={`rung${yy}`} d={`M150 ${yy} L162 ${yy}`} stroke="#6b4a2a" stroke-width={2.5} />);
        if (lit) els.push(<circle key="lantern" cx={76} cy={GROUND - 96} r={5} fill="#ffd66b" />);
        return true;
      }
      case 'leuchtturm': {
        els.push(<path key="rocks" d={`M70 ${GROUND + 4} Q90 ${GROUND - 14} 120 ${GROUND - 10} Q150 ${GROUND - 16} 170 ${GROUND + 4} Z`} fill="#8c8a86" />);
        const red = wear('#d9443b');
        els.push(<path key="tower" d={`M100 ${GROUND - 8} L108 ${GROUND - 140} L132 ${GROUND - 140} L140 ${GROUND - 8} Z`} fill="#fbfaf5" />);
        [0, 2].forEach((i) => {
          const y1 = GROUND - 8 - i * 33 - 33;
          const y2 = y1 + 33;
          const inset = (yy: number) => ((GROUND - 8 - yy) / 132) * 8;
          els.push(<path key={`band${i}`} d={`M${100 + inset(y2)} ${y2} L${100 + inset(y1)} ${y1} L${140 - inset(y1)} ${y1} L${140 - inset(y2)} ${y2} Z`} fill={red} />);
        });
        els.push(<rect key="gallery" x={102} y={GROUND - 146} width={36} height={6} fill="#3a3a3a" />);
        els.push(<rect key="lamp" x={110} y={GROUND - 166} width={20} height={20} rx={3} fill={lit ? '#ffe08a' : '#cfe8ff'} stroke="#3a3a3a" stroke-width={2} />);
        els.push(<path key="lroof" d={`M106 ${GROUND - 166} L120 ${GROUND - 182} L134 ${GROUND - 166} Z`} fill={red} />);
        if (lit) els.push(<path key="beam" d={`M130 ${GROUND - 160} L230 ${GROUND - 186} L230 ${GROUND - 138} Z`} fill="#ffe08a" opacity={0.35} />);
        window(113, GROUND - 100, 12, 16, true, 3);
        door(120, '#2b4c7e', 14, 22);
        els.push(<path key="sea" d={`M0 ${GROUND + 10} Q40 ${GROUND + 2} 80 ${GROUND + 10} T160 ${GROUND + 10} T240 ${GROUND + 10}`} stroke="#4fb3d9" stroke-width={6} fill="none" />);
        return true;
      }
      case 'reihenhaus': {
        const s = SPECS.reihenhaus!;
        const ghost = (x: number) => {
          els.push(<rect key={`gh${x}`} x={x} y={GROUND - 64} width={56} height={64} fill={shade(s.wall, -0.1)} opacity={0.55} />);
          els.push(<path key={`ghr${x}`} d={`M${x - 4} ${GROUND - 62} L${x + 28} ${GROUND - 92} L${x + 60} ${GROUND - 62} Z`} fill={shade(s.roof, 0.1)} opacity={0.55} />);
        };
        ghost(26);
        ghost(158);
        building(s, 83);
        return true;
      }
      case 'wohnanlage': {
        const s: Spec = { w: 84, floors: 4, fh: 26, wall: '#e9e1d2', roof: '#555f6e', roofType: 'flat', balconies: true, modern: true };
        building({ ...s, wall: '#dfe7ef' }, 22, 'a');
        building(s, 132, 'b');
        bushes([112, 214]);
        return true;
      }
      case 'quartier': {
        const s: Spec = { w: 64, floors: 5, fh: 24, wall: '#efe4d0', roof: '#555f6e', roofType: 'flat', balconies: true, modern: true };
        building({ ...s, wall: '#d6e6e0' }, 10, 'a');
        building({ ...s, floors: 6, wall: '#f3dcc4' }, 88, 'b');
        building({ ...s, wall: '#dfe2f0' }, 166, 'c');
        els.push(<circle key="tree1" cx={82} cy={GROUND - 14} r={10} fill="#5fb36c" />);
        els.push(<circle key="tree2" cx={160} cy={GROUND - 14} r={10} fill="#5fb36c" />);
        return true;
      }
      case 'villa': {
        const s = SPECS.villa!;
        building(s, 42);
        els.push(<rect key="pool" x={60} y={GROUND + 2} width={60} height={9} rx={4} fill="#4fd1e0" />);
        // Palme
        els.push(<path key="palm" d={`M206 ${GROUND} Q200 ${GROUND - 50} 210 ${GROUND - 92}`} stroke="#8b6a3c" stroke-width={7} fill="none" />);
        [[-30, -6], [-20, 18], [24, 16], [30, -8], [0, -24]].forEach(([dx, dy], i) =>
          els.push(<path key={`leaf${i}`} d={`M210 ${GROUND - 92} Q${210 + dx / 2} ${GROUND - 104 + dy / 2} ${210 + dx} ${GROUND - 92 + dy}`} stroke="#3e9b5a" stroke-width={7} fill="none" stroke-linecap="round" />),
        );
        return true;
      }
      default:
        return false;
    }
  };

  if (!special()) {
    const s = SPECS[style] ?? SPECS.fachwerk!;
    const x = 120 - s.w / 2;
    building(s, x);
    if (style === 'bauernhof') {
      els.push(<path key="barnx" d={`M${x + 20} ${GROUND - 40} L${x + 50} ${GROUND} M${x + 50} ${GROUND - 40} L${x + 20} ${GROUND}`} stroke="#f4f1ea" stroke-width={4} />);
      els.push(<circle key="hay" cx={216} cy={GROUND - 8} r={12} fill="#e8c46a" />);
    }
    if (style === 'penthouse') {
      els.push(<rect key="ph" x={x + 10} y={GROUND - s.floors * s.fh - 30} width={s.w - 20} height={24} rx={3} fill={lit ? '#ffe9a6' : '#cfe8ff'} stroke="#3a4252" stroke-width={2} />);
      els.push(<rect key="phr" x={x + 4} y={GROUND - s.floors * s.fh - 34} width={s.w - 8} height={5} fill="#3a4252" />);
    }
    bushes([x - 22, x + s.w + 6]);
    weeds();
  }

  if (state === 'renovating' || state === 'building') {
    const top = state === 'building' ? 60 : 40;
    els.push(
      <g key="scaffold" opacity={0.95}>
        {[52, 92, 132, 172].map((xx) => <path key={xx} d={`M${xx} ${GROUND} L${xx} ${top}`} stroke="#c98b2b" stroke-width={3} />)}
        {Array.from({ length: Math.floor((GROUND - top) / 26) }, (_, i) => (
          <path key={`h${i}`} d={`M48 ${GROUND - 20 - i * 26} L176 ${GROUND - 20 - i * 26}`} stroke="#c98b2b" stroke-width={3} />
        ))}
        <path d={`M52 ${GROUND - 20} L92 ${GROUND - 46} M132 ${GROUND - 46} L172 ${GROUND - 72}`} stroke="#c98b2b" stroke-width={2} />
      </g>,
    );
    if (state === 'building') {
      els.push(
        <g key="crane">
          <path d={`M206 ${GROUND} L206 14 M150 18 L232 18 M206 14 L180 18`} stroke="#f2b134" stroke-width={5} />
          <path d={`M164 18 L164 52`} stroke="#3a3a3a" stroke-width={1.5} />
          <rect x={156} y={52} width={16} height={10} fill="#b5523b" />
        </g>,
      );
    }
  }
  if (state === 'forSale') {
    els.push(
      <g key="sale">
        <path d={`M28 ${GROUND + 4} L28 ${GROUND - 40}`} stroke="#8b5a3c" stroke-width={4} />
        <rect x={-2} y={GROUND - 64} width={62} height={26} rx={4} fill="#e05a4f" stroke="#fff" stroke-width={2} />
        <text x={29} y={GROUND - 54} text-anchor="middle" font-size={9} font-weight={800} fill="#fff">ZU</text>
        <text x={29} y={GROUND - 43} text-anchor="middle" font-size={9} font-weight={800} fill="#fff">VERKAUFEN</text>
      </g>,
    );
  }

  return (
    <svg viewBox="0 0 240 200" width={size} height={size} class={cls} role="img" aria-label="Haus" data-id={id}>
      {els}
    </svg>
  );
}
