import type { ComponentChildren } from 'preact';
import { Avatar } from '../art/Avatar';
import { NPC_AVATARS } from '../art/npcs';
import { NPCS } from '../game/data';
import type { NpcId } from '../game/types';
import { fmt } from '../game/econ';
import { Icon } from './icons';

export function Sheet({ title, onClose, children, icon }: { title: string; onClose: () => void; children: ComponentChildren; icon?: string }) {
  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet">
        <div class="sheet-head">
          {icon && <Icon name={icon} size={20} />}
          <h2>{title}</h2>
          <button class="close" onClick={onClose} aria-label="Schließen">
            <Icon name="close" size={18} />
          </button>
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
  const colors = ['#b8913f', '#d9b56a', '#2f855a', '#1d3557', '#c0392b', '#f2efe8'];
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
    <span class="row" style={{ gap: '1px' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={11} height={11} viewBox="0 0 24 24" fill={i < n ? '#b8913f' : '#ddd6c6'}>
          <path d="m12 2 3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9L12 2Z" />
        </svg>
      ))}
    </span>
  );
};

export function Stat({ label, value, cls }: { label: string; value: ComponentChildren; cls?: string }) {
  return (
    <div class="stat-tile">
      <div class="l">{label}</div>
      <div class={`v ${cls ?? ''}`}>{value}</div>
    </div>
  );
}
