import { fmt, fmtShort, netRent, netWorth, rentedUnits, equityRatio } from './econ';
import type { GameState, RegionId } from './types';

export interface GoalStatus {
  done: boolean;
  progress: string;
  pct: number;
}

export interface LevelDef {
  level: number;
  region?: RegionId;
  goal: string;
  unlocks: string[];
  check: (s: GameState) => GoalStatus;
}

const status = (cur: number, target: number, text: string): GoalStatus => ({
  done: cur >= target,
  progress: text,
  pct: Math.max(0, Math.min(1, cur / target)),
});

export const LEVELS: LevelDef[] = [
  {
    level: 1,
    region: 'kleeweiler',
    goal: 'Kaufe ein Objekt, renoviere es und verkaufe es mit Gewinn.',
    unlocks: ['Kaufen & Renovieren', 'Verkaufen', 'Dispokredit'],
    check: (s) => status(s.levelStats.profitableFlips, 1, `${Math.min(1, s.levelStats.profitableFlips)} / 1 Verkauf mit Gewinn`),
  },
  {
    level: 2,
    region: 'muehlental',
    goal: 'Vermiete eine Wohnung sechs Monate am Stück ohne Mietausfall.',
    unlocks: ['Vermieten', 'Renovierungskredit', 'Mühlental'],
    check: (s) => {
      let best = 0;
      for (const p of s.properties) for (const u of p.units) if (u.tenant) best = Math.max(best, u.tenant.paidStreak);
      return status(best, 6, `${Math.min(6, best)} / 6 Monate pünktliche Miete`);
    },
  },
  {
    level: 3,
    region: 'lumenhafen',
    goal: 'Besitze mindestens 3 vermietete Wohnungen mit zusammen 3.000 € Netto-Miete pro Monat.',
    unlocks: ['Hypothek', 'Mehrfamilienhäuser', 'Versicherungen', 'Lumenhafen'],
    check: (s) => {
      const units = rentedUnits(s);
      const rent = netRent(s);
      return {
        done: units >= 3 && rent >= 3000,
        progress: `${units} / 3 Wohnungen · ${fmt(rent)} / 3.000 € netto`,
        pct: (Math.min(1, units / 3) + Math.min(1, Math.max(0, rent) / 3000)) / 2,
      };
    },
  },
  {
    level: 4,
    goal: 'Ersteigere ein Objekt bei einer Zwangsversteigerung und bringe alle Bereiche auf mindestens Standard.',
    unlocks: ['Zwangsversteigerungen', 'Hausverwaltung', 'Mietnomaden (Achtung!)'],
    check: (s) => status(s.levelStats.auctionRenovated, 1, `${Math.min(1, s.levelStats.auctionRenovated)} / 1 ersteigertes Objekt saniert`),
  },
  {
    level: 5,
    region: 'pilzhain',
    goal: 'Baue ein Haus und vermiete alle Wohnungen darin.',
    unlocks: ['Grundstücke', 'Bauen', 'Baufinanzierung', 'Pilzhain'],
    check: (s) => {
      const ok = s.properties.some((p) => p.built && p.status === 'idle' && p.units.every((u) => u.tenant));
      const building = s.properties.some((p) => p.built || p.status === 'building');
      return { done: ok, progress: ok ? 'Neubau vollvermietet' : building ? 'Neubau in Arbeit …' : 'Noch kein Neubau', pct: ok ? 1 : building ? 0.5 : 0 };
    },
  },
  {
    level: 6,
    region: 'wolkenspitz',
    goal: 'Gründe eine GmbH und erreiche ein Vermögen von 5 Mio. €.',
    unlocks: ['GmbH-Gründung', 'Wolkenspitz'],
    check: (s) => {
      const nw = netWorth(s);
      return {
        done: s.gmbh && nw >= 5_000_000,
        progress: `${s.gmbh ? 'GmbH ✓' : 'GmbH fehlt'} · Vermögen ${fmtShort(nw)} / 5 Mio. €`,
        pct: ((s.gmbh ? 1 : 0) + Math.min(1, Math.max(0, nw) / 5_000_000)) / 2,
      };
    },
  },
  {
    level: 7,
    region: 'sonnenkueste',
    goal: 'Überstehe den Immobiliencrash: 12 Monate ohne Kreditkündigung.',
    unlocks: ['Sonnenküste'],
    check: (s) => {
      const m = s.flags.crashMonths ?? 0;
      return status(m, 12, s.crashHappened ? `${Math.min(12, m)} / 12 Monate durchgehalten` : 'Der Crash kündigt sich an …');
    },
  },
  {
    level: 8,
    region: 'kronstadt',
    goal: 'Baue eine Wohnanlage mit mindestens 12 Wohnungen.',
    unlocks: ['Wohnanlagen', 'Investorenkapital', 'Kronstadt'],
    check: (s) => {
      const ok = s.properties.some((p) => p.built && p.status === 'idle' && p.units.length >= 12);
      const wip = s.properties.some((p) => p.status === 'building' && p.units.length >= 12);
      return { done: ok, progress: ok ? 'Wohnanlage fertig' : wip ? 'Wohnanlage im Bau …' : 'Noch keine Wohnanlage', pct: ok ? 1 : wip ? 0.5 : 0 };
    },
  },
  {
    level: 9,
    goal: 'Wehre Viktors Übernahme ab: Halte 6 Monate am Stück mindestens 40 % Eigenkapitalquote und 250.000 € auf dem Konto.',
    unlocks: ['Viktor greift an'],
    check: (s) => {
      const m = s.flags.viktorStreak ?? 0;
      return status(m, 6, `${Math.min(6, m)} / 6 Monate · aktuell EK ${Math.round(equityRatio(s) * 100)} %, Konto ${fmtShort(s.cash)}`);
    },
  },
  {
    level: 10,
    region: 'neuwerk',
    goal: 'Baue in Neuwerk zwei Quartiersblöcke und vermiete dort 40 Wohnungen.',
    unlocks: ['Quartiersblöcke', 'Neuwerk'],
    check: (s) => {
      const blocks = s.properties.filter((p) => p.region === 'neuwerk' && p.buildType === 'quartier' && p.status === 'idle').length;
      const units = rentedUnits(s, 'neuwerk');
      return {
        done: blocks >= 2 && units >= 40,
        progress: `${blocks} / 2 Blöcke · ${units} / 40 Wohnungen vermietet`,
        pct: (Math.min(1, blocks / 2) + Math.min(1, units / 40)) / 2,
      };
    },
  },
];

export const levelDef = (lvl: number) => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, lvl - 1))];
