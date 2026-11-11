import type { ComponentChildren } from 'preact';
import { Avatar } from '../art/Avatar';
import { NPC_AVATARS } from '../art/npcs';
import { NPCS } from '../game/data';
import type { NpcId } from '../game/types';
import { fmt } from '../game/econ';

export function Sheet({ title, onClose, children, icon }: { title: string; onClose: () => void; children: ComponentChildren; icon?: string }) {
  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet">
        <div class="sheet-head">
          {icon && <span style={{ fontSize: '22px' }}>{icon}</span>}
          <h2>{title}</h2>
          <button class="close" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ children, onClose }: { children: ComponentChildren; onClose?: () => void }) {
  return (
    <div class="overlay center" onClick={(e) => onClose && e.target === e.currentTarget && onClose()}>
      <div class="modal">{children}</div>
    </div>
  );
}

export function NpcSay({ npc, children, mood }: { npc: NpcId; children: ComponentChildren; mood?: 'happy' | 'sad' }) {
  return (
    <div class="npc-say">
      <div class="face">
        <Avatar config={NPC_AVATARS[npc]} portrait mood={mood} />
      </div>
      <div class="bubble">
        <b>{NPCS[npc].name}</b>
        {children}
      </div>
    </div>
  );
}

export function Progress({ value, light }: { value: number; light?: boolean }) {
  return (
    <div class={`progress ${light ? 'light' : ''}`}>
      <i style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div class="seg">
      {options.map((o) => (
        <button key={String(o.value)} class={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Money({ v, sign }: { v: number; sign?: boolean }) {
  return <span class={`money ${sign ? (v >= 0 ? 'pos' : 'neg') : ''}`}>{sign && v > 0 ? '+' : ''}{fmt(v)}</span>;
}

export function Confetti() {
  const colors = ['#e3a72f', '#ffd76a', '#3fbf74', '#4a8fdc', '#e86157', '#c86ab0'];
  return (
    <div class="confetti">
      {Array.from({ length: 40 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.12}s`,
            transform: `rotate(${i * 23}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div class="toggle-row">
      <div class="grow">
        {label}
        {sub && <div class="hint">{sub}</div>}
      </div>
      <button class={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} aria-label={label} />
    </div>
  );
}

export const stars = (q: number) => {
  const n = Math.max(1, Math.min(5, Math.round(q * 5)));
  return (
    <span>
      {'★'.repeat(n)}
      <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - n)}</span>
    </span>
  );
};
