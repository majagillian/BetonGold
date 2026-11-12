// Brücke zwischen UI und 3D: Bilder, Raum-Rundgang, Weltkarte
import { useEffect, useRef, useState } from 'preact/hooks';
import * as THREE from 'three';
import { configureRenderer, environment, requestSnapshot, cachedSnapshot, webglAvailable, disposeScene } from '../three/core';
import { buildHouseScene, type HouseRenderOpts } from '../three/houseModel';
import { buildRoomScene, type Furnishing, type RoomScene } from '../three/roomModel';
import { buildMapScene, regionLabelPos, regionSnapshotCamera, REGION_POS } from '../three/mapModel';
import type { Defect, Property, RegionId, Room } from '../game/types';
import { rawQuality } from '../game/econ';
import { House } from '../art/House';
import { REGIONS, regionById } from '../game/data';

export function useSnapshot(key: string, w: number, h: number, build: () => { scene: THREE.Scene; camera: THREE.Camera }, keep = false) {
  const [url, setUrl] = useState<string | undefined>(() => cachedSnapshot(key));
  useEffect(() => {
    let alive = true;
    const c = cachedSnapshot(key);
    if (c) {
      setUrl(c);
      return;
    }
    setUrl(undefined);
    requestSnapshot(key, w, h, build, (u) => alive && setUrl(u), keep);
    return () => {
      alive = false;
    };
  }, [key]);
  return url;
}

export function houseOpts(p: Property): HouseRenderOpts {
  return {
    style: p.style,
    region: p.region,
    quality: rawQuality(p),
    lit: p.units.some((u) => u.tenant),
    state: p.status === 'idle' ? 'idle' : p.status,
    wallColor: p.facadeColor,
    extras: p.extras,
    seed: p.seed ?? p.id.length,
  };
}

export function HouseImage({ p, opts, class: cls, big }: { p?: Property; opts?: HouseRenderOpts; class?: string; big?: boolean }) {
  const o = opts ?? houseOpts(p!);
  const q = Math.round(o.quality * 10);
  const key = `h:${o.style}:${o.region}:${q}:${o.lit ? 1 : 0}:${o.state}:${o.wallColor ?? ''}:${(o.extras ?? []).join(',')}:${o.seed ?? 0}:${big ? 'b' : 's'}`;
  const gl = webglAvailable();
  const url = gl ? useSnapshot(key, big ? 720 : 360, big ? 540 : 270, () => buildHouseScene(o)) : undefined;
  if (!gl) return <House style={o.style} region={o.region} quality={o.quality} lit={o.lit} state={o.state} class={cls} />;
  return url ? <img src={url} class={`img3d ${cls ?? ''}`} alt="" draggable={false} /> : <div class={`img3d loading ${cls ?? ''}`} />;
}

let mapSceneCache: { key: string; scene: THREE.Scene } | null = null;
function sharedMapScene(unlocked: Set<RegionId>) {
  const key = [...unlocked].sort().join(',');
  if (!mapSceneCache || mapSceneCache.key !== key) {
    if (mapSceneCache) disposeScene(mapSceneCache.scene);
    mapSceneCache = { key, scene: buildMapScene(unlocked) };
  }
  return mapSceneCache.scene;
}

export function RegionImage({ id, level, class: cls }: { id: RegionId; level: number; class?: string }) {
  const unlocked = new Set(REGIONS.filter((r) => level >= r.unlockLevel).map((r) => r.id));
  const key = `region:${id}:${[...unlocked].length}`;
  const url = webglAvailable() ? useSnapshot(key, 640, 300, () => ({ scene: sharedMapScene(unlocked), camera: regionSnapshotCamera(id) }), true) : undefined;
  return url ? <img src={url} class={`img3d ${cls ?? ''}`} alt={regionById(id).name} draggable={false} /> : <div class={`img3d loading ${cls ?? ''}`} />;
}

export function RoomImage({ room, furnishing, defects, tall, outside, class: cls }: { room: Room; furnishing: Furnishing; defects: Defect[]; tall?: boolean; outside?: 'garden' | 'city' | 'snow' | 'sea' | 'forest'; class?: string }) {
  const key = `room:${JSON.stringify(room)}:${furnishing}:${defects.map((d) => `${d.id}${d.found ? 1 : 0}${d.fixed ? 1 : 0}`).join(',')}:${tall ? 1 : 0}:${outside}`;
  const url = webglAvailable()
    ? useSnapshot(key, 480, 360, () => {
        const r = buildRoomScene({ room, furnishing, defects, tall, outside });
        return { scene: r.scene, camera: r.camera };
      })
    : undefined;
  return url ? <img src={url} class={`img3d ${cls ?? ''}`} alt="" draggable={false} /> : <div class={`img3d loading ${cls ?? ''}`} />;
}

// ---------- Live-Rundgang ----------
export function RoomViewer({
  room, furnishing, defects, tall, outside, onFind, onMiss,
}: {
  room: Room; furnishing: Furnishing; defects: Defect[]; tall?: boolean; outside?: 'garden' | 'city' | 'snow' | 'sea' | 'forest';
  onFind?: (id: string) => void; onMiss?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ r?: THREE.WebGLRenderer; rs?: RoomScene; yaw: number; pitch: number; render?: () => void }>({ yaw: 0, pitch: 0 });
  const key = `${JSON.stringify(room)}|${furnishing}|${defects.map((d) => `${d.id}${d.found}${d.fixed}`).join(',')}`;

  useEffect(() => {
    const canvas = ref.current!;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio));
    configureRenderer(r);
    state.current.r = r;
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      r.setSize(w, h, false);
      if (state.current.rs) {
        state.current.rs.camera.aspect = w / h;
        state.current.rs.camera.updateProjectionMatrix();
      }
      state.current.render?.();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      if (state.current.rs) disposeScene(state.current.rs.scene);
      r.dispose();
      r.forceContextLoss();
    };
  }, []);

  useEffect(() => {
    const st = state.current;
    const r = st.r!;
    if (st.rs) disposeScene(st.rs.scene);
    const rs = buildRoomScene({ room, furnishing, defects, tall, outside });
    rs.scene.environment = environment(r);
    const sameRoom = (st as { roomId?: string }).roomId === room.id;
    st.rs = rs;
    if (!sameRoom) {
      st.yaw = rs.baseYaw;
      st.pitch = -0.08;
    }
    (st as { roomId?: string }).roomId = room.id;
    const canvas = ref.current!;
    rs.camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    rs.camera.updateProjectionMatrix();
    st.render = () => {
      const c = rs.camera;
      const dir = new THREE.Vector3(-Math.sin(st.yaw) * Math.cos(st.pitch), Math.sin(st.pitch), -Math.cos(st.yaw) * Math.cos(st.pitch));
      c.position.copy(rs.eye);
      c.lookAt(rs.eye.clone().add(dir));
      r.render(rs.scene, c);
    };
    st.render();
  }, [key]);

  // Interaktion
  useEffect(() => {
    const canvas = ref.current!;
    let down: { x: number; y: number; yaw: number; pitch: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, yaw: state.current.yaw, pitch: state.current.pitch, moved: false };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
      state.current.yaw = down.yaw + dx * 0.006;
      state.current.pitch = Math.max(-0.7, Math.min(0.6, down.pitch + dy * 0.004));
      state.current.render?.();
    };
    const onUp = (e: PointerEvent) => {
      if (down && !down.moved) {
        const rect = canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        const rs = state.current.rs;
        if (rs) {
          const ray = new THREE.Raycaster();
          ray.setFromCamera(ndc, rs.camera);
          const hits = ray.intersectObjects([...rs.defectMeshes.values()], false);
          // Toleranz: auch knapp daneben zählt
          let id: string | undefined = hits[0]?.object.userData.defectId;
          if (!id) {
            for (const [did, m] of rs.defectMeshes) {
              const p = m.position.clone().project(rs.camera);
              if (Math.hypot(p.x - ndc.x, p.y - ndc.y) < 0.18 && p.z < 1) id = did;
            }
          }
          if (id) onFind?.(id);
          else onMiss?.();
        }
      }
      down = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', () => (down = null));
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, [onFind, onMiss]);

  return <canvas ref={ref} class="room-canvas" />;
}

// ---------- Weltkarte ----------
export function MapView({ level, onSelect, owned }: { level: number; onSelect: (id: RegionId) => void; owned: Record<string, number> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [labels, setLabels] = useState<{ id: RegionId; x: number; y: number; vis: boolean }[]>([]);
  const unlocked = new Set(REGIONS.filter((r) => level >= r.unlockLevel).map((r) => r.id));
  const cam = useRef({ tx: -12, tz: 2, dist: 92, rot: 0 });

  useEffect(() => {
    const canvas = ref.current!;
    if (!webglAvailable()) return;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio));
    configureRenderer(r);
    const scene = buildMapScene(unlocked);
    scene.environment = environment(r);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 500);
    let frame = 0;
    const render = () => {
      const c = cam.current;
      camera.position.set(c.tx + Math.sin(c.rot) * c.dist * 0.5, c.dist * 0.8, c.tz + Math.cos(c.rot) * c.dist * 0.5);
      camera.lookAt(c.tx, 0, c.tz);
      r.render(scene, camera);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      setLabels(
        (Object.keys(REGION_POS) as RegionId[]).map((id) => {
          const p = regionLabelPos(id).project(camera);
          return { id, x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, vis: p.z < 1 && p.x > -1.1 && p.x < 1.1 && p.y > -1.1 && p.y < 1.1 };
        }),
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    };
    let first = true;
    const resize = () => {
      r.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      if (first) {
        const portrait = camera.aspect < 1;
        cam.current.rot = portrait ? Math.PI / 2 : 0;
        cam.current.dist = portrait ? Math.min(250, 44 / (Math.tan((19 * Math.PI) / 180) * camera.aspect)) : 120;
        first = false;
      }
      camera.updateProjectionMatrix();
      schedule();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Gesten
    const pts = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number; d?: number } | null = null;
    const onDown = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      last = null;
    };
    const onMove = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const arr = [...pts.values()];
      const c = cam.current;
      if (arr.length === 1) {
        const p = arr[0];
        if (last) {
          const k = c.dist / 520;
          const dx = (p.x - last.x) * k;
          const dy = (p.y - last.y) * k;
          c.tx = Math.max(-50, Math.min(50, c.tx - dx * Math.cos(c.rot) - dy * Math.sin(c.rot)));
          c.tz = Math.max(-38, Math.min(38, c.tz + dx * Math.sin(c.rot) - dy * Math.cos(c.rot)));
        }
        last = { x: p.x, y: p.y };
      } else if (arr.length >= 2) {
        const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
        if (last?.d) c.dist = Math.max(28, Math.min(280, c.dist * (last.d / d)));
        last = { x: 0, y: 0, d };
      }
      schedule();
    };
    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      last = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.current.dist = Math.max(28, Math.min(280, cam.current.dist * (1 + e.deltaY * 0.001)));
      schedule();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      disposeScene(scene);
      r.dispose();
      r.forceContextLoss();
    };
  }, [level]);

  return (
    <div class="map-wrap">
      <canvas ref={ref} class="map-canvas" />
      {labels.filter((l) => l.vis).map((l) => {
        const reg = regionById(l.id);
        const open = unlocked.has(l.id);
        return (
          <button key={l.id} class={`map-pin ${open ? '' : 'locked'}`} style={{ left: `${l.x}px`, top: `${l.y}px` }} onClick={() => open && onSelect(l.id)}>
            <span class="map-pin-name">{reg.name}</span>
            <span class="map-pin-sub">{open ? (owned[l.id] ? `${owned[l.id]} Objekt${owned[l.id] > 1 ? 'e' : ''}` : reg.type) : `Ab Level ${reg.unlockLevel}`}</span>
          </button>
        );
      })}
      <div class="map-hint">Ziehen zum Verschieben · zwei Finger zum Zoomen</div>
    </div>
  );
}

// Materialmuster für den Planer
import { floorTexture, type FloorTex } from '../three/textures';
const swatchCache = new Map<string, string>();
export function floorSwatch(id: string) {
  if (swatchCache.has(id)) return swatchCache.get(id)!;
  try {
    const t = floorTexture(id as FloorTex);
    const src = t.image as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 80;
    c.getContext('2d')!.drawImage(src, 0, 0, 256, 128, 0, 0, 160, 80);
    const url = c.toDataURL('image/jpeg', 0.8);
    swatchCache.set(id, url);
    return url;
  } catch {
    return '';
  }
}
