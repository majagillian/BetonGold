import { useState } from 'preact/hooks';
import { Avatar } from '../art/Avatar';
import { NPC_AVATARS } from '../art/npcs';
import * as E from '../game/engine';
import { FEATURES, MONTH_NAMES, NPCS, TIER_NAMES, buildTypeById, regionById } from '../game/data';
import {
  canBorrow, fmt, fmtShort, furnishBonus, loanRate, marketRent, pct, propertyDebt, propertyValue, rawQuality, tenantRent,
} from '../game/econ';
import { ctxFor, eventById, eventStillValid } from '../game/events';
import { appeal, blockingDefects, defectDef, FURN_STYLES, furnDef, ROOM_NAMES, roomCount } from '../game/interior';
import { GOLD_COST, rankDiscount } from '../game/gamify';
import type { Feature, FurnStyle, GameState, LoanType, Property, RegionId, Tier, Unit } from '../game/types';
import { Money, NpcSay, Progress, Seg, Sheet, Stat, Toggle, stars } from './common';
import { Icon, eventIcon } from './icons';
import { HouseImage, RegionImage, RoomImage } from './three3d';
import { sfx } from './sound';

export type Act = (fn: (s: GameState) => string | void) => void;
export type TourTarget = { kind: 'offer'; id: string } | { kind: 'own'; id: string };

const statusLabel = (p: Property) =>
  ({ idle: p.units.some((u) => u.tenant) ? 'Vermietet' : p.units.length ? 'Leerstand' : 'Bereit', renovating: 'In Renovierung', building: 'Im Bau', forSale: 'Zum Verkauf', plot: 'Grundstück' })[p.status];

export const statusPill = (p: Property) => {
  const l = statusLabel(p);
  const cls = l === 'Vermietet' ? 'green' : l === 'Leerstand' ? 'red' : l === 'Zum Verkauf' ? 'gold' : l === 'Grundstück' ? 'purple' : 'blue';
  return <span class={`pill ${cls}`}>{l}</span>;
};

type PTab = 'info' | 'raeume' | 'reno' | 'miete' | 'verkauf' | 'bank' | 'bau';

export const isTall = (p: Property) => ['altbau', 'gruenderzeit', 'speicher'].includes(p.style);
export const outsideFor = (r: RegionId) => (r === 'kronstadt' || r === 'lumenhafen' || r === 'neuwerk' ? 'city' : r === 'wolkenspitz' ? 'snow' : r === 'sonnenkueste' ? 'sea' : r === 'pilzhain' ? 'forest' : 'garden');
export function tourFurnishing(s: GameState, p: Property): FurnStyle | 'tenant' | 'old' | null {
  const u = p.units[0];
  if (u?.furnished) return u.furnished;
  if (u?.tenant) return 'tenant';
  if (p.staging && p.stagingStyle) return p.stagingStyle;
  if (!s.properties.includes(p)) return rawQuality(p) < 0.35 ? 'old' : null;
  return null;
}

const annuity = (p: number, rate: number, n: number) => {
  const r = rate / 12;
  return (p * r) / (1 - Math.pow(1 + r, -n));
};

// ================= Objekt =================
export function PropertySheet({ s, pid, act, onClose, openTour, openPlanner }: { s: GameState; pid: string; act: Act; onClose: () => void; openTour: (t: TourTarget) => void; openPlanner: (pid: string) => void }) {
  const p = s.properties.find((x) => x.id === pid);
  const [tab, setTab] = useState<PTab>(p?.status === 'plot' ? 'bau' : 'info');
  if (!p) {
    return (
      <Sheet title="Objekt" onClose={onClose}>
        <p class="bold">Dieses Objekt gehört dir nicht mehr.</p>
      </Sheet>
    );
  }
  const r = regionById(p.region);
  const tabs: { id: PTab; label: string; icon: string }[] = [];
  if (p.status === 'plot') tabs.push({ id: 'bau', label: 'Bauen', icon: 'build' }, { id: 'verkauf', label: 'Verkaufen', icon: 'tag' });
  else {
    tabs.push({ id: 'info', label: 'Übersicht', icon: 'info' });
    if (p.rooms?.length) tabs.push({ id: 'raeume', label: 'Räume', icon: 'door' });
    if (p.status === 'idle') {
      tabs.push({ id: 'reno', label: 'Renovieren', icon: 'hammer' });
      if (s.level >= 2) tabs.push({ id: 'miete', label: 'Vermieten', icon: 'key' });
      tabs.push({ id: 'verkauf', label: 'Verkaufen', icon: 'tag' });
    }
    if (s.level >= 3 && (p.status === 'idle' || p.status === 'forSale')) tabs.push({ id: 'bank', label: 'Hypothek', icon: 'bank' });
  }
  const cur = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  return (
    <Sheet title={p.name} onClose={onClose} icon="home">
      <div class="hero">
        <HouseImage p={p} big />
        <div class="flag">
          {statusPill(p)}
          <span class="pill">{r.name}</span>
        </div>
        {p.rooms?.length ? (
          <button class="btn small dark hero-btn" onClick={() => openTour({ kind: 'own', id: p.id })}>
            <Icon name="eye" size={16} /> Rundgang
          </button>
        ) : null}
      </div>
      <div class="subtabs">
        {tabs.map((t) => (
          <button key={t.id} class={cur === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </div>
      {cur === 'info' && <InfoPanel s={s} p={p} act={act} />}
      {cur === 'raeume' && <RoomsPanel s={s} p={p} openTour={() => openTour({ kind: 'own', id: p.id })} />}
      {cur === 'reno' && <RenoPanel s={s} p={p} openPlanner={() => openPlanner(p.id)} />}
      {cur === 'miete' && <RentPanel s={s} p={p} act={act} />}
      {cur === 'verkauf' && <SellPanel s={s} p={p} act={act} />}
      {cur === 'bank' && <MortgagePanel s={s} p={p} act={act} />}
      {cur === 'bau' && <BuildPanel s={s} p={p} act={act} />}
    </Sheet>
  );
}

function InfoPanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const value = propertyValue(s, p);
  const debt = propertyDebt(s, p.id);
  const rentSum = p.units.reduce((a, u) => a + tenantRent(s, p, u), 0);
  const defects = p.defects ?? [];
  const found = defects.filter((d) => d.found && !d.fixed);
  const ap = appeal(p);
  return (
    <>
      {(p.status === 'renovating' || p.status === 'building') && (
        <div class="card">
          <NpcSay npc="bruno">
            {p.status === 'building' ? 'Wir bauen, was das Zeug hält!' : 'Wir sind dran, Chef!'} Noch {p.busyMonths} Monat{p.busyMonths === 1 ? '' : 'e'}.
          </NpcSay>
          <button class="btn gold block mt" disabled={(s.gold ?? 0) < GOLD_COST.eile * p.busyMonths} onClick={() => { act((st) => E.rushWork(st, p.id)); sfx.success(); }}>
            <Icon name="gold" size={18} /> Sofort fertig ({GOLD_COST.eile * p.busyMonths} Gold)
          </button>
        </div>
      )}
      {p.status === 'forSale' && (
        <div class="card">
          <NpcSay npc="jenny">
            Inseriert für {Math.round(p.saleFactor * 100)} % des Werts (ca. {fmt(value * p.saleFactor)}). Verkaufschance pro Monat: {pct(E.saleChance(s, p))}.
          </NpcSay>
          <button class="btn ghost block mt" onClick={() => act((st) => { E.cancelSale(st, p.id); return 'Verkauf abgebrochen.'; })}>
            Verkauf abbrechen
          </button>
        </div>
      )}
      <div class="grid2 mb">
        <Stat label="Wert" value={fmtShort(value)} />
        <Stat label="Eingesetzt" value={fmtShort(p.invested)} />
        <Stat label="Fläche" value={`${p.size} m²`} />
        <Stat label="Zimmer" value={p.units.length > 1 ? `${p.units.length} Whg.` : `${roomCount(p)}`} />
        {rentSum > 0 && <Stat label="Miete / Monat" value={fmt(rentSum)} cls="pos" />}
        {debt > 0 && <Stat label="Kredit" value={fmtShort(debt)} cls="neg" />}
      </div>
      <div class="card">
        <div class="row between">
          <h3>Ausstattung</h3>
          {stars(rawQuality(p))}
        </div>
        <div class="row wrap mt">
          {FEATURES.map((f) => (
            <span key={f.id} class="pill">
              {f.name}: {TIER_NAMES[p.tiers[f.id]]}
            </span>
          ))}
        </div>
        <div class="row between mt">
          <span class="small bold">Gestaltung &amp; Grundriss</span>
          <span class="small bold">{Math.round(ap * 100)} / 100</span>
        </div>
        <Progress value={ap} light />
        <p class="hint mt">Passende Materialien für {regionById(p.region).name} und ein guter Grundriss steigern Wert und Miete.</p>
      </div>
      <div class="card">
        <h3>Mängel</h3>
        {defects.length === 0 && <p class="hint">Keine bekannten Mängel.</p>}
        {defects.map((d) => (
          <div key={d.id} class="row between" style={{ padding: '6px 0' }}>
            <span class="small bold">
              {d.found || d.fixed ? defectDef(d.type).name : 'Unbekannt'}
              {d.main && !d.fixed && d.found && <span class="pill red" style={{ marginLeft: '6px' }}>Hauptmangel</span>}
            </span>
            {d.fixed ? <span class="pill green">behoben</span> : d.found ? <span class="pill red">{fmt(d.cost)}</span> : <span class="pill">noch versteckt</span>}
          </div>
        ))}
        {found.length > 0 && <p class="hint mt">Gefundene Mängel senken den Wert. Beheben kannst du sie im Renovierungsplan.</p>}
        {defects.some((d) => !d.found && !d.fixed) && <p class="hint">Hier ist noch etwas versteckt – schau dich beim Rundgang genau um.</p>}
      </div>
    </>
  );
}

function RoomsPanel({ s, p, openTour }: { s: GameState; p: Property; openTour: () => void }) {
  const furn = tourFurnishing(s, p);
  return (
    <>
      {p.units.length > 1 && <p class="hint mb">Musterwohnung – alle {p.units.length} Wohnungen sind gleich geschnitten.</p>}
      <div class="grid2">
        {(p.rooms ?? []).map((r) => (
          <div key={r.id} class="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={openTour}>
            <div style={{ aspectRatio: '4/3' }}>
              <RoomImage room={r} furnishing={furn} defects={(p.defects ?? []).filter((d) => d.roomId === r.id && d.found)} outside={outsideFor(p.region)} tall={isTall(p)} />
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div class="bold small">{ROOM_NAMES[r.type]}</div>
              <div class="hint">{r.size} m²</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RenoPanel({ s, p, openPlanner }: { s: GameState; p: Property; openPlanner: () => void }) {
  const open = (p.defects ?? []).filter((d) => d.found && !d.fixed);
  const disc = Math.round(rankDiscount(s) * 100);
  return (
    <div class="card">
      <NpcSay npc="bruno">
        {open.length
          ? `Zuerst sollten wir ${open.map((d) => defectDef(d.type).name).join(' und ')} beheben. Danach machen wir es richtig schön!`
          : 'Sag mir, was du willst: neue Böden, andere Farben, eine Wand raus – ich mach das.'}
      </NpcSay>
      <button class="btn gold block big mt" onClick={openPlanner}>
        <Icon name="paint" /> Renovierung planen
      </button>
      <p class="hint mt">Raum für Raum Böden, Wandfarben, Küche und Bad wählen, den Grundriss ändern und Mängel beheben – mit Live-Vorschau.</p>
      {disc > 0 && <p class="hint">Dein Rang-Rabatt bei Bruno: {disc} %</p>}
    </div>
  );
}

function RentPanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const block = blockingDefects(p).filter((d) => d.found);
  return (
    <>
      {block.length > 0 && (
        <div class="card" style={{ background: '#fbe9e7' }}>
          <div class="row">
            <Icon name="warn" />
            <div class="grow small bold">Vermieten nicht erlaubt: {defectDef(block[0].type).name} muss zuerst behoben werden.</div>
          </div>
        </div>
      )}
      {p.units.map((u, ui) => (
        <UnitRow key={ui} s={s} p={p} u={u} ui={ui} act={act} blocked={block.length > 0} />
      ))}
      {s.hausverwaltung && <p class="hint mt">Deine Hausverwaltung kümmert sich automatisch um freie Wohnungen.</p>}
    </>
  );
}

function UnitRow({ s, p, u, ui, act, blocked }: { s: GameState; p: Property; u: Unit; ui: number; act: Act; blocked: boolean }) {
  const [level, setLevel] = useState<Unit['rentLevel']>(u.rentLevel);
  const [open, setOpen] = useState(false);
  const [furnOpen, setFurnOpen] = useState(false);
  const label = p.units.length > 1 ? `Wohnung ${ui + 1} · ${u.size} m²` : `${u.size} m²`;
  const market = marketRent(s, p, u) * (1 + furnishBonus(u));
  if (u.tenant) {
    const t = u.tenant;
    return (
      <div class="applicant">
        <div class="row">
          <div class="face"><Avatar config={t.avatar} portrait mood={t.satisfaction < 40 ? 'sad' : t.satisfaction > 75 ? 'happy' : undefined} /></div>
          <div class="grow">
            <div class="bold">{t.name}</div>
            <div class="small muted">{t.job} · {label}{u.furnished ? ` · möbliert (${furnDef(u.furnished).name})` : ''}</div>
            <div class="small bold">Miete: <span class="pos">{fmt(tenantRent(s, p, u))}</span> / Monat</div>
          </div>
        </div>
        <div class="row between small bold mt"><span>Zufriedenheit</span><span>{Math.round(t.satisfaction)} %</span></div>
        <Progress value={t.satisfaction / 100} light />
        <div class="row wrap mt">
          {t.paidStreak > 0 && <span class="pill green">{t.paidStreak} Monate pünktlich</span>}
          {t.stopsPaying && <span class="pill red">Zahlt nicht</span>}
          {t.noticeMonths > 0 && <span class="pill gold">Zieht in {t.noticeMonths} Mon. aus</span>}
          {t.minderungMonths > 0 && <span class="pill red">Mietminderung {Math.round(t.minderung * 100)} %</span>}
        </div>
      </div>
    );
  }
  const showRoom = (p.rooms ?? []).find((r) => r.type === 'wohnen' || r.type === 'wohnkueche') ?? (p.rooms ?? [])[0];
  return (
    <div class="applicant">
      <div class="row between">
        <div>
          <div class="bold">{label} – frei</div>
          <div class="small muted">Marktmiete ca. {fmt(market)}{u.vacantMonths > 0 ? ` · ${u.vacantMonths} Mon. Leerstand` : ''}</div>
        </div>
        {u.applicants.length > 0 && <span class="pill blue">{u.applicants.length} Bewerber</span>}
      </div>
      <div class="row between mt">
        <span class="row small bold" style={{ gap: '6px' }}>
          <Icon name="sofa" size={16} /> {u.furnished ? `Möbliert: ${furnDef(u.furnished).name}` : 'Unmöbliert'}
        </span>
        <button class="btn small ghost" onClick={() => setFurnOpen(!furnOpen)}>{furnOpen ? 'Schließen' : 'Möblierung'}</button>
      </div>
      {furnOpen && (
        <div class="mt">
          <button class="option" onClick={() => { act((st) => E.setFurnishing(st, p.id, ui, null)); setFurnOpen(false); }}>
            <span class="grow">
              Unmöbliert
              <small>Mieter bringen eigene Möbel mit und bleiben länger.</small>
            </span>
            <span class="cost">{!u.furnished ? <Icon name="check" /> : '0 €'}</span>
          </button>
          {FURN_STYLES.map((f) => (
            <div key={f.id} class="option" style={{ cursor: 'pointer' }} onClick={() => { act((st) => E.setFurnishing(st, p.id, ui, f.id)); sfx.coin(); setFurnOpen(false); }}>
              {showRoom && (
                <div style={{ width: '92px', height: '70px', borderRadius: '8px', overflow: 'hidden', flex: '0 0 auto' }}>
                  <RoomImage room={showRoom} furnishing={f.id} defects={[]} outside={outsideFor(p.region)} />
                </div>
              )}
              <div class="grow">
                <div>{f.name} {u.furnished === f.id && <span class="pill green">aktiv</span>}</div>
                <small>{f.desc}</small>
                <div class="row wrap mt">
                  <span class="pill gold">+{Math.round(f.rentBonus * 100)} % Miete</span>
                  <span class="pill">{fmt(E.furnishCost(u, f.id))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!u.listed ? (
        <div class="mt">
          <Seg
            value={level}
            onChange={setLevel}
            options={[
              { value: 0.9, label: `Günstig ${fmtShort(market * 0.9)}` },
              { value: 1, label: `Markt ${fmtShort(market)}` },
              { value: 1.15, label: `Hoch ${fmtShort(market * 1.15)}` },
            ]}
          />
          <button class="btn blue block mt" disabled={blocked} onClick={() => act((st) => E.listUnit(st, p.id, ui, level))}>
            Inserat schalten (49 €)
          </button>
        </div>
      ) : u.applicants.length === 0 ? (
        <p class="hint mt">Inserat läuft. Besichtigungen finden im nächsten Monat statt …</p>
      ) : (
        <div class="mt">
          <button class="btn block" onClick={() => setOpen(!open)}>
            <Icon name="users" size={18} /> {open ? 'Besichtigung schließen' : `Besichtigung: ${u.applicants.length} Bewerber`}
          </button>
          {open &&
            u.applicants.map((a, ai) => {
              const rent = market * u.rentLevel;
              const ratio = rent / a.income;
              return (
                <div class="applicant mt" key={ai} style={{ background: 'var(--surface2)' }}>
                  <div class="row">
                    <div class="face"><Avatar config={a.avatar} portrait /></div>
                    <div class="grow">
                      <div class="bold">{a.name}</div>
                      <div class="small muted">{a.job} · {fmt(a.income)} netto</div>
                      <div class="small bold">
                        Schufa <span class={`schufa ${a.schufa}`}>{a.schufa}</span> · Miete = {Math.round(ratio * 100)} % vom Einkommen
                      </div>
                    </div>
                  </div>
                  <ul>
                    {a.notes.map((n, k) => <li key={k}>{n}</li>)}
                    {ratio > 0.45 && <li>Die Miete wäre für dieses Einkommen sehr hoch</li>}
                  </ul>
                  <button class="btn green block small" onClick={() => { act((st) => E.acceptApplicant(st, p.id, ui, ai)); sfx.success(); }}>
                    Mietvertrag anbieten
                  </button>
                </div>
              );
            })}
          <p class="hint mt">Achte auf Warnzeichen: Mietnomaden haben es oft besonders eilig.</p>
        </div>
      )}
    </div>
  );
}

function SellPanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const [factor, setFactor] = useState(1);
  const [staging, setStaging] = useState<FurnStyle | null>(null);
  const value = propertyValue(s, p) * (staging && !p.staging ? 1.05 : 1);
  const price = value * factor * 0.97;
  const unseen = (p.defects ?? []).some((d) => !d.found && !d.fixed);
  const profit = price - p.invested - (staging && !p.staging ? E.stagingCost(s, p) : 0);
  const probe = { ...p, saleFactor: factor };
  return (
    <div class="card">
      <Seg value={factor} onChange={setFactor} options={[0.9, 1, 1.1, 1.2].map((f) => ({ value: f, label: `${Math.round(f * 100)} %` }))} />
      {p.status === 'idle' && !p.staging && p.rooms?.length ? (
        <div class="mt">
          <div class="small bold mb">Home Staging (+5 % Verkaufswert, {fmt(E.stagingCost(s, p))})</div>
          <div class="chips">
            <button class={`chip ${staging === null ? 'on' : ''}`} onClick={() => setStaging(null)}>Ohne</button>
            {FURN_STYLES.map((f) => (
              <button key={f.id} class={`chip ${staging === f.id ? 'on' : ''}`} onClick={() => setStaging(f.id)}>{f.name}</button>
            ))}
          </div>
        </div>
      ) : null}
      {p.staging && <p class="hint mt">Home Staging ist eingerichtet (+5 %).</p>}
      <div class="kv mt">
        <span>Erlös nach Makler (ca.)</span>
        <Money v={price} />
        <span>Gewinn (ca.)</span>
        <Money v={profit} sign />
        <span>Chance pro Monat</span>
        <span>{pct(E.saleChance(s, probe))}</span>
      </div>
      {unseen && <p class="hint mt" style={{ color: 'var(--red)' }}>Achtung: Es gibt noch unentdeckte Mängel. Der Gutachter des Käufers wird sie finden und den Preis drücken.</p>}
      {p.units.some((u) => u.tenant) && <p class="hint">Mit Mietern verkauft sich das Objekt 5 % günstiger.</p>}
      <button class="btn red block mt" onClick={() => act((st) => E.listForSale(st, p.id, factor, staging ?? false))}>Jenny soll inserieren</button>
    </div>
  );
}

function MortgagePanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const limit = E.loanLimit(s, 'hypothek', p.id);
  const [amount, setAmount] = useState(Math.min(limit, Math.round(limit / 2 / 1000) * 1000));
  if (limit < 5000)
    return (
      <div class="card">
        <p class="hint">{canBorrow(s) ? 'Dieses Objekt ist schon voll beliehen.' : 'Die Bank vergibt gerade keine Kredite an dich.'}</p>
      </div>
    );
  const rate = loanRate(s, E.LOAN_INFO.hypothek.base);
  return (
    <div class="card">
      <p class="hint">Bis zu 80 % des Werts. Zins {(rate * 100).toFixed(1).replace('.', ',')} %, Laufzeit 20 Jahre.</p>
      <input class="slider" type="range" min={0} max={limit} step={1000} value={amount} onInput={(e) => setAmount(Number((e.target as HTMLInputElement).value))} />
      <div class="kv">
        <span>Betrag</span>
        <Money v={amount} />
        <span>Monatsrate</span>
        <Money v={annuity(amount, rate, 240)} />
      </div>
      <button class="btn blue block mt" disabled={amount < 1000} onClick={() => { act((st) => E.takeLoan(st, 'hypothek', amount, p.id)); sfx.coin(); }}>
        Hypothek aufnehmen
      </button>
    </div>
  );
}

function BuildPanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const opts = E.buildOptionsFor(s, p);
  const [type, setType] = useState(opts[0]?.id ?? null);
  const [premium, setPremium] = useState(false);
  const [fin, setFin] = useState(0.6);
  if (s.level < 5) return <p class="hint">Bauen kannst du ab Level 5.</p>;
  if (!opts.length || !type) return <div class="card"><p class="hint">Für dieses Grundstück gibt es auf deinem Level noch keinen passenden Bautyp.</p></div>;
  const bt = buildTypeById(type);
  const cost = E.buildCost(p.region, type, premium);
  const loan = Math.round((cost * fin) / 1000) * 1000;
  const tiers: Record<Feature, Tier> = premium ? { bad: 3, kueche: 3, boden: 3, elektrik: 3, fassade: 3 } : { bad: 2, kueche: 2, boden: 2, elektrik: 2, fassade: 2 };
  const sim: Property = { ...p, status: 'idle', size: bt.size, tiers, units: [], rooms: undefined };
  const value = propertyValue(s, sim);
  const rentPerUnit = marketRent(s, sim, { size: bt.size / bt.units } as Unit);
  const canLoan = canBorrow(s);
  return (
    <div class="card">
      <div class="hero" style={{ aspectRatio: '16/10' }}>
        <HouseImage opts={{ style: bt.style, region: p.region, quality: premium ? 1 : 0.85, lit: true, state: 'idle', seed: 3 }} />
      </div>
      <div class="chips mb">
        {opts.map((o) => (
          <button key={o.id} class={`chip ${o.id === type ? 'on' : ''}`} onClick={() => setType(o.id)}>{o.name}</button>
        ))}
      </div>
      <Toggle label="Premium-Ausstattung" sub="+25 % Baukosten, höherer Wert" on={premium} onChange={setPremium} />
      <div class="field mt">
        <label>Baufinanzierung: {Math.round((canLoan ? fin : 0) * 100)} %</label>
        <input class="slider" type="range" min={0} max={canLoan ? 0.8 : 0} step={0.1} value={canLoan ? fin : 0} onInput={(e) => setFin(Number((e.target as HTMLInputElement).value))} />
      </div>
      <div class="kv">
        <span>Baukosten</span><Money v={cost} />
        <span>Davon Kredit</span><Money v={canLoan ? loan : 0} />
        <span>Eigenanteil</span><Money v={cost - (canLoan ? loan : 0)} />
        <span>Bauzeit</span><span>{bt.months} Monate</span>
        <span>Wert danach</span><Money v={value} />
        <span>Marktmiete gesamt</span><Money v={rentPerUnit * bt.units} />
      </div>
      <button class="btn green block mt" onClick={() => { act((st) => E.startBuild(st, p.id, type, premium, canLoan ? fin : 0)); sfx.success(); }}>
        <Icon name="build" size={18} /> Spatenstich
      </button>
    </div>
  );
}

// ================= Angebot =================
export function OfferSheet({ s, oid, act, onClose, onBought, openTour, openDuel }: { s: GameState; oid: string; act: Act; onClose: () => void; onBought: (pid: string) => void; openTour: (t: TourTarget) => void; openDuel: () => void }) {
  const o = s.offers.find((x) => x.id === oid);
  const [bid, setBid] = useState(0.7);
  const [mortgage, setMortgage] = useState(false);
  if (!o)
    return (
      <Sheet title="Angebot" onClose={onClose}>
        <p class="bold">Das Angebot ist nicht mehr verfügbar.</p>
      </Sheet>
    );
  const p = o.property;
  const r = regionById(p.region);
  const value = propertyValue(s, p);
  const total = E.purchaseTotal(o.price);
  const simTiers = Object.fromEntries(FEATURES.map((f) => [f.id, Math.max(p.tiers[f.id], r.idealTier)])) as Record<Feature, Tier>;
  const potential = propertyValue(s, { ...p, tiers: simTiers, defects: (p.defects ?? []).map((d) => ({ ...d, fixed: true })) });
  const defects = p.defects ?? [];
  const found = defects.filter((d) => d.found);
  const useLoan = mortgage && canBorrow(s);
  const loan = useLoan ? Math.round((o.price * 0.7) / 1000) * 1000 : 0;
  const canPay = s.cash + loan >= total;
  return (
    <Sheet title={p.name} onClose={onClose} icon={o.kind === 'auktion' ? 'hammer' : o.kind === 'grundstueck' ? 'build' : 'tag'}>
      <div class="hero">
        <HouseImage p={p} big />
        <div class="flag">
          {o.hot && <span class="pill hot"><Icon name="flame" size={13} /> Top-Objekt</span>}
          {o.kind === 'auktion' && <span class="pill red">Zwangsversteigerung</span>}
          {o.kind === 'grundstueck' && <span class="pill purple">Bauland</span>}
          <span class="pill">{r.name}</span>
        </div>
        {o.kind !== 'grundstueck' && p.rooms?.length ? (
          <button class="btn small dark hero-btn" onClick={() => { if (!o.toured) act((st) => E.startTour(st, o.id)); openTour({ kind: 'offer', id: o.id }); }}>
            <Icon name="eye" size={16} /> {o.toured ? 'Rundgang' : `Besichtigen (${fmt(E.inspectionCost(o))})`}
          </button>
        ) : null}
      </div>
      <div class="grid2 mb">
        <Stat label={o.kind === 'auktion' ? 'Mindestgebot' : 'Kaufpreis'} value={fmtShort(o.price)} />
        <Stat label="Schätzwert" value={fmtShort(value)} />
        {p.size > 0 && <Stat label="Fläche" value={`${p.size} m²`} />}
        {p.plotSize ? <Stat label="Grundstück" value={`${p.plotSize} m²`} /> : <Stat label="Zimmer" value={p.units.length > 1 ? `${p.units.length} Whg.` : `${roomCount(p)}`} />}
        {o.kind !== 'grundstueck' && <Stat label="Wert saniert" value={fmtShort(potential)} cls="pos" />}
        {o.kind !== 'grundstueck' && <Stat label="Marktmiete" value={fmtShort(p.units.reduce((a, u) => a + marketRent(s, { ...p, tiers: simTiers }, u), 0))} />}
      </div>
      {o.hot && (
        <div class="card" style={{ border: '1px solid #f2cdc8' }}>
          <NpcSay npc="viktor">Ein hübsches Schnäppchen. Ich biete mit – wenn Sie es wollen, müssen Sie mich überbieten.</NpcSay>
        </div>
      )}
      {o.kind !== 'grundstueck' && (
        <div class="card">
          <div class="row between">
            <h3>Mängel</h3>
            <span class="pill">{found.length} gefunden</span>
          </div>
          {found.length === 0 && <p class="hint">Jedes Haus hat mindestens einen Mangel. Beim Rundgang kannst du ihn entdecken: Tippe auf verdächtige Stellen.</p>}
          {found.map((d) => (
            <div key={d.id} class="row between" style={{ padding: '5px 0' }}>
              <span class="small bold">{defectDef(d.type).name}{d.main ? ' (Hauptmangel)' : ''}</span>
              <span class="pill red">{fmt(d.cost)}</span>
            </div>
          ))}
          <div class="grid2 mt">
            <button class="btn ghost small" disabled={(s.gold ?? 0) < GOLD_COST.gutachter || found.length === defects.length} onClick={() => { act((st) => E.gutachter(st, o.id, true)); sfx.found(); }}>
              <Icon name="search" size={16} /> Gutachter ({GOLD_COST.gutachter} Gold)
            </button>
            <button class="btn ghost small" disabled={!found.length || !!o.negotiated || o.kind === 'auktion'} onClick={() => { act((st) => E.negotiate(st, o.id)); sfx.coin(); }}>
              <Icon name="coin" size={16} /> {o.negotiated ? 'Verhandelt' : 'Preis drücken'}
            </button>
          </div>
        </div>
      )}
      {o.kind === 'auktion' ? (
        <div class="card">
          <h3>Dein Gebot</h3>
          <Seg value={bid} onChange={setBid} options={[0.55, 0.65, 0.75, 0.85].map((b) => ({ value: b, label: `${Math.round(b * 100)} %` }))} />
          <div class="kv mt">
            <span>Gebot</span><Money v={Math.round((value * bid) / 500) * 500} />
            <span>Chance auf Zuschlag</span><span>{pct(E.auctionChance(bid))}</span>
          </div>
          <button class="btn red block mt" onClick={() => { let won = false; act((st) => { const res = E.bidAuction(st, o.id, bid); won = res.ok; return res.text; }); if (won) { sfx.success(); onBought(p.id); } else { sfx.fail(); onClose(); } }}>
            <Icon name="hammer" size={18} /> Bieten
          </button>
        </div>
      ) : (
        <>
          {s.level >= 3 && o.kind === 'kauf' && <Toggle label="Mit 70 % Hypothek finanzieren" sub={canBorrow(s) ? `Eigenanteil ${fmt(total - Math.round((o.price * 0.7) / 1000) * 1000)}` : 'Die Bank gibt gerade keinen Kredit'} on={useLoan} onChange={setMortgage} />}
          {o.hot ? (
            <button class="btn red block big" disabled={!canPay} onClick={() => { act((st) => E.startDuel(st, o.id, useLoan)); sfx.alarm(); openDuel(); }}>
              <Icon name="swords" /> {canPay ? 'Bieterduell gegen Viktor' : 'Zu wenig Geld'}
            </button>
          ) : (
            <button class="btn gold block big" disabled={!canPay} onClick={() => { act((st) => E.buyOffer(st, o.id, useLoan)); sfx.coin(); onBought(p.id); }}>
              {canPay ? `Kaufen für ${fmt(total)}` : 'Zu wenig Geld'}
            </button>
          )}
          <p class="hint mt">Kaufpreis plus 8 % Nebenkosten.</p>
        </>
      )}
    </Sheet>
  );
}

// ================= Region =================
export function RegionSheet({ s, rid, onClose, openOffer, openProperty }: { s: GameState; rid: RegionId; onClose: () => void; openOffer: (id: string) => void; openProperty: (id: string) => void }) {
  const r = regionById(rid);
  const offers = s.offers.filter((o) => o.property.region === rid);
  const mine = s.properties.filter((p) => p.region === rid);
  return (
    <Sheet title={r.name} onClose={onClose} icon="map">
      <div class="hero region-hero">
        <RegionImage id={rid} level={s.level} />
      </div>
      <p class="bold" style={{ margin: '0 0 4px' }}>{r.type}</p>
      <p class="small" style={{ marginTop: 0, color: 'var(--ink2)' }}>{r.description}</p>
      <div class="grid2 mb">
        <Stat label="Preis / m²" value={fmt(r.pricePerSqm * s.marketIndex[rid])} />
        <Stat label="Miete / m²" value={r.season ? 'saisonal' : fmt(r.rentPerSqm)} />
        <Stat label="Nachfrage" value={r.demand >= 0.75 ? 'Hoch' : r.demand >= 0.5 ? 'Mittel' : 'Niedrig'} />
        <Stat label="Markttrend" value={`${s.marketIndex[rid] >= 1 ? '+' : ''}${Math.round((s.marketIndex[rid] - 1) * 100)} %`} cls={s.marketIndex[rid] >= 1 ? 'pos' : 'neg'} />
      </div>
      {mine.length > 0 && <div class="section-title">Deine Objekte</div>}
      {mine.map((p) => <PropRow key={p.id} s={s} p={p} onClick={() => openProperty(p.id)} />)}
      <div class="section-title">Angebote <small>{offers.length}</small></div>
      {offers.length === 0 && <p class="hint">Gerade keine Angebote. Nächsten Monat kommen neue.</p>}
      {offers.map((o) => <OfferRow key={o.id} s={s} oid={o.id} onClick={() => openOffer(o.id)} />)}
    </Sheet>
  );
}

export function PropRow({ s, p, onClick }: { s: GameState; p: Property; onClick: () => void }) {
  const open = (p.defects ?? []).filter((d) => d.found && !d.fixed).length;
  return (
    <div class="card prop-card" onClick={onClick}>
      <div class="thumb"><HouseImage p={p} /></div>
      <div class="grow">
        <h3>{p.name}</h3>
        <div class="meta">{regionById(p.region).name}{p.size ? ` · ${p.size} m²` : ''}</div>
        <div class="row wrap mt">
          {statusPill(p)}
          {open > 0 && <span class="pill red">{open} Mangel</span>}
          <span class="money small">{fmtShort(propertyValue(s, p))}</span>
        </div>
      </div>
      <Icon name="chevron" size={18} class="muted" />
    </div>
  );
}

export function OfferRow({ s, oid, onClick }: { s: GameState; oid: string; onClick: () => void }) {
  const o = s.offers.find((x) => x.id === oid)!;
  const p = o.property;
  return (
    <div class="card prop-card" onClick={onClick}>
      <div class="thumb">
        <HouseImage p={p} />
        {o.hot && <span class="pill hot flag"><Icon name="flame" size={12} /></span>}
      </div>
      <div class="grow">
        <h3>{p.name}</h3>
        <div class="meta">{regionById(p.region).name}{p.size ? ` · ${p.size} m²` : p.plotSize ? ` · ${p.plotSize} m² Grund` : ''}</div>
        <div class="row wrap mt">
          {o.kind === 'auktion' && <span class="pill red">Auktion</span>}
          {o.kind === 'grundstueck' && <span class="pill purple">Bauland</span>}
          {o.kind === 'kauf' && stars(rawQuality(p))}
          {o.toured && <span class="pill green">besichtigt</span>}
          <span class="money small">{o.kind === 'auktion' ? 'ab ' : ''}{fmtShort(o.price)}</span>
        </div>
      </div>
      <Icon name="chevron" size={18} class="muted" />
    </div>
  );
}

// ================= Ereignisse =================
export function EventSheet({ s, uid, act, onClose }: { s: GameState; uid: string; act: Act; onClose: () => void }) {
  const ev = s.events.find((e) => e.uid === uid);
  if (!ev || !eventStillValid(s, ev)) {
    return (
      <Sheet title="Ereignis" onClose={onClose}>
        <p class="bold">Dieses Ereignis hat sich erledigt.</p>
      </Sheet>
    );
  }
  const def = eventById(ev.defId);
  const c = ctxFor(s, ev);
  const opts = def.options(c);
  return (
    <Sheet title={def.title} onClose={onClose} icon={eventIcon(def.id)}>
      {c.p && (
        <div class="hero" style={{ aspectRatio: '16/9' }}>
          <HouseImage p={c.p} />
        </div>
      )}
      <div class="mb">
        <NpcSay npc={def.npc} mood={def.npc === 'viktor' ? undefined : 'sad'}>{def.text(c)}</NpcSay>
      </div>
      {opts.map((o, i) => (
        <button key={i} class="option" disabled={o.disabled} onClick={() => { act((st) => E.chooseEventOption(st, uid, i)); sfx.tap(); onClose(); }}>
          <span class="grow">
            {o.label}
            {o.detail && <small>{o.detail}</small>}
          </span>
          <span class="cost">{o.cost > 0 ? fmt(o.cost) : 'kostenlos'}</span>
        </button>
      ))}
      <p class="hint">Wenn du bis Monatsende nichts entscheidest, wird es meist teurer.</p>
    </Sheet>
  );
}

export function EventsListSheet({ s, onClose, openEvent }: { s: GameState; onClose: () => void; openEvent: (uid: string) => void }) {
  return (
    <Sheet title="Offene Ereignisse" onClose={onClose} icon="bell">
      {s.events.length === 0 && <p class="bold">Alles ruhig.</p>}
      {s.events.map((e) => {
        const def = eventById(e.defId);
        const p = e.propertyId ? s.properties.find((x) => x.id === e.propertyId) : undefined;
        return (
          <button key={e.uid} class="option" onClick={() => openEvent(e.uid)}>
            <span class="ev-icon"><Icon name={eventIcon(def.id)} /></span>
            <span class="grow">
              {def.title}
              <small>{p ? p.name : NPCS[def.npc].name}</small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        );
      })}
    </Sheet>
  );
}

export function InboxSheet({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <Sheet title="Postfach" onClose={onClose} icon="mail">
      {s.messages.length === 0 && <p class="bold">Keine Nachrichten.</p>}
      {s.messages.map((m) => (
        <div key={m.id} class={`msg ${m.read ? '' : 'unread'}`}>
          <div class="npc-say">
            <div class="face" style={{ width: '40px', height: '40px' }}>
              <Avatar config={NPC_AVATARS[m.from]} portrait />
            </div>
            <div class="grow">
              <div class="t" style={{ color: m.tone === 'bad' ? 'var(--red)' : m.tone === 'good' ? 'var(--green)' : undefined }}>{m.title}</div>
              <div class="hint">{NPCS[m.from].name} · {MONTH_NAMES[m.month % 12]}, Jahr {Math.floor(m.month / 12) + 1}</div>
              <div class="x">{m.text}</div>
            </div>
          </div>
        </div>
      ))}
    </Sheet>
  );
}

// ================= Kredit =================
export function LoanSheet({ s, type, act, onClose }: { s: GameState; type: LoanType; act: Act; onClose: () => void }) {
  const limit = E.loanLimit(s, type);
  const [amount, setAmount] = useState(Math.round(limit / 2 / 1000) * 1000);
  const info = E.LOAN_INFO[type];
  const rate = loanRate(s, info.base);
  return (
    <Sheet title={info.name} onClose={onClose} icon="bank">
      <NpcSay npc="krause">{info.text}</NpcSay>
      {limit < 1000 ? (
        <p class="bold mt">Dafür bekommst du gerade keinen Kredit.</p>
      ) : (
        <>
          <input class="slider mt" type="range" min={0} max={limit} step={1000} value={amount} onInput={(e) => setAmount(Number((e.target as HTMLInputElement).value))} />
          <div class="kv">
            <span>Betrag</span><Money v={amount} />
            {type !== 'investor' ? (
              <>
                <span>Zins</span><span>{(rate * 100).toFixed(1).replace('.', ',')} %</span>
                <span>Monatsrate</span><Money v={annuity(amount, rate, info.months)} />
              </>
            ) : (
              <>
                <span>Gewinnbeteiligung</span><span>15 % der Mieten</span>
                <span>Rückkauf</span><Money v={amount * 1.2} />
              </>
            )}
          </div>
          <button class="btn blue block mt" disabled={amount < 1000} onClick={() => { act((st) => E.takeLoan(st, type, amount)); sfx.coin(); onClose(); }}>
            Kredit aufnehmen
          </button>
        </>
      )}
    </Sheet>
  );
}
