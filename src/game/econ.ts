// Wirtschafts-Hilfsfunktionen (ohne Seiteneffekte auf andere Module)
import { FEATURES, JOBS, LAST_NAMES, FIRST_NAMES, POSITIVE_NOTES, REGIONS, TIER_VALUE, WARNING_NOTES, regionById } from './data';
import { randomAvatar } from './avatarOptions';
import type { GameState, Message, NpcId, Property, RegionId, Tenant, Unit } from './types';
import { appeal, furnDef } from './interior';

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p: number) => Math.random() < p;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const round = (v: number, step = 100) => Math.round(v / step) * step;

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const fmt = (n: number) => eur.format(Math.round(n));
export const fmtShort = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio. €`;
  if (a >= 10_000) return `${sign}${Math.round(a / 1000).toLocaleString('de-DE')} Tsd. €`;
  return fmt(n);
};
export const pct = (v: number) => `${Math.round(v * 100)} %`;

export function uid(s: GameState, prefix: string) {
  s.idCounter += 1;
  return `${prefix}${s.idCounter}`;
}

export function addMessage(s: GameState, from: NpcId, title: string, text: string, tone: Message['tone'] = 'info') {
  s.messages.unshift({ id: uid(s, 'm'), month: s.month, from, title, text, read: false, tone });
  if (s.messages.length > 60) s.messages.length = 60;
}

export const isUnlocked = (s: GameState, r: RegionId) => s.level >= regionById(r).unlockLevel;
export const unlockedRegions = (s: GameState) => REGIONS.filter((r) => s.level >= r.unlockLevel);

function effTier(t: number, ideal: number) {
  if (t <= ideal) return TIER_VALUE[t];
  return TIER_VALUE[ideal] + 0.3 * (TIER_VALUE[t] - TIER_VALUE[ideal]);
}

export function quality(p: Property) {
  const ideal = regionById(p.region).idealTier;
  return FEATURES.reduce((sum, f) => sum + f.weight * effTier(p.tiers[f.id], ideal), 0);
}

/** reine Ausstattungsqualität ohne regionale Deckelung (für Mieterzufriedenheit) */
export function rawQuality(p: Property) {
  return FEATURES.reduce((sum, f) => sum + f.weight * TIER_VALUE[p.tiers[f.id]], 0);
}

export const valueFactor = (q: number) => 0.4 + 0.75 * q;

export function plotValue(s: GameState, p: Property) {
  const r = regionById(p.region);
  return (p.plotSize ?? 500) * r.pricePerSqm * 0.25 * s.marketIndex[p.region];
}

export function propertyValue(s: GameState, p: Property) {
  if (p.status === 'plot') return plotValue(s, p);
  if (p.status === 'building') return p.invested * 0.95;
  const r = regionById(p.region);
  let v = p.size * r.pricePerSqm * s.marketIndex[p.region] * valueFactor(quality(p));
  if (p.rooms?.length) v *= 0.94 + 0.14 * appeal(p);
  if (p.staging) v *= 1.05;
  if (p.defectKnown) v -= p.hiddenDefect;
  for (const d of p.defects ?? []) if (d.found && !d.fixed) v -= d.cost * 1.2;
  return Math.max(0, v);
}

export function buildCostPerSqm(region: RegionId) {
  return 0.55 * regionById(region).pricePerSqm + 600;
}

export function renovationCostFactor(region: RegionId) {
  return 0.8 + 0.4 * (regionById(region).pricePerSqm / 7500);
}

const SEASON: Record<string, number[]> = {
  sommer: [0.6, 0.6, 0.8, 1, 1.2, 1.5, 1.7, 1.7, 1.2, 0.9, 0.6, 0.7],
  winter: [1.6, 1.6, 1.3, 0.9, 0.6, 0.8, 1.0, 1.0, 0.7, 0.6, 0.9, 1.5],
};

export function seasonFactor(region: RegionId, month: number) {
  const r = regionById(region);
  if (!r.season) return 1;
  return SEASON[r.season][month % 12];
}

export function marketRent(s: GameState, p: Property, u: Unit) {
  const r = regionById(p.region);
  const a = p.rooms?.length ? 0.94 + 0.14 * appeal(p) : 1;
  return u.size * r.rentPerSqm * (0.5 + 0.6 * quality(p)) * Math.sqrt(s.marketIndex[p.region]) * a;
}

export const furnishBonus = (u: Unit) => (u.furnished ? furnDef(u.furnished).rentBonus : 0);

export function tenantRent(s: GameState, p: Property, u: Unit) {
  if (!u.tenant) return 0;
  let factor = u.tenant.rentFactor;
  if (p.region === 'kronstadt' && s.flags.mietpreisbremse) factor = Math.min(factor, 1);
  let rent = marketRent(s, p, u) * (1 + furnishBonus(u)) * factor * seasonFactor(p.region, s.month);
  if (u.tenant.minderungMonths > 0) rent *= 1 - u.tenant.minderung;
  if (p.region === 'pilzhain' && (s.flags.flaute ?? 0) > 0) rent *= 0.6;
  return rent;
}

export const maintenance = (p: Property) => (p.status === 'plot' ? 20 : p.size * 1.2);

export const totalDebt = (s: GameState) => s.loans.reduce((a, l) => a + l.principal, 0);
export const assets = (s: GameState) => s.properties.reduce((a, p) => a + propertyValue(s, p), 0);
export const netWorth = (s: GameState) => s.cash + assets(s) - totalDebt(s);
export function equityRatio(s: GameState) {
  const total = assets(s) + Math.max(0, s.cash);
  if (total <= 0) return 0;
  return clamp((total - totalDebt(s) - Math.max(0, -s.cash)) / total, 0, 1);
}

export const dispoLimit = (s: GameState) => Math.min(500_000, 30_000 + 0.05 * assets(s));

export function monthlyRentIncome(s: GameState) {
  let sum = 0;
  for (const p of s.properties) for (const u of p.units) if (u.tenant && !u.tenant.stopsPaying) sum += tenantRent(s, p, u);
  return sum;
}

export function netRent(s: GameState) {
  let sum = 0;
  for (const p of s.properties) {
    const rented = p.units.filter((u) => u.tenant).length;
    if (!rented) continue;
    for (const u of p.units) if (u.tenant && !u.tenant.stopsPaying) sum += marketRent(s, p, u) * u.tenant.rentFactor;
    sum -= maintenance(p) * (rented / p.units.length);
  }
  return sum;
}

export const rentedUnits = (s: GameState, region?: RegionId) =>
  s.properties.filter((p) => !region || p.region === region).reduce((a, p) => a + p.units.filter((u) => u.tenant).length, 0);

export function annuity(principal: number, rate: number, months: number) {
  if (rate <= 0) return principal / months;
  const r = rate / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function makeUnits(size: number, count: number): Unit[] {
  return Array.from({ length: count }, () => ({
    size: Math.round(size / count),
    tenant: null,
    listed: false,
    applicants: [],
    vacantMonths: 0,
    rentLevel: 1 as const,
  }));
}

export function randomTenant(s: GameState, region: RegionId): Tenant {
  const jobs = JOBS.filter((j) => !j.regions || j.regions.includes(region));
  const job = pick(jobs);
  const roll = Math.random();
  const nomad = s.level >= 4 && chance(0.08);
  let schufa: Tenant['schufa'] = roll < 0.55 ? 'A' : roll < 0.9 ? 'B' : 'C';
  if (nomad) schufa = chance(0.5) ? 'B' : 'A';
  const payMoral = s.level < 3 ? 1 : nomad ? 0 : schufa === 'A' ? 0.993 : schufa === 'B' ? 0.982 : 0.95;
  const notes: string[] = [];
  const pos = [...POSITIVE_NOTES].sort(() => Math.random() - 0.5);
  const warn = [...WARNING_NOTES].sort(() => Math.random() - 0.5);
  if (nomad) {
    notes.push(warn[0], warn[1]);
    if (chance(0.5)) notes.push(pos[0]);
  } else {
    notes.push(pos[0]);
    if (chance(0.5)) notes.push(pos[1]);
    if (s.level >= 3 && (schufa === 'C' ? chance(0.5) : chance(0.1))) notes.push(warn[0]);
  }
  return {
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    job: job.name,
    income: round(rand(job.income[0], job.income[1]), 50),
    schufa,
    avatar: randomAvatar(),
    payMoral,
    nomad,
    notes: notes.sort(() => Math.random() - 0.5),
    satisfaction: 70,
    monthsStayed: 0,
    paidStreak: 0,
    missed: 0,
    rentFactor: 1,
    noticeMonths: 0,
    stopsPaying: false,
    minderung: 0,
    minderungMonths: 0,
  };
}

export function loanRate(s: GameState, base: number) {
  let r = base + (60 - s.score) * 0.0004 + (s.flags.zins ?? 0);
  if (s.gmbh) r -= 0.005;
  return Math.max(0.01, r);
}

export function canBorrow(s: GameState) {
  return s.dunning < 2 && s.score >= 35;
}

export function propertyDebt(s: GameState, pid: string) {
  return s.loans.filter((l) => l.propertyId === pid).reduce((a, l) => a + l.principal, 0);
}
