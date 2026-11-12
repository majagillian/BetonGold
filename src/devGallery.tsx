// Entwickler-Galerie (nur mit ?gallery aufrufbar)
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { buildHouseScene } from './three/houseModel';
import { requestSnapshot } from './three/core';
import type { HouseStyle, RegionId } from './game/types';

const STYLES: [HouseStyle, RegionId][] = [
  ['fachwerk', 'kleeweiler'], ['bauernhof', 'kleeweiler'], ['reihenhaus', 'muehlental'], ['muehle', 'muehlental'], ['altbau', 'muehlental'],
  ['speicher', 'lumenhafen'], ['mfh', 'lumenhafen'], ['pilz', 'pilzhain'], ['baumhaus', 'pilzhain'], ['chalet', 'wolkenspitz'], ['villa', 'sonnenkueste'],
  ['leuchtturm', 'sonnenkueste'], ['penthouse', 'kronstadt'], ['hochhaus', 'kronstadt'], ['gruenderzeit', 'kronstadt'], ['neubau_efh', 'pilzhain'],
  ['neubau_mfh', 'neuwerk'], ['wohnanlage', 'neuwerk'], ['quartier', 'neuwerk'], ['grundstueck', 'kleeweiler'],
];

function Img({ i }: { i: number }) {
  const [url, setUrl] = useState('');
  const [style, region] = STYLES[i % STYLES.length];
  const q = [0.1, 0.6, 0.95][i % 3];
  const lit = i % 4 === 3;
  const state = i === 4 ? 'renovating' : i === 16 ? 'building' : i === 2 ? 'forSale' : 'idle';
  useEffect(() => requestSnapshot(`g${i}`, 400, 300, () => buildHouseScene({ style, region, quality: q, lit, state: state as 'idle', seed: i }), setUrl), []);
  return <div style={{ width: '200px', display: 'inline-block', font: '11px sans-serif' }}><img src={url} width={200} height={150} /><br />{style} q{q}</div>;
}

export function mountGallery(el: HTMLElement) {
  render(<div>{STYLES.map((_, i) => <Img key={i} i={i} />)}</div>, el);
}

import { buildRoomScene, type Furnishing } from './three/roomModel';
import type { Room } from './game/types';
const ROOMS: [Room, Furnishing, boolean][] = [
  [{ id: 'a', type: 'wohnen', size: 28, floor: 'fischgraet', wall: 'salbei' }, 'skandi', false],
  [{ id: 'b', type: 'wohnen', size: 24, floor: 'teppich_alt', wall: 'tapete_alt' }, 'old', false],
  [{ id: 'c', type: 'kueche', size: 12, floor: 'fliesen_hell', wall: 'weiss', kitchen: 'landhaus' }, 'landhaus', false],
  [{ id: 'd', type: 'wohnkueche', size: 38, floor: 'vinyl_beton', wall: 'anthrazit', kitchen: 'insel' }, 'industrial', true],
  [{ id: 'e', type: 'bad', size: 8, floor: 'marmor', wall: 'weiss', bath: 'spa' }, 'luxus', false],
  [{ id: 'f', type: 'bad', size: 6, floor: 'linoleum', wall: 'weiss', bath: 'alt' }, null, false],
  [{ id: 'g', type: 'schlafen', size: 16, floor: 'parkett_eiche', wall: 'nachtblau' }, 'luxus', true],
  [{ id: 'h', type: 'kind', size: 12, floor: 'laminat', wall: 'altrosa' }, 'tenant', false],
  [{ id: 'i', type: 'bad', size: 7, floor: 'fliesen_dunkel', wall: 'grau', bath: 'modern' }, null, false],
  [{ id: 'j', type: 'flur', size: 8, floor: 'dielen_alt', wall: 'tapete_alt' }, null, false],
];
function RoomImg({ i }: { i: number }) {
  const [url, setUrl] = useState('');
  const [room, f, ev] = ROOMS[i];
  useEffect(() => requestSnapshot(`room${i}`, 480, 360, () => {
    const r = buildRoomScene({ room, furnishing: f, evening: ev, defects: i === 1 || i === 5 || i === 9 ? [{ id: 'x', type: i === 5 ? 'schimmel' : i === 9 ? 'elektrik' : 'riss', roomId: room.id, cost: 1, main: true, found: i === 9, fixed: false, spot: [0.7, 0.5] }] : [] });
    return { scene: r.scene, camera: r.camera };
  }, setUrl), []);
  return <div style={{ width: '320px', display: 'inline-block', font: '11px sans-serif' }}><img src={url} width={320} height={240} /><br />{room.type}</div>;
}
export function mountRooms(el: HTMLElement) {
  render(<div>{ROOMS.map((_, i) => <RoomImg key={i} i={i} />)}</div>, el);
}

import { MapView, RegionImage } from './ui/three3d';
import { REGIONS } from './game/data';
export function mountMap(el: HTMLElement) {
  render(
    <div>
      <div style={{ width: '390px', height: '520px', position: 'relative', display: 'inline-block' }}><MapView level={4} onSelect={() => {}} owned={{ kleeweiler: 2 }} /></div>
      <div style={{ display: 'inline-block', width: '560px', verticalAlign: 'top' }}>{REGIONS.map((r) => <div style={{ width: '270px', display: 'inline-block' }}><RegionImage id={r.id} level={6} /></div>)}</div>
    </div>,
    el,
  );
}
