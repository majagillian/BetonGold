// Spiel-Engine: Aktionen und Monatsabschluss
import {
  BUILD_TYPES, FEATURES, LEVEL_STORY, LEVEL_TITLES, REGIONS, START_CASH, TEMPLATES, TIER_COST_PER_SQM, buildTypeById, regionById,
} from './data';
import {
  addMessage, annuity, assets, buildCostPerSqm, canBorrow, chance, clamp, dispoLimit, equityRatio, fmt, loanRate, maintenance,
  makeUnits, marketRent, pick, propertyDebt, propertyValue, rand, randInt, randomTenant, rawQuality, renovationCostFactor, round,
  tenantRent, uid, unlockedRegions,
} from './econ';
import { EVENTS, eventById, expireEvent, resolveEvent, sellNow, type EventCtx } from './events';
import { levelDef } from './levels';
import {
  applyPlan, blockingDefects, defectDef, ensureInterior, furnDef, generateRooms, planCost, ROOM_NAMES,
} from './interior';
import { addXp, checkAchievements, GOLD_COST, initGamify, monthTick, rankDiscount, rankInfo, track } from './gamify';
import type {
  ActiveEvent, AvatarConfig, BuildTypeId, Feature, FurnStyle, GameState, LoanType, MonthReport, Offer, Property, RegionId, RenoPlan, Stats, Tier, Unit,
} from './types';

export const SAVE_KEY = 'betongold-save-v1';

const emptyStats = (): Stats => ({
  profitableFlips: 0,
  auctionRenovated: 0,
  builtRented: 0,
  crashMonths: 0,
  viktorMonths: 0,
  bestFlipProfit: 0,
  totalRentCollected: 0,
  usedDispo: false,
  gotDunning: false,
});

export function newGame(name: string, avatar: AvatarConfig): GameState {
  const marketIndex = Object.fromEntries(REGIONS.map((r) => [r.id, 1])) as Record<RegionId, number>;
  const s: GameState = {
    version: 1,
    playerName: name,
    avatar,
    cash: START_CASH,
    month: 0,
    level: 1,
    score: 60,
    properties: [],
    offers: [],
    loans: [],
    messages: [],
    events: [],
    marketIndex,
    dunning: 0,
    insurance: { gebaeude: false, mietausfall: false, rechtsschutz: false },
    hausverwaltung: false,
    gmbh: false,
    stats: emptyStats(),
    levelStats: emptyStats(),
    snapshots: {},
    lastReport: null,
    crashHappened: false,
    won: false,
    demotions: 0,
    pendingLevelUp: null,
    pendingDemotion: null,
    idCounter: 0,
    flags: { levelMonth: 0 },
  };
  initGamify(s);
  generateOffers(s, true);
  addMessage(s, 'hilde', 'Willkommen, Lottokönig!', `${name}, eine Million! Pass gut darauf auf. ${LEVEL_STORY[1]}`, 'good');
  addMessage(
    s,
    'krause',
    'Ihre Bank stellt sich vor',
    'Guten Tag, Krause mein Name. Ihr Konto hat einen Dispokredit. Achten Sie darauf, nie darüber zu rutschen – sonst kommen Mahnungen. Und wer gar nicht zahlt, verliert alles, was er im aktuellen Level aufgebaut hat.',
  );
  addMessage(
    s,
    'viktor',
    'Ein Gruß von Viktor von Hohenstein',
    'Ich habe gehört, ein Lottogewinner will Immobilien kaufen. Wie niedlich. Die besten Objekte – die mit der Flamme – gehören mir. Wenn Sie mitbieten wollen: nur zu.',
  );
  takeSnapshot(s);
  return s;
}

// ---------- Speichern ----------
export function save(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* Speicher voll oder nicht verfügbar */
  }
}
export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (!s.flags) s.flags = {};
    migrate(s);
    return s;
  } catch {
    return null;
  }
}
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* egal */
  }
}

export function migrate(s: GameState) {
  initGamify(s);
  for (const p of s.properties) ensureInterior(p);
  for (const o of s.offers) ensureInterior(o.property);
}

function takeSnapshot(s: GameState) {
  const { snapshots, ...rest } = s;
  s.snapshots = { ...snapshots, [s.level]: JSON.stringify({ ...rest, snapshots: {} }) };
}

// ---------- Angebote ----------
function makeProperty(s: GameState, region: RegionId, opts: { auction?: boolean; plot?: boolean } = {}): Property {
  const r = regionById(region);
  if (opts.plot) {
    const sizes = [500, 900, 1600, 3000].filter((_, i) => region === 'neuwerk' ? i === 3 : s.level >= [5, 5, 8, 10][i]);
    const plotSize = pick(sizes.length ? sizes : [500]);
    return {
      id: uid(s, 'p'), name: `Grundstück ${plotSize} m²`, style: 'grundstueck', region, size: 0, plotSize,
      tiers: { bad: 0, kueche: 0, boden: 0, elektrik: 0, fassade: 0 }, staging: false, status: 'plot', busyMonths: 0,
      purchasePrice: 0, invested: 0, units: [], saleFactor: 1, hiddenDefect: 0, defectKnown: false, fromAuction: false,
      built: false, acquiredMonth: s.month,
    };
  }
  const templates = TEMPLATES.filter((t) => t.regions.includes(region) && (t.units === 1 || s.level >= 3));
  const t = pick(templates);
  const size = round(rand(t.size[0], t.size[1]), 5);
  const tierRoll = (): Tier => {
    if (opts.auction) return chance(0.8) ? 0 : 1;
    const x = Math.random();
    return x < 0.5 ? 0 : x < 0.85 ? 1 : 2;
  };
  const tiers = { bad: tierRoll(), kueche: tierRoll(), boden: tierRoll(), elektrik: tierRoll(), fassade: tierRoll() };
  const p: Property = {
    id: uid(s, 'p'), name: pick(t.names), style: t.style, region, size, tiers, staging: false, status: 'idle', busyMonths: 0,
    purchasePrice: 0, invested: 0, units: makeUnits(size, t.units), saleFactor: 1, hiddenDefect: 0, defectKnown: false,
    fromAuction: !!opts.auction, built: false, acquiredMonth: s.month,
  };
  p.seed = randInt(1, 999999);
  ensureInterior(p);
  void r;
  return p;
}

export function generateOffers(s: GameState, fresh = false) {
  // behalte ein paar alte Angebote, ersetze den Rest
  const keep = fresh ? [] : s.offers.filter((o) => o.kind !== 'auktion' && chance(0.4));
  const offers: Offer[] = [...keep];
  for (const r of unlockedRegions(s)) {
    if (r.id !== 'neuwerk') {
      const have = offers.filter((o) => o.property.region === r.id && o.kind === 'kauf').length;
      const want = r.id === 'kleeweiler' && s.level === 1 ? 4 : 3;
      for (let i = have; i < want; i++) {
        const p = makeProperty(s, r.id);
        const hot = chance(s.level === 1 && s.month < 2 ? 0.15 : 0.22);
        offers.push({ id: uid(s, 'o'), kind: 'kauf', property: p, price: round(propertyValue(s, p) * (hot ? rand(0.68, 0.84) : rand(0.8, 1.0)), 500), inspected: false, hot });
      }
    }
    if (s.level >= 5 && (r.id === 'neuwerk' || chance(0.6))) {
      const n = r.id === 'neuwerk' ? 2 : 1;
      const have = offers.filter((o) => o.property.region === r.id && o.kind === 'grundstueck').length;
      for (let i = have; i < n; i++) {
        const p = makeProperty(s, r.id, { plot: true });
        offers.push({ id: uid(s, 'o'), kind: 'grundstueck', property: p, price: round(propertyValue(s, p) * rand(0.9, 1.1), 500), inspected: true });
      }
    }
  }
  if (s.level >= 4) {
    const regs = unlockedRegions(s).filter((r) => r.id !== 'neuwerk');
    for (let i = 0; i < 2; i++) {
      const p = makeProperty(s, pick(regs).id, { auction: true });
      offers.push({ id: uid(s, 'o'), kind: 'auktion', property: p, price: round(propertyValue(s, p) * 0.5, 500), inspected: false });
    }
  }
  s.offers = offers;
}

export const inspectionCost = (o: Offer) => round(300 * Math.sqrt(regionById(o.property.region).pricePerSqm / 1100), 50);

/** Besichtigungstermin (einmalige Gebühr), danach Rundgang frei */
export function startTour(s: GameState, offerId: string): string {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o || o.toured) return '';
  const free = rankInfo(s.xp ?? 0).rank >= 10;
  if (!free) s.cash -= inspectionCost(o);
  o.toured = true;
  track(s, 'tour');
  addXp(s, 10);
  return free ? 'Besichtigung kostenlos (Rang-Vorteil). Viel Spaß beim Umsehen!' : `Besichtigungstermin vereinbart (${fmt(inspectionCost(o))}).`;
}

function findProperty(s: GameState, id: string): Property | undefined {
  return s.properties.find((p) => p.id === id) ?? s.offers.find((o) => o.id === id || o.property.id === id)?.property;
}

export function findDefect(s: GameState, propertyId: string, defectId: string): string {
  const p = findProperty(s, propertyId);
  const d = p?.defects?.find((x) => x.id === defectId);
  if (!p || !d || d.found || d.fixed) return '';
  d.found = true;
  track(s, 'defectFound');
  addXp(s, 25);
  return `Mangel entdeckt: ${defectDef(d.type).name} (ca. ${fmt(d.cost)})`;
}

export function gutachter(s: GameState, offerId: string, withGold: boolean): string {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o) return '';
  if (withGold) {
    if ((s.gold ?? 0) < GOLD_COST.gutachter) return 'Nicht genug Gold.';
    s.gold = (s.gold ?? 0) - GOLD_COST.gutachter;
  } else s.cash -= inspectionCost(o) * 4;
  let n = 0;
  for (const d of o.property.defects ?? []) if (!d.found) {
    d.found = true;
    n++;
  }
  o.inspected = true;
  if (n) track(s, 'defectFound', n);
  return n ? `Der Gutachter hat ${n} weitere${n > 1 ? '' : 'n'} Mangel gefunden.` : 'Der Gutachter findet nichts Neues.';
}

export function negotiate(s: GameState, offerId: string): string {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o || o.negotiated) return '';
  const found = (o.property.defects ?? []).filter((d) => d.found && !d.fixed).reduce((a, d) => a + d.cost, 0);
  if (!found) return 'Ohne gefundene Mängel lässt der Verkäufer nicht mit sich reden.';
  const cut = round(found * rand(0.7, 1.0), 500);
  o.price = Math.max(1000, o.price - cut);
  o.negotiated = true;
  addXp(s, 20);
  return `Verhandlung erfolgreich: Der Preis sinkt um ${fmt(cut)}!`;
}

export function inspectOffer(s: GameState, offerId: string): string {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o || o.inspected) return '';
  const cost = inspectionCost(o);
  s.cash -= cost;
  o.inspected = true;
  if (o.property.hiddenDefect > 0) {
    o.property.defectKnown = true;
    const cut = round(o.property.hiddenDefect * 0.9, 500);
    o.price = Math.max(1000, o.price - cut);
    return `Jenny und Bruno haben genau hingeschaut: versteckter Mangel (${fmt(o.property.hiddenDefect)})! Der Verkäufer senkt den Preis um ${fmt(cut)}.`;
  }
  return 'Besichtigung ohne Befund – das Objekt ist in Ordnung.';
}

export const purchaseTotal = (price: number) => round(price * 1.08, 10);

export function buyOffer(s: GameState, offerId: string, withMortgage = false, priceOverride?: number): string {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o) return '';
  if (priceOverride) o.price = priceOverride;
  const total = purchaseTotal(o.price);
  let loanAmount = 0;
  if (withMortgage) {
    loanAmount = round(o.price * 0.7, 1000);
    if (!canBorrow(s)) return 'Die Bank gibt dir gerade keinen Kredit.';
  }
  if (s.cash + loanAmount < total) return 'Dafür reicht dein Kontostand nicht.';
  const p = o.property;
  p.purchasePrice = o.price;
  p.invested = total;
  p.acquiredMonth = s.month;
  s.cash -= total;
  s.properties.push(p);
  s.offers = s.offers.filter((x) => x.id !== offerId);
  if (loanAmount) takeLoan(s, 'hypothek', loanAmount, p.id, true);
  track(s, 'buy');
  addXp(s, 40);
  return `Glückwunsch! „${p.name}“ gehört jetzt dir (inkl. 8 % Nebenkosten: ${fmt(total)}).`;
}

export function auctionChance(pctOfValue: number) {
  return clamp((pctOfValue - 0.5) * 2.4, 0.05, 0.97);
}

export function bidAuction(s: GameState, offerId: string, pctOfValue: number): { ok: boolean; text: string } {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o) return { ok: false, text: '' };
  const value = propertyValue(s, o.property);
  const bid = round(value * pctOfValue, 500);
  const total = purchaseTotal(bid);
  if (s.cash < total) return { ok: false, text: 'Für dieses Gebot reicht dein Geld nicht.' };
  s.offers = s.offers.filter((x) => x.id !== offerId);
  const rival = s.level >= 9 ? 'Viktor von Hohenstein' : pick(['ein Bauträger', 'eine Investorin', 'ein Nachbar']);
  if (!chance(auctionChance(pctOfValue))) return { ok: false, text: `Überboten! ${rival} hat den Zuschlag bekommen.` };
  const p = o.property;
  p.purchasePrice = bid;
  p.invested = total;
  p.acquiredMonth = s.month;
  p.fromAuction = true;
  s.cash -= total;
  s.properties.push(p);
  track(s, 'buy');
  track(s, 'auctionWon');
  addXp(s, 60);
  return { ok: true, text: `Zuschlag! „${p.name}“ gehört dir für ${fmt(bid)}. Jetzt sanieren!` };
}

// ---------- Renovieren ----------
export function renovationCost(p: Property, target: Partial<Record<Feature, Tier>>) {
  const factor = renovationCostFactor(p.region);
  let cost = 0;
  for (const f of FEATURES) {
    const t = target[f.id];
    if (t !== undefined && t > p.tiers[f.id]) cost += p.size * TIER_COST_PER_SQM[t] * f.weight * factor;
  }
  return round(cost, 100);
}

export function startRenovation(s: GameState, pid: string, target: Partial<Record<Feature, Tier>>): string {
  const p = s.properties.find((x) => x.id === pid);
  if (!p || p.status !== 'idle') return '';
  const cost = renovationCost(p, target);
  if (cost <= 0) return 'Wähle mindestens einen Bereich zum Aufwerten.';
  if (s.cash < cost) return 'Dafür reicht dein Kontostand nicht.';
  s.cash -= cost;
  p.invested += cost;
  p.status = 'renovating';
  p.pendingTiers = target;
  p.busyMonths = p.size > 300 ? 2 : 1;
  p.units.forEach((u) => u.tenant && (u.tenant.satisfaction = clamp(u.tenant.satisfaction - 10, 0, 100)));
  return `Bruno und sein Team legen los! Kosten: ${fmt(cost)}. Fertig in ${p.busyMonths} Monat(en).`;
}

// ---------- Verkaufen ----------
export const stagingCost = (s: GameState, p: Property) => round(propertyValue(s, p) * 0.015, 100);

export function listForSale(s: GameState, pid: string, factor: number, staging: boolean | FurnStyle): string {
  const p = s.properties.find((x) => x.id === pid);
  if (!p || (p.status !== 'idle' && p.status !== 'plot')) return '';
  if (staging && !p.staging && p.status === 'idle') {
    const c = stagingCost(s, p);
    s.cash -= c;
    p.invested += c;
    p.staging = true;
    p.stagingStyle = typeof staging === 'string' ? staging : 'skandi';
  }
  p.saleFactor = factor;
  (p as Property & { prevStatus?: string }).prevStatus = p.status;
  p.status = 'forSale';
  return `Jenny hat „${p.name}“ inseriert. Mal sehen, wer anbeißt!`;
}

export function cancelSale(s: GameState, pid: string) {
  const p = s.properties.find((x) => x.id === pid);
  if (!p || p.status !== 'forSale') return;
  p.status = p.units.length === 0 && p.size === 0 ? 'plot' : 'idle';
}

export function saleChance(s: GameState, p: Property) {
  const d = regionById(p.region).demand;
  const f = p.saleFactor;
  const base = f <= 0.9 ? 0.95 : f <= 1 ? 0.7 : f <= 1.1 ? 0.4 : 0.15;
  const crash = (s.flags.crashCooldown ?? 0) > 0 ? 0.6 : 1;
  return clamp(base * (0.5 + 0.5 * d) * crash, 0.03, 0.98);
}

// ---------- Vermieten ----------
export function listUnit(s: GameState, pid: string, ui: number, rentLevel: Unit['rentLevel']): string {
  const p = s.properties.find((x) => x.id === pid);
  const u = p?.units[ui];
  if (!p || !u || u.tenant) return '';
  const block = blockingDefects(p).filter((d) => d.found);
  if (block.length) return `Erst den Mangel beheben: ${defectDef(block[0].type).name}. So darfst du nicht vermieten.`;
  s.cash -= 49;
  u.listed = true;
  u.rentLevel = rentLevel;
  return 'Inserat geschaltet (49 €). Nächsten Monat kommen die ersten Bewerber zur Besichtigung.';
}

export function acceptApplicant(s: GameState, pid: string, ui: number, ai: number): string {
  const p = s.properties.find((x) => x.id === pid);
  const u = p?.units[ui];
  const a = u?.applicants[ai];
  if (!p || !u || !a) return '';
  a.rentFactor = u.rentLevel;
  a.satisfaction = 70 + (u.rentLevel === 0.9 ? 15 : u.rentLevel === 1.15 ? -10 : 0) + Math.round((rawQuality(p) - 0.5) * 20);
  u.tenant = a;
  u.listed = false;
  u.applicants = [];
  u.vacantMonths = 0;
  track(s, 'rent');
  addXp(s, 30);
  return `${a.name} unterschreibt den Mietvertrag und zieht ein. Miete: ${fmt(tenantRent(s, p, u))} pro Monat.`;
}

// ---------- Bauen ----------
export function buildCost(region: RegionId, type: BuildTypeId, premium: boolean) {
  const bt = buildTypeById(type);
  return round(bt.size * buildCostPerSqm(region) * (premium ? 1.25 : 1), 1000);
}

export function startBuild(s: GameState, pid: string, type: BuildTypeId, premium: boolean, financePct: number): string {
  const p = s.properties.find((x) => x.id === pid);
  const bt = buildTypeById(type);
  if (!p || p.status !== 'plot') return '';
  if ((p.plotSize ?? 0) < bt.plotSize) return 'Das Grundstück ist dafür zu klein.';
  const cost = buildCost(p.region, type, premium);
  const loan = round(cost * financePct, 1000);
  if (loan > 0 && !canBorrow(s)) return 'Die Bank gibt dir gerade keinen Kredit.';
  if (s.cash + loan < cost) return 'Dafür reicht dein Geld nicht – erhöhe die Finanzierung.';
  s.cash -= cost;
  p.status = 'building';
  p.busyMonths = bt.months;
  p.buildType = type;
  p.buildCost = cost;
  p.invested += cost;
  p.name = `${bt.name} (${regionById(p.region).name})`;
  p.style = bt.style;
  p.size = bt.size;
  p.units = makeUnits(bt.size, bt.units);
  const t: Tier = premium ? 3 : 2;
  p.pendingTiers = { bad: t, kueche: t, boden: t, elektrik: t, fassade: t };
  if (loan > 0) takeLoan(s, 'bau', loan, p.id, true);
  return `Spatenstich! ${bt.name} wird in ${bt.months} Monaten fertig. Baukosten ${fmt(cost)}${loan ? `, davon ${fmt(loan)} finanziert` : ''}.`;
}

// ---------- Bank ----------
export const LOAN_INFO: Record<LoanType, { name: string; base: number; months: number; minLevel: number; text: string }> = {
  renovierung: { name: 'Renovierungskredit', base: 0.06, months: 24, minLevel: 2, text: 'Schnelles Geld für Sanierungen. 24 Monate Laufzeit.' },
  hypothek: { name: 'Hypothek', base: 0.035, months: 240, minLevel: 3, text: 'Bis 80 % des Objektwerts, 20 Jahre Laufzeit. Das Objekt dient als Sicherheit.' },
  bau: { name: 'Baufinanzierung', base: 0.04, months: 240, minLevel: 5, text: 'Bis 80 % der Baukosten. Wird beim Baustart gewählt.' },
  investor: { name: 'Investorenkapital', base: 0, months: 1, minLevel: 8, text: 'Keine Zinsen – dafür gehen 15 % deiner Mieteinnahmen an den Investor. Rückkauf für 120 %.' },
};

export function loanLimit(s: GameState, type: LoanType, pid?: string) {
  if (!canBorrow(s) || s.level < LOAN_INFO[type].minLevel) return 0;
  if (type === 'renovierung') {
    const used = s.loans.filter((l) => l.type === 'renovierung').reduce((a, l) => a + l.principal, 0);
    return Math.max(0, round(100_000 * s.level - used, 1000));
  }
  if (type === 'hypothek' && pid) {
    const p = s.properties.find((x) => x.id === pid);
    if (!p || p.status === 'building') return 0;
    return Math.max(0, round(propertyValue(s, p) * 0.8 - propertyDebt(s, pid), 1000));
  }
  if (type === 'investor') {
    const used = s.loans.filter((l) => l.type === 'investor').reduce((a, l) => a + l.principal, 0);
    return Math.max(0, round(assets(s) * 0.2 - used, 10000));
  }
  return 0;
}

export function takeLoan(s: GameState, type: LoanType, amount: number, pid?: string, force = false): string {
  amount = round(amount, 1000);
  if (amount <= 0) return '';
  if (!force && amount > loanLimit(s, type, pid)) return 'So viel gibt dir die Bank nicht.';
  const info = LOAN_INFO[type];
  const rate = type === 'investor' ? 0 : loanRate(s, info.base);
  const months = info.months;
  const p = pid ? s.properties.find((x) => x.id === pid) : undefined;
  s.loans.push({
    id: uid(s, 'l'),
    type,
    label: p ? `${info.name}: ${p.name}` : info.name,
    principal: amount,
    original: amount,
    rate,
    monthsLeft: months,
    payment: type === 'investor' ? 0 : annuity(amount, rate, months),
    propertyId: pid,
  });
  s.cash += amount;
  return `${info.name} über ${fmt(amount)} ausgezahlt${type === 'investor' ? '' : ` (Zins ${(rate * 100).toFixed(1).replace('.', ',')} %)`}.`;
}

export function repayLoan(s: GameState, loanId: string, amount: number): string {
  const l = s.loans.find((x) => x.id === loanId);
  if (!l) return '';
  const factor = l.type === 'investor' ? 1.2 : 1;
  const due = Math.min(amount, l.principal);
  const pay = round(due * factor, 1);
  if (s.cash < pay) return 'Dafür reicht dein Kontostand nicht.';
  s.cash -= pay;
  l.principal -= due;
  if (l.principal < 1) {
    s.loans = s.loans.filter((x) => x.id !== loanId);
    s.score = clamp(s.score + 3, 0, 100);
    track(s, 'loanRepaid');
    addXp(s, 50);
    return `${l.label} vollständig getilgt! Herr Krause nickt anerkennend.`;
  }
  const r = l.rate / 12;
  if (l.type !== 'investor') l.payment = r > 0 ? (l.principal * r) / (1 - Math.pow(1 + r, -l.monthsLeft)) : l.principal / l.monthsLeft;
  return `${fmt(pay)} Sondertilgung geleistet.`;
}

export const GMBH_COST = 25_000;
export function foundGmbh(s: GameState): string {
  if (s.gmbh || s.level < 6) return '';
  if (s.cash < GMBH_COST) return 'Dafür reicht dein Kontostand nicht.';
  s.cash -= GMBH_COST;
  s.gmbh = true;
  for (const l of s.loans) if (l.type !== 'investor') l.rate = Math.max(0.01, l.rate - 0.005);
  addMessage(s, 'krause', 'GmbH eingetragen', `Gratulation zur ${s.playerName} Immobilien GmbH! Als Firmenkunde bekommen Sie 0,5 % bessere Zinsen.`, 'good');
  return 'Deine GmbH ist im Handelsregister eingetragen!';
}

// ---------- Ereignisse ----------
function spawnEvent(s: GameState, defId: string, propertyId?: string, unitIndex?: number, extra?: Record<string, number>) {
  const def = eventById(defId);
  const ev: ActiveEvent = { uid: uid(s, 'e'), defId, propertyId, unitIndex, monthsLeft: def.deadline, data: {} };
  const p = propertyId ? s.properties.find((x) => x.id === propertyId) : undefined;
  const u = p && unitIndex !== undefined ? p.units[unitIndex] : undefined;
  const c: EventCtx = { s, ev, p, u, t: u?.tenant ?? undefined };
  if (def.init) ev.data = def.init(c);
  if (extra) ev.data = { ...ev.data, ...extra };
  s.events.push(ev);
  // Hausverwaltung erledigt Kleinkram selbst
  if (s.hausverwaltung && ['laerm', 'mietausfall'].includes(defId)) {
    const r = resolveEvent(s, ev.uid, 0);
    addMessage(s, 'system', `Hausverwaltung: ${def.title}`, r);
  }
  return ev;
}

function randomEvents(s: GameState) {
  const m = s.month % 12;
  let spawned = 0;
  const propChance = Math.min(0.26, 0.1 + 0.014 * s.level);
  const busyIds = new Set(s.events.map((e) => e.propertyId));
  for (const p of [...s.properties].sort(() => Math.random() - 0.5)) {
    if (spawned >= 2) break;
    if (busyIds.has(p.id) || p.status === 'plot' || p.status === 'forSale') continue;
    // versteckter Mangel kommt ans Licht
    const hidden = (p.defects ?? []).find((d) => !d.found && !d.fixed);
    if (hidden && p.status === 'idle' && s.month - p.acquiredMonth >= 1 && chance(0.3)) {
      spawnEvent(s, 'mangel', p.id, undefined, { cost: hidden.cost, defect: (p.defects ?? []).indexOf(hidden) });
      spawned++;
      continue;
    }
    if (!chance(propChance)) continue;
    const scope = p.status === 'building' ? 'building' : null;
    const candidates = EVENTS.filter((d) => {
      if (d.weight <= 0 || d.minLevel > s.level) return false;
      if (d.regions && !d.regions.includes(p.region)) return false;
      if (d.months && !d.months.includes(m)) return false;
      if (scope) return d.scope === 'building';
      if (p.status !== 'idle') return false;
      if (d.scope === 'tenant') return p.units.some((u) => u.tenant);
      return d.scope === 'property';
    });
    if (!candidates.length) continue;
    const total = candidates.reduce((a, d) => a + d.weight, 0);
    let roll = Math.random() * total;
    const def = candidates.find((d) => (roll -= d.weight) <= 0) ?? candidates[0];
    let ui: number | undefined;
    if (def.scope === 'tenant') {
      const idx = p.units.map((u, i) => (u.tenant ? i : -1)).filter((i) => i >= 0);
      ui = pick(idx);
    }
    const probe: ActiveEvent = { uid: 'probe', defId: def.id, propertyId: p.id, unitIndex: ui, monthsLeft: 1, data: {} };
    const ctx: EventCtx = { s, ev: probe, p, u: ui !== undefined ? p.units[ui] : undefined, t: ui !== undefined ? p.units[ui].tenant ?? undefined : undefined };
    if (def.can && !def.can(ctx)) continue;
    spawnEvent(s, def.id, p.id, ui);
    spawned++;
  }
  // globale Ereignisse
  const gChance = s.level >= 9 ? 0.25 : 0.1;
  if (chance(gChance)) {
    const active = new Set(s.events.map((e) => e.defId));
    const candidates = EVENTS.filter((d) => {
      if (d.scope !== 'global' || d.minLevel > s.level || active.has(d.id)) return false;
      if (d.regions && !d.regions.some((r) => s.level >= regionById(r).unlockLevel)) return false;
      const probe: ActiveEvent = { uid: 'probe', defId: d.id, monthsLeft: 1, data: {} };
      return !d.can || d.can({ s, ev: probe });
    });
    if (candidates.length) {
      const total = candidates.reduce((a, d) => a + d.weight, 0);
      let roll = Math.random() * total;
      const def = candidates.find((d) => (roll -= d.weight) <= 0) ?? candidates[0];
      spawnEvent(s, def.id);
    }
  }
}

export function chooseEventOption(s: GameState, evUid: string, index: number) {
  const r = resolveEvent(s, evUid, index);
  if (r) {
    track(s, 'eventSolved');
    addXp(s, 15);
  }
  return r;
}

// ---------- Monatsabschluss ----------
export function advanceMonth(s: GameState): MonthReport {
  const rep: MonthReport = { month: s.month, rent: 0, sales: 0, costs: 0, loanPayments: 0, interest: 0, lines: [] };
  const line = (t: string) => rep.lines.push(t);
  const cash0 = s.cash;

  // 1. Unbeantwortete Ereignisse verfallen
  const stillOpen: ActiveEvent[] = [];
  for (const ev of s.events) {
    ev.monthsLeft -= 1;
    if (ev.monthsLeft <= 0) {
      const r = expireEvent(s, ev);
      if (r) {
        line(`⚠️ ${r}`);
        addMessage(s, eventById(ev.defId).npc, `Verpasst: ${eventById(ev.defId).title}`, r, 'bad');
      }
    } else stillOpen.push(ev);
  }
  s.events = stillOpen.filter((e) => s.events.includes(e));

  // 2. Baustellen und Renovierungen
  for (const p of s.properties) {
    if (p.status !== 'renovating' && p.status !== 'building') continue;
    p.busyMonths -= 1;
    if (p.busyMonths > 0) continue;
    completeWork(s, p, line);
  }

  // 3. Mieter
  for (const p of s.properties) {
    if (p.status === 'building' || p.status === 'plot') continue;
    p.units.forEach((u, ui) => {
      const t = u.tenant;
      if (!t) {
        u.vacantMonths += 1;
        return;
      }
      t.monthsStayed += 1;
      const rent = tenantRent(s, p, u);
      if (t.nomad && t.monthsStayed >= 2) t.stopsPaying = true;
      let paid = false;
      if (t.stopsPaying) {
        t.missed++;
        t.paidStreak = 0;
        if (t.nomad && s.level >= 4 && !s.events.some((e) => e.defId === 'nomaden' && e.propertyId === p.id && e.unitIndex === ui))
          spawnEvent(s, 'nomaden', p.id, ui);
      } else if (s.level >= 3 && !chance(t.payMoral)) {
        t.missed++;
        t.paidStreak = 0;
        spawnEvent(s, 'mietausfall', p.id, ui, { rent: Math.round(rent) });
      } else {
        paid = true;
        rep.rent += rent;
        s.cash += rent;
        t.paidStreak += 1;
        s.stats.totalRentCollected += rent;
      }
      if (!paid && s.insurance.mietausfall) {
        s.cash += rent * 0.5;
        rep.rent += rent * 0.5;
      }
      if (t.minderungMonths > 0) t.minderungMonths--;
      // Zufriedenheit pendelt sich ein
      const openKnown = (p.defects ?? []).filter((d) => d.found && !d.fixed).length;
      if (openKnown) {
        t.satisfaction -= 3 * openKnown;
        if (t.minderungMonths <= 0 && chance(0.3)) {
          t.minderung = 0.15;
          t.minderungMonths = 2;
        }
      }
      const target = 55 + rawQuality(p) * 30 + (t.rentFactor < 1 ? 10 : t.rentFactor > 1.05 ? -10 : 0) + (u.furnished ? 5 : 0);
      t.satisfaction = clamp(t.satisfaction + Math.sign(target - t.satisfaction) * 2, 0, 100);
      // Auszug
      if (t.noticeMonths > 0) {
        t.noticeMonths--;
        if (t.noticeMonths === 0) {
          u.tenant = null;
          u.vacantMonths = 0;
          if (u.furnished && chance(0.25)) {
            const dmg = round(furnishCost(u, u.furnished) * 0.2, 100);
            s.cash -= dmg;
            line(`🛋️ Abnutzung der Möbel in ${p.name}: ${fmt(dmg)} für Ersatz.`);
          }
          line(`📦 ${t.name} ist aus ${p.name} ausgezogen.`);
          addMessage(s, 'mieter', 'Mieterwechsel', `${t.name} ist aus „${p.name}“ ausgezogen. Schalte ein Inserat und organisiere Besichtigungen!`);
        }
      } else if (s.level >= 2 && !t.stopsPaying) {
        const leave = 0.012 + (t.satisfaction < 40 ? 0.06 : 0) + (t.rentFactor > 1.05 ? 0.01 : 0) + (u.furnished ? 0.025 : 0);
        if (chance(leave)) {
          t.noticeMonths = 2;
          addMessage(s, 'mieter', 'Kündigung erhalten', `${t.name} kündigt die Wohnung in „${p.name}“ und zieht in zwei Monaten aus.`);
        }
      }
    });
    // Bewerber für inserierte Einheiten
    const d = regionById(p.region).demand;
    p.units.forEach((u) => {
      if (u.tenant) return;
      if (s.hausverwaltung && !u.listed) {
        u.listed = true;
        u.rentLevel = 1;
      }
      if (!u.listed) return;
      const lvlFactor = u.rentLevel === 0.9 ? 1.5 : u.rentLevel === 1.15 ? 0.6 : 1;
      const n = Math.round(rand(0, 1 + 4 * d) * lvlFactor * (0.6 + rawQuality(p) * 0.6));
      const fresh = Array.from({ length: Math.min(4, n) }, () => randomTenant(s, p.region));
      u.applicants = [...u.applicants, ...fresh].slice(-5);
      if (s.hausverwaltung && u.applicants.length) {
        const best = [...u.applicants].sort((a, b) => score(b) - score(a))[0];
        const ai = u.applicants.indexOf(best);
        const pid = p.id;
        const ui2 = p.units.indexOf(u);
        line(`🏢 Hausverwaltung: ${acceptApplicant(s, pid, ui2, ai)}`);
      }
    });
    if (p.built && p.status === 'idle' && p.units.length && p.units.every((u) => u.tenant) && !(p as Property & { countedRented?: boolean }).countedRented) {
      (p as Property & { countedRented?: boolean }).countedRented = true;
      s.stats.builtRented++;
      s.levelStats.builtRented++;
    }
  }

  // 4. Verkäufe
  for (const p of [...s.properties]) {
    if (p.status !== 'forSale') continue;
    if (!chance(saleChance(s, p))) continue;
    const value = propertyValue(s, p);
    let price = value * p.saleFactor * rand(0.97, 1.02);
    if (p.units.some((u) => u.tenant)) price *= 0.95;
    let defectNote = '';
    if (p.hiddenDefect > 0 && !p.defectKnown) {
      price -= p.hiddenDefect;
      defectNote = ` Der Gutachter des Käufers fand einen Mangel (−${fmt(p.hiddenDefect)}).`;
    }
    const unseen = (p.defects ?? []).filter((d) => !d.found && !d.fixed);
    if (unseen.length) {
      const cut = unseen.reduce((a, d) => a + d.cost * 1.3, 0);
      price -= cut;
      defectNote += ` Der Käufer entdeckte ${unseen.map((d) => defectDef(d.type).name).join(', ')} (−${fmt(cut)}).`;
    }
    const fee = price * 0.03;
    price = round(price - fee, 100);
    const r = sellNow(s, p, price, 'nach 3 % Maklerprovision');
    rep.sales += price;
    line(`🤝 ${r}${defectNote}`);
    addMessage(s, 'jenny', 'Verkauft!', r + defectNote, 'good');
  }

  // 5. Laufende Kosten
  let costs = 0;
  for (const p of s.properties) costs += maintenance(p);
  const value = assets(s);
  if (s.insurance.gebaeude) costs += value * 0.00015;
  if (s.insurance.mietausfall) costs += rep.rent * 0.03;
  if (s.insurance.rechtsschutz) costs += 25 * Math.max(1, s.properties.length);
  if (s.hausverwaltung) costs += rep.rent * 0.06;
  const investorShare = s.loans.some((l) => l.type === 'investor') ? rep.rent * 0.15 : 0;
  costs += investorShare;
  s.cash -= costs;
  rep.costs = costs;

  // 6. Kreditraten
  for (const l of [...s.loans]) {
    if (l.type === 'investor') continue;
    const interest = (l.principal * l.rate) / 12;
    const principalPart = Math.min(l.principal, l.payment - interest);
    s.cash -= l.payment;
    rep.loanPayments += l.payment;
    rep.interest += interest;
    l.principal -= principalPart;
    l.monthsLeft -= 1;
    if (l.principal < 1 || l.monthsLeft <= 0) {
      s.loans = s.loans.filter((x) => x.id !== l.id);
      line(`🎉 ${l.label} ist vollständig abbezahlt!`);
    }
  }

  // 7. Dispozinsen und Mahnwesen
  const dispo = dispoLimit(s);
  if (s.cash < 0) {
    const di = (-s.cash * 0.12) / 12;
    s.cash -= di;
    rep.interest += di;
    s.stats.usedDispo = true;
    s.levelStats.usedDispo = true;
  }
  if (!Number.isFinite(s.cash)) s.cash = 0;
  dunningStep(s, dispo, line);
  if (s.pendingDemotion !== null) return finishReport(s, rep, cash0);

  // 8. Markt
  const crashing = (s.flags.crashCooldown ?? 0) > 0;
  for (const r of REGIONS) {
    const drift = crashing ? rand(-0.004, 0.008) : rand(-0.008, 0.016);
    s.marketIndex[r.id] = clamp(s.marketIndex[r.id] * (1 + drift), 0.55, 2.2);
  }
  if (s.flags.crashCooldown) s.flags.crashCooldown--;
  if (s.flags.flaute) s.flags.flaute = 0;
  s.flags.stundung = 0;

  // 9. Level-Spezifisches
  s.flags.levelMonth = (s.flags.levelMonth ?? 0) + 1;
  if (s.level === 7 && !s.crashHappened && s.flags.levelMonth >= 2) {
    s.crashHappened = true;
    for (const r of REGIONS) s.marketIndex[r.id] *= 0.78;
    s.flags.crashCooldown = 10;
    spawnEvent(s, 'crash');
    line('📉 Der Immobilienmarkt ist eingebrochen!');
  } else if (s.level === 7 && s.crashHappened && s.dunning < 4) {
    s.flags.crashMonths = (s.flags.crashMonths ?? 0) + 1;
  }
  if (s.level === 9) {
    const ok = equityRatio(s) >= 0.4 && s.cash >= 250_000;
    s.flags.viktorStreak = ok ? (s.flags.viktorStreak ?? 0) + 1 : 0;
  }

  // 10. Viktor schnappt sich liegengebliebene Top-Objekte
  for (const o of [...s.offers]) {
    if (!o.hot || !chance(0.5)) continue;
    s.offers = s.offers.filter((x) => x.id !== o.id);
    s.rival = { ...(s.rival ?? { wealth: 0, won: 0, lost: 0, snatched: 0 }), snatched: (s.rival?.snatched ?? 0) + 1, wealth: (s.rival?.wealth ?? 0) + o.price * 0.3 };
    line(`🎩 Viktor hat sich „${o.property.name}“ in ${regionById(o.property.region).name} geschnappt.`);
  }
  // Erledigte, aber nicht abgeholte Aufgaben automatisch gutschreiben
  for (const q of s.quests ?? [])
    if (!q.claimed && q.progress >= q.target) {
      q.claimed = true;
      s.cash += q.reward.cash;
      s.gold = (s.gold ?? 0) + q.reward.gold;
      addXp(s, q.reward.xp);
      s.counters = { ...(s.counters ?? {}), questDone: (s.counters?.questDone ?? 0) + 1 };
      line(`✅ Aufgabe „${q.title}“ erledigt: +${fmt(q.reward.cash)}`);
    }
  // Neue Angebote und Ereignisse
  generateOffers(s);
  s.month += 1;
  randomEvents(s);

  // Bonität erholt sich langsam
  if (s.dunning === 0) s.score = clamp(s.score + (s.loans.length ? 1 : 0.5), 0, 100);
  monthTick(s);

  checkLevel(s);
  return finishReport(s, rep, cash0);
}

export function completeWork(s: GameState, p: Property, line: (t: string) => void = () => undefined) {
  const wasBuild = p.status === 'building';
  const tiersChanged = !!p.pendingTiers;
  for (const f of FEATURES) {
    const t = p.pendingTiers?.[f.id];
    if (t !== undefined && t > p.tiers[f.id]) p.tiers[f.id] = t;
  }
  p.pendingTiers = undefined;
  p.status = 'idle';
  p.busyMonths = 0;
  if (wasBuild) {
    p.built = true;
    p.acquiredMonth = s.month;
    p.rooms = generateRooms(p, p.tiers);
    p.defects = p.defects ?? [];
    p.extras = p.extras ?? [];
    track(s, 'build');
    addXp(s, 150);
    line(`🏗️ ${p.name} ist fertig gebaut!`);
    addMessage(s, 'bruno', 'Richtfest war gestern – heute Einzug!', `${p.name} ist fertig. Jetzt Mieter finden!`, 'good');
  } else {
    if (p.pendingPlan) {
      const plan = p.pendingPlan;
      const styled = Object.values(plan.rooms).filter((r) => r.floor || r.wall || r.kitchen || r.bath).length;
      applyPlan(p, plan);
      p.pendingPlan = undefined;
      if (styled) track(s, 'roomStyled', styled);
      if (plan.layout.length) track(s, 'layout', plan.layout.length);
      if (plan.fix.length) track(s, 'defectFixed', plan.fix.length);
      addXp(s, 40 + styled * 10 + plan.layout.length * 30 + plan.fix.length * 30);
    } else if (tiersChanged) {
      const keep = p.rooms;
      p.rooms = generateRooms(p, p.tiers);
      if (keep) p.rooms.forEach((r, i) => keep[i] && (r.id = keep[i].id));
      addXp(s, 40);
    }
    line(`🔨 Renovierung von ${p.name} abgeschlossen.`);
    addMessage(s, 'bruno', 'Fertig, Chef!', `Die Renovierung von „${p.name}“ ist abgeschlossen. Schau dir das Ergebnis an!`, 'good');
    if (p.fromAuction && FEATURES.every((f) => p.tiers[f.id] >= 2) && !blockingDefects(p).length) {
      p.fromAuction = false;
      s.stats.auctionRenovated++;
      s.levelStats.auctionRenovated++;
    }
  }
  checkAchievements(s);
}

// ---------- Renovierungsplan ----------
export function planTotal(s: GameState, p: Property, plan: RenoPlan) {
  return planCost(p, plan, renovationCostFactor(p.region) * (1 - rankDiscount(s)));
}

export function startRenovationPlan(s: GameState, pid: string, plan: RenoPlan): string {
  const p = s.properties.find((x) => x.id === pid);
  if (!p || p.status !== 'idle') return '';
  const { total, months, lines } = planTotal(s, p, plan);
  if (!lines.length) return 'Wähle zuerst etwas aus.';
  if (s.cash < total) return 'Dafür reicht dein Kontostand nicht.';
  s.cash -= total;
  p.invested += total;
  p.status = 'renovating';
  p.pendingPlan = plan;
  p.busyMonths = Math.max(1, months);
  p.units.forEach((u) => u.tenant && (u.tenant.satisfaction = clamp(u.tenant.satisfaction - 8, 0, 100)));
  return `Bruno legt los: ${lines.length} Arbeiten für ${fmt(total)}. Fertig in ${p.busyMonths} Monat${p.busyMonths > 1 ? 'en' : ''}.`;
}

export function rushWork(s: GameState, pid: string): string {
  const p = s.properties.find((x) => x.id === pid);
  if (!p || (p.status !== 'renovating' && p.status !== 'building')) return '';
  const cost = GOLD_COST.eile * p.busyMonths;
  if ((s.gold ?? 0) < cost) return 'Nicht genug Gold.';
  s.gold = (s.gold ?? 0) - cost;
  completeWork(s, p);
  checkLevel(s);
  return 'Bruno hat Überstunden geschoben – alles fertig!';
}

export function rerollOffers(s: GameState): string {
  if ((s.gold ?? 0) < GOLD_COST.reroll) return 'Nicht genug Gold.';
  s.gold = (s.gold ?? 0) - GOLD_COST.reroll;
  generateOffers(s, true);
  return 'Jenny hat neue Angebote für dich!';
}

// ---------- Möblierung ----------
export const furnishCost = (u: Unit, style: FurnStyle) => round(u.size * furnDef(style).costPerSqm, 100);

export function setFurnishing(s: GameState, pid: string, ui: number, style: FurnStyle | null): string {
  const p = s.properties.find((x) => x.id === pid);
  const u = p?.units[ui];
  if (!p || !u) return '';
  if (u.tenant) return 'Das geht nur, solange die Wohnung leer steht.';
  if (style === (u.furnished ?? null)) return '';
  if (style) {
    const c = furnishCost(u, style);
    if (s.cash < c) return 'Dafür reicht dein Kontostand nicht.';
    s.cash -= c;
    p.invested += c;
    track(s, 'furnish');
    addXp(s, 25);
  }
  u.furnished = style;
  u.applicants = [];
  return style ? `Möbliert im Stil „${furnDef(style).name}“. Die Miete steigt um ${Math.round(furnDef(style).rentBonus * 100)} %.` : 'Die Möbel sind raus – die Wohnung wird unmöbliert vermietet.';
}

// ---------- Bieterduell gegen Viktor ----------
export function startDuel(s: GameState, offerId: string, mortgage = false): string {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o || !o.hot) return '';
  const value = propertyValue(s, o.property);
  const aggression = 1 + Math.min(0.12, (s.rival?.lost ?? 0) * 0.015) + s.level * 0.006;
  const rivalMax = round(value * rand(0.9, 1.08) * aggression, 500);
  const first = round(o.price * rand(1.02, 1.07), 500);
  s.duel = {
    offerId,
    playerBid: o.price,
    rivalBid: first,
    rivalMax: Math.max(rivalMax, first),
    round: 1,
    log: [{ who: 'viktor', amount: first, text: pick(['Dieses Haus gehört mir.', 'Ich biete mehr, Lottokind.', 'Sie wollen spielen? Bitte sehr.']) }],
    status: 'running',
    spied: false,
  };
  s.flags.duelMortgage = mortgage ? 1 : 0;
  return '';
}

export function duelBid(s: GameState, raisePct: number): string {
  const d = s.duel;
  if (!d || d.status !== 'running') return '';
  const o = s.offers.find((x) => x.id === d.offerId);
  if (!o) return '';
  const bid = round(d.rivalBid * (1 + raisePct), 500);
  const loan = s.flags.duelMortgage ? round(bid * 0.7, 1000) : 0;
  if (s.cash + loan < purchaseTotal(bid)) return 'So viel Geld hast du nicht.';
  d.playerBid = bid;
  d.log.push({ who: 'du', amount: bid });
  d.round++;
  if (bid > d.rivalMax) {
    d.status = 'won';
    d.log.push({ who: 'viktor', amount: 0, text: pick(['Pah! Behalten Sie die Bruchbude.', 'Das werden Sie bereuen …', 'Diesmal haben Sie Glück gehabt.']) });
    s.rival = { ...(s.rival ?? { wealth: 0, won: 0, lost: 0, snatched: 0 }), won: (s.rival?.won ?? 0) + 1 };
    const r = buyOffer(s, o.id, !!s.flags.duelMortgage, bid);
    track(s, 'duelWon');
    addXp(s, 80);
    return `Zuschlag! Du hast Viktor überboten. ${r}`;
  }
  const step = rand(0.01, 0.04);
  const counter = Math.min(d.rivalMax, round(bid * (1 + step), 500));
  d.rivalBid = counter;
  d.log.push({ who: 'viktor', amount: counter, text: counter >= d.rivalMax ? 'Mein letztes Wort.' : pick(['Mehr!', 'Lächerlich.', 'Ist das alles?', 'Ich habe Zeit.', undefined as unknown as string]) });
  return '';
}

export function duelFold(s: GameState): string {
  const d = s.duel;
  if (!d || d.status !== 'running') return '';
  d.status = 'lost';
  s.rival = { ...(s.rival ?? { wealth: 0, won: 0, lost: 0, snatched: 0 }), lost: (s.rival?.lost ?? 0) + 1, wealth: (s.rival?.wealth ?? 0) + d.rivalBid * 0.3 };
  const o = s.offers.find((x) => x.id === d.offerId);
  s.offers = s.offers.filter((x) => x.id !== d.offerId);
  track(s, 'duelLost');
  return o ? `Viktor kauft „${o.property.name}“ für ${fmt(d.rivalBid)}. Er grinst.` : '';
}

export function duelSpy(s: GameState): string {
  const d = s.duel;
  if (!d || d.spied) return '';
  if ((s.gold ?? 0) < GOLD_COST.spion) return 'Nicht genug Gold.';
  s.gold = (s.gold ?? 0) - GOLD_COST.spion;
  d.spied = true;
  return `Dennis hat Viktors Assistentin ausgehorcht: Er geht höchstens bis ${fmt(d.rivalMax)}.`;
}

export function closeDuel(s: GameState) {
  s.duel = null;
}

function finishReport(s: GameState, rep: MonthReport, cash0: number) {
  rep.lines.unshift(`Kontostand: ${fmt(cash0)} → ${fmt(s.cash)}`);
  s.lastReport = rep;
  return rep;
}

const score = (t: { schufa: string; payMoral: number; income: number; notes: string[] }) =>
  (t.schufa === 'A' ? 3 : t.schufa === 'B' ? 2 : 0) + t.income / 3000 - t.notes.filter((n) => n.includes('bar') || n.includes('Keine') || n.includes('sofort') || n.includes('nachbearbeitet') || n.includes('umgezogen') || n.includes('Weicht')).length * 2;

function dunningStep(s: GameState, dispo: number, line: (t: string) => void) {
  if (s.cash >= -dispo) {
    if (s.dunning > 0) {
      line('✅ Zahlungsverzug behoben – die Bank ist beruhigt.');
      addMessage(s, 'krause', 'Alles wieder im Lot', 'Ihr Konto ist wieder im grünen Bereich. Weiter so!', 'good');
    }
    s.dunning = 0;
    return;
  }
  if (s.flags.stundung) {
    line('⏸️ Stundung: Die Bank wartet noch einen Monat.');
    return;
  }
  s.dunning += 1;
  s.stats.gotDunning = true;
  s.levelStats.gotDunning = true;
  const over = fmt(-s.cash - dispo);
  switch (s.dunning) {
    case 1:
      s.score = clamp(s.score - 10, 0, 100);
      addMessage(s, 'krause', 'Rate verpasst – Zahlungserinnerung', `Ihr Konto liegt ${over} über dem Dispo. Bitte gleichen Sie bis Monatsende aus. (Bonität −10)`, 'bad');
      line('📩 Zahlungserinnerung von der Bank.');
      break;
    case 2:
      s.score = clamp(s.score - 15, 0, 100);
      s.cash -= 100;
      addMessage(s, 'krause', '1. Mahnung', `Sie sind weiterhin ${over} über dem Dispo. Mahngebühr 100 €. Neue Kredite sind gesperrt. (Bonität −15)`, 'bad');
      line('📩 1. Mahnung – keine neuen Kredite mehr.');
      break;
    case 3:
      s.score = clamp(s.score - 10, 0, 100);
      spawnEvent(s, 'mahnung2');
      line('⚠️ 2. Mahnung – Herr Krause bietet Auswege an.');
      break;
    case 4: {
      s.score = clamp(s.score - 10, 0, 100);
      const victim = [...s.properties].filter((p) => p.status !== 'plot' || true).sort((a, b) => propertyDebt(s, b.id) - propertyDebt(s, a.id) || propertyValue(s, b) - propertyValue(s, a))[0];
      if (victim) {
        const price = round(propertyValue(s, victim) * 0.65, 1000);
        const r = sellNow(s, victim, price, 'zwangsversteigert');
        addMessage(s, 'krause', 'Kreditkündigung & Zwangsversteigerung', r, 'bad');
        line(`🔨 Zwangsversteigerung: ${r}`);
      } else {
        line('🔨 Kreditkündigung – es gibt nichts mehr zu versteigern.');
      }
      if (s.cash >= -dispo) {
        s.dunning = 0;
        line('Die Versteigerung hat dein Konto gerettet – aber teuer.');
      }
      break;
    }
    default:
      demote(s);
  }
}

export function demote(s: GameState) {
  const target = Math.max(1, s.level - 1);
  const snap = s.snapshots[target] ?? s.snapshots[1];
  const keep = { playerName: s.playerName, avatar: s.avatar, snapshots: s.snapshots, demotions: s.demotions + 1, stats: s.stats };
  if (snap) {
    const restored = JSON.parse(snap) as GameState;
    Object.assign(s, restored, keep);
  }
  s.score = 50;
  s.dunning = 0;
  s.events = [];
  s.pendingDemotion = target;
  s.pendingLevelUp = null;
  s.flags.levelMonth = 0;
  addMessage(s, 'krause', 'Insolvenz', `Sie konnten Ihre Schulden nicht begleichen. Sie starten neu am Anfang von Level ${target}: ${LEVEL_TITLES[target]}.`, 'bad');
}

export function checkLevel(s: GameState) {
  if (s.won || s.pendingDemotion !== null) return;
  const def = levelDef(s.level);
  if (!def.check(s).done) return;
  if (s.level >= 10) {
    s.won = true;
    addMessage(s, 'hilde', 'Du hast es geschafft!', `${s.playerName}, du bist der Mogul von Aurelien! Ich bin so stolz auf dich. Spiel ruhig weiter – dein Imperium wartet.`, 'good');
    return;
  }
  s.level += 1;
  s.levelStats = emptyStats();
  s.flags.levelMonth = 0;
  s.flags.viktorStreak = 0;
  s.pendingLevelUp = s.level;
  const newRegion = REGIONS.find((r) => r.unlockLevel === s.level);
  addMessage(s, 'hilde', `Level ${s.level}: ${LEVEL_TITLES[s.level]}`, LEVEL_STORY[s.level], 'good');
  if (newRegion) generateOffers(s);
  takeSnapshot(s);
}

export function buildOptionsFor(s: GameState, p: Property) {
  return BUILD_TYPES.filter((b) => s.level >= b.minLevel && (!b.regions || b.regions.includes(p.region)) && (p.plotSize ?? 0) >= b.plotSize);
}

export const unitMarketRent = (s: GameState, p: Property, u: Unit) => marketRent(s, p, u);
export { propertyValue, randInt };
