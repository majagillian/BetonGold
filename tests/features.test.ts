import { describe, expect, it } from 'vitest';
import * as E from '../src/game/engine';
import { DEFAULT_AVATAR } from '../src/game/avatarOptions';
import { propertyValue } from '../src/game/econ';
import { appeal, emptyPlan } from '../src/game/interior';
import { canSpin, claimQuest, spinWheel } from '../src/game/gamify';

const g: any = globalThis;
g.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

describe('Neue Funktionen', () => {
  it('jedes Haus hat Räume und mindestens einen Mangel', () => {
    const s = E.newGame('T', DEFAULT_AVATAR);
    for (const o of s.offers.filter((x) => x.kind === 'kauf')) {
      expect(o.property.rooms!.length).toBeGreaterThanOrEqual(5);
      expect(o.property.defects!.length).toBeGreaterThanOrEqual(1);
      expect(o.property.defects!.some((d) => d.main)).toBe(true);
    }
  });

  it('Mangel finden und Preis verhandeln', () => {
    const s = E.newGame('T', DEFAULT_AVATAR);
    const o = s.offers.find((x) => x.kind === 'kauf')!;
    E.startTour(s, o.id);
    const d = o.property.defects![0];
    expect(E.findDefect(s, o.property.id, d.id)).toContain('Mangel entdeckt');
    const before = o.price;
    E.negotiate(s, o.id);
    expect(o.price).toBeLessThan(before);
    expect(s.counters!.defectFound).toBe(1);
  });

  it('Renovierungsplan mit Durchbruch, Böden und Mängelbeseitigung', () => {
    const s = E.newGame('T', DEFAULT_AVATAR);
    const o = s.offers.find((x) => x.kind === 'kauf' && !x.hot) ?? s.offers.find((x) => x.kind === 'kauf')!;
    o.hot = false;
    E.buyOffer(s, o.id);
    const p = s.properties[0];
    p.defects!.forEach((d) => (d.found = true));
    const plan = emptyPlan();
    for (const r of p.rooms!) plan.rooms[r.id] = r.type === 'bad' ? { bath: 'modern', floor: 'fliesen_hell', wall: 'weiss' } : r.kitchen ? { kitchen: 'landhaus', floor: 'fliesen_hell', wall: 'salbei' } : { floor: 'parkett_eiche', wall: 'salbei' };
    plan.layout.push({ id: 'durchbruch' });
    plan.fix = p.defects!.map((d) => d.id);
    plan.elektrik = 2;
    plan.fassade = 2;
    const a0 = appeal(p);
    const v0 = propertyValue(s, p);
    s.cash = 1e7;
    expect(E.startRenovationPlan(s, p.id, plan)).toContain('Bruno');
    E.completeWork(s, p);
    expect(p.rooms!.some((r) => r.type === 'wohnkueche')).toBe(true);
    expect(p.defects!.every((d) => d.fixed)).toBe(true);
    expect(appeal(p)).toBeGreaterThan(a0);
    expect(propertyValue(s, p)).toBeGreaterThan(v0);
    expect(p.tiers.kueche).toBe(2);
  });

  it('Möblierung erhöht die Miete', () => {
    const s = E.newGame('T', DEFAULT_AVATAR);
    s.level = 2;
    const o = s.offers.find((x) => x.kind === 'kauf')!;
    o.hot = false;
    E.buyOffer(s, o.id);
    const p = s.properties[0];
    expect(E.setFurnishing(s, p.id, 0, 'skandi')).toContain('Miete steigt');
    expect(p.units[0].furnished).toBe('skandi');
  });

  it('Bieterduell: hoch genug bieten gewinnt', () => {
    const s = E.newGame('T', DEFAULT_AVATAR);
    const o = s.offers.find((x) => x.kind === 'kauf')!;
    o.hot = true;
    E.startDuel(s, o.id);
    let guard = 0;
    while (s.duel!.status === 'running' && guard++ < 40) E.duelBid(s, 0.1);
    expect(s.duel!.status).toBe('won');
    expect(s.properties.length).toBe(1);
    expect(s.rival!.won).toBe(1);
  });

  it('Bieterduell: Aussteigen verliert das Objekt', () => {
    const s = E.newGame('T', DEFAULT_AVATAR);
    const o = s.offers.find((x) => x.kind === 'kauf')!;
    o.hot = true;
    E.startDuel(s, o.id);
    E.duelFold(s);
    expect(s.offers.find((x) => x.id === o.id)).toBeUndefined();
    expect(s.rival!.lost).toBe(1);
  });

  it('Glücksrad nur einmal pro Tag, Aufgaben abholbar', () => {
    const s = E.newGame('T', DEFAULT_AVATAR);
    expect(canSpin(s)).toBe(true);
    expect(spinWheel(s).index).toBeGreaterThanOrEqual(0);
    expect(canSpin(s)).toBe(false);
    const q = s.quests![0];
    q.progress = q.target;
    const cash = s.cash;
    expect(claimQuest(s, q.id)).toContain('erledigt');
    expect(s.cash).toBeGreaterThan(cash);
  });

  it('alte Spielstände werden migriert', () => {
    const s = E.newGame('T', DEFAULT_AVATAR);
    const o = s.offers.find((x) => x.kind === 'kauf')!;
    o.hot = false;
    E.buyOffer(s, o.id);
    const old = JSON.parse(JSON.stringify(s));
    delete old.properties[0].rooms;
    delete old.properties[0].defects;
    delete old.xp;
    delete old.quests;
    E.migrate(old);
    expect(old.properties[0].rooms.length).toBeGreaterThan(0);
    expect(old.xp).toBe(0);
    expect(old.quests.length).toBe(3);
  });
});
