// Gamification: Erfahrung, Ränge, Erfolge, Monatsaufgaben, Glücksrad, Rangliste
import type { GameState, Quest, Reward } from './types';
import { netWorth, pick, rentedUnits, round } from './econ';

export const RANK_TITLES = [
  'Lottogewinner', 'Neuling', 'Hobby-Vermieter', 'Heimwerker', 'Schnäppchenjäger', 'Kleinvermieter', 'Sanierungsprofi',
  'Bauherr', 'Investor', 'Immobilienprofi', 'Portfolio-Manager', 'Projektentwickler', 'Baulöwe', 'Immobilienhai', 'Tycoon', 'Mogul', 'Legende',
];

export const xpForRank = (r: number) => Math.round(120 * Math.pow(r, 1.6));

export function rankInfo(xp: number) {
  let r = 1;
  while (xpForRank(r) <= xp) r++;
  const prev = r === 1 ? 0 : xpForRank(r - 1);
  const next = xpForRank(r);
  return { rank: r, title: RANK_TITLES[Math.min(RANK_TITLES.length - 1, Math.floor((r - 1) / 2))], pct: (xp - prev) / (next - prev), next, prev };
}

/** Rabatt auf Handwerkerkosten durch den Rang */
export const rankDiscount = (s: GameState) => Math.min(0.15, (rankInfo(s.xp ?? 0).rank - 1) * 0.006);

export function initGamify(s: GameState) {
  s.xp ??= 0;
  s.gold ??= 15;
  s.achievements ??= [];
  s.counters ??= {};
  s.quests ??= [];
  s.questMonth ??= -1;
  s.rival ??= { wealth: 9_000_000, won: 0, lost: 0, snatched: 0 };
  s.rivals ??= [
    { name: 'Viktor von Hohenstein', wealth: 9_000_000, growth: 0.012 },
    { name: 'Nordwind Immobilien AG', wealth: 24_000_000, growth: 0.006 },
    { name: 'Familie Brandstetter', wealth: 3_500_000, growth: 0.009 },
    { name: 'Lina Okafor', wealth: 1_400_000, growth: 0.018 },
    { name: 'Kurt Pfennig', wealth: 650_000, growth: 0.01 },
  ];
  s.pendingRewards ??= [];
  s.settings ??= { sound: true };
  if (!s.quests.length || s.questMonth !== s.month) newQuests(s);
}

export function reward(s: GameState, r: Reward) {
  s.cash += r.cash ?? 0;
  s.gold = (s.gold ?? 0) + (r.gold ?? 0);
  s.pendingRewards = [...(s.pendingRewards ?? []), r];
  if (r.xp) addXp(s, r.xp, false);
}

export function addXp(s: GameState, n: number, announce = true) {
  const before = rankInfo(s.xp ?? 0).rank;
  s.xp = (s.xp ?? 0) + n;
  const after = rankInfo(s.xp).rank;
  if (after > before) {
    const info = rankInfo(s.xp);
    const cash = 2500 * after * Math.max(1, s.level);
    s.cash += cash;
    s.gold = (s.gold ?? 0) + 5;
    s.pendingRewards = [
      ...(s.pendingRewards ?? []),
      { kind: 'rank', title: `Rang ${after}: ${info.title}`, text: `Neuer Rang! Bruno gibt dir jetzt ${Math.round(rankDiscount(s) * 100)} % Rabatt auf alle Arbeiten.`, cash, gold: 5 },
    ];
  }
  void announce;
}

// ---------- Erfolge ----------
interface AchDef { id: string; title: string; text: string; gold: number; xp: number; check: (s: GameState) => boolean }
const c = (s: GameState, k: string) => s.counters?.[k] ?? 0;
export const ACHIEVEMENTS: AchDef[] = [
  { id: 'first_buy', title: 'Erster Schlüssel', text: 'Deine erste Immobilie gekauft.', gold: 5, xp: 50, check: (s) => c(s, 'buy') >= 1 },
  { id: 'first_flip', title: 'Flipper', text: 'Das erste Objekt mit Gewinn verkauft.', gold: 5, xp: 80, check: (s) => c(s, 'flip') >= 1 },
  { id: 'flip_50k', title: 'Goldenes Händchen', text: 'Mit einem Verkauf 50.000 € Gewinn gemacht.', gold: 10, xp: 150, check: (s) => (s.stats.bestFlipProfit ?? 0) >= 50000 },
  { id: 'flip_250k', title: 'Viertelmillion', text: 'Mit einem Verkauf 250.000 € Gewinn gemacht.', gold: 20, xp: 300, check: (s) => (s.stats.bestFlipProfit ?? 0) >= 250000 },
  { id: 'detective', title: 'Spürnase', text: '5 Mängel bei Besichtigungen entdeckt.', gold: 8, xp: 120, check: (s) => c(s, 'defectFound') >= 5 },
  { id: 'detective2', title: 'Gutachter-Blick', text: '25 Mängel entdeckt.', gold: 20, xp: 300, check: (s) => c(s, 'defectFound') >= 25 },
  { id: 'fixer', title: 'Mängelbeseitiger', text: '10 Mängel behoben.', gold: 10, xp: 150, check: (s) => c(s, 'defectFixed') >= 10 },
  { id: 'designer', title: 'Innenarchitekt', text: '20 Räume neu gestaltet.', gold: 10, xp: 150, check: (s) => c(s, 'roomStyled') >= 20 },
  { id: 'wall_breaker', title: 'Wanddurchbruch', text: 'Den ersten Grundriss verändert.', gold: 5, xp: 80, check: (s) => c(s, 'layout') >= 1 },
  { id: 'landlord', title: 'Vermieter', text: 'Den ersten Mietvertrag unterschrieben.', gold: 5, xp: 60, check: (s) => c(s, 'rent') >= 1 },
  { id: 'units10', title: 'Zehn Haustüren', text: '10 Wohnungen gleichzeitig vermietet.', gold: 15, xp: 250, check: (s) => rentedUnits(s) >= 10 },
  { id: 'units50', title: 'Wohnungsbaugesellschaft', text: '50 Wohnungen gleichzeitig vermietet.', gold: 40, xp: 600, check: (s) => rentedUnits(s) >= 50 },
  { id: 'furnisher', title: 'Möbelhaus', text: 'Die erste Wohnung möbliert.', gold: 5, xp: 60, check: (s) => c(s, 'furnish') >= 1 },
  { id: 'duel1', title: 'Viktor geschlagen', text: 'Das erste Bieterduell gegen Viktor gewonnen.', gold: 10, xp: 150, check: (s) => (s.rival?.won ?? 0) >= 1 },
  { id: 'duel5', title: 'Viktors Albtraum', text: '5 Bieterduelle gewonnen.', gold: 25, xp: 400, check: (s) => (s.rival?.won ?? 0) >= 5 },
  { id: 'builder', title: 'Bauherr', text: 'Den ersten Neubau fertiggestellt.', gold: 10, xp: 200, check: (s) => c(s, 'build') >= 1 },
  { id: 'million2', title: 'Doppelmillionär', text: 'Vermögen von 2 Mio. € erreicht.', gold: 10, xp: 200, check: (s) => netWorth(s) >= 2_000_000 },
  { id: 'million10', title: 'Zehnfacher Millionär', text: 'Vermögen von 10 Mio. € erreicht.', gold: 25, xp: 500, check: (s) => netWorth(s) >= 10_000_000 },
  { id: 'million50', title: 'Imperium', text: 'Vermögen von 50 Mio. € erreicht.', gold: 50, xp: 1000, check: (s) => netWorth(s) >= 50_000_000 },
  { id: 'regions', title: 'Weltenbummler', text: 'Objekte in 5 verschiedenen Regionen besessen.', gold: 15, xp: 250, check: (s) => new Set(s.properties.map((p) => p.region)).size >= 5 },
  { id: 'debtfree', title: 'Schuldenfrei', text: 'Einen Kredit komplett abgelöst.', gold: 5, xp: 80, check: (s) => c(s, 'loanRepaid') >= 1 },
  { id: 'crisis', title: 'Krisenfest', text: 'Den Immobiliencrash überstanden.', gold: 20, xp: 300, check: (s) => s.level >= 8 },
  { id: 'streak7', title: 'Treue Seele', text: '7 Tage in Folge gespielt.', gold: 15, xp: 150, check: (s) => (s.daily?.streak ?? 0) >= 7 },
  { id: 'top3', title: 'Auf dem Treppchen', text: 'Platz 3 der Rangliste erreicht.', gold: 20, xp: 300, check: (s) => leaderboard(s).findIndex((e) => e.me) <= 2 },
  { id: 'top1', title: 'Nummer eins', text: 'Platz 1 der Rangliste – reicher als Viktor und die Nordwind AG!', gold: 50, xp: 800, check: (s) => leaderboard(s).findIndex((e) => e.me) === 0 },
  { id: 'quests10', title: 'Fleißig', text: '10 Monatsaufgaben erledigt.', gold: 15, xp: 200, check: (s) => c(s, 'questDone') >= 10 },
];

export function checkAchievements(s: GameState) {
  s.achievements ??= [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (!a.check(s)) continue;
    s.achievements.push(a.id);
    reward(s, { kind: 'achievement', title: `Erfolg: ${a.title}`, text: a.text, gold: a.gold, xp: a.xp });
  }
}

// ---------- Monatsaufgaben ----------
interface QuestTpl { key: string; title: (n: number) => string; n: [number, number]; minLevel: number }
const QUESTS: QuestTpl[] = [
  { key: 'defectFound', title: (n) => (n === 1 ? 'Entdecke einen Mangel bei einer Besichtigung' : `Entdecke ${n} Mängel bei Besichtigungen`), n: [1, 2], minLevel: 1 },
  { key: 'roomStyled', title: (n) => `Gestalte ${n} Räume neu (Boden, Wand, Küche oder Bad)`, n: [2, 4], minLevel: 1 },
  { key: 'buy', title: (n) => `Kaufe ${n} Immobilie${n > 1 ? 'n' : ''}`, n: [1, 1], minLevel: 1 },
  { key: 'tour', title: (n) => (n === 1 ? 'Besichtige ein Objekt von innen' : `Besichtige ${n} Objekte von innen`), n: [1, 3], minLevel: 1 },
  { key: 'eventSolved', title: (n) => `Löse ${n} Ereignis${n > 1 ? 'se' : ''}`, n: [1, 2], minLevel: 1 },
  { key: 'defectFixed', title: () => 'Behebe einen Mangel', n: [1, 1], minLevel: 1 },
  { key: 'rent', title: (n) => `Unterschreibe ${n} Mietvertr${n > 1 ? 'äge' : 'ag'}`, n: [1, 2], minLevel: 2 },
  { key: 'furnish', title: () => 'Möbliere eine Wohnung', n: [1, 1], minLevel: 2 },
  { key: 'layout', title: () => 'Verändere einen Grundriss', n: [1, 1], minLevel: 1 },
  { key: 'duelWon', title: () => 'Gewinne ein Bieterduell gegen Viktor', n: [1, 1], minLevel: 1 },
  { key: 'flip', title: () => 'Verkaufe ein Objekt mit Gewinn', n: [1, 1], minLevel: 1 },
];

export function newQuests(s: GameState) {
  const pool = QUESTS.filter((q) => q.minLevel <= s.level);
  const chosen: QuestTpl[] = [];
  while (chosen.length < 3 && chosen.length < pool.length) {
    const q = pick(pool);
    if (!chosen.includes(q)) chosen.push(q);
  }
  const base = 3000 * s.level;
  s.quests = chosen.map((q, i) => {
    const n = q.n[0] + Math.floor(Math.random() * (q.n[1] - q.n[0] + 1));
    return {
      id: `q${s.month}-${i}`,
      key: q.key,
      title: q.title(n),
      target: n,
      progress: 0,
      reward: { cash: round(base * (1 + i * 0.5), 500), xp: 60 + i * 30, gold: i === 2 ? 5 : 2 },
      claimed: false,
    } as Quest;
  });
  s.questMonth = s.month;
}

export function track(s: GameState, key: string, n = 1) {
  s.counters ??= {};
  s.counters[key] = (s.counters[key] ?? 0) + n;
  for (const q of s.quests ?? []) if (q.key === key && !q.claimed) q.progress = Math.min(q.target, q.progress + n);
  checkAchievements(s);
}

export function claimQuest(s: GameState, id: string) {
  const q = s.quests?.find((x) => x.id === id);
  if (!q || q.claimed || q.progress < q.target) return '';
  q.claimed = true;
  s.cash += q.reward.cash;
  s.gold = (s.gold ?? 0) + q.reward.gold;
  addXp(s, q.reward.xp);
  s.counters = { ...(s.counters ?? {}), questDone: (s.counters?.questDone ?? 0) + 1 };
  checkAchievements(s);
  return `Aufgabe erledigt! +${q.reward.cash.toLocaleString('de-DE')} €, +${q.reward.xp} XP, +${q.reward.gold} Gold`;
}

// ---------- Glücksrad ----------
export const WHEEL = [
  { label: 'Geld', kind: 'cash', mult: 1 },
  { label: '5 Gold', kind: 'gold', amount: 5 },
  { label: 'XP', kind: 'xp', amount: 150 },
  { label: 'Geld ×2', kind: 'cash', mult: 2 },
  { label: '10 Gold', kind: 'gold', amount: 10 },
  { label: 'Bonität +3', kind: 'score', amount: 3 },
  { label: 'Geld', kind: 'cash', mult: 1 },
  { label: '25 Gold', kind: 'gold', amount: 25 },
] as const;

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export const canSpin = (s: GameState) => s.daily?.last !== todayKey();

export function spinWheel(s: GameState): { index: number; text: string } {
  if (!canSpin(s)) return { index: -1, text: '' };
  const yesterday = new Date(Date.now() - 864e5);
  const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
  const streak = s.daily?.last === yKey ? (s.daily.streak ?? 0) + 1 : 1;
  s.daily = { last: todayKey(), streak };
  const weights = [22, 18, 16, 10, 12, 10, 22, 4];
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let index = 0;
  while ((r -= weights[index]) > 0) index++;
  const p = WHEEL[index];
  const bonus = 1 + Math.min(6, streak - 1) * 0.15;
  let text = '';
  if (p.kind === 'cash') {
    const amt = round(5000 * s.level * p.mult * bonus, 500);
    s.cash += amt;
    text = `${amt.toLocaleString('de-DE')} € gewonnen!`;
  } else if (p.kind === 'gold') {
    const amt = Math.round(p.amount * bonus);
    s.gold = (s.gold ?? 0) + amt;
    text = `${amt} Goldbarren gewonnen!`;
  } else if (p.kind === 'xp') {
    const amt = Math.round(p.amount * bonus * s.level);
    addXp(s, amt);
    text = `${amt} Erfahrungspunkte gewonnen!`;
  } else {
    s.score = Math.min(100, s.score + p.amount);
    text = 'Deine Bonität steigt um 3 Punkte!';
  }
  if (streak > 1) text += ` (Serie: ${streak} Tage, +${Math.round((bonus - 1) * 100)} %)`;
  checkAchievements(s);
  return { index, text };
}

// ---------- Rangliste ----------
export function leaderboard(s: GameState) {
  const me = { name: s.playerName, wealth: netWorth(s), me: true };
  const others = (s.rivals ?? []).map((r) => ({ name: r.name, wealth: r.name.startsWith('Viktor') ? (s.rival?.wealth ?? r.wealth) : r.wealth, me: false }));
  return [...others, me].sort((a, b) => b.wealth - a.wealth);
}

export function monthTick(s: GameState) {
  for (const r of s.rivals ?? []) r.wealth *= 1 + r.growth * (0.5 + Math.random());
  if (s.rival) s.rival.wealth *= 1.008 + Math.random() * 0.01;
  newQuests(s);
  checkAchievements(s);
}

export const GOLD_COST = { gutachter: 5, spion: 8, reroll: 3, eile: 10 };
