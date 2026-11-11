import { useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import type { AvatarConfig } from '../game/types';
import { luminance, nextId, shade } from './color';

interface Props {
  config: AvatarConfig;
  portrait?: boolean;
  size?: number;
  class?: string;
  mood?: 'happy' | 'sad' | 'neutral';
}

const INK = '#2a1f24';
const GOLD = '#e8b84a';

export function Avatar({ config: c, portrait, size, class: cls, mood }: Props) {
  const id = useMemo(() => nextId('av'), []);
  const seated = c.mobility === 'rollstuhl';
  const bw = { schmal: 29, mittel: 34, kraeftig: 42 }[c.body];
  const hw = { schmal: 23, mittel: 27, kraeftig: 37 }[c.body];
  const aw = { schmal: 12, mittel: 14, kraeftig: 18 }[c.body];
  const lw = { schmal: 16, mittel: 18, kraeftig: 23 }[c.body];
  const scale = portrait ? 1 : { klein: 0.93, mittel: 1, gross: 1.05 }[c.height];
  const skin = c.skin;
  const skinShade = shade(skin, -0.14);
  const hair = c.hairColor;
  const top = c.top;
  const topColor = c.topColor;
  const pantsColor = top === 'anzug' || top === 'latzhose' ? topColor : c.bottomColor;
  const vit = '#f7e4da';

  const longSleeve = ['hoodie', 'hemd', 'bluse', 'pullover', 'blazer', 'anzug'].includes(top);
  const noSleeve = top === 'tanktop';
  const headCovered = c.headwear === 'hijab';
  const tallHairHidden = ['beanie', 'hut', 'turban', 'cap'].includes(c.headwear);

  // ---------- Körper ----------
  const torsoPath = `M${100 - hw} 200 L${100 - bw} 142 Q${100 - bw} 124 ${100 - bw + 14} 121 L${100 + bw - 14} 121 Q${100 + bw} 124 ${100 + bw} 142 L${100 + hw} 200 Z`;
  const shoulderL = [100 - bw + 6, 132];
  const shoulderR = [100 + bw - 6, 132];
  const handL: [number, number] = seated ? [100 - hw + 6, 196] : [100 - bw - 5, 198];
  const handR: [number, number] = seated ? [100 + hw - 6, 196] : [100 + bw + 5, 198];
  const elbowL = seated ? [100 - bw - 8, 172] : [100 - bw - 8, 166];
  const elbowR = seated ? [100 + bw + 8, 172] : [100 + bw + 8, 166];
  const armPath = (s: number[], e: number[], h: number[]) => `M${s[0]} ${s[1]} Q${e[0]} ${e[1]} ${h[0]} ${h[1]}`;
  const sleeveEnd = (s: number[], e: number[]) => [s[0] + (e[0] - s[0]) * 0.75, s[1] + (e[1] - s[1]) * 0.75];

  const legXL = 100 - hw * 0.45;
  const legXR = 100 + hw * 0.45;

  const arm = (side: 'L' | 'R') => {
    const s = side === 'L' ? shoulderL : shoulderR;
    const e = side === 'L' ? elbowL : elbowR;
    const h = side === 'L' ? handL : handR;
    const path = armPath(s, e, h);
    const se = sleeveEnd(s, e);
    return (
      <g>
        <path d={path} stroke={longSleeve ? topColor : skin} stroke-width={aw} stroke-linecap="round" fill="none" />
        {longSleeve && <path d={path} stroke={shade(topColor, -0.12)} stroke-width={aw} stroke-linecap="round" fill="none" opacity={side === 'R' ? 0.5 : 0} />}
        {!longSleeve && !noSleeve && <path d={`M${s[0]} ${s[1]} L${se[0]} ${se[1]}`} stroke={topColor} stroke-width={aw + 3} stroke-linecap="round" />}
        {c.vitiligo && <circle cx={h[0]} cy={h[1] - 2} r={4} fill={vit} />}
        <circle cx={h[0]} cy={h[1]} r={aw * 0.55 + 1} fill={skin} />
        {c.vitiligo && side === 'L' && <ellipse cx={h[0] + 1} cy={h[1] + 1} rx={3} ry={2.5} fill={vit} />}
      </g>
    );
  };

  // ---------- Beine ----------
  const legs = () => {
    if (seated) {
      const knee = 222;
      return (
        <g>
          {[legXL, legXR].map((x, i) => (
            <g key={i}>
              <rect x={x - lw / 2 - 2} y={194} width={lw + 4} height={knee - 190} rx={lw / 2} fill={c.bottom === 'rock' || c.top === 'kleid' ? skin : pantsColor} />
              <path d={`M${x} ${knee} L${x} 258`} stroke={c.bottom === 'shorts' || c.bottom === 'rock' || c.top === 'kleid' ? skin : pantsColor} stroke-width={lw - 2} stroke-linecap="round" />
              {shoe(x, 264)}
            </g>
          ))}
        </g>
      );
    }
    const bare = c.top === 'kleid' || c.bottom === 'rock';
    const shorts = c.bottom === 'shorts' && c.top !== 'kleid';
    return (
      <g>
        {[legXL, legXR].map((x, i) => {
          const prosthetic = c.mobility === 'prothese' && i === 1;
          return (
            <g key={i}>
              {prosthetic ? (
                <g>
                  <path d={`M${x} 196 L${x} 232`} stroke={bare || shorts ? skin : pantsColor} stroke-width={lw} stroke-linecap="round" />
                  <rect x={x - 7} y={228} width={14} height={9} rx={4} fill="#5d6470" />
                  <path d={`M${x} 236 L${x} 266`} stroke="#9aa3b0" stroke-width={6} stroke-linecap="round" />
                  {!bare && !shorts && <path d={`M${x} 196 L${x} 252`} stroke={pantsColor} stroke-width={lw + 1} stroke-linecap="round" />}
                </g>
              ) : (
                <path d={`M${x} 196 L${x} 266`} stroke={bare || shorts ? skin : pantsColor} stroke-width={lw} stroke-linecap="round" />
              )}
              {shorts && <path d={`M${x} 196 L${x} 228`} stroke={pantsColor} stroke-width={lw + 3} stroke-linecap="round" />}
              {c.bottom === 'jogger' && !bare && <rect x={x - lw / 2 - 1} y={256} width={lw + 2} height={7} rx={3} fill={shade(pantsColor, -0.2)} />}
              {c.bottom === 'jeans' && !bare && <path d={`M${x + lw / 2 - 3} 205 L${x + lw / 2 - 3} 262`} stroke={shade(pantsColor, 0.25)} stroke-width={1} opacity={0.6} />}
              {shoe(x, 272)}
            </g>
          );
        })}
        {!bare && (
          <path
            d={`M${100 - hw} 190 L${100 + hw} 190 L${100 + hw - 2} ${shorts ? 222 : 214} L${100 - hw + 2} ${shorts ? 222 : 214} Z`}
            fill={pantsColor}
          />
        )}
      </g>
    );
  };

  const shoe = (x: number, y: number) => {
    const col = c.shoeColor;
    switch (c.shoes) {
      case 'stiefel':
        return (
          <g>
            <rect x={x - lw / 2 - 1} y={y - 22} width={lw + 2} height={24} rx={4} fill={col} />
            <ellipse cx={x + 3} cy={y + 2} rx={lw / 2 + 5} ry={6} fill={col} />
            <ellipse cx={x + 3} cy={y + 5} rx={lw / 2 + 5} ry={2.5} fill={shade(col, -0.35)} />
          </g>
        );
      case 'sandalen':
        return (
          <g>
            <ellipse cx={x + 2} cy={y + 1} rx={lw / 2 + 3} ry={5.5} fill={skin} />
            <path d={`M${x - 6} ${y - 2} L${x + 9} ${y - 2}`} stroke={col} stroke-width={3} stroke-linecap="round" />
            <ellipse cx={x + 2} cy={y + 5} rx={lw / 2 + 5} ry={2.4} fill={shade(col, -0.25)} />
          </g>
        );
      case 'schuhe':
        return (
          <g>
            <ellipse cx={x + 3} cy={y} rx={lw / 2 + 6} ry={6.5} fill={col} />
            <ellipse cx={x + 1} cy={y - 2} rx={4} ry={1.8} fill={shade(col, 0.35)} opacity={0.6} />
            <ellipse cx={x + 3} cy={y + 4.5} rx={lw / 2 + 6} ry={2} fill={shade(col, -0.35)} />
          </g>
        );
      default:
        return (
          <g>
            <ellipse cx={x + 3} cy={y} rx={lw / 2 + 6} ry={7} fill={col} />
            <path d={`M${x - lw / 2 - 2} ${y + 3} Q${x + 3} ${y + 7} ${x + lw / 2 + 8} ${y + 3}`} stroke="#ffffff" stroke-width={3} fill="none" opacity={0.85} />
            <path d={`M${x - 2} ${y - 4} L${x + 6} ${y - 4}`} stroke={shade(col, -0.3)} stroke-width={1.5} />
          </g>
        );
    }
  };

  // ---------- Kleidung Oberkörper ----------
  const torso = () => {
    const tc = topColor;
    const dark = shade(tc, -0.15);
    const parts: JSX.Element[] = [];
    if (top === 'latzhose') {
      const tee = luminance(tc) > 0.6 ? '#e05a4f' : '#f4f1ea';
      parts.push(<path d={torsoPath} fill={tee} />);
      parts.push(<rect x={100 - bw + 12} y={150} width={2 * bw - 24} height={52} rx={6} fill={tc} />);
      parts.push(<path d={`M${100 - bw + 14} 152 L${100 - bw + 10} 124 M${100 + bw - 14} 152 L${100 + bw - 10} 124`} stroke={tc} stroke-width={6} stroke-linecap="round" />);
      parts.push(<circle cx={100 - bw + 16} cy={154} r={2.5} fill={GOLD} />);
      parts.push(<circle cx={100 + bw - 16} cy={154} r={2.5} fill={GOLD} />);
      parts.push(<rect x={92} y={166} width={16} height={12} rx={2} fill={dark} />);
      return parts;
    }
    if (top === 'blazer' || top === 'anzug') {
      parts.push(<path d={torsoPath} fill={tc} />);
      parts.push(<path d={`M90 121 L100 168 L110 121 Z`} fill="#f7f4ee" />);
      if (top === 'anzug') parts.push(<path d="M100 128 L96 134 L100 162 L104 134 Z" fill="#c0392b" />);
      parts.push(<path d={`M88 121 L100 170 L96 121 Z M112 121 L100 170 L104 121 Z`} fill={shade(tc, -0.2)} />);
      parts.push(<circle cx={100} cy={180} r={2.2} fill={shade(tc, -0.4)} />);
      parts.push(<circle cx={100} cy={190} r={2.2} fill={shade(tc, -0.4)} />);
      parts.push(<path d={`M${100 + bw - 18} 168 L${100 + bw - 6} 168`} stroke={shade(tc, -0.3)} stroke-width={2} />);
      return parts;
    }
    if (top === 'kleid') {
      parts.push(<path d={`M${100 - hw - 2} 192 L${100 + hw + 2} 192 L${100 + hw + 18} 246 Q100 254 ${100 - hw - 18} 246 Z`} fill={tc} />);
      parts.push(<path d={`M${100 - hw + 4} 200 L${100 - hw - 8} 244 M100 200 L100 250 M${100 + hw - 4} 200 L${100 + hw + 8} 244`} stroke={dark} stroke-width={1.2} opacity={0.5} />);
      parts.push(<path d={torsoPath} fill={tc} />);
      parts.push(<path d="M86 121 Q100 136 114 121" fill={skin} />);
      parts.push(<path d={`M${100 - hw} 194 L${100 + hw} 194`} stroke={dark} stroke-width={4} />);
      return parts;
    }
    if (c.bottom === 'rock') {
      const pc = c.bottomColor;
      parts.push(<path d={`M${100 - hw} 190 L${100 + hw} 190 L${100 + hw + 12} 242 Q100 248 ${100 - hw - 12} 242 Z`} fill={pc} />);
      parts.push(<path d={`M${100 - hw / 2} 194 L${100 - hw / 2 - 6} 242 M${100 + hw / 2} 194 L${100 + hw / 2 + 6} 242`} stroke={shade(pc, -0.2)} stroke-width={1.2} opacity={0.6} />);
    }
    parts.push(<path d={torsoPath} fill={tc} />);
    switch (top) {
      case 'tanktop':
        parts.push(<path d={`M${100 - bw + 4} 121 L${100 - bw + 14} 121 Q100 146 ${100 + bw - 14} 121 L${100 + bw - 4} 121 Q${100 + bw} 124 ${100 + bw} 142 L${100 + bw - 10} 142 Q100 150 ${100 - bw + 10} 142 L${100 - bw} 142 Q${100 - bw} 124 ${100 - bw + 4} 121 Z`} fill={skin} />);
        break;
      case 'tshirt':
        parts.push(<path d="M87 121 Q100 134 113 121" fill={skin} stroke={dark} stroke-width={2.5} />);
        break;
      case 'hoodie':
        parts.push(<path d="M80 121 Q100 108 120 121 Q112 134 100 136 Q88 134 80 121 Z" fill={dark} />);
        parts.push(<path d="M93 132 L92 152 M107 132 L108 152" stroke="#f4f1ea" stroke-width={1.8} stroke-linecap="round" />);
        parts.push(<rect x={100 - bw * 0.55} y={168} width={bw * 1.1} height={20} rx={6} fill={dark} />);
        break;
      case 'hemd':
        parts.push(<path d="M88 120 L100 134 L95 140 Z M112 120 L100 134 L105 140 Z" fill={shade(tc, 0.35)} stroke={dark} stroke-width={1} />);
        parts.push(<path d="M100 134 L100 198" stroke={dark} stroke-width={1.2} />);
        [146, 160, 174, 188].forEach((y) => parts.push(<circle cx={102.5} cy={y} r={1.5} fill={dark} />));
        parts.push(<rect x={100 - bw + 12} y={142} width={12} height={10} rx={2} fill="none" stroke={dark} stroke-width={1} />);
        break;
      case 'bluse':
        parts.push(<path d="M84 121 Q92 136 100 128 Q108 136 116 121 Q108 126 100 124 Q92 126 84 121 Z" fill={shade(tc, 0.5)} stroke={dark} stroke-width={1} />);
        [142, 154, 166].forEach((y) => parts.push(<circle cx={100} cy={y} r={1.6} fill={shade(tc, 0.5)} />));
        break;
      case 'pullover':
        parts.push(<path d="M86 121 Q100 132 114 121" fill="none" stroke={dark} stroke-width={5} />);
        parts.push(<path d={`M${100 - hw + 1} 194 L${100 + hw - 1} 194`} stroke={dark} stroke-width={6} />);
        parts.push(<path d={`M${100 - bw + 14} 156 L${100 + bw - 14} 156`} stroke={shade(tc, 0.25)} stroke-width={5} opacity={0.7} />);
        break;
    }
    return parts;
  };

  // ---------- Kopf ----------
  const faceShape = () => {
    switch (c.faceShape) {
      case 'rund':
        return <ellipse cx={100} cy={76} rx={34} ry={36} fill={skin} />;
      case 'eckig':
        return <path d="M68 56 Q68 38 86 38 L114 38 Q132 38 132 56 L132 88 Q131 110 100 113 Q69 110 68 88 Z" fill={skin} />;
      case 'herz':
        return <path d="M67 64 Q67 38 100 38 Q133 38 133 64 Q132 92 100 113 Q68 92 67 64 Z" fill={skin} />;
      default:
        return <ellipse cx={100} cy={76} rx={31} ry={37} fill={skin} />;
    }
  };
  const earX = c.faceShape === 'rund' ? 34 : c.faceShape === 'oval' ? 31 : 32;

  const eye = (x: number, y: number) => {
    const happy = mood === 'happy' || c.eyes === 'freundlich';
    if (happy && c.eyes === 'freundlich') {
      return <path d={`M${x - 7} ${y + 1} Q${x} ${y - 7} ${x + 7} ${y + 1}`} stroke={INK} stroke-width={2.8} fill="none" stroke-linecap="round" />;
    }
    const ry = c.eyes === 'schmal' ? 3.6 : c.eyes === 'mandel' ? 5 : 6.5;
    const rx = c.eyes === 'rund' ? 6.2 : 7.5;
    const ir = c.eyes === 'schmal' ? 3.2 : c.eyes === 'mandel' ? 3.9 : 4.3;
    const eyePath =
      c.eyes === 'rund'
        ? undefined
        : `M${x - rx} ${y} Q${x - 1} ${y - ry * 1.5} ${x + rx} ${y - 0.5} Q${x} ${y + ry * 1.05} ${x - rx} ${y} Z`;
    const clip = `${id}-eye-${x}`;
    return (
      <g>
        <clipPath id={clip}>{eyePath ? <path d={eyePath} /> : <ellipse cx={x} cy={y} rx={rx} ry={ry} />}</clipPath>
        {eyePath ? <path d={eyePath} fill="#ffffff" /> : <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#ffffff" />}
        <g clip-path={`url(#${clip})`}>
          <circle cx={x + 0.5} cy={y} r={ir} fill={c.eyeColor} />
          <circle cx={x + 0.5} cy={y} r={ir * 0.5} fill="#16110f" />
          <circle cx={x + 2} cy={y - 1.6} r={1.3} fill="#ffffff" />
        </g>
        {eyePath ? (
          <path d={`M${x - rx} ${y} Q${x - 1} ${y - ry * 1.5} ${x + rx} ${y - 0.5}`} stroke={INK} stroke-width={2.2} fill="none" stroke-linecap="round" />
        ) : (
          <path d={`M${x - rx} ${y - 1} Q${x} ${y - ry - 2.5} ${x + rx} ${y - 1}`} stroke={INK} stroke-width={2} fill="none" stroke-linecap="round" />
        )}
      </g>
    );
  };

  const browColor = luminance(hair) > 0.62 ? shade(hair, -0.45) : shade(hair, -0.05);
  const brow = (x: number, dir: 1 | -1) => {
    const w = { fein: 2, kraeftig: 3.4, buschig: 5, gerade: 3.4 }[c.brows];
    const sad = mood === 'sad';
    const d =
      c.brows === 'gerade'
        ? `M${x - 8} ${66} L${x + 8} ${66}`
        : sad
          ? `M${x - 8 * dir} 64 Q${x} 62 ${x + 8 * dir} 68`
          : `M${x - 8} 68 Q${x} 61.5 ${x + 8} 67`;
    return <path d={d} stroke={browColor} stroke-width={w} fill="none" stroke-linecap="round" />;
  };

  const mouth = () => {
    const lip = c.lipColor !== 'none' ? c.lipColor : '#7a3434';
    const lw2 = c.lipColor !== 'none' ? 3.4 : 2.6;
    const m = mood === 'sad' ? 'traurig' : c.mouth;
    switch (m) {
      case 'traurig':
        return <path d="M91 103 Q100 97 109 103" stroke={lip} stroke-width={lw2} fill="none" stroke-linecap="round" />;
      case 'grinsen':
        return (
          <g>
            <path d="M87 97 Q100 113 113 97 Z" fill="#5a2424" stroke={lip} stroke-width={c.lipColor !== 'none' ? 2.5 : 0} stroke-linejoin="round" />
            <path d="M89.5 98.5 Q100 101 110.5 98.5 L109.5 101 Q100 103.5 90.5 101 Z" fill="#ffffff" />
            <path d="M94 106 Q100 109 106 106" stroke="#e8737f" stroke-width={2.5} fill="none" stroke-linecap="round" />
          </g>
        );
      case 'schmunzeln':
        return <path d="M91 101 Q102 106 110 97" stroke={lip} stroke-width={lw2} fill="none" stroke-linecap="round" />;
      case 'neutral':
        return <path d="M92 101 Q100 102.5 108 101" stroke={lip} stroke-width={lw2} fill="none" stroke-linecap="round" />;
      default:
        return <path d="M90 99 Q100 108 110 99" stroke={lip} stroke-width={lw2} fill="none" stroke-linecap="round" />;
    }
  };

  const beard = () => {
    const bc = hair;
    switch (c.beard) {
      case 'stoppeln':
        return <path d="M70 84 Q72 114 100 116 Q128 114 130 84 Q124 100 112 104 Q100 100 88 104 Q76 100 70 84 Z" fill={bc} opacity={0.28} />;
      case 'schnurrbart':
        return <path d="M87 96 Q94 89 100 93 Q106 89 113 96 Q106 95 100 97 Q94 95 87 96 Z" fill={bc} />;
      case 'kinnbart':
        return (
          <g fill={bc}>
            <path d="M88 96 Q94 90 100 93 Q106 90 112 96 Q106 95 100 97 Q94 95 88 96 Z" />
            <path d="M92 106 Q100 104 108 106 Q108 118 100 120 Q92 118 92 106 Z" />
          </g>
        );
      case 'vollbart':
      case 'lang': {
        const bottom = c.beard === 'lang' ? 142 : 122;
        return (
          <g fill={bc}>
            <path d={`M68 78 Q68 ${bottom - 6} 100 ${bottom} Q132 ${bottom - 6} 132 78 Q128 96 114 99 Q100 93 86 99 Q72 96 68 78 Z`} />
            <path d="M87 96 Q94 89 100 93 Q106 89 113 96 Q106 95 100 97 Q94 95 87 96 Z" />
            <path d={`M90 106 Q100 110 110 106`} stroke={shade(bc, -0.25)} stroke-width={1} fill="none" opacity={0.5} />
          </g>
        );
      }
      default:
        return null;
    }
  };

  // ---------- Haare ----------
  const hairBack = (): JSX.Element | null => {
    if (headCovered) return null;
    const hc = hair;
    const sh = shade(hc, -0.2);
    switch (c.hair) {
      case 'afro':
        return (
          <g>
            <circle cx={100} cy={62} r={56} fill={hc} />
            <circle cx={84} cy={40} r={14} fill={shade(hc, 0.08)} opacity={0.35} />
          </g>
        );
      case 'puffs':
        return (
          <g>
            <circle cx={60} cy={44} r={22} fill={hc} />
            <circle cx={140} cy={44} r={22} fill={hc} />
            <circle cx={54} cy={38} r={7} fill={shade(hc, 0.1)} opacity={0.4} />
          </g>
        );
      case 'dutt':
        return tallHairHidden ? null : <circle cx={100} cy={28} r={16} fill={hc} />;
      case 'zopf':
        return <path d="M124 46 Q156 56 148 104 Q144 128 132 136 Q140 112 136 92 Q132 66 118 56 Z" fill={hc} />;
      case 'bob':
        return <path d="M62 64 Q60 26 100 24 Q140 26 138 64 L140 112 Q120 120 100 118 Q80 120 60 112 Z" fill={hc} />;
      case 'wellig':
        return <path d="M64 60 Q58 24 100 22 Q142 24 136 60 Q146 84 138 106 Q148 124 136 142 Q118 150 100 146 Q82 150 64 142 Q52 124 62 106 Q54 84 64 60 Z" fill={hc} />;
      case 'lang':
        return <path d="M64 60 Q58 24 100 22 Q142 24 136 60 L142 168 Q120 176 100 172 Q80 176 58 168 Z" fill={hc} />;
      case 'locs':
        return (
          <g>
            {[64, 74, 84, 116, 126, 136].map((x, i) => (
              <rect key={x} x={x - 5} y={50} width={10} height={i % 2 ? 104 : 96} rx={5} fill={i % 2 ? hc : sh} />
            ))}
          </g>
        );
      case 'braids':
        return (
          <g>
            {[62, 70, 78, 122, 130, 138].map((x, i) => (
              <g key={x}>
                {Array.from({ length: 11 }, (_, k) => (
                  <ellipse key={k} cx={x + (k % 2 ? 1.2 : -1.2)} cy={58 + k * 10} rx={4.6} ry={6} fill={(k + i) % 2 ? hc : sh} />
                ))}
              </g>
            ))}
          </g>
        );
      case 'locken':
        return <path d="M64 70 Q56 30 100 26 Q144 30 136 70 Q140 92 132 104 L68 104 Q60 92 64 70 Z" fill={hc} />;
      default:
        return null;
    }
  };

  const hairFront = (): JSX.Element | null => {
    if (headCovered) return null;
    const hc = hair;
    const hl = shade(hc, 0.18);
    switch (c.hair) {
      case 'glatze':
        return <ellipse cx={88} cy={48} rx={9} ry={5} fill="#ffffff" opacity={0.22} transform="rotate(-20 88 48)" />;
      case 'buzz':
        return <path d="M68 72 Q66 36 100 34 Q134 36 132 72 Q128 52 100 49 Q72 52 68 72 Z" fill={hc} opacity={0.85} />;
      case 'kurz':
        return (
          <g>
            <path d="M65 74 Q60 28 100 26 Q140 28 135 74 Q131 54 120 48 Q104 58 84 50 Q72 56 65 74 Z" fill={hc} />
            <path d="M84 36 Q100 30 116 36" stroke={hl} stroke-width={3} fill="none" opacity={0.5} stroke-linecap="round" />
          </g>
        );
      case 'seitenscheitel':
        return (
          <g>
            <path d="M65 76 Q60 26 104 24 Q142 28 135 74 Q130 54 122 46 Q104 40 88 56 Q76 54 65 76 Z" fill={hc} />
            <path d="M88 56 Q100 36 124 38" stroke={hl} stroke-width={3} fill="none" opacity={0.5} stroke-linecap="round" />
          </g>
        );
      case 'pixie':
        return <path d="M64 78 Q58 26 102 24 Q142 28 136 70 Q132 54 124 50 Q112 62 92 56 Q86 66 76 62 Q70 70 64 78 Z" fill={hc} />;
      case 'undercut':
        return (
          <g>
            <path d="M68 70 Q66 40 100 38 Q134 40 132 70 Q128 54 100 52 Q72 54 68 70 Z" fill={hc} opacity={0.35} />
            <path d="M72 54 Q70 20 104 20 Q134 22 130 52 Q118 42 100 46 Q84 42 72 54 Z" fill={hc} />
          </g>
        );
      case 'irokese':
        return (
          <g>
            <path d="M68 70 Q66 40 100 38 Q134 40 132 70 Q128 54 100 52 Q72 54 68 70 Z" fill={hc} opacity={0.3} />
            {!tallHairHidden && <path d="M88 48 L90 16 L97 38 L101 8 L105 38 L111 14 L113 48 Q100 42 88 48 Z" fill={hc} />}
          </g>
        );
      case 'locken':
        return (
          <g>
            {[
              [70, 62], [74, 46], [84, 36], [98, 31], [112, 34], [124, 42], [130, 56], [80, 50], [118, 50], [100, 42],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={11} fill={i % 2 ? hc : shade(hc, 0.06)} />
            ))}
          </g>
        );
      case 'afro':
        return (
          <path d="M66 66 Q66 46 78 44 Q84 36 94 40 Q100 34 106 40 Q116 36 122 44 Q134 46 134 66 Q128 54 100 52 Q72 54 66 66 Z" fill={hc} />
        );
      case 'puffs':
      case 'locs':
      case 'braids':
        return (
          <g>
            <path d="M65 72 Q60 30 100 28 Q140 30 135 72 Q130 50 100 48 Q70 50 65 72 Z" fill={hc} />
            <path d="M100 30 L100 48" stroke={shade(hc, -0.3)} stroke-width={1.5} />
            {c.hair === 'braids' && <path d="M84 34 Q80 44 76 58 M116 34 Q120 44 124 58" stroke={shade(hc, -0.3)} stroke-width={1.5} fill="none" />}
          </g>
        );
      case 'zopf':
      case 'dutt':
        return (
          <g>
            <path d="M65 72 Q60 30 100 28 Q140 30 135 72 Q132 50 112 44 Q100 48 88 44 Q68 50 65 72 Z" fill={hc} />
            <path d="M86 34 Q100 28 114 34" stroke={hl} stroke-width={3} fill="none" opacity={0.45} stroke-linecap="round" />
          </g>
        );
      case 'bob':
        return <path d="M63 80 Q58 26 100 26 Q142 26 137 80 Q134 56 120 50 Q100 60 76 52 Q66 60 63 80 Z" fill={hc} />;
      case 'wellig':
      case 'lang':
        return (
          <g>
            <path d="M64 86 Q58 26 100 26 Q142 26 136 86 Q134 54 114 44 Q104 52 100 40 Q96 52 86 44 Q66 54 64 86 Z" fill={hc} />
            <path d="M80 40 Q72 52 70 70" stroke={hl} stroke-width={3} fill="none" opacity={0.4} stroke-linecap="round" />
          </g>
        );
      default:
        return null;
    }
  };

  const headwear = () => {
    const col = c.headwearColor;
    const dk = shade(col, -0.22);
    switch (c.headwear) {
      case 'cap':
        return (
          <g>
            <path d="M65 60 Q64 26 100 25 Q136 26 135 60 Z" fill={col} />
            <path d="M58 60 Q100 76 142 60 L138 55 Q100 66 62 55 Z" fill={dk} />
            <circle cx={100} cy={26} r={3} fill={dk} />
            <path d="M100 26 L100 58" stroke={dk} stroke-width={1} opacity={0.5} />
          </g>
        );
      case 'beanie':
        return (
          <g>
            <path d="M64 62 Q62 22 100 22 Q138 22 136 62 Z" fill={col} />
            <rect x={62} y={52} width={76} height={13} rx={6} fill={dk} />
            <circle cx={100} cy={20} r={9} fill={shade(col, 0.25)} />
            {[74, 86, 98, 110, 122].map((x) => <path key={x} d={`M${x + 2} 53 L${x + 2} 64`} stroke={shade(col, -0.35)} stroke-width={1} />)}
          </g>
        );
      case 'hut':
        return (
          <g>
            <ellipse cx={100} cy={50} rx={54} ry={10} fill={dk} />
            <path d="M72 50 Q72 16 100 16 Q128 16 128 50 Z" fill={col} />
            <rect x={72} y={38} width={56} height={8} fill={shade(col, -0.4)} />
          </g>
        );
      case 'bandana':
        return (
          <g>
            <path d="M65 58 Q100 40 135 58 L135 66 Q100 50 65 66 Z" fill={col} />
            <path d="M134 60 L146 54 L144 68 Z" fill={dk} />
            {[80, 96, 112].map((x) => <circle key={x} cx={x} cy={55} r={1.6} fill="#ffffff" opacity={0.8} />)}
          </g>
        );
      case 'turban':
        return (
          <g>
            <path d="M63 66 Q58 18 100 16 Q142 18 137 66 Q120 54 100 56 Q80 54 63 66 Z" fill={col} />
            <path d="M66 54 Q100 22 134 48 M68 40 Q100 30 130 60 M100 18 Q92 40 100 56" stroke={dk} stroke-width={2.5} fill="none" opacity={0.6} />
          </g>
        );
      case 'kippa':
        return <path d="M84 36 Q100 24 116 36 Q100 32 84 36 Z" fill={col} stroke={dk} stroke-width={1} />;
      default:
        return null;
    }
  };

  const hijabBack = () =>
    c.headwear === 'hijab' ? <path d="M56 84 Q52 24 100 22 Q148 24 144 84 L150 146 Q100 160 50 146 Z" fill={shade(c.headwearColor, -0.12)} /> : null;
  const hijabFront = () =>
    c.headwear === 'hijab' ? (
      <g>
        <path
          fill-rule="evenodd"
          d="M58 84 Q54 26 100 24 Q146 26 142 84 Q142 118 122 130 L78 130 Q58 118 58 84 Z M100 45 C117 45 127 58 127 78 C127 98 116 111 100 111 C84 111 73 98 73 78 C73 58 83 45 100 45 Z"
          fill={c.headwearColor}
        />
        <path d="M72 116 Q100 146 128 116 L148 150 Q100 170 52 150 Z" fill={c.headwearColor} />
        <path d="M76 52 Q100 38 124 52" stroke={shade(c.headwearColor, -0.2)} stroke-width={1.5} fill="none" opacity={0.6} />
      </g>
    ) : null;

  const glasses = () => {
    const g = c.glasses;
    if (g === 'none') return null;
    const frame = '#2b2430';
    if (g === 'sonnenbrille')
      return (
        <g>
          <rect x={77} y={71} width={20} height={14} rx={6} fill="#1d1a22" />
          <rect x={103} y={71} width={20} height={14} rx={6} fill="#1d1a22" />
          <path d="M97 75 L103 75 M77 74 L68 72 M123 74 L132 72" stroke={frame} stroke-width={2.4} />
          <path d="M81 74 L87 74" stroke="#ffffff" stroke-width={1.5} opacity={0.5} />
        </g>
      );
    if (g === 'rund')
      return (
        <g fill="#ffffff" fill-opacity={0.12} stroke={frame} stroke-width={2.2}>
          <circle cx={88} cy={78} r={10} />
          <circle cx={112} cy={78} r={10} />
          <path d="M98 77 Q100 74 102 77 M78 76 L68 73 M122 76 L132 73" fill="none" />
        </g>
      );
    if (g === 'cateye')
      return (
        <g fill="#ffffff" fill-opacity={0.12} stroke="#8e2f5a" stroke-width={2.4} stroke-linejoin="round">
          <path d="M76 72 Q88 68 97 72 L96 82 Q88 88 80 84 Q76 80 74 70 Z" />
          <path d="M124 72 Q112 68 103 72 L104 82 Q112 88 120 84 Q124 80 126 70 Z" />
          <path d="M97 76 L103 76" fill="none" />
        </g>
      );
    return (
      <g fill="#ffffff" fill-opacity={0.12} stroke={frame} stroke-width={2.4}>
        <rect x={77} y={70} width={20} height={15} rx={3} />
        <rect x={103} y={70} width={20} height={15} rx={3} />
        <path d="M97 76 L103 76 M77 74 L68 72 M123 74 L132 72" fill="none" />
      </g>
    );
  };

  const figure = (
    <g transform={scale !== 1 ? `translate(100 282) scale(${scale}) translate(-100 -282)` : undefined}>
      {hairBack()}
      {hijabBack()}
      {seated && (
        <g>
          <rect x={100 - bw - 6} y={128} width={2 * bw + 12} height={84} rx={10} fill="#3b4252" />
          <rect x={100 - bw - 2} y={134} width={2 * bw + 4} height={70} rx={8} fill="#4c566a" />
        </g>
      )}
      {legs()}
      <rect x={92} y={104} width={16} height={22} rx={6} fill={skinShade} />
      {torso()}
      {torso().length > 0 && top !== 'latzhose' && top !== 'blazer' && top !== 'anzug' && (
        <path d={`M100 121 L${100 + bw - 14} 121 Q${100 + bw} 124 ${100 + bw} 142 L${100 + hw} 200 L100 200 Z`} fill="#000000" opacity={0.06} />
      )}
      {c.necklace && (
        <g>
          <path d="M88 122 Q100 142 112 122" stroke={GOLD} stroke-width={1.6} fill="none" />
          <circle cx={100} cy={134} r={3} fill={GOLD} />
        </g>
      )}
      {arm('L')}
      {arm('R')}
      {c.mobility === 'gehstock' && (
        <g>
          <path d={`M${handR[0] + 2} ${handR[1] - 4} L${handR[0] + 10} 280`} stroke="#7a4b2a" stroke-width={4} stroke-linecap="round" />
          <path d={`M${handR[0] - 8} ${handR[1] - 6} Q${handR[0] - 2} ${handR[1] - 14} ${handR[0] + 4} ${handR[1] - 4}`} stroke="#7a4b2a" stroke-width={4} fill="none" stroke-linecap="round" />
          <circle cx={handR[0]} cy={handR[1]} r={aw * 0.55 + 1} fill={skin} />
        </g>
      )}
      {/* Kopf */}
      <ellipse cx={100 - earX} cy={80} rx={6} ry={9} fill={skinShade} />
      <ellipse cx={100 + earX} cy={80} rx={6} ry={9} fill={skinShade} />
      {c.hearingAid && <path d={`M${100 + earX + 3} 70 Q${100 + earX + 10} 76 ${100 + earX + 4} 88`} stroke="#c9b79c" stroke-width={4} fill="none" stroke-linecap="round" />}
      {faceShape()}
      {c.vitiligo && (
        <g fill={vit}>
          <path d="M108 60 Q118 56 124 64 Q126 74 118 76 Q110 72 108 60 Z" />
          <path d="M80 100 Q86 98 90 104 Q88 110 82 108 Q78 104 80 100 Z" />
        </g>
      )}
      {c.age === 'aelter' && (
        <g stroke={shade(skin, -0.25)} stroke-width={1.1} fill="none" opacity={0.7} stroke-linecap="round">
          <path d="M88 52 Q100 49 112 52 M90 57 Q100 55 110 57" />
          <path d="M76 80 L72 78 M76 84 L72 85 M124 80 L128 78 M124 84 L128 85" />
          <path d="M86 92 Q84 100 88 104 M114 92 Q116 100 112 104" />
        </g>
      )}
      {c.blush && (
        <g fill="#ff6f86" opacity={0.25}>
          <ellipse cx={81} cy={93} rx={7.5} ry={4.5} />
          <ellipse cx={119} cy={93} rx={7.5} ry={4.5} />
        </g>
      )}
      {c.freckles && (
        <g fill={shade(skin, -0.35)} opacity={0.75}>
          {[[82, 88], [86, 92], [79, 93], [118, 88], [114, 92], [121, 93], [96, 88], [104, 88]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.1} />
          ))}
        </g>
      )}
      {c.mole && <circle cx={117} cy={99} r={1.5} fill={shade(skin, -0.5)} />}
      {beard()}
      {eye(88, 79)}
      {eye(112, 79)}
      {brow(88, 1)}
      {brow(112, -1)}
      <path d="M100 83 Q96 93 101 95" stroke={shade(skin, -0.28)} stroke-width={2} fill="none" stroke-linecap="round" />
      {mouth()}
      {hairFront()}
      {hijabFront()}
      {headwear()}
      {c.earrings !== 'none' && !headCovered && (
        <g>
          {c.earrings === 'ringe' ? (
            <g fill="none" stroke={GOLD} stroke-width={2}>
              <circle cx={100 - earX} cy={94} r={5} />
              <circle cx={100 + earX} cy={94} r={5} />
            </g>
          ) : (
            <g fill={GOLD}>
              <circle cx={100 - earX} cy={88} r={2.4} />
              <circle cx={100 + earX} cy={88} r={2.4} />
            </g>
          )}
        </g>
      )}
      {glasses()}
      {seated && (
        <g>
          <ellipse cx={100 - hw - 18} cy={232} rx={9} ry={38} fill="#2e3440" />
          <ellipse cx={100 - hw - 18} cy={232} rx={4} ry={30} fill="#81a1c1" />
          <ellipse cx={100 + hw + 18} cy={232} rx={9} ry={38} fill="#2e3440" />
          <ellipse cx={100 + hw + 18} cy={232} rx={4} ry={30} fill="#81a1c1" />
          <rect x={100 - hw - 10} y={186} width={2 * hw + 20} height={8} rx={4} fill="#4c566a" />
          <rect x={100 - hw} y={270} width={2 * hw} height={6} rx={3} fill="#4c566a" />
          <circle cx={100 - hw + 2} cy={276} r={5} fill="#2e3440" />
          <circle cx={100 + hw - 2} cy={276} r={5} fill="#2e3440" />
        </g>
      )}
    </g>
  );

  const vb = portrait ? '42 4 116 116' : '0 -16 200 316';
  return (
    <svg viewBox={vb} width={size} height={size} class={cls} role="img" aria-label="Spielfigur">
      {!portrait && <ellipse cx={100} cy={284} rx={56} ry={9} fill="#000000" opacity={0.14} />}
      {figure}
    </svg>
  );
}
