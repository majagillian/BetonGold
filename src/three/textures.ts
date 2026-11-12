// Prozedurale Texturen (Canvas) – kein Download nötig
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgb = (r: number, g: number, b: number) => `rgb(${Math.max(0, Math.min(255, r | 0))},${Math.max(0, Math.min(255, g | 0))},${Math.max(0, Math.min(255, b | 0))})`;
function vary(hex: string, amt: number, r: () => number) {
  const [a, b, c] = hexToRgb(hex);
  const d = (r() - 0.5) * 2 * amt;
  return rgb(a + d, b + d, c + d * 0.9);
}

function canvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!] as const;
}

function noise(ctx: CanvasRenderingContext2D, size: number, amt: number, seed = 1, alpha = 1) {
  const img = ctx.getImageData(0, 0, size, size);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const d = (r() - 0.5) * amt;
    img.data[i] += d;
    img.data[i + 1] += d;
    img.data[i + 2] += d;
    img.data[i + 3] = 255 * alpha;
  }
  ctx.putImageData(img, 0, 0);
}

function finish(key: string, c: HTMLCanvasElement, repeat = 1, color = true): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

function woodGrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, r: () => number, vertical = false) {
  ctx.fillStyle = vary(base, 18, r);
  ctx.fillRect(x, y, w, h);
  const lines = vertical ? w / 2 : h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < lines; i++) {
    ctx.strokeStyle = `rgba(60,30,10,${0.04 + r() * 0.08})`;
    ctx.lineWidth = 0.6 + r() * 1.4;
    ctx.beginPath();
    const off = r() * (vertical ? w : h);
    const amp = 1 + r() * 3;
    if (vertical) {
      for (let yy = y; yy <= y + h; yy += 8) ctx.lineTo(x + off + Math.sin(yy * 0.03 + i) * amp, yy);
    } else {
      for (let xx = x; xx <= x + w; xx += 8) ctx.lineTo(xx, y + off + Math.sin(xx * 0.03 + i) * amp);
    }
    ctx.stroke();
  }
  // Astlöcher
  if (r() < 0.35) {
    ctx.fillStyle = 'rgba(70,35,15,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + r() * w, y + r() * h, 4 + r() * 5, 2 + r() * 3, vertical ? Math.PI / 2 : 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export type FloorTex =
  | 'teppich_alt' | 'linoleum' | 'laminat' | 'vinyl_beton' | 'fliesen_hell' | 'fliesen_dunkel' | 'parkett_eiche' | 'fischgraet' | 'marmor' | 'dielen_alt';

const WOOD: Record<string, string> = { laminat: '#c9a57a', parkett_eiche: '#b88a5a', fischgraet: '#a8784a', dielen_alt: '#8a6a4a' };

export function floorTexture(kind: FloorTex): THREE.Texture {
  const key = `floor:${kind}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 512;
  const [c, ctx] = canvas(S);
  const r = rng(kind.length * 977);
  switch (kind) {
    case 'laminat':
    case 'parkett_eiche':
    case 'dielen_alt': {
      const rows = kind === 'parkett_eiche' ? 5 : kind === 'dielen_alt' ? 4 : 6;
      const h = S / rows;
      for (let i = 0; i < rows; i++) {
        let x = -r() * 300;
        while (x < S) {
          const w = kind === 'laminat' ? 260 : 330 + r() * 120;
          woodGrain(ctx, x, i * h, w, h, WOOD[kind], r);
          ctx.strokeStyle = 'rgba(40,20,5,0.45)';
          ctx.lineWidth = kind === 'dielen_alt' ? 3 : 1.5;
          ctx.strokeRect(x, i * h, w, h);
          x += w;
        }
      }
      if (kind === 'dielen_alt') {
        ctx.fillStyle = 'rgba(80,70,60,0.25)';
        for (let k = 0; k < 30; k++) ctx.fillRect(r() * S, r() * S, 8 + r() * 30, 2 + r() * 6);
      }
      break;
    }
    case 'fischgraet': {
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(0, 0, S, S);
      const bw = 32;
      const bl = 128;
      for (let row = -2; row < 10; row++) {
        for (let col = -2; col < 10; col++) {
          const x = col * bw * 2;
          const y = row * bl + col * bw;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          woodGrain(ctx, 0, 0, bl, bw, WOOD.fischgraet, r);
          ctx.strokeStyle = 'rgba(40,20,5,0.4)';
          ctx.strokeRect(0, 0, bl, bw);
          ctx.restore();
          ctx.save();
          ctx.translate(x + bw * 1.414, y);
          ctx.rotate((3 * Math.PI) / 4);
          woodGrain(ctx, 0, 0, bl, bw, WOOD.fischgraet, r);
          ctx.strokeStyle = 'rgba(40,20,5,0.4)';
          ctx.strokeRect(0, 0, bl, bw);
          ctx.restore();
        }
      }
      break;
    }
    case 'fliesen_hell':
    case 'fliesen_dunkel': {
      const base = kind === 'fliesen_hell' ? '#dcd8d0' : '#5a5856';
      const n = 4;
      const t = S / n;
      ctx.fillStyle = kind === 'fliesen_hell' ? '#b9b3a8' : '#3a3836';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          ctx.fillStyle = vary(base, 10, r);
          ctx.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
        }
      noise(ctx, S, 10, 7);
      break;
    }
    case 'marmor': {
      ctx.fillStyle = '#ece9e4';
      ctx.fillRect(0, 0, S, S);
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = `rgba(110,105,100,${0.08 + r() * 0.2})`;
        ctx.lineWidth = 0.5 + r() * 2.5;
        ctx.beginPath();
        let x = r() * S;
        let y = 0;
        ctx.moveTo(x, y);
        while (y < S) {
          x += (r() - 0.5) * 40;
          y += 10 + r() * 30;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(160,155,150,0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 256, 0);
        ctx.lineTo(i * 256, S);
        ctx.moveTo(0, i * 256);
        ctx.lineTo(S, i * 256);
        ctx.stroke();
      }
      break;
    }
    case 'vinyl_beton': {
      ctx.fillStyle = '#9d9b97';
      ctx.fillRect(0, 0, S, S);
      noise(ctx, S, 26, 3);
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = `rgba(${r() < 0.5 ? 255 : 60},${r() < 0.5 ? 255 : 60},${r() < 0.5 ? 255 : 60},0.04)`;
        ctx.beginPath();
        ctx.arc(r() * S, r() * S, 20 + r() * 60, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(60,60,60,0.25)';
      ctx.strokeRect(0, 0, S, S);
      break;
    }
    case 'linoleum': {
      ctx.fillStyle = '#b8a77e';
      ctx.fillRect(0, 0, S, S);
      noise(ctx, S, 18, 5);
      for (let k = 0; k < 200; k++) {
        ctx.fillStyle = `rgba(90,70,40,${r() * 0.15})`;
        ctx.fillRect(r() * S, r() * S, 2 + r() * 4, 2 + r() * 4);
      }
      break;
    }
    case 'teppich_alt':
    default: {
      ctx.fillStyle = '#7d6a56';
      ctx.fillRect(0, 0, S, S);
      noise(ctx, S, 40, 9);
      for (let k = 0; k < 12; k++) {
        ctx.fillStyle = `rgba(60,45,30,${0.08 + r() * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(r() * S, r() * S, 20 + r() * 60, 10 + r() * 40, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return finish(key, c);
}

export function plasterTexture(color: string, dirty = 0): THREE.Texture {
  const key = `plaster:${color}:${dirty.toFixed(1)}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 256;
  const [c, ctx] = canvas(S);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, 10, color.length * 31);
  if (dirty > 0) {
    const r = rng(77);
    for (let k = 0; k < 18 * dirty; k++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
      g.addColorStop(0, `rgba(70,60,45,${0.25 * dirty})`);
      g.addColorStop(1, 'rgba(70,60,45,0)');
      ctx.save();
      ctx.translate(r() * S, r() * S);
      ctx.scale(1, 1.6);
      ctx.fillStyle = g;
      ctx.fillRect(-40, -40, 80, 80);
      ctx.restore();
    }
  }
  return finish(key, c);
}

export function brickTexture(color = '#a4553f', dirty = 0): THREE.Texture {
  const key = `brick:${color}:${dirty}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 512;
  const [c, ctx] = canvas(S);
  const r = rng(13);
  ctx.fillStyle = '#c9c0b0';
  ctx.fillRect(0, 0, S, S);
  const bh = 32;
  const bw = 96;
  for (let row = 0; row < S / bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -off; x < S; x += bw) {
      ctx.fillStyle = vary(color, 28, r);
      ctx.fillRect(x + 3, row * bh + 3, bw - 6, bh - 6);
    }
  }
  noise(ctx, S, 18, 11);
  if (dirty) {
    ctx.fillStyle = `rgba(40,40,30,${0.25 * dirty})`;
    ctx.fillRect(0, S * 0.7, S, S * 0.3);
  }
  return finish(key, c);
}

export function roofTexture(color = '#9b4a32', kind: 'ziegel' | 'schiefer' | 'schindel' = 'ziegel'): THREE.Texture {
  const key = `roof:${color}:${kind}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 512;
  const [c, ctx] = canvas(S);
  const r = rng(21);
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(0, 0, S, S);
  const rows = kind === 'schiefer' ? 16 : 12;
  const h = S / rows;
  const w = kind === 'schiefer' ? 48 : 56;
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? w / 2 : 0;
    for (let x = -off; x < S; x += w) {
      const g = ctx.createLinearGradient(0, row * h, 0, row * h + h);
      const base = vary(color, 22, r);
      g.addColorStop(0, base);
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = base;
      if (kind === 'ziegel') {
        ctx.beginPath();
        ctx.moveTo(x + 2, row * h);
        ctx.lineTo(x + w - 2, row * h);
        ctx.lineTo(x + w - 2, row * h + h - 6);
        ctx.quadraticCurveTo(x + w / 2, row * h + h + 4, x + 2, row * h + h - 6);
        ctx.fill();
      } else ctx.fillRect(x + 2, row * h + 1, w - 4, h - 2);
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x + 2, row * h, w - 4, h);
      ctx.globalAlpha = 1;
    }
  }
  noise(ctx, S, 14, 4);
  return finish(key, c);
}

export function woodSidingTexture(color = '#7a4f32'): THREE.Texture {
  const key = `siding:${color}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 512;
  const [c, ctx] = canvas(S);
  const r = rng(5);
  const n = 8;
  for (let i = 0; i < n; i++) {
    woodGrain(ctx, (i * S) / n, 0, S / n, S, color, r, true);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect((i * S) / n, 0, 3, S);
  }
  return finish(key, c);
}

export function stoneTexture(color = '#a9a196'): THREE.Texture {
  const key = `stone:${color}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 512;
  const [c, ctx] = canvas(S);
  const r = rng(31);
  ctx.fillStyle = '#6f6a62';
  ctx.fillRect(0, 0, S, S);
  for (let row = 0; row < 10; row++) {
    let x = -r() * 40;
    while (x < S) {
      const w = 50 + r() * 70;
      ctx.fillStyle = vary(color, 30, r);
      ctx.beginPath();
      ctx.roundRect(x + 3, row * 52 + 3, w - 6, 46, 10);
      ctx.fill();
      x += w;
    }
  }
  noise(ctx, S, 24, 12);
  return finish(key, c);
}

export function grassTexture(color = '#5f8f3e'): THREE.Texture {
  const key = `grass:${color}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 512;
  const [c, ctx] = canvas(S);
  const r = rng(99);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  for (let k = 0; k < 9000; k++) {
    ctx.strokeStyle = vary(color, 40, r);
    ctx.lineWidth = 1;
    const x = r() * S;
    const y = r() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4);
    ctx.stroke();
  }
  return finish(key, c, 1);
}

export function pavingTexture(): THREE.Texture {
  const key = 'paving';
  if (cache.has(key)) return cache.get(key)!;
  const S = 256;
  const [c, ctx] = canvas(S);
  const r = rng(3);
  ctx.fillStyle = '#8d8780';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = vary('#b5aea4', 16, r);
      ctx.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
    }
  const t = finish(key, c);
  t.name = 'paving';
  return t;
}

export function tileWallTexture(color = '#f2f2f0', small = false): THREE.Texture {
  const key = `tilewall:${color}:${small}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 256;
  const [c, ctx] = canvas(S);
  const r = rng(8);
  ctx.fillStyle = '#c8c4bc';
  ctx.fillRect(0, 0, S, S);
  const tw = small ? 32 : 64;
  const th = small ? 32 : 128;
  for (let x = 0; x < S; x += tw)
    for (let y = 0; y < S; y += th) {
      ctx.fillStyle = vary(color, 6, r);
      ctx.fillRect(x + 1.5, y + 1.5, tw - 3, th - 3);
    }
  return finish(key, c);
}

/** Flecken/Risse für Mängel als transparente Textur */
export function decalTexture(kind: 'schimmel' | 'riss' | 'wasser' | 'kabel' | 'holzwurm' | 'asbest' | 'rost'): THREE.Texture {
  const key = `decal:${kind}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 256;
  const [c, ctx] = canvas(S);
  ctx.clearRect(0, 0, S, S);
  const r = rng(kind.length * 17);
  if (kind === 'schimmel' || kind === 'wasser' || kind === 'rost') {
    const col = kind === 'schimmel' ? '30,40,25' : kind === 'wasser' ? '120,95,55' : '140,70,30';
    for (let k = 0; k < (kind === 'schimmel' ? 260 : 60); k++) {
      const x = S / 2 + (r() - 0.5) * S * 0.8 * r();
      const y = S / 2 + (r() - 0.5) * S * 0.8 * r();
      const rad = kind === 'schimmel' ? 2 + r() * 9 : 10 + r() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${col},${kind === 'schimmel' ? 0.55 : 0.18})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    if (kind === 'wasser') {
      ctx.strokeStyle = 'rgba(110,80,40,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(S / 2, S / 2, S * 0.38, S * 0.3, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === 'riss') {
    ctx.strokeStyle = 'rgba(40,35,30,0.85)';
    for (let b = 0; b < 3; b++) {
      ctx.lineWidth = 3 - b;
      ctx.beginPath();
      let x = S * (0.3 + b * 0.15);
      let y = 10;
      ctx.moveTo(x, y);
      while (y < S - 10) {
        x += (r() - 0.5) * 30;
        y += 8 + r() * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (kind === 'kabel') {
    ctx.fillStyle = 'rgba(240,240,235,0.95)';
    ctx.fillRect(S * 0.3, S * 0.3, S * 0.4, S * 0.35);
    ctx.strokeStyle = 'rgba(30,30,30,0.9)';
    ctx.strokeRect(S * 0.3, S * 0.3, S * 0.4, S * 0.35);
    const cols = ['#c0392b', '#2c3e50', '#d4ac0d', '#7f8c8d'];
    cols.forEach((cc, i) => {
      ctx.strokeStyle = cc;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(S * 0.4 + i * 14, S * 0.65);
      ctx.bezierCurveTo(S * 0.4 + i * 14, S * 0.85, S * 0.2 + i * 30, S * 0.8, S * 0.25 + i * 25, S * 0.98);
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(S * 0.3, S * 0.3, S * 0.4, 8);
  } else if (kind === 'holzwurm') {
    ctx.fillStyle = 'rgba(20,10,5,0.85)';
    for (let k = 0; k < 160; k++) {
      ctx.beginPath();
      ctx.arc(S / 2 + (r() - 0.5) * S * 0.7, S / 2 + (r() - 0.5) * S * 0.7, 1 + r() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(200,180,140,0.5)';
    ctx.fillRect(S * 0.2, S * 0.85, S * 0.6, 10);
  } else if (kind === 'asbest') {
    ctx.fillStyle = 'rgba(170,170,165,0.95)';
    ctx.fillRect(S * 0.1, S * 0.1, S * 0.8, S * 0.8);
    ctx.strokeStyle = 'rgba(120,120,115,0.9)';
    ctx.lineWidth = 2;
    for (let y = S * 0.15; y < S * 0.9; y += 14) {
      ctx.beginPath();
      ctx.moveTo(S * 0.1, y);
      ctx.lineTo(S * 0.9, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80,80,75,0.6)';
    ctx.fillRect(S * 0.5, S * 0.4, 30, 50);
  }
  const t = finish(key, c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function fabricTexture(color: string): THREE.Texture {
  const key = `fabric:${color}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 128;
  const [c, ctx] = canvas(S);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < S; i += 2) {
    ctx.fillStyle = i % 4 ? '#000' : '#fff';
    ctx.fillRect(i, 0, 1, S);
    ctx.fillRect(0, i, S, 1);
  }
  ctx.globalAlpha = 1;
  noise(ctx, S, 8, 2);
  return finish(key, c, 2);
}
