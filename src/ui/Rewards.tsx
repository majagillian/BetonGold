import { useEffect, useState } from 'preact/hooks';
import { Avatar } from '../art/Avatar';
import { NPC_AVATARS } from '../art/npcs';
import * as E from '../game/engine';
import { fmt } from '../game/econ';
import { GOLD_COST, spinWheel, WHEEL } from '../game/gamify';
import type { GameState, Reward } from '../game/types';
import { Confetti, Modal } from './common';
import { Icon } from './icons';
import { HouseImage } from './three3d';
import type { Act } from './sheets';
import { sfx } from './sound';

export function RewardModal({ r, onClose }: { r: Reward; onClose: () => void }) {
  useEffect(() => {
    if (r.kind === 'rank') sfx.levelup();
    else sfx.success();
  }, [r.title]);
  return (
    <div class="overlay center">
      <Confetti />
      <div class="modal" style={{ textAlign: 'center' }}>
        <div class="reward-icon">
          <Icon name={r.kind === 'rank' ? 'star' : r.kind === 'achievement' ? 'trophy' : r.kind === 'daily' ? 'wheel' : 'check'} size={38} stroke={2} />
        </div>
        <h2>{r.title}</h2>
        <p class="small" style={{ color: 'var(--ink2)' }}>{r.text}</p>
        <div class="reward-chips">
          {r.cash ? <span class="pill green">+{fmt(r.cash)}</span> : null}
          {r.gold ? <span class="pill gold"><Icon name="gold" size={13} /> +{r.gold} Gold</span> : null}
          {r.xp ? <span class="pill blue">+{r.xp} XP</span> : null}
        </div>
        <button class="btn gold block big" onClick={onClose}>Super!</button>
      </div>
    </div>
  );
}

export function WheelModal({ act, onClose }: { act: Act; onClose: () => void }) {
  const [rot, setRot] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const n = WHEEL.length;
  const seg = 360 / n;
  const colors = ['#1d3557', '#b8913f', '#27497a', '#d9b56a', '#12161e', '#2f855a', '#1d3557', '#c0392b'];
  const grad = `conic-gradient(${WHEEL.map((_, i) => `${colors[i]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;
  const spin = () => {
    if (spinning || result) return;
    let res = { index: -1, text: '' };
    act((s) => {
      res = spinWheel(s);
      return '';
    });
    if (res.index < 0) return;
    setSpinning(true);
    const target = 360 * 6 + (360 - (res.index * seg + seg / 2));
    setRot(target);
    let ticks = 0;
    const iv = setInterval(() => {
      sfx.tick();
      if (++ticks > 24) clearInterval(iv);
    }, 140);
    setTimeout(() => {
      setResult(res.text);
      setSpinning(false);
      sfx.success();
    }, 3900);
  };
  return (
    <Modal onClose={spinning ? undefined : onClose}>
      {result && <Confetti />}
      <h2>Tagesbonus</h2>
      <p class="hint center">Einmal am Tag drehen. Spielst du jeden Tag, steigt dein Bonus.</p>
      <div class="wheel-wrap">
        <div class="wheel-pointer" />
        <div class="wheel" style={{ background: grad, transform: `rotate(${rot}deg)` }}>
          {WHEEL.map((w, i) => (
            <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', transform: `rotate(${i * seg + seg / 2}deg) translateY(-92px)`, transformOrigin: '0 0', color: '#fff', fontSize: '11px', fontWeight: 800, width: '70px', marginLeft: '-35px', textAlign: 'center', textShadow: '0 1px 2px rgba(0,0,0,.5)' }}>
              {w.label}
            </div>
          ))}
        </div>
        <div class="wheel-hub" />
      </div>
      {result ? (
        <>
          <p class="bold center">{result}</p>
          <button class="btn gold block big" onClick={onClose}>Einsammeln</button>
        </>
      ) : (
        <button class="btn gold block big" disabled={spinning} onClick={spin}>
          <Icon name="wheel" /> {spinning ? 'Dreht …' : 'Drehen!'}
        </button>
      )}
    </Modal>
  );
}

export function DuelModal({ s, act, onBought, onClose }: { s: GameState; act: Act; onBought: (pid: string) => void; onClose: () => void }) {
  const d = s.duel;
  useEffect(() => {
    if (d?.status === 'won') sfx.levelup();
  }, [d?.status]);
  if (!d) return null;
  const o = s.offers.find((x) => x.id === d.offerId);
  const pid = o?.property.id ?? s.properties[s.properties.length - 1]?.id;
  const lastViktor = [...d.log].reverse().find((l) => l.who === 'viktor' && l.text)?.text;
  const leadMe = d.playerBid > d.rivalBid || d.status === 'won';
  const raise = (pct: number) => {
    act((st) => E.duelBid(st, pct));
    sfx.coin();
  };
  return (
    <div class="overlay center">
      {d.status === 'won' && <Confetti />}
      <div class="modal duel">
        <h2>{d.status === 'running' ? 'Bieterduell' : d.status === 'won' ? 'Gewonnen!' : 'Verloren'}</h2>
        {o && (
          <div class="hero" style={{ aspectRatio: '16/8', marginBottom: '8px' }}>
            <HouseImage p={o.property} />
          </div>
        )}
        <div class="small muted bold">{o?.property.name}</div>
        <div class="duel-faces">
          <div class="duel-face">
            <div class={`f ${leadMe ? 'lead' : ''}`}>
              <Avatar config={s.avatar} portrait mood={d.status === 'won' ? 'happy' : d.status === 'lost' ? 'sad' : undefined} />
            </div>
            <div class="n">{s.playerName}</div>
            <div class="b">{fmt(d.playerBid)}</div>
          </div>
          <div class="duel-vs">VS</div>
          <div class="duel-face">
            <div class={`f ${!leadMe ? 'lead' : ''}`}>
              <Avatar config={NPC_AVATARS.viktor} portrait mood={d.status === 'won' ? 'sad' : undefined} />
            </div>
            <div class="n">Viktor</div>
            <div class="b">{fmt(d.rivalBid)}</div>
          </div>
        </div>
        {lastViktor && <p class="small bold" style={{ fontStyle: 'italic', margin: '0 0 10px' }}>„{lastViktor}“</p>}
        <div class="duel-log">
          {d.log.filter((l) => l.amount > 0).map((l, i) => (
            <div key={i}>
              <b>{l.who === 'du' ? s.playerName : 'Viktor'}</b> bietet {fmt(l.amount)}
            </div>
          ))}
        </div>
        {d.spied && d.status === 'running' && <p class="small bold" style={{ color: 'var(--gold)' }}>Viktors Limit: {fmt(d.rivalMax)}</p>}
        {d.status === 'running' ? (
          <>
            <div class="grid3">
              {[0.02, 0.05, 0.1].map((pct) => (
                <button key={pct} class="btn small" onClick={() => raise(pct)}>
                  +{Math.round(pct * 100)} %
                  <br />
                  {fmt(Math.round((d.rivalBid * (1 + pct)) / 500) * 500)}
                </button>
              ))}
            </div>
            <div class="grid2 mt">
              <button class="btn ghost small" disabled={d.spied || (s.gold ?? 0) < GOLD_COST.spion} onClick={() => { act((st) => E.duelSpy(st)); sfx.found(); }}>
                <Icon name="eye" size={16} /> Spionieren ({GOLD_COST.spion} Gold)
              </button>
              <button class="btn red small" onClick={() => { act((st) => E.duelFold(st)); sfx.fail(); }}>
                Aussteigen
              </button>
            </div>
          </>
        ) : (
          <button
            class={`btn block big ${d.status === 'won' ? 'gold' : ''}`}
            onClick={() => {
              act((st) => E.closeDuel(st));
              if (d.status === 'won' && pid) onBought(pid);
              else onClose();
            }}
          >
            {d.status === 'won' ? 'Zum neuen Objekt' : 'Weiter'}
          </button>
        )}
      </div>
    </div>
  );
}
