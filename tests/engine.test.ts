import { describe, expect, it } from 'vitest';
import * as E from '../src/game/engine';
import { netWorth } from '../src/game/econ';
import { DEFAULT_AVATAR } from '../src/game/avatarOptions';
import { EVENTS, ctxFor } from '../src/game/events';

describe('Betongold-Engine', () => {
  it('startet mit 1 Mio. € in Level 1', () => {
    const s = E.newGame('Test', DEFAULT_AVATAR);
    expect(s.cash).toBe(1_000_000);
    expect(s.level).toBe(1);
    expect(s.offers.length).toBeGreaterThan(0);
  });

  it('Flip mit Gewinn führt zu Level 2', () => {
    const s = E.newGame('Test', DEFAULT_AVATAR);
    const o = [...s.offers].sort((a, b) => a.price - b.price)[0];
    E.buyOffer(s, o.id);
    const p = s.properties[0];
    E.startRenovation(s, p.id, { bad: 2, kueche: 2, boden: 2, elektrik: 2, fassade: 2 });
    for (let i = 0; i < 40 && s.level === 1; i++) {
      for (const ev of [...s.events]) E.chooseEventOption(s, ev.uid, 0);
      const q = s.properties.find((x) => x.id === p.id);
      if (q?.status === 'idle') E.listForSale(s, p.id, 0.9, false);
      E.advanceMonth(s);
    }
    expect(s.level).toBe(2);
  });

  it('übersteht 120 Monate ohne kaputte Zahlen', () => {
    const s = E.newGame('Test', DEFAULT_AVATAR);
    s.level = 9;
    s.cash = 5_000_000;
    E.generateOffers(s, true);
    for (let i = 0; i < 120; i++) {
      for (const ev of [...s.events]) E.chooseEventOption(s, ev.uid, 0);
      for (const o of s.offers.slice(0, 2)) if (o.kind !== 'auktion') E.buyOffer(s, o.id);
      E.advanceMonth(s);
      expect(Number.isFinite(s.cash)).toBe(true);
      expect(Number.isFinite(netWorth(s))).toBe(true);
    }
  });

  it('Insolvenz stuft auf das vorherige Level zurück', () => {
    const s = E.newGame('Test', DEFAULT_AVATAR);
    s.levelStats.profitableFlips = 1;
    E.checkLevel(s);
    expect(s.level).toBe(2);
    s.cash = -10_000_000;
    for (let i = 0; i < 6 && s.pendingDemotion === null; i++) E.advanceMonth(s);
    expect(s.pendingDemotion).toBe(1);
    expect(s.level).toBe(1);
  });

  it('alle Ereignisse lassen sich anzeigen', () => {
    const s = E.newGame('Test', DEFAULT_AVATAR);
    expect(EVENTS.length).toBeGreaterThan(20);
    for (const d of EVENTS) {
      const ctx = ctxFor(s, { uid: 'x', defId: d.id, monthsLeft: 1, data: {} });
      if (d.scope === 'global') expect(typeof d.text(ctx)).toBe('string');
    }
  });
});
