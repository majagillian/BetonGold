import { useCallback, useState } from 'preact/hooks';
import * as E from '../game/engine';
import { defectDef, ROOM_NAMES } from '../game/interior';
import type { GameState } from '../game/types';
import { Icon } from './icons';
import { RoomImage, RoomViewer } from './three3d';
import { isTall, outsideFor, tourFurnishing, type Act, type TourTarget } from './sheets';
import { sfx } from './sound';

export function Tour({ s, target, act, onClose, toast }: { s: GameState; target: TourTarget; act: Act; onClose: () => void; toast: (t: string) => void }) {
  const offer = target.kind === 'offer' ? s.offers.find((o) => o.id === target.id) : undefined;
  const p = offer ? offer.property : s.properties.find((x) => x.id === target.id);
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(0);
  const [miss, setMiss] = useState(false);
  const rooms = p?.rooms ?? [];
  const room = rooms[Math.min(idx, rooms.length - 1)];
  const defects = (p?.defects ?? []).filter((d) => !d.fixed);
  const roomDefects = room ? defects.filter((d) => d.roomId === room.id) : [];
  const pid = p?.id ?? '';
  const onFind = useCallback(
    (id: string) => {
      const d = defects.find((x) => x.id === id);
      if (!d) return;
      if (d.found) {
        toast(`Schon entdeckt: ${defectDef(d.type).name}`);
        return;
      }
      act((st) => E.findDefect(st, pid, id));
      sfx.found();
      setFlash((f) => f + 1);
    },
    [pid, defects.map((d) => `${d.id}${d.found}`).join()],
  );
  const onMiss = useCallback(() => {
    setMiss(true);
    sfx.tick();
    setTimeout(() => setMiss(false), 900);
  }, []);
  if (!p || !room) return null;
  const furn = tourFurnishing(s, p);
  const found = defects.filter((d) => d.found);
  const hidden = defects.filter((d) => !d.found).length;
  return (
    <div class="tour">
      <div class="tour-view">
        <RoomViewer room={room} furnishing={furn} defects={roomDefects} tall={isTall(p)} outside={outsideFor(p.region)} onFind={onFind} onMiss={onMiss} />
        {flash > 0 && <div class="tour-flash" key={flash} />}
        <div class="tour-top">
          <div class="title">
            {ROOM_NAMES[room.type]} · {room.size} m²
            <small>{p.name}</small>
          </div>
          <button class="glassbtn" onClick={onClose} aria-label="Schließen">
            <Icon name="close" />
          </button>
        </div>
        <div class="tour-hint">{miss ? 'Hier ist nichts Auffälliges' : 'Wischen zum Umsehen · Tippen, um Mängel zu markieren'}</div>
        <div class="tour-found">
          <span class={`pill ${found.length ? 'red' : ''}`}>
            <Icon name="search" size={14} /> {found.length} Mangel gefunden
          </span>
          {offer && hidden > 0 && <span class="pill">Hier versteckt sich noch etwas …</span>}
          {found.map((d) => (
            <span key={d.id} class="pill">{defectDef(d.type).name}</span>
          ))}
        </div>
      </div>
      <div class="tour-rooms">
        {rooms.map((r, i) => (
          <button key={r.id} class={`tour-room ${i === idx ? 'on' : ''}`} onClick={() => { setIdx(i); sfx.tap(); }}>
            <div class="thumb">
              <RoomImage room={r} furnishing={furn} defects={defects.filter((d) => d.roomId === r.id && d.found)} tall={isTall(p)} outside={outsideFor(p.region)} />
            </div>
            {ROOM_NAMES[r.type]}
            {defects.some((d) => d.roomId === r.id && d.found) && <span class="dot" />}
          </button>
        ))}
      </div>
    </div>
  );
}
