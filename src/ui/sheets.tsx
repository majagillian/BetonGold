import { useState } from 'preact/hooks';
import { Avatar } from '../art/Avatar';
import { NPC_AVATARS } from '../art/npcs';
import * as engineRef from '../game/engine';
import { House } from '../art/House';
import { RegionScene } from '../art/RegionScene';
import { FEATURES, MONTH_NAMES, NPCS, TIER_NAMES, buildTypeById, regionById } from '../game/data';
import {
  auctionChance, buildCost, buildOptionsFor, inspectionCost, loanLimit, purchaseTotal, renovationCost, saleChance, stagingCost, LOAN_INFO,
} from '../game/engine';
import {
  canBorrow, fmt, fmtShort, loanRate, marketRent, pct, propertyDebt, propertyValue, quality, rawQuality, tenantRent,
} from '../game/econ';
import { ctxFor, eventById, eventStillValid } from '../game/events';
import type { BuildTypeId, Feature, GameState, LoanType, Property, RegionId, Tier, Unit } from '../game/types';
import { Money, NpcSay, Progress, Seg, Sheet, Toggle, stars } from './common';

export type Act = (fn: (s: GameState) => string | void) => void;

const statusLabel = (p: Property) =>
  ({ idle: p.units.some((u) => u.tenant) ? 'Vermietet' : p.units.length ? 'Leerstand' : 'Bereit', renovating: 'In Renovierung', building: 'Im Bau', forSale: 'Zum Verkauf', plot: 'Grundstück' })[p.status];

export const statusPill = (p: Property) => {
  const l = statusLabel(p);
  const cls = l === 'Vermietet' ? 'green' : l === 'Leerstand' ? 'red' : l === 'Zum Verkauf' ? 'gold' : l === 'Grundstück' ? 'purple' : 'blue';
  return <span class={`pill ${cls}`}>{l}</span>;
};

export function HouseArt({ p, class: cls }: { p: Property; class?: string }) {
  return (
    <House
      style={p.style}
      region={p.region}
      quality={rawQuality(p)}
      lit={p.units.some((u) => u.tenant)}
      state={p.status === 'idle' ? 'idle' : p.status}
      class={cls}
    />
  );
}

// ================= Objekt =================
export function PropertySheet({ s, pid, act, onClose }: { s: GameState; pid: string; act: Act; onClose: () => void }) {
  const p = s.properties.find((x) => x.id === pid);
  if (!p) {
    return (
      <Sheet title="Objekt" onClose={onClose}>
        <p class="bold">Dieses Objekt gehört dir nicht mehr.</p>
      </Sheet>
    );
  }
  const r = regionById(p.region);
  const value = propertyValue(s, p);
  const debt = propertyDebt(s, p.id);
  const rentSum = p.units.reduce((a, u) => a + tenantRent(s, p, u), 0);
  return (
    <Sheet title={p.name} onClose={onClose} icon="🏠">
      <div class="house-hero">
        <HouseArt p={p} />
      </div>
      <div class="row mb" style={{ flexWrap: 'wrap', gap: '6px' }}>
        {statusPill(p)}
        <span class="pill">📍 {r.name}</span>
        {p.size > 0 && <span class="pill">{p.size} m²</span>}
        {p.units.length > 1 && <span class="pill">{p.units.length} Wohnungen</span>}
        {p.status !== 'plot' && <span class="pill gold stars">{stars(rawQuality(p))}</span>}
      </div>
      <div class="kv mb">
        <span>Geschätzter Wert</span>
        <Money v={value} />
        <span>Eingesetzt (Kauf + Arbeiten)</span>
        <Money v={p.invested} />
        {debt > 0 && (
          <>
            <span>Kredit auf diesem Objekt</span>
            <span class="money neg">{fmt(debt)}</span>
          </>
        )}
        {rentSum > 0 && (
          <>
            <span>Miete diesen Monat</span>
            <span class="money pos">{fmt(rentSum)}</span>
          </>
        )}
        {p.defectKnown && p.hiddenDefect > 0 && (
          <>
            <span>Bekannter Mangel</span>
            <span class="money neg">{fmt(p.hiddenDefect)}</span>
          </>
        )}
      </div>

      {(p.status === 'renovating' || p.status === 'building') && (
        <div class="card" style={{ background: '#fff' }}>
          <NpcSay npc="bruno">
            {p.status === 'building' ? 'Wir bauen, was das Zeug hält!' : 'Wir sind dran, Chef!'} Noch {p.busyMonths} Monat{p.busyMonths === 1 ? '' : 'e'}.
          </NpcSay>
        </div>
      )}

      {p.status === 'forSale' && (
        <div class="card" style={{ background: '#fff' }}>
          <NpcSay npc="jenny">
            Inseriert für {Math.round(p.saleFactor * 100)} % des Werts (ca. {fmt(value * p.saleFactor)}). Verkaufschance pro Monat: {pct(saleChance(s, p))}.
          </NpcSay>
          <button class="btn ghost block mt" onClick={() => act((st) => { const { cancelSale } = engineRef; cancelSale(st, p.id); return 'Verkauf abgebrochen.'; })}>
            Verkauf abbrechen
          </button>
        </div>
      )}

      {p.status === 'plot' && <BuildPanel s={s} p={p} act={act} />}
      {p.status === 'idle' && <RenovatePanel s={s} p={p} act={act} />}
      {p.status === 'idle' && s.level >= 2 && <RentPanel s={s} p={p} act={act} />}
      {p.status === 'idle' && s.level < 2 && (
        <div class="card" style={{ background: '#fff' }}>
          <NpcSay npc="hilde">Vermieten lernst du in Level 2. Jetzt heißt es: herrichten und gewinnbringend verkaufen!</NpcSay>
        </div>
      )}
      {(p.status === 'idle' || p.status === 'plot') && <SellPanel s={s} p={p} act={act} />}
      {(p.status === 'idle' || p.status === 'plot') && s.level >= 3 && <MortgagePanel s={s} p={p} act={act} />}
    </Sheet>
  );
}


function RenovatePanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const [target, setTarget] = useState<Partial<Record<Feature, Tier>>>({});
  const cost = renovationCost(p, target);
  const sim: Property = { ...p, tiers: { ...p.tiers, ...Object.fromEntries(Object.entries(target).filter(([f, t]) => (t as number) > p.tiers[f as Feature])) } };
  const before = propertyValue(s, p);
  const after = propertyValue(s, sim);
  const ideal = regionById(p.region).idealTier;
  return (
    <div class="card" style={{ background: '#fff' }}>
      <h3>🔨 Renovieren</h3>
      <p class="hint" style={{ margin: '2px 0 6px' }}>
        In {regionById(p.region).name} lohnt sich Ausstattung bis „{TIER_NAMES[ideal]}“. Darüber zahlen Käufer kaum mehr.
      </p>
      {FEATURES.map((f) => {
        const cur = p.tiers[f.id];
        const sel = target[f.id] ?? cur;
        return (
          <div class="tier-row" key={f.id}>
            <span class="ic">{f.icon}</span>
            <span class="nm">{f.name}</span>
            <div class="tier-btns">
              {[1, 2, 3].map((t) => (
                <button
                  key={t}
                  class={`${t === cur ? 'cur' : ''} ${t === sel && t !== cur ? 'on' : ''}`}
                  disabled={t <= cur}
                  onClick={() => setTarget({ ...target, [f.id]: (sel === t ? cur : t) as Tier })}
                >
                  {TIER_NAMES[t]}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div class="kv mt">
        <span>Kosten</span>
        <Money v={cost} />
        <span>Wert danach (geschätzt)</span>
        <span class="money">
          {fmt(after)} <small class={after - before - cost >= 0 ? 'pos' : 'neg'}>({after - before - cost >= 0 ? '+' : ''}{fmtShort(after - before - cost)} netto)</small>
        </span>
      </div>
      <button class="btn block mt" disabled={cost <= 0 || s.cash < cost} onClick={() => act((st) => engineRef.startRenovation(st, p.id, target))}>
        {cost <= 0 ? 'Bereiche auswählen' : s.cash < cost ? 'Zu wenig Geld' : `Bruno beauftragen (${fmt(cost)})`}
      </button>
    </div>
  );
}

function RentPanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  return (
    <div class="card" style={{ background: '#fff' }}>
      <h3>🔑 Vermietung</h3>
      {p.units.map((u, ui) => (
        <UnitRow key={ui} s={s} p={p} u={u} ui={ui} act={act} />
      ))}
      {s.hausverwaltung && <p class="hint mt">Deine Hausverwaltung kümmert sich automatisch um freie Wohnungen.</p>}
    </div>
  );
}

function UnitRow({ s, p, u, ui, act }: { s: GameState; p: Property; u: Unit; ui: number; act: Act }) {
  const [level, setLevel] = useState<Unit['rentLevel']>(u.rentLevel);
  const [open, setOpen] = useState(false);
  const label = p.units.length > 1 ? `Wohnung ${ui + 1} · ${u.size} m²` : `${u.size} m²`;
  const market = marketRent(s, p, u);
  if (u.tenant) {
    const t = u.tenant;
    return (
      <div class="applicant">
        <div class="row">
          <div class="face"><Avatar config={t.avatar} portrait mood={t.satisfaction < 40 ? 'sad' : t.satisfaction > 75 ? 'happy' : undefined} /></div>
          <div class="grow">
            <div class="bold">{t.name}</div>
            <div class="small muted bold">{t.job} · {label}</div>
            <div class="small bold">Miete: <span class="pos">{fmt(tenantRent(s, p, u))}</span>/Monat</div>
          </div>
        </div>
        <div class="small bold mt">Zufriedenheit</div>
        <Progress value={t.satisfaction / 100} light />
        <div class="row mt" style={{ flexWrap: 'wrap', gap: '6px' }}>
          {t.paidStreak > 0 && <span class="pill green">✓ {t.paidStreak} Monate pünktlich</span>}
          {t.stopsPaying && <span class="pill red">Zahlt nicht!</span>}
          {t.noticeMonths > 0 && <span class="pill gold">Zieht in {t.noticeMonths} Mon. aus</span>}
          {t.minderungMonths > 0 && <span class="pill red">Mietminderung {Math.round(t.minderung * 100)} %</span>}
        </div>
      </div>
    );
  }
  return (
    <div class="applicant">
      <div class="row between">
        <div>
          <div class="bold">{label} – frei</div>
          <div class="small muted bold">Marktmiete ca. {fmt(market)} {u.vacantMonths > 0 ? `· ${u.vacantMonths} Mon. Leerstand` : ''}</div>
        </div>
        {u.applicants.length > 0 && <span class="pill blue">{u.applicants.length} Bewerber</span>}
      </div>
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
          <p class="hint">Günstige Miete lockt mehr Bewerber und zufriedenere Mieter, hohe Miete bringt mehr Geld, aber weniger Interessenten.</p>
          <button class="btn blue block" onClick={() => act((st) => engineRef.listUnit(st, p.id, ui, level))}>📰 Inserat schalten (49 €)</button>
        </div>
      ) : u.applicants.length === 0 ? (
        <p class="hint mt">Inserat läuft ({u.rentLevel === 0.9 ? 'günstig' : u.rentLevel === 1 ? 'Marktmiete' : 'hoch'}). Besichtigungen finden im nächsten Monat statt …</p>
      ) : (
        <div class="mt">
          <button class="btn block" onClick={() => setOpen(!open)}>{open ? 'Besichtigung schließen' : `👀 Besichtigung: ${u.applicants.length} Bewerber ansehen`}</button>
          {open &&
            u.applicants.map((a, ai) => {
              const rent = market * u.rentLevel;
              const ratio = rent / a.income;
              return (
                <div class="applicant mt" key={ai} style={{ background: '#fffaf0' }}>
                  <div class="row">
                    <div class="face"><Avatar config={a.avatar} portrait /></div>
                    <div class="grow">
                      <div class="bold">{a.name}</div>
                      <div class="small muted bold">{a.job} · {fmt(a.income)} netto</div>
                      <div class="small bold">
                        Schufa <span class={`schufa ${a.schufa}`}>{a.schufa}</span> · Miete = {Math.round(ratio * 100)} % vom Einkommen
                      </div>
                    </div>
                  </div>
                  <ul>
                    {a.notes.map((n, k) => (
                      <li key={k}>{n}</li>
                    ))}
                    {ratio > 0.45 && <li>Die Miete wäre für dieses Einkommen sehr hoch</li>}
                  </ul>
                  <button class="btn green block small" onClick={() => act((st) => engineRef.acceptApplicant(st, p.id, ui, ai))}>Mietvertrag anbieten</button>
                </div>
              );
            })}
          <p class="hint mt">Tipp: Achte auf Warnzeichen in den Notizen. Mietnomaden geben sich oft besonders eilig.</p>
        </div>
      )}
    </div>
  );
}

function SellPanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const [factor, setFactor] = useState(1);
  const [staging, setStaging] = useState(false);
  const value = propertyValue(s, p) * (staging && !p.staging ? 1.05 : 1);
  const price = value * factor * 0.97;
  const profit = price - p.invested - (staging && !p.staging ? stagingCost(s, p) : 0);
  const probe = { ...p, saleFactor: factor };
  return (
    <div class="card" style={{ background: '#fff' }}>
      <h3>🤝 Verkaufen</h3>
      <Seg value={factor} onChange={setFactor} options={[0.9, 1, 1.1, 1.2].map((f) => ({ value: f, label: `${Math.round(f * 100)} %` }))} />
      {p.status === 'idle' && !p.staging && (
        <Toggle label="Home Staging" sub={`+5 % Verkaufswert für ${fmt(stagingCost(s, p))}`} on={staging} onChange={setStaging} />
      )}
      {p.staging && <p class="hint">✨ Home Staging ist schon eingerichtet (+5 %).</p>}
      <div class="kv mt">
        <span>Erlös nach Makler (ca.)</span>
        <Money v={price} />
        <span>Gewinn (ca.)</span>
        <Money v={profit} sign />
        <span>Chance pro Monat</span>
        <span class="bold">{pct(saleChance(s, probe))}</span>
      </div>
      {p.units.some((u) => u.tenant) && <p class="hint">Mit Mietern verkauft sich das Objekt 5 % günstiger.</p>}
      <button class="btn red block mt" onClick={() => act((st) => engineRef.listForSale(st, p.id, factor, staging))}>Jenny soll inserieren</button>
    </div>
  );
}

function MortgagePanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const limit = loanLimit(s, 'hypothek', p.id);
  const [amount, setAmount] = useState(Math.min(limit, Math.round(limit / 2 / 1000) * 1000));
  if (limit < 5000)
    return (
      <div class="card" style={{ background: '#fff' }}>
        <h3>🏦 Hypothek</h3>
        <p class="hint">{canBorrow(s) ? 'Dieses Objekt ist schon voll beliehen.' : 'Die Bank vergibt gerade keine Kredite an dich.'}</p>
      </div>
    );
  const rate = loanRate(s, LOAN_INFO.hypothek.base);
  return (
    <div class="card" style={{ background: '#fff' }}>
      <h3>🏦 Hypothek aufnehmen</h3>
      <p class="hint">Bis zu 80 % des Werts. Zins {(rate * 100).toFixed(1).replace('.', ',')} %, Laufzeit 20 Jahre.</p>
      <input class="slider" type="range" min={0} max={limit} step={1000} value={amount} onInput={(e) => setAmount(Number((e.target as HTMLInputElement).value))} />
      <div class="kv">
        <span>Betrag</span>
        <Money v={amount} />
        <span>Monatsrate</span>
        <Money v={engineAnnuity(amount, rate, 240)} />
      </div>
      <button class="btn blue block mt" disabled={amount < 1000} onClick={() => act((st) => engineRef.takeLoan(st, 'hypothek', amount, p.id))}>
        Hypothek aufnehmen
      </button>
    </div>
  );
}

function engineAnnuity(p: number, rate: number, n: number) {
  const r = rate / 12;
  return (p * r) / (1 - Math.pow(1 + r, -n));
}

function BuildPanel({ s, p, act }: { s: GameState; p: Property; act: Act }) {
  const opts = buildOptionsFor(s, p);
  const [type, setType] = useState<BuildTypeId | null>(opts[0]?.id ?? null);
  const [premium, setPremium] = useState(false);
  const [fin, setFin] = useState(0.6);
  if (s.level < 5) return <p class="hint">Bauen kannst du ab Level 5.</p>;
  if (!opts.length || !type)
    return (
      <div class="card" style={{ background: '#fff' }}>
        <p class="hint">Für dieses Grundstück gibt es auf deinem Level noch keinen passenden Bautyp.</p>
      </div>
    );
  const bt = buildTypeById(type);
  const cost = buildCost(p.region, type, premium);
  const loan = Math.round((cost * fin) / 1000) * 1000;
  const tiers: Record<Feature, Tier> = premium ? { bad: 3, kueche: 3, boden: 3, elektrik: 3, fassade: 3 } : { bad: 2, kueche: 2, boden: 2, elektrik: 2, fassade: 2 };
  const sim: Property = { ...p, status: 'idle', size: bt.size, tiers, units: [] };
  const value = propertyValue(s, sim);
  const rentPerUnit = marketRent(s, sim, { size: bt.size / bt.units } as Unit);
  const canLoan = canBorrow(s);
  return (
    <div class="card" style={{ background: '#fff' }}>
      <h3>🏗️ Bauen</h3>
      <div class="chips mb">
        {opts.map((o) => (
          <button key={o.id} class={`chip ${o.id === type ? 'on' : ''}`} onClick={() => setType(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
      <Toggle label="Premium-Ausstattung" sub="+25 % Baukosten, höherer Wert" on={premium} onChange={setPremium} />
      <div class="field mt">
        <label>Baufinanzierung: {Math.round(fin * 100)} %</label>
        <input class="slider" type="range" min={0} max={canLoan ? 0.8 : 0} step={0.1} value={canLoan ? fin : 0} onInput={(e) => setFin(Number((e.target as HTMLInputElement).value))} />
      </div>
      <div class="kv">
        <span>Baukosten</span>
        <Money v={cost} />
        <span>Davon Kredit</span>
        <Money v={canLoan ? loan : 0} />
        <span>Eigenanteil</span>
        <Money v={cost - (canLoan ? loan : 0)} />
        <span>Bauzeit</span>
        <span class="bold">{bt.months} Monate</span>
        <span>Wert nach Fertigstellung</span>
        <Money v={value} />
        <span>Marktmiete gesamt</span>
        <Money v={rentPerUnit * bt.units} />
      </div>
      <button class="btn green block mt" onClick={() => act((st) => engineRef.startBuild(st, p.id, type, premium, canLoan ? fin : 0))}>
        Spatenstich!
      </button>
    </div>
  );
}

// ================= Angebot =================
export function OfferSheet({ s, oid, act, onClose, onBought }: { s: GameState; oid: string; act: Act; onClose: () => void; onBought: (pid: string) => void }) {
  const o = s.offers.find((x) => x.id === oid);
  const [bid, setBid] = useState(0.7);
  if (!o)
    return (
      <Sheet title="Angebot" onClose={onClose}>
        <p class="bold">Das Angebot ist nicht mehr verfügbar.</p>
      </Sheet>
    );
  const p = o.property;
  const r = regionById(p.region);
  const value = propertyValue(s, p);
  const total = purchaseTotal(o.price);
  const q = quality(p);
  const simTiers = Object.fromEntries(FEATURES.map((f) => [f.id, Math.max(p.tiers[f.id], r.idealTier)])) as Record<Feature, Tier>;
  const potential = propertyValue(s, { ...p, tiers: simTiers, defectKnown: false });
  return (
    <Sheet title={p.name} onClose={onClose} icon={o.kind === 'auktion' ? '🔨' : o.kind === 'grundstueck' ? '🌱' : '🏷️'}>
      <div class="house-hero">
        <HouseArt p={p} />
      </div>
      <div class="row mb" style={{ flexWrap: 'wrap', gap: '6px' }}>
        <span class="pill">📍 {r.name}</span>
        {p.size > 0 && <span class="pill">{p.size} m²</span>}
        {p.plotSize && <span class="pill">{p.plotSize} m² Grund</span>}
        {p.units.length > 1 && <span class="pill">{p.units.length} Wohnungen</span>}
        {o.kind !== 'grundstueck' && <span class="pill gold stars">{stars(rawQuality(p))}</span>}
        {o.kind === 'auktion' && <span class="pill red">Zwangsversteigerung</span>}
      </div>
      {o.kind !== 'grundstueck' && (
        <div class="mb">
          {FEATURES.map((f) => (
            <span key={f.id} class="pill" style={{ margin: '0 4px 4px 0' }}>
              {f.icon} {TIER_NAMES[p.tiers[f.id]]}
            </span>
          ))}
        </div>
      )}
      <div class="kv mb">
        {o.kind === 'auktion' ? (
          <>
            <span>Mindestgebot</span>
            <Money v={o.price} />
          </>
        ) : (
          <>
            <span>Kaufpreis</span>
            <Money v={o.price} />
            <span>+ 8 % Nebenkosten</span>
            <Money v={total - o.price} />
          </>
        )}
        <span>Geschätzter Wert</span>
        <Money v={value} />
        {o.kind !== 'grundstueck' && (
          <>
            <span>Wert nach Renovierung (ca.)</span>
            <Money v={potential} />
            <span>Marktmiete gesamt (ca.)</span>
            <Money v={p.units.reduce((a, u) => a + marketRent(s, { ...p, tiers: { bad: 2, kueche: 2, boden: 2, elektrik: 2, fassade: 2 } }, u), 0)} />
          </>
        )}
      </div>
      {o.kind !== 'grundstueck' && (
        <div class="card" style={{ background: '#fff' }}>
          {o.inspected ? (
            p.defectKnown ? (
              <NpcSay npc="bruno" mood="sad">Bei der Besichtigung gefunden: ein versteckter Mangel für {fmt(p.hiddenDefect)}. Der Preis wurde schon gesenkt.</NpcSay>
            ) : (
              <NpcSay npc="bruno" mood="happy">Besichtigt – alles in Ordnung, keine bösen Überraschungen!</NpcSay>
            )
          ) : (
            <>
              <NpcSay npc="jenny">Willst du es dir vorher genau ansehen? Bruno kommt mit und klopft die Wände ab.</NpcSay>
              <button class="btn ghost block mt" onClick={() => act((st) => engineRef.inspectOffer(st, o.id))}>
                🔍 Besichtigen ({fmt(inspectionCost(o))})
              </button>
            </>
          )}
        </div>
      )}
      {o.kind === 'auktion' ? (
        <div class="card" style={{ background: '#fff' }}>
          <h3>Dein Gebot</h3>
          <Seg value={bid} onChange={setBid} options={[0.55, 0.65, 0.75, 0.85].map((b) => ({ value: b, label: `${Math.round(b * 100)} %` }))} />
          <div class="kv mt">
            <span>Gebot</span>
            <Money v={Math.round((value * bid) / 500) * 500} />
            <span>Chance auf Zuschlag</span>
            <span class="bold">{pct(auctionChance(bid))}</span>
          </div>
          <button class="btn red block mt" onClick={() => { let won = false; act((st) => { const r = engineRef.bidAuction(st, o.id, bid); won = r.ok; return r.text; }); if (won) onBought(p.id); else onClose(); }}>
            🔨 Bieten
          </button>
        </div>
      ) : (
        <>
          <button class="btn green block big" disabled={s.cash < total} onClick={() => { act((st) => engineRef.buyOffer(st, o.id)); onBought(p.id); }}>
            {s.cash < total ? 'Zu wenig Geld' : `Kaufen für ${fmt(total)}`}
          </button>
          {s.level >= 3 && o.kind === 'kauf' && (
            <button class="btn blue block mt" disabled={!canBorrow(s) || s.cash + o.price * 0.7 < total} onClick={() => { act((st) => engineRef.buyOffer(st, o.id, true)); onBought(p.id); }}>
              Mit 70 % Hypothek kaufen (Eigenanteil {fmt(total - Math.round((o.price * 0.7) / 1000) * 1000)})
            </button>
          )}
        </>
      )}
      <p class="hint mt">Qualität jetzt: {Math.round(q * 100)} %. Marktindex {r.name}: {s.marketIndex[p.region].toFixed(2).replace('.', ',')}</p>
    </Sheet>
  );
}

// ================= Region =================
export function RegionSheet({ s, rid, onClose, openOffer, openProperty }: { s: GameState; rid: RegionId; onClose: () => void; openOffer: (id: string) => void; openProperty: (id: string) => void }) {
  const r = regionById(rid);
  const offers = s.offers.filter((o) => o.property.region === rid);
  const mine = s.properties.filter((p) => p.region === rid);
  return (
    <Sheet title={r.name} onClose={onClose} icon="📍">
      <div class="house-hero">
        <RegionScene region={rid} />
      </div>
      <p class="bold" style={{ marginTop: 0 }}>{r.type}</p>
      <p class="small" style={{ fontWeight: 600 }}>{r.description}</p>
      <div class="grid2 mb">
        <div class="stat-tile"><div class="l">Preis / m²</div><div class="v">{fmt(r.pricePerSqm * s.marketIndex[rid])}</div></div>
        <div class="stat-tile"><div class="l">Miete / m²</div><div class="v">{r.season ? 'saisonal' : fmt(r.rentPerSqm)}</div></div>
        <div class="stat-tile"><div class="l">Nachfrage</div><div class="v">{r.demand >= 0.75 ? 'Hoch' : r.demand >= 0.5 ? 'Mittel' : 'Niedrig'}</div></div>
        <div class="stat-tile"><div class="l">Markttrend</div><div class="v">{s.marketIndex[rid] >= 1 ? '📈' : '📉'} {Math.round((s.marketIndex[rid] - 1) * 100)} %</div></div>
      </div>
      {mine.length > 0 && <h3>Deine Objekte</h3>}
      {mine.map((p) => (
        <PropRow key={p.id} s={s} p={p} onClick={() => openProperty(p.id)} />
      ))}
      <h3 class="mt">Angebote</h3>
      {offers.length === 0 && <p class="hint">Gerade keine Angebote. Nächsten Monat kommen neue.</p>}
      {offers.map((o) => (
        <OfferRow key={o.id} s={s} oid={o.id} onClick={() => openOffer(o.id)} />
      ))}
    </Sheet>
  );
}

export function PropRow({ s, p, onClick }: { s: GameState; p: Property; onClick: () => void }) {
  return (
    <div class="card prop-card" onClick={onClick}>
      <div class="thumb" style={{ background: 'linear-gradient(180deg,#d7ecff,#fff3d6)' }}>
        <HouseArt p={p} />
      </div>
      <div class="grow">
        <h3 style={{ fontSize: '15px' }}>{p.name}</h3>
        <div class="meta">📍 {regionById(p.region).name}{p.size ? ` · ${p.size} m²` : ''}</div>
        <div class="row mt" style={{ gap: '6px', flexWrap: 'wrap' }}>
          {statusPill(p)}
          <span class="money small">{fmtShort(propertyValue(s, p))}</span>
        </div>
      </div>
    </div>
  );
}

export function OfferRow({ s, oid, onClick }: { s: GameState; oid: string; onClick: () => void }) {
  const o = s.offers.find((x) => x.id === oid)!;
  const p = o.property;
  return (
    <div class="card prop-card" onClick={onClick}>
      <div class="thumb" style={{ background: 'linear-gradient(180deg,#d7ecff,#fff3d6)' }}>
        <HouseArt p={p} />
      </div>
      <div class="grow">
        <h3 style={{ fontSize: '15px' }}>{p.name}</h3>
        <div class="meta">📍 {regionById(p.region).name}{p.size ? ` · ${p.size} m²` : p.plotSize ? ` · ${p.plotSize} m² Grund` : ''}</div>
        <div class="row mt" style={{ gap: '6px', flexWrap: 'wrap' }}>
          {o.kind === 'auktion' && <span class="pill red">Auktion</span>}
          {o.kind === 'grundstueck' && <span class="pill purple">Bauland</span>}
          {o.kind === 'kauf' && <span class="pill gold stars">{stars(rawQuality(p))}</span>}
          {o.inspected && o.kind !== 'grundstueck' && <span class="pill green">besichtigt</span>}
          <span class="money small">{o.kind === 'auktion' ? 'ab ' : ''}{fmtShort(o.price)}</span>
        </div>
      </div>
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
    <Sheet title={def.title} onClose={onClose} icon={def.icon}>
      {c.p && (
        <div class="house-hero">
          <HouseArt p={c.p} />
        </div>
      )}
      <div class="mb">
        <NpcSay npc={def.npc} mood={def.npc === 'viktor' ? undefined : 'sad'}>
          {def.text(c)}
        </NpcSay>
      </div>
      {opts.map((o, i) => (
        <button key={i} class="option" disabled={o.disabled || (o.cost > 0 && s.cash - o.cost < -1e9)} onClick={() => { act((st) => engineRef.chooseEventOption(st, uid, i)); onClose(); }}>
          <span>
            {o.label}
            {o.detail && <small>{o.detail}</small>}
          </span>
          <span class="cost">{o.cost > 0 ? fmt(o.cost) : 'gratis'}</span>
        </button>
      ))}
      <p class="hint">⏳ Wenn du bis Monatsende nichts entscheidest, passiert das Schlimmste.</p>
    </Sheet>
  );
}

export function EventsListSheet({ s, onClose, openEvent }: { s: GameState; onClose: () => void; openEvent: (uid: string) => void }) {
  return (
    <Sheet title="Offene Ereignisse" onClose={onClose} icon="🔔">
      {s.events.length === 0 && <p class="bold">Alles ruhig. 😌</p>}
      {s.events.map((e) => {
        const def = eventById(e.defId);
        const p = e.propertyId ? s.properties.find((x) => x.id === e.propertyId) : undefined;
        return (
          <button key={e.uid} class="option" onClick={() => openEvent(e.uid)}>
            <span style={{ fontSize: '26px' }}>{def.icon}</span>
            <span>
              {def.title}
              <small>{p ? p.name : NPCS[def.npc].name}</small>
            </span>
          </button>
        );
      })}
    </Sheet>
  );
}

export function InboxSheet({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <Sheet title="Postfach" onClose={onClose} icon="✉️">
      {s.messages.length === 0 && <p class="bold">Keine Nachrichten.</p>}
      {s.messages.map((m) => (
        <div key={m.id} class={`msg ${m.read ? '' : 'unread'}`}>
          <div class="row">
            <div class="npc-say" style={{ flex: 1 }}>
              <div class="face" style={{ width: '42px', height: '42px' }}>
                <Avatar config={npcAvatar(m.from)} portrait />
              </div>
              <div class="grow">
                <div class="t">
                  {m.tone === 'good' ? '🟢 ' : m.tone === 'bad' ? '🔴 ' : ''}
                  {m.title}
                </div>
                <div class="small muted bold">
                  {NPCS[m.from].name} · {MONTH_NAMES[m.month % 12]}, Jahr {Math.floor(m.month / 12) + 1}
                </div>
                <div class="x">{m.text}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </Sheet>
  );
}

const npcAvatar = (id: keyof typeof NPC_AVATARS) => NPC_AVATARS[id];

// ================= Kredit =================
export function LoanSheet({ s, type, act, onClose }: { s: GameState; type: LoanType; act: Act; onClose: () => void }) {
  const limit = loanLimit(s, type);
  const [amount, setAmount] = useState(Math.round(limit / 2 / 1000) * 1000);
  const info = LOAN_INFO[type];
  const rate = loanRate(s, info.base);
  return (
    <Sheet title={info.name} onClose={onClose} icon="🏦">
      <NpcSay npc="krause">{info.text}</NpcSay>
      {limit < 1000 ? (
        <p class="bold mt">Dafür bekommst du gerade keinen Kredit.</p>
      ) : (
        <>
          <input class="slider mt" type="range" min={0} max={limit} step={1000} value={amount} onInput={(e) => setAmount(Number((e.target as HTMLInputElement).value))} />
          <div class="kv">
            <span>Betrag</span>
            <Money v={amount} />
            {type !== 'investor' && (
              <>
                <span>Zins</span>
                <span class="bold">{(rate * 100).toFixed(1).replace('.', ',')} %</span>
                <span>Monatsrate</span>
                <Money v={engineAnnuity(amount, rate, info.months)} />
              </>
            )}
            {type === 'investor' && (
              <>
                <span>Gewinnbeteiligung</span>
                <span class="bold">15 % der Mieten</span>
                <span>Rückkauf</span>
                <Money v={amount * 1.2} />
              </>
            )}
          </div>
          <button class="btn blue block mt" disabled={amount < 1000} onClick={() => { act((st) => engineRef.takeLoan(st, type, amount)); onClose(); }}>
            Kredit aufnehmen
          </button>
        </>
      )}
    </Sheet>
  );
}
