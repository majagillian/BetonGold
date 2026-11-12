// Halbrealistische Figuren mit natürlichen Proportionen und Schattierung
import { useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import type { AvatarConfig } from '../game/types';
import { luminance, mix, nextId, shade } from './color';

interface Props {
  config: AvatarConfig;
  portrait?: boolean;
  size?: number;
  class?: string;
  mood?: 'happy' | 'sad' | 'neutral';
}

const GOLD = '#d4b06a';

export function Avatar({ config: c, portrait, size, class: cls, mood }: Props) {
  const id = useMemo(() => nextId('av'), []);
  const u = (n: string) => `url(#${id}${n})`;
  const skin = c.skin;
  const skinD = shade(skin, -0.18);
  const skinDD = shade(skin, -0.32);
  const skinL = shade(skin, 0.12);
  const hair = c.hairColor;
  const hairL = shade(hair, 0.25);
  const hairD = shade(hair, -0.3);
  const seated = c.mobility === 'rollstuhl';
  const bw = { schmal: 29, mittel: 33, kraeftig: 40 }[c.body];
  const hw = { schmal: 21, mittel: 24, kraeftig: 33 }[c.body];
  const hp = { schmal: 25, mittel: 28, kraeftig: 36 }[c.body];
  const aw = { schmal: 11, mittel: 12.5, kraeftig: 16 }[c.body];
  const lw = { schmal: 19, mittel: 21, kraeftig: 27 }[c.body];
  const scale = portrait ? 1 : { klein: 0.94, mittel: 1, gross: 1.05 }[c.height];
  const top = c.top;
  const tc = c.topColor;
  const pc = top === 'anzug' || top === 'latzhose' ? tc : c.bottomColor;
  const longSleeve = ['hoodie', 'hemd', 'bluse', 'pullover', 'blazer', 'anzug'].includes(top);
  const noSleeve = top === 'tanktop';
  const dress = top === 'kleid';
  const skirt = c.bottom === 'rock' && !dress && top !== 'anzug' && top !== 'latzhose';
  const shorts = c.bottom === 'shorts' && !dress && top !== 'anzug' && top !== 'latzhose';
  const hijab = c.headwear === 'hijab';
  const covered = ['beanie', 'hut', 'turban', 'cap'].includes(c.headwear);
  const vit = mix(skin, '#f6e6dc', 0.75);
  const lipBase = c.lipColor !== 'none' ? c.lipColor : mix(skinD, '#b5655f', 0.45);

  // ---------- Körper ----------
  const torso = `M${100 - bw} 98 Q${100 - bw} 88 ${100 - bw + 12} 86 L${100 + bw - 12} 86 Q${100 + bw} 88 ${100 + bw} 98 L${100 + hw + 1} 160 Q${100 + hp} 185 ${100 + hp} 205 L${100 - hp} 205 Q${100 - hp} 185 ${100 - hw - 1} 160 Z`;
  const sh = (side: 1 | -1) => [100 + side * (bw - 6), 95];
  const el = (side: 1 | -1) => (seated ? [100 + side * (bw + 4), 160] : [100 + side * (bw + 7), 158]);
  const wr = (side: 1 | -1) => (seated ? [100 + side * (hw + 8), 205] : [100 + side * (bw + 6), 218]);
  const legX = (side: 1 | -1) => 100 + side * hp * 0.48;

  const arm = (side: 1 | -1) => {
    const s = sh(side);
    const e = el(side);
    const w = wr(side);
    const sleeveCol = longSleeve ? tc : skin;
    const short = !longSleeve && !noSleeve;
    return (
      <g>
        <path d={`M${s[0]} ${s[1]} L${e[0]} ${e[1]}`} stroke={short || noSleeve ? skin : sleeveCol} stroke-width={aw + 1} stroke-linecap="round" />
        <path d={`M${e[0]} ${e[1]} L${w[0]} ${w[1]}`} stroke={longSleeve ? sleeveCol : skin} stroke-width={aw - 1} stroke-linecap="round" />
        {short && <path d={`M${s[0]} ${s[1]} L${s[0] + (e[0] - s[0]) * 0.45} ${s[1] + (e[1] - s[1]) * 0.45}`} stroke={tc} stroke-width={aw + 4} stroke-linecap="round" />}
        <path d={`M${s[0] + side * aw * 0.3} ${s[1]} L${e[0] + side * aw * 0.3} ${e[1]} L${w[0] + side * aw * 0.25} ${w[1]}`} stroke="#000" stroke-opacity={0.1} stroke-width={aw * 0.4} stroke-linecap="round" fill="none" />
        {longSleeve && <path d={`M${w[0] - 6} ${w[1] - 6} L${w[0] + 6} ${w[1] - 6}`} stroke={shade(sleeveCol, -0.2)} stroke-width={3} stroke-linecap="round" />}
        <ellipse cx={w[0]} cy={w[1] + 7} rx={aw * 0.42} ry={aw * 0.62} fill={skin} />
        <ellipse cx={w[0] + side * 2} cy={w[1] + 8} rx={aw * 0.2} ry={aw * 0.45} fill={skinD} opacity={0.5} />
        {c.vitiligo && side === -1 && <ellipse cx={w[0]} cy={w[1] + 4} rx={3} ry={4} fill={vit} />}
      </g>
    );
  };

  const shoe = (x: number, y: number, side: 1 | -1) => {
    const col = c.shoeColor;
    const dk = shade(col, -0.35);
    if (c.shoes === 'stiefel')
      return (
        <g>
          <path d={`M${x - lw * 0.38} ${y - 34} L${x + lw * 0.38} ${y - 34} L${x + lw * 0.4} ${y} L${x - lw * 0.4} ${y} Z`} fill={col} />
          <path d={`M${x - lw * 0.42} ${y - 2} Q${x + side * 2} ${y - 6} ${x + side * lw * 0.65} ${y + 1} L${x + side * lw * 0.65} ${y + 5} L${x - lw * 0.42} ${y + 5} Z`} fill={col} />
          <rect x={x - lw * 0.45} y={y + 4} width={lw * 1.05} height={3} rx={1.5} fill={dk} />
        </g>
      );
    if (c.shoes === 'sandalen')
      return (
        <g>
          <path d={`M${x - lw * 0.3} ${y - 4} Q${x} ${y - 7} ${x + lw * 0.3} ${y - 4} L${x + side * lw * 0.5} ${y + 4} L${x - lw * 0.35} ${y + 4} Z`} fill={skin} />
          <path d={`M${x - lw * 0.3} ${y - 1} L${x + lw * 0.35} ${y - 1}`} stroke={col} stroke-width={2.5} />
          <rect x={x - lw * 0.42} y={y + 3} width={lw * 0.95} height={2.5} rx={1} fill={dk} />
        </g>
      );
    return (
      <g>
        <path d={`M${x - lw * 0.38} ${y - 6} Q${x} ${y - 10} ${x + lw * 0.38} ${y - 6} Q${x + side * lw * 0.75} ${y - 2} ${x + side * lw * 0.68} ${y + 4} L${x - lw * 0.42} ${y + 4} Z`} fill={col} />
        <path d={`M${x - lw * 0.42} ${y + 2} L${x + side * lw * 0.68} ${y + 2}`} stroke={c.shoes === 'sneaker' ? '#f4f4f2' : dk} stroke-width={c.shoes === 'sneaker' ? 3.2 : 2} />
        <path d={`M${x - lw * 0.15} ${y - 7} Q${x} ${y - 4} ${x + lw * 0.2} ${y - 7}`} stroke={shade(col, 0.3)} stroke-width={1} fill="none" opacity={0.7} />
      </g>
    );
  };

  const legs = () => {
    const bare = dress || skirt;
    const footY = seated ? 334 : 372;
    return (
      <g>
        {([-1, 1] as const).map((side) => {
          const x = legX(side);
          const prosth = c.mobility === 'prothese' && side === 1;
          if (seated) {
            return (
              <g key={side}>
                <path d={`M${x - lw / 2} 200 L${x + lw / 2} 200 L${x + lw * 0.48} 240 L${x - lw * 0.48} 240 Z`} fill={bare ? skin : pc} />
                <path d={`M${x - lw * 0.4} 238 L${x + lw * 0.4} 238 L${x + lw * 0.32} ${footY - 4} L${x - lw * 0.32} ${footY - 4} Z`} fill={bare || shorts ? skin : pc} />
                {shoe(x, footY, side)}
              </g>
            );
          }
          const legCol = bare || shorts ? skin : pc;
          return (
            <g key={side}>
              <path d={`M${x - lw / 2} 198 L${x + lw / 2} 198 L${x + lw * 0.34} ${prosth ? 300 : 366} L${x - lw * 0.34} ${prosth ? 300 : 366} Z`} fill={legCol} />
              {prosth && (
                <g>
                  <rect x={x - 7} y={292} width={14} height={12} rx={4} fill="#4a5059" />
                  <rect x={x - 3} y={302} width={6} height={64} rx={3} fill="#a9b1bb" />
                  <rect x={x - 1} y={304} width={1.5} height={60} fill="#e2e6ea" />
                </g>
              )}
              <path d={`M${x + side * lw * 0.15} 205 L${x + side * lw * 0.1} 360`} stroke="#000" stroke-opacity={0.12} stroke-width={lw * 0.35} />
              {shorts && <path d={`M${x - lw / 2 - 1} 198 L${x + lw / 2 + 1} 198 L${x + lw * 0.47} 252 L${x - lw * 0.47} 252 Z`} fill={pc} />}
              {c.bottom === 'jogger' && !bare && !shorts && <rect x={x - lw * 0.36} y={352} width={lw * 0.72} height={10} rx={3} fill={shade(pc, -0.18)} />}
              {c.bottom === 'jeans' && !bare && !shorts && <path d={`M${x - side * lw * 0.32} 215 L${x - side * lw * 0.24} 360`} stroke={shade(pc, 0.3)} stroke-width={0.8} stroke-dasharray="2 2" opacity={0.6} />}
              {shoe(x, footY, side)}
            </g>
          );
        })}
        {!bare && (
          <path d={`M${100 - hp} 190 L${100 + hp} 190 L${100 + hp - 1} ${shorts ? 228 : 222} L100 ${shorts ? 232 : 226} L${100 - hp + 1} ${shorts ? 228 : 222} Z`} fill={pc} />
        )}
        {!bare && !dress && <rect x={100 - hp} y={188} width={hp * 2} height={7} fill={shade(pc, -0.25)} />}
        {!bare && c.bottom !== 'jogger' && <rect x={96} y={188} width={8} height={7} rx={1} fill={top === 'anzug' ? shade(pc, -0.4) : '#b8a06a'} />}
      </g>
    );
  };

  const torsoClothes = () => {
    const parts: JSX.Element[] = [];
    const dk = shade(tc, -0.2);
    if (dress) {
      parts.push(<path d={`M${100 - hp - 2} 188 L${100 + hp + 2} 188 L${100 + hp + 22} 285 Q100 292 ${100 - hp - 22} 285 Z`} fill={u('cloth')} />);
      parts.push(<path d={`M${100 - hp + 8} 196 L${100 - hp - 6} 282 M100 196 L100 290 M${100 + hp - 8} 196 L${100 + hp + 6} 282`} stroke={dk} stroke-width={1} opacity={0.35} />);
    }
    if (skirt) {
      parts.push(<path d={`M${100 - hp} 188 L${100 + hp} 188 L${100 + hp + 14} 268 Q100 273 ${100 - hp - 14} 268 Z`} fill={c.bottomColor} />);
      parts.push(<path d={`M${100 - hp / 2} 194 L${100 - hp / 2 - 6} 266 M${100 + hp / 2} 194 L${100 + hp / 2 + 6} 266`} stroke={shade(c.bottomColor, -0.25)} stroke-width={1} opacity={0.5} />);
    }
    if (top === 'latzhose') {
      const tee = luminance(tc) > 0.6 ? '#3a4a5e' : '#f1efe9';
      parts.push(<path d={torso} fill={tee} />);
      parts.push(<path d={`M${100 - hw + 4} 132 L${100 + hw - 4} 132 L${100 + hp} 200 L${100 - hp} 200 Z`} fill={u('cloth')} />);
      parts.push(<path d={`M${100 - hw + 6} 134 L${100 - bw + 10} 88 M${100 + hw - 6} 134 L${100 + bw - 10} 88`} stroke={tc} stroke-width={6} stroke-linecap="round" />);
      parts.push(<circle cx={100 - hw + 7} cy={135} r={2.4} fill={GOLD} />, <circle cx={100 + hw - 7} cy={135} r={2.4} fill={GOLD} />);
      parts.push(<rect x={92} y={148} width={16} height={13} rx={2} fill={dk} opacity={0.6} />);
      return parts;
    }
    parts.push(<path d={torso} fill={u('cloth')} />);
    switch (top) {
      case 'tanktop':
        parts.push(<path d={`M${100 - bw + 4} 86 L${100 - bw + 14} 86 Q100 116 ${100 + bw - 14} 86 L${100 + bw - 4} 86 Q${100 + bw} 90 ${100 + bw} 100 L${100 + bw - 8} 104 Q100 108 ${100 - bw + 8} 104 L${100 - bw} 100 Q${100 - bw} 90 ${100 - bw + 4} 86 Z`} fill={skin} />);
        break;
      case 'tshirt':
        parts.push(<path d="M89 86 Q100 98 111 86" fill={skin} stroke={dk} stroke-width={2} />);
        parts.push(<path d={`M${100 - hw + 4} 150 Q100 155 ${100 + hw - 4} 150`} stroke={dk} stroke-width={1} opacity={0.3} fill="none" />);
        break;
      case 'hoodie':
        parts.push(<path d="M82 88 Q100 76 118 88 Q112 100 100 102 Q88 100 82 88 Z" fill={dk} />);
        parts.push(<path d="M95 98 L94 122 M105 98 L106 122" stroke="#f1efe9" stroke-width={1.6} stroke-linecap="round" />);
        parts.push(<path d={`M${100 - hw + 2} 165 L${100 + hw - 2} 165 L${100 + hw - 6} 188 L${100 - hw + 6} 188 Z`} fill={dk} opacity={0.8} />);
        parts.push(<rect x={100 - hp} y={194} width={hp * 2} height={9} fill={dk} />);
        break;
      case 'hemd':
        parts.push(<path d="M90 85 L100 98 L95 104 Z M110 85 L100 98 L105 104 Z" fill={shade(tc, 0.3)} stroke={dk} stroke-width={0.8} />);
        parts.push(<path d="M100 98 L100 204" stroke={dk} stroke-width={1} />);
        [112, 130, 148, 166, 184].forEach((y) => parts.push(<circle cx={102.5} cy={y} r={1.4} fill={dk} />));
        parts.push(<path d={`M${100 - bw + 8} 112 L${100 - bw + 20} 112 L${100 - bw + 20} 124 L${100 - bw + 8} 124 Z`} fill="none" stroke={dk} stroke-width={0.8} />);
        break;
      case 'bluse':
        parts.push(<path d="M86 86 Q93 100 100 92 Q107 100 114 86 Q107 91 100 89 Q93 91 86 86 Z" fill={shade(tc, 0.45)} stroke={dk} stroke-width={0.8} />);
        [108, 122, 136].forEach((y) => parts.push(<circle cx={100} cy={y} r={1.5} fill={shade(tc, 0.5)} />));
        parts.push(<path d={`M${100 - hw} 175 Q100 180 ${100 + hw} 175`} stroke={dk} stroke-width={1} opacity={0.3} fill="none" />);
        break;
      case 'pullover':
        parts.push(<path d="M88 86 Q100 97 112 86" fill="none" stroke={dk} stroke-width={5} />);
        parts.push(<rect x={100 - hp} y={194} width={hp * 2} height={9} fill={dk} />);
        for (let y = 112; y < 190; y += 14) parts.push(<path d={`M${100 - hw} ${y} Q100 ${y + 3} ${100 + hw} ${y}`} stroke={shade(tc, 0.12)} stroke-width={1.2} fill="none" opacity={0.6} />);
        break;
      case 'blazer':
      case 'anzug':
        parts.push(<path d="M90 86 L100 132 L110 86 Z" fill={top === 'anzug' ? '#f7f6f2' : shade(tc, 0.6)} />);
        if (top === 'anzug') parts.push(<path d="M100 92 L96 98 L100 128 L104 98 Z" fill="#7a1f2b" />);
        parts.push(<path d="M88 86 L100 136 L94 86 Z M112 86 L100 136 L106 86 Z" fill={shade(tc, -0.25)} />);
        parts.push(<path d="M100 136 L100 200" stroke={shade(tc, -0.35)} stroke-width={1} />);
        parts.push(<circle cx={102} cy={150} r={1.8} fill={shade(tc, -0.45)} />, <circle cx={102} cy={170} r={1.8} fill={shade(tc, -0.45)} />);
        parts.push(<path d={`M${100 + bw - 20} 118 L${100 + bw - 8} 118`} stroke={shade(tc, 0.5)} stroke-width={2} />);
        break;
      case 'kleid':
        parts.push(<path d="M88 86 Q100 100 112 86" fill={skin} />);
        parts.push(<path d={`M${100 - hp} 190 L${100 + hp} 190`} stroke={dk} stroke-width={4} />);
        break;
    }
    return parts;
  };

  // ---------- Kopf ----------
  const facePath = {
    oval: 'M100 18 C116 18 123 30 123 44 C123 60 114 74 100 76 C86 74 77 60 77 44 C77 30 84 18 100 18Z',
    rund: 'M100 18 C118 18 125 31 125 46 C125 62 115 75 100 76 C85 75 75 62 75 46 C75 31 82 18 100 18Z',
    eckig: 'M100 18 C117 18 123 29 123 42 L122 57 C120 68 112 75 100 76 C88 75 80 68 78 57 L77 42 C77 29 83 18 100 18Z',
    herz: 'M100 18 C118 18 124 30 124 42 C124 56 112 70 100 77 C88 70 76 56 76 42 C76 30 82 18 100 18Z',
  }[c.faceShape];
  const earX = c.faceShape === 'rund' ? 25 : 23;

  const eye = (x: number, side: 1 | -1) => {
    const y = 46;
    const sad = mood === 'sad';
    if (c.eyes === 'freundlich' || mood === 'happy') {
      if (c.eyes === 'freundlich')
        return (
          <g>
            <path d={`M${x - 5} ${y} Q${x} ${y - 4} ${x + 5} ${y}`} stroke="#2a1d18" stroke-width={1.6} fill="none" stroke-linecap="round" />
            <path d={`M${x - 4} ${y + 2.5} Q${x} ${y + 1} ${x + 4} ${y + 2.5}`} stroke={skinDD} stroke-width={0.7} fill="none" opacity={0.6} />
          </g>
        );
    }
    const h = c.eyes === 'rund' ? 3.2 : c.eyes === 'schmal' ? 1.9 : 2.6;
    const w = c.eyes === 'rund' ? 4.6 : 5.2;
    const outer = x + side * w;
    const inner = x - side * w;
    const lift = c.eyes === 'mandel' ? -0.8 : 0;
    const d = `M${inner} ${y + 0.4} Q${x - side * 1} ${y - h * 1.5} ${outer} ${y + lift} Q${x} ${y + h * 0.9} ${inner} ${y + 0.4} Z`;
    const clip = `${id}e${side}`;
    return (
      <g>
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
        <path d={d} fill="#f6f2ee" />
        <g clip-path={`url(#${clip})`}>
          <circle cx={x + side * 0.3} cy={y - 0.3} r={c.eyes === 'schmal' ? 2.2 : 2.6} fill={u(`iris`)} />
          <circle cx={x + side * 0.3} cy={y - 0.3} r={1.15} fill="#0e0a09" />
          <circle cx={x + side * 0.3 + 0.9} cy={y - 1.3} r={0.6} fill="#ffffff" opacity={0.9} />
          <path d={`M${inner} ${y - h} L${outer} ${y - h}`} stroke="#000" stroke-opacity={0.18} stroke-width={1.6} />
        </g>
        <path d={`M${inner} ${y + 0.4} Q${x - side * 1} ${y - h * 1.5} ${outer} ${y + lift}`} stroke="#241815" stroke-width={c.eyes === 'schmal' ? 1.5 : 1.2} fill="none" stroke-linecap="round" />
        <path d={`M${outer} ${y + lift} l${side * 1.6} ${-1.2}`} stroke="#241815" stroke-width={0.9} stroke-linecap="round" />
        {c.eyes !== 'schmal' && <path d={`M${inner + side * 0.8} ${y - h * 1.35 - 1.2} Q${x} ${y - h * 2.1 - 1} ${outer - side * 0.5} ${y - h * 1.1 - 0.8}`} stroke={skinDD} stroke-width={0.6} fill="none" opacity={0.5} />}
        <path d={`M${inner + side} ${y + h * 0.75} Q${x} ${y + h * 1.2} ${outer - side} ${y + h * 0.5}`} stroke={skinD} stroke-width={0.6} fill="none" opacity={sad ? 0.9 : 0.4} />
      </g>
    );
  };

  const browColor = luminance(hair) > 0.6 ? shade(hair, -0.45) : shade(hair, -0.05);
  const brow = (x: number, side: 1 | -1) => {
    const w = { fein: 1.2, kraeftig: 2, buschig: 3, gerade: 2 }[c.brows];
    const sad = mood === 'sad';
    const inner = x - side * 6;
    const outer = x + side * 6;
    const d =
      c.brows === 'gerade'
        ? `M${inner} 39.5 L${outer} 39.5`
        : sad
          ? `M${inner} 38 Q${x} 37 ${outer} 41`
          : `M${inner} 40 Q${x - side} 36.5 ${outer} 39`;
    return <path d={d} stroke={browColor} stroke-width={w} fill="none" stroke-linecap="round" opacity={0.92} />;
  };

  const mouth = () => {
    const m = mood === 'sad' ? 'traurig' : c.mouth;
    const lipD = shade(lipBase, -0.25);
    const lipL = shade(lipBase, 0.15);
    switch (m) {
      case 'traurig':
        return <path d="M94 65 Q100 62 106 65" stroke={lipD} stroke-width={1.6} fill="none" stroke-linecap="round" />;
      case 'grinsen':
        return (
          <g>
            <path d="M92.5 62.5 Q100 71 107.5 62.5 Q100 64 92.5 62.5 Z" fill="#5a2420" />
            <path d="M93.6 63 Q100 64.6 106.4 63 L106 64.4 Q100 66 94 64.4 Z" fill="#f7f4ee" />
            <path d="M92.5 62.5 Q100 71 107.5 62.5" stroke={lipBase} stroke-width={1.4} fill="none" />
            <path d="M91.5 62 l-1 -0.8 M108.5 62 l1 -0.8" stroke={skinDD} stroke-width={0.7} />
          </g>
        );
      case 'neutral':
        return (
          <g>
            <path d="M94 63 Q97 61.4 100 62.4 Q103 61.4 106 63 Q100 64 94 63 Z" fill={lipBase} />
            <path d="M94 63 Q100 66.4 106 63 Q100 64.2 94 63 Z" fill={lipL} />
            <path d="M94 63 Q100 64 106 63" stroke={lipD} stroke-width={0.6} fill="none" />
          </g>
        );
      case 'schmunzeln':
        return (
          <g>
            <path d="M94 63.4 Q97 61.6 100 62.6 Q103 61.4 107 62 Q100 64.4 94 63.4 Z" fill={lipBase} />
            <path d="M94 63.4 Q100 66.8 107 62 Q100 64.6 94 63.4 Z" fill={lipL} />
            <path d="M94 63.4 Q100 64.6 107 62 l0.8 -0.8" stroke={lipD} stroke-width={0.6} fill="none" />
          </g>
        );
      default:
        return (
          <g>
            <path d="M93.5 62.6 Q97 61 100 62 Q103 61 106.5 62.6 Q100 64.2 93.5 62.6 Z" fill={lipBase} />
            <path d="M93.5 62.6 Q100 68.4 106.5 62.6 Q100 64.6 93.5 62.6 Z" fill={lipL} />
            <path d="M93.5 62.6 Q100 64.6 106.5 62.6" stroke={lipD} stroke-width={0.7} fill="none" />
            <path d="M92.6 62 l-0.8 -0.7 M107.4 62 l0.8 -0.7" stroke={skinDD} stroke-width={0.6} />
          </g>
        );
    }
  };

  const beard = () => {
    if (c.beard === 'none') return null;
    const bc = hair;
    const must = <path d="M92 60.5 Q96 57.5 100 59 Q104 57.5 108 60.5 Q104 61 100 60.4 Q96 61 92 60.5 Z" fill={bc} />;
    switch (c.beard) {
      case 'stoppeln':
        return <path d="M78 52 Q79 74 100 77 Q121 74 122 52 Q118 66 108 68 Q100 66 92 68 Q82 66 78 52 Z" fill={bc} opacity={0.22} />;
      case 'schnurrbart':
        return must;
      case 'kinnbart':
        return (
          <g fill={bc}>
            {must}
            <path d="M95 68 Q100 67 105 68 Q105 77 100 78 Q95 77 95 68 Z" />
          </g>
        );
      default: {
        const b = c.beard === 'lang' ? 98 : 82;
        return (
          <g>
            <path d={`M77 48 Q77 ${b - 6} 100 ${b} Q123 ${b - 6} 123 48 Q120 62 110 66 Q100 63 90 66 Q80 62 77 48 Z`} fill={bc} />
            {Array.from({ length: 10 }, (_, i) => (
              <path key={i} d={`M${84 + i * 3.4} ${66 + (i % 3)} l${(i - 5) * 0.4} ${b - 70}`} stroke={hairD} stroke-width={0.6} opacity={0.5} />
            ))}
            {must}
            <path d="M93 66 Q100 68 107 66" stroke={hairD} stroke-width={0.8} fill="none" opacity={0.5} />
          </g>
        );
      }
    }
  };

  // ---------- Haare ----------
  const hairBack = (): JSX.Element | null => {
    if (hijab) return null;
    switch (c.hair) {
      case 'afro':
        return <ellipse cx={100} cy={38} rx={38} ry={33} fill={u('hair')} />;
      case 'puffs':
        return covered ? null : (
          <g fill={u('hair')}>
            <circle cx={73} cy={22} r={14} />
            <circle cx={127} cy={22} r={14} />
          </g>
        );
      case 'dutt':
        return covered ? null : <ellipse cx={100} cy={15} rx={11} ry={9} fill={u('hair')} />;
      case 'zopf':
        return <path d="M114 26 Q132 32 128 64 Q126 84 118 96 Q122 76 120 60 Q118 40 110 32 Z" fill={u('hair')} />;
      case 'bob':
        return <path d="M75 40 Q73 15 100 14 Q127 15 125 40 L127 72 Q114 78 100 76 Q86 78 73 72 Z" fill={u('hair')} />;
      case 'wellig':
        return <path d="M76 38 Q72 14 100 13 Q128 14 124 38 Q132 56 126 72 Q134 86 124 100 Q112 106 100 102 Q88 106 76 100 Q66 86 74 72 Q68 56 76 38 Z" fill={u('hair')} />;
      case 'lang':
        return <path d="M76 38 Q72 14 100 13 Q128 14 124 38 L128 128 Q114 134 100 130 Q86 134 72 128 Z" fill={u('hair')} />;
      case 'locs':
        return (
          <g>
            {[78, 84, 90, 110, 116, 122].map((x, i) => (
              <rect key={x} x={x - 3} y={30} width={6} height={i % 2 ? 78 : 70} rx={3} fill={i % 2 ? hair : hairD} />
            ))}
          </g>
        );
      case 'braids':
        return (
          <g>
            {[77, 83, 89, 111, 117, 123].map((x, i) => (
              <g key={x}>
                {Array.from({ length: 14 }, (_, k) => (
                  <ellipse key={k} cx={x + (k % 2 ? 0.8 : -0.8)} cy={34 + k * 6} rx={2.8} ry={3.8} fill={(k + i) % 2 ? hair : hairD} />
                ))}
              </g>
            ))}
          </g>
        );
      case 'locken':
        return <path d="M74 44 Q68 14 100 12 Q132 14 126 44 Q130 60 124 68 L76 68 Q70 60 74 44 Z" fill={u('hair')} />;
      default:
        return null;
    }
  };

  const hairFront = (): JSX.Element | null => {
    if (hijab) return null;
    const strands = (paths: string[]) => paths.map((d, i) => <path key={i} d={d} stroke={i % 2 ? hairL : hairD} stroke-width={0.7} fill="none" opacity={0.55} />);
    switch (c.hair) {
      case 'glatze':
        return <ellipse cx={92} cy={24} rx={7} ry={3.5} fill="#fff" opacity={0.18} transform="rotate(-20 92 24)" />;
      case 'buzz':
        return <path d="M77.5 42 Q76 16 100 15 Q124 16 122.5 42 Q119 26 100 24 Q81 26 77.5 42 Z" fill={hair} opacity={0.8} />;
      case 'kurz':
        return (
          <g>
            <path d="M76 44 Q72 12 100 11 Q128 12 124 44 Q121 30 112 26 Q102 32 88 27 Q80 32 76 44 Z" fill={u('hair')} />
            {strands(['M86 16 Q92 24 90 30', 'M98 13 Q102 22 99 30', 'M110 15 Q112 22 112 27'])}
          </g>
        );
      case 'seitenscheitel':
        return (
          <g>
            <path d="M76 46 Q72 11 104 11 Q128 13 124 44 Q120 28 114 24 Q100 20 90 32 Q82 30 76 46 Z" fill={u('hair')} />
            {strands(['M90 32 Q100 18 118 20', 'M94 28 Q104 16 120 24', 'M86 22 Q92 16 104 14'])}
          </g>
        );
      case 'pixie':
        return <path d="M75 48 Q70 11 102 11 Q128 13 125 42 Q122 30 116 27 Q108 36 94 31 Q90 38 82 36 Q78 42 75 48 Z" fill={u('hair')} />;
      case 'undercut':
        return (
          <g>
            <path d="M77.5 42 Q76 18 100 17 Q124 18 122.5 42 Q119 28 100 26 Q81 28 77.5 42 Z" fill={hair} opacity={0.35} />
            <path d="M80 30 Q78 6 104 7 Q126 9 121 30 Q112 22 100 25 Q88 22 80 30 Z" fill={u('hair')} />
            {strands(['M88 12 Q100 8 116 14', 'M86 20 Q100 13 118 20'])}
          </g>
        );
      case 'irokese':
        return (
          <g>
            <path d="M77.5 42 Q76 18 100 17 Q124 18 122.5 42 Q119 28 100 26 Q81 28 77.5 42 Z" fill={hair} opacity={0.3} />
            {!covered && <path d="M93 26 L94 4 L98 18 L100 1 L102 18 L106 4 L107 26 Q100 22 93 26 Z" fill={u('hair')} />}
          </g>
        );
      case 'locken':
        return (
          <g>
            {[[78, 36], [80, 26], [87, 18], [96, 14], [105, 14], [114, 18], [120, 26], [122, 36], [90, 24], [110, 24], [100, 20]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={6.5} fill={i % 2 ? hair : hairL} />
            ))}
            {[[82, 30], [100, 16], [116, 30]].map(([x, y], i) => <circle key={`d${i}`} cx={x} cy={y} r={3} fill={hairD} opacity={0.5} />)}
          </g>
        );
      case 'afro':
        return <path d="M77 40 Q76 26 86 24 Q92 18 100 21 Q108 18 114 24 Q124 26 123 40 Q118 30 100 29 Q82 30 77 40 Z" fill={u('hair')} />;
      case 'puffs':
      case 'locs':
      case 'braids':
        return (
          <g>
            <path d="M76.5 44 Q73 14 100 13 Q127 14 123.5 44 Q120 26 100 25 Q80 26 76.5 44 Z" fill={u('hair')} />
            <path d="M100 13 L100 25" stroke={hairD} stroke-width={1} />
            {c.hair === 'braids' && <path d="M90 15 Q86 26 82 38 M110 15 Q114 26 118 38 M95 14 Q94 22 92 28 M105 14 Q106 22 108 28" stroke={hairD} stroke-width={0.9} fill="none" />}
          </g>
        );
      case 'zopf':
      case 'dutt':
        return (
          <g>
            <path d="M76.5 44 Q73 14 100 13 Q127 14 123.5 44 Q121 28 110 24 Q100 28 90 24 Q79 28 76.5 44 Z" fill={u('hair')} />
            {strands(['M100 14 Q94 20 86 26', 'M100 14 Q106 20 114 26', 'M100 14 Q98 20 94 25'])}
          </g>
        );
      case 'bob':
        return <path d="M74 50 Q71 13 100 13 Q129 13 126 50 Q124 30 114 26 Q100 34 84 27 Q76 34 74 50 Z" fill={u('hair')} />;
      case 'wellig':
      case 'lang':
        return (
          <g>
            <path d="M75 56 Q71 13 100 13 Q129 13 125 56 Q124 34 112 25 Q104 30 100 21 Q96 30 88 25 Q76 34 75 56 Z" fill={u('hair')} />
            {strands(['M100 14 Q92 24 84 40', 'M100 14 Q108 24 116 40', 'M96 18 Q88 28 80 50', 'M104 18 Q112 28 120 50'])}
          </g>
        );
      default:
        return null;
    }
  };

  const headwear = () => {
    const col = c.headwearColor;
    const dk = shade(col, -0.25);
    switch (c.headwear) {
      case 'cap':
        return (
          <g>
            <path d="M76 36 Q76 12 100 12 Q124 12 124 36 Z" fill={col} />
            <path d="M74 36 Q100 44 128 34 L127 31 Q100 39 76 33 Z" fill={dk} />
            <path d="M100 12 L100 34" stroke={dk} stroke-width={0.8} opacity={0.6} />
            <circle cx={100} cy={13} r={2} fill={dk} />
          </g>
        );
      case 'beanie':
        return (
          <g>
            <path d="M75 38 Q74 8 100 8 Q126 8 125 38 Z" fill={col} />
            <rect x={74} y={30} width={52} height={10} rx={4} fill={dk} />
            {[80, 86, 92, 98, 104, 110, 116].map((x) => <path key={x} d={`M${x} 31 L${x} 39`} stroke={shade(col, -0.4)} stroke-width={0.8} />)}
            <circle cx={100} cy={7} r={6} fill={shade(col, 0.2)} />
          </g>
        );
      case 'hut':
        return (
          <g>
            <ellipse cx={100} cy={28} rx={38} ry={7} fill={dk} />
            <path d="M82 28 Q82 6 100 6 Q118 6 118 28 Z" fill={col} />
            <rect x={82} y={20} width={36} height={6} fill={shade(col, -0.45)} />
          </g>
        );
      case 'bandana':
        return (
          <g>
            <path d="M76 32 Q100 20 124 32 L124 38 Q100 28 76 38 Z" fill={col} />
            <path d="M124 34 L132 30 L131 40 Z" fill={dk} />
          </g>
        );
      case 'turban':
        return (
          <g>
            <path d="M74 40 Q70 5 100 4 Q130 5 126 40 Q114 32 100 33 Q86 32 74 40 Z" fill={col} />
            <path d="M76 32 Q100 8 124 28 M78 22 Q100 14 122 38 M100 5 Q93 22 100 33" stroke={dk} stroke-width={1.6} fill="none" opacity={0.55} />
          </g>
        );
      case 'kippa':
        return <path d="M90 16 Q100 9 110 16 Q100 14 90 16 Z" fill={col} stroke={dk} stroke-width={0.6} />;
      default:
        return null;
    }
  };

  const hijabBack = () => (hijab ? <path d="M70 50 Q68 8 100 7 Q132 8 130 50 L136 110 Q100 120 64 110 Z" fill={shade(c.headwearColor, -0.12)} /> : null);
  const hijabFront = () =>
    hijab ? (
      <g>
        <path
          fill-rule="evenodd"
          d="M71 50 Q69 9 100 8 Q131 9 129 50 Q129 78 116 90 L84 90 Q71 78 71 50 Z M100 22 C113 22 120 32 120 45 C120 60 112 72 100 73 C88 72 80 60 80 45 C80 32 87 22 100 22 Z"
          fill={c.headwearColor}
        />
        <path d="M80 80 Q100 98 120 80 L134 112 Q100 126 66 112 Z" fill={c.headwearColor} />
        <path d="M82 30 Q100 20 118 30" stroke={shade(c.headwearColor, -0.2)} stroke-width={1} fill="none" opacity={0.6} />
        <path d="M84 96 Q100 104 116 96" stroke={shade(c.headwearColor, -0.25)} stroke-width={1} fill="none" opacity={0.5} />
      </g>
    ) : null;

  const glasses = () => {
    const g = c.glasses;
    if (g === 'none') return null;
    if (g === 'sonnenbrille')
      return (
        <g>
          <rect x={83} y={42} width={14} height={9} rx={4} fill="#14171c" />
          <rect x={103} y={42} width={14} height={9} rx={4} fill="#14171c" />
          <path d="M97 45 L103 45 M83 44 L77 43 M117 44 L123 43" stroke="#1e1e1e" stroke-width={1.3} />
          <path d="M86 44 L90 44" stroke="#fff" stroke-width={1} opacity={0.4} />
        </g>
      );
    const frame = g === 'cateye' ? '#7a2e46' : '#2a2a2e';
    return (
      <g fill="#ffffff" fill-opacity={0.1} stroke={frame} stroke-width={1.2}>
        {g === 'rund' && (
          <>
            <circle cx={91} cy={46} r={6.2} />
            <circle cx={109} cy={46} r={6.2} />
          </>
        )}
        {g === 'eckig' && (
          <>
            <rect x={84} y={41.5} width={14} height={9.5} rx={1.6} />
            <rect x={102} y={41.5} width={14} height={9.5} rx={1.6} />
          </>
        )}
        {g === 'cateye' && (
          <>
            <path d="M83 43 Q91 40 98 43 L97 49 Q91 53 86 50 Q83 47 82 41 Z" />
            <path d="M117 43 Q109 40 102 43 L103 49 Q109 53 114 50 Q117 47 118 41 Z" />
          </>
        )}
        <path d="M97 45.5 Q100 44 103 45.5 M84 44 L77 43 M116 44 L123 43" fill="none" />
      </g>
    );
  };

  const age = c.age;
  const figure = (
    <g transform={scale !== 1 ? `translate(100 384) scale(${scale}) translate(-100 -384)` : undefined}>
      {hairBack()}
      {hijabBack()}
      {seated && (
        <g>
          <rect x={100 - bw - 8} y={92} width={2 * bw + 16} height={118} rx={10} fill="#2f3542" />
          <rect x={100 - bw - 3} y={98} width={2 * bw + 6} height={104} rx={8} fill="#3d4453" />
        </g>
      )}
      {legs()}
      {/* Hals */}
      <path d="M91 66 L109 66 L111 90 L89 90 Z" fill={skin} />
      <path d="M91 70 Q100 80 109 70 L109 78 Q100 84 91 78 Z" fill={skinDD} opacity={0.35} />
      {torsoClothes()}
      <path d={torso} fill={u('shadeR')} opacity={0.5} />
      {c.necklace && (
        <g>
          <path d="M90 86 Q100 104 110 86" stroke={GOLD} stroke-width={1} fill="none" />
          <circle cx={100} cy={97} r={2} fill={GOLD} />
        </g>
      )}
      {arm(-1)}
      {arm(1)}
      {c.mobility === 'gehstock' && (
        <g>
          <path d={`M${wr(1)[0] + 2} ${wr(1)[1] + 6} L${wr(1)[0] + 8} 380`} stroke="#6b4428" stroke-width={3.2} stroke-linecap="round" />
          <path d={`M${wr(1)[0] - 8} ${wr(1)[1] + 4} Q${wr(1)[0] - 2} ${wr(1)[1] - 4} ${wr(1)[0] + 3} ${wr(1)[1] + 6}`} stroke="#6b4428" stroke-width={3.2} fill="none" stroke-linecap="round" />
          <ellipse cx={wr(1)[0]} cy={wr(1)[1] + 7} rx={aw * 0.42} ry={aw * 0.62} fill={skin} />
        </g>
      )}
      {/* Kopf */}
      {!hijab && <ellipse cx={100 - earX} cy={48} rx={3.6} ry={6.8} fill={skinD} />}
      {!hijab && <ellipse cx={100 + earX} cy={48} rx={3.6} ry={6.8} fill={skinD} />}
      {c.hearingAid && !hijab && <path d={`M${100 + earX + 2} 41 Q${100 + earX + 6} 46 ${100 + earX + 2} 53`} stroke="#c9b79c" stroke-width={2.6} fill="none" stroke-linecap="round" />}
      <path d={facePath} fill={u('skin')} />
      <path d={facePath} fill={u('faceShade')} />
      {c.vitiligo && (
        <g fill={vit}>
          <path d="M106 32 Q114 28 118 34 Q120 42 114 44 Q108 40 106 32 Z" />
          <path d="M84 60 Q89 58 91 63 Q89 68 85 66 Q82 63 84 60 Z" />
        </g>
      )}
      {age === 'aelter' && (
        <g stroke={skinDD} stroke-width={0.6} fill="none" opacity={0.55} stroke-linecap="round">
          <path d="M90 29 Q100 27 110 29 M92 32 Q100 30.5 108 32" />
          <path d="M82 47 l-3 -1 M82 49.5 l-3 1 M118 47 l3 -1 M118 49.5 l3 1" />
          <path d="M93 55 Q90.5 60 92.5 64 M107 55 Q109.5 60 107.5 64" />
        </g>
      )}
      {c.blush && (
        <g>
          <ellipse cx={86} cy={56} rx={6} ry={3.5} fill="#e8707e" opacity={0.18} />
          <ellipse cx={114} cy={56} rx={6} ry={3.5} fill="#e8707e" opacity={0.18} />
        </g>
      )}
      {c.freckles && (
        <g fill={skinDD} opacity={0.55}>
          {[[86, 52], [89, 55], [84, 56], [114, 52], [111, 55], [116, 56], [96, 51], [104, 51], [92, 53], [108, 53]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={0.65} />
          ))}
        </g>
      )}
      {c.mole && <circle cx={112} cy={61} r={0.9} fill={shade(skin, -0.5)} />}
      {/* Nase */}
      <path d="M101.5 46 Q103 54 104 56.5 Q102 58.6 100 58.4" stroke={skinDD} stroke-width={0.9} fill="none" opacity={0.6} stroke-linecap="round" />
      <path d="M96.5 57.6 Q98 59 100 58.6 Q102 59 103.5 57.6" stroke={skinDD} stroke-width={0.8} fill="none" opacity={0.7} />
      <ellipse cx={99} cy={53} rx={1.1} ry={3} fill={skinL} opacity={0.5} />
      {beard()}
      {eye(91, -1)}
      {eye(109, 1)}
      {brow(91, -1)}
      {brow(109, 1)}
      {mouth()}
      {hairFront()}
      {hijabFront()}
      {headwear()}
      {c.earrings !== 'none' && !hijab && (
        <g>
          {c.earrings === 'ringe' ? (
            <g fill="none" stroke={GOLD} stroke-width={1.2}>
              <circle cx={100 - earX} cy={58} r={3.2} />
              <circle cx={100 + earX} cy={58} r={3.2} />
            </g>
          ) : (
            <g fill={GOLD}>
              <circle cx={100 - earX} cy={54} r={1.4} />
              <circle cx={100 + earX} cy={54} r={1.4} />
            </g>
          )}
        </g>
      )}
      {glasses()}
      {seated && (
        <g>
          {([-1, 1] as const).map((side) => (
            <g key={side}>
              <ellipse cx={100 + side * (hp + 22)} cy={268} rx={11} ry={60} fill="#22272f" />
              <ellipse cx={100 + side * (hp + 22)} cy={268} rx={6} ry={50} fill="none" stroke="#9aa6b5" stroke-width={2} />
              <path d={`M${100 + side * (hp + 22)} 218 L${100 + side * (hp + 22)} 318`} stroke="#9aa6b5" stroke-width={1} />
            </g>
          ))}
          <rect x={100 - hp - 12} y={196} width={2 * hp + 24} height={8} rx={4} fill="#3d4453" />
          <rect x={100 - hp} y={340} width={2 * hp} height={5} rx={2} fill="#3d4453" />
          <circle cx={100 - hp + 4} cy={350} r={6} fill="#22272f" />
          <circle cx={100 + hp - 4} cy={350} r={6} fill="#22272f" />
        </g>
      )}
    </g>
  );

  const vb = portrait ? '62 4 76 76' : '20 -6 160 396';
  return (
    <svg viewBox={vb} width={size} height={size} class={cls} role="img" aria-label="Spielfigur">
      <defs>
        <radialGradient id={`${id}skin`} cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stop-color={skinL} />
          <stop offset="0.65" stop-color={skin} />
          <stop offset="1" stop-color={skinD} />
        </radialGradient>
        <linearGradient id={`${id}faceShade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0" />
          <stop offset="0.7" stop-color="#000" stop-opacity="0" />
          <stop offset="1" stop-color="#000" stop-opacity="0.12" />
        </linearGradient>
        <linearGradient id={`${id}hair`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stop-color={hairL} />
          <stop offset="0.5" stop-color={hair} />
          <stop offset="1" stop-color={hairD} />
        </linearGradient>
        <radialGradient id={`${id}iris`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color={shade(c.eyeColor, 0.25)} />
          <stop offset="0.75" stop-color={c.eyeColor} />
          <stop offset="1" stop-color={shade(c.eyeColor, -0.5)} />
        </radialGradient>
        <linearGradient id={`${id}cloth`} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stop-color={shade(top === 'kleid' || top !== 'latzhose' ? tc : tc, 0.1)} />
          <stop offset="0.55" stop-color={tc} />
          <stop offset="1" stop-color={shade(tc, -0.18)} />
        </linearGradient>
        <linearGradient id={`${id}shadeR`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0.06" />
          <stop offset="0.6" stop-color="#000" stop-opacity="0" />
          <stop offset="1" stop-color="#000" stop-opacity="0.18" />
        </linearGradient>
      </defs>
      {!portrait && <ellipse cx={100} cy={386} rx={50} ry={7} fill="#000" opacity={0.16} />}
      {figure}
    </svg>
  );
}
