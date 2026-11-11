import { useState } from 'preact/hooks';
import { Avatar } from '../art/Avatar';
import { RegionScene } from '../art/RegionScene';
import { LEVEL_STORY, LEVEL_TITLES, MONTH_NAMES, REGIONS, regionById } from '../game/data';
import { GMBH_COST, LOAN_INFO, foundGmbh, loanLimit, repayLoan } from '../game/engine';
import {
  assets, canBorrow, dispoLimit, equityRatio, fmt, fmtShort, monthlyRentIncome, netWorth, totalDebt,
} from '../game/econ';
import { LEVELS, levelDef } from '../game/levels';
import type { GameState, LoanType, RegionId } from '../game/types';
import { Confetti, Modal, Money, NpcSay, Progress, Seg, Toggle } from './common';
import {
  EventSheet, EventsListSheet, InboxSheet, LoanSheet, OfferRow, OfferSheet, PropRow, PropertySheet, RegionSheet, type Act,
} from './sheets';

type Tab = 'welt' | 'portfolio' | 'markt' | 'bank' | 'ziele';
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
  dismiss: (k: 'levelup' | 'demotion' | 'report' | 'win') => void;
  showReport: boolean;
  markRead: () => void;
}

export const monthLabel = (m: number) => `${MONTH_NAMES[m % 12]}, Jahr ${Math.floor(m / 12) + 1}`;

export function Game({ s, act, nextMonth, onEditAvatar, onQuit, onRestart, dismiss, showReport, markRead }: Props) {
  const [tab, setTab] = useState<Tab>('welt');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [confirmNext, setConfirmNext] = useState(false);
  const unread = s.messages.filter((m) => !m.read).length;
  const goal = levelDef(s.level).check(s);

  const tryNext = () => {
    if (s.events.length > 0) setConfirmNext(true);
    else nextMonth();
  };

  return (
    <div class="game">
      <div class="topbar">
        <div class="me" onClick={() => setTab('ziele')}>
          <Avatar config={s.avatar} portrait />
        </div>
        <div class="stats">
          <div class={`cash ${s.cash < 0 ? 'neg' : ''}`}>{fmt(s.cash)}</div>
          <div class="sub">
            {s.playerName} · {monthLabel(s.month)} · Bonität {Math.round(s.score)}
          </div>
        </div>
        <button class="iconbtn" onClick={() => setSheet({ t: 'events' })} aria-label="Ereignisse">
          🔔{s.events.length > 0 && <span class="badge">{s.events.length}</span>}
        </button>
        <button class="iconbtn" onClick={() => { setSheet({ t: 'inbox' }); markRead(); }} aria-label="Postfach">
          ✉️{unread > 0 && <span class="badge">{unread}</span>}
        </button>
      </div>
      <div class="levelbar" onClick={() => setTab('ziele')}>
        <span class="lv">Lv {s.level}</span>
        <div class="goal">
          {s.won ? 'Du bist der Mogul von Aurelien! 👑' : goal.progress}
          <Progress value={s.won ? 1 : goal.pct} />
        </div>
      </div>
      {s.dunning > 0 && (
        <div class="card" style={{ margin: '0 12px 8px', background: '#fde0dc' }}>
          <b>⚠️ Mahnstufe {s.dunning} von 5</b>
          <div class="small bold">Dein Konto liegt über dem Dispo ({fmt(dispoLimit(s))}). Gleiche bis Monatsende aus, sonst eskaliert es!</div>
        </div>
      )}

      <div class="content">
        {tab === 'welt' && <WorldTab s={s} openRegion={(id) => setSheet({ t: 'region', id })} openEvents={() => setSheet(s.events.length === 1 ? { t: 'event', id: s.events[0].uid } : { t: 'events' })} />}
        {tab === 'portfolio' && <PortfolioTab s={s} openProperty={(id) => setSheet({ t: 'property', id })} />}
        {tab === 'markt' && <MarketTab s={s} openOffer={(id) => setSheet({ t: 'offer', id })} />}
        {tab === 'bank' && <BankTab s={s} act={act} openLoan={(loan) => setSheet({ t: 'loan', loan })} />}
        {tab === 'ziele' && <GoalsTab s={s} onEditAvatar={onEditAvatar} onQuit={onQuit} onRestart={onRestart} />}
      </div>

      <button class="btn next-month" onClick={tryNext}>
        ⏭ Nächster Monat
      </button>

      <nav class="bottomnav">
        {(
          [
            ['welt', '🗺️', 'Welt'],
            ['portfolio', '🏠', 'Portfolio'],
            ['markt', '🛒', 'Markt'],
            ['bank', '🏦', 'Bank'],
            ['ziele', '🎯', 'Ziele'],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <button key={id} class={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {sheet?.t === 'property' && <PropertySheet s={s} pid={sheet.id} act={act} onClose={() => setSheet(null)} />}
      {sheet?.t === 'offer' && <OfferSheet s={s} oid={sheet.id} act={act} onClose={() => setSheet(null)} onBought={(id) => setSheet({ t: 'property', id })} />}
      {sheet?.t === 'region' && (
        <RegionSheet s={s} rid={sheet.id} onClose={() => setSheet(null)} openOffer={(id) => setSheet({ t: 'offer', id })} openProperty={(id) => setSheet({ t: 'property', id })} />
      )}
      {sheet?.t === 'event' && <EventSheet s={s} uid={sheet.id} act={act} onClose={() => setSheet(s.events.length > 1 ? { t: 'events' } : null)} />}
      {sheet?.t === 'events' && <EventsListSheet s={s} onClose={() => setSheet(null)} openEvent={(id) => setSheet({ t: 'event', id })} />}
      {sheet?.t === 'inbox' && <InboxSheet s={s} onClose={() => setSheet(null)} />}
      {sheet?.t === 'loan' && <LoanSheet s={s} type={sheet.loan} act={act} onClose={() => setSheet(null)} />}

      {confirmNext && (
        <Modal onClose={() => setConfirmNext(false)}>
          <h2>Offene Ereignisse!</h2>
          <NpcSay npc="hilde">
            Du hast noch {s.events.length} offene{s.events.length === 1 ? 's' : ''} Ereignis{s.events.length === 1 ? '' : 'se'}. Wenn du nichts tust, wird es meistens teurer!
          </NpcSay>
          <div class="grid2 mt">
            <button class="btn ghost" onClick={() => { setConfirmNext(false); setSheet({ t: 'events' }); }}>Ansehen</button>
            <button class="btn red" onClick={() => { setConfirmNext(false); nextMonth(); }}>Trotzdem weiter</button>
          </div>
        </Modal>
      )}

      {showReport && s.lastReport && !s.pendingLevelUp && s.pendingDemotion === null && (
        <ReportModal s={s} onClose={() => { dismiss('report'); if (s.events.length) setSheet(s.events.length === 1 ? { t: 'event', id: s.events[0].uid } : { t: 'events' }); }} />
      )}
      {s.pendingLevelUp && <LevelUpModal s={s} onClose={() => dismiss('levelup')} />}
      {s.pendingDemotion !== null && <DemotionModal s={s} onClose={() => dismiss('demotion')} />}
    </div>
  );
}

// ================= Tabs =================
function WorldTab({ s, openRegion, openEvents }: { s: GameState; openRegion: (id: RegionId) => void; openEvents: () => void }) {
  const unlocked = REGIONS.filter((r) => s.level >= r.unlockLevel);
  const next = REGIONS.filter((r) => s.level < r.unlockLevel).slice(0, 2);
  return (
    <>
      {s.events.length > 0 && (
        <div class="event-banner" onClick={openEvents}>
          <span style={{ fontSize: '30px' }}>🚨</span>
          <div class="grow">
            <b>{s.events.length === 1 ? 'Ein Ereignis braucht dich!' : `${s.events.length} Ereignisse brauchen dich!`}</b>
            <div class="small bold">Tippe, um zu entscheiden.</div>
          </div>
          <span style={{ fontSize: '20px' }}>›</span>
        </div>
      )}
      {s.properties.length === 0 && s.level === 1 && (
        <div class="card">
          <NpcSay npc="hilde" mood="happy">
            Willkommen in Aurelien, {s.playerName}! Tippe auf <b style={{ display: 'inline', color: 'inherit' }}>Kleeweiler</b> und schau dir die Angebote an. Kauf ein günstiges Haus, lass Bruno renovieren und verkauf es mit Gewinn. Mit „Nächster Monat“ vergeht die Zeit.
          </NpcSay>
        </div>
      )}
      <div class="section-title">Aurelien <small>{unlocked.length} von {REGIONS.length} Regionen</small></div>
      {unlocked.map((r) => {
        const mine = s.properties.filter((p) => p.region === r.id).length;
        const offers = s.offers.filter((o) => o.property.region === r.id).length;
        return (
          <div key={r.id} class="card region-card" onClick={() => openRegion(r.id)}>
            <RegionScene region={r.id} />
            <div class="info">
              <div class="row between">
                <h3>{r.name}</h3>
                <span class="pill">{r.type}</span>
              </div>
              <div class="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span class="pill gold">{fmt(r.pricePerSqm * s.marketIndex[r.id])}/m²</span>
                {mine > 0 && <span class="pill green">🏠 {mine} Objekt{mine > 1 ? 'e' : ''}</span>}
                <span class="pill blue">🏷️ {offers} Angebote</span>
              </div>
            </div>
          </div>
        );
      })}
      {next.map((r) => (
        <div key={r.id} class="card region-card" style={{ opacity: 0.9 }}>
          <RegionScene region={r.id} locked />
          <div class="lock">
            <div>🔒</div>
            {r.name} – ab Level {r.unlockLevel}
          </div>
          <div class="info">
            <h3>{r.name}</h3>
            <div class="meta">{r.type}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function PortfolioTab({ s, openProperty }: { s: GameState; openProperty: (id: string) => void }) {
  return (
    <>
      <div class="section-title">Dein Immobilienprofil</div>
      <div class="card">
        <div class="grid2">
          <div class="stat-tile"><div class="l">Vermögen</div><div class={`v ${netWorth(s) < 0 ? 'neg' : ''}`}>{fmtShort(netWorth(s))}</div></div>
          <div class="stat-tile"><div class="l">Immobilienwert</div><div class="v">{fmtShort(assets(s))}</div></div>
          <div class="stat-tile"><div class="l">Schulden</div><div class="v neg">{fmtShort(totalDebt(s))}</div></div>
          <div class="stat-tile"><div class="l">Miete / Monat</div><div class="v pos">{fmtShort(monthlyRentIncome(s))}</div></div>
          <div class="stat-tile"><div class="l">Eigenkapital</div><div class="v">{Math.round(equityRatio(s) * 100)} %</div></div>
          <div class="stat-tile"><div class="l">Wohnungen</div><div class="v">{s.properties.reduce((a, p) => a + p.units.filter((u) => u.tenant).length, 0)} / {s.properties.reduce((a, p) => a + p.units.length, 0)} vermietet</div></div>
        </div>
      </div>
      <div class="section-title">Objekte <small>{s.properties.length}</small></div>
      {s.properties.length === 0 && (
        <div class="empty">
          <div class="big">🏚️</div>
          Noch keine Immobilien. Schau auf dem Markt vorbei!
        </div>
      )}
      {s.properties.map((p) => (
        <PropRow key={p.id} s={s} p={p} onClick={() => openProperty(p.id)} />
      ))}
    </>
  );
}

function MarketTab({ s, openOffer }: { s: GameState; openOffer: (id: string) => void }) {
  const [filter, setFilter] = useState<'alle' | 'kauf' | 'auktion' | 'grundstueck'>('alle');
  const opts = [{ value: 'alle' as const, label: 'Alle' }, { value: 'kauf' as const, label: 'Kaufen' }];
  if (s.level >= 4) opts.push({ value: 'auktion' as never, label: 'Auktion' });
  if (s.level >= 5) opts.push({ value: 'grundstueck' as never, label: 'Bauland' });
  const list = s.offers.filter((o) => filter === 'alle' || o.kind === filter);
  const byRegion = REGIONS.filter((r) => list.some((o) => o.property.region === r.id));
  return (
    <>
      <div class="section-title">Immobilienmarkt <small>neue Angebote jeden Monat</small></div>
      <div class="mb">
        <Seg value={filter} onChange={setFilter} options={opts} />
      </div>
      {byRegion.map((r) => (
        <div key={r.id}>
          <div class="section-title" style={{ fontSize: '15px' }}>📍 {r.name}</div>
          {list.filter((o) => o.property.region === r.id).map((o) => (
            <OfferRow key={o.id} s={s} oid={o.id} onClick={() => openOffer(o.id)} />
          ))}
        </div>
      ))}
      {list.length === 0 && <div class="empty"><div class="big">🔍</div>Gerade nichts im Angebot.</div>}
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
      <div class="section-title">Bank & Finanzen</div>
      <div class="card">
        <NpcSay npc="krause" mood={mood}>{say}</NpcSay>
        <div class="mt bold small">Bonität: {Math.round(s.score)} / 100</div>
        <div class="gauge mt"><i style={{ left: `${s.score}%` }} /></div>
        <div class="kv mt">
          <span>Kontostand</span>
          <Money v={s.cash} sign />
          <span>Dispokredit (12 % Zins)</span>
          <Money v={dispoLimit(s)} />
          <span>Schulden gesamt</span>
          <Money v={totalDebt(s)} />
          <span>Kreditraten / Monat</span>
          <Money v={s.loans.reduce((a, l) => a + l.payment, 0)} />
        </div>
      </div>

      <div class="section-title">Deine Kredite <small>{s.loans.length}</small></div>
      {s.loans.length === 0 && <div class="empty">Schuldenfrei! 🎉</div>}
      {s.loans.map((l) => (
        <div key={l.id} class="card">
          <div class="row between">
            <h3 style={{ fontSize: '15px' }}>{l.label}</h3>
            <span class="pill">{l.type === 'investor' ? 'Beteiligung' : `${(l.rate * 100).toFixed(1).replace('.', ',')} %`}</span>
          </div>
          <div class="kv mt">
            <span>Restschuld</span>
            <Money v={l.principal} />
            {l.type !== 'investor' ? (
              <>
                <span>Rate / Monat</span>
                <Money v={l.payment} />
                <span>Restlaufzeit</span>
                <span class="bold">{l.monthsLeft} Monate</span>
              </>
            ) : (
              <>
                <span>Rückkauf für</span>
                <Money v={l.principal * 1.2} />
              </>
            )}
          </div>
          <Progress value={1 - l.principal / l.original} light />
          <div class="grid2 mt">
            <button class="btn ghost small" disabled={s.cash < Math.min(l.principal, 10000)} onClick={() => act((st) => repayLoan(st, l.id, 10000))}>
              {fmtShort(Math.min(10000, l.principal))} tilgen
            </button>
            <button class="btn small" disabled={s.cash < l.principal * (l.type === 'investor' ? 1.2 : 1)} onClick={() => act((st) => repayLoan(st, l.id, l.principal))}>
              Komplett ablösen
            </button>
          </div>
        </div>
      ))}

      <div class="section-title">Neuer Kredit</div>
      {(['renovierung', 'investor'] as LoanType[]).map((t) => {
        const info = LOAN_INFO[t];
        const locked = s.level < info.minLevel;
        return (
          <div key={t} class="card">
            <div class="row between">
              <h3 style={{ fontSize: '15px' }}>{info.name}</h3>
              {locked ? <span class="pill">🔒 ab Level {info.minLevel}</span> : <span class="pill blue">bis {fmtShort(loanLimit(s, t))}</span>}
            </div>
            <p class="hint">{info.text}</p>
            {!locked && (
              <button class="btn blue small" disabled={!canBorrow(s) || loanLimit(s, t) < 1000} onClick={() => openLoan(t)}>
                Beantragen
              </button>
            )}
          </div>
        );
      })}
      <div class="card">
        <h3 style={{ fontSize: '15px' }}>Hypothek & Baufinanzierung</h3>
        <p class="hint">
          {s.level < 3 ? '🔒 Ab Level 3. ' : ''}Eine Hypothek nimmst du direkt beim Objekt auf (Portfolio → Objekt). Die Baufinanzierung wählst du beim Baustart.
        </p>
      </div>

      {s.level >= 3 && (
        <>
          <div class="section-title">Versicherungen</div>
          <div class="card">
            <Toggle label="🏠 Gebäudeversicherung" sub="Zahlt 90 % bei Wasser-, Sturm- und Einbruchschäden" on={s.insurance.gebaeude} onChange={(v) => act((st) => { st.insurance.gebaeude = v; })} />
            <Toggle label="💸 Mietausfallversicherung" sub="Ersetzt 50 % ausgefallener Mieten · 3 % der Mieteinnahmen" on={s.insurance.mietausfall} onChange={(v) => act((st) => { st.insurance.mietausfall = v; })} />
            <Toggle label="⚖️ Rechtsschutz" sub="Halbiert Anwalts- und Gerichtskosten" on={s.insurance.rechtsschutz} onChange={(v) => act((st) => { st.insurance.rechtsschutz = v; })} />
          </div>
        </>
      )}
      {s.level < 3 && (
        <div class="card">
          <h3 style={{ fontSize: '15px' }}>Versicherungen</h3>
          <p class="hint">🔒 Ab Level 3. Bis dahin: Daumen drücken!</p>
        </div>
      )}
      {s.level >= 4 && (
        <>
          <div class="section-title">Team</div>
          <div class="card">
            <Toggle label="🏢 Hausverwaltung" sub="Vermietet freie Wohnungen automatisch, regelt Lärm und Mahnungen · 6 % der Mieten" on={s.hausverwaltung} onChange={(v) => act((st) => { st.hausverwaltung = v; })} />
          </div>
        </>
      )}
      {s.level >= 6 && (
        <div class="card">
          <h3 style={{ fontSize: '15px' }}>🏛️ GmbH</h3>
          {s.gmbh ? (
            <p class="bold">{s.playerName} Immobilien GmbH ✓ – 0,5 % bessere Zinsen.</p>
          ) : (
            <>
              <p class="hint">Gründe deine eigene Firma: 0,5 % bessere Zinsen und Pflicht für Level 6.</p>
              <button class="btn" disabled={s.cash < GMBH_COST} onClick={() => act((st) => foundGmbh(st))}>
                GmbH gründen ({fmt(GMBH_COST)})
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function GoalsTab({ s, onEditAvatar, onQuit, onRestart }: { s: GameState; onEditAvatar: () => void; onQuit: () => void; onRestart: () => void }) {
  const def = levelDef(s.level);
  const g = def.check(s);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div class="section-title">Level {s.level}: {LEVEL_TITLES[s.level]}</div>
      <div class="card">
        <NpcSay npc="hilde" mood="happy">{LEVEL_STORY[s.level]}</NpcSay>
        <div class="divider" />
        <div class="bold">🎯 {def.goal}</div>
        <div class="small bold muted mt">{g.progress}</div>
        <Progress value={s.won ? 1 : g.pct} light />
        <div class="row mt" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <span class={`pill ${s.levelStats.usedDispo ? '' : 'gold'}`}>{s.levelStats.usedDispo ? '☆' : '★'} Ohne Dispo</span>
          <span class={`pill ${s.levelStats.gotDunning ? '' : 'gold'}`}>{s.levelStats.gotDunning ? '☆' : '★'} Ohne Mahnung</span>
        </div>
      </div>
      <div class="section-title">Dein Weg</div>
      <div class="levelpath">
        {LEVELS.map((l) => {
          const st = l.level < s.level || (s.won && l.level === 10) ? 'done' : l.level === s.level ? 'cur' : '';
          return (
            <div key={l.level} class={`lvnode ${st}`}>
              <div class="n">{st === 'done' ? '✓' : l.level}</div>
              <div class="grow">
                <div class="t">{LEVEL_TITLES[l.level]}{l.region ? ` · ${regionById(l.region).name}` : ''}</div>
                <div class="d">{l.level <= s.level ? l.goal : `Neu: ${l.unlocks.join(', ')}`}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div class="section-title">Statistik</div>
      <div class="card">
        <div class="kv">
          <span>Gewinnbringende Verkäufe</span><span class="bold">{s.stats.profitableFlips}</span>
          <span>Bester Flip</span><Money v={s.stats.bestFlipProfit} />
          <span>Mieteinnahmen gesamt</span><Money v={s.stats.totalRentCollected} />
          <span>Rückstufungen</span><span class="bold">{s.demotions}</span>
          <span>Spielzeit</span><span class="bold">{s.month} Monate</span>
        </div>
      </div>
      <div class="section-title">Einstellungen</div>
      <div class="card">
        <button class="btn ghost block" onClick={onEditAvatar}>🎨 Figur bearbeiten</button>
        <button class="btn ghost block mt" onClick={onQuit}>🏁 Zum Titelbildschirm</button>
        {!confirm ? (
          <button class="btn red block mt" onClick={() => setConfirm(true)}>🗑️ Neues Spiel starten</button>
        ) : (
          <div class="mt">
            <p class="bold small">Wirklich? Dein Spielstand wird gelöscht.</p>
            <div class="grid2">
              <button class="btn ghost" onClick={() => setConfirm(false)}>Abbrechen</button>
              <button class="btn red" onClick={onRestart}>Ja, löschen</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ================= Modals =================
function ReportModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  const r = s.lastReport!;
  const delta = r.rent + r.sales - r.costs - r.loanPayments;
  return (
    <Modal onClose={onClose}>
      <h2>📅 {monthLabel(r.month)}</h2>
      <div class="kv mb">
        <span>Mieteinnahmen</span><Money v={r.rent} sign />
        {r.sales > 0 && (<><span>Verkäufe</span><Money v={r.sales} sign /></>)}
        <span>Instandhaltung & Kosten</span><Money v={-r.costs} sign />
        {r.loanPayments > 0 && (<><span>Kreditraten</span><Money v={-r.loanPayments} sign /></>)}
        {r.interest > 0 && (<><span>davon Zinsen</span><span class="small bold muted">{fmt(r.interest)}</span></>)}
        <span class="bold" style={{ color: 'var(--ink)' }}>Saldo</span><Money v={delta} sign />
      </div>
      <div class="divider" />
      {r.lines.map((l, i) => (
        <div key={i} class="report-line">{l}</div>
      ))}
      {s.events.length > 0 && <div class="report-line bold" style={{ color: 'var(--red)' }}>🔔 {s.events.length} neue{s.events.length === 1 ? 's' : ''} Ereignis{s.events.length === 1 ? '' : 'se'}!</div>}
      <button class="btn block big mt" onClick={onClose}>Weiter</button>
    </Modal>
  );
}

function LevelUpModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  const lvl = s.pendingLevelUp!;
  const def = levelDef(lvl);
  return (
    <div class="overlay center">
      <Confetti />
      <div class="modal">
        <h2>🎉 Level {lvl}!</h2>
        <p class="center bold" style={{ marginTop: 0 }}>{LEVEL_TITLES[lvl]}</p>
        {def.region && (
          <div class="house-hero">
            <RegionScene region={def.region} />
            <div class="center bold" style={{ padding: '6px' }}>Neue Region: {regionById(def.region).name}</div>
          </div>
        )}
        <NpcSay npc="hilde" mood="happy">{LEVEL_STORY[lvl]}</NpcSay>
        <div class="mt">
          {def.unlocks.map((u) => (
            <span key={u} class="pill green" style={{ margin: '0 6px 6px 0' }}>🔓 {u}</span>
          ))}
        </div>
        <div class="card mt" style={{ background: '#fff' }}>
          <b>🎯 Neues Ziel:</b> {def.goal}
        </div>
        <button class="btn green block big" onClick={onClose}>Weiter geht's!</button>
      </div>
    </div>
  );
}

function DemotionModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <Modal>
      <h2>💔 Insolvenz</h2>
      <NpcSay npc="krause" mood="sad">
        Es tut mir leid. Sie konnten Ihre Kredite nicht mehr bedienen. Die Bank hat alles eingezogen. Sie starten neu am Anfang von Level {s.pendingDemotion}: {LEVEL_TITLES[s.pendingDemotion ?? 1]}.
      </NpcSay>
      <div class="mt">
        <NpcSay npc="hilde">Kopf hoch, Kind. Jeder große Vermieter ist mal hingefallen. Diesmal achtest du auf deinen Dispo, ja?</NpcSay>
      </div>
      <button class="btn block big mt" onClick={onClose}>Neu anfangen</button>
    </Modal>
  );
}

export function WinModal({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <div class="overlay center">
      <Confetti />
      <div class="modal">
        <h2>👑 Mogul von Aurelien!</h2>
        <div style={{ height: '220px', display: 'flex', justifyContent: 'center' }}>
          <Avatar config={{ ...s.avatar, mouth: 'grinsen' }} />
        </div>
        <NpcSay npc="hilde" mood="happy">
          {s.playerName}, aus einem Lottoschein hast du ein Imperium gemacht. Vermögen: {fmtShort(netWorth(s))}. Ich bin so stolz auf dich!
        </NpcSay>
        <p class="hint center">Du kannst im Endlos-Modus weiterspielen und dein Imperium vergrößern.</p>
        <button class="btn green block big" onClick={onClose}>Weiterspielen</button>
      </div>
    </div>
  );
}
