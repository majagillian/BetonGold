import { useEffect, useRef, useState } from 'preact/hooks';
import { advanceMonth, checkLevel, clearSave, load, newGame, save } from '../game/engine';
import type { AvatarConfig, GameState } from '../game/types';
import { Creator } from './Creator';
import { Game, WinModal } from './Game';
import { Intro, Title } from './Intro';
import { Icon } from './icons';
import { setSoundEnabled, sfx } from './sound';

type Screen = 'title' | 'intro' | 'creator' | 'game' | 'edit';

export function App() {
  const [game, setGame] = useState<GameState | null>(() => load());
  const [screen, setScreen] = useState<Screen>('title');
  const [toast, setToast] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const gameRef = useRef<GameState | null>(game);
  gameRef.current = game;

  useEffect(() => setSoundEnabled(game?.settings?.sound ?? true), [game?.settings?.sound]);

  const commit = (next: GameState) => {
    save(next);
    gameRef.current = next;
    setGame(next);
  };

  const showToast = (t: string) => {
    setToast(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3800);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Aktionen laufen synchron auf einer Kopie des aktuellen Stands
  const act = (fn: (s: GameState) => string | void) => {
    const cur = gameRef.current;
    if (!cur) return;
    const next = structuredClone(cur);
    const r = fn(next);
    checkLevel(next);
    commit(next);
    if (r) showToast(r);
  };

  const nextMonth = () => {
    const cur = gameRef.current;
    if (!cur) return;
    const next = structuredClone(cur);
    advanceMonth(next);
    commit(next);
    setShowReport(true);
    if ((next.lastReport?.rent ?? 0) > 0) sfx.coin();
  };

  const dismiss = (k: 'levelup' | 'demotion' | 'report' | 'win' | 'reward') => {
    const cur = gameRef.current;
    if (!cur) return;
    if (k === 'report') {
      setShowReport(false);
      return;
    }
    const next = structuredClone(cur);
    if (k === 'levelup') next.pendingLevelUp = null;
    if (k === 'demotion') next.pendingDemotion = null;
    if (k === 'win') next.flags.winShown = 1;
    if (k === 'reward') next.pendingRewards = (next.pendingRewards ?? []).slice(1);
    commit(next);
    if (k !== 'reward') setShowReport(false);
  };

  const start = (name: string, avatar: AvatarConfig) => {
    const g = newGame(name, avatar);
    commit(g);
    setScreen('game');
  };

  let content;
  if (screen === 'title' || (screen === 'game' && !game)) {
    content = <Title hasSave={!!game} onNew={() => setScreen('intro')} onContinue={() => setScreen('game')} />;
  } else if (screen === 'intro') {
    content = <Intro onDone={() => setScreen('creator')} />;
  } else if (screen === 'creator') {
    content = <Creator onDone={start} />;
  } else if (screen === 'edit' && game) {
    content = (
      <Creator
        initial={game.avatar}
        initialName={game.playerName}
        onCancel={() => setScreen('game')}
        onDone={(name, a) => {
          act((s) => {
            s.playerName = name;
            s.avatar = a;
            return 'Figur gespeichert!';
          });
          setScreen('game');
        }}
      />
    );
  } else if (game) {
    content = (
      <>
        <Game
          s={game}
          act={act}
          nextMonth={nextMonth}
          onEditAvatar={() => setScreen('edit')}
          onQuit={() => setScreen('title')}
          onRestart={() => {
            clearSave();
            setGame(null);
            gameRef.current = null;
            setScreen('intro');
          }}
          dismiss={dismiss}
          showReport={showReport}
          toast={showToast}
          markRead={() => {
            const cur = gameRef.current;
            if (cur && cur.messages.some((m) => !m.read)) {
              const next = structuredClone(cur);
              next.messages.forEach((m) => (m.read = true));
              commit(next);
            }
          }}
        />
        {game.won && !game.flags.winShown && !game.pendingLevelUp && <WinModal s={game} onClose={() => dismiss('win')} />}
      </>
    );
  }

  return (
    <div class="app">
      {content}
      {toast && (
        <div class="toast" onClick={() => setToast(null)}>
          <Icon name="info" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
