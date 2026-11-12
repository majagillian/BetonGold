// Kleine Klangeffekte per WebAudio (keine Dateien nötig) + Vibration
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}

const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* egal */
  }
};

export const sfx = {
  tap() {
    if (!enabled) return;
    tone(660, 0, 0.05, 'triangle', 0.05);
  },
  coin() {
    if (!enabled) return;
    tone(988, 0, 0.08, 'square', 0.06);
    tone(1319, 0.07, 0.25, 'square', 0.06);
    vibrate(15);
  },
  success() {
    if (!enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, 'triangle', 0.09));
    vibrate([20, 40, 20]);
  },
  levelup() {
    if (!enabled) return;
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.1));
    vibrate([30, 60, 30, 60, 60]);
  },
  fail() {
    if (!enabled) return;
    tone(220, 0, 0.18, 'sawtooth', 0.06);
    tone(165, 0.15, 0.3, 'sawtooth', 0.06);
    vibrate(80);
  },
  found() {
    if (!enabled) return;
    tone(880, 0, 0.1, 'sine', 0.12);
    tone(1175, 0.09, 0.2, 'sine', 0.12);
    vibrate(30);
  },
  tick() {
    if (!enabled) return;
    tone(1200, 0, 0.02, 'square', 0.03);
  },
  alarm() {
    if (!enabled) return;
    tone(740, 0, 0.12, 'square', 0.05);
    tone(554, 0.13, 0.12, 'square', 0.05);
    vibrate([40, 30, 40]);
  },
};
