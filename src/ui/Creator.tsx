import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Avatar } from '../art/Avatar';
import {
  CLOTH_COLORS, DEFAULT_AVATAR, EYE_COLORS, HAIR_COLORS, LIP_COLORS, OPTIONS, SKIN_TONES, randomAvatar, type Opt,
} from '../game/avatarOptions';
import type { AvatarConfig } from '../game/types';
import { Toggle } from './common';

type Tab = 'person' | 'gesicht' | 'haare' | 'kleidung' | 'extras';
const TABS: { id: Tab; label: string }[] = [
  { id: 'person', label: '🧍 Person' },
  { id: 'gesicht', label: '🙂 Gesicht' },
  { id: 'haare', label: '💇 Haare' },
  { id: 'kleidung', label: '👕 Kleidung' },
  { id: 'extras', label: '✨ Extras' },
];

const F = ({ label, children }: { label: string; children: ComponentChildren }) => (
  <div class="field">
    <label>{label}</label>
    {children}
  </div>
);

export function Creator({ initial, initialName, onDone, onCancel }: { initial?: AvatarConfig; initialName?: string; onDone: (name: string, a: AvatarConfig) => void; onCancel?: () => void }) {
  const [a, setA] = useState<AvatarConfig>(initial ?? DEFAULT_AVATAR);
  const [name, setName] = useState(initialName ?? '');
  const [tab, setTab] = useState<Tab>('person');
  const set = <K extends keyof AvatarConfig>(k: K, v: AvatarConfig[K]) => setA({ ...a, [k]: v });

  function Chips<K extends keyof AvatarConfig>({ k, opts }: { k: K; opts: Opt<AvatarConfig[K]>[] }) {
    return (
      <div class="chips">
        {opts.map((o) => (
          <button key={String(o.value)} class={`chip ${a[k] === o.value ? 'on' : ''}`} onClick={() => set(k, o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  const Swatches = ({ k, colors }: { k: keyof AvatarConfig; colors: string[] }) => (
    <div class="swatches">
      {colors.map((c) => (
        <button
          key={c}
          class={`swatch ${c === 'none' ? 'none' : ''} ${a[k] === c ? 'on' : ''}`}
          style={c === 'none' ? undefined : { background: c }}
          onClick={() => setA({ ...a, [k]: c })}
          aria-label={c === 'none' ? 'Keine Farbe' : `Farbe ${c}`}
        />
      ))}
    </div>
  );

  const valid = name.trim().length >= 2;

  return (
    <div class="creator">
      <div class="creator-top">
        <h2>Wer bist du?</h2>
        <div class="creator-preview">
          <Avatar config={a} />
        </div>
        <div class="creator-actions">
          <button onClick={() => setA(randomAvatar())} aria-label="Zufällige Figur">🎲</button>
          <button onClick={() => setA(DEFAULT_AVATAR)} aria-label="Zurücksetzen">↺</button>
        </div>
      </div>
      <div class="tabs">
        {TABS.map((t) => (
          <button key={t.id} class={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div class="creator-body">
        {tab === 'person' && (
          <>
            <F label="Name">
              <input class="text-input" value={name} maxLength={24} placeholder="Wie heißt du?" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
            </F>
            <F label="Geschlecht">
              <Chips k="gender" opts={OPTIONS.gender} />
            </F>
            <F label="Pronomen">
              <div class="chips">
                {OPTIONS.pronouns.map((p) => (
                  <button key={p} class={`chip ${a.pronouns === p ? 'on' : ''}`} onClick={() => set('pronouns', p)}>{p}</button>
                ))}
              </div>
            </F>
            <F label="Hautton">
              <Swatches k="skin" colors={SKIN_TONES} />
            </F>
            <F label="Körperbau">
              <Chips k="body" opts={OPTIONS.body} />
            </F>
            <F label="Größe">
              <Chips k="height" opts={OPTIONS.height} />
            </F>
            <F label="Alter">
              <Chips k="age" opts={OPTIONS.age} />
            </F>
            <p class="hint">Alle Frisuren, Kleidungsstücke und Extras stehen dir unabhängig vom Geschlecht offen.</p>
          </>
        )}
        {tab === 'gesicht' && (
          <>
            <F label="Gesichtsform"><Chips k="faceShape" opts={OPTIONS.faceShape} /></F>
            <F label="Augenform"><Chips k="eyes" opts={OPTIONS.eyes} /></F>
            <F label="Augenfarbe"><Swatches k="eyeColor" colors={EYE_COLORS} /></F>
            <F label="Augenbrauen"><Chips k="brows" opts={OPTIONS.brows} /></F>
            <F label="Mund"><Chips k="mouth" opts={OPTIONS.mouth} /></F>
            <F label="Lippenfarbe"><Swatches k="lipColor" colors={LIP_COLORS} /></F>
            <F label="Bart"><Chips k="beard" opts={OPTIONS.beard} /></F>
            <F label="Merkmale">
              <Toggle label="Rosige Wangen" on={a.blush} onChange={(v) => set('blush', v)} />
              <Toggle label="Sommersprossen" on={a.freckles} onChange={(v) => set('freckles', v)} />
              <Toggle label="Vitiligo" on={a.vitiligo} onChange={(v) => set('vitiligo', v)} />
              <Toggle label="Muttermal" on={a.mole} onChange={(v) => set('mole', v)} />
            </F>
          </>
        )}
        {tab === 'haare' && (
          <>
            <F label="Frisur"><Chips k="hair" opts={OPTIONS.hair} /></F>
            <F label="Haarfarbe"><Swatches k="hairColor" colors={HAIR_COLORS} /></F>
            <F label="Kopfbedeckung"><Chips k="headwear" opts={OPTIONS.headwear} /></F>
            {a.headwear !== 'none' && <F label="Farbe der Kopfbedeckung"><Swatches k="headwearColor" colors={CLOTH_COLORS} /></F>}
          </>
        )}
        {tab === 'kleidung' && (
          <>
            <F label="Oberteil"><Chips k="top" opts={OPTIONS.top} /></F>
            <F label="Farbe Oberteil"><Swatches k="topColor" colors={CLOTH_COLORS} /></F>
            {a.top !== 'kleid' && a.top !== 'anzug' && a.top !== 'latzhose' && (
              <>
                <F label="Unterteil"><Chips k="bottom" opts={OPTIONS.bottom} /></F>
                <F label="Farbe Unterteil"><Swatches k="bottomColor" colors={CLOTH_COLORS} /></F>
              </>
            )}
            <F label="Schuhe"><Chips k="shoes" opts={OPTIONS.shoes} /></F>
            <F label="Farbe Schuhe"><Swatches k="shoeColor" colors={CLOTH_COLORS} /></F>
          </>
        )}
        {tab === 'extras' && (
          <>
            <F label="Brille"><Chips k="glasses" opts={OPTIONS.glasses} /></F>
            <F label="Ohrschmuck"><Chips k="earrings" opts={OPTIONS.earrings} /></F>
            <F label="Mobilität"><Chips k="mobility" opts={OPTIONS.mobility} /></F>
            <F label="Weiteres">
              <Toggle label="Halskette" on={a.necklace} onChange={(v) => set('necklace', v)} />
              <Toggle label="Hörgerät" on={a.hearingAid} onChange={(v) => set('hearingAid', v)} />
            </F>
          </>
        )}
      </div>
      <div class="creator-footer">
        {!valid && <p class="hint" style={{ margin: '0 0 8px', textAlign: 'center' }}>Gib deiner Figur einen Namen (mindestens 2 Zeichen) – Reiter „Person“.</p>}
        <div class="row">
          {onCancel && <button class="btn ghost" onClick={onCancel}>Abbrechen</button>}
          <button class="btn block green big" disabled={!valid} onClick={() => onDone(name.trim(), a)}>
            {onCancel ? 'Speichern' : "Los geht's!"}
          </button>
        </div>
      </div>
    </div>
  );
}
