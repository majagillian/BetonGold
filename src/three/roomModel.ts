// Realistische 3D-Innenräume
import * as THREE from 'three';
import type { BathId, Defect, FurnStyle, KitchenId, Room } from '../game/types';
import { defectDef, floorDef, wallDef } from '../game/interior';
import { box, cyl, std, texMat } from './core';
import { decalTexture, fabricTexture, floorTexture, plasterTexture, tileWallTexture, type FloorTex } from './textures';

export type Furnishing = FurnStyle | 'tenant' | 'old' | null;

export interface RoomRenderOpts {
  room: Room;
  furnishing: Furnishing;
  defects: Defect[];
  tall?: boolean;
  evening?: boolean;
  outside?: 'garden' | 'city' | 'snow' | 'sea' | 'forest';
}

interface Pal { wood: string; wood2: string; fabric: string; fabric2: string; metal: string; accent: string; metalness: number }
const PALETTES: Record<string, Pal> = {
  skandi: { wood: '#d8b88e', wood2: '#efe9e0', fabric: '#c4c3bf', fabric2: '#e8e4dc', metal: '#dcdcdc', accent: '#8ba596', metalness: 0.3 },
  landhaus: { wood: '#9c6f44', wood2: '#e9dfcc', fabric: '#e2d6bf', fabric2: '#7b8f5e', metal: '#4f4237', accent: '#a3593a', metalness: 0.2 },
  industrial: { wood: '#5a3e2c', wood2: '#3a3a3a', fabric: '#8a5434', fabric2: '#6b6f74', metal: '#222222', accent: '#c99a3a', metalness: 0.7 },
  luxus: { wood: '#4a2e20', wood2: '#efe8da', fabric: '#2c3a5e', fabric2: '#d8cbb0', metal: '#c9a24b', accent: '#7a2e3a', metalness: 0.9 },
  tenant: { wood: '#b88f62', wood2: '#f2efe8', fabric: '#6f7d8c', fabric2: '#d9c7a5', metal: '#9a9a9a', accent: '#c0663f', metalness: 0.4 },
  old: { wood: '#6e5236', wood2: '#a89878', fabric: '#7d6a4e', fabric2: '#8a7a5a', metal: '#7a6a5a', accent: '#6a5a3a', metalness: 0.2 },
};

export interface RoomScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  defectMeshes: Map<string, THREE.Mesh>;
  eye: THREE.Vector3;
  baseYaw: number;
  dims: { W: number; D: number; H: number };
}

function wallpaper() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cdb98e';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64)
    for (let x = 0; x < 256; x += 64) {
      const ox = (y / 64) % 2 ? 32 : 0;
      ctx.fillStyle = 'rgba(150,90,60,0.55)';
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(x + ox + 16 + Math.cos((k * Math.PI * 2) / 5) * 7, y + 20 + Math.sin((k * Math.PI * 2) / 5) * 7, 5, 3, (k * Math.PI * 2) / 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(90,110,60,0.5)';
      ctx.fillRect(x + ox + 15, y + 28, 2, 16);
    }
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const d = (Math.random() - 0.5) * 18;
    img.data[i] += d;
    img.data[i + 1] += d;
    img.data[i + 2] += d;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function outsideTexture(kind: RoomRenderOpts['outside'], evening: boolean) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, evening ? '#2d3c66' : '#8fc0ec');
  g.addColorStop(0.6, evening ? '#e3a06a' : '#dcebf7');
  g.addColorStop(1, evening ? '#6a5a50' : '#bcd3e6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  if (kind === 'city') {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = evening ? '#2a2f45' : '#9aa6b5';
      const h = 60 + ((i * 37) % 90);
      ctx.fillRect(i * 30, 256 - h, 26, h);
      if (evening) {
        ctx.fillStyle = '#ffd27a';
        for (let k = 0; k < 6; k++) ctx.fillRect(i * 30 + 4 + (k % 2) * 10, 256 - h + 10 + k * 12, 5, 6);
      }
    }
  } else if (kind === 'sea') {
    ctx.fillStyle = '#3a8fb8';
    ctx.fillRect(0, 150, 256, 106);
  } else if (kind === 'snow') {
    ctx.fillStyle = '#e8eef4';
    ctx.beginPath();
    ctx.moveTo(0, 190);
    ctx.lineTo(70, 90);
    ctx.lineTo(140, 170);
    ctx.lineTo(210, 70);
    ctx.lineTo(256, 140);
    ctx.lineTo(256, 256);
    ctx.lineTo(0, 256);
    ctx.fill();
  } else {
    ctx.fillStyle = kind === 'forest' ? '#2f5a33' : '#5e8a45';
    ctx.fillRect(0, 175, 256, 81);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = kind === 'forest' ? '#24472a' : '#4a7a38';
      ctx.beginPath();
      ctx.arc(20 + i * 38, 170 - (i % 3) * 10, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildRoomScene(o: RoomRenderOpts): RoomScene {
  const { room } = o;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.evening ? '#1c2030' : '#d9e4ee');
  scene.environmentIntensity = 0.35;
  const H = o.tall ? 3.1 : 2.6;
  const area = Math.max(3, room.size);
  const W = Math.max(1.6, Math.sqrt(area * (room.type === 'flur' ? 0.45 : 1.3)));
  const D = Math.max(1.5, area / W);
  const isWet = room.type === 'bad' || room.type === 'wc';
  const wd = wallDef(room.wall);
  const fd = floorDef(room.floor);
  const marodeWall = room.wall === 'tapete_alt';

  // Licht
  scene.add(new THREE.HemisphereLight(o.evening ? 0x6c7aa0 : 0xeaf2ff, 0x6b5a48, o.evening ? 0.25 : 0.55));
  const sun = new THREE.DirectionalLight(o.evening ? 0xffa060 : 0xfff2dc, o.evening ? 0.8 : 3.2);
  sun.position.set(-W * 0.3 + 2, H + 3.5, -D / 2 - 5);
  sun.target.position.set(0, 0, D * 0.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -8;
  sc.right = sc.top = 8;
  sc.near = 0.5;
  sc.far = 30;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const lamp = new THREE.PointLight(0xffd9a8, o.evening ? 14 : 4, 12, 2);
  lamp.position.set(0, H - 0.5, 0);
  scene.add(lamp);
  const fill = new THREE.PointLight(0xfff4e8, o.evening ? 2 : 3, 10, 2);
  fill.position.set(W * 0.3, H * 0.6, D * 0.35);
  scene.add(fill);

  // Boden
  const floorTex = floorTexture(fd.id as FloorTex);
  const floorRep = fd.id.startsWith('fliesen') || fd.id === 'marmor' ? 1 / 1.2 : 1 / 1.6;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), texMat(floorTex, W * floorRep, D * floorRep, { roughness: fd.id === 'marmor' ? 0.15 : fd.id.startsWith('fliesen') ? 0.35 : fd.id === 'teppich_alt' ? 1 : 0.55, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // Decke
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#f4f2ee', { roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  // Wände
  const wallMat = marodeWall ? texMat(wallpaper(), W / 1.2, H / 1.2, { roughness: 0.95 }) : texMat(plasterTexture(wd.hex), W / 2, H / 2, { roughness: 0.92 });
  const t = 0.12;
  const wallFull = (w: number, x: number, z: number, rot: number) => {
    const m = box(w, H, t, wallMat, x, H / 2, z);
    m.rotation.y = rot;
    scene.add(m);
    return m;
  };
  // Rückwand mit Fenster
  const winW = Math.min(1.6, W * 0.45);
  const winH = 1.5;
  const sill = isWet ? 1.3 : 0.85;
  const winX = room.type === 'flur' ? W / 2 + 10 : -W * 0.08;
  const zb = -D / 2 - t / 2;
  if (room.type === 'flur') {
    wallFull(W + t * 2, 0, zb, 0);
  } else {
    scene.add(box(winX - winW / 2 + W / 2, H, t, wallMat, (-W / 2 + winX - winW / 2) / 2, H / 2, zb));
    scene.add(box(W / 2 - (winX + winW / 2), H, t, wallMat, (W / 2 + winX + winW / 2) / 2, H / 2, zb));
    scene.add(box(winW, sill, t, wallMat, winX, sill / 2, zb));
    scene.add(box(winW, H - sill - winH, t, wallMat, winX, H - (H - sill - winH) / 2, zb));
    // Fensterrahmen + Glas
    const frame = std('#f5f4f0', { roughness: 0.4 });
    scene.add(box(winW, 0.06, 0.14, frame, winX, sill, zb));
    scene.add(box(winW, 0.06, 0.14, frame, winX, sill + winH, zb));
    scene.add(box(0.06, winH, 0.14, frame, winX - winW / 2, sill + winH / 2, zb));
    scene.add(box(0.06, winH, 0.14, frame, winX + winW / 2, sill + winH / 2, zb));
    scene.add(box(0.05, winH, 0.1, frame, winX, sill + winH / 2, zb));
    scene.add(box(winW + 0.2, 0.04, 0.28, std('#e6e2da', { roughness: 0.3 }), winX, sill - 0.02, zb + 0.1));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0, metalness: 0 }));
    glass.position.set(winX, sill + winH / 2, zb);
    scene.add(glass);
    const out = new THREE.Mesh(new THREE.PlaneGeometry(winW * 4, winH * 3), new THREE.MeshBasicMaterial({ map: outsideTexture(o.outside ?? 'garden', !!o.evening) }));
    out.position.set(winX, sill + winH / 2, zb - 2.5);
    scene.add(out);
    // Vorhänge bei Möblierung
    if (o.furnishing && o.furnishing !== 'old' && !isWet) {
      const cm = texMat(fabricTexture(PALETTES[o.furnishing].fabric2), 1, 2, { roughness: 1, side: THREE.DoubleSide });
      for (const s of [-1, 1]) {
        const cur = new THREE.Mesh(new THREE.BoxGeometry(0.35, H - 0.25, 0.05, 6, 1, 1), cm);
        const pos = cur.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + Math.sin(pos.getX(i) * 40) * 0.03);
        cur.geometry.computeVertexNormals();
        cur.position.set(winX + s * (winW / 2 + 0.25), (H - 0.25) / 2, zb + 0.15);
        cur.castShadow = true;
        scene.add(cur);
      }
      scene.add(cyl(0.015, 0.015, winW + 1.2, std(PALETTES[o.furnishing].metal, { metalness: 0.8 }), winX, H - 0.15, zb + 0.15).rotateZ(Math.PI / 2));
    }
  }
  wallFull(D + t * 2, -W / 2 - t / 2, 0, Math.PI / 2);
  wallFull(D + t * 2, W / 2 + t / 2, 0, Math.PI / 2);
  wallFull(W + t * 2, 0, D / 2 + t / 2, 0);

  // Tür (linke Wand)
  const doorZ = D / 2 - 0.75;
  scene.add(box(0.06, 2.05, 0.9, std('#f7f6f2', { roughness: 0.45 }), -W / 2 + 0.03, 1.025, doorZ));
  scene.add(box(0.09, 2.15, 1.04, std('#ffffff', { roughness: 0.5 }), -W / 2 + 0.01, 1.075, doorZ).translateX(-0.01));
  scene.add(box(0.05, 0.03, 0.14, std('#b9b9b9', { metalness: 0.9, roughness: 0.25 }), -W / 2 + 0.09, 1.05, doorZ - 0.32));

  // Sockelleisten
  const base = std(isWet ? '#d9d5cc' : '#f5f3ee', { roughness: 0.5 });
  scene.add(box(W, 0.07, 0.02, base, 0, 0.035, -D / 2 + 0.01, false));
  scene.add(box(0.02, 0.07, D, base, W / 2 - 0.01, 0.035, 0, false));
  scene.add(box(0.02, 0.07, D, base, -W / 2 + 0.01, 0.035, 0, false));

  // Fliesenspiegel im Bad
  if (isWet) {
    const fullTiles = room.bath === 'modern' || room.bath === 'spa';
    const tileH = fullTiles ? H : 1.25;
    const tileCol = room.bath === 'alt' ? '#b9c48e' : room.bath === 'spa' ? '#e9e4da' : room.bath === 'modern' ? '#cfccc6' : '#f2f2f0';
    const tm = texMat(tileWallTexture(tileCol, room.bath === 'alt'), W / 1.2, tileH / 1.2, { roughness: 0.25 });
    scene.add(box(W, tileH, 0.02, tm, 0, tileH / 2, -D / 2 + 0.012, false));
    const tm2 = texMat(tileWallTexture(tileCol, room.bath === 'alt'), D / 1.2, tileH / 1.2, { roughness: 0.25 });
    scene.add(box(0.02, tileH, D, tm2, W / 2 - 0.012, tileH / 2, 0, false));
  }

  // Deckenleuchte
  const pal = PALETTES[o.furnishing && o.furnishing !== null ? o.furnishing : 'skandi'];
  if (o.furnishing === 'luxus' && !isWet) {
    scene.add(cyl(0.005, 0.005, 0.6, std('#c9a24b'), 0, H - 0.3, 0));
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#fff6e0', emissive: '#ffd9a0', emissiveIntensity: 1.2, transmission: 0.3, roughness: 0.2 }));
    ch.position.set(0, H - 0.75, 0);
    scene.add(ch);
  } else if (o.furnishing && o.furnishing !== 'old' && !isWet) {
    scene.add(cyl(0.005, 0.005, 0.7, std('#222'), 0, H - 0.35, 0));
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.25, 24, 1, true), std(o.furnishing === 'industrial' ? '#1e1e1e' : '#f2efe8', { side: THREE.DoubleSide, metalness: o.furnishing === 'industrial' ? 0.6 : 0 }));
    sh.position.set(0, H - 0.8, 0);
    scene.add(sh);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff3d6' }));
    bulb.position.set(0, H - 0.88, 0);
    scene.add(bulb);
  } else {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff3d6' }));
    bulb.position.set(0, H - 0.25, 0);
    scene.add(bulb);
    scene.add(cyl(0.006, 0.006, 0.2, std('#333'), 0, H - 0.1, 0));
  }

  // Einbauten
  const g = new THREE.Group();
  scene.add(g);
  if (room.kitchen && (room.type === 'kueche' || room.type === 'wohnkueche')) kitchen(g, room.kitchen, W, D, H, room.type === 'wohnkueche');
  if (room.bath) bath(g, room.bath, W, D, room.type === 'wc');
  if (o.furnishing) furnish(g, room, o.furnishing, W, D, H);

  // Mängel
  const defectMeshes = new Map<string, THREE.Mesh>();
  for (const d of o.defects) {
    if (d.fixed) continue;
    const def = defectDef(d.type);
    const size = def.decal === 'riss' ? 1.4 : def.decal === 'kabel' ? 0.8 : def.decal === 'asbest' ? 1.2 : 1.5;
    const mat = new THREE.MeshStandardMaterial({ map: decalTexture(def.decal), transparent: true, opacity: d.found ? 1 : 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.9 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    const [u, v] = d.spot;
    if (def.where === 'decke') {
      m.rotation.x = Math.PI / 2;
      m.position.set((u - 0.5) * W * 0.6, H - 0.01, (v - 0.5) * D * 0.6);
    } else if (def.where === 'boden') {
      m.rotation.x = -Math.PI / 2;
      m.position.set((u - 0.5) * W * 0.5, 0.012, (v - 0.4) * D * 0.5);
    } else if (u < 0.5 && room.type !== 'flur') {
      // rechte Wand
      m.rotation.y = -Math.PI / 2;
      m.position.set(W / 2 - 0.02, def.decal === 'kabel' ? 1.1 : 0.6 + v * (H - 1.4), (u * 2 - 0.5) * D * 0.6);
    } else {
      m.position.set(W * 0.38 - (u - 0.5) * W * 0.3, def.decal === 'kabel' ? 1.1 : 0.6 + v * (H - 1.4), -D / 2 + 0.03);
    }
    m.userData.defectId = d.id;
    scene.add(m);
    defectMeshes.set(d.id, m);
    if (d.found) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.55, size * 0.6, 40), new THREE.MeshBasicMaterial({ color: '#e5484d', side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }));
      ring.position.copy(m.position);
      ring.rotation.copy(m.rotation);
      ring.translateZ(0.01);
      scene.add(ring);
    }
  }

  // Kamera
  const camera = new THREE.PerspectiveCamera(72, 4 / 3, 0.05, 50);
  const eye = new THREE.Vector3(W / 2 - 0.35, 1.5, D / 2 - 0.35);
  camera.position.copy(eye);
  const target = new THREE.Vector3(-W * 0.2, 1.15, -D * 0.25);
  camera.lookAt(target);
  const baseYaw = Math.atan2(-(target.x - eye.x), -(target.z - eye.z));
  return { scene, camera, defectMeshes, eye, baseYaw, dims: { W, D, H } };
}

// ---------------- Küche ----------------
function kitchen(g: THREE.Group, k: KitchenId, W: number, D: number, H: number, open: boolean) {
  const styles: Record<KitchenId, { front: string; top: string; gloss: boolean; handle: string; tiles: string }> = {
    alt: { front: '#8a6236', top: '#d9c79a', gloss: false, handle: '#c9b48a', tiles: '#d68a3a' },
    pantry: { front: '#f4f4f2', top: '#cfcac0', gloss: false, handle: '#9a9a9a', tiles: '#f2f2f0' },
    landhaus: { front: '#efe6d2', top: '#6b4a32', gloss: false, handle: '#3a3a3a', tiles: '#e9e2d4' },
    modern: { front: '#fbfbfa', top: '#3a3a3c', gloss: true, handle: '#fbfbfa', tiles: '#d5d3cf' },
    industrial: { front: '#4a3326', top: '#2a2a2a', gloss: false, handle: '#1a1a1a', tiles: '#2f2f30' },
    insel: { front: '#e9e6e0', top: '#f1efe9', gloss: true, handle: '#c9a24b', tiles: '#ecebe8' },
  };
  const st = styles[k];
  const len = Math.min(W - 0.3, k === 'pantry' ? 2.2 : 3.6);
  const x0 = W / 2 - len / 2 - 0.05;
  const z = -D / 2 + 0.33;
  const front = st.gloss ? new THREE.MeshPhysicalMaterial({ color: st.front, roughness: 0.12, clearcoat: 1 }) : std(st.front, { roughness: 0.6 });
  const top = new THREE.MeshPhysicalMaterial({ color: st.top, roughness: k === 'insel' ? 0.15 : 0.35, clearcoat: k === 'insel' ? 1 : 0 });
  // Unterschränke
  g.add(box(len, 0.82, 0.6, front, x0, 0.46, z));
  g.add(box(len, 0.1, 0.55, std('#2a2a2a'), x0, 0.05, z + 0.02));
  g.add(box(len + 0.02, 0.04, 0.64, top, x0, 0.89, z + 0.02));
  const n = Math.round(len / 0.6);
  for (let i = 0; i < n; i++) {
    const x = x0 - len / 2 + (i + 0.5) * (len / n);
    g.add(box(0.005, 0.78, 0.005, std('#000', { transparent: true, opacity: 0.25 }), x - len / n / 2, 0.47, z + 0.302, false));
    if (k !== 'modern') g.add(box(0.14, 0.02, 0.02, std(st.handle, { metalness: 0.8, roughness: 0.3 }), x, 0.78, z + 0.31));
    if (k === 'landhaus') g.add(box(len / n - 0.12, 0.6, 0.01, std('#e2d7bf'), x, 0.46, z + 0.305, false));
  }
  // Spüle + Kochfeld
  g.add(box(0.5, 0.02, 0.4, new THREE.MeshPhysicalMaterial({ color: '#b8bcc0', metalness: 1, roughness: 0.25 }), x0 - len * 0.25, 0.905, z + 0.02));
  g.add(cyl(0.015, 0.015, 0.3, std('#c0c0c0', { metalness: 1, roughness: 0.2 }), x0 - len * 0.25, 1.05, z - 0.2));
  g.add(box(0.6, 0.012, 0.5, new THREE.MeshPhysicalMaterial({ color: '#111', roughness: 0.05, clearcoat: 1 }), x0 + len * 0.22, 0.91, z + 0.02));
  // Fliesenspiegel
  g.add(box(len, 0.6, 0.01, texMat(tileWallTexture(st.tiles, k === 'alt'), len / 0.6, 1, { roughness: 0.3 }), x0, 1.21, -D / 2 + 0.01, false));
  // Oberschränke + Haube
  if (k !== 'pantry' || len > 2) {
    g.add(box(len, 0.72, 0.35, front, x0, H - 0.75, -D / 2 + 0.18));
    g.add(box(0.6, 0.4, 0.45, new THREE.MeshPhysicalMaterial({ color: k === 'industrial' ? '#1e1e1e' : '#c9ccd0', metalness: 0.9, roughness: 0.3 }), x0 + len * 0.22, H - 1.0, -D / 2 + 0.25));
  }
  // Kühlschrank
  if (W - len > 0.8 && k !== 'alt') g.add(box(0.6, 1.9, 0.62, front, x0 - len / 2 - 0.32, 0.95, z));
  if (k === 'alt') g.add(box(0.55, 0.85, 0.6, std('#e9e3d0'), x0 - len / 2 - 0.3, 0.43, z));
  // Insel
  if (k === 'insel' || (open && D > 3.2)) {
    const iz = Math.min(0.4, -D / 2 + 1.7);
    g.add(box(Math.min(2.2, W * 0.5), 0.88, 0.95, front, W * 0.1, 0.44, iz));
    g.add(box(Math.min(2.3, W * 0.5) + 0.1, 0.05, 1.05, top, W * 0.1, 0.9, iz));
    for (let i = 0; i < 3; i++) {
      const sx = W * 0.1 - 0.6 + i * 0.6;
      g.add(cyl(0.18, 0.18, 0.06, std('#3a3a3a'), sx, 0.72, iz + 0.75));
      g.add(cyl(0.02, 0.02, 0.7, std('#2a2a2a', { metalness: 0.8 }), sx, 0.36, iz + 0.75));
    }
  }
}

// ---------------- Bad ----------------
function bath(g: THREE.Group, b: BathId, W: number, D: number, wc: boolean) {
  const ceramic = new THREE.MeshPhysicalMaterial({ color: b === 'alt' ? '#9aa86a' : '#fbfbfb', roughness: 0.15, clearcoat: 1 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: b === 'spa' ? '#c9a24b' : '#d7d9dc', metalness: 1, roughness: 0.18 });
  // WC
  const tx = W / 2 - 0.4;
  const tz = wc ? 0 : D / 2 - 0.9;
  g.add(box(0.38, 0.4, 0.5, ceramic, tx, 0.2, tz));
  g.add(box(0.42, 0.05, 0.52, ceramic, tx - 0.02, 0.43, tz));
  g.add(box(0.18, 0.45, 0.45, ceramic, W / 2 - 0.09, 0.62, tz));
  // Waschtisch
  const vx = wc ? -W * 0.15 : -W * 0.05;
  const vz = -D / 2 + 0.28;
  if (b === 'modern' || b === 'spa') {
    g.add(box(b === 'spa' ? 1.4 : 0.9, 0.35, 0.48, std(b === 'spa' ? '#4a2e20' : '#3a3a3c', { roughness: 0.5 }), vx, 0.62, vz));
  } else g.add(cyl(0.07, 0.09, 0.75, ceramic, vx, 0.375, vz));
  g.add(box(b === 'spa' ? 1.3 : 0.6, 0.12, 0.45, ceramic, vx, 0.86, vz));
  g.add(cyl(0.015, 0.015, 0.2, chrome, vx, 1.0, vz - 0.15));
  const mirror = new THREE.MeshPhysicalMaterial({ color: '#d9e3ea', metalness: 0.25, roughness: 0.08, clearcoat: 1 });
  g.add(box(b === 'spa' ? 1.2 : 0.6, 0.8, 0.02, mirror, vx, 1.55, -D / 2 + 0.02));
  if (wc) return;
  // Wanne / Dusche
  if (b === 'modern') {
    const gx = -W / 2 + 0.5;
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1f5', transmission: 0.9, transparent: true, opacity: 0.35, roughness: 0.02 });
    g.add(box(0.02, 2.0, 1.0, glass, gx + 0.5, 1.0, D / 2 - 0.6));
    g.add(box(1.0, 0.03, 1.0, texMat(floorTexture('fliesen_dunkel'), 1, 1, { roughness: 0.3 }), gx, 0.015, D / 2 - 0.6));
    g.add(cyl(0.15, 0.15, 0.02, chrome, gx, 2.15, D / 2 - 0.6));
    g.add(cyl(0.012, 0.012, 2.1, chrome, -W / 2 + 0.05, 1.05, D / 2 - 0.6));
  } else if (b === 'spa') {
    const tub = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.9, 8, 24), ceramic);
    tub.rotation.z = Math.PI / 2;
    tub.scale.set(1, 1, 0.75);
    tub.scale.multiplyScalar(0.85);
    tub.position.set(-W * 0.18, 0.3, -D * 0.05);
    tub.castShadow = true;
    g.add(tub);
    g.add(cyl(0.012, 0.012, 1.0, chrome, -W * 0.18 - 0.75, 0.5, -D * 0.05));
  } else {
    const len = Math.min(1.7, D - 0.4);
    g.add(box(0.75, 0.55, len, ceramic, -W / 2 + 0.4, 0.28, D / 2 - len / 2 - 0.05));
    g.add(box(0.6, 0.05, len - 0.15, std(b === 'alt' ? '#7d8a52' : '#e8eef0', { roughness: 0.2 }), -W / 2 + 0.4, 0.54, D / 2 - len / 2 - 0.05));
    g.add(cyl(0.012, 0.012, 0.25, chrome, -W / 2 + 0.06, 0.75, D / 2 - len - 0.0));
  }
  // Handtuch
  g.add(box(0.5, 0.7, 0.04, texMat(fabricTexture(b === 'alt' ? '#d98a5a' : '#f2efe8'), 1, 1), W / 2 - 0.03, 1.2, -D / 2 + 0.9).rotateY(Math.PI / 2));
}

// ---------------- Möbel ----------------
function furnish(g: THREE.Group, room: Room, f: Exclude<Furnishing, null>, W: number, D: number, H: number) {
  const p = PALETTES[f];
  const wood = std(p.wood, { roughness: 0.55 });
  const wood2 = std(p.wood2, { roughness: 0.5 });
  const fabric = texMat(fabricTexture(p.fabric), 2, 2, { roughness: 0.95 });
  const fabric2 = texMat(fabricTexture(p.fabric2), 2, 2, { roughness: 0.95 });
  const metal = new THREE.MeshPhysicalMaterial({ color: p.metal, metalness: p.metalness, roughness: 0.35 });
  const rug = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), texMat(fabricTexture(f === 'old' ? '#6a4a3a' : p.accent), w * 2, d * 2, { roughness: 1 }));
    m.position.set(x, 0.006, z);
    m.receiveShadow = true;
    g.add(m);
  };
  const plant = (x: number, z: number, s = 1) => {
    g.add(cyl(0.16 * s, 0.12 * s, 0.32 * s, std(f === 'industrial' ? '#2b2b2b' : '#d9cbb5', { roughness: 0.8 }), x, 0.16 * s, z));
    for (let i = 0; i < 5; i++) {
      const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 * s, 0), std('#3f6e35', { roughness: 0.8, flatShading: true }));
      l.position.set(x + Math.sin(i * 2.4) * 0.12 * s, (0.5 + i * 0.12) * s, z + Math.cos(i * 2.4) * 0.12 * s);
      l.castShadow = true;
      g.add(l);
    }
  };
  const sofa = (x: number, z: number, w: number, rotY = 0) => {
    const s = new THREE.Group();
    s.position.set(x, 0, z);
    s.rotation.y = rotY;
    s.add(box(w, 0.25, 0.9, fabric, 0, 0.28, 0));
    s.add(box(w - 0.3, 0.16, 0.7, fabric2 === fabric ? fabric : fabric, 0, 0.48, 0.05));
    s.add(box(w, 0.5, 0.2, fabric, 0, 0.6, -0.36));
    s.add(box(0.18, 0.38, 0.9, fabric, -w / 2 + 0.09, 0.5, 0));
    s.add(box(0.18, 0.38, 0.9, fabric, w / 2 - 0.09, 0.5, 0));
    for (const lx of [-w / 2 + 0.1, w / 2 - 0.1]) for (const lz of [-0.35, 0.35]) s.add(cyl(0.025, 0.02, 0.15, f === 'industrial' || f === 'luxus' ? metal : wood, lx, 0.08, lz, 8));
    s.add(box(0.4, 0.35, 0.12, fabric2, -w / 2 + 0.45, 0.68, -0.22).rotateZ(0.15));
    s.add(box(0.4, 0.35, 0.12, texMat(fabricTexture(p.accent), 1, 1), w / 2 - 0.45, 0.68, -0.22).rotateZ(-0.15));
    s.traverse((m) => ((m as THREE.Mesh).castShadow = true));
    g.add(s);
  };
  const table = (x: number, z: number, w: number, d: number, h: number, round = false) => {
    if (round) g.add(cyl(w / 2, w / 2, 0.04, wood, x, h, z, 32));
    else g.add(box(w, 0.04, d, wood, x, h, z));
    for (const lx of [-w / 2 + 0.06, w / 2 - 0.06]) for (const lz of [-d / 2 + 0.06, d / 2 - 0.06]) g.add(cyl(0.022, 0.018, h, f === 'industrial' ? metal : wood, x + lx * (round ? 0.6 : 1), h / 2, z + lz * (round ? 0.6 : 1), 8));
  };
  const chair = (x: number, z: number, rot: number) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    c.add(box(0.42, 0.04, 0.42, f === 'luxus' ? fabric : wood, 0, 0.46, 0));
    c.add(box(0.42, 0.42, 0.04, f === 'luxus' ? fabric : wood, 0, 0.7, -0.2));
    for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) c.add(cyl(0.015, 0.015, 0.46, f === 'industrial' ? metal : wood, lx, 0.23, lz, 6));
    c.traverse((m) => ((m as THREE.Mesh).castShadow = true));
    g.add(c);
  };
  const bed = (x: number, z: number, w: number, rotY = 0) => {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    b.rotation.y = rotY;
    const L = 2.05;
    b.add(box(w + 0.1, 0.3, L + 0.05, f === 'luxus' ? fabric : wood, 0, 0.2, 0));
    b.add(box(w, 0.2, L - 0.05, std('#f7f7f5', { roughness: 0.9 }), 0, 0.45, 0));
    b.add(box(w + 0.02, 0.08, L * 0.62, fabric2, 0, 0.58, L * 0.18));
    b.add(box(w + 0.1, 0.9, 0.08, f === 'luxus' || f === 'skandi' ? fabric : wood, 0, 0.6, -L / 2));
    const pillows = w > 1.2 ? [-w / 4, w / 4] : [0];
    pillows.forEach((px) => b.add(box(Math.min(0.6, w / 2 - 0.05), 0.12, 0.38, std('#ffffff', { roughness: 0.95 }), px, 0.62, -L / 2 + 0.3)));
    b.add(box(w * 0.98, 0.04, 0.4, texMat(fabricTexture(p.accent), 1, 1), 0, 0.63, L * 0.4));
    b.traverse((m) => ((m as THREE.Mesh).castShadow = true));
    g.add(b);
  };
  const wardrobe = (x: number, z: number, w: number, rotY = 0) => {
    const wr = box(w, 2.1, 0.6, wood2, x, 1.05, z);
    wr.rotation.y = rotY;
    g.add(wr);
    const n = Math.max(2, Math.round(w / 0.5));
    for (let i = 1; i < n; i++) {
      const line = box(0.005, 2.05, 0.005, std('#000', { transparent: true, opacity: 0.3 }), -w / 2 + (i * w) / n, 0, 0.301, false);
      wr.add(line);
      line.position.y = 0;
    }
  };
  const shelf = (x: number, z: number, rotY = 0) => {
    const s = new THREE.Group();
    s.position.set(x, 0, z);
    s.rotation.y = rotY;
    s.add(box(0.9, 1.8, 0.03, wood, 0, 0.9, -0.14));
    for (let i = 0; i < 5; i++) s.add(box(0.9, 0.025, 0.3, wood, 0, 0.05 + i * 0.42, 0));
    const cols = ['#8a3a2a', '#2a4a6a', '#d9c9a0', '#3a5a3a', '#6a4a7a', '#c9a24b'];
    for (let i = 0; i < 4; i++)
      for (let k = 0; k < 6; k++) if ((i + k) % 3) s.add(box(0.05, 0.22 + (k % 3) * 0.03, 0.2, std(cols[(i * 3 + k) % 6]), -0.35 + k * 0.12, 0.18 + i * 0.42, 0));
    s.traverse((m) => ((m as THREE.Mesh).castShadow = true));
    g.add(s);
  };
  const floorLamp = (x: number, z: number) => {
    g.add(cyl(0.12, 0.12, 0.03, metal, x, 0.015, z));
    g.add(cyl(0.012, 0.012, 1.5, metal, x, 0.75, z));
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.28, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#f4ecd8', emissive: '#ffd8a0', emissiveIntensity: 0.4, side: THREE.DoubleSide }));
    sh.position.set(x, 1.55, z);
    g.add(sh);
  };
  const tv = (x: number, z: number) => {
    g.add(box(1.6, 0.45, 0.4, wood2, x, 0.25, z));
    g.add(box(1.25, 0.72, 0.04, new THREE.MeshPhysicalMaterial({ color: '#0d0d0f', roughness: 0.05, clearcoat: 1 }), x, 0.95, z - 0.05));
  };
  const art = (x: number, y: number, z: number, rotY: number, w = 0.8, h = 0.6) => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    const gr = ctx.createLinearGradient(0, 0, 128, 96);
    gr.addColorStop(0, p.accent);
    gr.addColorStop(1, p.fabric2);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 128, 96);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(80, 40, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 64, 128, 32);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const a = box(w, h, 0.03, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), x, y, z);
    a.rotation.y = rotY;
    g.add(a);
    const fr = box(w + 0.06, h + 0.06, 0.02, f === 'luxus' ? metal : std('#1e1e1e'), x, y, z);
    fr.rotation.y = rotY;
    fr.translateZ(-0.012);
    g.add(fr);
  };

  if (f === 'old') {
    // Alte Hinterlassenschaften
    g.add(box(0.5, 0.4, 0.4, std('#b08a5a', { roughness: 1 }), W * 0.2, 0.2, D * 0.1).rotateY(0.3));
    g.add(box(0.4, 0.3, 0.4, std('#a07a4a', { roughness: 1 }), W * 0.2 + 0.1, 0.55, D * 0.1).rotateY(0.6));
    if (room.type === 'wohnen' || room.type === 'schlafen') {
      const ch = new THREE.Group();
      ch.add(box(0.8, 0.4, 0.8, fabric, 0, 0.3, 0));
      ch.add(box(0.8, 0.6, 0.2, fabric, 0, 0.7, -0.3));
      ch.position.set(-W / 4, 0, -D / 6);
      ch.rotation.y = 0.5;
      g.add(ch);
    }
    return;
  }

  switch (room.type) {
    case 'wohnen':
    case 'wohnkueche': {
      const sw = Math.min(2.4, W * 0.55);
      const sz = room.type === 'wohnkueche' ? D / 2 - 1.3 : D * 0.1;
      rug(Math.min(2.6, W * 0.6), 1.8, -W * 0.08, sz - 0.9);
      sofa(-W * 0.08, sz, sw);
      table(-W * 0.08, sz - 1.0, 0.9, 0.55, 0.38, f === 'skandi' || f === 'luxus');
      if (room.type === 'wohnen') tv(-W * 0.08, -D / 2 + 0.25);
      plant(-W / 2 + 0.35, -D / 2 + 0.4, 1.4);
      floorLamp(-W * 0.08 - sw / 2 - 0.35, sz);
      if (W > 3.4) shelf(W / 2 - 0.2, -D * 0.1, -Math.PI / 2);
      art(-W / 2 + 0.02, 1.55, sz - 0.2, Math.PI / 2, 1.0, 0.7);
      break;
    }
    case 'kueche': {
      if (D > 2.4) {
        table(0, D * 0.2, 1.1, 0.75, 0.75);
        chair(-0.35, D * 0.2 + 0.5, Math.PI);
        chair(0.35, D * 0.2 + 0.5, Math.PI);
        chair(0, D * 0.2 - 0.5, 0);
      }
      plant(W / 2 - 0.3, D / 2 - 0.3, 0.8);
      break;
    }
    case 'schlafen': {
      const bw = Math.min(1.8, W - 1.4);
      bed(W * 0.05, -D / 2 + 1.1, bw);
      for (const s of [-1, 1]) {
        g.add(box(0.45, 0.5, 0.4, wood, W * 0.05 + s * (bw / 2 + 0.32), 0.25, -D / 2 + 0.3));
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.2, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#f4ecd8', emissive: '#ffd8a0', emissiveIntensity: 0.4, side: THREE.DoubleSide }));
        l.position.set(W * 0.05 + s * (bw / 2 + 0.32), 0.75, -D / 2 + 0.3);
        g.add(l);
      }
      if (D > 3.2) wardrobe(W / 2 - 0.32, D / 2 - 1.2, Math.min(2, D - 1.6), Math.PI / 2);
      rug(bw + 0.8, 1.2, W * 0.05, -D / 2 + 2.3);
      art(W * 0.05, 1.55, -D / 2 + 0.02, 0, 1.1, 0.6);
      break;
    }
    case 'kind': {
      bed(-W / 2 + 0.55, -D / 2 + 1.1, 0.9);
      table(W / 2 - 0.5, -D / 2 + 0.45, 1.0, 0.55, 0.72);
      chair(W / 2 - 0.5, -D / 2 + 0.95, Math.PI);
      shelf(W / 2 - 0.2, D * 0.15, -Math.PI / 2);
      rug(1.4, 1.4, 0, D * 0.1);
      g.add(box(0.5, 0.4, 0.4, std(p.accent), 0, 0.2, D * 0.1 + 0.4));
      break;
    }
    case 'arbeiten': {
      table(0, -D / 2 + 0.45, 1.4, 0.7, 0.74);
      chair(0, -D / 2 + 1.05, Math.PI);
      g.add(box(0.55, 0.35, 0.03, new THREE.MeshPhysicalMaterial({ color: '#111', roughness: 0.1 }), 0, 1.0, -D / 2 + 0.3));
      shelf(-W / 2 + 0.2, 0, Math.PI / 2);
      plant(W / 2 - 0.3, -D / 2 + 0.35, 1.1);
      break;
    }
    case 'essen': {
      table(0, 0, 1.8, 0.95, 0.75);
      for (const s of [-1, 1]) for (const xx of [-0.55, 0, 0.55]) chair(xx, s * 0.75, s > 0 ? Math.PI : 0);
      art(0, 1.55, -D / 2 + 0.02, 0, 1.4, 0.8);
      plant(W / 2 - 0.35, -D / 2 + 0.35, 1.3);
      break;
    }
    case 'flur': {
      rug(Math.max(0.7, W - 0.6), D * 0.6, 0, 0);
      g.add(box(0.9, 0.5, 0.35, wood2, W / 2 - 0.2, 0.25, -D * 0.15).rotateY(-Math.PI / 2));
      g.add(box(0.03, 1.2, 0.6, new THREE.MeshPhysicalMaterial({ color: '#d9e3ea', metalness: 0.25, roughness: 0.08 }), W / 2 - 0.02, 1.3, -D * 0.15));
      for (let i = 0; i < 4; i++) g.add(cyl(0.015, 0.015, 0.12, metal, -W / 2 + 0.06, 1.7, -D * 0.3 + i * 0.25).rotateZ(Math.PI / 2));
      break;
    }
    default:
      break;
  }
  void H;
}
