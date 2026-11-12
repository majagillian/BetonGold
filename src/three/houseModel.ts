// Realistische 3D-Außenansichten der Immobilien
import * as THREE from 'three';
import type { HouseStyle, RegionId } from '../game/types';
import { box, cyl, skyTexture, std, texMat, textTexture } from './core';
import { brickTexture, grassTexture, pavingTexture, plasterTexture, roofTexture, stoneTexture, woodSidingTexture } from './textures';

export interface HouseRenderOpts {
  style: HouseStyle;
  region: RegionId;
  quality: number; // 0..1
  lit: boolean;
  state: 'idle' | 'renovating' | 'building' | 'forSale' | 'plot';
  wallColor?: string;
  extras?: string[]; // 'balkon', 'dach'
  seed?: number;
}

type Wall = 'plaster' | 'brick' | 'wood' | 'stone' | 'glass';
type Roof = 'gable' | 'flat' | 'mansard' | 'chalet' | 'hip';

interface Spec {
  w: number;
  d: number;
  floors: number;
  fh?: number;
  wall: Wall;
  wallColor: string;
  roof: Roof;
  roofColor: string;
  roofKind?: 'ziegel' | 'schiefer' | 'schindel';
  timber?: boolean;
  balconies?: boolean;
  cornice?: boolean;
  modern?: boolean;
  bigWindows?: boolean;
}

const SPECS: Partial<Record<HouseStyle, Spec>> = {
  fachwerk: { w: 9, d: 8, floors: 2, wall: 'plaster', wallColor: '#efe4cc', roof: 'gable', roofColor: '#9b4a32', timber: true },
  bauernhof: { w: 15, d: 9, floors: 1, fh: 3.6, wall: 'brick', wallColor: '#9a4636', roof: 'gable', roofColor: '#6d5446' },
  reihenhaus: { w: 6, d: 9, floors: 2, wall: 'plaster', wallColor: '#e6d6bb', roof: 'gable', roofColor: '#7a3e2d' },
  altbau: { w: 11, d: 10, floors: 4, fh: 3.2, wall: 'plaster', wallColor: '#e8c9a6', roof: 'mansard', roofColor: '#5b5f68', roofKind: 'schiefer', cornice: true },
  speicher: { w: 10, d: 13, floors: 5, wall: 'brick', wallColor: '#a5503a', roof: 'flat', roofColor: '#4a4a4f' },
  mfh: { w: 14, d: 11, floors: 4, wall: 'plaster', wallColor: '#eedcb4', roof: 'flat', roofColor: '#555b66', balconies: true },
  chalet: { w: 11, d: 9, floors: 2, wall: 'wood', wallColor: '#6e4a30', roof: 'chalet', roofColor: '#4a3a30', roofKind: 'schindel', balconies: true },
  villa: { w: 15, d: 11, floors: 2, fh: 3.2, wall: 'plaster', wallColor: '#f6f4ee', roof: 'flat', roofColor: '#d8d4ca', modern: true, bigWindows: true },
  gruenderzeit: { w: 14, d: 12, floors: 5, fh: 3.3, wall: 'plaster', wallColor: '#e3bf72', roof: 'mansard', roofColor: '#4f5763', roofKind: 'schiefer', cornice: true, balconies: true },
  neubau_efh: { w: 10, d: 9, floors: 2, wall: 'plaster', wallColor: '#f4f3ef', roof: 'gable', roofColor: '#3c4048', roofKind: 'schiefer', modern: true, bigWindows: true },
  neubau_mfh: { w: 18, d: 12, floors: 4, wall: 'plaster', wallColor: '#ece7dd', roof: 'flat', roofColor: '#555b66', balconies: true, modern: true, bigWindows: true },
  penthouse: { w: 14, d: 14, floors: 10, fh: 3.1, wall: 'glass', wallColor: '#8fa9c0', roof: 'flat', roofColor: '#3a3f48', modern: true },
  hochhaus: { w: 16, d: 16, floors: 14, fh: 3.1, wall: 'glass', wallColor: '#7f9cb8', roof: 'flat', roofColor: '#3a3f48', modern: true },
};

const REGION_ENV: Record<RegionId, { sky: [string, string, string]; grass: string; ground: 'grass' | 'snow' | 'sand' | 'city' }> = {
  kleeweiler: { sky: ['#5f9ad8', '#e9e2d0', '#b9d3ec'], grass: '#4d7a2e', ground: 'grass' },
  muehlental: { sky: ['#6a9fd6', '#e8e0d0', '#bdd4ea'], grass: '#4f7d35', ground: 'grass' },
  lumenhafen: { sky: ['#6f8fb8', '#f2d3b0', '#c8c9d8'], grass: '#557a38', ground: 'city' },
  pilzhain: { sky: ['#8a9fcf', '#e2e8d6', '#c2d4d6'], grass: '#3e6b2e', ground: 'grass' },
  wolkenspitz: { sky: ['#6aa2dc', '#f4f8fb', '#d6e6f4'], grass: '#e9eef2', ground: 'snow' },
  sonnenkueste: { sky: ['#5fb0e8', '#fbf0d4', '#bfe3f4'], grass: '#7a9a4c', ground: 'sand' },
  kronstadt: { sky: ['#4e6a94', '#efc69a', '#a9b6cc'], grass: '#4c6e36', ground: 'city' },
  neuwerk: { sky: ['#8aa6c8', '#f3dcc0', '#d4d8e0'], grass: '#677a40', ground: 'grass' },
};

const rnd = (seed: number) => {
  let s = seed || 7;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export function buildHouseScene(o: HouseRenderOpts) {
  const scene = new THREE.Scene();
  const env = REGION_ENV[o.region];
  const dusk = o.lit;
  scene.background = dusk ? skyTexture('#2b3a5e', '#e9a56b', '#8c7fa0') : skyTexture(env.sky[0], env.sky[1], env.sky[2]);

  const hemi = new THREE.HemisphereLight(dusk ? 0x9fb0d8 : 0xcfe0ff, dusk ? 0x3a2e26 : 0x4a3e30, dusk ? 0.45 : 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(dusk ? 0xffb07a : 0xfff0d8, dusk ? 1.2 : 2.6);
  sun.position.set(18, 26, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -30;
  sc.right = sc.top = 30;
  sc.far = 90;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  scene.environmentIntensity = 0.3;
  const R = rnd((o.seed ?? 1) * 9301 + 49297);
  const q = o.quality;
  const marode = q < 0.3;
  const top = q >= 0.7;

  // Boden
  const groundTex = env.ground === 'snow' ? plasterTexture('#eef3f6') : env.ground === 'sand' ? plasterTexture('#e9d9ae') : env.ground === 'city' && (o.style === 'hochhaus' || o.style === 'penthouse' || o.style === 'speicher') ? pavingTexture() : grassTexture(marode ? '#7d8a4a' : env.grass);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 48), texMat(groundTex, 40, 40, { roughness: 1, color: groundTex.name === 'paving' || env.ground === 'snow' || env.ground === 'sand' ? '#ffffff' : '#b9c9a0' }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const house = new THREE.Group();
  scene.add(house);
  let bounds = { w: 10, h: 8, d: 9 };

  const spec = SPECS[o.style];
  if (o.style === 'grundstueck' || o.state === 'plot') {
    bounds = plot(house, R);
  } else if (o.state === 'building') {
    bounds = construction(house, o, spec);
  } else if (spec) {
    bounds = building(house, spec, o, R, 0, 0);
    if (o.style === 'reihenhaus') {
      building(house, { ...spec, wallColor: '#d9c4a8' }, { ...o, lit: false }, R, -spec.w - 0.05, 0, true);
      building(house, { ...spec, wallColor: '#e9dccd' }, { ...o, lit: false }, R, spec.w + 0.05, 0, true);
      bounds = { w: spec.w * 2.2, h: bounds.h, d: spec.d };
    }
    if (o.style === 'bauernhof') {
      const hay = cyl(0.8, 0.8, 1.2, std('#d6b45a', { roughness: 1 }), spec.w / 2 + 3, 0.8, 3);
      hay.rotation.z = Math.PI / 2;
      house.add(hay);
    }
    if (o.style === 'penthouse') {
      const h = spec.floors * (spec.fh ?? 3);
      house.add(box(spec.w * 0.7, 3, spec.d * 0.7, new THREE.MeshPhysicalMaterial({ color: o.lit ? '#ffe2a8' : '#a9c4dc', roughness: 0.05, metalness: 0.2, emissive: o.lit ? '#ffb85c' : '#000000', emissiveIntensity: o.lit ? 0.6 : 0 }), 0, h + 1.5, 0));
      house.add(box(spec.w * 0.74, 0.25, spec.d * 0.74, std('#2e3138'), 0, h + 3.1, 0));
      bounds.h += 3;
    }
    if (o.style === 'villa') {
      const pool = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 3.4), new THREE.MeshPhysicalMaterial({ color: '#3fc1d6', roughness: 0.05, transmission: 0, metalness: 0.1 }));
      pool.position.set(-2, 0.06, spec.d / 2 + 3.2);
      house.add(pool);
      house.add(box(8.6, 0.12, 4, std('#e8e2d6'), -2, 0.02, spec.d / 2 + 3.2));
      palm(house, spec.w / 2 + 2.5, spec.d / 2 + 1.5);
      palm(house, -spec.w / 2 - 2, spec.d / 2 - 1);
    }
  } else {
    bounds = special(house, o, R);
  }

  // Garten
  if (o.style !== 'hochhaus' && o.style !== 'penthouse' && o.state !== 'building') {
    const path = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 6), texMat(pavingTexture(), 1, 4, { roughness: 0.95 }));
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, bounds.d / 2 + 3);
    path.receiveShadow = true;
    if (o.style !== 'grundstueck') house.add(path);
    const trees = env.ground === 'snow' ? 'fir' : env.ground === 'sand' ? 'none' : 'leaf';
    if (trees !== 'none') {
      tree(house, -bounds.w / 2 - 3.5, -1, trees, marode, R);
      tree(house, bounds.w / 2 + 4, -3, trees, marode, R);
      if (R() > 0.4) tree(house, -bounds.w / 2 - 6, -6, trees, marode, R);
    }
    if (o.style !== 'grundstueck' && env.ground !== 'snow') {
      hedge(house, -bounds.w / 2 - 1, bounds.d / 2 + 2, 4, marode, top);
      hedge(house, bounds.w / 2 + 1, bounds.d / 2 + 2, 4, marode, top);
    }
    if (marode) for (let k = 0; k < 14; k++) weed(house, (R() - 0.5) * bounds.w * 1.6, bounds.d / 2 + R() * 4);
  }
  if (o.state === 'renovating') scaffold(house, bounds);
  if (o.state === 'forSale') saleSign(house, bounds);

  // Umgebung (Nachbarn, Straße)
  const street = new THREE.Mesh(new THREE.PlaneGeometry(120, 6), std(env.ground === 'snow' ? '#c9d0d6' : '#5d5f63', { roughness: 0.95 }));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.015, bounds.d / 2 + 8);
  street.receiveShadow = true;
  scene.add(street);

  // Kamera
  const aspect = 4 / 3;
  const cam = new THREE.PerspectiveCamera(34, aspect, 0.5, 300);
  const size = Math.max(bounds.w * 0.95, bounds.h * 1.35, bounds.d * 0.8);
  const dist = size / (2 * Math.tan((34 * Math.PI) / 360)) * 1.25;
  const tgt = new THREE.Vector3(0, bounds.h * 0.42, 0);
  cam.position.set(tgt.x + dist * 0.62, tgt.y + dist * 0.32, tgt.z + dist * 0.78);
  cam.lookAt(tgt);
  scene.fog = new THREE.Fog(dusk ? 0x8c7fa0 : new THREE.Color(env.sky[2]).getHex(), dist * 1.4, dist * 4);
  const sc2 = sun.shadow.camera as THREE.OrthographicCamera;
  const ext = Math.max(30, bounds.w, bounds.h);
  sc2.left = sc2.bottom = -ext;
  sc2.right = sc2.top = ext;
  sc2.far = ext * 4;
  sun.position.set(ext * 0.6, ext * 0.9, ext * 0.45);
  return { scene, camera: cam };
}

// ---------------- Gebäude ----------------
function wallMaterial(spec: Spec, o: HouseRenderOpts, w: number, h: number) {
  const dirty = o.quality < 0.3 ? 1 : o.quality < 0.6 ? 0.4 : 0;
  const color = o.wallColor ?? spec.wallColor;
  switch (spec.wall) {
    case 'brick':
      return texMat(brickTexture(color, dirty), w / 4, h / 4, { roughness: 0.92 });
    case 'wood':
      return texMat(woodSidingTexture(color), w / 3, h / 3, { roughness: 0.8 });
    case 'stone':
      return texMat(stoneTexture(color), w / 4, h / 4, { roughness: 0.95 });
    case 'glass':
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, metalness: 0.35, clearcoat: 1 });
    default:
      return texMat(plasterTexture(color, dirty), w / 3, h / 3, { roughness: 0.9 });
  }
}

function building(g: THREE.Group, spec: Spec, o: HouseRenderOpts, R: () => number, ox: number, oz: number, ghost = false) {
  const fh = spec.fh ?? 2.9;
  const H = spec.floors * fh;
  const { w, d } = spec;
  const marode = o.quality < 0.3;
  const top = o.quality >= 0.7;
  const grp = new THREE.Group();
  grp.position.set(ox, 0, oz);
  g.add(grp);

  // Sockel + Wände
  grp.add(box(w + 0.2, 0.6, d + 0.2, texMat(stoneTexture('#9a948a'), w / 3, 0.3), 0, 0.3, 0));
  grp.add(box(w, H, d, wallMaterial(spec, o, w, H), 0, 0.6 + H / 2, 0));
  const y0 = 0.6;

  // Fenster
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: o.lit ? '#ffd28a' : '#3d5268',
    roughness: 0.04,
    metalness: 0.4,
    clearcoat: 1,
    emissive: o.lit ? '#ffac4a' : '#000000',
    emissiveIntensity: o.lit ? 0.9 : 0,
  });
  const frameMat = std(spec.modern ? '#2f3237' : marode ? '#8d857a' : '#f4f2ec', { roughness: 0.5 });
  const plankMat = std('#6b5238', { roughness: 0.95 });
  const sillMat = std('#cfc8bc');
  const winW = spec.bigWindows ? 2.2 : 1.1;
  const winH = spec.bigWindows ? 2.2 : 1.45;
  const colsFront = Math.max(2, Math.floor(w / (spec.bigWindows ? 3.6 : 2.4)));
  const colsSide = Math.max(1, Math.floor(d / (spec.bigWindows ? 4 : 2.6)));
  const doorCol = Math.floor(colsFront / 2);
  const addWin = (x: number, y: number, z: number, rotY: number, k: number, isDoor = false) => {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;
    if (isDoor) {
      wg.add(box(1.2, 2.3, 0.12, std(spec.modern ? '#2c2f35' : '#5a3a26', { roughness: 0.6 }), 0, 0, 0.02));
      wg.add(box(1.4, 0.12, 0.2, frameMat, 0, 1.2, 0.05));
      wg.add(box(0.06, 0.06, 0.08, std('#c9a24b', { metalness: 0.9, roughness: 0.3 }), 0.4, 0, 0.12));
      if (o.lit) {
        const l = new THREE.PointLight('#ffb35c', 3, 6);
        l.position.set(0, 1.4, 0.8);
        wg.add(l);
      }
    } else {
      wg.add(box(winW + 0.16, winH + 0.16, 0.1, frameMat, 0, 0, 0));
      wg.add(box(winW, winH, 0.06, glassMat, 0, 0, 0.04, false));
      wg.add(box(0.06, winH, 0.09, frameMat, 0, 0, 0.06, false));
      if (!spec.bigWindows) wg.add(box(winW, 0.06, 0.09, frameMat, 0, winH * 0.15, 0.06, false));
      wg.add(box(winW + 0.3, 0.08, 0.22, sillMat, 0, -winH / 2 - 0.1, 0.1));
      if (marode && !ghost && (k * 7 + Math.round(x * 3)) % 3 === 0) {
        const p1 = box(winW + 0.3, 0.18, 0.05, plankMat, 0, 0.25, 0.14);
        p1.rotation.z = 0.35;
        const p2 = box(winW + 0.3, 0.18, 0.05, plankMat, 0, -0.25, 0.14);
        p2.rotation.z = -0.3;
        wg.add(p1, p2);
      }
      if (top && !ghost && y < y0 + fh * 2 && !spec.modern) {
        wg.add(box(winW + 0.1, 0.22, 0.3, std('#6a4a32'), 0, -winH / 2 - 0.25, 0.2));
        for (let f = 0; f < 4; f++) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), std(['#d6455a', '#f2c94c', '#e86f9a', '#ffffff'][f % 4]));
          fl.position.set(-winW / 2 + 0.15 + (f * winW) / 3.4, -winH / 2 - 0.08, 0.25);
          wg.add(fl);
        }
      }
      if (!spec.modern && !spec.bigWindows && spec.wall !== 'glass' && (spec.timber || o.region === 'wolkenspitz' || o.region === 'kleeweiler')) {
        // Fensterläden
        const sh = std(o.region === 'wolkenspitz' ? '#3f6b4a' : '#5a6f4a', { roughness: 0.8 });
        wg.add(box(0.5, winH + 0.1, 0.05, sh, -winW / 2 - 0.35, 0, 0.06));
        wg.add(box(0.5, winH + 0.1, 0.05, sh, winW / 2 + 0.35, 0, 0.06));
      }
    }
    grp.add(wg);
  };
  if (spec.wall !== 'glass') {
    let k = 0;
    for (let f = 0; f < spec.floors; f++) {
      const y = y0 + f * fh + fh * 0.55;
      for (let i = 0; i < colsFront; i++) {
        const x = -w / 2 + (w / colsFront) * (i + 0.5);
        const isDoor = f === 0 && i === doorCol;
        addWin(x, isDoor ? y0 + 1.15 : y, d / 2 + 0.01, 0, k++, isDoor);
      }
      for (let i = 0; i < colsSide; i++) {
        const z = -d / 2 + (d / colsSide) * (i + 0.5);
        addWin(w / 2 + 0.01, y, z, Math.PI / 2, k++);
      }
    }
  } else {
    // Glasfassade: Geschossbänder und Lichter
    for (let f = 1; f <= spec.floors; f++) {
      grp.add(box(w + 0.1, 0.25, d + 0.1, std('#d9dde2', { roughness: 0.4 }), 0, y0 + f * fh, 0));
      if (o.lit)
        for (let i = 0; i < 5; i++)
          if (R() > 0.45) grp.add(box(w / 6, fh * 0.6, 0.05, std('#ffd28a', { emissive: '#ffb050', emissiveIntensity: 0.8 }), -w / 2 + (w / 5) * (i + 0.5), y0 + (f - 0.5) * fh, d / 2 + 0.06, false));
    }
    grp.add(box(3, 2.6, 0.2, new THREE.MeshPhysicalMaterial({ color: '#2a2e33', roughness: 0.1, metalness: 0.6 }), 0, y0 + 1.3, d / 2 + 0.1));
  }

  // Fachwerk
  if (spec.timber) {
    const tm = std(marode ? '#4a3a2c' : '#3b2618', { roughness: 0.9 });
    for (let f = 0; f <= spec.floors; f++) grp.add(box(w + 0.04, 0.22, 0.08, tm, 0, y0 + f * fh, d / 2 + 0.03));
    for (let i = 0; i <= 4; i++) {
      const x = -w / 2 + (w / 4) * i;
      grp.add(box(0.22, H, 0.08, tm, x, y0 + H / 2, d / 2 + 0.03));
    }
    for (let f = 0; f < spec.floors; f++)
      for (let i = 0; i < 4; i += 3) {
        const x = -w / 2 + (w / 4) * (i + 0.5);
        const br = box(0.16, fh * 1.15, 0.07, tm, x, y0 + f * fh + fh / 2, d / 2 + 0.035);
        br.rotation.z = i ? 0.55 : -0.55;
        grp.add(br);
      }
  }
  if (spec.cornice) {
    const cm = std('#efe8da', { roughness: 0.8 });
    for (let f = 1; f <= spec.floors; f++) grp.add(box(w + 0.3, 0.18, d + 0.3, cm, 0, y0 + f * fh - 0.05, 0));
  }

  // Balkone
  if (spec.balconies && !ghost) {
    const railMat = spec.modern ? new THREE.MeshPhysicalMaterial({ color: '#cfe2ee', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.5 }) : std(o.region === 'wolkenspitz' ? '#5c3b24' : '#2d2d30', { roughness: 0.6 });
    for (let f = 1; f < spec.floors; f++) {
      const by = y0 + f * fh;
      grp.add(box(w * 0.45, 0.18, 1.3, std('#d4d0c8'), 0, by, d / 2 + 0.65));
      grp.add(box(w * 0.45, 0.95, 0.06, railMat, 0, by + 0.55, d / 2 + 1.3));
      if (top && f === 1) {
        const pl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), std('#4f8a3c'));
        pl.position.set(w * 0.18, by + 0.4, d / 2 + 0.9);
        grp.add(pl);
      }
    }
  }
  if (o.extras?.includes('balkon') && !spec.balconies && !ghost) {
    grp.add(box(3.2, 0.2, 1.4, std('#d4d0c8'), w / 4, y0 + fh, d / 2 + 0.7));
    grp.add(box(3.2, 0.95, 0.06, std('#2d2d30'), w / 4, y0 + fh + 0.55, d / 2 + 1.4));
  }

  // Dach
  const rt = spec.roofKind ?? 'ziegel';
  const roofMat = texMat(roofTexture(marode ? '#6f5a50' : spec.roofColor, rt), w / 3, d / 3, { roughness: 0.85, side: THREE.DoubleSide });
  const topY = y0 + H;
  let roofH = 0.4;
  if (spec.roof === 'gable' || spec.roof === 'chalet') {
    const over = spec.roof === 'chalet' ? 1.4 : 0.5;
    const pitch = spec.roof === 'chalet' ? 0.42 : spec.modern ? 0.62 : 0.85;
    const half = w / 2 + over;
    roofH = (w / 2) * pitch;
    const slope = Math.hypot(half, roofH + over * pitch);
    for (const s of [-1, 1]) {
      const plane = new THREE.Mesh(new THREE.BoxGeometry(slope, 0.18, d + over * 2), roofMat);
      plane.position.set((s * half) / 2, topY + roofH / 2 - (over * pitch) / 2, 0);
      plane.rotation.z = -s * Math.atan2(roofH + over * pitch, half);
      plane.castShadow = true;
      plane.receiveShadow = true;
      grp.add(plane);
    }
    // Giebel
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, roofH);
    shape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    const gable = new THREE.Mesh(gableGeo, wallMaterial(spec, o, w, roofH));
    gable.position.set(0, topY, -d / 2);
    gable.castShadow = true;
    grp.add(gable);
    if (!spec.modern) {
      grp.add(box(0.7, 2.4, 0.7, texMat(brickTexture('#7a3e2d'), 0.3, 0.6), w / 4, topY + roofH * 0.7, -d / 6));
    }
    if ((o.region === 'wolkenspitz' || spec.roof === 'chalet') && o.region === 'wolkenspitz') {
      for (const s of [-1, 1]) {
        const snow = new THREE.Mesh(new THREE.BoxGeometry(slope * 0.98, 0.25, d + over * 2), std('#fbfdff', { roughness: 0.9 }));
        snow.position.set((s * half) / 2, topY + roofH / 2 - (over * pitch) / 2 + 0.2, 0);
        snow.rotation.z = -s * Math.atan2(roofH + over * pitch, half);
        grp.add(snow);
      }
    }
    if (marode) grp.add(box(1.6, 0.2, 1.2, std('#1d1a18'), -w / 5, topY + roofH * 0.55, d / 4));
    if (o.extras?.includes('dach')) {
      // Gauben
      for (const zz of [-d / 4, d / 4]) {
        grp.add(box(1.6, 1.4, 1.6, wallMaterial(spec, o, 1.6, 1.4), w / 4.5, topY + roofH * 0.45, zz));
        grp.add(box(1.0, 0.9, 0.06, glassMat, w / 4.5 + 0.81, topY + roofH * 0.45, zz, false));
      }
    }
  } else if (spec.roof === 'mansard') {
    roofH = 2.6;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.48, Math.max(w, d) * 0.72, roofH, 4, 1), roofMat);
    m.rotation.y = Math.PI / 4;
    m.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    m.position.set(0, topY + roofH / 2, 0);
    m.castShadow = true;
    grp.add(m);
    for (let i = 0; i < 3; i++) {
      const x = -w / 3 + (i * w) / 3;
      grp.add(box(1.2, 1.3, 1, std('#e9e3d6'), x, topY + 1.1, d / 2 - 0.3));
      grp.add(box(0.8, 0.9, 0.05, glassMat, x, topY + 1.1, d / 2 + 0.22, false));
    }
  } else {
    grp.add(box(w + 0.3, 0.45, d + 0.3, std(spec.roofColor, { roughness: 0.8 }), 0, topY + 0.22, 0));
    if (spec.modern && !marode) {
      const green = box(w - 1, 0.25, d - 1, texMat(grassTexture('#5b8a3c'), 2, 2), 0, topY + 0.5, 0);
      grp.add(green);
    }
    if (o.style === 'speicher') {
      grp.add(box(1.2, 2, 1.2, std('#4a4a4f'), 0, topY + 1.2, d / 2 - 0.6));
      grp.add(box(0.2, 0.2, 2.5, std('#2b2b2b', { metalness: 0.7 }), 0, topY + 2.2, d / 2 + 0.4));
    }
  }
  return { w: w + (ghost ? 0 : 0), h: topY + roofH, d };
}

function construction(g: THREE.Group, o: HouseRenderOpts, spec?: Spec) {
  const w = spec?.w ?? 12;
  const d = spec?.d ?? 10;
  const floors = Math.max(1, Math.ceil((spec?.floors ?? 3) * 0.6));
  const fh = 2.9;
  const conc = std('#a7a6a2', { roughness: 0.95 });
  g.add(box(w + 1, 0.5, d + 1, conc, 0, 0.25, 0));
  for (let f = 0; f < floors; f++) {
    g.add(box(w, 0.3, d, conc, 0, 0.5 + (f + 1) * fh, 0));
    for (let i = 0; i <= 3; i++)
      for (let j = 0; j <= 2; j++) g.add(box(0.35, fh, 0.35, conc, -w / 2 + (w / 3) * i, 0.5 + f * fh + fh / 2, -d / 2 + (d / 2) * j));
  }
  g.add(box(w * 0.5, fh * floors, 0.3, texMat(brickTexture('#b8714f'), 2, 2), -w / 4, 0.5 + (fh * floors) / 2, -d / 2));
  const yel = std('#e8b62c', { roughness: 0.5, metalness: 0.3 });
  const craneH = fh * floors + 12;
  g.add(box(0.9, craneH, 0.9, yel, w / 2 + 4, craneH / 2, -d / 3));
  g.add(box(22, 0.7, 0.7, yel, w / 2 - 3, craneH, -d / 3));
  g.add(box(3, 1.4, 1.4, std('#404040'), w / 2 + 12, craneH - 0.6, -d / 3));
  const rope = cyl(0.03, 0.03, 8, std('#222'), -2, craneH - 4, -d / 3);
  g.add(rope);
  g.add(box(2, 0.6, 0.8, texMat(brickTexture('#b8714f'), 1, 0.3), -2, craneH - 8.3, -d / 3));
  scaffold(g, { w, h: fh * floors + 0.5, d });
  void o;
  return { w: w + 8, h: craneH * 0.85, d };
}

function plot(g: THREE.Group, R: () => number) {
  const fence = std('#b48a5a', { roughness: 0.9 });
  const W = 18;
  const D = 14;
  for (let i = 0; i <= 18; i++) {
    g.add(box(0.12, 1.1, 0.12, fence, -W / 2 + i, 0.55, D / 2));
    g.add(box(0.12, 1.1, 0.12, fence, -W / 2 + i, 0.55, -D / 2));
  }
  g.add(box(W, 0.1, 0.06, fence, 0, 0.9, D / 2));
  g.add(box(W, 0.1, 0.06, fence, 0, 0.9, -D / 2));
  const mound = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#7a5a3c', { roughness: 1 }));
  mound.scale.set(1.3, 0.35, 1);
  mound.position.set(4, 0, -2);
  mound.castShadow = true;
  g.add(mound);
  const sign = box(3.2, 1.6, 0.1, new THREE.MeshStandardMaterial({ map: textTexture('BAULAND', '#f4efe4', '#3a3a3a') }), -4, 2.2, D / 2 + 0.2);
  g.add(sign);
  g.add(box(0.15, 2, 0.15, fence, -4, 1, D / 2 + 0.1));
  for (let k = 0; k < 10; k++) weed(g, (R() - 0.5) * W, (R() - 0.5) * D);
  return { w: W, h: 4, d: D };
}

function special(g: THREE.Group, o: HouseRenderOpts, R: () => number) {
  const marode = o.quality < 0.3;
  const glassMat = new THREE.MeshPhysicalMaterial({ color: o.lit ? '#ffd28a' : '#3d5268', roughness: 0.05, metalness: 0.3, emissive: o.lit ? '#ffac4a' : '#000', emissiveIntensity: o.lit ? 0.9 : 0 });
  switch (o.style) {
    case 'pilz': {
      g.add(cyl(3.2, 3.6, 5.5, texMat(plasterTexture(marode ? '#d8ccb4' : '#f3e9d4', marode ? 1 : 0), 3, 2), 0, 2.75, 0, 32));
      const cap = new THREE.Mesh(new THREE.SphereGeometry(6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), std(marode ? '#8e3b33' : '#c4322a', { roughness: 0.45 }));
      cap.scale.set(1, 0.62, 1);
      cap.position.y = 5.2;
      cap.castShadow = true;
      g.add(cap);
      for (let k = 0; k < 14; k++) {
        const a = R() * Math.PI * 2;
        const el = 0.2 + R() * 1.1;
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.45 + R() * 0.35, 12, 8), std('#f6f0e6', { roughness: 0.6 }));
        dot.position.set(Math.cos(a) * Math.cos(el) * 6, 5.2 + Math.sin(el) * 6 * 0.62, Math.sin(a) * Math.cos(el) * 6);
        dot.scale.set(1, 0.4, 1);
        dot.lookAt(0, 3, 0);
        g.add(dot);
      }
      const door = box(1.3, 2.3, 0.2, std('#6b4a2f'), 0, 1.15, 3.45);
      g.add(door);
      for (const a of [-0.6, 0.7]) g.add(box(0.9, 0.9, 0.2, glassMat, Math.sin(a) * 3.3, 3, Math.cos(a) * 3.3).rotateY(a));
      return { w: 12, h: 9, d: 12 };
    }
    case 'baumhaus': {
      g.add(cyl(0.9, 1.4, 8, texMat(woodSidingTexture('#5a3e28'), 1, 2), 0, 4, 0));
      for (let k = 0; k < 6; k++) {
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6 + R() * 1.4, 1), std('#3f6e35', { roughness: 0.9, flatShading: true }));
        s.position.set((R() - 0.5) * 5, 10 + R() * 3, (R() - 0.5) * 5 - 1);
        s.castShadow = true;
        g.add(s);
      }
      g.add(box(6, 0.3, 5, texMat(woodSidingTexture('#7a5232'), 2, 1), 0, 6, 0));
      g.add(box(4.5, 2.8, 3.8, texMat(woodSidingTexture(marode ? '#6a5545' : '#9a6a42'), 1.5, 1), 0, 7.6, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2, 4), texMat(roofTexture('#4f3a5e', 'schindel'), 2, 1));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 10;
      roof.castShadow = true;
      g.add(roof);
      g.add(box(1, 1, 0.1, glassMat, -1, 7.8, 1.95));
      g.add(box(1, 1, 0.1, glassMat, 1.2, 7.8, 1.95));
      for (let k = 0; k < 7; k++) g.add(box(1, 0.1, 0.15, std('#6b4a2f'), 2.8, 0.6 + k * 0.8, 2.6));
      g.add(box(0.12, 6, 0.12, std('#6b4a2f'), 2.3, 3, 2.6));
      g.add(box(0.12, 6, 0.12, std('#6b4a2f'), 3.3, 3, 2.6));
      return { w: 9, h: 13, d: 8 };
    }
    case 'leuchtturm': {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(5, 1), std('#7d7a74', { roughness: 1, flatShading: true }));
      rock.scale.set(1.4, 0.4, 1.2);
      rock.position.y = 0.4;
      g.add(rock);
      const stripes = 6;
      for (let i = 0; i < stripes; i++) {
        const rb = 2.2 - i * 0.2;
        g.add(cyl(rb - 0.2, rb, 2.6, std(i % 2 ? (marode ? '#9a4a40' : '#c8352c') : '#f4f2ec', { roughness: 0.6 }), 0, 2 + i * 2.6, 0, 32));
      }
      const topY = 2 + stripes * 2.6;
      g.add(cyl(1.6, 1.6, 0.3, std('#2b2b2b'), 0, topY - 1, 0));
      g.add(cyl(1.0, 1.0, 1.8, new THREE.MeshPhysicalMaterial({ color: o.lit ? '#ffe08a' : '#cfe8ff', emissive: o.lit ? '#ffcc55' : '#000', emissiveIntensity: o.lit ? 1.5 : 0, roughness: 0.05 }), 0, topY, 0));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.4, 24), std('#c8352c'));
      cap.position.y = topY + 1.6;
      g.add(cap);
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), new THREE.MeshPhysicalMaterial({ color: '#2f7fa8', roughness: 0.15, metalness: 0.1 }));
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, 0.05, -40);
      g.add(sea);
      g.add(box(1.1, 2, 0.2, std('#2b4c7e'), 0, 1.6, 2.15));
      return { w: 10, h: topY + 2, d: 8 };
    }
    case 'muehle': {
      const spec: Spec = { w: 9, d: 8, floors: 2, wall: 'stone', wallColor: '#b4ab9c', roof: 'gable', roofColor: '#6d4a3a' };
      building(g, spec, o, R, 0, 0);
      const wheel = new THREE.Group();
      wheel.add(new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.25, 8, 32), std('#5a3e28')));
      for (let k = 0; k < 12; k++) {
        const sp = box(0.2, 6.2, 0.4, std('#6b4a2f'), 0, 0, 0);
        sp.rotation.z = (k * Math.PI) / 6;
        wheel.add(sp);
      }
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(5.2, 3, 1);
      wheel.traverse((m) => ((m as THREE.Mesh).castShadow = true));
      g.add(wheel);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(6, 40), new THREE.MeshPhysicalMaterial({ color: '#3f86a8', roughness: 0.1 }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(6.5, 0.04, 0);
      g.add(water);
      return { w: 14, h: 10, d: 8 };
    }
    case 'wohnanlage': {
      const s: Spec = { w: 12, d: 10, floors: 4, wall: 'plaster', wallColor: '#e9e4da', roof: 'flat', roofColor: '#555b66', balconies: true, modern: true, bigWindows: true };
      building(g, s, o, R, -7.5, 0);
      building(g, { ...s, wallColor: '#dfe6ec' }, o, R, 7.5, -2);
      return { w: 28, h: 13, d: 12 };
    }
    case 'quartier': {
      const s: Spec = { w: 10, d: 10, floors: 5, wall: 'plaster', wallColor: '#efe4d0', roof: 'flat', roofColor: '#555b66', balconies: true, modern: true, bigWindows: true };
      building(g, s, o, R, -12, 0);
      building(g, { ...s, floors: 6, wallColor: '#f0d9c2' }, o, R, 0, -3);
      building(g, { ...s, wallColor: '#dfe3ef', wall: 'brick' }, o, R, 12, 0);
      return { w: 34, h: 18, d: 12 };
    }
    default: {
      const spec: Spec = SPECS.fachwerk!;
      return building(g, spec, o, R, 0, 0);
    }
  }
}

function tree(g: THREE.Group, x: number, z: number, kind: 'leaf' | 'fir', bare: boolean, R: () => number) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  t.add(cyl(0.18, 0.28, 2.6, std('#5a4030', { roughness: 1 }), 0, 1.3, 0, 8));
  if (kind === 'fir') {
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(2 - i * 0.5, 2.4, 10), std('#2f5a3a', { roughness: 0.9 }));
      c.position.y = 2.6 + i * 1.3;
      c.castShadow = true;
      t.add(c);
      const sn = new THREE.Mesh(new THREE.ConeGeometry(1.9 - i * 0.5, 0.6, 10), std('#ffffff'));
      sn.position.y = 3.3 + i * 1.3;
      t.add(sn);
    }
  } else {
    const col = bare ? '#6a6a3a' : ['#3d6628', '#4a7430', '#35602a'][Math.floor(R() * 3)];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 + R() * 0.7, 1), std(col, { roughness: 0.95, flatShading: true }));
      s.position.set((R() - 0.5) * 1.6, 3.4 + R() * 1.4, (R() - 0.5) * 1.6);
      s.castShadow = true;
      t.add(s);
    }
  }
  g.add(t);
}

function palm(g: THREE.Group, x: number, z: number) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  for (let i = 0; i < 8; i++) t.add(cyl(0.2, 0.24, 0.9, std('#8b6a44'), Math.sin(i * 0.2) * 0.3, 0.45 + i * 0.85, 0, 8));
  for (let k = 0; k < 7; k++) {
    const leaf = box(3.4, 0.05, 0.6, std('#3e8a4a', { side: THREE.DoubleSide }), 0, 0, 0);
    leaf.position.set(Math.cos(k) * 1.4, 7, Math.sin(k) * 1.4);
    leaf.rotation.set(0, -k, -0.35);
    t.add(leaf);
  }
  g.add(t);
}

function hedge(g: THREE.Group, x: number, z: number, len: number, marode: boolean, top: boolean) {
  const h = new THREE.Mesh(new THREE.BoxGeometry(len, 1, 0.8, 4, 2, 2), std(marode ? '#6e7440' : '#3f6b33', { roughness: 1, flatShading: true }));
  h.position.set(x, 0.5, z);
  h.castShadow = true;
  if (marode) h.scale.y = 1.4;
  g.add(h);
  if (top)
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), std(i % 2 ? '#f2f2f2' : '#e86f9a'));
      f.position.set(x - len / 2 + 0.5 + i, 1.0, z + 0.4);
      g.add(f);
    }
}

function weed(g: THREE.Group, x: number, z: number) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 5), std('#6f7a35', { roughness: 1 }));
  c.position.set(x, 0.5, z);
  g.add(c);
}

function scaffold(g: THREE.Group, b: { w: number; h: number; d: number }) {
  const pole = std('#9aa0a6', { metalness: 0.7, roughness: 0.4 });
  const plank = std('#c79a52', { roughness: 0.9 });
  const z = b.d / 2 + 1.2;
  const n = Math.ceil(b.w / 2.5);
  for (let i = 0; i <= n; i++) g.add(cyl(0.05, 0.05, b.h, pole, -b.w / 2 - 0.5 + ((b.w + 1) / n) * i, b.h / 2, z, 6));
  for (let y = 2; y < b.h; y += 2) {
    g.add(box(b.w + 1, 0.06, 0.06, pole, 0, y + 1, z));
    g.add(box(b.w + 1, 0.08, 0.7, plank, 0, y, z - 0.3));
  }
  const net = new THREE.Mesh(new THREE.PlaneGeometry(b.w + 1, b.h), new THREE.MeshStandardMaterial({ color: '#d7dde0', transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  net.position.set(0, b.h / 2, z + 0.1);
  g.add(net);
}

function saleSign(g: THREE.Group, b: { w: number; h: number; d: number }) {
  const x = b.w / 2 + 1.5;
  const z = b.d / 2 + 5;
  g.add(box(0.12, 2.6, 0.12, std('#2d2d2d'), x, 1.3, z));
  g.add(box(2.4, 1.3, 0.08, new THREE.MeshStandardMaterial({ map: textTexture('ZU VERKAUFEN', '#c0392b', '#ffffff') }), x, 2.3, z + 0.08));
}
