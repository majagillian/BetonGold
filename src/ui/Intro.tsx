import { useState } from 'preact/hooks';
import { RegionScene } from '../art/RegionScene';
import { House } from '../art/House';
import { NpcSay } from './common';

export function Title({ hasSave, onNew, onContinue }: { hasSave: boolean; onNew: () => void; onContinue: () => void }) {
  return (
    <div class="title-screen">
      <div class="coins">
        {['🪙', '💶', '🪙', '🔑', '🪙', '💶'].map((c, i) => (
          <span key={i} style={{ left: `${8 + i * 16}%`, animationDelay: `${i * 0.7}s`, animationDuration: `${4 + (i % 3)}s` }}>{c}</span>
        ))}
      </div>
      <div>
        <h1 class="logo">Betongold</h1>
        <div class="tagline">Vom Lottoglück zum Immobilienimperium</div>
      </div>
      <div class="title-art">
        <div style={{ position: 'relative' }}>
          <RegionScene region="lumenhafen" />
          <div style={{ position: 'absolute', left: '18%', right: '18%', bottom: '-6px' }}>
            <House style="fachwerk" region="kleeweiler" quality={0.95} lit />
          </div>
        </div>
      </div>
      <div class="title-buttons">
        {hasSave && (
          <button class="btn big green" onClick={onContinue}>
            ▶ Weiterspielen
          </button>
        )}
        <button class={`btn big ${hasSave ? 'ghost' : ''}`} onClick={onNew}>
          ✨ Neues Spiel
        </button>
      </div>
    </div>
  );
}

const SLIDES = [
  { kind: 'ticket' as const, text: 'Samstagabend, 19:25 Uhr. Du sitzt in deiner kleinen Mietwohnung vor dem Fernseher und vergleichst die Lottozahlen …' },
  { kind: 'emoji' as const, emoji: '🤑', text: 'SECHS RICHTIGE! Du hast 1.000.000 € gewonnen! Du schreist so laut, dass der Nachbar gegen die Wand klopft.' },
  { kind: 'emoji' as const, emoji: '📞', text: 'Da klingelt das Telefon. Dein Vermieter: „Ab nächsten Monat steigt die Miete um 20 %.“ Du legst auf und grinst.' },
  { kind: 'npc' as const, text: 'Oma Hilde, früher selbst Vermieterin, nimmt deine Hand: „Kind, verprass das nicht. Kauf Häuser. Mach sie schön. Und dann lass das Geld für dich arbeiten.“' },
  { kind: 'house' as const, text: 'Dein Entschluss steht fest: Ab heute bist DU der Vermieter. Willkommen in Aurelien – bau dir dein Immobilienimperium!' },
];

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const next = () => (i < SLIDES.length - 1 ? setI(i + 1) : onDone());
  return (
    <div class="intro" onClick={next}>
      <div style={{ textAlign: 'right' }}>
        <button class="btn small ghost" onClick={(e) => { e.stopPropagation(); onDone(); }}>Überspringen</button>
      </div>
      <div class="intro-stage" key={i}>
        {s.kind === 'ticket' && (
          <div class="ticket">
            LOTTO 6 aus 49
            <div class="nums">
              {[3, 11, 19, 27, 38, 42].map((n, k) => <b key={n} style={{ animationDelay: `${k * 0.25}s` }}>{n}</b>)}
            </div>
          </div>
        )}
        {s.kind === 'emoji' && <div class="big-emoji">{s.emoji}</div>}
        {s.kind === 'house' && (
          <div style={{ width: '80%', maxWidth: '300px' }}>
            <House style="fachwerk" region="kleeweiler" quality={0.95} lit />
          </div>
        )}
        {s.kind === 'npc' ? (
          <NpcSay npc="hilde" mood="happy">{s.text}</NpcSay>
        ) : (
          <div class="intro-text">{s.text}</div>
        )}
      </div>
      <div class="dots">{SLIDES.map((_, k) => <i key={k} class={k === i ? 'on' : ''} />)}</div>
      <button class="btn big block" onClick={(e) => { e.stopPropagation(); next(); }}>
        {i < SLIDES.length - 1 ? 'Weiter' : 'Figur erstellen'}
      </button>
    </div>
  );
}
