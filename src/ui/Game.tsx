import { useState } from 'preact/hooks';
import { Avatar } from '../art/Avatar';
import { LEVEL_STORY, LEVEL_TITLES, MONTH_NAMES, REGIONS, regionById } from '../game/data';
import * as E from '../game/engine';
import { assets, dispoLimit, equityRatio, fmt, fmtShort, monthlyRentIncome, netWorth, totalDebt } from '../game/econ';
import { LEVELS, levelDef } from '../game/levels';
import { ACHIEVEMENTS, canSpin, claimQuest, GOLD_COST, leaderboard, rankInfo } from '../game/gamify';
import type { GameState, LoanType, RegionId } from '../game/types';
import { Confetti, Modal, Money, NpcSay, Progress, Seg, Stat, Toggle } from './common';
import { Icon } from './icons';
import {
  EventSheet, EventsListSheet, InboxSheet, LoanSheet, OfferRow, OfferSheet, PropRow, PropertySheet, RegionSheet, type Act, type TourTarget,
} from './sheets';
import { MapView, RegionImage } from './three3d';
import { Tour } from './Tour';
import { Planner } from './Planner';
import { DuelModal, RewardModal, WheelModal } from './Rewards';
import { sfx } from './sound';

type Tab = 'karte' | 'portfolio' | 'markt' | 'bank' | 'ziele';
type SheetState =
  | { t: 'property'; id: string }
  | { t: 'offer'; id: string }
  | { t: 'region'; id: RegionId }
  | { t: 'event'; id: string }
  | { t: 'events' }
  | { t: 'inbox' }
  | { t: 'loan'; loan: LoanType }
  | null;

interface Props {
  s: GameState;
  act: Act;
  nextMonth: () => void;
  onEditAvatar: () => void;
  onQuit: () => void;
  onRestart: () => void;
  dismiss: (k: 'levelup' | 'demotion' | 'report' | 'win' | 'reward') => void;
  showReport: boolean;
  markRead: () => void;
  toast: (t: string) => void;
}

export const monthLabel = (m: number) => `${MONTH_NAMES[m % 12]}, Jahr ${Math.floor(m / 12) + 1}`;

export function Game({ s, act, nextMonth, onEditAvatar, onQuit, onRestart, dismiss, showReport, markRead, toast }: Props) {
  const [tab, setTab] = useState<Tab>('karte');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [tour, setTour] = useState<TourTarget | null>(null);
  const [planner, setPlanner] = useState<string | null>(null);
  const [wheel, setWheel] = useState(false);
  const [confirmNext, setConfirmNext] = useState(false);
  const unread = s.messages.filter((m) => !m.read).length;
  const goal = levelDef(s.level).check(s);
  const rank = rankInfo(s.xp ?? 0);
  const claimable = (s.quests ?? []).filter((q) => !q.claimed && q.progress >= q.target).length;
  const spin = canSpin(s);

  const tryNext = () => {
    sfx.tap();
    if (s.events.length > 0) setConfirmNext(true);
    else nextMonth();
  };

  const reward = s.pendingRewards?.[0];

  return (
    <div class="game">
      <div class="topbar">
        <div class="me" onClick={() => setTab('ziele')}>
          <Avatar config={s.avatar} portrait />
          <span class="rankbadge">{rank.rank}</span>
        </div>
        <div class="topstats">
          <div class={`cash ${s.cash < 0 ? 'neg' : ''}`}>{fmt(s.cash)}</div>
          <div class="topsub">
            <span class="gold"><Icon name="gold" size={13} /> {s.gold ?? 0}</span>
            <span>{monthLabel(s.month)}</span>
            <span>Bonität {Math.round(s.score)}</span>
          </div>
          <div class="xpbar"><i style={{ width: `${Math.round(rank.pct * 100)}%` }} /></div>
        </div>
        <button class={`iconbtn ${spin ? 'glow' : ''}`} onClick={() => spin && setWheel(true)} aria-label="Tagesbonus" style={spin ? undefined : { opacity: 0.4 }}>
          <Icon name="wheel" />
        </button>
        <button class="iconbtn" onClick={() => setSheet({ t: 'events' })} aria-label="Ereignisse">
          <Icon name="bell" />
          {s.events.length > 0 && <span class="badge">{s.events.length}</span>}
        </button>
        <button class="iconbtn" onClick={() => { setSheet({ t: 'inbox' }); markRead(); }} aria-label="Postfach">
          <Icon name="mail" />
          {unread > 0 && <span class="badge">{unread}</span>}
        </button>
      </div>
      <div class="levelbar" onClick={() => setTab('ziele')}>
        <span class="lv">Level {s.level}</span>
        <div class="goal">
          <span>{s.won ? 'Du bist der Mogul von Aurelien!' : goal.progress}</span>
          <Progress value={s.won ? 1 : goal.pct} />
        </div>
      </div>
      {s.dunning > 0 && (
        <div style={{ background: '#fbe9e7', padding: '8px 12px', fontSize: '12.5px', fontWeight: 600, color: '#8a1f15', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Icon name="warn" size={18} /> Mahnstufe {s.dunning} von 5 – Konto über dem Dispo ({fmt(dispoLimit(s))}). Gleiche bis Monatsende aus!
        </div>
      )}

      <div class={`content ${tab === 'karte' ? 'full' : ''}`}>
        {tab === 'karte' && (
          <MapTab
            s={s}
            openRegion={(id) => setSheet({ t: 'region', id })}
            openEvents={() => setSheet(s.events.length === 1 ? { t: 'event', id: s.events[0].uid } : { t: 'events' })}
            goQuests={() => setTab('ziele')}
          />
        )}
        {tab === 'portfolio' && <PortfolioTab s={s} openProperty={(id) => setSheet({ t: 'property', id })} />}
        {tab === 'markt' && <MarketTab s={s} act={act} openOffer={(id) => setSheet({ t: 'offer', id })} />}
        {tab === 'bank' && <BankTab s={s} act={act} openLoan={(loan) => setSheet({ t: 'loan', loan })} />}
        {tab === 'ziele' && <GoalsTab s={s} act={act} onEditAvatar={onEditAvatar} onQuit={onQuit} onRestart={onRestart} />}
      </div>

      <button class="btn gold next-month" onClick={tryNext}>
        <Icon name="next" size={18} /> Nächster Monat
      </button>

      <nav class="bottomnav">
        {(
          [
            ['karte', 'map', 'Karte'],
            ['portfolio', 'home', 'Portfolio'],
            ['markt', 'market', 'Markt'],
            ['bank', 'bank', 'Bank'],
            ['ziele', 'target', 'Ziele'],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <button key={id} class={tab === id ? 'on' : ''} onClick={() => { setTab(id); sfx.tap(); }}>
            <Icon name={icon} size={22} stroke={tab === id ? 2.2 : 1.8} />
            {label}
            {id === 'ziele' && claimable > 0 && <span class="badge">{claimable}</span>}
            {id === 'markt' && s.offers.some((o) => o.hot) && <span class="badge" style={{ background: 'var(--orange)' }}>!</span>}
          </button>
        ))}
      </nav>

      {sheet?.t === 'property' && <PropertySheet s={s} pid={sheet.id} act={act} onClose={() => setSheet(null)} openTour={setTour} openPlanner={setPlanner} />}
      {sheet?.t === 'offer' && (
        <OfferSheet s={s} oid={sheet.id} act={act} onClose={() => setSheet(null)} onBought={(id) => setSheet({ t: 'property', id })} openTour={setTour} openDuel={() => undefined} />
      )}
      {sheet?.t === 'region' && (
        <RegionSheet s={s} rid={sheet.id} onClose={() => setSheet(null)} openOffer={(id) => setSheet({ t: 'offer', id })} openProperty={(id) => setSheet({ t: 'property', id })} />
      )}
      {sheet?.t === 'event' && <EventSheet s={s} uid={sheet.id} act={act} onClose={() => setSheet(s.events.length > 1 ? { t: 'events' } : null)} />}
      {sheet?.t === 'events' && <EventsListSheet s={s} onClose={() => setSheet(null)} openEvent={(id) => setSheet({ t: 'event', id })} />}
      {sheet?.t === 'inbox' && <InboxSheet s={s} onClose={() => setSheet(null)} />}
      {sheet?.t === 'loan' && <LoanSheet s={s} type={sheet.loan} act={act} onClose={() => setSheet(null)} />}

      {tour && <Tour s={s} target={tour} act={act} onClose={() => setTour(null)} toast={toast} />}
      {planner && <Planner s={s} pid={planner} act={act} onClose={() => setPlanner(null)} />}
      {s.duel && <DuelModal s={s} act={act} onBought={(id) => setSheet({ t: 'property', id })} onClose={() => setSheet(null)} />}
      {wheel && <WheelModal act={act} onClose={() => setWheel(false)} />}

      {confirmNext && (
        <Modal onClose={() => setConfirmNext(false)}>
          <h2>Offene Ereignisse</h2>
          <NpcSay npc="hilde">
            Du hast noch {s.events.length} offene{s.events.length === 1 ? 's' : ''} Ereignis{s.events.length === 1 ? '' : 'se'}. Wenn du nichts tust, wird es meistens teurer!
          </NpcSay>
          <div class="grid2 mt">
            <button class="btn ghost" onClick={() => { setConfirmNext(false); setSheet({ t: 'events' }); }}>Ansehen</button>
            <button class="btn red" onClick={() => { setConfirmNext(false); nextMonth(); }}>Trotzdem weiter</button>
          </div>
        </Modal>
      )}

      {showReport && s.lastReport && !s.pendingLevelUp && s.pendingDemotion === null && !reward && (
        <ReportModal s={s} onClose={() => { dismiss('report'); if (s.events.length) setSheet(s.events.length === 1 ? { t: 'event', id: s.events[0].uid } : { t: 'events' }); }} />
      )}
      {s.pendingLevelUp && <LevelUpModal s={s} onClose={() => dismiss('levelup')} />}
      {s.pendingDemotion !== null && <DemotionModal s={s} onClose={() => dismiss('demotion')} />}
      {reward && !s.pendingLevelUp && s.pendingDemotion === null && !wheel && !s.duel && <RewardModal r={reward} onClose={() => dismiss('reward')} />}
    </div>
  );
}

// ================= Karte =================
function MapTab({ s, openRegion, openEvents, goQuests }: { s: GameState; openRegion: (id: RegionId) => void; openEvents: () => void; goQuests: () => void }) {
  const [list, setList] = useState(false);
  const owned: Record<string, number> = {};
  s.properties.forEach((p) => (owned[p.region] = (owned[p.region] ?? 0) + 1));
  const quests = s.quests ?? [];
  const done = quests.filter((q) => q.progress >= q.target).length;
  if (list)
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: '4px 12px 140px' }}>
        <div class="section-title">
          Regionen <button class="btn small ghost" onClick={() => setList(false)}><Icon name="map" size={16} /> Karte</button>
        </div>
        {REGIONS.map((r) => {
          const open = s.level >= r.unlockLevel;
          return (
            <div key={r.id} class="card" style={{ padding: 0, overflow: 'hidden', cursor: open ? 'pointer' : 'default', opacity: open ? 1 : 0.7 }} onClick={() => open && openRegion(r.id)}>
              <div style={{ aspectRatio: '16/7' }}>
                <RegionImage id={r.id} level={s.level} />
              </div>
              <div style={{ padding: '10px 14px' }}>
                <div class="row between">
                  <h3>{r.name}</h3>
                  {open ? <span class="pill">{fmt(r.pricePerSqm * s.marketIndex[r.id])}/m²</span> : <span class="pill dark"><Icon name="lock" size={12} /> Level {r.unlockLevel}</span>}
                </div>
                <div class="meta">{r.type}{owned[r.id] ? ` · ${owned[r.id]} eigene Objekte` : ''}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  return (
    <>
      <MapView level={s.level} onSelect={(id) => { sfx.tap(); openRegion(id); }} owned={owned} />
      <div class="map-overlay">
        {s.events.length > 0 && (
          <div class="event-banner" onClick={openEvents}>
            <Icon name="warn" size={26} />
            <div class="grow">
              <b>{s.events.length === 1 ? 'Ein Ereignis braucht dich' : `${s.events.length} Ereignisse brauchen dich`}</b>
              <span class="small">Tippe, um zu entscheiden.</span>
            </div>
            <Icon name="chevron" />
          </div>
        )}
        {s.properties.length === 0 && s.level === 1 && s.month < 2 && (
          <div class="card" style={{ margin: 0 }}>
            <NpcSay npc="hilde" mood="happy">
              Willkommen in Aurelien! Tippe auf Kleeweiler, besichtige ein Haus von innen, finde die Mängel und kauf es günstig. Dann renovieren und mit Gewinn verkaufen.
            </NpcSay>
          </div>
        )}
        <div class="card row" style={{ margin: 0, padding: '10px 12px', cursor: 'pointer' }} onClick={goQuests}>
          <Icon name="target" />
          <div class="grow small bold">
            Monatsaufgaben {done}/{quests.length}
            <Progress value={quests.length ? done / quests.length : 0} light />
          </div>
          <button class="btn small ghost" onClick={(e) => { e.stopPropagation(); setList(true); }}>Liste</button>
        </div>
      </div>
    </>
  );
}

function PortfolioTab({ s, openProperty }: { s: GameState; openProperty: (id: string) => void }) {
  const units = s.properties.reduce((a, p) => a + p.units.length, 0);
  const rented = s.properties.reduce((a, p) => a + p.units.filter((u) => u.tenant).length, 0);
  return (
    <>
      <div class="section-title">Dein Immobilienprofil</div>
      <div class="grid2 mb">
        <Stat label="Vermögen" value={fmtShort(netWorth(s))} cls={netWorth(s) < 0 ? 'neg' : ''} />
        <Stat label="Immobilienwert" value={fmtShort(assets(s))} />
        <Stat label="Schulden" value={fmtShort(totalDebt(s))} cls="neg" />
        <Stat label="Miete / Monat" value={fmtShort(monthlyRentIncome(s))} cls="pos" />
        <Stat label="Eigenkapital" value={`${Math.round(equityRatio(s) * 100)} %`} />
        <Stat label="Wohnungen" value={`${rented} / ${units}`} />
      </div>
      <div class="section-title">Objekte <small>{s.properties.length}</small></div>
      {s.properties.length === 0 && (
        <div class="empty">
          <Icon name="home" size={40} />
          Noch keine Immobilien. Schau auf dem Markt vorbei!
        </div>
      )}
      {s.properties.map((p) => <PropRow key={p.id} s={s} p={p} onClick={() => openProperty(p.id)} />)}
    </>
  );
}

function MarketTab({ s, act, openOffer }: { s: GameState; act: Act; openOffer: (id: string) => void }) {
  const [filter, setFilter] = useState<'alle' | 'hot' | 'kauf' | 'auktion' | 'grundstueck'>('alle');
  const opts: { value: typeof filter; label: string }[] = [{ value: 'alle', label: 'Alle' }, { value: 'hot', label: 'Top' }, { value: 'kauf', label: 'Kaufen' }];
  if (s.level >= 4) opts.push({ value: 'auktion', label: 'Auktion' });
  if (s.level >= 5) opts.push({ value: 'grundstueck', label: 'Bauland' });
  const list = s.offers.filter((o) => filter === 'alle' || (filter === 'hot' ? o.hot : o.kind === filter));
  const byRegion = REGIONS.filter((r) => list.some((o) => o.property.region === r.id));
  return (
    <>
      <div class="section-title">
        Immobilienmarkt
        <button class="btn small ghost" disabled={(s.gold ?? 0) < GOLD_COST.reroll} onClick={() => { act((st) => E.rerollOffers(st)); sfx.coin(); }}>
          <Icon name="gold" size={14} /> Neue Angebote ({GOLD_COST.reroll})
        </button>
      </div>
      <div class="mb">
        <Seg value={filter} onChange={setFilter} options={opts} />
      </div>
      {s.offers.some((o) => o.hot) && filter === 'alle' && (
        <div class="card row" style={{ border: '1px solid #f2cdc8' }}>
          <Icon name="flame" class="neg" />
          <div class="grow small">
            <b>Top-Objekte</b> sind besonders günstig – aber Viktor will sie auch. Wer nicht zuschlägt, verliert sie am Monatsende an ihn.
          </div>
        </div>
      )}
      {byRegion.map((r) => (
        <div key={r.id}>
          <div class="section-title" style={{ fontSize: '14px', margin: '14px 2px 8px' }}>{r.name}</div>
          {list.filter((o) => o.property.region === r.id).map((o) => <OfferRow key={o.id} s={s} oid={o.id} onClick={() => openOffer(o.id)} />)}
        </div>
      ))}
      {list.length === 0 && <div class="empty"><Icon name="search" size={40} />Gerade nichts im Angebot.</div>}
    </>
  );
}

function BankTab({ s, act, openLoan }: { s: GameState; act: Act; openLoan: (t: LoanType) => void }) {
  const mood = s.dunning > 0 ? 'sad' : s.score > 70 ? 'happy' : undefined;
  const say =
    s.dunning > 0
      ? 'Wir haben ein Problem. Bitte bringen Sie Ihr Konto schnell wieder in Ordnung!'
      : s.score >= 75
        ? 'Hervorragende Bonität! Für Sie habe ich immer die besten Zinsen.'
        : s.score >= 50
          ? 'Solide Zahlen. Weiter so, dann werden die Zinsen noch besser.'
          : 'Ihre Bonität ist angeschlagen. Seien Sie vorsichtig mit neuen Schulden.';
  return (
    <>
      <div class="section-title">Bank &amp; Finanzen</div>
      <div class="card">
        <NpcSay npc="krause" mood={mood}>{say}</NpcSay>
        <div class="row between mt small bold"><span>Bonität</span><span>{Math.round(s.score)} / 100</span></div>
        <div class="gauge mt"><i style={{ left: `${s.score}%` }} /></div>
        <div class="kv mt">
          <span>Kontostand</span><Money v={s.cash} sign />
          <span>Dispokredit (12 % Zins)</span><Money v={dispoLimit(s)} />
          <span>Schulden gesamt</span><Money v={totalDebt(s)} />
          <span>Kreditraten / Monat</span><Money v={s.loans.reduce((a, l) => a + l.payment, 0)} />
        </div>
      </div>
      <div class="section-title">Deine Kredite <small>{s.loans.length}</small></div>
      {s.loans.length === 0 && <div class="empty">Schuldenfrei.</div>}
      {s.loans.map((l) => (
        <div key={l.id} class="card">
          <div class="row between">
            <h3>{l.label}</h3>
            <span class="pill">{l.type === 'investor' ? 'Beteiligung' : `${(l.rate * 100).toFixed(1).replace('.', ',')} %`}</span>
          </div>
          <div class="kv mt">
            <span>Restschuld</span><Money v={l.principal} />
            {l.type !== 'investor' ? (
              <>
                <span>Rate / Monat</span><Money v={l.payment} />
                <span>Restlaufzeit</span><span>{l.monthsLeft} Monate</span>
              </>
            ) : (
              <>
                <span>Rückkauf für</span><Money v={l.principal * 1.2} />
              </>
            )}
          </div>
          <div class="mt"><Progress value={1 - l.principal / l.original} light /></div>
          <div class="grid2 mt">
            <button class="btn ghost small" disabled={s.cash < Math.min(l.principal, 10000)} onClick={() => act((st) => E.repayLoan(st, l.id, 10000))}>
              {fmtShort(Math.min(10000, l.principal))} tilgen
            </button>
            <button class="btn small" disabled={s.cash < l.principal * (l.type === 'investor' ? 1.2 : 1)} onClick={() => { act((st) => E.repayLoan(st, l.id, l.principal)); sfx.success(); }}>
              Komplett ablösen
            </button>
          </div>
        </div>
      ))}
      <div class="section-title">Neuer Kredit</div>
      {(['renovierung', 'investor'] as LoanType[]).map((t) => {
        const info = E.LOAN_INFO[t];
        const locked = s.level < info.minLevel;
        return (
          <div key={t} class="card">
            <div class="row between">
              <h3>{info.name}</h3>
              {locked ? <span class="pill dark"><Icon name="lock" size={12} /> Level {info.minLevel}</span> : <span class="pill blue">bis {fmtShort(E.loanLimit(s, t))}</span>}
            </div>
            <p class="hint">{info.text}</p>
            {!locked && <button class="btn blue small" disabled={E.loanLimit(s, t) < 1000} onClick={() => openLoan(t)}>Beantragen</button>}
          </div>
        );
      })}
      <div class="card">
        <h3>Hypothek &amp; Baufinanzierung</h3>
        <p class="hint">{s.level < 3 ? 'Ab Level 3. ' : ''}Eine Hypothek nimmst du direkt beim Objekt auf. Die Baufinanzierung wählst du beim Baustart.</p>
      </div>
      {s.level >= 3 ? (
        <>
          <div class="section-title">Versicherungen</div>
          <Toggle label="Gebäudeversicherung" sub="Zahlt 90 % bei Wasser-, Sturm- und Einbruchschäden" on={s.insurance.gebaeude} onChange={(v) => act((st) => { st.insurance.gebaeude = v; })} />
          <Toggle label="Mietausfallversicherung" sub="Ersetzt 50 % ausgefallener Mieten · 3 % der Mieteinnahmen" on={s.insurance.mietausfall} onChange={(v) => act((st) => { st.insurance.mietausfall = v; })} />
          <Toggle label="Rechtsschutz" sub="Halbiert Anwalts- und Gerichtskosten" on={s.insurance.rechtsschutz} onChange={(v) => act((st) => { st.insurance.rechtsschutz = v; })} />
        </>
      ) : (
        <div class="card"><h3>Versicherungen</h3><p class="hint">Ab Level 3.</p></div>
      )}
      {s.level >= 4 && (
        <>
          <div class="section-title">Team</div>
          <Toggle label="Hausverwaltung" sub="Vermietet freie Wohnungen automatisch, regelt Lärm und Mahnungen · 6 % der Mieten" on={s.hausverwaltung} onChange={(v) => act((st) => { st.hausverwaltung = v; })} />
        </>
      )}
      {s.level >= 6 && (
        <div class="card">
          <h3>GmbH</h3>
          {s.gmbh ? (
            <p class="small bold">{s.playerName} Immobilien GmbH – 0,5 % bessere Zinsen.</p>
          ) : (
            <>
              <p class="hint">Eigene Firma gründen: 0,5 % bessere Zinsen, Pflicht für Level 6.</p>
              <button class="btn" disabled={s.cash < E.GMBH_COST} onClick={() => { act((st) => E.foundGmbh(st)); sfx.success(); }}>GmbH gründen ({fmt(E.GMBH_COST)})</button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function GoalsTab({ s, act, onEditAvatar, onQuit, onRestart }: { s: GameState; act: Act; onEditAvatar: () => void; onQuit: () => void; onRestart: () => void }) {
  const def = levelDef(s.level);
  const g = def.check(s);
  const [confirm, setConfirm] = useState(false);
  const [sub, setSub] = useState<'ziele' | 'erfolge' | 'rangliste' | 'mehr'>('ziele');
  const rank = rankInfo(s.xp ?? 0);
  const lb = leaderboard(s);
  return (
    <>
      <div class="card mt row">
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: '#e9e4da', flex: '0 0 auto' }}>
          <Avatar config={s.avatar} portrait />
        </div>
        <div class="grow">
          <div class="bold">{s.playerName}</div>
          <div class="small muted">Rang {rank.rank} · {rank.title}</div>
          <div class="mt"><Progress value={rank.pct} light /></div>
          <div class="hint">{(s.xp ?? 0).toLocaleString('de-DE')} / {rank.next.toLocaleString('de-DE')} XP bis Rang {rank.rank + 1}</div>
        </div>
      </div>
      <div class="subtabs">
        {(
          [
            ['ziele', 'Ziele'],
            ['erfolge', 'Erfolge'],
            ['rangliste', 'Rangliste'],
            ['mehr', 'Mehr'],
          ] as const
        ).map(([id, l]) => (
          <button key={id} class={sub === id ? 'on' : ''} onClick={() => setSub(id)}>{l}</button>
        ))}
      </div>
      {sub === 'ziele' && (
        <>
          <div class="card">
            <h3>Level {s.level}: {LEVEL_TITLES[s.level]}</h3>
            <div class="mt"><NpcSay npc="hilde" mood="happy">{LEVEL_STORY[s.level]}</NpcSay></div>
            <div class="divider" />
            <div class="bold small">{def.goal}</div>
            <div class="hint mt">{g.progress}</div>
            <Progress value={s.won ? 1 : g.pct} light />
          </div>
          <div class="section-title">Monatsaufgaben <small>neu in jedem Monat</small></div>
          <div class="card">
            {(s.quests ?? []).map((q) => {
              const done = q.progress >= q.target;
              return (
                <div key={q.id} class={`quest ${done ? 'done' : ''}`}>
                  <div class="qi"><Icon name={done ? 'check' : 'target'} size={18} /></div>
                  <div class="grow">
                    <div class="small bold">{q.title}</div>
                    <div class="hint">{q.progress}/{q.target} · {fmtShort(q.reward.cash)}, {q.reward.xp} XP, {q.reward.gold} Gold</div>
                  </div>
                  {q.claimed ? (
                    <span class="pill green">erledigt</span>
                  ) : done ? (
                    <button class="btn gold small" onClick={() => { act((st) => claimQuest(st, q.id)); sfx.coin(); }}>Abholen</button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div class="section-title">Dein Weg</div>
          <div class="levelpath">
            {LEVELS.map((l) => {
              const st = l.level < s.level || (s.won && l.level === 10) ? 'done' : l.level === s.level ? 'cur' : '';
              return (
                <div key={l.level} class={`lvnode ${st}`}>
                  <div class="n">{st === 'done' ? <Icon name="check" size={16} /> : l.level}</div>
                  <div class="grow">
                    <div class="t">{LEVEL_TITLES[l.level]}{l.region ? ` · ${regionById(l.region).name}` : ''}</div>
                    <div class="d">{l.level <= s.level ? l.goal : `Neu: ${l.unlocks.join(', ')}`}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {sub === 'erfolge' && (
        <>
          <div class="section-title">Erfolge <small>{(s.achievements ?? []).length} / {ACHIEVEMENTS.length}</small></div>
          <div class="ach-grid">
            {ACHIEVEMENTS.map((a) => {
              const on = (s.achievements ?? []).includes(a.id);
              return (
                <div key={a.id} class={`ach ${on ? 'on' : ''}`}>
                  <div class="ai"><Icon name={on ? 'trophy' : 'lock'} size={18} /></div>
                  <div class="bold">{a.title}</div>
                  <div style={{ fontWeight: 500, marginTop: '2px' }}>{a.text}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {sub === 'rangliste' && (
        <>
          <div class="section-title">Reichste Investoren Aureliens</div>
          <div class="card">
            {lb.map((e, i) => (
              <div key={e.name} class={`lb-row ${e.me ? 'mine' : ''}`}>
                <span class="rk">{i + 1}</span>
                <span class="grow">{e.name}</span>
                <span class="bold">{fmtShort(e.wealth)}</span>
              </div>
            ))}
          </div>
          <div class="section-title">Duell-Bilanz gegen Viktor</div>
          <div class="grid3">
            <Stat label="Gewonnen" value={s.rival?.won ?? 0} cls="pos" />
            <Stat label="Verloren" value={s.rival?.lost ?? 0} cls="neg" />
            <Stat label="Geschnappt" value={s.rival?.snatched ?? 0} />
          </div>
        </>
      )}
      {sub === 'mehr' && (
        <>
          <div class="section-title">Statistik</div>
          <div class="card">
            <div class="kv">
              <span>Gewinnbringende Verkäufe</span><span>{s.stats.profitableFlips}</span>
              <span>Bester Flip</span><Money v={s.stats.bestFlipProfit} />
              <span>Mieteinnahmen gesamt</span><Money v={s.stats.totalRentCollected} />
              <span>Entdeckte Mängel</span><span>{s.counters?.defectFound ?? 0}</span>
              <span>Rückstufungen</span><span>{s.demotions}</span>
              <span>Spielzeit</span><span>{s.month} Monate</span>
            </div>
          </div>
          <div class="section-title">Einstellungen</div>
          <Toggle label="Töne & Vibration" on={s.settings?.sound ?? true} onChange={(v) => act((st) => { st.settings = { ...(st.settings ?? { sound: true }), sound: v }; })} />
          <button class="btn ghost block" onClick={onEditAvatar}><Icon name="people" size={18} /> Figur bearbeiten</button>
          <button class="btn ghost block mt" onClick={onQuit}><Icon name="logout" size={18} /> Zum Titelbildschirm</button>
          {!confirm ? (
            <button class="btn red block mt" onClick={() => setConfirm(true)}>Neues Spiel starten</button>
          ) : (
            <div class="card mt">
              <p class="bold small">Wirklich? Dein Spielstand wird gelöscht.</p>
              <div class="grid2">
                <button class="btn ghost" onClick={() => setConfirm(false)}>Abbrechen</button>
                <button class="btn red" onClick={onRestart}>Ja, löschen</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ================= Modals =================
function ReportModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  const r = s.lastReport!;
  const delta = r.rent + r.sales - r.costs - r.loanPayments;
  return (
    <Modal onClose={onClose}>
      <h2>{monthLabel(r.month)}</h2>
      <p class="hint center" style={{ marginTop: 0 }}>Monatsbericht</p>
      <div class="kv mb">
        <span>Mieteinnahmen</span><Money v={r.rent} sign />
        {r.sales > 0 && (<><span>Verkäufe</span><Money v={r.sales} sign /></>)}
        <span>Instandhaltung &amp; Kosten</span><Money v={-r.costs} sign />
        {r.loanPayments > 0 && (<><span>Kreditraten</span><Money v={-r.loanPayments} sign /></>)}
        <span style={{ color: 'var(--ink)', fontWeight: 800 }}>Saldo</span><Money v={delta} sign />
      </div>
      <div class="divider" />
      {r.lines.map((l, i) => <div key={i} class="report-line">{l.replace(/^[^\p{L}\d„(]+/u, '')}</div>)}
      {s.events.length > 0 && <div class="report-line bold" style={{ color: 'var(--red)' }}>{s.events.length} neue{s.events.length === 1 ? 's' : ''} Ereignis{s.events.length === 1 ? '' : 'se'}!</div>}
      <button class="btn gold block big mt" onClick={onClose}>Weiter</button>
    </Modal>
  );
}

function LevelUpModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  const lvl = s.pendingLevelUp!;
  const def = levelDef(lvl);
  useState(() => sfx.levelup());
  return (
    <div class="overlay center">
      <Confetti />
      <div class="modal">
        <h2>Level {lvl}</h2>
        <p class="center bold" style={{ marginTop: 0, color: 'var(--gold)' }}>{LEVEL_TITLES[lvl]}</p>
        {def.region && (
          <div class="hero region-hero">
            <RegionImage id={def.region} level={lvl} />
            <div class="flag"><span class="pill dark">Neue Region: {regionById(def.region).name}</span></div>
          </div>
        )}
        <NpcSay npc="hilde" mood="happy">{LEVEL_STORY[lvl]}</NpcSay>
        <div class="row wrap mt">
          {def.unlocks.map((u) => <span key={u} class="pill green"><Icon name="check" size={12} /> {u}</span>)}
        </div>
        <div class="card flat mt"><b>Neues Ziel:</b> {def.goal}</div>
        <button class="btn gold block big" onClick={onClose}>Weiter geht's</button>
      </div>
    </div>
  );
}

function DemotionModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  useState(() => sfx.fail());
  return (
    <Modal>
      <h2>Insolvenz</h2>
      <NpcSay npc="krause" mood="sad">
        Es tut mir leid. Sie konnten Ihre Kredite nicht mehr bedienen. Sie starten neu am Anfang von Level {s.pendingDemotion}: {LEVEL_TITLES[s.pendingDemotion ?? 1]}.
      </NpcSay>
      <div class="mt"><NpcSay npc="hilde">Kopf hoch, Kind. Jeder große Vermieter ist mal hingefallen. Diesmal achtest du auf deinen Dispo.</NpcSay></div>
      <button class="btn block big mt" onClick={onClose}>Neu anfangen</button>
    </Modal>
  );
}

export function WinModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <div class="overlay center">
      <Confetti />
      <div class="modal">
        <h2>Mogul von Aurelien</h2>
        <div style={{ height: '240px', display: 'flex', justifyContent: 'center' }}>
          <Avatar config={{ ...s.avatar, mouth: 'grinsen' }} />
        </div>
        <NpcSay npc="hilde" mood="happy">
          {s.playerName}, aus einem Lottoschein hast du ein Imperium gemacht. Vermögen: {fmtShort(netWorth(s))}. Ich bin so stolz auf dich!
        </NpcSay>
        <p class="hint center">Im Endlos-Modus kannst du weiterspielen und die Rangliste anführen.</p>
        <button class="btn gold block big" onClick={onClose}>Weiterspielen</button>
      </div>
    </div>
  );
}
