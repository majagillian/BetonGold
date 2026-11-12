import { useMemo, useState } from 'preact/hooks';
import * as E from '../game/engine';
import { fmt, fmtShort, marketRent, propertyValue } from '../game/econ';
import {
  applyPlan, BATHS, defectDef, emptyPlan, FACADE_COLORS, FLOORS, KITCHENS, LAYOUTS, ROOM_NAMES, WALLS, appeal,
} from '../game/interior';
import { TIER_NAMES } from '../game/data';
import type { GameState, LayoutId, Property, RenoPlan, Tier } from '../game/types';
import { Money, Progress } from './common';
import { Icon } from './icons';
import { floorSwatch, HouseImage, RoomViewer } from './three3d';
import { isTall, outsideFor, tourFurnishing, type Act } from './sheets';
import { sfx } from './sound';

type Sec = 'boden' | 'wand' | 'kueche' | 'bad' | 'grundriss' | 'maengel' | 'haus';

export function Planner({ s, pid, act, onClose }: { s: GameState; pid: string; act: Act; onClose: () => void }) {
  const p = s.properties.find((x) => x.id === pid);
  const [plan, setPlan] = useState<RenoPlan>(emptyPlan());
  const [idx, setIdx] = useState(0);
  const [sec, setSec] = useState<Sec>('boden');
  const preview = useMemo(() => {
    if (!p) return null;
    const c = structuredClone(p) as Property;
    applyPlan(c, plan);
    return c;
  }, [p, plan]);
  if (!p || !preview) return null;
  const rooms = preview.rooms ?? [];
  const room = rooms[Math.min(idx, rooms.length - 1)];
  const orig = (p.rooms ?? []).find((r) => r.id === room?.id);
  const { total, lines, months } = E.planTotal(s, p, plan);
  const vBefore = propertyValue(s, p);
  const vAfter = propertyValue(s, preview);
  const rentBefore = p.units.reduce((a, u) => a + marketRent(s, p, u), 0);
  const rentAfter = preview.units.reduce((a, u) => a + marketRent(s, preview, u), 0);
  const setRoom = (k: 'floor' | 'wall' | 'kitchen' | 'bath', v: string) => {
    if (!orig) return;
    const cur = { ...(plan.rooms[orig.id] ?? {}) } as Record<string, string>;
    if ((orig as unknown as Record<string, string>)[k] === v) delete cur[k];
    else cur[k] = v;
    setPlan({ ...plan, rooms: { ...plan.rooms, [orig.id]: cur } });
    sfx.tap();
  };
  const toggleLayout = (id: LayoutId) => {
    const has = plan.layout.some((l) => l.id === id);
    setPlan({ ...plan, layout: has ? plan.layout.filter((l) => l.id !== id) : [...plan.layout, { id }] });
    sfx.tap();
  };
  const toggleFix = (id: string) => {
    setPlan({ ...plan, fix: plan.fix.includes(id) ? plan.fix.filter((x) => x !== id) : [...plan.fix, id] });
    sfx.tap();
  };
  const wet = room && (room.type === 'bad' || room.type === 'wc');
  const secs: { id: Sec; label: string }[] = [
    { id: 'boden', label: 'Boden' },
    { id: 'wand', label: 'Wände' },
    ...(room?.kitchen ? [{ id: 'kueche' as Sec, label: 'Küche' }] : []),
    ...(room?.bath ? [{ id: 'bad' as Sec, label: 'Bad' }] : []),
    { id: 'grundriss', label: 'Grundriss' },
    { id: 'maengel', label: `Mängel${(p.defects ?? []).some((d) => d.found && !d.fixed) ? ' !' : ''}` },
    { id: 'haus', label: 'Haus' },
  ];
  const curSec = secs.some((x) => x.id === sec) ? sec : 'boden';
  const roomPlanned = (rid: string) => !!plan.rooms[rid] && Object.keys(plan.rooms[rid]).length > 0;
  const furn = tourFurnishing(s, p);
  const units = Math.max(1, p.units.length);

  return (
    <div class="tour">
      <div class="tour-view" style={{ flex: '0 0 38%' }}>
        {room && (
          <RoomViewer
            room={room}
            furnishing={furn}
            defects={(preview.defects ?? []).filter((d) => d.roomId === room.id && d.found && !d.fixed)}
            tall={isTall(p)}
            outside={outsideFor(p.region)}
          />
        )}
        <div class="tour-top">
          <div class="title">
            Renovierung planen
            <small>{p.name}{units > 1 ? ` · gilt für alle ${units} Wohnungen` : ''}</small>
          </div>
          <button class="glassbtn" onClick={onClose} aria-label="Schließen">
            <Icon name="close" />
          </button>
        </div>
      </div>
      <div class="tour-rooms" style={{ paddingBottom: '10px' }}>
        {rooms.map((r, i) => (
          <button key={r.id} class={`tour-room ${i === idx ? 'on' : ''}`} style={{ width: 'auto', padding: '8px 12px' }} onClick={() => setIdx(i)}>
            {ROOM_NAMES[r.type]} · {r.size} m²
            {roomPlanned(r.id) && <span class="dot" style={{ background: 'var(--gold2)' }} />}
          </button>
        ))}
      </div>
      <div class="tour-panel" style={{ flex: 1, maxHeight: 'none' }}>
        <div class="subtabs">
          {secs.map((x) => (
            <button key={x.id} class={curSec === x.id ? 'on' : ''} onClick={() => setSec(x.id)}>{x.label}</button>
          ))}
        </div>
        {curSec === 'boden' && room && (
          <div class="mat-grid">
            {FLOORS.filter((f) => f.tier > 0 || f.id === orig?.floor).filter((f) => (wet ? f.wet : f.dry)).map((f) => (
              <button key={f.id} class={`mat ${room.floor === f.id ? 'on' : ''} ${orig?.floor === f.id ? 'cur' : ''}`} onClick={() => setRoom('floor', f.id)}>
                <div class="sw" style={{ backgroundImage: `url(${floorSwatch(f.id)})` }} />
                {f.name}
                <div class="pr">{orig?.floor === f.id ? 'aktuell' : `${fmt((f.cost + 15) * room.size * units)}`} · {TIER_NAMES[f.tier]}</div>
              </button>
            ))}
          </div>
        )}
        {curSec === 'wand' && room && (
          <div class="mat-grid">
            {WALLS.filter((w) => w.id !== 'tapete_alt' || orig?.wall === 'tapete_alt').map((w) => (
              <button key={w.id} class={`mat ${room.wall === w.id ? 'on' : ''} ${orig?.wall === w.id ? 'cur' : ''}`} onClick={() => setRoom('wall', w.id)}>
                <div class="sw" style={{ background: w.hex }} />
                {w.name}
                <div class="pr">{orig?.wall === w.id ? 'aktuell' : fmt(18 * room.size * units)}</div>
              </button>
            ))}
          </div>
        )}
        {curSec === 'kueche' && room?.kitchen && (
          <div>
            {KITCHENS.filter((k) => k.id !== 'alt' || orig?.kitchen === 'alt').map((k) => {
              const blocked = k.minSize && room.size < k.minSize && room.type !== 'wohnkueche';
              return (
                <button key={k.id} class="option" disabled={!!blocked} style={room.kitchen === k.id ? { borderColor: 'var(--navy)', boxShadow: '0 0 0 1.5px var(--navy)' } : undefined} onClick={() => setRoom('kitchen', k.id)}>
                  <span class="grow">
                    {k.name}
                    <small>{TIER_NAMES[k.tier]}{blocked ? ' · Raum zu klein (Wand durchbrechen!)' : ''}</small>
                  </span>
                  <span class="cost">{orig?.kitchen === k.id ? 'aktuell' : fmt(k.cost * units)}</span>
                </button>
              );
            })}
          </div>
        )}
        {curSec === 'bad' && room?.bath && (
          <div>
            {BATHS.filter((b) => b.id !== 'alt' || orig?.bath === 'alt').map((b) => (
              <button key={b.id} class="option" style={room.bath === b.id ? { borderColor: 'var(--navy)', boxShadow: '0 0 0 1.5px var(--navy)' } : undefined} onClick={() => setRoom('bath', b.id)}>
                <span class="grow">
                  {b.name}
                  <small>{TIER_NAMES[b.tier]}</small>
                </span>
                <span class="cost">{orig?.bath === b.id ? 'aktuell' : fmt(b.cost * (room.type === 'wc' ? 0.4 : 1) * units)}</span>
              </button>
            ))}
          </div>
        )}
        {curSec === 'grundriss' && (
          <div>
            {LAYOUTS.map((l) => {
              const on = plan.layout.some((x) => x.id === l.id);
              const why = on ? null : l.can(p);
              return (
                <button key={l.id} class="option" disabled={!!why} style={on ? { borderColor: 'var(--navy)', boxShadow: '0 0 0 1.5px var(--navy)' } : undefined} onClick={() => toggleLayout(l.id)}>
                  <span class="ev-icon" style={{ background: on ? '#e8eef8' : 'var(--surface2)', color: 'var(--navy)' }}>
                    <Icon name={l.id === 'durchbruch' ? 'wall' : l.id === 'teilen' ? 'ruler' : l.id === 'wc' ? 'water' : l.id === 'dach' ? 'home' : 'build'} />
                  </span>
                  <span class="grow">
                    {l.name}
                    <small>{why ?? l.desc}</small>
                  </span>
                  <span class="cost">{on ? <Icon name="check" /> : fmtShort(l.cost(p) * (l.id === 'balkon' ? Math.min(units, 6) : units))}</span>
                </button>
              );
            })}
          </div>
        )}
        {curSec === 'maengel' && (
          <div>
            {(p.defects ?? []).filter((d) => d.found && !d.fixed).length === 0 && <p class="hint">Keine bekannten offenen Mängel. Versteckte Mängel findest du beim Rundgang.</p>}
            {(p.defects ?? []).filter((d) => d.found && !d.fixed).map((d) => (
              <button key={d.id} class="option" style={plan.fix.includes(d.id) ? { borderColor: 'var(--green)', boxShadow: '0 0 0 1.5px var(--green)' } : undefined} onClick={() => toggleFix(d.id)}>
                <span class="ev-icon"><Icon name="warn" /></span>
                <span class="grow">
                  {defectDef(d.type).name}{d.main ? ' (Hauptmangel)' : ''}
                  <small>{defectDef(d.type).desc}</small>
                </span>
                <span class="cost">{plan.fix.includes(d.id) ? <Icon name="check" /> : fmt(d.cost)}</span>
              </button>
            ))}
          </div>
        )}
        {curSec === 'haus' && (
          <div>
            {(['elektrik', 'fassade'] as const).map((k) => (
              <div key={k} class="card flat">
                <div class="row between">
                  <h3>{k === 'elektrik' ? 'Elektrik & Heizung' : 'Fassade & Dach'}</h3>
                  <span class="pill">aktuell: {TIER_NAMES[p.tiers[k]]}</span>
                </div>
                <div class="seg mt">
                  {[1, 2, 3].map((t) => (
                    <button key={t} disabled={t <= p.tiers[k]} class={(plan[k] ?? p.tiers[k]) === t && t > p.tiers[k] ? 'on' : ''} onClick={() => setPlan({ ...plan, [k]: plan[k] === t ? undefined : (t as Tier) })}>
                      {TIER_NAMES[t]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div class="card flat">
              <h3>Fassadenfarbe</h3>
              <div class="hero mt" style={{ aspectRatio: '16/10' }}>
                <HouseImage p={preview} />
              </div>
              <div class="swatches">
                {FACADE_COLORS.map((c) => (
                  <button key={c} class={`swatch ${(plan.facadeColor ?? p.facadeColor) === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setPlan({ ...plan, facadeColor: plan.facadeColor === c ? undefined : c })} aria-label={`Fassade ${c}`} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div class="plan-sum">
        <div class="row between small">
          <span class="muted bold">Gestaltung</span>
          <span class="bold">{Math.round(appeal(p) * 100)} → {Math.round(appeal(preview) * 100)}</span>
        </div>
        <Progress value={appeal(preview)} light />
        <div class="kv mt" style={{ fontSize: '13px' }}>
          <span>Kosten ({lines.length} Arbeiten, {months || 0} Mon.)</span>
          <Money v={total} />
          <span>Wert</span>
          <span>{fmtShort(vBefore)} → <span class={vAfter >= vBefore ? 'pos' : 'neg'}>{fmtShort(vAfter)}</span></span>
          <span>Marktmiete</span>
          <span>{fmtShort(rentBefore)} → <span class={rentAfter >= rentBefore ? 'pos' : 'neg'}>{fmtShort(rentAfter)}</span></span>
        </div>
        <button class="btn gold block mt" disabled={!lines.length || s.cash < total} onClick={() => { act((st) => E.startRenovationPlan(st, p.id, plan)); sfx.success(); onClose(); }}>
          <Icon name="hammer" size={18} /> {!lines.length ? 'Wähle Arbeiten aus' : s.cash < total ? 'Zu wenig Geld' : `Bruno beauftragen · ${fmt(total)}`}
        </button>
      </div>
    </div>
  );
}
