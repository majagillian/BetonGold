export function shade(hex: string, amt: number) {
  // amt < 0 dunkler, > 0 heller
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt < 0) {
    r = Math.round(r * (1 + amt));
    g = Math.round(g * (1 + amt));
    b = Math.round(b * (1 + amt));
  } else {
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
  }
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function luminance(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => [(pa >> s) & 255, (pb >> s) & 255];
  const out = [16, 8, 0].map((s) => {
    const [x, y] = ch(s);
    return Math.round(x + (y - x) * t);
  });
  return `#${((1 << 24) | (out[0] << 16) | (out[1] << 8) | out[2]).toString(16).slice(1)}`;
}

let counter = 0;
export const nextId = (p: string) => `${p}${++counter}`;
