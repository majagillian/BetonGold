import { useState } from 'preact/hooks';
import { HouseImage, RegionImage } from './three3d';
import { NpcSay } from './common';
import { Icon } from './icons';

export function Title({ hasSave, onNew, onContinue }: { hasSave: boolean; onNew: () => void; onContinue: () => void }) {
  return (
    <div class="title-screen">
      <div class="title-bg">
        <HouseImage opts={{ style: 'gruenderzeit', region: 'kronstadt', quality: 0.95, lit: true, state: 'idle', seed: 4 }} big />
      </div>
      <div class="title-content">
        <div>
          <h1 class="logo">
            Beton<span>gold</span>
          </h1>
          <div class="tagline">Vom Lottoglück zum Immobilienimperium</div>
        </div>
        <div class="title-buttons">
          {hasSave && (
            <button class="btn big gold" onClick={onContinue}>
              <Icon name="next" /> Weiterspielen
            </button>
          )}
          <button class={`btn big ${hasSave ? 'ghost' : 'gold'}`} onClick={onNew}>
            <Icon name="plus" /> Neues Spiel
          </button>
        </div>
      </div>
    </div>
  );
}

type Slide = { kind: 'ticket' | 'jackpot' | 'phone' | 'npc' | 'house' | 'map'; text: string };
const SLIDES: Slide[] = [
  { kind: 'ticket', text: 'Samstagabend, 19:25 Uhr. Du sitzt in deiner kleinen Mietwohnung und vergleichst die Lottozahlen …' },
  { kind: 'jackpot', text: 'Sechs Richtige. Eine Million Euro. Du schreist so laut, dass der Nachbar gegen die Wand klopft.' },
  { kind: 'phone', text: 'Da klingelt das Telefon. Dein Vermieter: „Ab nächstem Monat steigt die Miete um 20 %.“ Du legst auf – und lächelst.' },
  { kind: 'npc', text: 'Oma Hilde, früher selbst Vermieterin: „Kind, verprass das nicht. Kauf Häuser, schau genau hin, mach sie schön. Und lass das Geld für dich arbeiten.“' },
  { kind: 'map', text: 'Aurelien – vom verschlafenen Kleeweiler bis zur Metropole Kronstadt. Doch Vorsicht: Immobilienhai Viktor von Hohenstein will die besten Objekte für sich.' },
  { kind: 'house', text: 'Dein Entschluss steht fest: Ab heute bist du der Vermieter. Zeit, dein Imperium aufzubauen.' },
];

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const next = () => (i < SLIDES.length - 1 ? setI(i + 1) : onDone());
  return (
    <div class="intro" onClick={next}>
      <div style={{ textAlign: 'right' }}>
        <button class="btn small ghost" onClick={(e) => { e.stopPropagation(); onDone(); }}>
          Überspringen
        </button>
      </div>
      <div class="intro-stage" key={i}>
        {s.kind === 'ticket' && (
          <div class="ticket">
            LOTTO 6 AUS 49
            <div class="nums">
              {[3, 11, 19, 27, 38, 42].map((n, k) => (
                <b key={n} style={{ animationDelay: `${k * 0.25}s` }}>{n}</b>
              ))}
            </div>
          </div>
        )}
        {s.kind === 'jackpot' && <div class="jackpot">1.000.000 €</div>}
        {s.kind === 'phone' && (
          <div class="phone">
            <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            </svg>
          </div>
        )}
        {s.kind === 'house' && (
          <div class="intro-visual">
            <HouseImage opts={{ style: 'fachwerk', region: 'kleeweiler', quality: 0.95, lit: true, state: 'idle', seed: 2 }} big />
          </div>
        )}
        {s.kind === 'map' && (
          <div class="intro-visual" style={{ aspectRatio: '16/9' }}>
            <RegionImage id="muehlental" level={10} />
          </div>
        )}
        {s.kind === 'npc' ? (
          <div style={{ maxWidth: '380px', textAlign: 'left' }}>
            <NpcSay npc="hilde" mood="happy">{s.text}</NpcSay>
          </div>
        ) : (
          <div class="intro-text">{s.text}</div>
        )}
      </div>
      <div class="dots">{SLIDES.map((_, k) => <i key={k} class={k === i ? 'on' : ''} />)}</div>
      <button class="btn big gold block" onClick={(e) => { e.stopPropagation(); next(); }}>
        {i < SLIDES.length - 1 ? 'Weiter' : 'Figur erstellen'}
      </button>
    </div>
  );
}
