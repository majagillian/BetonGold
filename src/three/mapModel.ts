// 3D-Karte der Insel Aurelien
import * as THREE from 'three';
import type { RegionId } from '../game/types';
import { std } from './core';

export const REGION_POS: Record<RegionId, [number, number]> = {
  kleeweiler: [-26, 12],
  muehlental: [-8, 4],
  lumenhafen: [6, 24],
  pilzhain: [-32, -14],
  wolkenspitz: [2, -24],
  sonnenkueste: [32, 16],
  kronstadt: [22, -4],
  neuwerk: [38, -20],
};

const BIOME: Record<RegionId, string> = {
  kleeweiler: '#7aa84a',
  muehlental: '#6f9e4a',
  lumenhafen: '#8a9a6a',
  pilzhain: '#3f6b35',
  wolkenspitz: '#7f8a7a',
  sonnenkueste: '#c9b67a',
  kronstadt: '#8f948f',
  neuwerk: '#a39a6e',
};

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) => vnoise(x, y) * 0.5 + vnoise(x * 2, y * 2) * 0.25 + vnoise(x * 4, y * 4) * 0.125 + vnoise(x * 8, y * 8) * 0.0625;

export function heightAt(x: number, z: number) {
  const nx = x / 58;
  const nz = z / 40;
  const d = Math.sqrt(nx * nx + nz * nz);
  let h = (1 - d) * 3.2 + (fbm(x * 0.06 + 3, z * 0.06 + 7) - 0.45) * 3.2;
  // Berge im Norden
  const [mx, mz] = REGION_POS.wolkenspitz;
  const md = Math.hypot(x - mx, z - mz);
  h += Math.max(0, 1 - md / 18) ** 1.6 * 13 * (0.7 + fbm(x * 0.2, z * 0.2) * 0.6);
  // Fluss durch Mühlental
  const riverZ = 4 + Math.sin(x * 0.12) * 4;
  if (x < 4 && x > -40) h -= Math.max(0, 1 - Math.abs(z - riverZ) / 2.2) * 1.6;
  // Hafenbucht
  const [hx, hz] = REGION_POS.lumenhafen;
  h -= Math.max(0, 1 - Math.hypot(x - hx, z - hz - 6) / 7) * 2.5;
  return h;
}

function nearestRegion(x: number, z: number): [RegionId, number] {
  let best: RegionId = 'kleeweiler';
  let bd = 1e9;
  for (const [id, [rx, rz]] of Object.entries(REGION_POS) as [RegionId, [number, number]][]) {
    const d = Math.hypot(x - rx, z - rz);
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  return [best, bd];
}

export function buildMapScene(unlocked: Set<RegionId>, evening = false) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(evening ? '#20304a' : '#9cc4e4');
  scene.fog = new THREE.Fog(evening ? 0x20304a : 0x9cc4e4, 200, 420);
  scene.environmentIntensity = 0.3;
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x3a4a3a, 0.7));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
  sun.position.set(40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -70;
  sc.right = sc.top = 70;
  sc.far = 200;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // Gelände
  const geo = new THREE.PlaneGeometry(140, 100, 180, 130);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const [reg, dist] = nearestRegion(x, z);
    if (h < 0.25) c.set('#d8c99a');
    else if (h > 8.5) c.set('#f4f6f8');
    else if (h > 5.5) c.set('#8a8a82');
    else {
      c.set('#6f9a48');
      c.lerp(new THREE.Color(BIOME[reg]), Math.max(0, Math.min(1, 1.3 - dist / 11)));
      const n = fbm(x * 0.3, z * 0.3);
      c.offsetHSL(0, 0, (n - 0.5) * 0.12);
      if (h < 0.7) c.lerp(new THREE.Color('#d8c99a'), (0.7 - h) / 0.45);
    }
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }));
  land.receiveShadow = true;
  land.castShadow = true;
  scene.add(land);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshPhysicalMaterial({ color: '#2f78a6', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.05;
  water.receiveShadow = true;
  scene.add(water);
  // Fluss
  const pts: THREE.Vector3[] = [];
  for (let x = -40; x <= 6; x += 2) pts.push(new THREE.Vector3(x, 0, 4 + Math.sin(x * 0.12) * 4));
  const river = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.9, 6, false), new THREE.MeshPhysicalMaterial({ color: '#3a86b0', roughness: 0.1 }));
  river.scale.y = 0.15;
  river.position.y = 0.2;
  scene.add(river);

  // Siedlungen
  const rnd = (s: number) => {
    let x = s;
    return () => {
      x = (x * 16807) % 2147483647;
      return (x - 1) / 2147483646;
    };
  };
  const houseMats = ['#efe4cc', '#e6d6bb', '#d9b48a', '#f4f3ef', '#c9d3c0'].map((col) => std(col, { roughness: 0.8 }));
  const roofMats = ['#9b4a32', '#7a3e2d', '#5b5f68', '#6d4a3a'].map((col) => std(col, { roughness: 0.7 }));
  const towerMat = new THREE.MeshPhysicalMaterial({ color: '#8fa9c0', roughness: 0.1, metalness: 0.4 });
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofGeo = new THREE.ConeGeometry(0.75, 0.6, 4);
  for (const [id, [rx, rz]] of Object.entries(REGION_POS) as [RegionId, [number, number]][]) {
    const R = rnd(id.length * 9973 + rx * 31);
    const n = id === 'kronstadt' ? 40 : id === 'lumenhafen' ? 26 : id === 'neuwerk' ? 10 : 14;
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2;
      const rr = Math.sqrt(R()) * (id === 'kronstadt' ? 6 : 4.5);
      const x = rx + Math.cos(a) * rr;
      const z = rz + Math.sin(a) * rr;
      const y = heightAt(x, z);
      if (y < 0.3) continue;
      if (id === 'kronstadt' || (id === 'lumenhafen' && R() < 0.3)) {
        const h = id === 'kronstadt' ? 1.5 + R() * (rr < 3 ? 6 : 3) : 1.6;
        const m = new THREE.Mesh(houseGeo, id === 'kronstadt' && R() < 0.5 ? towerMat : houseMats[Math.floor(R() * 5)]);
        m.scale.set(1.2, h, 1.2);
        m.position.set(x, y + h / 2, z);
        m.castShadow = true;
        scene.add(m);
      } else if (id === 'pilzhain' && R() < 0.5) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), std('#c4322a'));
        cap.position.set(x, y + 0.7, z);
        scene.add(cap);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.7, 10), std('#f3e9d4'));
        st.position.set(x, y + 0.35, z);
        scene.add(st);
      } else if (id === 'neuwerk' && R() < 0.6) {
        const m = new THREE.Mesh(houseGeo, std('#8a7a68'));
        m.scale.set(3, 1.2, 1.8);
        m.position.set(x, y + 0.6, z);
        m.castShadow = true;
        scene.add(m);
      } else {
        const m = new THREE.Mesh(houseGeo, houseMats[Math.floor(R() * 5)]);
        m.scale.set(0.9, 0.7, 0.9);
        m.position.set(x, y + 0.35, z);
        m.castShadow = true;
        scene.add(m);
        const r = new THREE.Mesh(roofGeo, roofMats[Math.floor(R() * 4)]);
        r.position.set(x, y + 1.0, z);
        r.rotation.y = Math.PI / 4;
        r.castShadow = true;
        scene.add(r);
      }
    }
    if (id === 'sonnenkueste') {
      const lt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.2, 12), std('#f4f2ec'));
      lt.position.set(rx + 7, heightAt(rx + 7, rz + 3) + 1.6, rz + 3);
      scene.add(lt);
    }
  }
  // Wälder
  const treeGeo = new THREE.ConeGeometry(0.55, 1.5, 6);
  const treeMat = std('#2f5a33', { roughness: 0.9 });
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, 900);
  const m4 = new THREE.Matrix4();
  let ti = 0;
  const R = rnd(4242);
  for (let k = 0; k < 4000 && ti < 900; k++) {
    const x = (R() - 0.5) * 120;
    const z = (R() - 0.5) * 84;
    const h = heightAt(x, z);
    if (h < 0.6 || h > 7) continue;
    const [reg, dist] = nearestRegion(x, z);
    const dens = reg === 'pilzhain' ? 0.9 : reg === 'wolkenspitz' ? 0.5 : reg === 'kronstadt' || reg === 'sonnenkueste' ? 0.05 : 0.18;
    if (dist < 4 || R() > dens) continue;
    const s = 0.7 + R() * 0.8;
    m4.makeScale(s, s, s).setPosition(x, h + 0.7 * s, z);
    trees.setMatrixAt(ti++, m4);
  }
  trees.count = ti;
  trees.castShadow = true;
  scene.add(trees);

  // Nebel über gesperrten Regionen
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.82, roughness: 1 });
  for (const [id, [rx, rz]] of Object.entries(REGION_POS) as [RegionId, [number, number]][]) {
    if (unlocked.has(id)) continue;
    const R2 = rnd(id.length * 31 + 7);
    for (let k = 0; k < 9; k++) {
      const cl = new THREE.Mesh(new THREE.SphereGeometry(2.4 + R2() * 2.2, 14, 10), cloudMat);
      cl.position.set(rx + (R2() - 0.5) * 11, heightAt(rx, rz) + 3 + R2() * 2.5, rz + (R2() - 0.5) * 9);
      cl.scale.y = 0.55;
      scene.add(cl);
    }
  }
  return scene;
}

export function regionLabelPos(id: RegionId) {
  const [x, z] = REGION_POS[id];
  return new THREE.Vector3(x, heightAt(x, z) + (id === 'wolkenspitz' ? 3 : 2.5), z);
}

export function regionSnapshotCamera(id: RegionId) {
  const [x, z] = REGION_POS[id];
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 400);
  const y = heightAt(x, z);
  cam.position.set(x + 9, y + 9, z + 13);
  cam.lookAt(x, y + 0.8, z);
  return cam;
}
