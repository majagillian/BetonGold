// Gemeinsamer WebGL-Renderer, Szenen-Grundlagen und Snapshot-Cache
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let renderer: THREE.WebGLRenderer | null = null;
let envTex: THREE.Texture | null = null;
let glOk: boolean | null = null;

export function webglAvailable() {
  if (glOk !== null) return glOk;
  try {
    const c = document.createElement('canvas');
    glOk = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    glOk = false;
  }
  return glOk;
}

export function configureRenderer(r: THREE.WebGLRenderer) {
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.92;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
}

export function sharedRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    renderer.setPixelRatio(1);
    configureRenderer(renderer);
  }
  return renderer;
}

export function environment(r: THREE.WebGLRenderer) {
  if (!envTex) {
    const pm = new THREE.PMREMGenerator(r);
    envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  }
  return envTex;
}

export function skyTexture(top: string, bottom: string, horizon?: string) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  if (horizon) g.addColorStop(0.7, horizon);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function disposeScene(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
}

// ---------- Snapshot-Cache ----------
const snapCache = new Map<string, string>();
const waiting = new Map<string, ((url: string) => void)[]>();
const queue: { key: string; w: number; h: number; build: () => { scene: THREE.Scene; camera: THREE.Camera }; keep?: boolean }[] = [];
let busy = false;

export function cachedSnapshot(key: string) {
  return snapCache.get(key);
}

export function requestSnapshot(key: string, w: number, h: number, build: () => { scene: THREE.Scene; camera: THREE.Camera }, cb: (url: string) => void, keep = false) {
  const hit = snapCache.get(key);
  if (hit) {
    cb(hit);
    return;
  }
  const list = waiting.get(key);
  if (list) {
    list.push(cb);
    return;
  }
  waiting.set(key, [cb]);
  queue.push({ key, w, h, build, keep });
  pump();
}

function pump() {
  if (busy || !queue.length) return;
  busy = true;
  const job = queue.shift()!;
  const run = () => {
    let url = '';
    try {
      const r = sharedRenderer();
      r.setSize(job.w, job.h, false);
      const { scene, camera } = job.build();
      scene.environment = environment(r);
      r.render(scene, camera);
      url = r.domElement.toDataURL('image/jpeg', 0.86);
      if (!job.keep) disposeScene(scene);
    } catch (e) {
      console.warn('Snapshot fehlgeschlagen', e);
    }
    snapCache.set(job.key, url);
    (waiting.get(job.key) ?? []).forEach((cb) => cb(url));
    waiting.delete(job.key);
    busy = false;
    setTimeout(pump, 0);
  };
  if ('requestIdleCallback' in window) (window as unknown as { requestIdleCallback: (f: () => void, o?: object) => void }).requestIdleCallback(run, { timeout: 120 });
  else setTimeout(run, 16);
}

// ---------- Material-Helfer ----------
export function texMat(tex: THREE.Texture, rx: number, ry: number, opts: THREE.MeshStandardMaterialParameters = {}) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, ...opts });
}

export const std = (color: string | number, opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts });

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function cyl(rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function textTexture(text: string, bg: string, fg: string, w = 256, h = 96) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.round(h * 0.32)}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * h * 0.36));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
